// ゲーム本編（1回のプレイ＝ラン）のロジック
'use strict';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function fmtNum(n) {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  if (n < 1e8) return (n / 1e4).toFixed(n < 1e5 ? 1 : 0) + '万';
  if (n < 1e12) return (n / 1e8).toFixed(n < 1e9 ? 1 : 0) + '億';
  return (n / 1e12).toFixed(1) + '兆';
}
function fmtTime(t) { t = Math.max(0, Math.floor(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }

// ---------- 空間グリッド（当たり判定の高速化） ----------
const GRID = 80;
const Grid = {
  map: new Map(),
  clear() { this.map.clear(); },
  key(cx, cy) { return (cx + 50000) * 100000 + (cy + 50000); },
  add(e) {
    const k = this.key(Math.floor(e.x / GRID), Math.floor(e.y / GRID));
    let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); } a.push(e);
  },
  query(x, y, r, cb) {
    const x0 = Math.floor((x - r) / GRID), x1 = Math.floor((x + r) / GRID);
    const y0 = Math.floor((y - r) / GRID), y1 = Math.floor((y + r) / GRID);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.map.get(this.key(cx, cy)); if (!a) continue;
      for (let i = 0; i < a.length; i++) { const e = a[i]; if (!e.dead && cb(e) === false) return; }
    }
  },
};

// ---------- ラン ----------
const Game = {
  run: null,
  uid: 1,

  start(opts) {
    // opts: { stage, hard, char, support, resume }
    const sv = Save.data;
    const stage = D.STAGES.find(s => s.id === opts.stage);
    const ch = D.CHARS.find(c => c.id === opts.char);
    const meta = metaStats(ch.id);
    if (opts.support) {
      const sp = D.CHARS.find(c => c.id === opts.support);
      if (sp) addStats(meta, sp.bonus, 0.5);
    }
    const R = this.run = {
      stage, hard: !!opts.hard, curse: sv.facilities.altar ? sv.curse : 0, challenge: sv.facilities.altar ? sv.challenge : null,
      char: ch, support: opts.support ? D.CHARS.find(c => c.id === opts.support) : null,
      meta, t: 0, over: false, paused: false, speed: 1,
      player: { x: 0, y: 0, r: 16, hp: 1, maxHp: 1, fx: 1, fy: 0, face: 1, invul: 0, level: 1, xp: 0, moving: false, revives: Math.floor(meta.revival) },
      sup: null,
      stats: null, weapons: [], passives: {}, banished: [],
      rerolls: 1 + Math.floor(meta.reroll), banishes: Math.floor(meta.banish),
      enemies: [], projs: [], zones: [], ebullets: [], gems: [], drops: [], fx: [], nums: [],
      kills: 0, gold: 0, dmgTotal: 0, dmgBy: {}, special: 0, specialT: 0,
      spawnAcc: 0, nextElite: 150, nextRush: 200, bossSpawned: false, bossIds: [], bossQueue: null,
      levelQueue: 0, pendingChest: 0, earnedEquip: [], hitstop: 0, shake: 0, cutin: null,
      floor: 1, cleared: false, killsBy: {}, rainT: 0, spinBeam: null, parts: [], flash: null,
    };
    if (R.support) R.sup = { x: -30, y: 20, r: 14 };
    this.recalc();
    R.player.hp = R.player.maxHp;
    this.addWeapon(ch.weapon, 'p');
    if (R.support) this.addWeapon(R.support.weapon, 's');
    if (stage.special === 'bossrush') R.bossQueue = ['treant', 'frostdragon', 'mechtitan', 'void'];
    if (opts.resume) this.applyResume(opts.resume);
    sv.stats.runs++;
    Sound.playBgm(stage.bgm);
  },

  // 中断データ
  snapshot() {
    const R = this.run;
    return {
      stage: R.stage.id, hard: R.hard, curse: R.curse, challenge: R.challenge, char: R.char.id, support: R.support && R.support.id,
      t: R.t, level: R.player.level, xp: R.player.xp, hp: R.player.hp, revives: R.player.revives,
      weapons: R.weapons.filter(w => w.owner === 'p').map(w => ({ id: w.base, level: w.level, evo: w.evo, rare: w.rare })),
      passives: R.passives, gold: R.gold, kills: R.kills, dmgTotal: R.dmgTotal, dmgBy: R.dmgBy, killsBy: R.killsBy,
      rerolls: R.rerolls, banishes: R.banishes, banished: R.banished, special: R.special, earnedEquip: R.earnedEquip,
      nextElite: R.nextElite, nextRush: R.nextRush, bossSpawned: R.bossSpawned, bossQueue: R.bossQueue, floor: R.floor,
    };
  },
  applyResume(s) {
    const R = this.run;
    R.weapons = R.weapons.filter(w => w.owner !== 'p');
    for (const w of s.weapons) { const nw = this.addWeapon(w.id, 'p', w.rare); nw.level = w.level; if (w.evo) { this.makeEvolved(nw, w.evo); if (w.evo.startsWith('fus_')) nw.id = w.evo; } }
    Object.assign(R, { passives: s.passives || {}, gold: s.gold, kills: s.kills, dmgTotal: s.dmgTotal, dmgBy: s.dmgBy || {}, killsBy: s.killsBy || {},
      rerolls: s.rerolls, banishes: s.banishes, banished: s.banished || [], special: s.special || 0, earnedEquip: s.earnedEquip || [],
      nextElite: s.nextElite, nextRush: s.nextRush, bossSpawned: false, bossQueue: s.bossQueue, floor: s.floor || 1, t: s.t });
    R.player.level = s.level; R.player.xp = s.xp; R.player.revives = s.revives;
    this.recalc();
    R.player.hp = Math.min(R.player.maxHp, s.hp);
    R.weapons.forEach(w => this.calcWeapon(w));
  },

  // ---------- 能力値 ----------
  recalc() {
    const R = this.run;
    const s = Object.assign(emptyStats(), R.meta);
    for (const id in R.passives) { const p = D.PASSIVES[id]; s[p.stat] += p.per * R.passives[id]; }
    R.stats = s;
    const p = R.player;
    const oldMax = p.maxHp || 0;
    p.maxHp = Math.round(R.char.hp * (1 + s.maxHp));
    if (oldMax && p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    p.speed = 150 * R.char.speed * (1 + s.moveSpeed);
    p.magnet = 60 * (1 + s.magnet);
    R.weapons.forEach(w => this.calcWeapon(w));
  },

  addWeapon(id, owner, rare) {
    const R = this.run;
    const def = D.WEAPONS[id];
    if (rare === undefined) rare = owner === 'p' && Math.random() < 0.08 * (1 + R.stats.luck);
    const w = { uid: this.uid++, id, base: id, def, name: def.name, type: def.type, elem: def.elem, icon: def.icon, level: 1, owner, rare, timer: 0.3, evo: null, st: {} };
    R.weapons.push(w);
    this.calcWeapon(w);
    if (owner === 'p') Save.data.stats.weaponsSeen[id] = true;
    return w;
  },
  makeEvolved(w, evoId) {
    const ev = D.EVOLUTIONS.find(e => e.id === evoId);
    if (ev) { w.evo = ev.id; w.name = ev.name; w.level = D.WEAPON_MAX; this.calcWeapon(w); return; }
    const fu = D.FUSIONS.find(f => f.id === evoId);
    if (fu) { w.evo = fu.id; w.name = fu.name; w.type = fu.type; w.elem = fu.elem; w.icon = fu.icon; w.level = D.WEAPON_MAX; w.st = {}; this.calcWeapon(w); }
  },
  calcWeapon(w) {
    const R = this.run; const s = R.stats;
    let p;
    const fu = w.evo && D.FUSIONS.find(f => f.id === w.evo);
    if (fu) p = Object.assign({}, fu.base);
    else {
      p = Object.assign({}, w.def.base);
      const lvl = w.owner === 's' ? Math.min(D.WEAPON_MAX, 1 + Math.floor(R.player.level / 6)) : w.level;
      if (w.owner === 's') w.level = lvl;
      for (let i = 0; i < lvl - 1; i++) { const d = w.def.lv[i]; for (const k in d) p[k] = (p[k] || 0) + d[k]; }
      const ev = w.evo && D.EVOLUTIONS.find(e => e.id === w.evo);
      if (ev) for (const k in ev.mult) { if (k === 'amount' || k === 'pierce') p[k] = (p[k] || 0) + ev.mult[k]; else p[k] = (p[k] || 0) * ev.mult[k]; }
    }
    const rare = w.rare ? 1.3 : 1;
    p.dmg = p.dmg * (1 + s.might) * rare * (w.owner === 's' ? 0.7 : 1);
    p.cd = Math.max(0.08, p.cd * Math.max(0.3, 1 - s.cooldown));
    if (p.amount !== undefined) p.amount = Math.round(p.amount + s.amount);
    for (const k of ['area', 'size', 'radius', 'width']) if (p[k] !== undefined) p[k] *= (1 + s.area);
    if (p.length !== undefined) p.length *= (1 + s.area * 0.5);
    if (p.speed !== undefined) p.speed *= (1 + s.projSpeed);
    if (p.dur !== undefined) p.dur *= (1 + s.duration);
    if (p.slow !== undefined) p.slow = Math.min(0.85, p.slow);
    w.p = p;
  },

  // ---------- メインループ ----------
  update(dt) {
    const R = this.run; if (!R || R.over) return;
    if (R.hitstop > 0) { R.hitstop -= dt; return; }
    if (R.cutin) { R.cutin.t -= dt; if (R.cutin.t <= 0) R.cutin = null; dt *= 0.15; }
    R.t += dt;
    Save.data.stats.playTime += dt;
    const p = R.player;

    // 移動
    const mv = Input.vector();
    p.moving = mv.x !== 0 || mv.y !== 0;
    if (p.moving) {
      p.x += mv.x * p.speed * dt; p.y += mv.y * p.speed * dt;
      const l = Math.hypot(mv.x, mv.y); p.fx = mv.x / l; p.fy = mv.y / l;
      if (Math.abs(mv.x) > 0.1) p.face = mv.x > 0 ? 1 : -1;
    }
    if (p.invul > 0) p.invul -= dt;
    if (R.stats.regen > 0 && R.challenge !== 'noheal') p.hp = Math.min(p.maxHp, p.hp + R.stats.regen * dt);
    if (R.sup) {
      const tx = p.x - p.fx * 40 - 10, ty = p.y - p.fy * 40 + 10;
      R.sup.x += (tx - R.sup.x) * Math.min(1, dt * 4); R.sup.y += (ty - R.sup.y) * Math.min(1, dt * 4);
    }

    // グリッド更新
    Grid.clear();
    for (const e of R.enemies) Grid.add(e);

    this.spawnLogic(dt);
    this.updateWeapons(dt);
    this.updateProjs(dt);
    this.updateZones(dt);
    this.updateEnemies(dt);
    this.updateEBullets(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    this.updateSpecial(dt);

    // 消えた敵を詰める
    let j = 0;
    for (let i = 0; i < R.enemies.length; i++) { const e = R.enemies[i]; if (!e.dead) R.enemies[j++] = e; }
    R.enemies.length = j;

    if (R.shake > 0) R.shake = Math.max(0, R.shake - dt * 30);

    // クリア判定
    const st = R.stage;
    if (st.time && !st.special && R.t >= st.time) this.finish(true);
    if (st.special === 'vault' && R.t >= st.time) this.finish(true);
    if (st.special === 'abyss') { const f = 1 + Math.floor(R.t / 90); if (f > R.floor) { R.floor = f; UI.toast(`深淵 ${f}階`); this.spawnElite(); } }

    if (R.levelQueue > 0 && !UI.modalOpen()) { R.levelQueue--; UI.showLevelUp(); }
    else if (R.pendingChest > 0 && !UI.modalOpen()) { R.pendingChest--; this.openChest(); }
  },

  // ---------- 敵の出現 ----------
  diffMul() {
    const R = this.run;
    let m = R.stage.hpMul * (R.hard ? 2.5 : 1) * (1 + R.curse * 0.18);
    if (R.stage.special === 'abyss') m *= Math.pow(1.32, R.floor - 1);
    return m;
  },
  currentPool() {
    const w = this.run.stage.waves; let pool = w[0][1];
    for (const x of w) if (this.run.t >= x[0]) pool = x[1];
    return pool;
  },
  spawnLogic(dt) {
    const R = this.run; const st = R.stage;
    const cap = Save.data.settings.light ? 320 : 650;
    let rate = (2.2 + R.t / 14) * (1 + R.curse * 0.1) * (R.hard ? 1.4 : 1);
    if (st.special === 'bossrush') rate = 1.2;
    if (st.special === 'abyss') rate *= 1 + R.floor * 0.08;
    rate = Math.min(rate, 40);
    R.spawnAcc += rate * dt;
    while (R.spawnAcc >= 1) {
      R.spawnAcc--;
      if (R.enemies.length >= cap) break;
      let type = pick(this.currentPool());
      if (st.special === 'vault' && Math.random() < 0.15) type = 'goldslime';
      else if (type === 'goldslime' && Math.random() < 0.6) type = 'slime';
      this.spawnEnemy(type);
    }
    // 中ボス
    if (R.t >= R.nextElite && st.special !== 'bossrush') { R.nextElite += st.special === 'throne' ? 60 : 150; this.spawnElite(); }
    // ラッシュ
    if (R.t >= R.nextRush && st.special !== 'bossrush') { R.nextRush += 200; this.spawnRush(); }
    // ステージボス（倒さなくてもクリアできる）
    if (st.boss && st.time && !R.bossSpawned && R.t >= st.time - 90) { R.bossSpawned = true; this.spawnBoss(st.boss); }
    if (st.special === 'throne' && !R.bossSpawned && R.t >= 60) { R.bossSpawned = true; this.spawnBoss('void'); }
    if (st.special === 'bossrush' && R.bossIds.every(b => b.dead) && R.t > 3) {
      if (R.bossQueue.length) { const b = R.bossQueue.shift(); R.bossIds = [this.spawnBoss(b, 2 + (3 - R.bossQueue.length))]; }
      else if (!R.cleared) { Save.data.stats.bossrushClear = true; this.finish(true); }
    }
  },
  spawnPos(extra = 0) {
    const p = this.run.player;
    const v = Render.viewSize();
    const rad = Math.hypot(v.w, v.h) / 2 + 40 + extra;
    const a = Math.random() * TAU;
    return { x: p.x + Math.cos(a) * rad, y: p.y + Math.sin(a) * rad };
  },
  spawnEnemy(type, pos, scale = 1) {
    const R = this.run;
    const def = D.ENEMIES[type] || D.BOSSES[type];
    const pp = pos || this.spawnPos();
    const tm = 1 + R.t / 60 * 0.15;
    const hp = def.hp * this.diffMul() * tm * scale;
    const e = {
      id: this.uid++, type, def, x: pp.x, y: pp.y, r: def.r, hp, maxHp: hp, spd: def.spd * rand(0.9, 1.1),
      dmg: def.dmg * (1 + (this.diffMul() - 1) * 0.35) * (1 + R.t / 600 * 0.5), xp: def.xp, weak: def.weak, ai: def.ai,
      kx: 0, ky: 0, flash: 0, slowT: 0, slowF: 0, frozen: 0, lh: {}, ph: Math.random() * TAU, atk: rand(1, 3), dead: false,
      elite: false, boss: false, hue: def.hue || 0, coin: def.coin || 0, life: def.ai === 'flee' ? 18 : 0,
    };
    R.enemies.push(e);
    return e;
  },
  spawnElite() {
    const R = this.run;
    const type = pick(this.currentPool().filter(t => t !== 'goldslime')) || 'slime';
    const e = this.spawnEnemy(type, null, 25);
    e.elite = true; e.r *= 1.8; e.spd *= 0.85; e.xp *= 20; e.dmg *= 1.5; e.kbRes = 0.9;
    UI.toast('強敵が現れた！');
  },
  spawnBoss(type, scale = 1) {
    const R = this.run;
    let def = D.BOSSES[type];
    if (type === 'void') def = Object.assign({}, D.BOSSES.mechtitan, { name: '虚ろの王', hp: 60000, r: 70, color: '#6a3cff', hue: 250, dmg: 45 });
    const pp = this.spawnPos(-60);
    const tm = 1 + R.t / 60 * 0.15;
    const hp = def.hp * this.diffMul() * tm * scale;
    const e = {
      id: this.uid++, type, def, x: pp.x, y: pp.y, r: def.r, hp, maxHp: hp, spd: def.spd, dmg: def.dmg * (1 + R.curse * 0.1) * (R.hard ? 1.5 : 1),
      xp: def.xp, weak: def.weak, ai: 'boss', kx: 0, ky: 0, flash: 0, slowT: 0, slowF: 0, frozen: 0, lh: {}, ph: 0, atk: 3, dash: 0,
      dead: false, elite: true, boss: true, kbRes: 1, hue: def.hue || 0, coin: 0, life: 0,
    };
    R.enemies.push(e); R.bossIds.push(e);
    UI.toast(`${def.name} が現れた！`, 3);
    Sound.playBgm(R.stage.bgm, true);
    R.shake = 12;
    return e;
  },
  spawnRush() {
    const R = this.run; const p = R.player;
    const type = pick(this.currentPool());
    const n = Save.data.settings.light ? 30 : 60;
    if (Math.random() < 0.5) {
      // 包囲：輪になって迫ってくる
      const rad = 520;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; this.spawnEnemy(type, { x: p.x + Math.cos(a) * rad, y: p.y + Math.sin(a) * rad }); }
      UI.toast('包囲ラッシュ！');
    } else {
      // 横一列の突撃
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const e = this.spawnEnemy(type, { x: p.x - dir * 600 - (i % 3) * 30, y: p.y - 420 + (i / n) * 840 });
        e.ai = 'charge'; e.vx = dir * (140 + R.t / 20); e.life = 9;
      }
      UI.toast('突撃ラッシュ！');
    }
  },

  // ---------- 武器 ----------
  ownerPos(w) { const R = this.run; return w.owner === 's' && R.sup ? R.sup : R.player; },
  nearest(x, y, maxR = 700) {
    let best = null, bd = maxR * maxR;
    for (const e of this.run.enemies) { if (e.dead) continue; const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    return best;
  },
  randomOnScreen(n) {
    const R = this.run; const v = Render.viewSize(); const p = R.player;
    const list = R.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < v.w / 2 && Math.abs(e.y - p.y) < v.h / 2);
    const out = [];
    for (let i = 0; i < n && list.length; i++) out.push(list.splice(Math.floor(Math.random() * list.length), 1)[0]);
    return out;
  },
  updateWeapons(dt) {
    const R = this.run;
    for (const w of R.weapons) {
      const o = this.ownerPos(w); const p = w.p;
      // 常駐系
      if (w.type === 'minion') { this.tickMinions(w, dt, o); continue; }
      if (w.type === 'drone') { this.tickDrones(w, dt, o); continue; }
      if (w.type === 'orbit') { this.tickOrbit(w, dt, o); continue; }
      w.timer -= dt;
      if (w.timer > 0) continue;
      w.timer = p.cd;
      this.fire(w, o);
    }
  },
  fire(w, o) {
    const R = this.run; const p = w.p; const pl = R.player;
    switch (w.type) {
      case 'homing': {
        for (let i = 0; i < p.amount; i++) {
          const t = this.nearest(o.x, o.y, 600);
          const a = t ? Math.atan2(t.y - o.y, t.x - o.x) + rand(-0.4, 0.4) : rand(0, TAU);
          R.projs.push({ kind: 'homing', w, x: o.x, y: o.y, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, r: p.size, life: p.dur, pierce: p.pierce, target: t, hit: {} });
        }
        Sound.sfx('shoot'); break;
      }
      case 'arrow': {
        const base = Math.atan2(pl.fy, pl.fx);
        for (let i = 0; i < p.amount; i++) {
          const a = base + (i - (p.amount - 1) / 2) * p.spread;
          R.projs.push({ kind: 'arrow', w, x: o.x, y: o.y, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, r: p.size, life: p.dur, pierce: p.pierce, hit: {} });
        }
        Sound.sfx('shoot'); break;
      }
      case 'shard': {
        const off = Math.random() * TAU;
        for (let i = 0; i < p.amount; i++) {
          const a = off + i / p.amount * TAU;
          R.projs.push({ kind: 'shard', w, x: o.x, y: o.y, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, r: p.size, life: p.dur, pierce: p.pierce, hit: {} });
        }
        Sound.sfx('shoot'); break;
      }
      case 'slash': {
        const base = Math.atan2(pl.fy, pl.fx);
        for (let i = 0; i < p.amount; i++) {
          const a = base + (i % 2 ? Math.PI : 0) + Math.floor(i / 2) * 0.6;
          setTimeout(() => { if (this.run && !this.run.over) this.doSlash(w, o, a); }, i * 90);
        }
        break;
      }
      case 'beam': {
        for (let i = 0; i < p.amount; i++) {
          const t = this.nearest(o.x, o.y, p.length + 60);
          const a = t ? Math.atan2(t.y - o.y, t.x - o.x) + i * 0.35 : Math.atan2(pl.fy, pl.fx) + i * 0.35;
          R.zones.push({ kind: 'beam', w, ang: a, life: p.dur, max: p.dur, tick: 0, owner: o });
        }
        Sound.sfx('shoot'); break;
      }
      case 'aura': {
        const rr = p.radius;
        Grid.query(o.x, o.y, rr + 30, e => { if (dist2(o.x, o.y, e.x, e.y) < (rr + e.r) ** 2) this.hit(e, p.dmg, w, 0.3, o); });
        break;
      }
      case 'strike': {
        const ts = this.randomOnScreen(p.amount);
        for (const t of ts) {
          R.fx.push({ kind: 'bolt', x: t.x, y: t.y, life: 0.3, max: 0.3, color: D.ELEM[w.elem].color, r: p.area }); this.spark(t.x, t.y, D.ELEM[w.elem].color, 8, 220, 3, 0.4); R.shake = Math.max(R.shake, 2);
          Grid.query(t.x, t.y, p.area + 30, e => { if (dist2(t.x, t.y, e.x, e.y) < (p.area + e.r) ** 2) { this.hit(e, p.dmg, w, 0.5); if (p.slow) this.slow(e, p.slow, 2); } });
        }
        if (ts.length) Sound.sfx('hit'); break;
      }
      case 'bomb': {
        for (let i = 0; i < p.amount; i++) {
          const t = this.randomOnScreen(1)[0];
          const tx = t ? t.x : o.x + rand(-200, 200), ty = t ? t.y : o.y + rand(-200, 200);
          R.projs.push({ kind: 'lob', w, x: o.x, y: o.y, sx: o.x, sy: o.y, tx, ty, t: 0, life: 0.55, r: 8, hit: {} });
        }
        break;
      }
      case 'boomerang': {
        for (let i = 0; i < p.amount; i++) {
          const t = this.nearest(o.x, o.y, 500);
          const a = (t ? Math.atan2(t.y - o.y, t.x - o.x) : Math.atan2(pl.fy, pl.fx)) + (i - (p.amount - 1) / 2) * 0.5;
          R.projs.push({ kind: 'boomerang', w, x: o.x, y: o.y, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, r: p.size, life: p.dur * 2.2, t: 0, back: false, hit: {}, rot: 0 });
        }
        break;
      }
      case 'mine': {
        for (let i = 0; i < p.amount; i++) R.zones.push({ kind: 'mine', w, x: o.x + rand(-30, 30) * i, y: o.y + rand(-30, 30) * i, life: p.dur, max: p.dur, arm: 0.4 });
        break;
      }
      case 'tornado': {
        for (let i = 0; i < p.amount; i++) {
          const a = rand(0, TAU);
          R.zones.push({ kind: 'tornado', w, x: o.x, y: o.y, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, r: p.size, life: p.dur, max: p.dur, tick: 0 });
        }
        break;
      }
      case 'puddle': {
        const ts = this.randomOnScreen(p.amount);
        for (let i = 0; i < p.amount; i++) {
          const t = ts[i]; const x = t ? t.x : o.x + rand(-150, 150), y = t ? t.y : o.y + rand(-150, 150);
          R.zones.push({ kind: 'puddle', w, x, y, r: p.area, life: p.dur, max: p.dur, tick: 0 });
        }
        break;
      }
      case 'meteor': {
        const ts = this.randomOnScreen(p.amount);
        for (let i = 0; i < p.amount; i++) {
          const t = ts[i]; const x = t ? t.x : o.x + rand(-200, 200), y = t ? t.y : o.y + rand(-200, 200);
          R.zones.push({ kind: 'meteor', w, x, y, r: p.area, life: 0.8, max: 0.8 });
        }
        break;
      }
    }
  },
  doSlash(w, o, a) {
    const R = this.run; const p = w.p;
    const reach = p.area * 1.6;
    R.fx.push({ kind: 'slash', x: o.x, y: o.y, a, r: reach, life: 0.18, max: 0.18, color: w.evo ? '#ff6a8a' : '#fff' });
    Grid.query(o.x, o.y, reach + 30, e => {
      const dx = e.x - o.x, dy = e.y - o.y; const d = Math.hypot(dx, dy);
      if (d > reach + e.r) return;
      let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < 1.1 || d < 30) this.hit(e, p.dmg, w, 1.2, o);
    });
    Sound.sfx('shoot');
  },
  tickMinions(w, dt, o) {
    const R = this.run; const p = w.p;
    if (!w.st.list) w.st.list = [];
    const L = w.st.list;
    while (L.length < p.amount) L.push({ x: o.x + rand(-20, 20), y: o.y + rand(-20, 20), vx: 0, vy: 0, cd: 0, t: null, ph: rand(0, TAU) });
    L.length = p.amount;
    for (const m of L) {
      m.ph += dt * 3;
      if (!m.t || m.t.dead || dist2(m.x, m.y, o.x, o.y) > 500 * 500) m.t = this.nearest(m.x, m.y, 380);
      let tx, ty;
      if (m.t) { tx = m.t.x; ty = m.t.y; } else { tx = o.x + Math.cos(m.ph) * 50; ty = o.y + Math.sin(m.ph) * 50; }
      const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
      m.vx += (dx / d * p.speed - m.vx) * Math.min(1, dt * 6); m.vy += (dy / d * p.speed - m.vy) * Math.min(1, dt * 6);
      m.x += m.vx * dt; m.y += m.vy * dt;
      m.cd -= dt;
      if (m.cd <= 0) {
        let did = false;
        Grid.query(m.x, m.y, p.size + 30, e => { if (dist2(m.x, m.y, e.x, e.y) < (p.size + e.r) ** 2) { this.hit(e, p.dmg, w, 0.4); did = true; } });
        if (did) m.cd = p.tick;
      }
    }
  },
  tickDrones(w, dt, o) {
    const R = this.run; const p = w.p;
    if (!w.st.list) w.st.list = [];
    const L = w.st.list;
    while (L.length < p.amount) L.push({ x: o.x, y: o.y, cd: rand(0, p.cd), a: rand(0, TAU) });
    L.length = p.amount;
    L.forEach((m, i) => {
      m.a += dt * 1.5;
      const a = m.a + i / L.length * TAU;
      m.x = o.x + Math.cos(a) * p.radius; m.y = o.y + Math.sin(a) * p.radius * 0.7 - 10;
      m.cd -= dt;
      if (m.cd <= 0) {
        const t = this.nearest(m.x, m.y, 450);
        if (t) {
          m.cd = p.cd;
          const aa = Math.atan2(t.y - m.y, t.x - m.x);
          R.projs.push({ kind: 'bolt', w, x: m.x, y: m.y, vx: Math.cos(aa) * p.speed, vy: Math.sin(aa) * p.speed, r: p.size, life: 1.2, pierce: p.pierce || 1, hit: {} });
        }
      }
    });
  },
  tickOrbit(w, dt, o) {
    const p = w.p;
    w.st.a = (w.st.a || 0) + dt * p.spin;
    if (w.st.on === undefined) { w.st.on = true; w.st.t = p.dur; }
    w.st.t -= dt;
    if (w.st.t <= 0) { w.st.on = !w.st.on; w.st.t = w.st.on ? p.dur : p.cd; }
    if (!w.st.on) return;
    for (let i = 0; i < p.amount; i++) {
      const a = w.st.a + i / p.amount * TAU;
      const x = o.x + Math.cos(a) * p.radius, y = o.y + Math.sin(a) * p.radius;
      Grid.query(x, y, p.size + 30, e => {
        if (dist2(x, y, e.x, e.y) < (p.size + e.r) ** 2 && (e.lh[w.uid] || 0) <= this.run.t) { e.lh[w.uid] = this.run.t + 0.35; this.hit(e, p.dmg, w, 1, o); }
      });
    }
  },

  updateProjs(dt) {
    const R = this.run; const P = R.projs;
    for (let i = P.length - 1; i >= 0; i--) {
      const b = P[i];
      b.life -= dt;
      if (b.kind === 'homing') {
        if (!b.target || b.target.dead) b.target = this.nearest(b.x, b.y, 400);
        if (b.target) {
          const sp = Math.hypot(b.vx, b.vy);
          const a0 = Math.atan2(b.vy, b.vx), a1 = Math.atan2(b.target.y - b.y, b.target.x - b.x);
          let da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
          const a = a0 + clamp(da, -6 * dt, 6 * dt);
          b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
        }
      } else if (b.kind === 'boomerang') {
        b.t += dt; b.rot += dt * 18;
        const o = this.ownerPos(b.w);
        if (b.t > b.w.p.dur * 0.5) {
          const dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy) || 1;
          const sp = b.w.p.speed * 1.1;
          b.vx += (dx / d * sp - b.vx) * Math.min(1, dt * 5); b.vy += (dy / d * sp - b.vy) * Math.min(1, dt * 5);
          if (d < 20 && b.t > b.w.p.dur * 0.6) b.life = 0;
        }
      } else if (b.kind === 'lob') {
        b.t += dt;
        const k = b.t / 0.55;
        b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k - Math.sin(k * Math.PI) * 60;
        if (b.life <= 0) {
          const p = b.w.p;
          this.boom(b.tx, b.ty, p.area, '#ff8a3c', 'fx_explosion');
          Grid.query(b.tx, b.ty, p.area + 30, e => { if (dist2(b.tx, b.ty, e.x, e.y) < (p.area + e.r) ** 2) this.hit(e, p.dmg, b.w, 0.8); });
          R.zones.push({ kind: 'burn', w: b.w, x: b.tx, y: b.ty, r: p.area * 0.9, life: p.dur, max: p.dur, tick: 0 });
          Sound.sfx('boom');
          P.splice(i, 1);
        }
        continue;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (R.parts.length < 700 && !Save.data.settings.light && Math.random() < 0.5) R.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: Math.max(2, b.r * 0.5), color: D.ELEM[b.w.elem].color });
      if (b.life <= 0) { P.splice(i, 1); continue; }
      let gone = false;
      Grid.query(b.x, b.y, b.r + 30, e => {
        if (gone) return false;
        if (b.hit[e.id] && b.hit[e.id] > R.t) return;
        if (dist2(b.x, b.y, e.x, e.y) > (b.r + e.r) ** 2) return;
        b.hit[e.id] = b.kind === 'boomerang' ? R.t + 0.3 : 1e9;
        this.hit(e, b.w.p.dmg, b.w, 0.6, b);
        if (b.kind === 'shard' && b.w.p.slow) this.slow(e, b.w.p.slow, 2);
        if (b.pierce !== undefined && b.kind !== 'boomerang') { b.pierce--; if (b.pierce <= 0) { gone = true; return false; } }
      });
      if (gone) P.splice(i, 1);
    }
  },
  updateZones(dt) {
    const R = this.run; const Z = R.zones;
    for (let i = Z.length - 1; i >= 0; i--) {
      const z = Z[i]; z.life -= dt;
      const p = z.w ? z.w.p : null;
      switch (z.kind) {
        case 'beam': {
          z.tick -= dt;
          if (z.tick <= 0) {
            z.tick = p.tick;
            const o = z.owner; const cx = Math.cos(z.ang), cy = Math.sin(z.ang);
            const L = p.length, W = p.width;
            Grid.query(o.x + cx * L / 2, o.y + cy * L / 2, L / 2 + 40, e => {
              const dx = e.x - o.x, dy = e.y - o.y; const along = dx * cx + dy * cy;
              if (along < 0 || along > L) return;
              const perp = Math.abs(dx * cy - dy * cx);
              if (perp < W + e.r) this.hit(e, p.dmg, z.w, 0.2, o);
            });
          }
          break;
        }
        case 'spinbeam': {
          z.ang += dt * 4.2; z.tick -= dt;
          if (z.tick <= 0) {
            z.tick = 0.08; const o = R.player; const cx = Math.cos(z.ang), cy = Math.sin(z.ang); const L = 650;
            Grid.query(o.x + cx * L / 2, o.y + cy * L / 2, L / 2 + 40, e => {
              const dx = e.x - o.x, dy = e.y - o.y; const along = dx * cx + dy * cy;
              if (along < 0 || along > L) return;
              if (Math.abs(dx * cy - dy * cx) < 40 + e.r) this.hit(e, z.dmg, null, 0.3, o);
            });
          }
          break;
        }
        case 'mine': {
          z.arm -= dt;
          if (z.arm <= 0) {
            let trig = false;
            Grid.query(z.x, z.y, 40, e => { if (dist2(z.x, z.y, e.x, e.y) < (24 + e.r) ** 2) { trig = true; return false; } });
            if (trig || z.life <= 0) {
              this.boom(z.x, z.y, p.area, '#b07cff', 'fx_burst');
              Grid.query(z.x, z.y, p.area + 30, e => { if (dist2(z.x, z.y, e.x, e.y) < (p.area + e.r) ** 2) this.hit(e, p.dmg, z.w, 1); });
              Sound.sfx('boom'); z.life = 0;
            }
          }
          break;
        }
        case 'tornado': {
          z.x += z.vx * dt; z.y += z.vy * dt;
          z.vx += rand(-200, 200) * dt; z.vy += rand(-200, 200) * dt;
          z.tick -= dt;
          if (z.tick <= 0) {
            z.tick = p.tick;
            Grid.query(z.x, z.y, z.r + 30, e => {
              if (dist2(z.x, z.y, e.x, e.y) < (z.r + e.r) ** 2) { this.hit(e, p.dmg, z.w, 0); if (!e.boss) { e.x += (z.x - e.x) * 0.2; e.y += (z.y - e.y) * 0.2; } }
            });
          }
          break;
        }
        case 'puddle': case 'burn': {
          z.tick -= dt;
          if (z.tick <= 0) {
            z.tick = p.tick || 0.4;
            Grid.query(z.x, z.y, z.r + 30, e => {
              if (dist2(z.x, z.y, e.x, e.y) < (z.r + e.r) ** 2) { this.hit(e, z.kind === 'burn' ? p.dmg * 0.25 : p.dmg, z.w, 0); if (z.kind === 'puddle') this.slow(e, 0.3, 0.5); }
            });
          }
          break;
        }
        case 'meteor': {
          if (z.life <= 0) {
            this.boom(z.x, z.y, z.r, '#ffb347', 'fx_explosion', 1.4); R.flash = { a: 0.25, c: '255,180,80' };
            Grid.query(z.x, z.y, z.r + 30, e => { if (dist2(z.x, z.y, e.x, e.y) < (z.r + e.r) ** 2) this.hit(e, p.dmg, z.w, 1.5); });
            R.shake = Math.max(R.shake, 6); Sound.sfx('boom');
          }
          break;
        }
      }
      if (z.life <= 0) Z.splice(i, 1);
    }
  },

  // 演出：火花の粒
  spark(x, y, color, n, spd, size, life) {
    const R = this.run; if (Save.data.settings.light) n = Math.min(n, 2);
    const cap = Save.data.settings.light ? 120 : 900;
    for (let i = 0; i < n && R.parts.length < cap; i++) {
      const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.7);
      R.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.5), max: life, size: size * (0.6 + Math.random() * 0.8), color });
    }
  },
  // 演出：爆発（衝撃波＋画像＋火花＋揺れ）
  boom(x, y, r, color, img, scale = 1) {
    const R = this.run;
    R.fx.push({ kind: 'ring', x, y, r, life: 0.35, max: 0.35, color });
    if (img) R.fx.push({ kind: 'spr', img, x, y, s: r * 2.2 * scale, life: 0.45, max: 0.45, rot: Math.random() * TAU, grow: true });
    this.spark(x, y, color, Math.round(12 * scale), 260 * scale, 4, 0.6);
    R.shake = Math.max(R.shake, 3 * scale);
  },
  slow(e, f, t) { if (e.boss) f *= 0.4; e.slowF = Math.max(e.slowF, f); e.slowT = Math.max(e.slowT, t); },

  // ダメージ処理
  hit(e, dmg, w, kb, src) {
    const R = this.run; if (e.dead) return;
    const elem = w ? w.elem : 'none';
    let weak = false;
    if (elem !== 'none' && e.weak === elem) { dmg *= 1.5; weak = true; }
    const eq = Save.data.equip;
    let crit = false;
    for (const s in eq) {
      const it = eq[s]; if (!it || !it.special) continue;
      if (it.special === 'double' && Math.random() < 0.1) { dmg *= 2; crit = true; }
      if (it.special === 'execute' && !e.boss && Math.random() < 0.03) dmg = e.hp + 1;
    }
    dmg *= rand(0.92, 1.08);
    e.hp -= dmg; e.flash = 0.08;
    R.dmgTotal += dmg;
    const key = w ? w.uid : 'special';
    R.dmgBy[key] = (R.dmgBy[key] || 0) + dmg;
    if (kb && !e.boss && src) {
      const dx = e.x - src.x, dy = e.y - src.y, d = Math.hypot(dx, dy) || 1;
      const k = kb * 120 * (1 - (e.kbRes || 0));
      e.kx += dx / d * k; e.ky += dy / d * k;
    }
    if (Save.data.settings.dmgNum && !Save.data.settings.light && R.nums.length < 90)
      R.nums.push({ x: e.x + rand(-8, 8), y: e.y - e.r, v: dmg, life: 0.6, weak, crit });
    if (Math.random() < 0.35) this.spark(e.x, e.y, D.ELEM[elem] ? D.ELEM[elem].color : '#fff', 2, 140, 2, 0.25);
    if (weak || crit || dmg > e.maxHp * 0.3) R.fx.push({ kind: 'hit', x: e.x, y: e.y, life: 0.15, max: 0.15, s: e.r * 2.2 });
    Sound.sfx('hit');
    if (e.hp <= 0) this.kill(e);
  },
  kill(e) {
    const R = this.run; if (e.dead) return;
    e.dead = true;
    R.kills++;
    R.killsBy[e.type] = (R.killsBy[e.type] || 0) + 1;
    R.special = Math.min(100, R.special + (e.boss ? 30 : e.elite ? 10 : 0.45));
    // 経験値の宝石
    const gv = e.xp;
    R.gems.push({ x: e.x, y: e.y, v: gv, big: gv >= 10, pull: false });
    if (R.gems.length > 500) this.mergeGems();
    const luck = R.stats.luck;
    const coinMul = R.stage.coinMul || 1;
    if (Math.random() < 0.015 * (1 + luck) * coinMul || e.coin) R.drops.push({ kind: 'coin', x: e.x + rand(-6, 6), y: e.y, v: (e.coin || 1) * (e.elite ? 10 : 1) });
    if (Math.random() < 0.0025 * (1 + luck)) R.drops.push({ kind: 'heal', x: e.x, y: e.y });
    if (Math.random() < 0.0012 * (1 + luck)) R.drops.push({ kind: 'magnet', x: e.x, y: e.y });
    for (const s in Save.data.equip) { const it = Save.data.equip[s]; if (it && it.special === 'vamp' && Math.random() < 0.02 && R.challenge !== 'noheal') R.player.hp = Math.min(R.player.maxHp, R.player.hp + 2); }
    if (e.elite) {
      R.drops.push({ kind: 'chest', x: e.x, y: e.y });
      if (Math.random() < (e.boss ? 1 : 0.35)) R.earnedEquip.push(makeEquip(Math.min(5, rollRarity(luck) + (e.boss ? 1 : 0) + (R.hard ? 1 : 0))));
      R.shake = Math.max(R.shake, e.boss ? 14 : 6);
      if (e.boss) { R.hitstop = 0.15; R.gold += 50 * coinMul; Sound.playBgm(R.stage.bgm); }
    }
    if (e.ai === 'split' && !e.elite) for (let i = 0; i < 3; i++) { const s = this.spawnEnemy('slime', { x: e.x + rand(-15, 15), y: e.y + rand(-15, 15) }); s.hp *= 2; }
    this.spark(e.x, e.y, e.def.color, e.elite ? 30 : 5, e.elite ? 320 : 160, e.elite ? 5 : 3, 0.45);
    if (R.fx.length < 160) R.fx.push({ kind: 'pop', x: e.x, y: e.y, r: e.r, life: 0.22, max: 0.22, color: e.def.color });
    if (e.elite) { this.boom(e.x, e.y, e.r * 2.5, '#ffd84a', 'fx_explosion', e.boss ? 2.5 : 1.5); R.flash = { a: e.boss ? 0.7 : 0.3, c: '255,240,200' }; }
    if (R.stage.special === 'throne' && e.type === 'void') { Save.data.stats.cleared.throne = true; this.finish(true); }
  },
  mergeGems() {
    const R = this.run; const p = R.player;
    let sum = 0; const keep = [];
    for (const g of R.gems) { if (dist2(g.x, g.y, p.x, p.y) > 400 * 400) sum += g.v; else keep.push(g); }
    R.gems = keep;
    if (sum > 0) { const a = rand(0, TAU); R.gems.push({ x: p.x + Math.cos(a) * 300, y: p.y + Math.sin(a) * 300, v: sum, big: true, pull: false }); }
  },

  // ---------- 敵の動き ----------
  updateEnemies(dt) {
    const R = this.run; const p = R.player;
    const tx = p.x, ty = p.y;
    for (const e of R.enemies) {
      if (e.dead) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.life) { e.life -= dt; if (e.life <= 0) { e.dead = true; continue; } }
      // ノックバック
      e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.85; e.ky *= 0.85;
      if (e.frozen > 0) { e.frozen -= dt; continue; }
      let spd = e.spd;
      if (e.slowT > 0) { e.slowT -= dt; spd *= 1 - e.slowF; if (e.slowT <= 0) e.slowF = 0; }
      const dx = tx - e.x, dy = ty - e.y; const d = Math.hypot(dx, dy) || 1;
      let vx = dx / d * spd, vy = dy / d * spd;
      switch (e.ai) {
        case 'zigzag': e.ph += dt * 4; vx += -dy / d * Math.sin(e.ph) * spd * 0.8; vy += dx / d * Math.sin(e.ph) * spd * 0.8; break;
        case 'ranged':
          if (d < 200) { vx = -vx * 0.6; vy = -vy * 0.6; } else if (d < 260) { vx *= 0.1; vy *= 0.1; }
          e.atk -= dt;
          if (e.atk <= 0 && d < 420) { e.atk = 2.6; R.ebullets.push({ x: e.x, y: e.y, vx: dx / d * 170, vy: dy / d * 170, r: 7, dmg: e.dmg, life: 4 }); }
          break;
        case 'bomb':
          if (d < 50 || e.fuse !== undefined) {
            e.fuse = (e.fuse === undefined ? 0.6 : e.fuse) - dt; vx = vy = 0;
            if (e.fuse <= 0) {
              e.dead = true;
              this.boom(e.x, e.y, 70, '#ff5533', 'fx_explosion');
              if (d < 70 + p.r) this.hurt(e.dmg);
              Sound.sfx('boom'); continue;
            }
          }
          break;
        case 'flee': vx = -vx * 1.1; vy = -vy * 1.1; break;
        case 'charge': vx = e.vx; vy = 0; break;
        case 'boss':
          e.atk -= dt;
          if (e.dash > 0) { e.dash -= dt; vx = e.dvx; vy = e.dvy; }
          else if (e.atk <= 0) {
            e.atk = rand(3, 5);
            if (Math.random() < 0.5) {
              const n = e.type === 'void' ? 24 : 14; const off = rand(0, TAU);
              for (let i = 0; i < n; i++) { const a = off + i / n * TAU; R.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 9, dmg: e.dmg * 0.6, life: 5 }); }
            } else { e.dash = 0.7; e.dvx = dx / d * spd * 5; e.dvy = dy / d * spd * 5; }
          }
          break;
      }
      e.x += vx * dt; e.y += vy * dt;
      e.face = vx >= 0 ? 1 : -1;
      // 遠すぎる敵はプレイヤーの近くに出し直す
      if (d > 1400 && !e.boss) { const pp = this.spawnPos(); e.x = pp.x; e.y = pp.y; }
      // 接触ダメージ
      if (d < e.r + p.r) this.hurt(e.dmg);
    }
    // 敵同士の押し合い（軽め）
    for (const [, cell] of Grid.map) {
      const n = Math.min(cell.length, 14);
      for (let i = 0; i < n; i++) for (let k = i + 1; k < n; k++) {
        const a = cell[i], b = cell[k]; const dx = b.x - a.x, dy = b.y - a.y; const rr = (a.r + b.r) * 0.8;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2); const push = (rr - d) * 0.25 / d;
          const wa = a.boss ? 0 : 1, wb = b.boss ? 0 : 1;
          a.x -= dx * push * wa; a.y -= dy * push * wa; b.x += dx * push * wb; b.y += dy * push * wb;
        }
      }
    }
  },
  updateEBullets(dt) {
    const R = this.run; const p = R.player; const B = R.ebullets;
    for (let i = B.length - 1; i >= 0; i--) {
      const b = B[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) ** 2) { this.hurt(b.dmg); b.life = 0; }
      if (b.life <= 0) B.splice(i, 1);
    }
  },
  hurt(dmg) {
    const R = this.run; const p = R.player;
    if (p.invul > 0 || R.over) return;
    dmg = Math.max(1, dmg - R.stats.armor);
    p.hp -= dmg; p.invul = 0.5;
    R.shake = Math.max(R.shake, 5);
    Sound.sfx('hurt');
    for (const s in Save.data.equip) {
      const it = Save.data.equip[s];
      if (it && it.special === 'nova') {
        this.boom(p.x, p.y, 150, '#ff4f7b', 'fx_burst');
        Grid.query(p.x, p.y, 180, e => { if (dist2(p.x, p.y, e.x, e.y) < 150 * 150) this.hit(e, 30 * (1 + R.stats.might) * (1 + R.player.level * 0.1), null, 1.5, p); });
      }
    }
    if (p.hp <= 0) {
      if (p.revives > 0) {
        p.revives--; p.hp = p.maxHp * 0.5; p.invul = 2.5;
        this.boom(p.x, p.y, 300, '#fff3a8', 'fx_burst', 2); R.flash = { a: 0.6, c: '255,250,220' };
        Grid.query(p.x, p.y, 320, e => { if (!e.boss) { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1; e.kx += dx / d * 900; e.ky += dy / d * 900; } });
        UI.toast('復活！');
      } else this.finish(false);
    }
  },

  // ---------- 拾い物 ----------
  updatePickups(dt) {
    const R = this.run; const p = R.player;
    const mg = p.magnet; const mg2 = mg * mg;
    const G = R.gems;
    for (let i = G.length - 1; i >= 0; i--) {
      const g = G[i];
      const d2 = dist2(g.x, g.y, p.x, p.y);
      if (g.pull || d2 < mg2) {
        g.pull = true;
        const d = Math.sqrt(d2) || 1; const sp = 420 + (g.big ? 200 : 0);
        g.x += (p.x - g.x) / d * sp * dt; g.y += (p.y - g.y) / d * sp * dt;
        if (d < p.r + 6) { this.gainXp(g.v); G.splice(i, 1); Sound.sfx('gem'); }
      }
    }
    const Dr = R.drops;
    for (let i = Dr.length - 1; i >= 0; i--) {
      const o = Dr[i]; const d2 = dist2(o.x, o.y, p.x, p.y);
      if (d2 < (mg * 0.8) ** 2 || o.pull) {
        o.pull = true; const d = Math.sqrt(d2) || 1;
        o.x += (p.x - o.x) / d * 380 * dt; o.y += (p.y - o.y) / d * 380 * dt;
      }
      if (d2 < (p.r + 12) ** 2) {
        Dr.splice(i, 1);
        if (o.kind === 'coin') { R.gold += o.v; Sound.sfx('coin'); }
        else if (o.kind === 'heal') { if (R.challenge !== 'noheal') p.hp = Math.min(p.maxHp, p.hp + 30 + p.maxHp * 0.2); Sound.sfx('gem'); }
        else if (o.kind === 'magnet') { R.gems.forEach(g => g.pull = true); Sound.sfx('level'); }
        else if (o.kind === 'chest') { R.pendingChest++; }
      }
    }
  },
  gainXp(v) {
    const R = this.run; const p = R.player;
    p.xp += v * (1 + R.stats.growth);
    let need = D.xpNeed(p.level);
    while (p.xp >= need) {
      p.xp -= need; p.level++; R.levelQueue++; need = D.xpNeed(p.level);
      R.fx.push({ kind: 'levelup', x: p.x, y: p.y, life: 0.9, max: 0.9 }); this.spark(p.x, p.y, '#fff3a8', 40, 380, 4, 0.8); R.flash = { a: 0.35, c: '255,255,230' };
      Sound.sfx('level');
      if (R.sup) R.weapons.filter(w => w.owner === 's').forEach(w => this.calcWeapon(w));
    }
  },

  updateFx(dt) {
    const R = this.run;
    const P = R.parts;
    for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92; if (q.life <= 0) { P[i] = P[P.length - 1]; P.pop(); } }
    if (R.flash) { R.flash.a -= dt * 2.5; if (R.flash.a <= 0) R.flash = null; }
    for (let i = R.fx.length - 1; i >= 0; i--) { R.fx[i].life -= dt; if (R.fx[i].life <= 0) R.fx.splice(i, 1); }
    for (let i = R.nums.length - 1; i >= 0; i--) { const n = R.nums[i]; n.life -= dt; n.y -= 40 * dt; if (n.life <= 0) R.nums.splice(i, 1); }
  },

  // ---------- 必殺技 ----------
  useSpecial() {
    const R = this.run; if (!R || R.over || R.special < 100 || UI.modalOpen()) return;
    R.special = 0;
    const p = R.player; const lv = p.level; const m = 1 + R.stats.might;
    R.cutin = { t: 1.0, char: R.char };
    R.shake = 14; Sound.sfx('special'); R.flash = { a: 0.8, c: '255,255,255' }; R.fx.push({ kind: 'levelup', x: p.x, y: p.y, life: 1.2, max: 1.2, big: true });
    const onScreen = () => this.randomOnScreen(9999);
    switch (R.char.special) {
      case 'starburst': {
        const dmg = (40 + lv * 10) * m;
        for (const e of onScreen()) { this.hit(e, dmg, { uid: 'special', elem: 'light' }, 1, p); R.fx.push({ kind: 'star', x: e.x, y: e.y, life: 0.4, max: 0.4 }); }
        break;
      }
      case 'issen': {
        const dmg = (80 + lv * 16) * m;
        this.boom(p.x, p.y, 320, '#ff5d5d', 'fx_slash', 2);
        Grid.query(p.x, p.y, 340, e => { if (dist2(p.x, p.y, e.x, e.y) < 320 * 320) this.hit(e, dmg, { uid: 'special', elem: 'none' }, 2, p); });
        break;
      }
      case 'overdrive': R.zones.push({ kind: 'spinbeam', ang: Math.atan2(p.fy, p.fx), life: 1.6, max: 1.6, tick: 0, dmg: (25 + lv * 5) * m }); break;
      case 'arrowrain': R.rainT = 10; R.rainDmg = (14 + lv * 3) * m; break;
      case 'freeze': {
        const dmg = (15 + lv * 4) * m;
        for (const e of onScreen()) { e.frozen = e.boss ? 2 : 6; this.hit(e, dmg, { uid: 'special', elem: 'ice' }, 0, p); }
        break;
      }
      case 'kitsune': {
        if (R.challenge !== 'noheal') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
        const dmg = (30 + lv * 7) * m;
        for (const e of onScreen()) { this.hit(e, dmg, { uid: 'special', elem: 'fire' }, 1, p); R.zones.push({ kind: 'burn', w: { p: { dmg: dmg * 0.5, tick: 0.5 }, uid: 'special', elem: 'fire' }, x: e.x, y: e.y, r: 30, life: 2, max: 2, tick: 0 }); }
        break;
      }
    }
  },
  updateSpecial(dt) {
    const R = this.run;
    if (R.rainT > 0) {
      R.rainT -= dt;
      R.rainAcc = (R.rainAcc || 0) + dt;
      while (R.rainAcc > 0.06) {
        R.rainAcc -= 0.06;
        const t = this.randomOnScreen(1)[0];
        if (t) { this.hit(t, R.rainDmg, { uid: 'special', elem: 'none' }, 0.3, R.player); R.fx.push({ kind: 'arrowfx', x: t.x, y: t.y, life: 0.2, max: 0.2 }); }
      }
    }
  },

  // ---------- レベルアップの選択肢 ----------
  ownedPlayerWeapons() { return this.run.weapons.filter(w => w.owner === 'p'); },
  buildChoices(n) {
    const R = this.run; const owned = this.ownedPlayerWeapons();
    const pool = [];
    for (const w of owned) if (!w.evo && w.level < D.WEAPON_MAX && !R.banished.includes(w.id)) pool.push({ kind: 'wup', id: w.id, w, weight: 3 });
    const ownedIds = owned.map(w => w.id).concat(owned.filter(w => w.evo && w.evo.startsWith('fus_')).flatMap(w => D.FUSIONS.find(f => f.id === w.evo).from));
    if (owned.length < 6 && R.challenge !== 'oneweapon')
      for (const id of Save.data.unlockedWeapons) if (!ownedIds.includes(id) && !R.banished.includes(id)) pool.push({ kind: 'wnew', id, weight: 2 });
    const pIds = Object.keys(R.passives);
    for (const id of pIds) { const mx = D.PASSIVES[id].max || D.PASSIVE_MAX; if (R.passives[id] < mx && !R.banished.includes(id)) pool.push({ kind: 'pup', id, weight: 2 }); }
    if (pIds.length < 6 && R.challenge !== 'nopassive')
      for (const id in D.PASSIVES) if (!pIds.includes(id) && !R.banished.includes(id)) pool.push({ kind: 'pnew', id, weight: 1.5 });
    const out = [];
    while (out.length < n && pool.length) {
      const tot = pool.reduce((a, c) => a + c.weight, 0); let r = Math.random() * tot; let idx = 0;
      for (; idx < pool.length - 1; idx++) { r -= pool[idx].weight; if (r <= 0) break; }
      const c = pool.splice(idx, 1)[0];
      if (c.kind === 'wnew') c.rare = Math.random() < 0.08 * (1 + R.stats.luck);
      out.push(c);
    }
    if (!out.length) { out.push({ kind: 'heal' }); out.push({ kind: 'gold' }); }
    return out;
  },
  applyChoice(c) {
    const R = this.run;
    if (c.kind === 'wup') { c.w.level++; this.calcWeapon(c.w); }
    else if (c.kind === 'wnew') this.addWeapon(c.id, 'p', c.rare);
    else if (c.kind === 'pup' || c.kind === 'pnew') { R.passives[c.id] = (R.passives[c.id] || 0) + 1; this.recalc(); }
    else if (c.kind === 'heal') { if (R.challenge !== 'noheal') R.player.hp = Math.min(R.player.maxHp, R.player.hp + 40); }
    else if (c.kind === 'gold') R.gold += 25;
  },

  // ---------- 宝箱・進化 ----------
  availableEvolutions() {
    const R = this.run; const owned = this.ownedPlayerWeapons(); const res = [];
    for (const f of D.FUSIONS) {
      const a = owned.find(w => w.id === f.from[0] && !w.evo && w.level >= D.WEAPON_MAX);
      const b = owned.find(w => w.id === f.from[1] && !w.evo && w.level >= D.WEAPON_MAX);
      if (a && b) res.push({ fusion: f, a, b });
    }
    for (const ev of D.EVOLUTIONS) {
      const w = owned.find(x => x.id === ev.from && !x.evo && x.level >= D.WEAPON_MAX);
      if (w && R.passives[ev.passive]) res.push({ evo: ev, w });
    }
    return res;
  },
  openChest() {
    const R = this.run; const luck = R.stats.luck;
    Sound.sfx('chest'); R.flash = { a: 0.5, c: '255,220,120' }; this.spark(R.player.x, R.player.y, '#ffd84a', 50, 420, 4, 1);
    const evs = this.availableEvolutions();
    const results = [];
    let coins = Math.floor(rand(10, 30) * (R.stage.coinMul || 1));
    R.gold += coins;
    if (evs.length) {
      const e = evs[0];
      if (e.fusion) {
        R.weapons = R.weapons.filter(w => w !== e.b);
        this.makeEvolved(e.a, e.fusion.id); e.a.id = e.fusion.id;
        Save.data.stats.recipes[e.fusion.id] = true;
        results.push({ text: `融合進化！ ${e.fusion.name}`, evo: true });
      } else {
        this.makeEvolved(e.w, e.evo.id);
        Save.data.stats.recipes[e.evo.id] = true;
        results.push({ text: `進化！ ${e.evo.name}`, evo: true });
      }
      Sound.sfx('evolve');
    } else {
      const r = Math.random();
      const n = r < 0.05 * (1 + luck) ? 5 : r < 0.3 * (1 + luck * 0.5) ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const c = this.buildChoices(1).filter(x => x.kind !== 'wnew' && x.kind !== 'pnew')[0] || { kind: 'gold' };
        this.applyChoice(c);
        results.push({ text: UI.choiceLabel(c) });
      }
    }
    results.push({ text: `コイン +${coins}` });
    UI.showChest(results);
  },

  // ---------- 終了 ----------
  finish(win) {
    const R = this.run; if (R.over) return;
    R.over = true; R.cleared = win;
    Sound.stopBgm(); Sound.sfx(win ? 'clear' : 'over');
    Save.clearRun();
    const sv = Save.data; const st = sv.stats; const s = R.stats;
    let mul = (1 + s.greed) * (1 + R.curse * 0.2) * (R.hard ? 2 : 1);
    if (R.challenge && win) mul *= 1 + D.CHALLENGES.find(c => c.id === R.challenge).reward;
    if (!win) mul *= 0.7;
    const coins = Math.floor((R.gold + R.kills * 0.08 + R.t * 0.3) * mul);
    sv.coins += coins; st.coinsTotal += coins;
    st.kills += R.kills;
    for (const k in R.killsBy) st.enemyKills[k] = (st.enemyKills[k] || 0) + R.killsBy[k];
    st.bestLevel = Math.max(st.bestLevel, R.player.level);
    st.bestDamage = Math.max(st.bestDamage, R.dmgTotal);
    const sid = R.stage.id;
    if (win) {
      if (!R.hard) st.cleared[sid] = true; else { st.clearedHard[sid] = true; st.cleared[sid] = true; st.hardCurse[sid] = Math.max(st.hardCurse[sid] || 0, R.curse); }
      st.bestCurse = Math.max(st.bestCurse, R.curse);
      if (R.challenge) st.challengeClear[R.challenge] = true;
      if (['forest', 'snow', 'ruins', 'desert', 'station'].every(k => (st.hardCurse[k] || 0) >= 10 && st.clearedHard[k])) st.finalTitle = true;
    }
    if (sid === 'abyss') st.abyssBest = Math.max(st.abyssBest, R.floor);
    // ベスト記録
    const bk = `${sid}${R.hard ? '_hard' : ''}_${R.char.id}`;
    const b = st.best[bk] || { time: 0, kills: 0, level: 0, clears: 0, fastest: 0 };
    b.time = Math.max(b.time, Math.floor(R.t)); b.kills = Math.max(b.kills, R.kills); b.level = Math.max(b.level, R.player.level);
    if (win) { b.clears++; if (!b.fastest || R.t < b.fastest) b.fastest = Math.floor(R.t); }
    st.best[bk] = b;
    // キャラ経験値
    const cs = sv.chars[R.char.id] || (sv.chars[R.char.id] = { lv: 1, xp: 0, skin: 'default', skins: ['default'] });
    const cxp = Math.floor(R.kills * 0.5 + R.t * 2 + (win ? 300 : 0));
    cs.xp += cxp;
    let lvUp = 0;
    while (cs.lv < D.CHAR_LV_MAX && cs.xp >= D.charXpNeed(cs.lv)) { cs.xp -= D.charXpNeed(cs.lv); cs.lv++; lvUp++; }
    st.bestCharLv = Math.max(st.bestCharLv, cs.lv);
    // 装備
    for (const it of R.earnedEquip) { sv.inventory.push(it); st.bestRarity = Math.max(st.bestRarity, it.rarity); }
    const newAch = checkAchievements();
    Save.write();
    setTimeout(() => UI.showResult({ win, coins, cxp, lvUp, charLv: cs.lv, newAch, equips: R.earnedEquip }), 700);
  },
};

// 実績チェック（報酬を付与して、新しく達成したものを返す）
function checkAchievements() {
  const sv = Save.data; const st = sv.stats; const got = [];
  st.charsUnlocked = sv.unlockedChars.length;
  for (let loop = 0; loop < 3; loop++) {
    for (const a of D.ACHIEVEMENTS) {
      if (sv.achievements[a.id]) continue;
      let ok = false; try { ok = a.check(st); } catch (e) { ok = false; }
      if (!ok) continue;
      sv.achievements[a.id] = Date.now();
      const r = a.reward; let txt = '';
      if (r.coins) { sv.coins += r.coins; txt = `コイン +${r.coins}`; }
      if (r.weapon && !sv.unlockedWeapons.includes(r.weapon)) { sv.unlockedWeapons.push(r.weapon); txt = `新武器「${D.WEAPONS[r.weapon].name}」解放`; }
      if (r.char && !sv.unlockedChars.includes(r.char)) { sv.unlockedChars.push(r.char); txt = `新キャラ「${D.CHARS.find(c => c.id === r.char).name}」解放`; }
      if (r.title && !sv.titles.includes(r.title)) { sv.titles.push(r.title); txt = `称号「${r.title}」`; }
      got.push({ name: a.name, reward: txt });
      st.charsUnlocked = sv.unlockedChars.length;
    }
  }
  return got;
}
