// 描画と入力
'use strict';

const Input = {
  keys: {}, joy: null,
  init(canvas) {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); Game.useSpecial(); }
      if (e.code === 'Escape' || e.code === 'KeyP') UI.togglePause();
      if (e.code === 'KeyF') UI.cycleSpeed();
      if (UI.levelKeys && /^Digit[1-4]$/.test(e.code)) UI.levelKeys(+e.code.slice(5) - 1);
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.joy = null; });
    // どこを触っても、その位置を中心にしたバーチャルスティック
    canvas.addEventListener('pointerdown', e => {
      Sound.init(); Sound.resume();
      canvas.setPointerCapture(e.pointerId);
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointermove', e => { if (this.joy && this.joy.id === e.pointerId) { this.joy.x = e.clientX; this.joy.y = e.clientY; } });
    const end = e => { if (this.joy && this.joy.id === e.pointerId) this.joy = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  },
  vector() {
    let x = 0, y = 0; const k = this.keys;
    if (k.KeyA || k.ArrowLeft) x -= 1; if (k.KeyD || k.ArrowRight) x += 1;
    if (k.KeyW || k.ArrowUp) y -= 1; if (k.KeyS || k.ArrowDown) y += 1;
    if (this.joy) {
      const dx = this.joy.x - this.joy.ox, dy = this.joy.y - this.joy.oy; const d = Math.hypot(dx, dy);
      if (d > 6) { const m = Math.min(1, d / 50); x = dx / d * m; y = dy / d * m; }
    }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },
};

const Render = {
  cv: null, ctx: null, w: 0, h: 0, dpr: 1, zoom: 1,
  init(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    const fit = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width; this.h = r.height;
      canvas.width = Math.round(r.width * this.dpr); canvas.height = Math.round(r.height * this.dpr);
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      // 短い辺に約560ドット分の世界が映るように
      this.zoom = Math.min(r.width, r.height) / 560;
    };
    window.addEventListener('resize', fit); fit();
    this.fit = fit;
  },
  viewSize() { return { w: this.w / this.zoom, h: this.h / this.zoom }; },

  // 画像を加算合成で描く（fx_ 素材は黒背景なので、黒が消えて光だけ残る）
  addImg(c, key, x, y, w, h, rot, alpha) {
    const img = Assets.get(key); if (!img) return false;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha === undefined ? 1 : alpha;
    c.translate(x, y); if (rot) c.rotate(rot);
    c.drawImage(img, -w / 2, -h / 2, w, h); c.restore();
    return true;
  },
  glow(c, x, y, r, color, alpha) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  },
  // 書き込みのない控えめな地面（ステージ色＋ごく薄いムラ）
  groundTile(color) {
    this._tiles = this._tiles || {};
    if (this._tiles[color]) return this._tiles[color];
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, S, S);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const px = rnd() * S, py = rnd() * S, r = 60 + rnd() * 140, light = rnd() < 0.5;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
        g.addColorStop(0, light ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2);
      }
    }
    this._tiles[color] = cv; return cv;
  },

  draw() {
    const R = Game.run; const c = this.ctx; if (!R) return;
    const p = R.player;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = R.stage.color; c.fillRect(0, 0, this.w, this.h);
    let sx = 0, sy = 0;
    if (R.shake > 0 && Save.data.settings.shake) { sx = (Math.random() - 0.5) * R.shake; sy = (Math.random() - 0.5) * R.shake; }
    c.save();
    c.translate(this.w / 2 + sx, this.h / 2 + sy);
    c.scale(this.zoom, this.zoom);
    c.translate(-p.x, -p.y);
    const v = this.viewSize();
    const L = p.x - v.w / 2 - 80, T = p.y - v.h / 2 - 80, Rr = p.x + v.w / 2 + 80, B = p.y + v.h / 2 + 80;
    this.drawGround(c, R, p, v);
    const light = Save.data.settings.light;
    const t = R.t;

    // 地面に置くもの
    for (const z of R.zones) this.drawZoneUnder(c, z, R);
    this.drawGems(c, R, L, T, Rr, B, t);
    for (const o of R.drops) this.drawDrop(c, o, t);

    // 敵
    for (const e of R.enemies) {
      if (e.x < L - e.r || e.x > Rr + e.r || e.y < T - e.r || e.y > B + e.r) continue;
      this.drawEnemy(c, e, t);
    }

    // プレイヤーとサポート
    for (const w of R.weapons) if (w.type === 'aura') this.drawAura(c, w, R);
    if (R.sup) this.drawChar(c, R.support, R.sup.x, R.sup.y, 50, R.sup.x < p.x ? 1 : -1, 1, t);
    const blink = p.invul > 0 && Math.floor(t * 20) % 2 === 0;
    this.glow(c, p.x, p.y + 10, 46, 'rgba(255,230,160,1)', 0.18);
    c.strokeStyle = 'rgba(255,240,160,.75)'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y + 28, 22, 8, 0, 0, TAU); c.stroke();
    if (!blink) this.drawChar(c, R.char, p.x, p.y, 70, p.face, 1, t, p.moving);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(p.x - 22, p.y + 34, 44, 6);
    c.fillStyle = p.hp / p.maxHp < 0.3 ? '#ff4f4f' : '#57e389'; c.fillRect(p.x - 22, p.y + 34, 44 * Math.max(0, p.hp / p.maxHp), 6);

    // 攻撃（加算合成で光らせる）
    for (const z of R.zones) this.drawZoneOver(c, z, R);
    for (const w of R.weapons) this.drawWeaponPersistent(c, w, R);
    for (const b of R.projs) this.drawProj(c, b, t);
    for (const b of R.ebullets) {
      if (!this.addImg(c, 'fx_bullet', b.x, b.y, b.r * 4, b.r * 4, t * 6)) {
        c.fillStyle = '#ff4060'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, b.r * 0.5, 0, TAU); c.stroke();
      }
    }
    // 火花
    if (R.parts.length) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const q of R.parts) { c.globalAlpha = Math.min(1, q.life / q.max * 1.5); c.fillStyle = q.color; const s2 = q.size * (0.5 + q.life / q.max * 0.5); c.fillRect(q.x - s2 / 2, q.y - s2 / 2, s2, s2); }
      c.restore();
    }
    for (const f of R.fx) if (!light || f.kind !== 'pop') this.drawFx(c, f, R);
    // ダメージ数字（出た瞬間に少し大きく）
    if (R.nums.length) {
      c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.85)';
      for (const n of R.nums) {
        const k = n.life / 0.6; const pop = k > 0.8 ? 1 + (k - 0.8) * 2.5 : 1;
        c.globalAlpha = Math.min(1, n.life * 3);
        c.font = `900 ${Math.round((n.crit ? 20 : n.weak ? 17 : 13) * pop)}px sans-serif`;
        c.fillStyle = n.crit ? '#ff4f7b' : n.weak ? '#ffe14d' : '#fff';
        const tx = fmtNum(n.v); c.strokeText(tx, n.x, n.y); c.fillText(tx, n.x, n.y);
      }
      c.globalAlpha = 1;
    }
    c.restore();

    // 画面のふち（周囲を少し暗く）と画面フラッシュ
    if (!this._vig || this._vig.w !== this.w || this._vig.h !== this.h) {
      const g = c.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.45, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); this._vig = { w: this.w, h: this.h, g };
    }
    c.fillStyle = this._vig.g; c.fillRect(0, 0, this.w, this.h);
    if (p.hp / p.maxHp < 0.3) { c.fillStyle = `rgba(255,0,40,${0.12 + Math.sin(t * 6) * 0.06})`; c.fillRect(0, 0, this.w, this.h); }
    if (R.flash && Save.data.settings.shake) { c.fillStyle = `rgba(${R.flash.c},${Math.max(0, R.flash.a) * 0.6})`; c.fillRect(0, 0, this.w, this.h); }

    // ボスのHP
    const boss = R.bossIds.find(b => !b.dead);
    if (boss) {
      const bw = Math.min(420, this.w - 40), bx = (this.w - bw) / 2;
      c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(bx - 2, 62, bw + 4, 16);
      const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#ff2f6d'); g.addColorStop(1, '#ffb347');
      c.fillStyle = g; c.fillRect(bx, 64, bw * Math.max(0, boss.hp / boss.maxHp), 12);
      c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText(boss.def.name, this.w / 2, 58);
    }
    // スティック
    if (Input.joy) {
      const j = Input.joy; const r = this.cv.getBoundingClientRect();
      const ox = j.ox - r.left, oy = j.oy - r.top;
      c.globalAlpha = 0.3; c.fillStyle = '#fff';
      c.beginPath(); c.arc(ox, oy, 50, 0, TAU); c.fill();
      c.globalAlpha = 0.6;
      const dx = j.x - j.ox, dy = j.y - j.oy, d = Math.hypot(dx, dy), m = Math.min(d, 50);
      c.beginPath(); c.arc(ox + (d ? dx / d * m : 0), oy + (d ? dy / d * m : 0), 22, 0, TAU); c.fill();
      c.globalAlpha = 1;
    }
    if (R.cutin) this.drawCutin(c, R.cutin);
  },

  drawGround(c, R, p, v) {
    const img = this.groundTile(R.stage.color);
    const S = 512;
    const x0 = Math.floor((p.x - v.w / 2) / S) - 1, x1 = Math.floor((p.x + v.w / 2) / S) + 1;
    const y0 = Math.floor((p.y - v.h / 2) / S) - 1, y1 = Math.floor((p.y + v.h / 2) / S) + 1;
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) c.drawImage(img, ix * S, iy * S);
  },

  drawChar(c, ch, x, y, size, face, alpha, t, moving) {
    const skinId = (Save.data.chars[ch.id] || {}).skin || 'default';
    const skin = D.SKINS.find(s => s.id === skinId) || D.SKINS[0];
    const img = Assets.hued('chr_' + ch.id, skin.hue);
    const bob = moving ? Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 3) * 1;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + size * 0.4, size * 0.3, size * 0.1, 0, 0, TAU); c.fill();
    if (img) {
      c.save(); c.translate(x, y - bob); c.scale(face < 0 ? -1 : 1, 1);
      c.drawImage(img, -size / 2, -size / 2 - 4, size, size); c.restore();
    } else {
      c.save(); c.translate(x, y - bob);
      c.fillStyle = ch.color; c.beginPath(); c.arc(0, -8, size * 0.22, 0, TAU); c.fill();
      c.fillStyle = '#ffe0cc'; c.beginPath(); c.arc(face * 2, -6, size * 0.15, 0, TAU); c.fill();
      c.fillStyle = ch.color; c.fillRect(-size * 0.15, 2, size * 0.3, size * 0.28);
      c.restore();
    }
  },

  drawEnemy(c, e, t) {
    const img = e.hue ? Assets.hued(e.def.img, e.hue) : Assets.get(e.def.img);
    const s = e.r * 2.5;
    const wob = Math.sin(t * 8 + e.id) * 0.06;
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.8, e.r * 0.25, 0, 0, TAU); c.fill();
    if (e.elite) this.glow(c, e.x, e.y, e.r * 1.8, e.boss ? 'rgba(255,40,90,1)' : 'rgba(255,210,60,1)', 0.35 + Math.sin(t * 5) * 0.1);
    c.save(); c.translate(e.x, e.y);
    c.scale((e.face || 1) * -1 * (1 + wob), 1 - wob);
    if (img) {
      c.drawImage(img, -s / 2, -s / 2, s, s);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7; c.drawImage(img, -s / 2, -s / 2, s, s); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    } else {
      c.fillStyle = e.flash > 0 ? '#fff' : e.def.color;
      c.beginPath(); c.arc(0, 0, e.r, 0, TAU); c.fill();
    }
    c.restore();
    if (e.frozen > 0) { if (!this.addImg(c, 'fx_frost', e.x, e.y, e.r * 3, e.r * 3, 0, 0.6)) { c.fillStyle = 'rgba(150,220,255,.5)'; c.beginPath(); c.arc(e.x, e.y, e.r * 1.1, 0, TAU); c.fill(); } }
    else if (e.slowT > 0) this.glow(c, e.x, e.y, e.r * 1.4, 'rgba(120,200,255,1)', 0.25);
    if (e.fuse !== undefined) { this.glow(c, e.x, e.y, e.r * 2.5, 'rgba(255,60,30,1)', 0.4 + Math.sin(t * 40) * 0.3); }
    if (e.elite && !e.boss) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - e.r, e.y - e.r - 12, e.r * 2, 5); c.fillStyle = '#ffd84a'; c.fillRect(e.x - e.r, e.y - e.r - 12, e.r * 2 * Math.max(0, e.hp / e.maxHp), 5); }
  },

  drawGems(c, R, L, T, Rr, B, t) {
    const imS = Assets.get('item_gem_s'), imM = Assets.get('item_gem_m'), imL = Assets.get('item_gem_l');
    for (const g of R.gems) {
      if (g.x < L || g.x > Rr || g.y < T || g.y > B) continue;
      const big = g.big, mid = !big && g.v >= 3;
      const im = big ? imL : mid ? imM : imS;
      const s = big ? 26 : mid ? 18 : 14;
      const y = g.y + Math.sin(t * 4 + g.x * 0.1) * 1.5;
      if (im) c.drawImage(im, g.x - s / 2, y - s / 2, s, s);
      else {
        const r = s * 0.3; c.fillStyle = big ? '#ff5fd2' : mid ? '#5fd7ff' : '#7dff8a';
        c.beginPath(); c.moveTo(g.x, y - r * 1.4); c.lineTo(g.x + r, y); c.lineTo(g.x, y + r * 1.4); c.lineTo(g.x - r, y); c.closePath(); c.fill();
      }
      if (big) this.glow(c, g.x, y, 22, 'rgba(255,120,220,1)', 0.35);
    }
  },

  drawDrop(c, o, t) {
    const y = o.y + Math.sin(t * 4 + o.x) * 2;
    const key = { coin: 'item_coin', heal: 'item_cake', magnet: 'item_magnet', chest: 'item_chest' }[o.kind];
    const size = { coin: 18, heal: 30, magnet: 28, chest: 46 }[o.kind];
    if (o.kind === 'chest') {
      // 光の柱
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(o.x, y - 160, o.x, y); g.addColorStop(0, 'rgba(255,220,100,0)'); g.addColorStop(1, `rgba(255,220,100,${0.35 + Math.sin(t * 4) * 0.1})`);
      c.fillStyle = g; c.fillRect(o.x - 18, y - 160, 36, 160); c.restore();
      this.glow(c, o.x, y, 50, 'rgba(255,215,90,1)', 0.45);
    } else if (o.kind !== 'coin') this.glow(c, o.x, y, 26, o.kind === 'heal' ? 'rgba(255,140,170,1)' : 'rgba(255,90,90,1)', 0.3);
    const im = Assets.get(key);
    if (im) {
      const sq = o.kind === 'coin' ? Math.abs(Math.cos(t * 5 + o.x)) * 0.8 + 0.2 : 1;
      c.drawImage(im, o.x - size * sq / 2, y - size / 2, size * sq, size);
      return;
    }
    if (o.kind === 'coin') { c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(o.x, y, 6, 0, TAU); c.fill(); }
    else if (o.kind === 'heal') { c.fillStyle = '#fff'; c.fillRect(o.x - 9, y - 6, 18, 12); c.fillStyle = '#ff6b8a'; c.fillRect(o.x - 9, y - 6, 18, 4); }
    else if (o.kind === 'magnet') { c.strokeStyle = '#ff4f4f'; c.lineWidth = 5; c.beginPath(); c.arc(o.x, y, 8, Math.PI, 0); c.stroke(); }
    else { c.fillStyle = '#8a5a2b'; c.fillRect(o.x - 14, y - 10, 28, 20); c.fillStyle = '#ffd84a'; c.fillRect(o.x - 14, y - 2, 28, 3); }
  },

  drawProj(c, b, t) {
    const col = D.ELEM[b.w.elem].color; const evo = !!b.w.evo; const a = Math.atan2(b.vy || 0, b.vx || 1);
    let ok = false;
    switch (b.kind) {
      case 'homing': ok = this.addImg(c, 'fx_star', b.x, b.y, b.r * 4.5 * (evo ? 1.4 : 1), b.r * 4.5 * (evo ? 1.4 : 1), t * 8); break;
      case 'arrow': ok = this.addImg(c, 'fx_arrow', b.x, b.y, b.r * 9, b.r * 4, a); break;
      case 'shard': ok = this.addImg(c, 'fx_shard', b.x, b.y, b.r * 5, b.r * 3, a); break;
      case 'boomerang': ok = this.addImg(c, 'fx_moon', b.x, b.y, b.r * 3.2, b.r * 3.2, b.rot); break;
      case 'lob': ok = this.addImg(c, 'fx_fireball', b.x, b.y, 34, 34, t * 10); break;
      case 'bolt': ok = this.addImg(c, b.w.evo && b.w.evo.startsWith('fus_') ? 'fx_beam' : 'fx_thunder', b.x, b.y, b.r * 5, b.r * 4, a); break;
    }
    if (ok) { this.glow(c, b.x, b.y, b.r * 2.5, col, 0.25); return; }
    switch (b.kind) {
      case 'homing': this.star(c, b.x, b.y, b.r, col, a); break;
      case 'arrow': c.save(); c.translate(b.x, b.y); c.rotate(a); c.strokeStyle = '#e8d3a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 0); c.lineTo(10, 0); c.stroke(); c.restore(); break;
      case 'boomerang': c.save(); c.translate(b.x, b.y); c.rotate(b.rot); c.strokeStyle = '#ffe9a0'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, b.r, 0.3, Math.PI - 0.3); c.stroke(); c.restore(); break;
      default: c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill();
    }
  },
  star(c, x, y, r, col, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const a = i / 10 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.restore();
  },

  drawAura(c, w, R) {
    const o = Game.ownerPos(w); const p = w.p;
    const pulse = 1 + Math.sin(R.t * 4) * 0.04;
    if (!this.addImg(c, 'fx_aura', o.x, o.y, p.radius * 2.3 * pulse, p.radius * 2.3 * pulse, R.t * 0.8, w.evo ? 0.75 : 0.5)) {
      c.fillStyle = w.evo ? 'rgba(255,240,150,.18)' : 'rgba(255,255,200,.12)';
      c.beginPath(); c.arc(o.x, o.y, p.radius * pulse, 0, TAU); c.fill();
    }
  },
  drawWeaponPersistent(c, w, R) {
    const o = Game.ownerPos(w); const p = w.p; const t = R.t;
    if (w.type === 'orbit' && w.st.on) {
      for (let i = 0; i < p.amount; i++) {
        const a = w.st.a + i / p.amount * TAU;
        const x = o.x + Math.cos(a) * p.radius, y = o.y + Math.sin(a) * p.radius;
        this.glow(c, x, y, p.size * 2.5, w.evo ? 'rgba(255,230,120,1)' : 'rgba(170,200,255,1)', 0.35);
        if (!this.addImg(c, 'fx_orb', x, y, p.size * 3.2, p.size * 3.2, t * 3)) { c.fillStyle = '#cfe0ff'; c.beginPath(); c.arc(x, y, p.size, 0, TAU); c.fill(); }
      }
    } else if (w.type === 'minion' && w.st.list) {
      for (const m of w.st.list) {
        this.glow(c, m.x, m.y, p.size * 3, 'rgba(255,140,40,1)', 0.35);
        if (!this.addImg(c, 'fx_foxfire', m.x, m.y, p.size * 4, p.size * 4, Math.atan2(m.vy, m.vx) + Math.PI / 2)) { c.fillStyle = '#ff9a3c'; c.beginPath(); c.arc(m.x, m.y, p.size, 0, TAU); c.fill(); }
      }
    } else if (w.type === 'drone' && w.st.list) {
      for (const m of w.st.list) {
        c.fillStyle = '#9fb4c8'; c.fillRect(m.x - 9, m.y - 4, 18, 8);
        c.fillStyle = '#6fe0ff'; c.beginPath(); c.arc(m.x, m.y, 3, 0, TAU); c.fill();
        this.glow(c, m.x, m.y + 8, 14, 'rgba(110,220,255,1)', 0.5);
        c.strokeStyle = '#ccc'; c.lineWidth = 1; c.beginPath(); c.moveTo(m.x - 13, m.y - 6 + Math.sin(t * 40)); c.lineTo(m.x + 13, m.y - 6 - Math.sin(t * 40)); c.stroke();
      }
    }
  },

  // 敵より下に描く地面系
  drawZoneUnder(c, z, R) {
    const k = z.max ? z.life / z.max : 1; const t = R.t;
    const fade = Math.min(1, k * 4, (1 - k) * 8 + 0.2);
    switch (z.kind) {
      case 'mine':
        if (!this.addImg(c, 'fx_rune', z.x, z.y, 56, 56, t * 2, 0.9)) { c.strokeStyle = 'rgba(176,124,255,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(z.x, z.y, 14, 0, TAU); c.stroke(); }
        break;
      case 'puddle':
        if (!this.addImg(c, 'fx_holy', z.x, z.y, z.r * 2.4, z.r * 1.8, 0, 0.8 * fade)) { c.fillStyle = `rgba(110,190,255,${0.35 * fade})`; c.beginPath(); c.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU); c.fill(); }
        break;
      case 'burn':
        if (!this.addImg(c, 'fx_burn', z.x, z.y, z.r * 2.4, z.r * 2, Math.sin(t * 3) * 0.1, 0.8 * fade)) { c.fillStyle = `rgba(255,110,40,${0.35 * fade})`; c.beginPath(); c.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU); c.fill(); }
        break;
      case 'meteor':
        c.strokeStyle = `rgba(255,80,40,${0.5 + Math.sin(t * 20) * 0.3})`; c.lineWidth = 3; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke();
        c.fillStyle = 'rgba(255,80,40,.12)'; c.fill();
        break;
    }
  },
  // 敵より上に描く光の攻撃
  drawZoneOver(c, z, R) {
    const k = z.max ? z.life / z.max : 1; const t = R.t;
    switch (z.kind) {
      case 'beam': {
        const o = z.owner; const p = z.w.p; const a = Math.min(1, k * 3);
        c.save(); c.translate(o.x, o.y); c.rotate(z.ang);
        const W = p.width * (1 + Math.sin(t * 50) * 0.1);
        if (Assets.get('fx_beam')) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.drawImage(Assets.get('fx_beam'), 0, -W * 3, p.length, W * 6); }
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * 0.8;
        c.fillStyle = z.w.evo ? 'rgba(120,240,255,.5)' : 'rgba(120,220,255,.4)'; c.fillRect(0, -W * 1.4, p.length, W * 2.8);
        c.fillStyle = '#fff'; c.fillRect(0, -W * 0.4, p.length, W * 0.8);
        c.restore();
        this.glow(c, o.x, o.y, W * 4, 'rgba(140,230,255,1)', a * 0.6);
        break;
      }
      case 'spinbeam': {
        const o = R.player; c.save(); c.translate(o.x, o.y); c.rotate(z.ang); c.globalCompositeOperation = 'lighter';
        if (Assets.get('fx_beam')) c.drawImage(Assets.get('fx_beam'), 0, -110, 650, 220);
        c.fillStyle = 'rgba(100,230,255,.5)'; c.fillRect(0, -50, 650, 100); c.fillStyle = '#fff'; c.fillRect(0, -16, 650, 32); c.restore();
        this.glow(c, o.x, o.y, 120, 'rgba(140,230,255,1)', 0.7);
        break;
      }
      case 'tornado': {
        const fire = z.w.elem === 'fire'; const f = Math.min(1, k * 4);
        if (!this.addImg(c, fire ? 'fx_fireball' : 'fx_tornado', z.x, z.y - z.r * 0.4, z.r * 2.8, z.r * 3.2, t * 8, 0.9 * f)) {
          for (let i = 0; i < 4; i++) { c.strokeStyle = fire ? 'rgba(255,140,60,.6)' : 'rgba(200,255,220,.5)'; c.lineWidth = 3; c.beginPath(); c.ellipse(z.x, z.y - i * z.r * 0.25, z.r * (1 - i * 0.18), z.r * 0.35, t * 6 + i, 0, TAU); c.stroke(); }
        }
        if (fire) this.addImg(c, 'fx_tornado', z.x, z.y - z.r * 0.4, z.r * 2.4, z.r * 2.8, -t * 6, 0.5 * f);
        break;
      }
      case 'meteor': {
        const h = k * 320;
        if (!this.addImg(c, 'fx_meteor', z.x + h * 0.45, z.y - h, z.r * 1.6, z.r * 1.6, 0, 1)) { c.fillStyle = '#ffb347'; c.beginPath(); c.arc(z.x + h * 0.4, z.y - h, 16, 0, TAU); c.fill(); }
        break;
      }
    }
  },

  drawFx(c, f, R) {
    const k = f.life / f.max;
    switch (f.kind) {
      case 'slash': {
        if (this.addImg(c, 'fx_slash', f.x + Math.cos(f.a) * f.r * 0.55, f.y + Math.sin(f.a) * f.r * 0.55, f.r * 2 * (1.2 - k * 0.2), f.r * 1.6, f.a + Math.PI / 2, Math.min(1, k * 2))) break;
        c.save(); c.translate(f.x, f.y); c.rotate(f.a); c.globalAlpha = k;
        c.fillStyle = f.color; c.beginPath(); c.arc(0, 0, f.r, -1.1, 1.1); c.arc(0, 0, f.r * 0.55, 1.1, -1.1, true); c.closePath(); c.fill();
        c.restore(); c.globalAlpha = 1; break;
      }
      case 'ring': {
        c.save(); c.globalCompositeOperation = 'lighter';
        c.strokeStyle = f.color; c.globalAlpha = k; c.lineWidth = 10 * k + 1; c.beginPath(); c.arc(f.x, f.y, f.r * (1.25 - k * 0.45), 0, TAU); c.stroke();
        c.restore(); break;
      }
      case 'spr': this.addImg(c, f.img, f.x, f.y, f.s * (f.grow ? 1.25 - k * 0.5 : 1), f.s * (f.grow ? 1.25 - k * 0.5 : 1), f.rot, Math.min(1, k * 2)); break;
      case 'bolt': {
        const r = f.r || 40;
        if (!this.addImg(c, 'fx_lightning', f.x, f.y - 200, 120, 420, 0, Math.min(1, k * 2))) {
          c.strokeStyle = f.color; c.lineWidth = 4; c.globalAlpha = k; c.beginPath(); let x = f.x, y = f.y - 400; c.moveTo(x, y);
          while (y < f.y) { y += 40; x = f.x + (Math.random() - 0.5) * 30; c.lineTo(x, Math.min(y, f.y)); } c.stroke(); c.globalAlpha = 1;
        }
        this.addImg(c, 'fx_thunder', f.x, f.y, r * 2.6, r * 2.6, Math.random() * TAU, k);
        this.glow(c, f.x, f.y, r * 2, 'rgba(255,240,120,1)', k * 0.6);
        break;
      }
      case 'hit': this.addImg(c, 'fx_hit', f.x, f.y, f.s, f.s, Math.random() * TAU, k) || this.glow(c, f.x, f.y, f.s / 2, 'rgba(255,255,255,1)', k); break;
      case 'pop': this.glow(c, f.x, f.y, f.r * 1.8 * (1.4 - k * 0.4), 'rgba(255,255,255,1)', k * 0.5); break;
      case 'levelup': {
        const s = (f.big ? 600 : 260) * (1.3 - k * 0.6);
        this.addImg(c, 'fx_burst', f.x, f.y, s, s, (1 - k) * 2, Math.min(1, k * 1.5));
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#fff3a8'; c.globalAlpha = k; c.lineWidth = 6 * k;
        c.beginPath(); c.arc(f.x, f.y, s * 0.4, 0, TAU); c.stroke();
        // 光の柱
        const g = c.createLinearGradient(f.x, f.y - 300, f.x, f.y); g.addColorStop(0, 'rgba(255,250,200,0)'); g.addColorStop(1, 'rgba(255,250,200,.6)');
        c.fillStyle = g; c.fillRect(f.x - 30 * k, f.y - 300, 60 * k, 300); c.restore();
        break;
      }
      case 'star': this.addImg(c, 'fx_star', f.x, f.y - (1 - k) * 40, 50, 50, k * 6, k) || this.star(c, f.x, f.y - (1 - k) * 30, 16, '#fff3a8', k * 4); break;
      case 'arrowfx': this.addImg(c, 'fx_arrow', f.x + 20 * k, f.y - 60 * k, 60, 24, Math.PI * 0.6, k); break;
    }
  },

  drawCutin(c, ci) {
    const k = ci.t; // 1 → 0
    const slide = k > 0.8 ? (k - 0.8) / 0.2 : k < 0.2 ? -(0.2 - k) / 0.2 : 0;
    const h = Math.min(220, this.h * 0.35);
    const y = this.h / 2 - h / 2;
    c.save();
    c.globalAlpha = Math.min(1, (1 - Math.abs(slide)) * 1.5);
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, y, this.w, h);
    c.fillStyle = ci.char.color; c.fillRect(0, y, this.w, 4); c.fillRect(0, y + h - 4, this.w, 4);
    const img = Assets.get('ptr_' + ci.char.id);
    const x = this.w * 0.15 + slide * this.w * 0.6;
    if (img) {
      c.save(); c.beginPath(); c.rect(0, y + 4, this.w, h - 8); c.clip();
      const s = h * 1.8; c.drawImage(img, x - s * 0.2, y - h * 0.15, s, s); c.restore();
    }
    c.fillStyle = '#fff'; c.font = `bold ${Math.round(h * 0.18)}px sans-serif`; c.textAlign = 'right';
    c.fillText(ci.char.specialName, this.w - 24 - slide * this.w * 0.4, y + h * 0.6);
    c.restore();
  },
};
