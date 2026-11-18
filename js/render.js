// =============================================================
//  画像ローダーと描画 (画像が無い場合は図形でプレースホルダー描画)
// =============================================================
const IMG = {};

function loadAssets() {
  const list = (window.ASSET_MANIFEST && window.ASSET_MANIFEST.assets) || [];
  for (const a of list) {
    const img = new Image();
    img.onload = () => { IMG[a.key] = img; };
    img.onerror = () => {};
    img.src = 'assets/img/' + a.key + '.png';
  }
}

// 画像は「右向きの横視点」を想定。左を向くときは左右反転する。
function drawSpriteImage(ctx, key, x, y, size, angle) {
  const img = IMG[key];
  if (!img) return false;
  ctx.save();
  ctx.translate(x, y);
  if (angle !== undefined && Math.cos(angle) < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

// ---------- 背景 ----------
function drawBackground(ctx, G) {
  const bgKey = ['bg_city', 'bg_mountain', 'bg_coast'][G.mapIndex];
  if (IMG[bgKey]) {
    ctx.drawImage(IMG[bgKey], 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, W, H);
  } else {
    const base = ['#3b4237', '#3f4a33', '#3a4a4f'][G.mapIndex];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    // 瓦礫・ビルの残骸っぽい模様 (シード固定)
    let s = 1234 + G.mapIndex * 99;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W, y = rnd() * H, w = 10 + rnd() * 40, h = 10 + rnd() * 40;
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.04 + rnd() * 0.06})`;
      ctx.fillRect(x, y, w, h);
    }
  }
  // 経路
  for (const k of G.pathTiles) {
    const [c, r] = k.split(',').map(Number);
    ctx.fillStyle = 'rgba(120,100,70,0.55)';
    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
  }
  ctx.strokeStyle = 'rgba(255,220,150,0.25)';
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  G.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  // グリッド
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, H); ctx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(W, r * TILE); ctx.stroke(); }
}

function drawBase(ctx, G) {
  const b = G.basePos;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = '#263238';
  ctx.fillRect(-22, -22, 44, 44);
  ctx.strokeStyle = '#ffeb3b';
  ctx.lineWidth = 3;
  ctx.strokeRect(-22, -22, 44, 44);
  ctx.fillStyle = '#ffeb3b';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EDF', 0, 0);
  ctx.restore();
  // HPバー
  const ratio = Math.max(0, G.baseHp / G.baseMax);
  ctx.fillStyle = '#000';
  ctx.fillRect(b.x - 24, b.y - 32, 48, 6);
  ctx.fillStyle = ratio > 0.5 ? '#66bb6a' : ratio > 0.25 ? '#ffa726' : '#ef5350';
  ctx.fillRect(b.x - 24, b.y - 32, 48 * ratio, 6);
}

// ---------- ユニット ----------
function drawUnit(ctx, u, G, selected) {
  const cls = CLASSES[u.cls];
  const size = 34;
  ctx.save();
  if (u.downed) ctx.globalAlpha = 0.35;
  // 射程表示
  if (selected) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc(u.x, u.y, G.unitRange(u), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (!drawSpriteImage(ctx, 'unit_' + u.cls, u.x, u.y, size + 10, u.angle)) {
    drawUnitShape(ctx, u.cls, u.x, u.y, u.angle, cls.color);
  }
  ctx.restore();
  // ラベル & HP
  const ratio = Math.max(0, u.hp / u.maxHp);
  ctx.fillStyle = '#000';
  ctx.fillRect(u.x - 16, u.y + 18, 32, 4);
  ctx.fillStyle = u.downed ? '#9e9e9e' : '#66bb6a';
  ctx.fillRect(u.x - 16, u.y + 18, 32 * (u.downed ? 1 - u.downTimer / u.downMax : ratio), 4);
  if (u.cls === 'wingdiver' && !u.downed) {
    ctx.fillStyle = '#000';
    ctx.fillRect(u.x - 16, u.y + 23, 32, 3);
    ctx.fillStyle = u.overheat ? '#ff5252' : '#40c4ff';
    ctx.fillRect(u.x - 16, u.y + 23, 32 * (u.energy / u.energyMax), 3);
  }
  if (u.downed) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('救護中', u.x, u.y - 20);
  }
  // ドローン
  if (u.drones) {
    for (const d of u.drones) {
      ctx.fillStyle = '#fff176';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.stroke();
    }
  }
  if (u.orb) {
    ctx.fillStyle = 'rgba(255,128,220,0.9)';
    ctx.beginPath();
    ctx.arc(u.orb.x, u.orb.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawUnitShape(ctx, clsKey, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  // 台座
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(angle);
  if (clsKey === 'wingdiver') {
    // 翼
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(-4, -4); ctx.lineTo(-16, -16); ctx.lineTo(-10, 0); ctx.lineTo(-16, 16); ctx.lineTo(-4, 4);
    ctx.fill();
  }
  if (clsKey === 'fencer') {
    // 盾
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(6, -16, 6, 20);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(6, 6, 16, 4);
  }
  // 胴体
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, clsKey === 'fencer' ? 13 : 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 銃
  ctx.fillStyle = '#222';
  ctx.fillRect(4, clsKey === 'fencer' ? 6 : -2, 16, 4);
  // ヘルメット
  ctx.fillStyle = clsKey === 'wingdiver' ? '#fce4ec' : '#37474f';
  ctx.beginPath();
  ctx.arc(1, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  if (clsKey === 'airraider') {
    ctx.strokeStyle = '#ffe082';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -6); ctx.lineTo(-16, -14);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(CLASSES[clsKey].short, x - 1, y + 1);
}

// ---------- 敵 ----------
function drawEnemy(ctx, e, t) {
  const d = ENEMIES[e.type];
  const s = d.size;
  if (e.hitFlash > 0) ctx.filter = 'brightness(2.2)';
  if (!drawSpriteImage(ctx, 'enemy_' + e.type, e.x, e.y, s * 2.6, e.angle)) {
    drawEnemyShape(ctx, e, d, t);
  }
  ctx.filter = 'none';
  if (e.hp < e.maxHp) {
    const w = Math.max(20, s * 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(e.x - w / 2, e.y - s - 8, w, 4);
    ctx.fillStyle = d.boss ? '#ab47bc' : '#ef5350';
    ctx.fillRect(e.x - w / 2, e.y - s - 8, w * (e.hp / e.maxHp), 4);
  }
}

function drawEnemyShape(ctx, e, d, t) {
  const s = d.size;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (d.flying) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(4, 10, s, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.rotate(e.angle);
  const wob = Math.sin(t * 18 + e.id) * 0.4;
  switch (e.type) {
    case 'antBlack':
    case 'antRed':
    case 'android': {
      if (e.type === 'android') {
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(s * 0.3, -2, s * 0.6, 4);
        break;
      }
      ctx.strokeStyle = d.color; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(i * s * 0.4, 0);
        ctx.lineTo(i * s * 0.5 + wob * 4 * side, side * s * 1.1); ctx.stroke();
      }
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.ellipse(-s * 0.8, 0, s * 0.7, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.4, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.6, 0, s * 0.45, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#666';
      ctx.beginPath(); ctx.moveTo(s, -3); ctx.lineTo(s * 1.4, -6); ctx.moveTo(s, 3); ctx.lineTo(s * 1.4, 6); ctx.stroke();
      break;
    }
    case 'spider': {
      ctx.strokeStyle = d.color; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
        const a = (i - 1.5) * 0.5 + wob * 0.3;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * s * 1.5 * 0.6, side * s * 1.5);
        ctx.stroke();
      }
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(-s * 0.4, 0, s * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.4, 0, s * 0.45, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'roller': {
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.35, -s * 0.9); ctx.lineTo(i * s * 0.35, s * 0.9); ctx.stroke(); }
      break;
    }
    case 'wasp': {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      const f = Math.sin(t * 60) * 0.5 + 0.5;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.8, s * 0.5, s * (0.4 + f * 0.4), 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, s * 0.8, s * 0.5, s * (0.4 + f * 0.4), -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.ellipse(-s * 0.5, 0, s * 0.8, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(-s * 0.7, -s * 0.4, 3, s * 0.8); ctx.fillRect(-s * 0.3, -s * 0.4, 3, s * 0.8);
      ctx.beginPath(); ctx.arc(s * 0.5, 0, s * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'drone':
    case 'mothership': {
      ctx.rotate(-e.angle);
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#455a64'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ff1744';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
      if (e.type === 'mothership') {
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2 + t;
          ctx.fillStyle = '#ffeb3b';
          ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.5, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    default: { // colonist, cosmonaut, erginus
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.8, s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = e.type === 'erginus' ? '#ffeb3b' : '#e0e0e0';
      ctx.beginPath(); ctx.arc(s * 0.5, 0, s * 0.35, 0, Math.PI * 2); ctx.fill();
      if (e.type === 'erginus') {
        ctx.fillStyle = '#7b1fa2';
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.2 + i * 6, -4); ctx.lineTo(-s * 0.2 + i * 6 - 4, 0); ctx.lineTo(-s * 0.2 + i * 6, 4); ctx.fill(); }
      } else {
        ctx.fillStyle = '#212121';
        ctx.fillRect(s * 0.3, s * 0.4, s, 4);
      }
    }
  }
  ctx.restore();
}

// ---------- アイテム箱 ----------
function drawCrate(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y + Math.sin(c.t * 5) * 2);
  ctx.fillStyle = c.kind === 'armor' ? '#66bb6a' : c.kind === 'weapon' ? '#ef5350' : '#fff176';
  ctx.fillRect(-6, -6, 12, 12);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(-6, -6, 12, 12);
  ctx.restore();
}
