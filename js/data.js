// =============================================================
//  EDF ローグライト・ディフェンス  ゲームデータ
//  武器名・装備名は EDF6 攻略情報を参考にしたファン向け設定。
//  数値はこのゲーム用のオリジナルバランス。
// =============================================================

// ---- 兵科 ----
const CLASSES = {
  ranger: {
    name: 'レンジャー', short: 'R', color: '#4caf50', cost: 50, hp: 110,
    desc: '万能型の歩兵。安価で対空もこなせる。',
    startWeapon: 'af14',
  },
  wingdiver: {
    name: 'ウイングダイバー', short: 'W', color: '#e91e63', cost: 80, hp: 70,
    desc: '高火力のエネルギー兵器。エネルギー切れで緊急チャージ。',
    startWeapon: 'rapier',
  },
  fencer: {
    name: 'フェンサー', short: 'F', color: '#607d8b', cost: 90, hp: 260,
    desc: '重装甲の盾役。近くの敵を引き付け、被ダメージを軽減。',
    startWeapon: 'blasthole',
  },
  airraider: {
    name: 'エアレイダー', short: 'A', color: '#ff9800', cost: 100, hp: 85,
    desc: '支援要請で範囲攻撃。射程内の味方を少しずつ回復。',
    startWeapon: 'strafe',
  },
};
const CLASS_KEYS = ['ranger', 'wingdiver', 'fencer', 'airraider'];

// ---- 武器 ----
// type:
//   hitscan : 即着弾の射撃 (pellets>1 で散弾)
//   cone    : 前方扇状に複数ヒット (レイピア/火炎系)
//   line    : 直線貫通 (スピア/ビーム/スナイパー)
//   rocket  : 弾体 + 爆風 (homing=true で誘導)
//   chain   : 連鎖電撃
//   strike  : 支援要請 (cooldown ごとに敵集団へ範囲攻撃)
//   drone   : 自律ドローン (ユニットの周りを周回して射撃)
const WEAPONS = {
  // ---------- レンジャー ----------
  af14:      { cls: 'ranger', name: 'AF-14', cat: 'アサルトライフル', rarity: 0, type: 'hitscan', dmg: 9, rate: 0.14, range: 150, air: true, color: '#ffe082', desc: '標準的なアサルトライフル。' },
  storkaf:   { cls: 'ranger', name: 'ストークAF', cat: 'アサルトライフル', rarity: 1, type: 'hitscan', dmg: 15, rate: 0.12, range: 165, air: true, color: '#ffe082', desc: '高精度・高連射のアサルトライフル。' },
  blazer:    { cls: 'ranger', name: 'ブレイザー', cat: 'アサルトライフル', rarity: 2, type: 'line', dmg: 34, rate: 0.09, range: 190, air: true, pierce: 3, color: '#ff5252', desc: 'レーザー兵器。直線上の敵を貫く。' },
  slaughter: { cls: 'ranger', name: 'スローターE20', cat: 'ショットガン', rarity: 1, type: 'hitscan', dmg: 11, pellets: 8, rate: 0.85, range: 100, air: true, color: '#ffcc80', desc: '近距離で圧倒的な火力の散弾銃。' },
  lysander:  { cls: 'ranger', name: 'ライサンダーF', cat: 'スナイパーライフル', rarity: 1, type: 'line', dmg: 140, rate: 1.6, range: 330, air: true, pierce: 1, color: '#b3e5fc', desc: '長射程・高威力の狙撃銃。' },
  stringer:  { cls: 'ranger', name: 'ストリンガーJ9', cat: 'スナイパーライフル', rarity: 2, type: 'line', dmg: 260, rate: 2.0, range: 380, air: true, pierce: 99, color: '#e1f5fe', desc: '全てを貫通する超高速弾。' },
  goliath:   { cls: 'ranger', name: 'ゴリアスD1', cat: 'ロケットランチャー', rarity: 1, type: 'rocket', dmg: 80, splash: 55, rate: 1.5, range: 220, air: false, speed: 260, color: '#ff8a65', desc: '爆風で集団を吹き飛ばすロケット。' },
  mlra:      { cls: 'ranger', name: 'MLRA-TF', cat: 'ミサイルランチャー', rarity: 2, type: 'rocket', dmg: 30, splash: 35, rate: 1.4, shots: 6, homing: true, range: 260, air: true, speed: 220, color: '#ffab91', desc: '6発の誘導ミサイルを一斉発射。' },

  // ---------- ウイングダイバー ----------
  rapier:    { cls: 'wingdiver', name: 'レイピア', cat: '近接-粒子', rarity: 0, type: 'cone', dmg: 7, rate: 0.06, range: 95, air: true, hits: 3, energy: 1.6, color: '#f48fb1', desc: '短射程・超高火力の粒子ブレード。' },
  rapierg:   { cls: 'wingdiver', name: 'レイピア・グリント', cat: '近接-粒子', rarity: 2, type: 'cone', dmg: 15, rate: 0.05, range: 110, air: true, hits: 5, energy: 1.8, color: '#f8bbd0', desc: '最上位のレイピア。' },
  thunderbow:{ cls: 'wingdiver', name: 'サンダーボウ30', cat: '電撃兵器', rarity: 1, type: 'chain', dmg: 26, chain: 5, rate: 0.45, range: 160, air: true, energy: 8, color: '#80d8ff', desc: '敵から敵へ跳ねる電撃。' },
  magblaster:{ cls: 'wingdiver', name: 'マグ・ブラスター', cat: '狙撃兵器', rarity: 1, type: 'line', dmg: 75, rate: 0.8, range: 220, air: true, pierce: 4, energy: 12, color: '#ea80fc', desc: '貫通する高出力ビーム。' },
  raijin:    { cls: 'wingdiver', name: 'ライジン', cat: '狙撃兵器', rarity: 2, type: 'line', dmg: 520, rate: 3.0, range: 340, air: true, pierce: 99, energy: 55, color: '#fff59d', desc: 'チャージ式の超火力ビーム。' },
  plasmacannon:{ cls: 'wingdiver', name: 'プラズマ・キャノン', cat: 'プラズマ兵器', rarity: 1, type: 'rocket', dmg: 150, splash: 75, rate: 2.0, range: 230, air: false, speed: 240, energy: 40, color: '#ce93d8', desc: '大爆発するプラズマ弾。' },
  mirage:    { cls: 'wingdiver', name: 'ミラージュ15WR', cat: '誘導兵器', rarity: 2, type: 'rocket', dmg: 22, splash: 18, shots: 8, homing: true, rate: 0.9, range: 270, air: true, speed: 300, energy: 22, color: '#b388ff', desc: '多数の敵をロックする誘導レーザー。' },

  // ---------- フェンサー ----------
  blasthole: { cls: 'fencer', name: 'ブラストホール・スピア', cat: '近接-刺', rarity: 0, type: 'line', dmg: 48, rate: 0.85, range: 80, air: false, pierce: 3, color: '#b0bec5', desc: '杭を射出する強力な近接兵器。' },
  flashing:  { cls: 'fencer', name: 'フラッシング・スピア', cat: '近接-刺', rarity: 1, type: 'line', dmg: 38, rate: 0.22, range: 95, air: false, pierce: 2, color: '#cfd8dc', desc: '高速連続刺突。' },
  gatling:   { cls: 'fencer', name: 'FG7ハンドガトリング', cat: '火砲', rarity: 1, type: 'hitscan', dmg: 11, rate: 0.06, range: 160, air: true, color: '#ffe0b2', desc: '凄まじい連射の機関砲。' },
  handcannon:{ cls: 'fencer', name: 'NC101ハンドキャノン', cat: '火砲', rarity: 1, type: 'rocket', dmg: 95, splash: 45, rate: 1.3, range: 210, air: false, speed: 320, color: '#ffccbc', desc: '榴弾を撃ち出す大砲。' },
  galleon:   { cls: 'fencer', name: 'ガリオン速射機関砲', cat: '火砲', rarity: 2, type: 'line', dmg: 70, rate: 0.35, range: 260, air: true, pierce: 2, color: '#fff3e0', desc: '長射程の速射砲。' },
  dexter:    { cls: 'fencer', name: 'デクスター自動散弾銃', cat: '火砲', rarity: 1, type: 'hitscan', dmg: 9, pellets: 7, rate: 0.3, range: 110, air: true, color: '#ffe0b2', desc: '連射可能な散弾銃。' },

  // ---------- エアレイダー ----------
  strafe:    { cls: 'airraider', name: '攻撃機 機銃掃射', cat: '支援要請', rarity: 0, type: 'strike', dmg: 32, hits: 10, radius: 70, rate: 6, range: 260, air: true, color: '#ffd54f', desc: '攻撃機による機銃掃射を要請。' },
  howitzer:  { cls: 'airraider', name: '120ミリ制圧榴弾砲', cat: '支援要請', rarity: 1, type: 'strike', dmg: 70, hits: 10, radius: 95, rate: 9, range: 300, air: false, color: '#ff7043', desc: '砲兵隊による榴弾の雨。' },
  spritefall:{ cls: 'airraider', name: 'スプライトフォール', cat: '支援要請', rarity: 2, type: 'strike', dmg: 45, hits: 30, radius: 80, rate: 12, range: 360, air: true, beam: true, color: '#80deea', desc: '衛星から降り注ぐレーザー。' },
  multicopter:{ cls: 'airraider', name: 'A4武装マルチコプター〔機銃〕', cat: 'ドローン', rarity: 1, type: 'drone', dmg: 10, rate: 0.18, range: 160, air: true, drones: 2, color: '#fff176', desc: '自律攻撃するドローンを2機展開。' },
  killercopter:{ cls: 'airraider', name: 'キラーコプター4', cat: 'ドローン', rarity: 2, type: 'drone', dmg: 22, rate: 0.15, range: 190, air: true, drones: 3, color: '#ffee58', desc: '高性能攻撃ドローンを3機展開。' },
  limpet:    { cls: 'airraider', name: 'リムペット・ガン', cat: '特殊兵器', rarity: 1, type: 'rocket', dmg: 65, splash: 45, rate: 0.9, range: 180, air: false, speed: 280, color: '#a5d6a7', desc: '粘着爆弾を連続発射。' },
};

// ---- 敵 ----
// flying: 経路を無視してベースへ直進
// ranged: 射程内のユニットを遠距離攻撃 / それ以外は接触時に噛みつき
const ENEMIES = {
  antBlack: { name: '巨大生物α', hp: 34, speed: 42, dmg: 6, atkRate: 0.9, atkRange: 22, ranged: false, size: 10, reward: 3, xp: 1, baseDmg: 2, color: '#222', budget: 1 },
  antRed:   { name: '巨大生物α 赤', hp: 90, speed: 52, dmg: 14, atkRate: 0.8, atkRange: 22, ranged: false, size: 12, reward: 5, xp: 2, baseDmg: 3, color: '#b71c1c', budget: 2.5, minWave: 3 },
  spider:   { name: '巨大生物β', hp: 45, speed: 68, dmg: 5, atkRate: 1.1, atkRange: 85, ranged: true, size: 11, reward: 4, xp: 2, baseDmg: 2, color: '#4e342e', budget: 1.8, minWave: 4, proj: '#eeeeee' },
  roller:   { name: '巨大生物γ', hp: 160, speed: 85, dmg: 18, atkRate: 1.5, atkRange: 20, ranged: false, size: 13, reward: 7, xp: 3, baseDmg: 6, color: '#5d4037', budget: 4, minWave: 7 },
  wasp:     { name: '飛行型巨大生物', hp: 40, speed: 70, dmg: 6, atkRate: 0.8, atkRange: 90, ranged: true, size: 10, reward: 5, xp: 2, baseDmg: 3, color: '#f9a825', budget: 2.2, minWave: 5, flying: true, proj: '#ffeb3b' },
  drone:    { name: 'タイプ1ドローン', hp: 70, speed: 55, dmg: 9, atkRate: 1.0, atkRange: 120, ranged: true, size: 12, reward: 6, xp: 3, baseDmg: 4, color: '#9e9e9e', budget: 3, minWave: 8, flying: true, proj: '#ff1744' },
  colonist: { name: 'コロニスト', hp: 420, speed: 30, dmg: 22, atkRate: 1.2, atkRange: 130, ranged: true, size: 16, reward: 18, xp: 7, baseDmg: 10, color: '#827717', budget: 9, minWave: 11, proj: '#76ff03' },
  android:  { name: 'アンドロイド', hp: 120, speed: 75, dmg: 16, atkRate: 0.6, atkRange: 22, ranged: false, size: 11, reward: 6, xp: 3, baseDmg: 5, color: '#cfd8dc', budget: 3, minWave: 13 },
  cosmonaut:{ name: 'コスモノーツ', hp: 1100, speed: 26, dmg: 35, atkRate: 1.0, atkRange: 150, ranged: true, size: 18, reward: 40, xp: 14, baseDmg: 20, color: '#283593', budget: 20, minWave: 16, proj: '#40c4ff' },
  // ボス
  erginus:  { name: '怪生物エルギヌス', hp: 9000, speed: 18, dmg: 60, atkRate: 1.2, atkRange: 60, ranged: false, size: 32, reward: 300, xp: 60, baseDmg: 60, color: '#4a148c', boss: true },
  mothership:{ name: 'テレポーションシップ', hp: 26000, speed: 12, dmg: 40, atkRate: 0.6, atkRange: 200, ranged: true, size: 40, reward: 800, xp: 150, baseDmg: 100, color: '#90a4ae', boss: true, flying: true, proj: '#ff1744', spawner: 'antBlack' },
};

// ---- 強化カード ----
// kind: weapon(武器換装) / mod(能力強化) / gear(補助装備) / supply(補給)
// apply(G) でゲーム状態に効果を与える。once=true は一度しか出ない。
const CARDS = [
  // --- 全兵科 ---
  { id: 'armor',     kind: 'gear', rarity: 0, cls: null, name: 'アーマー回収', desc: '全兵科の最大耐久 +15%', apply: G => G.modAll('hpMul', 0.15) },
  { id: 'ammo',      kind: 'gear', rarity: 0, cls: null, name: '弾薬増量パック', desc: '全兵科の攻撃速度 +10%', apply: G => G.modAll('rateMul', 0.10) },
  { id: 'power',     kind: 'gear', rarity: 1, cls: null, name: '高性能弾頭', desc: '全兵科の攻撃力 +15%', apply: G => G.modAll('dmgMul', 0.15) },
  { id: 'scope',     kind: 'gear', rarity: 0, cls: null, name: '高倍率スコープ', desc: '全兵科の射程 +10%', apply: G => G.modAll('rangeMul', 0.10) },
  { id: 'medic',     kind: 'gear', rarity: 0, cls: null, name: '救護班の増員', desc: '戦闘不能からの復帰時間 -35%', apply: G => { G.reviveMul *= 0.65; } },
  { id: 'base',      kind: 'gear', rarity: 0, cls: null, name: '前線基地の補強', desc: 'ベース最大耐久 +30、全回復', apply: G => { G.baseMax += 30; G.baseHp = G.baseMax; } },
  { id: 'income',    kind: 'gear', rarity: 1, cls: null, name: 'EDF補給部隊', desc: 'ウェーブ終了時の支給SP +40', apply: G => { G.waveIncome += 40; } },
  { id: 'bounty',    kind: 'gear', rarity: 1, cls: null, name: '戦果報告', desc: '撃破時の獲得SP +25%', apply: G => { G.rewardMul += 0.25; } },
  { id: 'supply',    kind: 'supply', rarity: 0, cls: null, name: '緊急物資投下', desc: 'SPを即座に +120', apply: G => { G.sp += 120; } },
  { id: 'crate',     kind: 'gear', rarity: 1, cls: null, name: '回収班の派遣', desc: 'アイテム箱の出現率 +50%', apply: G => { G.dropMul += 0.5; } },
  { id: 'discount',  kind: 'gear', rarity: 1, cls: null, name: '本部の増援許可', desc: '全兵科の配置コスト -15%', apply: G => { G.costMul *= 0.85; } },

  // --- レンジャー ---
  { id: 'r_dmg',     kind: 'mod', rarity: 0, cls: 'ranger', name: '射撃訓練', desc: 'レンジャーの攻撃力 +25%', apply: G => G.mod('ranger', 'dmgMul', 0.25) },
  { id: 'r_hp',      kind: 'gear', rarity: 0, cls: 'ranger', name: 'レンジャー強化服', desc: 'レンジャーの最大耐久 +40%', apply: G => G.mod('ranger', 'hpMul', 0.4) },
  { id: 'r_reverser',kind: 'gear', rarity: 1, cls: 'ranger', name: 'リバーサー', desc: 'レンジャーが周囲の味方を毎秒2回復', once: true, apply: G => { G.flags.reverser = true; } },
  { id: 'r_zegun',   kind: 'gear', rarity: 1, cls: 'ranger', name: 'ZE-GUN（バックパック）', desc: 'レンジャーが自動銃座で追加攻撃 (攻撃力の40%)', once: true, apply: G => { G.flags.zegun = true; } },
  { id: 'r_dash',    kind: 'gear', rarity: 0, cls: 'ranger', name: 'ダッシュ・セル', desc: 'レンジャーの攻撃速度 +20%', apply: G => G.mod('ranger', 'rateMul', 0.2) },

  // --- ウイングダイバー ---
  { id: 'w_dmg',     kind: 'mod', rarity: 0, cls: 'wingdiver', name: '出力強化', desc: 'ウイングダイバーの攻撃力 +25%', apply: G => G.mod('wingdiver', 'dmgMul', 0.25) },
  { id: 'w_core',    kind: 'gear', rarity: 0, cls: 'wingdiver', name: 'プラズマコア VZ', desc: 'エネルギー回復速度 +40%、容量 +20%', apply: G => { G.mod('wingdiver', 'energyRegen', 0.4); G.mod('wingdiver', 'energyMax', 0.2); } },
  { id: 'w_blink',   kind: 'gear', rarity: 1, cls: 'wingdiver', name: 'ブリンク・ボールα', desc: '独立作動装置。光球が敵を自動攻撃 (攻撃力の50%)', once: true, apply: G => { G.flags.blinkball = true; } },
  { id: 'w_dodge',   kind: 'gear', rarity: 1, cls: 'wingdiver', name: '飛行ユニット改良', desc: 'ウイングダイバーが30%の確率で攻撃を回避', once: true, apply: G => { G.flags.diverDodge = 0.3; } },
  { id: 'w_luminous',kind: 'gear', rarity: 1, cls: 'wingdiver', name: 'ルミナス・シールド', desc: 'ウイングダイバーの被ダメージ -30%', once: true, apply: G => G.mod('wingdiver', 'armor', 0.3) },

  // --- フェンサー ---
  { id: 'f_dmg',     kind: 'mod', rarity: 0, cls: 'fencer', name: 'パワーフレーム', desc: 'フェンサーの攻撃力 +25%', apply: G => G.mod('fencer', 'dmgMul', 0.25) },
  { id: 'f_shield',  kind: 'gear', rarity: 1, cls: 'fencer', name: 'ディフレクション・シールド', desc: 'フェンサーの被ダメージ -25%、受けた攻撃の30%を反射', once: true, apply: G => { G.mod('fencer', 'armor', 0.25); G.flags.reflect = 0.3; } },
  { id: 'f_hp',      kind: 'gear', rarity: 0, cls: 'fencer', name: 'シールド保護装置', desc: 'フェンサーの最大耐久 +50%', apply: G => G.mod('fencer', 'hpMul', 0.5) },
  { id: 'f_arm',     kind: 'gear', rarity: 1, cls: 'fencer', name: 'アームハウンド', desc: '強化スケルトン。フェンサーの攻撃速度 +30%', apply: G => G.mod('fencer', 'rateMul', 0.3) },
  { id: 'f_taunt',   kind: 'gear', rarity: 0, cls: 'fencer', name: '挑発ビーコン', desc: 'フェンサーが敵を引き付ける範囲 +50%', apply: G => G.mod('fencer', 'tauntMul', 0.5) },

  // --- エアレイダー ---
  { id: 'a_dmg',     kind: 'mod', rarity: 0, cls: 'airraider', name: '要請精度向上', desc: 'エアレイダーの攻撃力 +25%', apply: G => G.mod('airraider', 'dmgMul', 0.25) },
  { id: 'a_cd',      kind: 'gear', rarity: 1, cls: 'airraider', name: 'ビーコン連携', desc: '支援要請の待機時間 -25%', apply: G => G.mod('airraider', 'rateMul', 0.33) },
  { id: 'a_vendor',  kind: 'gear', rarity: 1, cls: 'airraider', name: 'ライフベンダー', desc: 'エアレイダーの回復量 3倍', once: true, apply: G => { G.flags.lifevendor = true; } },
  { id: 'a_capsule', kind: 'gear', rarity: 1, cls: 'airraider', name: '警護・カプセル', desc: 'エアレイダー周囲の味方の被ダメージ -20%', once: true, apply: G => { G.flags.capsule = true; } },
  { id: 'a_aircraft',kind: 'gear', rarity: 2, cls: 'airraider', name: '強襲エアクラフト', desc: 'ウェーブ中、20秒ごとに全域へ爆撃', once: true, apply: G => { G.flags.aircraft = true; } },
];

// レアリティ
const RARITY = [
  { name: 'コモン',  color: '#b0bec5', weight: 70 },
  { name: 'レア',    color: '#42a5f5', weight: 25 },
  { name: 'エピック', color: '#ffca28', weight: 7 },
];

// ---- マップ (経路の中間点。タイル座標) ----
const MAPS = [
  { name: '市街地', points: [[-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [18, 9], [18, 5], [20, 5]] },
  { name: '山岳基地', points: [[-1, 9], [3, 9], [3, 3], [8, 3], [8, 10], [12, 10], [12, 2], [16, 2], [16, 7], [20, 7]] },
  { name: '海岸線', points: [[2, -1], [2, 5], [7, 5], [7, 1], [11, 1], [11, 9], [5, 9], [5, 11], [15, 11], [15, 5], [20, 5]] },
];

const COLS = 20, ROWS = 12, TILE = 40;
const W = COLS * TILE, H = ROWS * TILE;
const FINAL_WAVE = 20;
