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

    // 地面に置くもの
    for (const z of R.zones) this.drawZone(c, z, R);
    for (const g of R.gems) {
      if (g.x < L || g.x > Rr || g.y < T || g.y > B) continue;
      const s = g.big ? 7 : 4;
      c.fillStyle = g.big ? '#ff5fd2' : g.v >= 3 ? '#5fd7ff' : '#7dff8a';
      c.beginPath(); c.moveTo(g.x, g.y - s * 1.4); c.lineTo(g.x + s, g.y); c.lineTo(g.x, g.y + s * 1.4); c.lineTo(g.x - s, g.y); c.closePath(); c.fill();
    }
    for (const o of R.drops) this.drawDrop(c, o, R.t);

    // 敵
    const sorted = R.enemies;
    for (const e of sorted) {
      if (e.x < L - e.r || e.x > Rr + e.r || e.y < T - e.r || e.y > B + e.r) continue;
      this.drawEnemy(c, e, R.t);
    }

    // プレイヤーとサポート
    if (R.sup) this.drawChar(c, R.support, R.sup.x, R.sup.y, 46, R.sup.x < p.x ? 1 : -1, 1, R.t);
    const blink = p.invul > 0 && Math.floor(R.t * 20) % 2 === 0;
    if (!blink) this.drawChar(c, R.char, p.x, p.y, 60, p.face, 1, R.t, p.moving);
    // HPバー
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(p.x - 22, p.y + 26, 44, 6);
    c.fillStyle = p.hp / p.maxHp < 0.3 ? '#ff4f4f' : '#57e389'; c.fillRect(p.x - 22, p.y + 26, 44 * Math.max(0, p.hp / p.maxHp), 6);

    // 武器（常駐系）
    for (const w of R.weapons) this.drawWeaponPersistent(c, w, R);
    // 弾
    for (const b of R.projs) this.drawProj(c, b);
    c.fillStyle = '#ff4060';
    for (const b of R.ebullets) { c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); }
    c.strokeStyle = '#fff'; c.lineWidth = 2;
    for (const b of R.ebullets) { c.beginPath(); c.arc(b.x, b.y, b.r * 0.5, 0, TAU); c.stroke(); }
    // エフェクト
    if (!light) for (const f of R.fx) this.drawFx(c, f);
    else for (const f of R.fx) if (f.kind !== 'pop') this.drawFx(c, f);
    // ダメージ数字
    if (R.nums.length) {
      c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)';
      for (const n of R.nums) {
        c.globalAlpha = Math.min(1, n.life * 3);
        c.font = `bold ${n.crit ? 18 : n.weak ? 16 : 13}px sans-serif`;
        c.fillStyle = n.crit ? '#ff4f7b' : n.weak ? '#ffe14d' : '#fff';
        const t = fmtNum(n.v); c.strokeText(t, n.x, n.y); c.fillText(t, n.x, n.y);
      }
      c.globalAlpha = 1;
    }
    c.restore();

    // ボスのHP
    const boss = R.bossIds.find(b => !b.dead);
    if (boss) {
      const bw = Math.min(420, this.w - 40);
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect((this.w - bw) / 2, 64, bw, 12);
      c.fillStyle = '#ff4f7b'; c.fillRect((this.w - bw) / 2, 64, bw * Math.max(0, boss.hp / boss.maxHp), 12);
      c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText(boss.def.name, this.w / 2, 60);
    }
    // スティック
    if (Input.joy) {
      const j = Input.joy; const r = this.cv.getBoundingClientRect();
      const ox = j.ox - r.left, oy = j.oy - r.top;
      c.globalAlpha = 0.35; c.fillStyle = '#fff';
      c.beginPath(); c.arc(ox, oy, 50, 0, TAU); c.fill();
      c.globalAlpha = 0.6;
      const dx = j.x - j.ox, dy = j.y - j.oy, d = Math.hypot(dx, dy), m = Math.min(d, 50);
      c.beginPath(); c.arc(ox + (d ? dx / d * m : 0), oy + (d ? dy / d * m : 0), 22, 0, TAU); c.fill();
      c.globalAlpha = 1;
    }
    // 必殺技カットイン
    if (R.cutin) this.drawCutin(c, R.cutin);
  },

  drawGround(c, R, p, v) {
    const img = Assets.get(R.stage.tile);
    if (img) {
      const S = 512;
      const x0 = Math.floor((p.x - v.w / 2) / S) - 1, x1 = Math.floor((p.x + v.w / 2) / S) + 1;
      const y0 = Math.floor((p.y - v.h / 2) / S) - 1, y1 = Math.floor((p.y + v.h / 2) / S) + 1;
      // 継ぎ目が目立たないよう、隣り合うタイルを鏡写しにする
      for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
        const fx = ix & 1 ? -1 : 1, fy = iy & 1 ? -1 : 1;
        c.save(); c.translate(ix * S + (fx < 0 ? S : 0), iy * S + (fy < 0 ? S : 0)); c.scale(fx, fy);
        c.drawImage(img, 0, 0, S, S); c.restore();
      }
      if (R.stage.special === 'abyss' || R.stage.special === 'throne') { c.fillStyle = 'rgba(20,0,40,.55)'; c.fillRect(p.x - v.w, p.y - v.h, v.w * 2, v.h * 2); }
    } else {
      // 画像が無い時は模様で
      const S = 64; c.fillStyle = 'rgba(255,255,255,.07)';
      const x0 = Math.floor((p.x - v.w / 2) / S), x1 = Math.floor((p.x + v.w / 2) / S) + 1;
      const y0 = Math.floor((p.y - v.h / 2) / S), y1 = Math.floor((p.y + v.h / 2) / S) + 1;
      for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
        const h = ((ix * 73856093) ^ (iy * 19349663)) & 7;
        if (h < 3) c.fillRect(ix * S + h * 7, iy * S + h * 5, 4 + h, 4 + h);
      }
    }
  },

  drawChar(c, ch, x, y, size, face, alpha, t, moving) {
    const skinId = (Save.data.chars[ch.id] || {}).skin || 'default';
    const skin = D.SKINS.find(s => s.id === skinId) || D.SKINS[0];
    const img = Assets.hued('chr_' + ch.id, skin.hue);
    const bob = moving ? Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 3) * 1;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + size * 0.42, size * 0.3, size * 0.1, 0, 0, TAU); c.fill();
    if (img) {
      c.save(); c.translate(x, y - bob); c.scale(face < 0 ? -1 : 1, 1);
      c.drawImage(img, -size / 2, -size / 2 - 4, size, size); c.restore();
    } else {
      // 仮のキャラ絵（丸＋髪色）
      c.save(); c.translate(x, y - bob);
      c.fillStyle = ch.color; c.beginPath(); c.arc(0, -8, size * 0.22, 0, TAU); c.fill();
      c.fillStyle = '#ffe0cc'; c.beginPath(); c.arc(face * 2, -6, size * 0.15, 0, TAU); c.fill();
      c.fillStyle = '#222'; c.fillRect(face * 5 - 1, -8, 2, 3);
      c.fillStyle = ch.color; c.fillRect(-size * 0.15, 2, size * 0.3, size * 0.28);
      c.restore();
    }
  },

  drawEnemy(c, e, t) {
    const img = e.hue ? Assets.hued(e.def.img, e.hue) : Assets.get(e.def.img);
    const s = e.r * 2.5;
    const wob = Math.sin(t * 8 + e.id) * 0.06;
    c.save(); c.translate(e.x, e.y);
    if (e.elite) { c.fillStyle = e.boss ? 'rgba(255,60,90,.25)' : 'rgba(255,215,0,.25)'; c.beginPath(); c.arc(0, 0, e.r * 1.25, 0, TAU); c.fill(); }
    if (e.frozen > 0) { c.fillStyle = 'rgba(150,220,255,.5)'; c.beginPath(); c.arc(0, 0, e.r * 1.1, 0, TAU); c.fill(); }
    c.scale((e.face || 1) * -1 * (1 + wob), 1 - wob);
    if (img) {
      c.drawImage(img, -s / 2, -s / 2, s, s);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; c.drawImage(img, -s / 2, -s / 2, s, s); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    } else {
      c.fillStyle = e.flash > 0 ? '#fff' : e.def.color;
      c.beginPath(); c.arc(0, 0, e.r, 0, TAU); c.fill();
      c.fillStyle = '#000'; c.fillRect(-e.r * 0.4, -e.r * 0.25, e.r * 0.18, e.r * 0.3); c.fillRect(e.r * 0.2, -e.r * 0.25, e.r * 0.18, e.r * 0.3);
    }
    if (e.fuse !== undefined) { c.fillStyle = Math.floor(t * 20) % 2 ? '#fff' : '#f33'; c.beginPath(); c.arc(0, -e.r, 5, 0, TAU); c.fill(); }
    c.restore();
    if (e.elite && !e.boss) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 4); c.fillStyle = '#ffd84a'; c.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * Math.max(0, e.hp / e.maxHp), 4); }
  },

  drawDrop(c, o, t) {
    const y = o.y + Math.sin(t * 4 + o.x) * 2;
    if (o.kind === 'coin') { c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(o.x, y, 6, 0, TAU); c.fill(); c.fillStyle = '#c99a00'; c.fillRect(o.x - 1, y - 3, 2, 6); }
    else if (o.kind === 'heal') { c.fillStyle = '#fff'; c.fillRect(o.x - 9, y - 6, 18, 12); c.fillStyle = '#ff6b8a'; c.fillRect(o.x - 9, y - 6, 18, 4); c.fillStyle = '#f33'; c.beginPath(); c.arc(o.x, y - 9, 3, 0, TAU); c.fill(); }
    else if (o.kind === 'magnet') { c.strokeStyle = '#ff4f4f'; c.lineWidth = 5; c.beginPath(); c.arc(o.x, y, 8, Math.PI, 0); c.stroke(); c.fillStyle = '#ddd'; c.fillRect(o.x - 10, y, 5, 5); c.fillRect(o.x + 5, y, 5, 5); }
    else if (o.kind === 'chest') {
      c.fillStyle = '#8a5a2b'; c.fillRect(o.x - 14, y - 10, 28, 20); c.fillStyle = '#ffd84a'; c.fillRect(o.x - 14, y - 2, 28, 3); c.fillRect(o.x - 3, y - 4, 6, 7);
      c.strokeStyle = 'rgba(255,240,150,' + (0.5 + Math.sin(t * 6) * 0.5) + ')'; c.lineWidth = 2; c.strokeRect(o.x - 16, y - 12, 32, 24);
    }
  },

  drawProj(c, b) {
    const col = D.ELEM[b.w.elem].color;
    switch (b.kind) {
      case 'homing': this.star(c, b.x, b.y, b.r, col, Math.atan2(b.vy, b.vx)); break;
      case 'arrow': {
        const a = Math.atan2(b.vy, b.vx); c.save(); c.translate(b.x, b.y); c.rotate(a);
        c.strokeStyle = b.w.evo ? '#ffe14d' : '#e8d3a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 0); c.lineTo(10, 0); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(14, 0); c.lineTo(8, -4); c.lineTo(8, 4); c.fill(); c.restore(); break;
      }
      case 'shard': {
        const a = Math.atan2(b.vy, b.vx); c.save(); c.translate(b.x, b.y); c.rotate(a);
        c.fillStyle = '#bfefff'; c.beginPath(); c.moveTo(b.r * 1.6, 0); c.lineTo(0, -b.r * 0.6); c.lineTo(-b.r, 0); c.lineTo(0, b.r * 0.6); c.fill(); c.restore(); break;
      }
      case 'boomerang': {
        c.save(); c.translate(b.x, b.y); c.rotate(b.rot); c.strokeStyle = '#ffe9a0'; c.lineWidth = 5;
        c.beginPath(); c.arc(0, 0, b.r, 0.3, Math.PI - 0.3); c.stroke(); c.restore(); break;
      }
      case 'lob': c.fillStyle = '#ff7a3c'; c.beginPath(); c.arc(b.x, b.y, 8, 0, TAU); c.fill(); c.fillStyle = '#ffd'; c.beginPath(); c.arc(b.x - 2, b.y - 2, 3, 0, TAU); c.fill(); break;
      default: c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill();
    }
  },
  star(c, x, y, r, col, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const a = i / 10 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.restore();
  },

  drawWeaponPersistent(c, w, R) {
    const o = Game.ownerPos(w); const p = w.p;
    if (w.type === 'orbit' && w.st.on) {
      for (let i = 0; i < p.amount; i++) {
        const a = w.st.a + i / p.amount * TAU;
        const x = o.x + Math.cos(a) * p.radius, y = o.y + Math.sin(a) * p.radius;
        c.fillStyle = w.evo ? 'rgba(255,240,140,.35)' : 'rgba(200,220,255,.3)'; c.beginPath(); c.arc(x, y, p.size * 1.5, 0, TAU); c.fill();
        c.fillStyle = w.evo ? '#fff3a8' : '#cfe0ff'; c.beginPath(); c.arc(x, y, p.size, 0, TAU); c.fill();
      }
    } else if (w.type === 'aura') {
      const pulse = 1 + Math.sin(R.t * 4) * 0.03;
      c.fillStyle = w.evo ? 'rgba(255,240,150,.18)' : 'rgba(255,255,200,.12)';
      c.beginPath(); c.arc(o.x, o.y, p.radius * pulse, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,200,.35)'; c.lineWidth = 2; c.stroke();
    } else if (w.type === 'minion' && w.st.list) {
      for (const m of w.st.list) {
        c.fillStyle = 'rgba(255,150,50,.35)'; c.beginPath(); c.arc(m.x, m.y, p.size * 1.6, 0, TAU); c.fill();
        c.fillStyle = w.evo ? '#ffde59' : '#ff9a3c'; c.beginPath(); c.arc(m.x, m.y, p.size, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(m.x, m.y - 2, p.size * 0.4, 0, TAU); c.fill();
      }
    } else if (w.type === 'drone' && w.st.list) {
      for (const m of w.st.list) {
        c.fillStyle = '#9fb4c8'; c.fillRect(m.x - 8, m.y - 4, 16, 8);
        c.fillStyle = '#6fe0ff'; c.beginPath(); c.arc(m.x, m.y, 3, 0, TAU); c.fill();
        c.strokeStyle = '#ccc'; c.lineWidth = 1; c.beginPath(); c.moveTo(m.x - 12, m.y - 6); c.lineTo(m.x + 12, m.y - 6); c.stroke();
      }
    }
  },

  drawZone(c, z, R) {
    const k = z.max ? z.life / z.max : 1;
    switch (z.kind) {
      case 'beam': {
        const o = z.owner; const p = z.w.p;
        c.save(); c.translate(o.x, o.y); c.rotate(z.ang);
        c.globalAlpha = Math.min(1, k * 2);
        c.fillStyle = z.w.evo ? 'rgba(120,240,255,.5)' : 'rgba(120,220,255,.4)'; c.fillRect(0, -p.width * 1.6, p.length, p.width * 3.2);
        c.fillStyle = '#fff'; c.fillRect(0, -p.width * 0.5, p.length, p.width);
        c.restore(); c.globalAlpha = 1; break;
      }
      case 'spinbeam': {
        const o = R.player; c.save(); c.translate(o.x, o.y); c.rotate(z.ang);
        c.fillStyle = 'rgba(100,230,255,.5)'; c.fillRect(0, -50, 650, 100); c.fillStyle = '#fff'; c.fillRect(0, -16, 650, 32); c.restore(); break;
      }
      case 'mine': {
        c.strokeStyle = 'rgba(176,124,255,.9)'; c.lineWidth = 2;
        c.beginPath(); c.arc(z.x, z.y, 14, 0, TAU); c.stroke();
        Render.star(c, z.x, z.y, 10, 'rgba(176,124,255,.6)', R.t * 2); break;
      }
      case 'tornado': {
        c.save(); c.translate(z.x, z.y);
        const fire = z.w.elem === 'fire';
        for (let i = 0; i < 4; i++) {
          c.strokeStyle = fire ? `rgba(255,${120 + i * 30},60,.6)` : `rgba(200,255,220,${0.5 - i * 0.08})`; c.lineWidth = 3;
          c.beginPath(); c.ellipse(0, -i * z.r * 0.25, z.r * (1 - i * 0.18), z.r * 0.35, R.t * 6 + i, 0, TAU); c.stroke();
        }
        c.restore(); break;
      }
      case 'puddle': c.fillStyle = `rgba(110,190,255,${0.35 * Math.min(1, k * 3)})`; c.beginPath(); c.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU); c.fill(); break;
      case 'burn': c.fillStyle = `rgba(255,110,40,${0.35 * Math.min(1, k * 3)})`; c.beginPath(); c.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU); c.fill(); break;
      case 'meteor': {
        c.strokeStyle = 'rgba(255,80,40,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke();
        c.fillStyle = 'rgba(255,80,40,.15)'; c.fill();
        const h = k * 300; c.fillStyle = '#ffb347'; c.beginPath(); c.arc(z.x + h * 0.4, z.y - h, 16, 0, TAU); c.fill(); break;
      }
    }
  },

  drawFx(c, f) {
    const k = f.life / f.max;
    switch (f.kind) {
      case 'slash': {
        c.save(); c.translate(f.x, f.y); c.rotate(f.a); c.globalAlpha = k;
        c.fillStyle = f.color; c.beginPath(); c.arc(0, 0, f.r, -1.1, 1.1); c.arc(0, 0, f.r * 0.55, 1.1, -1.1, true); c.closePath(); c.fill();
        c.restore(); c.globalAlpha = 1; break;
      }
      case 'ring': c.strokeStyle = f.color; c.globalAlpha = k; c.lineWidth = 6 * k + 1; c.beginPath(); c.arc(f.x, f.y, f.r * (1.1 - k * 0.3), 0, TAU); c.stroke(); c.fillStyle = f.color; c.globalAlpha = k * 0.25; c.fill(); c.globalAlpha = 1; break;
      case 'bolt': {
        c.strokeStyle = f.color; c.lineWidth = 4; c.globalAlpha = k; c.beginPath(); let x = f.x, y = f.y - 400; c.moveTo(x, y);
        while (y < f.y) { y += 40; x = f.x + (Math.random() - 0.5) * 30; c.lineTo(x, Math.min(y, f.y)); } c.stroke();
        c.fillStyle = f.color; c.beginPath(); c.arc(f.x, f.y, 20 * k, 0, TAU); c.fill(); c.globalAlpha = 1; break;
      }
      case 'pop': c.fillStyle = f.color; c.globalAlpha = k * 0.7; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const d = f.r * (1.6 - k); c.beginPath(); c.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 3 * k + 1, 0, TAU); c.fill(); } c.globalAlpha = 1; break;
      case 'star': c.globalAlpha = k; Render.star(c, f.x, f.y - (1 - k) * 30, 16, '#fff3a8', k * 4); c.globalAlpha = 1; break;
      case 'arrowfx': c.strokeStyle = '#e8d3a0'; c.globalAlpha = k; c.lineWidth = 3; c.beginPath(); c.moveTo(f.x + 20 * k, f.y - 60 * k); c.lineTo(f.x, f.y); c.stroke(); c.globalAlpha = 1; break;
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
