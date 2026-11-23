# 星継ぎのサバイバー

女の子キャラが戦う、オート攻撃のサバイバー系ローグライト。ブラウザで動きます（ビルド不要）。

- 遊ぶ：GitHub Pages（`main` に push すると自動公開）
- iPhone：Safari で開いて「共有 → ホーム画面に追加」で全画面アプリとして起動
- 企画書：[docs/concept.md](docs/concept.md)

## 操作
- 移動：WASD／矢印キー、スマホは画面をなぞる（触った所が中心のスティック）
- 攻撃：自動
- 必殺技：Space／右下の「必殺」ボタン（ゲージが溜まったら）
- P／Esc：一時停止（中断して後から再開できます）　F：倍速

## ファイル
| ファイル | 内容 |
|---|---|
| `js/data.js` | キャラ・武器・進化・敵・ステージ・スキルツリー・実績などのデータ（バランス調整はここ） |
| `js/game.js` | プレイ中のロジック |
| `js/render.js` | 描画と入力 |
| `js/ui.js` | 拠点・メニュー・レベルアップ・リザルト画面 |
| `js/save.js` | セーブ（localStorage、ファイル書き出し／読み込み）と装備生成 |
| `js/assets.js` | 画像読み込み、効果音・BGM（WebAudioで合成） |
| `assets/manifest.js` | 画像素材の一覧とプロンプト |

## 画像素材
`assets/img/<key>.png` があれば使い、無ければ図形で代わりに描きます。
ローカルの ComfyUI で一括生成できます：

```
python tools\comfy_generate.py            # まだ無い素材を全部生成
python tools\comfy_generate.py --only chr_lumina --overwrite
python tools\comfy_generate.py --list
```
