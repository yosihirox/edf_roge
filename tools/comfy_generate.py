#!/usr/bin/env python3
"""ローカルの ComfyUI で assets/manifest.js の素材を一括生成し、assets/img/<key>.png に保存する。

使い方 (Windows の例):
    python tools\\comfy_generate.py                       # まだ無い素材を全部生成
    python tools\\comfy_generate.py --only unit_ranger    # 指定キーだけ (カンマ区切り可)
    python tools\\comfy_generate.py --kind sprite --overwrite
    python tools\\comfy_generate.py --list                # 素材一覧を表示

公式絵を参考にしたい場合:
    assets/reference/<key>.png (または .jpg/.webp) に参考画像を置くと、
    その画像を元に img2img で生成します (--denoise で元絵からの離れ具合を調整)。
    参考画像はリポジトリにコミットしないでください (.gitignore 済み)。

必要なもの: Python 3.9+ / ComfyUI が起動していること (既定 http://127.0.0.1:8188)
任意: Pillow (pip install pillow) があると、白背景の透過・リサイズを自動で行います。
"""
import argparse
import io
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "assets", "manifest.js")
OUT_DIR = os.path.join(ROOT, "assets", "img")
REF_DIR = os.path.join(ROOT, "assets", "reference")

try:
    from PIL import Image  # type: ignore
except ImportError:  # Pillow なしでも動く (後処理を省略)
    Image = None


def load_manifest():
    text = open(MANIFEST, encoding="utf-8").read()
    m = re.search(r"window\.ASSET_MANIFEST\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not m:
        sys.exit("manifest.js を解析できませんでした")
    return json.loads(m.group(1))


def http_json(host, path, data=None):
    url = f"http://{host}{path}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def upload_image(host, path):
    boundary = uuid.uuid4().hex
    name = "edf_ref_" + os.path.basename(path)
    with open(path, "rb") as f:
        data = f.read()
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n"
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\n"
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"http://{host}/upload/image", data=body,
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["name"]


def build_graph(args, positive, negative, width, height, seed, ref_name=None):
    g = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": args.ckpt}},
        "2": {"class_type": "CLIPSetLastLayer", "inputs": {"clip": ["1", 1], "stop_at_clip_layer": -2}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": positive}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": negative}},
        "6": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["5", 0],
            "seed": seed, "steps": args.steps, "cfg": args.cfg, "sampler_name": "euler_ancestral",
            "scheduler": "normal", "denoise": 1.0}},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["1", 2]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "edf_"}},
    }
    if ref_name:
        g["10"] = {"class_type": "LoadImage", "inputs": {"image": ref_name}}
        g["11"] = {"class_type": "ImageScale", "inputs": {"image": ["10", 0], "upscale_method": "lanczos",
                                                          "width": width, "height": height, "crop": "center"}}
        g["5"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["11", 0], "vae": ["1", 2]}}
        g["6"]["inputs"]["denoise"] = args.denoise
    else:
        g["5"] = {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}}
    return g


def wait_result(host, prompt_id, timeout=600):
    t0 = time.time()
    while time.time() - t0 < timeout:
        h = http_json(host, f"/history/{prompt_id}")
        if prompt_id in h:
            for node in h[prompt_id]["outputs"].values():
                for img in node.get("images", []):
                    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
                    with urllib.request.urlopen(f"http://{host}/view?{q}", timeout=60) as r:
                        return r.read()
            raise RuntimeError("出力画像がありません")
        time.sleep(1.5)
    raise TimeoutError("生成がタイムアウトしました")


def remove_white_bg(img, tol=28):
    """四隅から塗りつぶして白っぽい背景を透過する簡易処理。"""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    ref = [px[x, y][:3] for x, y in stack]
    bg = tuple(sum(c[i] for c in ref) // 4 for i in range(3))
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        r, g, b, a = px[x, y]
        if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > tol * 3:
            continue
        px[x, y] = (r, g, b, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        side = max(img.size)
        sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        sq.paste(img, ((side - img.size[0]) // 2, (side - img.size[1]) // 2))
        img = sq
    return img


def postprocess(data, asset):
    if Image is None:
        return data
    img = Image.open(io.BytesIO(data))
    kind = asset.get("kind")
    if kind == "sprite":
        img = remove_white_bg(img)
        s = asset.get("size") or 128
        img = img.resize((s, s), Image.LANCZOS)
    elif kind == "background":
        img = img.convert("RGB").resize((800, 480), Image.LANCZOS)
    elif kind == "icon":
        img = img.convert("RGB").resize((256, 256), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def find_ref(key):
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = os.path.join(REF_DIR, key + ext)
        if os.path.exists(p):
            return p
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", default="127.0.0.1:8188")
    ap.add_argument("--ckpt", default="WAI-Nsfw-Illustrious-17.safetensors", help="使用するチェックポイント名")
    ap.add_argument("--only", help="生成するキー (カンマ区切り)")
    ap.add_argument("--kind", choices=["sprite", "background", "illustration", "icon"])
    ap.add_argument("--overwrite", action="store_true", help="既存の画像も作り直す")
    ap.add_argument("--steps", type=int, default=30)
    ap.add_argument("--cfg", type=float, default=7.0)
    ap.add_argument("--denoise", type=float, default=0.6, help="参考画像がある場合の img2img の強さ")
    ap.add_argument("--seed", type=int, help="固定シード (省略時ランダム)")
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args()

    m = load_manifest()
    assets = m["assets"]
    if args.only:
        keys = set(k.strip() for k in args.only.split(","))
        assets = [a for a in assets if a["key"] in keys]
    if args.kind:
        assets = [a for a in assets if a.get("kind") == args.kind]
    if args.list:
        for a in assets:
            have = "済" if os.path.exists(os.path.join(OUT_DIR, a["key"] + ".png")) else "  "
            ref = "参考あり" if find_ref(a["key"]) else ""
            print(f"[{have}] {a['key']:<24} {a.get('kind'):<12} {ref}")
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    if Image is None:
        print("※ Pillow が無いため透過・リサイズを省略します (pip install pillow 推奨)")
    for a in assets:
        out = os.path.join(OUT_DIR, a["key"] + ".png")
        if os.path.exists(out) and not args.overwrite:
            print(f"skip {a['key']} (既にあります。--overwrite で再生成)")
            continue
        parts = [m["style"], a["prompt"]]
        if a.get("kind") == "sprite":
            parts.append(m["sprite_suffix"])
        positive = ", ".join(parts)
        seed = args.seed if args.seed is not None else random.randint(0, 2**32 - 1)
        ref = find_ref(a["key"])
        ref_name = upload_image(args.host, ref) if ref else None
        graph = build_graph(args, positive, m["negative"], a.get("width", 1024), a.get("height", 1024), seed, ref_name)
        print(f"gen  {a['key']} seed={seed}{' (img2img)' if ref_name else ''} ...", end="", flush=True)
        pid = http_json(args.host, "/prompt", {"prompt": graph, "client_id": "edf_roge"})["prompt_id"]
        data = wait_result(args.host, pid)
        with open(out, "wb") as f:
            f.write(postprocess(data, a))
        print(" done")


if __name__ == "__main__":
    main()
