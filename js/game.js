// =============================================================
//  EDF ローグライト・ディフェンス  ゲーム本体
// =============================================================
const DIFFICULTIES = [
  { key: 'easy',    name: 'EASY',    hp: 0.7, dmg: 0.7, reward: 1.1 },
  { key: 'normal',  name: 'NORMAL',  hp: 1.0, dmg: 1.0, reward: 1.0 },
  { key: 'hard',    name: 'HARD',    hp: 1.5, dmg: 1.3, reward: 0.95 },
  { key: 'inferno', name: 'INFERNO', hp: 2.3, dmg: 1.8, reward: 0.9 },
];

const SAVE_KEY = 'edf_roguelite_save_v1';
function loadSave() {
  try { return Object.assign({ armor: 0, best: {}, clears: {} }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch (e) { return { armor: 0, best: {}, clears: {} }; }
}
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }

const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return { d: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)), t };
}

const RADIO = {
  start: ['本部より各隊へ。巨大生物の接近を確認。迎撃せよ！', '作戦開始。EDF！EDF！', '敵の侵攻が始まった。ベースを守り抜け！'],
  boss: ['本部より緊急連絡！巨大な反応を確認！', 'なんだあれは……！？総員、攻撃を集中しろ！'],
  clear: ['ウェーブ撃退。よくやった。', '敵の反応が消えた。次に備えろ。', '一時的に敵の攻勢が止んだ。補給を急げ。'],
  levelup: ['本部より新装備が届いた！', '補給物資が到着。装備を選択せよ。'],
  down: ['隊員が倒れた！救護班を急がせろ！', 'やられた！誰か援護を！'],
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.save = loadSave();
    this.state = 'title';
    this.speed = 1;
    this.paused = false;
    this.time = 0;
    this.placing = null;
    this.selected = null;
    this.hover = null;
    this.ui = null; // UI がセット
  }

  // ---------------- ラン開始 ----------------
  newRun(mapIndex, diffIndex) {
    this.mapIndex = mapIndex;
    this.diff = DIFFICULTIES[diffIndex];
    this.diffIndex = diffIndex;
    this.buildPath(MAPS[mapIndex]);
    this.units = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.crates = [];
    this.strikes = [];
    this.floaters = [];
    this.spawnQueue = [];
    this.wave = 0;
    this.waveActive = false;
    this.sp = 200;
    this.baseMax = 100;
    this.baseHp = 100;
    this.level = 1;
    this.xp = 0;
    this.pendingLevels = 0;
    this.kills = 0;
    this.armorGained = 0;
    this.reviveMul = 1;
    this.waveIncome = 60;
    this.rewardMul = 1;
    this.dropMul = 1;
    this.costMul = 1;
    this.flags = {};
    this.takenCards = {};
    this.history = [];
    this.weapons = {};
    this.mods = {};
    for (const k of CLASS_KEYS) {
      this.weapons[k] = CLASSES[k].startWeapon;
      this.mods[k] = { dmgMul: 0, rateMul: 0, rangeMul: 0, hpMul: 0, armor: 0, energyRegen: 0, energyMax: 0, tauntMul: 0 };
    }
    this.metaHp = Math.min(1, this.save.armor * 0.004);
    this.aircraftTimer = 20;
    this.idCounter = 1;
    this.endless = false;
    this.state = 'play';
    this.selected = null;
    this.placing = null;
    this.paused = false;
    this.ui.radio(pick(RADIO.start));
    // 初期装備として1枚選択
    this.pendingLevels = 1;
    this.openCardChoice('初期装備を選択');
  }

  buildPath(map) {
    const pts = map.points.map(([c, r]) => ({ c, r }));
    this.pathTiles = new Set();
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const steps = Math.max(Math.abs(b.c - a.c), Math.abs(b.r - a.r));
      for (let s = 0; s <= steps; s++) {
        const c = a.c + Math.sign(b.c - a.c) * s, r = a.r + Math.sign(b.r - a.r) * s;
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) this.pathTiles.add(c + ',' + r);
      }
    }
    this.path = pts.map(p => ({ x: p.c * TILE + TILE / 2, y: p.r * TILE + TILE / 2 }));
    // 最後の点 (画面外) をベース位置に置き換える
    const last = pts[pts.length - 1];
    const bc = clamp(last.c, 0, COLS - 1), br = clamp(last.r, 0, ROWS - 1);
    this.basePos = { x: bc * TILE + TILE / 2, y: br * TILE + TILE / 2 };
    this.path[this.path.length - 1] = { ...this.basePos };
    this.baseTile = bc + ',' + br;
    this.segLen = [];
    this.pathLen = 0;
    for (let i = 0; i < this.path.length - 1; i++) {
      const l = Math.hypot(this.path[i + 1].x - this.path[i].x, this.path[i + 1].y - this.path[i].y);
      this.segLen.push(l);
      this.pathLen += l;
    }
  }

  posOnPath(d) {
    for (let i = 0; i < this.segLen.length; i++) {
      if (d <= this.segLen[i]) {
        const t = d / this.segLen[i], a = this.path[i], b = this.path[i + 1];
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
      }
      d -= this.segLen[i];
    }
    return { ...this.basePos, angle: 0 };
  }

  // ---------------- 強化値 ----------------
  mod(cls, key, v) {
    const old = this.mods[cls].hpMul;
    this.mods[cls][key] += v;
    if (key === 'hpMul') this.refreshHp(cls, old);
    if (key === 'energyMax') for (const u of this.units) if (u.cls === cls) u.energyMax = this.energyMax();
  }
  modAll(key, v) { for (const k of CLASS_KEYS) this.mod(k, key, v); }
  refreshHp(cls) {
    for (const u of this.units) if (u.cls === cls) {
      const ratio = u.hp / u.maxHp;
      u.maxHp = this.unitMaxHp(cls);
      u.hp = u.maxHp * ratio;
    }
  }
  unitMaxHp(cls) { return CLASSES[cls].hp * (1 + this.mods[cls].hpMul) * (1 + this.metaHp); }
  weaponOf(u) { return WEAPONS[this.weapons[u.cls]]; }
  unitRange(u) { return this.weaponOf(u).range * (1 + this.mods[u.cls].rangeMul); }
  unitDmg(u, w) { return w.dmg * (1 + this.mods[u.cls].dmgMul); }
  unitInterval(u, w) { return w.rate / (1 + this.mods[u.cls].rateMul); }
  energyMax() { return 100 * (1 + this.mods.wingdiver.energyMax); }
  classCount(cls) { return this.units.filter(u => u.cls === cls).length; }
  deployCost(cls) { return Math.round(CLASSES[cls].cost * this.costMul * (1 + 0.3 * this.classCount(cls))); }

  // ---------------- 配置 ----------------
  tileFree(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    const k = c + ',' + r;
    if (this.pathTiles.has(k) || k === this.baseTile) return false;
    return !this.units.some(u => u.c === c && u.r === r);
  }

  placeUnit(cls, c, r) {
    const cost = this.deployCost(cls);
    if (this.sp < cost || !this.tileFree(c, r)) return false;
    this.sp -= cost;
    const u = {
      id: this.idCounter++, cls, c, r,
      x: c * TILE + TILE / 2, y: r * TILE + TILE / 2,
      maxHp: this.unitMaxHp(cls), hp: 0, cd: 0.2, angle: -Math.PI / 2,
      downed: false, downTimer: 0, downMax: 1, paid: cost,
      energy: 0, energyMax: this.energyMax(), overheat: false, zcd: 0,
    };
    u.hp = u.maxHp;
    u.energy = u.energyMax;
    this.setupWeapon(u);
    this.units.push(u);
    this.burst(u.x, u.y, CLASSES[cls].color, 10);
    return true;
  }

  setupWeapon(u) {
    const w = this.weaponOf(u);
    u.drones = null;
    if (w.type === 'drone') {
      u.drones = [];
      for (let i = 0; i < w.drones; i++) u.drones.push({ a: i / w.drones * Math.PI * 2, x: u.x, y: u.y, cd: i * 0.07 });
    }
    u.orb = (u.cls === 'wingdiver' && this.flags.blinkball) ? { a: 0, x: u.x, y: u.y, cd: 0 } : null;
  }

  sellUnit(u) {
    this.sp += Math.round(u.paid * 0.6);
    this.units = this.units.filter(x => x !== u);
    if (this.selected === u) this.selected = null;
  }

  // ---------------- ウェーブ ----------------
  startWave() {
    if (this.waveActive || this.state !== 'play') return;
    this.wave++;
    this.waveActive = true;
    this.spawnQueue = this.makeWave(this.wave);
    this.spawnTimer = 0.5;
    if (this.wave % 10 === 0) this.ui.radio(pick(RADIO.boss), true);
    else this.ui.radio(`ウェーブ ${this.wave}：` + pick(RADIO.start));
  }

  makeWave(n) {
    const q = [];
    const boss = n % 10 === 0;
    if (n === 10 || (boss && n % 20 === 10)) q.push({ type: 'erginus', delay: 3 });
    if (n === 20 || (boss && n % 20 === 0)) q.push({ type: 'mothership', delay: 3 });
    let budget = 10 + n * 7 + Math.pow(n, 1.8);
    if (n % 5 === 0 && !boss) budget *= 1.5;
    if (boss) budget *= 0.6;
    const pool = Object.entries(ENEMIES).filter(([k, e]) => !e.boss && (e.minWave || 1) <= n);
    const interval = Math.max(0.28, 0.95 - n * 0.03);
    while (budget > 0) {
      // 新しい敵ほど出やすく
      const weights = pool.map(([k, e]) => 1 + (e.minWave || 1) / 6);
      let r = Math.random() * weights.reduce((a, b) => a + b, 0), i = 0;
      while ((r -= weights[i]) > 0) i++;
      const [key, e] = pool[i];
      const group = e.budget <= 2 ? 3 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 2);
      for (let g = 0; g < group && budget > 0; g++) {
        q.push({ type: key, delay: g === 0 ? interval * 2 : interval * 0.5 });
        budget -= e.budget;
      }
    }
    return q;
  }

  spawnEnemy(type, at) {
    const d = ENEMIES[type];
    const n = this.wave;
    const scale = Math.pow(1.17, n - 1) * (this.endless ? Math.pow(1.06, n - FINAL_WAVE) : 1) * this.diff.hp;
    const hp = d.hp * (d.boss ? Math.pow(1.08, n - 1) * this.diff.hp : scale);
    const start = at ? at : this.posOnPath(0);
    const e = {
      id: this.idCounter++, type, hp, maxHp: hp,
      x: start.x + (at ? rand(-10, 10) : 0), y: start.y + (at ? rand(-10, 10) : 0),
      d: 0, angle: 0, cd: rand(0, d.atkRate), hitFlash: 0, spawnCd: 3,
      offset: rand(-8, 8), speedMul: rand(0.9, 1.1),
    };
    if (at && !d.flying) {
      // 母船からの投下は最寄りの経路位置から
      let best = 0, bd = 1e9;
      for (let s = 0; s < this.pathLen; s += 10) { const p = this.posOnPath(s); const dd = dist2(p, at); if (dd < bd) { bd = dd; best = s; } }
      e.d = best;
    }
    this.enemies.push(e);
    return e;
  }

  // ---------------- 更新 ----------------
  update(dt) {
    if (this.state !== 'play' || this.paused || this.ui.modalOpen) return;
    this.time += dt;

    // スポーン
    if (this.waveActive && this.spawnQueue.length) {
      this.spawnTimer -= dt;
      while (this.spawnQueue.length && this.spawnTimer <= 0) {
        const s = this.spawnQueue.shift();
        this.spawnEnemy(s.type);
        if (this.spawnQueue.length) this.spawnTimer += this.spawnQueue[0].delay;
      }
    }

    this.updateEnemies(dt);
    this.updateUnits(dt);
    this.updateProjectiles(dt);
    this.updateStrikes(dt);

    // 強襲エアクラフト
    if (this.flags.aircraft && this.waveActive) {
      this.aircraftTimer -= dt;
      if (this.aircraftTimer <= 0) {
        this.aircraftTimer = 20;
        const targets = this.enemies.filter(e => !ENEMIES[e.type].flying).sort(() => Math.random() - 0.5).slice(0, 15);
        for (const e of targets) {
          this.damageEnemy(e, 90 * (1 + this.wave * 0.15) * (1 + this.mods.airraider.dmgMul));
          this.explosion(e.x, e.y, 30, '#ff7043');
        }
        this.ui.radio('強襲エアクラフト、爆撃開始！');
      }
    }

    // アイテム箱
    for (const c of this.crates) {
      c.t += dt;
      if (c.t > 1.2) { c.collected = true; this.collectCrate(c); }
    }
    this.crates = this.crates.filter(c => !c.collected);

    // エフェクト
    for (const f of this.effects) f.t += dt;
    this.effects = this.effects.filter(f => f.t < f.life);
    for (const f of this.floaters) { f.t += dt; f.y -= 20 * dt; }
    this.floaters = this.floaters.filter(f => f.t < 0.9);

    // ウェーブ終了
    if (this.waveActive && !this.spawnQueue.length && !this.enemies.length) {
      this.waveActive = false;
      const income = this.waveIncome + this.wave * 4;
      this.sp += income;
      this.ui.radio(pick(RADIO.clear) + ` (支給 +${income}SP)`);
      for (const u of this.units) if (!u.downed) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.3);
      if (this.wave === FINAL_WAVE && !this.endless) { this.victory(); return; }
    }
    if (this.baseHp <= 0) this.gameOver();
  }

  updateEnemies(dt) {
    const dm = this.diff.dmg;
    for (const e of this.enemies) {
      const d = ENEMIES[e.type];
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.cd -= dt;
      // 攻撃対象の探索 (フェンサーは挑発で優先)
      let target = null, best = 1e9;
      for (const u of this.units) {
        if (u.downed) continue;
        let range = d.ranged ? d.atkRange : 46;
        let prio = 0;
        if (u.cls === 'fencer') { range += 25 * (1 + this.mods.fencer.tauntMul); prio = -1e6; }
        const dd = dist2(e, u);
        if (dd <= range * range && dd + prio < best) { best = dd + prio; target = u; }
      }
      let moving = true;
      if (target) {
        e.angle = Math.atan2(target.y - e.y, target.x - e.x);
        if (!d.ranged) moving = false; // 近接型は足を止めて攻撃
        if (e.cd <= 0) {
          e.cd = d.atkRate;
          if (d.ranged) {
            this.projectiles.push({ enemy: true, x: e.x, y: e.y, target, speed: 260, dmg: d.dmg * dm, color: d.proj || '#fff', size: d.boss ? 5 : 3 });
          } else {
            this.damageUnit(target, d.dmg * dm, e);
            this.effects.push({ kind: 'slash', x: target.x, y: target.y, t: 0, life: 0.2, color: '#ff5252' });
          }
        }
      }
      // 母船は巨大生物を投下
      if (d.spawner) {
        e.spawnCd -= dt;
        if (e.spawnCd <= 0) { e.spawnCd = 3.5; for (let i = 0; i < 3; i++) this.spawnEnemy(d.spawner, { x: e.x, y: e.y }); }
      }
      if (moving) {
        const sp = d.speed * e.speedMul;
        if (d.flying) {
          const dx = this.basePos.x - e.x, dy = this.basePos.y - e.y, l = Math.hypot(dx, dy);
          if (!target) e.angle = Math.atan2(dy, dx);
          if (l < 18) { this.hitBase(e); continue; }
          e.x += dx / l * sp * dt; e.y += dy / l * sp * dt;
          e.d = this.pathLen * (1 - l / 900);
        } else {
          e.d += sp * dt;
          if (e.d >= this.pathLen) { this.hitBase(e); continue; }
          const p = this.posOnPath(e.d);
          const nx = -Math.sin(p.angle), ny = Math.cos(p.angle);
          e.x = p.x + nx * e.offset; e.y = p.y + ny * e.offset;
          if (!target) e.angle = p.angle;
        }
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  hitBase(e) {
    const d = ENEMIES[e.type];
    e.dead = true;
    this.baseHp -= d.baseDmg * this.diff.dmg;
    this.explosion(this.basePos.x, this.basePos.y, 25, '#ef5350');
    this.ui.shake(d.boss ? 12 : 4);
  }

  damageUnit(u, dmg, src) {
    if (u.downed) return;
    if (u.cls === 'wingdiver' && this.flags.diverDodge && Math.random() < this.flags.diverDodge) {
      this.floaters.push({ x: u.x, y: u.y - 14, text: '回避', color: '#80d8ff', t: 0 });
      return;
    }
    let mul = 1 - this.mods[u.cls].armor;
    if (this.flags.capsule && this.units.some(a => a.cls === 'airraider' && !a.downed && dist2(a, u) < 110 * 110)) mul *= 0.8;
    u.hp -= dmg * Math.max(0.1, mul);
    if (u.cls === 'fencer' && this.flags.reflect && src && !src.dead) this.damageEnemy(src, dmg * this.flags.reflect);
    if (u.hp <= 0) {
      u.hp = 0;
      u.downed = true;
      u.downTimer = 0;
      u.downMax = 12 * this.reviveMul;
      if (Math.random() < 0.4) this.ui.radio(pick(RADIO.down));
    }
  }

  // ---- ユニット攻撃 ----
  findTarget(u, range, air, from) {
    from = from || u;
    let best = null, bd = -1;
    const r2 = range * range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!air && ENEMIES[e.type].flying) continue;
      if (dist2(from, e) > r2) continue;
      const score = e.d + (ENEMIES[e.type].boss ? 50 : 0);
      if (score > bd) { bd = score; best = e; }
    }
    return best;
  }

  updateUnits(dt) {
    for (const u of this.units) {
      if (u.downed) {
        u.downTimer += dt;
        if (u.downTimer >= u.downMax) { u.downed = false; u.hp = u.maxHp * 0.6; this.burst(u.x, u.y, '#66bb6a', 8); }
        continue;
      }
      const w = this.weaponOf(u);
      const range = this.unitRange(u);

      // 回復系
      if (u.cls === 'airraider') this.healAround(u, 100, (this.flags.lifevendor ? 4.5 : 1.5) * dt);
      if (u.cls === 'ranger' && this.flags.reverser) this.healAround(u, 85, 2 * dt);

      // ウイングダイバーのエネルギー
      if (u.cls === 'wingdiver') {
        const regen = (u.overheat ? u.energyMax / 2.8 : 18) * (1 + this.mods.wingdiver.energyRegen);
        u.energy = Math.min(u.energyMax, u.energy + regen * dt);
        if (u.overheat && u.energy >= u.energyMax) u.overheat = false;
      }

      // 追加攻撃 (ZE-GUN / ブリンク・ボール)
      const dps = this.unitDmg(u, w) * (w.pellets || 1) * (w.shots || 1) * (w.type === 'strike' ? w.hits : 1) / this.unitInterval(u, w);
      if (u.cls === 'ranger' && this.flags.zegun) {
        u.zcd -= dt;
        if (u.zcd <= 0) {
          const t = this.findTarget(u, 140, true);
          if (t) { u.zcd = 0.25; this.damageEnemy(t, dps * 0.4 * 0.25); this.tracer(u.x + 8, u.y + 8, t, '#a5d6a7'); }
        }
      }
      if (u.orb) {
        u.orb.a += dt * 3;
        u.orb.x = u.x + Math.cos(u.orb.a) * 18; u.orb.y = u.y + Math.sin(u.orb.a) * 18;
        u.orb.cd -= dt;
        if (u.orb.cd <= 0) {
          const t = this.findTarget(u, 150, true, u.orb);
          if (t) { u.orb.cd = 0.3; this.damageEnemy(t, dps * 0.5 * 0.3); this.tracer(u.orb.x, u.orb.y, t, '#ff80ab'); }
        }
      }

      // ドローン
      if (w.type === 'drone') {
        u.drones.forEach((d, i) => {
          d.a += dt * 1.6;
          d.x = u.x + Math.cos(d.a) * 26; d.y = u.y + Math.sin(d.a) * 26;
          d.cd -= dt;
          if (d.cd <= 0) {
            const t = this.findTarget(u, range, true, d);
            if (t) { d.cd = this.unitInterval(u, w); this.damageEnemy(t, this.unitDmg(u, w)); this.tracer(d.x, d.y, t, w.color); }
          }
        });
        const t = this.findTarget(u, range, true);
        if (t) u.angle = Math.atan2(t.y - u.y, t.x - u.x);
        continue;
      }

      u.cd -= dt;
      if (u.cd > 0) continue;
      if (u.cls === 'wingdiver' && (u.overheat || u.energy < (w.energy || 0))) {
        if (!u.overheat && u.energy < (w.energy || 0)) u.overheat = true;
        continue;
      }
      let target;
      if (w.type === 'strike') target = this.findCluster(u, range, w);
      else target = this.findTarget(u, range, w.air);
      if (!target) continue;
      u.angle = Math.atan2(target.y - u.y, target.x - u.x);
      u.cd = this.unitInterval(u, w);
      if (u.cls === 'wingdiver') u.energy -= w.energy || 0;
      this.fire(u, w, target, range);
    }
  }

  healAround(u, r, amt) {
    for (const a of this.units) if (!a.downed && a.hp < a.maxHp && dist2(a, u) < r * r) a.hp = Math.min(a.maxHp, a.hp + amt * (a.maxHp / 100));
  }

  findCluster(u, range, w) {
    let best = null, bc = 0;
    const r2 = range * range;
    for (const e of this.enemies) {
      if (!w.air && ENEMIES[e.type].flying) continue;
      if (dist2(u, e) > r2) continue;
      let c = 0;
      for (const o of this.enemies) if (dist2(o, e) < w.radius * w.radius) c += ENEMIES[o.type].boss ? 5 : 1;
      if (c > bc) { bc = c; best = e; }
    }
    return best;
  }

  fire(u, w, target, range) {
    const dmg = this.unitDmg(u, w);
    const ox = u.x + Math.cos(u.angle) * 14, oy = u.y + Math.sin(u.angle) * 14;
    switch (w.type) {
      case 'hitscan': {
        const pellets = w.pellets || 1;
        const near = pellets > 1 ? this.enemies.filter(e => dist2(e, target) < 35 * 35 && (w.air || !ENEMIES[e.type].flying)) : [target];
        for (let i = 0; i < pellets; i++) {
          const t = near[i % near.length];
          this.damageEnemy(t, dmg);
          if (i < 4) this.tracer(ox, oy, t, w.color, pellets > 1 ? 6 : 0);
        }
        break;
      }
      case 'cone': {
        const hits = this.enemies.filter(e => {
          if (!w.air && ENEMIES[e.type].flying) return false;
          if (dist2(u, e) > range * range) return false;
          let da = Math.abs(Math.atan2(e.y - u.y, e.x - u.x) - u.angle);
          if (da > Math.PI) da = Math.PI * 2 - da;
          return da < 0.6;
        }).slice(0, w.hits);
        for (const e of hits) this.damageEnemy(e, dmg);
        this.effects.push({ kind: 'cone', x: u.x, y: u.y, a: u.angle, r: range, t: 0, life: 0.08, color: w.color });
        break;
      }
      case 'line': {
        const end = { x: u.x + Math.cos(u.angle) * range, y: u.y + Math.sin(u.angle) * range };
        const hits = [];
        for (const e of this.enemies) {
          if (!w.air && ENEMIES[e.type].flying) continue;
          const r = distToSegment(e, u, end);
          if (r.d < ENEMIES[e.type].size + 6) hits.push({ e, t: r.t });
        }
        hits.sort((a, b) => a.t - b.t);
        for (const h of hits.slice(0, (w.pierce || 0) + 1)) this.damageEnemy(h.e, dmg);
        const wide = w.dmg >= 100 ? 5 : w.dmg >= 40 ? 3 : 2;
        this.effects.push({ kind: 'beam', x1: ox, y1: oy, x2: end.x, y2: end.y, t: 0, life: w.rate > 1 ? 0.3 : 0.1, color: w.color, w: wide });
        break;
      }
      case 'rocket': {
        const shots = w.shots || 1;
        for (let i = 0; i < shots; i++) {
          const a = u.angle + (shots > 1 ? rand(-1.2, 1.2) : 0);
          this.projectiles.push({
            x: ox, y: oy, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, target, tx: target.x, ty: target.y,
            speed: w.speed, dmg, splash: w.splash, air: w.air, homing: w.homing, color: w.color, life: 3, owner: u,
          });
        }
        break;
      }
      case 'chain': {
        let cur = target, from = { x: ox, y: oy }, d = dmg;
        const hit = new Set();
        for (let i = 0; i < w.chain && cur; i++) {
          hit.add(cur);
          this.damageEnemy(cur, d);
          this.effects.push({ kind: 'bolt', x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, t: 0, life: 0.15, color: w.color });
          from = cur; d *= 0.85;
          let next = null, bd = 90 * 90;
          for (const e of this.enemies) if (!hit.has(e) && !e.dead) { const dd = dist2(e, from); if (dd < bd) { bd = dd; next = e; } }
          cur = next;
        }
        break;
      }
      case 'strike': {
        const cx = target.x, cy = target.y;
        this.effects.push({ kind: 'marker', x: cx, y: cy, r: w.radius, t: 0, life: 0.8, color: w.color });
        this.strikes.push({ x: cx, y: cy, w, dmg, delay: 0.7, left: w.hits, tick: w.beam ? 0.07 : 0.1, timer: 0 });
        break;
      }
    }
  }

  updateStrikes(dt) {
    for (const s of this.strikes) {
      if (s.delay > 0) { s.delay -= dt; continue; }
      s.timer -= dt;
      while (s.timer <= 0 && s.left > 0) {
        s.timer += s.tick;
        s.left--;
        const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * s.w.radius;
        const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
        for (const e of this.enemies) {
          if (!s.w.air && ENEMIES[e.type].flying) continue;
          if (dist2(e, { x, y }) < 28 * 28) this.damageEnemy(e, s.dmg);
        }
        if (s.w.beam) this.effects.push({ kind: 'beam', x1: x, y1: y - 400, x2: x, y2: y, t: 0, life: 0.12, color: s.w.color, w: 3 });
        this.explosion(x, y, 18, s.w.color);
      }
    }
    this.strikes = this.strikes.filter(s => s.left > 0);
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.enemy) {
        if (!p.target || p.target.downed) { p.dead = true; continue; }
        const dx = p.target.x - p.x, dy = p.target.y - p.y, l = Math.hypot(dx, dy);
        if (l < 8) { p.dead = true; this.damageUnit(p.target, p.dmg, null); continue; }
        p.x += dx / l * p.speed * dt; p.y += dy / l * p.speed * dt;
        continue;
      }
      p.life -= dt;
      if (p.homing) {
        if (!p.target || p.target.dead) p.target = this.findTarget({ x: p.x, y: p.y }, 300, p.air);
        if (p.target) {
          const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
          const cur = Math.atan2(p.vy, p.vx);
          let da = want - cur;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          const na = cur + clamp(da, -8 * dt, 8 * dt);
          p.vx = Math.cos(na) * p.speed; p.vy = Math.sin(na) * p.speed;
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      let hit = p.life <= 0;
      if (!p.homing && dist2(p, { x: p.tx, y: p.ty }) < 10 * 10) hit = true;
      for (const e of this.enemies) {
        if (!p.air && ENEMIES[e.type].flying) continue;
        if (dist2(p, e) < (ENEMIES[e.type].size + 3) ** 2) { hit = true; break; }
      }
      if (p.x < -50 || p.y < -50 || p.x > W + 50 || p.y > H + 50) { p.dead = true; continue; }
      if (hit) {
        p.dead = true;
        for (const e of this.enemies) {
          if (!p.air && ENEMIES[e.type].flying) continue;
          if (dist2(p, e) < (p.splash + ENEMIES[e.type].size) ** 2) this.damageEnemy(e, p.dmg);
        }
        this.explosion(p.x, p.y, p.splash, p.color);
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  damageEnemy(e, dmg) {
    if (e.dead) return;
    e.hp -= dmg;
    e.hitFlash = 0.05;
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const d = ENEMIES[e.type];
    e.dead = true;
    this.kills++;
    this.sp += Math.round(d.reward * this.rewardMul * this.diff.reward);
    this.gainXp(d.xp);
    this.burst(e.x, e.y, d.boss ? '#e040fb' : '#8bc34a', d.boss ? 40 : 6);
    if (d.boss) { this.ui.shake(16); this.ui.radio(`${d.name}を撃破！やったぞ！`); }
    // アイテム箱
    const chance = (d.boss ? 1 : 0.06) * this.dropMul;
    if (Math.random() < chance) {
      const r = Math.random();
      this.crates.push({ x: e.x, y: e.y, t: 0, kind: r < 0.5 ? 'armor' : r < 0.85 ? 'weapon' : 'heal', amount: d.boss ? 10 : 1 });
    }
  }

  collectCrate(c) {
    if (c.kind === 'armor') {
      this.armorGained += c.amount;
      this.floaters.push({ x: c.x, y: c.y, text: `アーマー+${c.amount}`, color: '#66bb6a', t: 0 });
    } else if (c.kind === 'weapon') {
      this.gainXp(3 * c.amount);
      this.sp += 10 * c.amount;
      this.floaters.push({ x: c.x, y: c.y, text: `武器箱 +${10 * c.amount}SP`, color: '#ef5350', t: 0 });
    } else {
      this.baseHp = Math.min(this.baseMax, this.baseHp + 5 * c.amount);
      for (const u of this.units) if (!u.downed) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.15);
      this.floaters.push({ x: c.x, y: c.y, text: '回復', color: '#fff176', t: 0 });
    }
  }

  gainXp(n) {
    this.xp += n;
    while (this.xp >= this.xpNeed()) {
      this.xp -= this.xpNeed();
      this.level++;
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && !this.ui.modalOpen) {
      this.ui.radio(pick(RADIO.levelup));
      this.openCardChoice(`Lv ${this.level - this.pendingLevels + 1} アップ！強化を選択`);
    }
  }
  xpNeed() { return Math.round(10 + this.level * 7 + Math.pow(this.level, 1.5)); }

  // ---------------- カード ----------------
  rollCards(count) {
    const deployed = new Set(this.units.map(u => u.cls));
    const pool = [];
    for (const [key, w] of Object.entries(WEAPONS)) {
      if (w.rarity === 0 || this.weapons[w.cls] === key) continue;
      pool.push({
        id: 'w_' + key, kind: 'weapon', rarity: w.rarity, cls: w.cls,
        name: w.name, weapon: key,
        desc: `${w.cat}に換装。${w.desc}`,
        apply: G => {
          G.weapons[w.cls] = key;
          for (const u of G.units) if (u.cls === w.cls) { u.cd = 0.3; G.setupWeapon(u); }
        },
      });
    }
    for (const c of CARDS) {
      if (c.once && this.takenCards[c.id]) continue;
      pool.push(c);
    }
    const chosen = [];
    for (let i = 0; i < count && pool.length; i++) {
      const weights = pool.map(c => {
        let wgt = RARITY[c.rarity].weight;
        if (c.cls && deployed.has(c.cls)) wgt *= 2.2;
        if (c.cls && !deployed.size) wgt *= 1;
        if (c.kind === 'supply' && this.sp > 300) wgt *= 0.3;
        return wgt;
      });
      let r = Math.random() * weights.reduce((a, b) => a + b, 0), k = 0;
      while ((r -= weights[k]) > 0) k++;
      chosen.push(pool[k]);
      pool.splice(k, 1);
    }
    return chosen;
  }

  openCardChoice(title) {
    this.ui.showCards(title, this.rollCards(3), card => {
      card.apply(this);
      this.takenCards[card.id] = true;
      this.history.push(card);
      this.pendingLevels--;
      if (card.cls === 'wingdiver' || card.id === 'w_blink') for (const u of this.units) if (u.cls === 'wingdiver') this.setupWeapon(u);
      if (this.pendingLevels > 0) setTimeout(() => this.openCardChoice(`Lv ${this.level - this.pendingLevels + 1} アップ！強化を選択`), 150);
    });
  }

  // ---------------- 終了 ----------------
  commitMeta() {
    const s = this.save;
    s.armor += this.armorGained;
    const k = this.diff.key;
    s.best[k] = Math.max(s.best[k] || 0, this.wave);
    writeSave(s);
    this.armorGained = 0;
  }
  gameOver() {
    this.state = 'over';
    const gained = this.armorGained;
    this.commitMeta();
    this.ui.showResult(false, gained);
  }
  victory() {
    this.state = 'over';
    const gained = this.armorGained;
    this.save.clears[this.diff.key] = (this.save.clears[this.diff.key] || 0) + 1;
    this.commitMeta();
    this.ui.showResult(true, gained);
  }
  continueEndless() {
    this.endless = true;
    this.state = 'play';
  }

  // ---------------- エフェクト ----------------
  tracer(x, y, t, color, jitter) {
    this.effects.push({ kind: 'tracer', x1: x, y1: y, x2: t.x + (jitter ? rand(-jitter, jitter) : 0), y2: t.y + (jitter ? rand(-jitter, jitter) : 0), t: 0, life: 0.06, color });
  }
  explosion(x, y, r, color) { this.effects.push({ kind: 'explosion', x, y, r: Math.max(10, r), t: 0, life: 0.35, color }); }
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(30, 120);
      this.effects.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(0.3, 0.6), color });
    }
  }

  // ---------------- 描画 ----------------
  render() {
    const ctx = this.ctx;
    ctx.save();
    const sh = this.ui ? this.ui.shakeAmt : 0;
    if (sh > 0) ctx.translate(rand(-sh, sh), rand(-sh, sh));
    ctx.clearRect(-20, -20, W + 40, H + 40);
    if (this.state === 'title') { ctx.restore(); return; }
    drawBackground(ctx, this);
    drawBase(ctx, this);

    // 配置プレビュー
    if (this.placing && this.hover) {
      const { c, r } = this.hover;
      const ok = this.tileFree(c, r) && this.sp >= this.deployCost(this.placing);
      ctx.fillStyle = ok ? 'rgba(102,187,106,0.35)' : 'rgba(239,83,80,0.35)';
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      const w = WEAPONS[this.weapons[this.placing]];
      const range = w.range * (1 + this.mods[this.placing].rangeMul);
      ctx.strokeStyle = ok ? 'rgba(255,255,255,0.5)' : 'rgba(239,83,80,0.5)';
      ctx.beginPath(); ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, range, 0, Math.PI * 2); ctx.stroke();
    }

    for (const c of this.crates) drawCrate(ctx, c);
    for (const u of this.units) drawUnit(ctx, u, this, u === this.selected);
    // 地上→飛行の順で描画
    for (const e of this.enemies) if (!ENEMIES[e.type].flying) drawEnemy(ctx, e, this.time);
    for (const e of this.enemies) if (ENEMIES[e.type].flying) drawEnemy(ctx, e, this.time);

    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 3.5, 0, Math.PI * 2); ctx.fill();
    }
    this.drawEffects(ctx);
    for (const f of this.floaters) {
      ctx.globalAlpha = 1 - f.t / 0.9;
      ctx.fillStyle = f.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawEffects(ctx) {
    for (const f of this.effects) {
      const k = 1 - f.t / f.life;
      ctx.globalAlpha = Math.max(0, k);
      switch (f.kind) {
        case 'tracer':
          ctx.strokeStyle = f.color; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          break;
        case 'beam':
          ctx.strokeStyle = f.color; ctx.lineWidth = f.w * k + 1;
          ctx.shadowColor = f.color; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          ctx.shadowBlur = 0;
          break;
        case 'bolt': {
          ctx.strokeStyle = f.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1);
          for (let i = 1; i < 6; i++) {
            const t = i / 6;
            ctx.lineTo(f.x1 + (f.x2 - f.x1) * t + rand(-6, 6), f.y1 + (f.y2 - f.y1) * t + rand(-6, 6));
          }
          ctx.lineTo(f.x2, f.y2); ctx.stroke();
          break;
        }
        case 'cone':
          ctx.fillStyle = f.color;
          ctx.globalAlpha = 0.25 * k;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, f.r, f.a - 0.6, f.a + 0.6); ctx.closePath(); ctx.fill();
          break;
        case 'explosion':
          ctx.fillStyle = f.color;
          ctx.globalAlpha = 0.55 * k;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + (1 - k) * 0.6), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.8 * k;
          ctx.fillStyle = '#fff8e1';
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.3 * k, 0, Math.PI * 2); ctx.fill();
          break;
        case 'spark':
          ctx.fillStyle = f.color;
          ctx.fillRect(f.x + f.vx * f.t - 1.5, f.y + f.vy * f.t - 1.5, 3, 3);
          break;
        case 'marker':
          ctx.strokeStyle = f.color; ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ff1744';
          ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, Math.PI * 2); ctx.fill();
          break;
        case 'slash':
          ctx.strokeStyle = f.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(f.x - 8, f.y - 8); ctx.lineTo(f.x + 8, f.y + 8); ctx.stroke();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
