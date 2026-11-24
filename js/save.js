// セーブデータ（localStorage）。ファイル書き出し・読み込みにも対応
'use strict';
const SAVE_KEY = 'hoshitsugi_save_v1';
const RUN_KEY = 'hoshitsugi_run_v1';

function newSave() {
  return {
    version: 1,
    coins: 0,
    materials: 0,
    rebornPts: 0,
    tree: {},                 // ノードID → レベル
    facilities: { training: 1 },
    chars: { lumina: { lv: 1, xp: 0, skin: 'default', skins: ['default'] } },
    unlockedChars: ['lumina', 'kaede', 'noa'],
    unlockedWeapons: D.WEAPON_START_POOL.slice(),
    achievements: {},
    titles: [],
    title: '',
    equip: { ring: null, amulet: null, charm: null },
    inventory: [],
    curse: 0,
    challenge: null,
    last: { char: 'lumina', support: null, stage: 'forest', hard: false },   // 前回選んだキャラ・ステージ
    settings: { dmgNum: true, light: false, shake: true, bgm: 0.4, sfx: 0.5, pad: 'left' },
    stats: {
      runs: 0, kills: 0, playTime: 0, coinsTotal: 0, bestLevel: 0, bestDamage: 0, bestCurse: -1,
      bestRarity: -1, abyssBest: 0, bossrushClear: false, reborn: 0, charsUnlocked: 3, bestCharLv: 1,
      cleared: {}, clearedHard: {}, challengeClear: {}, recipes: {}, enemyKills: {}, weaponsSeen: {},
      best: {},               // `${stage}_${char}` → { time, kills, level, cleared }
      finalTitle: false, hardCurse: {},
    },
  };
}

const Save = {
  data: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    this.data = this.migrate(d);
    return this.data;
  },
  migrate(d) {
    const base = newSave();
    if (!d || typeof d !== 'object') return base;
    // 足りないキーを補う（新しい要素を追加しても古いセーブが壊れないように）
    const fill = (dst, src) => {
      for (const k in src) {
        if (dst[k] === undefined) dst[k] = src[k];
        else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && typeof dst[k] === 'object' && dst[k] !== null) fill(dst[k], src[k]);
      }
    };
    fill(d, base);
    return d;
  },
  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { console.warn('save failed', e); }
  },
  exportFile() {
    const blob = new Blob([JSON.stringify(this.data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const t = new Date();
    a.download = `hoshitsugi_save_${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  importText(text) {
    const d = JSON.parse(text);
    if (!d || typeof d !== 'object' || d.version === undefined) throw new Error('セーブデータではありません');
    this.data = this.migrate(d);
    this.write();
  },
  reset() { this.data = newSave(); this.write(); localStorage.removeItem(RUN_KEY); },
  // 中断データ
  saveRun(obj) { try { localStorage.setItem(RUN_KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ } },
  loadRun() { try { return JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); } catch (e) { return null; } },
  clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) { /* ignore */ } },
};

// ---------- 統計値の合成 ----------
const STAT_KEYS = ['might', 'area', 'cooldown', 'amount', 'duration', 'projSpeed', 'maxHp', 'armor', 'regen',
  'moveSpeed', 'magnet', 'luck', 'growth', 'greed', 'revival', 'reroll', 'banish', 'extraCard'];

function emptyStats() { const o = {}; STAT_KEYS.forEach(k => o[k] = 0); return o; }
function addStats(dst, src, mul = 1) { for (const k in src) if (k in dst) dst[k] += src[k] * mul; return dst; }

// ラン開始時の永続ボーナス（ツリー・装備・衣装・キャラLv・転生）
function metaStats(charId) {
  const s = emptyStats();
  const sv = Save.data;
  for (const n of D.TREE) { const lv = sv.tree[n.id] || 0; if (lv) s[n.stat] += n.per * lv; }
  for (const slot in sv.equip) { const it = sv.equip[slot]; if (it) addStats(s, equipStats(it)); }
  const ch = D.CHARS.find(c => c.id === charId);
  if (ch) addStats(s, ch.bonus);
  const cs = sv.chars[charId];
  if (cs) {
    const skin = D.SKINS.find(k => k.id === cs.skin);
    if (skin) addStats(s, skin.bonus);
    s.might += (cs.lv - 1) * 0.01;
    s.maxHp += (cs.lv - 1) * 0.01;
  }
  const rp = sv.rebornPts || 0;
  s.might += rp * 0.05; s.maxHp += rp * 0.05; s.greed += rp * 0.05; s.growth += rp * 0.03;
  return s;
}

function equipStats(it) {
  const s = {};
  const mul = 1 + (it.plus || 0) * 0.1;
  for (const a of it.affixes) s[a.stat] = (s[a.stat] || 0) + a.value * mul;
  return s;
}

// ---------- 装備生成 ----------
function rollRarity(luck) {
  const r = Math.random() / (1 + luck);
  if (r < 0.004) return 5;
  if (r < 0.02) return 4;
  if (r < 0.08) return 3;
  if (r < 0.22) return 2;
  if (r < 0.5) return 1;
  return 0;
}
function rollAffix(exclude) {
  const pool = D.AFFIXES.filter(a => !exclude.includes(a.stat));
  const a = pool[Math.floor(Math.random() * pool.length)];
  let v = a.min + Math.random() * (a.max - a.min);
  v = a.pct ? Math.round(v * 1000) / 1000 : Math.round(v * 10) / 10;
  return { stat: a.stat, value: v };
}
function makeEquip(rarity) {
  const slot = D.EQUIP_SLOTS[Math.floor(Math.random() * D.EQUIP_SLOTS.length)];
  const r = D.RARITY[rarity];
  const affixes = [];
  for (let i = 0; i < r.affixes; i++) affixes.push(rollAffix(affixes.map(a => a.stat)));
  // レア度に応じて数値を底上げ
  affixes.forEach(a => { a.value = Math.round(a.value * (1 + rarity * 0.15) * 1000) / 1000; });
  const it = { uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), slot: slot.id, rarity, affixes, plus: 0 };
  if (r.special) it.special = D.SPECIALS[Math.floor(Math.random() * D.SPECIALS.length)].id;
  it.name = equipName(it);
  return it;
}
const EQUIP_NAMES = {
  ring: ['銅の指輪', '銀の指輪', '月光の指輪', '星屑の指輪', '天使の指輪', '神話の指輪'],
  amulet: ['木の首飾り', '水晶の首飾り', '蒼玉の首飾り', '紅玉の首飾り', '女神の首飾り', '神話の首飾り'],
  charm: ['お守り', '幸運のお守り', '精霊のお守り', '竜鱗のお守り', '聖獣のお守り', '神話のお守り'],
};
function equipName(it) { return EQUIP_NAMES[it.slot][it.rarity]; }
function affixText(a) {
  const def = D.AFFIXES.find(x => x.stat === a.stat);
  if (!def) return a.stat;
  return def.pct ? `${def.name} +${(a.value * 100).toFixed(1)}%` : `${def.name} +${a.value}`;
}
