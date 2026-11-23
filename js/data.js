// ゲームデータ（バランス調整はほぼこのファイルで行う）
'use strict';
const D = {};

// ---------- 属性 ----------
D.ELEM = {
  none: { name: '無', color: '#ddd' },
  fire: { name: '炎', color: '#ff7a3c' },
  ice: { name: '氷', color: '#7fd8ff' },
  thunder: { name: '雷', color: '#ffe14d' },
  light: { name: '光', color: '#fff3a8' },
  dark: { name: '闇', color: '#b07cff' },
};

// ---------- キャラ ----------
// bonus: キャラ固有パッシブ（stat に加算。倍率系は小数）
D.CHARS = [
  { id: 'lumina', name: 'ルミナ', title: '星の魔法少女', color: '#ff8fc8', weapon: 'wand',
    hp: 100, speed: 1.0, bonus: { might: 0.10 }, passiveText: '攻撃力 +10%',
    special: 'starburst', specialName: 'スターバースト', specialText: '画面全体に星の雨を降らせる', unlock: null },
  { id: 'kaede', name: 'カエデ', title: '紅の剣士', color: '#ff5d5d', weapon: 'katana',
    hp: 120, speed: 1.05, bonus: { area: 0.10, armor: 1 }, passiveText: '攻撃範囲 +10%・防御 +1',
    special: 'issen', specialName: '一閃', specialText: '周囲の敵をまとめて斬り払う', unlock: null },
  { id: 'noa', name: 'ノア', title: '蒼の機械少女', color: '#6fe0ff', weapon: 'beam',
    hp: 90, speed: 1.0, bonus: { cooldown: 0.08 }, passiveText: 'クールダウン -8%',
    special: 'overdrive', specialName: 'オーバードライブ', specialText: '巨大レーザーで一回転なぎ払う', unlock: null },
  { id: 'mio', name: 'ミオ', title: '森のエルフ射手', color: '#8fe07a', weapon: 'bow',
    hp: 90, speed: 1.1, bonus: { projSpeed: 0.2, luck: 0.1 }, passiveText: '弾速 +20%・幸運 +10%',
    special: 'arrowrain', specialName: 'アローレイン', specialText: '矢の雨が10秒間降り注ぐ', unlock: 'clear_forest' },
  { id: 'shizuku', name: 'シズク', title: '氷の魔女', color: '#a6d8ff', weapon: 'ice',
    hp: 95, speed: 0.95, bonus: { duration: 0.2 }, passiveText: '効果時間 +20%',
    special: 'freeze', specialName: 'アブソリュート', specialText: '画面内の敵を6秒間凍らせる', unlock: 'kills_5000' },
  { id: 'rin', name: 'リン', title: '狐の巫女', color: '#ffb35c', weapon: 'fox',
    hp: 105, speed: 1.0, bonus: { regen: 0.5, magnet: 0.3 }, passiveText: '毎秒0.5回復・回収範囲 +30%',
    special: 'kitsune', specialName: '九尾招来', specialText: '狐火が敵を焼き、HPを回復する', unlock: 'clear_3stages' },
];

// 衣装（見た目は色相をずらすだけ。小さな性能ボーナス付き）
D.SKINS = [
  { id: 'default', name: 'いつもの服', hue: 0, bonus: {}, cost: 0 },
  { id: 'night', name: '夜色ドレス', hue: 200, bonus: { might: 0.03 }, cost: 800 },
  { id: 'sakura', name: '桜の装い', hue: 320, bonus: { maxHp: 0.05 }, cost: 800 },
  { id: 'gold', name: '黄金の装い', hue: 40, bonus: { greed: 0.10 }, cost: 3000 },
];

// ---------- 武器 ----------
// type: 挙動。lv: 各レベルで加算される差分（2レベル目以降）
D.WEAPONS = {
  wand: { name: '星のワンド', icon: 'icon_wand', elem: 'light', type: 'homing', desc: '近くの敵を追いかける星弾',
    base: { dmg: 10, cd: 1.0, amount: 1, speed: 360, pierce: 1, size: 9, dur: 2 },
    lv: [{ amount: 1 }, { dmg: 5 }, { cd: -0.1 }, { amount: 1 }, { dmg: 5 }, { pierce: 1 }, { dmg: 10 }] },
  katana: { name: '紅刃', icon: 'icon_katana', elem: 'none', type: 'slash', desc: '前方を大きく斬り払う',
    base: { dmg: 16, cd: 1.2, amount: 1, area: 70, dur: 0.18 },
    lv: [{ amount: 1 }, { dmg: 6 }, { area: 15 }, { dmg: 6 }, { cd: -0.15 }, { area: 15 }, { dmg: 12 }] },
  beam: { name: 'フォトンビーム', icon: 'icon_beam', elem: 'light', type: 'beam', desc: '一直線に貫くレーザー',
    base: { dmg: 8, cd: 1.6, amount: 1, length: 320, width: 10, dur: 0.35, tick: 0.1 },
    lv: [{ dmg: 3 }, { width: 6 }, { amount: 1 }, { length: 80 }, { cd: -0.2 }, { dmg: 4 }, { amount: 1 }] },
  bow: { name: '翠の長弓', icon: 'icon_bow', elem: 'none', type: 'arrow', desc: '進行方向に貫通する矢を放つ',
    base: { dmg: 12, cd: 0.9, amount: 1, speed: 560, pierce: 3, size: 6, dur: 1.4, spread: 0.18 },
    lv: [{ amount: 1 }, { dmg: 5 }, { pierce: 2 }, { amount: 1 }, { cd: -0.15 }, { dmg: 6 }, { amount: 2 }] },
  ice: { name: '氷晶の欠片', icon: 'icon_ice', elem: 'ice', type: 'shard', desc: '四方に飛ぶ氷。敵を遅くする',
    base: { dmg: 9, cd: 1.3, amount: 3, speed: 300, pierce: 1, size: 8, dur: 1.5, slow: 0.4 },
    lv: [{ amount: 1 }, { dmg: 4 }, { amount: 1 }, { slow: 0.15 }, { cd: -0.15 }, { amount: 2 }, { dmg: 8 }] },
  fox: { name: '狐火', icon: 'icon_fox', elem: 'fire', type: 'minion', desc: '敵に飛びつく狐火を呼ぶ',
    base: { dmg: 7, cd: 0.6, amount: 1, speed: 260, size: 11, tick: 0.45 },
    lv: [{ dmg: 3 }, { amount: 1 }, { speed: 40 }, { dmg: 4 }, { amount: 1 }, { cd: -0.15 }, { dmg: 6 }] },
  orbit: { name: '守りの宝珠', icon: 'icon_orbit', elem: 'light', type: 'orbit', desc: '周りを回る宝珠',
    base: { dmg: 8, cd: 4.0, amount: 2, radius: 80, size: 12, dur: 3, spin: 3.2 },
    lv: [{ amount: 1 }, { dmg: 4 }, { radius: 15 }, { amount: 1 }, { dur: 1 }, { dmg: 6 }, { amount: 1 }] },
  aura: { name: '聖なる結界', icon: 'icon_aura', elem: 'light', type: 'aura', desc: '周囲の敵にダメージを与え続ける',
    base: { dmg: 4, cd: 0.5, radius: 70 },
    lv: [{ radius: 12 }, { dmg: 2 }, { cd: -0.05 }, { radius: 12 }, { dmg: 3 }, { cd: -0.05 }, { radius: 20 }] },
  lightning: { name: '天雷', icon: 'icon_lightning', elem: 'thunder', type: 'strike', desc: 'ランダムな敵に雷を落とす',
    base: { dmg: 20, cd: 1.8, amount: 2, area: 40 },
    lv: [{ amount: 1 }, { dmg: 8 }, { area: 15 }, { amount: 1 }, { cd: -0.2 }, { dmg: 12 }, { amount: 2 }] },
  fire: { name: 'フレアボム', icon: 'icon_fire', elem: 'fire', type: 'bomb', desc: '投げた先で爆発し燃え続ける',
    base: { dmg: 14, cd: 2.2, amount: 1, area: 60, dur: 2.0, tick: 0.5 },
    lv: [{ amount: 1 }, { area: 12 }, { dmg: 6 }, { dur: 1 }, { amount: 1 }, { cd: -0.3 }, { dmg: 10 }] },
  boomerang: { name: 'ムーンブーメラン', icon: 'icon_boomerang', elem: 'none', type: 'boomerang', desc: '飛んで戻ってくる',
    base: { dmg: 11, cd: 1.5, amount: 1, speed: 420, size: 14, dur: 1.4 },
    lv: [{ dmg: 5 }, { amount: 1 }, { size: 4 }, { dmg: 5 }, { amount: 1 }, { cd: -0.2 }, { dmg: 10 }] },
  mine: { name: 'ルーンの罠', icon: 'icon_mine', elem: 'dark', type: 'mine', desc: '足元に罠を置く。触れると爆発',
    base: { dmg: 30, cd: 1.6, amount: 1, area: 70, dur: 8 },
    lv: [{ dmg: 12 }, { amount: 1 }, { area: 15 }, { cd: -0.2 }, { dmg: 15 }, { amount: 1 }, { area: 25 }] },
  tornado: { name: 'つむじ風', icon: 'icon_tornado', elem: 'none', type: 'tornado', desc: 'さまよう竜巻が敵を巻き込む',
    base: { dmg: 6, cd: 3.0, amount: 1, speed: 120, size: 34, dur: 4, tick: 0.25 },
    lv: [{ dmg: 3 }, { size: 8 }, { amount: 1 }, { dur: 1.5 }, { dmg: 3 }, { amount: 1 }, { size: 14 }] },
  holywater: { name: '聖水', icon: 'icon_holywater', elem: 'ice', type: 'puddle', desc: '敵の足元に聖なる水たまり',
    base: { dmg: 5, cd: 3.0, amount: 2, area: 55, dur: 2.5, tick: 0.3 },
    lv: [{ amount: 1 }, { area: 10 }, { dmg: 3 }, { dur: 1 }, { amount: 1 }, { cd: -0.4 }, { dmg: 4 }] },
  drone: { name: 'サポートドローン', icon: 'icon_drone', elem: 'thunder', type: 'drone', desc: '周りを飛んで電撃弾を撃つ',
    base: { dmg: 6, cd: 0.7, amount: 1, speed: 480, size: 5, radius: 60 },
    lv: [{ dmg: 3 }, { amount: 1 }, { cd: -0.1 }, { dmg: 3 }, { amount: 1 }, { cd: -0.1 }, { dmg: 6 }] },
  meteor: { name: 'メテオ', icon: 'icon_meteor', elem: 'fire', type: 'meteor', desc: '遅いが強烈な隕石を落とす',
    base: { dmg: 60, cd: 5.0, amount: 1, area: 110 },
    lv: [{ dmg: 25 }, { area: 20 }, { amount: 1 }, { cd: -0.6 }, { dmg: 35 }, { area: 25 }, { amount: 1 }] },
};
D.WEAPON_MAX = 8;
// 最初から出る武器（残りは実績で解放）
D.WEAPON_START_POOL = ['wand', 'katana', 'beam', 'orbit', 'aura', 'lightning', 'fire', 'boomerang', 'holywater', 'drone'];

// ---------- パッシブ ----------
D.PASSIVES = {
  might: { name: '力のリボン', stat: 'might', per: 0.10, desc: '攻撃力 +10%' },
  armor: { name: '守りのブローチ', stat: 'armor', per: 1, desc: '被ダメージ -1' },
  maxHp: { name: '命のペンダント', stat: 'maxHp', per: 0.15, desc: '最大HP +15%' },
  regen: { name: '癒しの花', stat: 'regen', per: 0.3, desc: '毎秒HP +0.3回復' },
  cooldown: { name: '時の砂時計', stat: 'cooldown', per: 0.07, desc: 'クールダウン -7%' },
  area: { name: '広がる鏡', stat: 'area', per: 0.10, desc: '攻撃範囲 +10%' },
  projSpeed: { name: '疾風の羽', stat: 'projSpeed', per: 0.10, desc: '弾速 +10%' },
  duration: { name: '月のしずく', stat: 'duration', per: 0.10, desc: '効果時間 +10%' },
  amount: { name: '双子の鈴', stat: 'amount', per: 1, max: 2, desc: '発射数 +1' },
  moveSpeed: { name: '羽の靴', stat: 'moveSpeed', per: 0.08, desc: '移動速度 +8%' },
  magnet: { name: '引き寄せの磁石', stat: 'magnet', per: 0.25, desc: '回収範囲 +25%' },
  luck: { name: '四つ葉のクローバー', stat: 'luck', per: 0.10, desc: '幸運 +10%' },
};
D.PASSIVE_MAX = 5;

// ---------- 進化（武器Lv最大＋パッシブ所持で宝箱から） ----------
D.EVOLUTIONS = [
  { id: 'evo_wand', from: 'wand', passive: 'cooldown', name: '流星のロッド', mult: { dmg: 2, amount: 2, pierce: 3 } },
  { id: 'evo_katana', from: 'katana', passive: 'might', name: '紅蓮千本桜', mult: { dmg: 2.2, area: 1.5, amount: 1 } },
  { id: 'evo_beam', from: 'beam', passive: 'duration', name: 'ギガフォトン', mult: { dmg: 2, width: 2.5, length: 1.6 } },
  { id: 'evo_bow', from: 'bow', passive: 'projSpeed', name: '天穿つ神弓', mult: { dmg: 2, pierce: 5, amount: 2 } },
  { id: 'evo_ice', from: 'ice', passive: 'area', name: '永久氷河', mult: { dmg: 2, amount: 2, slow: 1.5 } },
  { id: 'evo_fox', from: 'fox', passive: 'luck', name: '九尾の狐火', mult: { dmg: 2.2, amount: 3 } },
  { id: 'evo_orbit', from: 'orbit', passive: 'regen', name: '星環の守護', mult: { dmg: 2, amount: 2, dur: 100 } },
  { id: 'evo_aura', from: 'aura', passive: 'maxHp', name: '聖域', mult: { dmg: 2.5, radius: 1.4 } },
  { id: 'evo_lightning', from: 'lightning', passive: 'amount', name: '神鳴り', mult: { dmg: 2, amount: 2, area: 1.5 } },
  { id: 'evo_fire', from: 'fire', passive: 'armor', name: 'インフェルノ', mult: { dmg: 2, area: 1.6, dur: 1.5 } },
  { id: 'evo_boomerang', from: 'boomerang', passive: 'moveSpeed', name: '三日月輪舞', mult: { dmg: 2, amount: 3, size: 1.5 } },
  { id: 'evo_mine', from: 'mine', passive: 'magnet', name: '魔法陣の檻', mult: { dmg: 2.5, area: 1.5, amount: 2 } },
  { id: 'evo_tornado', from: 'tornado', passive: 'moveSpeed', name: '大嵐', mult: { dmg: 2, size: 1.8, dur: 1.5 } },
  { id: 'evo_holywater', from: 'holywater', passive: 'duration', name: '慈雨', mult: { dmg: 2, area: 1.6, amount: 2 } },
  { id: 'evo_drone', from: 'drone', passive: 'cooldown', name: 'ドローン艦隊', mult: { dmg: 2, amount: 3 } },
  { id: 'evo_meteor', from: 'meteor', passive: 'area', name: '星降る夜', mult: { dmg: 2, amount: 4, area: 1.3 } },
];
// 融合進化（2つの武器が最大Lv）。結果の武器は元2つの枠を1つにまとめる
D.FUSIONS = [
  { id: 'fus_storm', from: ['ice', 'lightning'], name: '雷氷嵐', type: 'strike', elem: 'thunder', icon: 'icon_lightning',
    base: { dmg: 70, cd: 0.8, amount: 5, area: 80, slow: 0.6 } },
  { id: 'fus_firewhirl', from: ['fire', 'tornado'], name: '炎の竜巻', type: 'tornado', elem: 'fire', icon: 'icon_tornado',
    base: { dmg: 30, cd: 1.5, amount: 3, speed: 150, size: 70, dur: 6, tick: 0.2 } },
  { id: 'fus_starring', from: ['orbit', 'aura'], name: '星辰結界', type: 'orbit', elem: 'light', icon: 'icon_orbit',
    base: { dmg: 40, cd: 0.1, amount: 8, radius: 140, size: 18, dur: 999, spin: 2.4 } },
  { id: 'fus_starfall', from: ['wand', 'meteor'], name: '星降りの杖', type: 'meteor', elem: 'light', icon: 'icon_meteor',
    base: { dmg: 160, cd: 1.6, amount: 4, area: 130 } },
  { id: 'fus_bladefox', from: ['katana', 'fox'], name: '狐刃乱舞', type: 'minion', elem: 'fire', icon: 'icon_fox',
    base: { dmg: 45, cd: 0.3, amount: 6, speed: 380, size: 14, tick: 0.25 } },
  { id: 'fus_railgun', from: ['beam', 'drone'], name: 'レールキャノン衛星', type: 'drone', elem: 'thunder', icon: 'icon_drone',
    base: { dmg: 50, cd: 0.35, amount: 4, speed: 900, size: 8, radius: 90, pierce: 8 } },
];

// ---------- 敵 ----------
// ai: chase / zigzag / ranged / bomb / split / tank / boss
D.ENEMIES = {
  slime: { name: 'スライム', img: 'enemy_slime', hp: 8, spd: 55, dmg: 5, xp: 1, r: 14, color: '#6fdc6f', ai: 'chase', weak: 'fire' },
  bat: { name: 'コウモリ', img: 'enemy_bat', hp: 6, spd: 95, dmg: 4, xp: 1, r: 12, color: '#9b6bd6', ai: 'zigzag', weak: 'light' },
  mushroom: { name: 'キノコ', img: 'enemy_mushroom', hp: 14, spd: 45, dmg: 6, xp: 2, r: 15, color: '#e05a4f', ai: 'chase', weak: 'fire' },
  wolf: { name: 'オオカミ', img: 'enemy_wolf', hp: 18, spd: 120, dmg: 8, xp: 2, r: 16, color: '#8a8f99', ai: 'chase', weak: 'thunder' },
  skeleton: { name: 'スケルトン', img: 'enemy_skeleton', hp: 26, spd: 60, dmg: 9, xp: 3, r: 15, color: '#e8e2cf', ai: 'chase', weak: 'light' },
  ghost: { name: 'ゴースト', img: 'enemy_ghost', hp: 20, spd: 70, dmg: 8, xp: 3, r: 15, color: '#e9f1ff', ai: 'zigzag', weak: 'light' },
  imp: { name: 'インプ', img: 'enemy_imp', hp: 22, spd: 60, dmg: 7, xp: 4, r: 14, color: '#ff5b4a', ai: 'ranged', weak: 'ice' },
  bomb: { name: 'ボムりん', img: 'enemy_bomb', hp: 16, spd: 90, dmg: 25, xp: 3, r: 14, color: '#333', ai: 'bomb', weak: 'ice' },
  bigslime: { name: 'キングスライム', img: 'enemy_bigslime', hp: 90, spd: 40, dmg: 12, xp: 8, r: 24, color: '#4f8cff', ai: 'split', weak: 'thunder' },
  golem: { name: 'ゴーレム', img: 'enemy_golem', hp: 220, spd: 32, dmg: 18, xp: 14, r: 26, color: '#8c8a78', ai: 'tank', weak: 'thunder' },
  drone: { name: '暴走ドローン', img: 'enemy_drone', hp: 30, spd: 85, dmg: 9, xp: 4, r: 14, color: '#c33', ai: 'ranged', weak: 'thunder' },
  snowman: { name: '悪い雪だるま', img: 'enemy_snowman', hp: 40, spd: 50, dmg: 10, xp: 5, r: 18, color: '#f4fbff', ai: 'chase', weak: 'fire' },
  goldslime: { name: 'ゴールドスライム', img: 'enemy_slime', hp: 30, spd: 80, dmg: 3, xp: 3, r: 15, color: '#ffd84a', ai: 'flee', weak: 'none', coin: 8, hue: 60 },
};
D.BOSSES = {
  treant: { name: '古の大樹トレント', img: 'boss_treant', hp: 2400, spd: 40, dmg: 25, xp: 80, r: 50, color: '#5a7a3a', ai: 'boss', weak: 'fire' },
  frostdragon: { name: '氷竜グラキエス', img: 'boss_frostdragon', hp: 3600, spd: 55, dmg: 30, xp: 120, r: 56, color: '#8fd8ff', ai: 'boss', weak: 'fire' },
  mechtitan: { name: '機甲巨神オルト', img: 'boss_mechtitan', hp: 5000, spd: 45, dmg: 35, xp: 160, r: 58, color: '#888', ai: 'boss', weak: 'thunder' },
};

// ---------- ステージ ----------
// waves: [開始秒, 出現する敵の種類]
D.STAGES = [
  { id: 'forest', name: 'ささやきの森', tile: 'tile_forest', color: '#3f5a3a', time: 600, hpMul: 1, boss: 'treant',
    waves: [[0, ['slime']], [45, ['slime', 'bat']], [120, ['bat', 'mushroom']], [240, ['mushroom', 'wolf', 'bigslime']], [400, ['wolf', 'bigslime', 'golem']]],
    bgm: { root: 60, scale: [0, 2, 4, 7, 9], tempo: 112 } },
  { id: 'snow', name: '白銀の氷原', tile: 'tile_snow', color: '#9fb3c2', time: 600, hpMul: 1.6, boss: 'frostdragon', unlock: 'forest',
    waves: [[0, ['slime', 'bat']], [60, ['snowman', 'wolf']], [180, ['snowman', 'ghost', 'wolf']], [330, ['bigslime', 'snowman', 'bomb']], [450, ['golem', 'wolf', 'ghost']]],
    bgm: { root: 57, scale: [0, 2, 3, 7, 8], tempo: 96 } },
  { id: 'ruins', name: '黄昏の廃都', tile: 'tile_ruins', color: '#4d4b52', time: 600, hpMul: 2.4, boss: 'treant', unlock: 'snow',
    waves: [[0, ['skeleton', 'bat']], [60, ['skeleton', 'ghost']], [180, ['imp', 'skeleton', 'bomb']], [330, ['ghost', 'imp', 'golem']], [450, ['golem', 'imp', 'bomb']]],
    bgm: { root: 55, scale: [0, 1, 4, 5, 7, 8, 10], tempo: 120 } },
  { id: 'desert', name: '灼熱の砂海', tile: 'tile_desert', color: '#9c8152', time: 600, hpMul: 3.4, boss: 'frostdragon', unlock: 'ruins',
    waves: [[0, ['mushroom', 'wolf']], [60, ['wolf', 'imp']], [180, ['bomb', 'imp', 'bigslime']], [330, ['golem', 'skeleton', 'bomb']], [450, ['golem', 'imp', 'wolf']]],
    bgm: { root: 62, scale: [0, 1, 4, 5, 7, 8, 11], tempo: 128 } },
  { id: 'station', name: '星海ステーション', tile: 'tile_station', color: '#1f2433', time: 600, hpMul: 4.8, boss: 'mechtitan', unlock: 'desert',
    waves: [[0, ['drone', 'bat']], [60, ['drone', 'ghost']], [180, ['drone', 'bomb', 'imp']], [330, ['golem', 'drone', 'bigslime']], [450, ['golem', 'drone', 'bomb']]],
    bgm: { root: 59, scale: [0, 3, 5, 7, 10], tempo: 136 } },
  // 稼ぎステージ（短時間・コイン多め）
  { id: 'vault', name: '黄金の宝物庫', tile: 'tile_desert', color: '#6b5a2a', time: 300, hpMul: 2, coinMul: 3, special: 'vault', unlock: 'snow',
    waves: [[0, ['goldslime', 'slime']], [60, ['goldslime', 'bat', 'mushroom']], [150, ['goldslime', 'wolf', 'bigslime']]],
    bgm: { root: 64, scale: [0, 2, 4, 5, 7, 9, 11], tempo: 140 } },
  // エンドコンテンツ
  { id: 'abyss', name: '深淵', tile: 'tile_ruins', color: '#1c1228', time: 0, hpMul: 2, special: 'abyss', unlock: 'station',
    waves: [[0, ['skeleton', 'ghost', 'bat', 'imp', 'bomb', 'wolf', 'golem', 'drone', 'bigslime', 'snowman']]],
    bgm: { root: 50, scale: [0, 1, 3, 6, 7, 10], tempo: 100 } },
  { id: 'bossrush', name: 'ボスラッシュ', tile: 'tile_station', color: '#2a1a1e', time: 0, hpMul: 3, special: 'bossrush', unlock: 'station',
    waves: [[0, ['bat', 'skeleton']]],
    bgm: { root: 52, scale: [0, 1, 5, 7, 8], tempo: 150 } },
  { id: 'throne', name: '虚ろの玉座（裏ボス）', tile: 'tile_station', color: '#100c1a', time: 420, hpMul: 6, special: 'throne', unlock: 'allclear',
    waves: [[0, ['ghost', 'imp', 'drone', 'golem', 'bomb']]],
    bgm: { root: 48, scale: [0, 1, 3, 6, 7, 8, 11], tempo: 160 } },
];

// ---------- 永続強化スキルツリー ----------
// x,y: ツリー上の位置（マス）。req: 前提ノード（いずれかLv1以上）
D.TREE = [
  { id: 'root', name: '冒険の始まり', stat: 'maxHp', per: 0.05, max: 1, cost: 50, x: 4, y: 0, req: [] },
  { id: 'might1', name: '攻撃力', stat: 'might', per: 0.05, max: 5, cost: 100, x: 2, y: 1, req: ['root'] },
  { id: 'hp1', name: '最大HP', stat: 'maxHp', per: 0.08, max: 5, cost: 80, x: 4, y: 1, req: ['root'] },
  { id: 'spd1', name: '移動速度', stat: 'moveSpeed', per: 0.04, max: 3, cost: 120, x: 6, y: 1, req: ['root'] },
  { id: 'area1', name: '攻撃範囲', stat: 'area', per: 0.05, max: 3, cost: 200, x: 1, y: 2, req: ['might1'] },
  { id: 'cd1', name: 'クールダウン', stat: 'cooldown', per: 0.03, max: 3, cost: 250, x: 3, y: 2, req: ['might1'] },
  { id: 'armor1', name: '防御', stat: 'armor', per: 1, max: 3, cost: 200, x: 4, y: 2, req: ['hp1'] },
  { id: 'regen1', name: '自然回復', stat: 'regen', per: 0.1, max: 5, cost: 150, x: 5, y: 2, req: ['hp1'] },
  { id: 'magnet1', name: '回収範囲', stat: 'magnet', per: 0.1, max: 3, cost: 100, x: 7, y: 2, req: ['spd1'] },
  { id: 'dur1', name: '効果時間', stat: 'duration', per: 0.05, max: 3, cost: 200, x: 0, y: 3, req: ['area1'] },
  { id: 'pspd1', name: '弾速', stat: 'projSpeed', per: 0.05, max: 3, cost: 150, x: 2, y: 3, req: ['area1', 'cd1'] },
  { id: 'revival', name: '復活', stat: 'revival', per: 1, max: 1, cost: 3000, x: 4, y: 3, req: ['armor1', 'regen1'] },
  { id: 'growth1', name: '経験値', stat: 'growth', per: 0.05, max: 5, cost: 180, x: 6, y: 3, req: ['magnet1', 'regen1'] },
  { id: 'greed1', name: '金運', stat: 'greed', per: 0.08, max: 5, cost: 150, x: 8, y: 3, req: ['magnet1'] },
  { id: 'amount1', name: '発射数', stat: 'amount', per: 1, max: 1, cost: 5000, x: 1, y: 4, req: ['dur1', 'pspd1'] },
  { id: 'reroll', name: '振り直し', stat: 'reroll', per: 2, max: 5, cost: 300, x: 3, y: 4, req: ['pspd1', 'revival'] },
  { id: 'banish', name: '封印', stat: 'banish', per: 2, max: 3, cost: 400, x: 5, y: 4, req: ['revival', 'growth1'] },
  { id: 'luck1', name: '幸運', stat: 'luck', per: 0.05, max: 5, cost: 250, x: 7, y: 4, req: ['growth1', 'greed1'] },
  { id: 'might2', name: '攻撃力II', stat: 'might', per: 0.08, max: 5, cost: 1500, x: 2, y: 5, req: ['amount1', 'reroll'] },
  { id: 'card4', name: '4枚目のカード', stat: 'extraCard', per: 1, max: 1, cost: 4000, x: 4, y: 5, req: ['reroll', 'banish'] },
  { id: 'hp2', name: '最大HPII', stat: 'maxHp', per: 0.12, max: 5, cost: 1200, x: 6, y: 5, req: ['banish', 'luck1'] },
  { id: 'greed2', name: '金運II', stat: 'greed', per: 0.15, max: 5, cost: 1500, x: 8, y: 5, req: ['luck1'] },
];

// ---------- 拠点の施設 ----------
D.FACILITIES = [
  { id: 'training', name: '訓練所', desc: 'スキルツリーで永続強化ができる', costs: [0], free: true },
  { id: 'library', name: '記録室', desc: '図鑑・実績・統計・ベスト記録を見られる', costs: [200] },
  { id: 'wardrobe', name: '衣装室', desc: 'キャラの衣装を着替えられる', costs: [500] },
  { id: 'forge', name: '鍛冶屋', desc: '装備の強化・効果の付け替え・分解ができる', costs: [800] },
  { id: 'altar', name: '呪いの祭壇', desc: '呪い（難易度上昇）と縛りを設定できる', costs: [1500] },
  { id: 'gate', name: '転生の門', desc: '強さをリセットして永続ボーナスを得る', costs: [10000] },
];

// ---------- 装備 ----------
D.RARITY = [
  { name: 'コモン', color: '#cfcfcf', affixes: 1 },
  { name: 'アンコモン', color: '#6fdc6f', affixes: 2 },
  { name: 'レア', color: '#4fa8ff', affixes: 2 },
  { name: 'エピック', color: '#c37bff', affixes: 3 },
  { name: 'レジェンド', color: '#ffb02e', affixes: 4 },
  { name: 'ミシック', color: '#ff4f7b', affixes: 4, special: true },
];
D.EQUIP_SLOTS = [
  { id: 'ring', name: '指輪' }, { id: 'amulet', name: '首飾り' }, { id: 'charm', name: 'お守り' },
];
D.AFFIXES = [
  { stat: 'might', name: '攻撃力', min: 0.03, max: 0.10, pct: true },
  { stat: 'maxHp', name: '最大HP', min: 0.04, max: 0.12, pct: true },
  { stat: 'cooldown', name: 'クールダウン短縮', min: 0.02, max: 0.06, pct: true },
  { stat: 'area', name: '攻撃範囲', min: 0.03, max: 0.10, pct: true },
  { stat: 'moveSpeed', name: '移動速度', min: 0.02, max: 0.06, pct: true },
  { stat: 'magnet', name: '回収範囲', min: 0.05, max: 0.20, pct: true },
  { stat: 'luck', name: '幸運', min: 0.03, max: 0.10, pct: true },
  { stat: 'growth', name: '経験値', min: 0.03, max: 0.10, pct: true },
  { stat: 'greed', name: '金運', min: 0.05, max: 0.15, pct: true },
  { stat: 'duration', name: '効果時間', min: 0.03, max: 0.10, pct: true },
  { stat: 'armor', name: '防御', min: 1, max: 2, pct: false },
  { stat: 'regen', name: '自然回復', min: 0.1, max: 0.4, pct: false },
];
D.SPECIALS = [
  { id: 'nova', name: '被弾時に周囲を爆破' },
  { id: 'vamp', name: '撃破時にたまにHP回復' },
  { id: 'execute', name: '3%の確率で敵を即撃破' },
  { id: 'double', name: '10%の確率でダメージ2倍' },
];

// ---------- 縛り ----------
D.CHALLENGES = [
  { id: 'oneweapon', name: '武器ひとすじ', desc: '新しい武器を取れない', reward: 0.5 },
  { id: 'nopassive', name: '素手の心得', desc: 'パッシブを取れない', reward: 0.4 },
  { id: 'noheal', name: '回復禁止', desc: 'HPが回復しない', reward: 0.6 },
];

// ---------- 実績 ----------
// check(s): 統計 s を受け取り達成したか。reward: 解放内容
D.ACHIEVEMENTS = [
  { id: 'first_run', name: 'はじめの一歩', desc: '1回プレイする', check: s => s.runs >= 1, reward: { coins: 100 } },
  { id: 'kills_1000', name: '千体斬り', desc: '累計1,000体撃破', check: s => s.kills >= 1000, reward: { weapon: 'bow' } },
  { id: 'kills_5000', name: '五千の軍勢', desc: '累計5,000体撃破', check: s => s.kills >= 5000, reward: { char: 'shizuku' } },
  { id: 'kills_20000', name: '二万の嵐', desc: '累計20,000体撃破', check: s => s.kills >= 20000, reward: { weapon: 'tornado' } },
  { id: 'kills_100000', name: '十万の伝説', desc: '累計100,000体撃破', check: s => s.kills >= 100000, reward: { coins: 20000 } },
  { id: 'lv_20', name: '成長期', desc: '1回のプレイでLv20', check: s => s.bestLevel >= 20, reward: { weapon: 'ice' } },
  { id: 'lv_50', name: '覚醒', desc: '1回のプレイでLv50', check: s => s.bestLevel >= 50, reward: { weapon: 'meteor' } },
  { id: 'lv_100', name: '限界突破', desc: '1回のプレイでLv100', check: s => s.bestLevel >= 100, reward: { coins: 10000 } },
  { id: 'clear_forest', name: '森を抜けて', desc: 'ささやきの森をクリア', check: s => s.cleared.forest, reward: { char: 'mio' } },
  { id: 'clear_snow', name: '氷原の踏破者', desc: '白銀の氷原をクリア', check: s => s.cleared.snow, reward: { weapon: 'fox' } },
  { id: 'clear_ruins', name: '廃都の灯', desc: '黄昏の廃都をクリア', check: s => s.cleared.ruins, reward: { weapon: 'mine' } },
  { id: 'clear_desert', name: '砂海を越えて', desc: '灼熱の砂海をクリア', check: s => s.cleared.desert, reward: { coins: 3000 } },
  { id: 'clear_station', name: '星の海へ', desc: '星海ステーションをクリア', check: s => s.cleared.station, reward: { coins: 5000 } },
  { id: 'clear_3stages', name: '旅慣れた冒険者', desc: '3つのステージをクリア', check: s => countClears(s) >= 3, reward: { char: 'rin' } },
  { id: 'allclear', name: '全ステージ制覇', desc: '5つのステージをすべてクリア', check: s => ['forest', 'snow', 'ruins', 'desert', 'station'].every(k => s.cleared[k]), reward: { coins: 10000 } },
  { id: 'hard_any', name: '本気モード', desc: 'いずれかのハード版をクリア', check: s => Object.keys(s.clearedHard).length >= 1, reward: { coins: 2000 } },
  { id: 'hard_all', name: '真の強者', desc: '5ステージすべてのハード版をクリア', check: s => ['forest', 'snow', 'ruins', 'desert', 'station'].every(k => s.clearedHard[k]), reward: { title: '真の強者' } },
  { id: 'evolve_1', name: '進化の目覚め', desc: '武器を進化させる', check: s => Object.keys(s.recipes).length >= 1, reward: { coins: 500 } },
  { id: 'evolve_8', name: '進化の探究者', desc: '進化レシピを8種発見', check: s => Object.keys(s.recipes).length >= 8, reward: { coins: 3000 } },
  { id: 'evolve_all', name: '進化図鑑コンプリート', desc: '進化・融合レシピをすべて発見', check: s => Object.keys(s.recipes).length >= D.EVOLUTIONS.length + D.FUSIONS.length, reward: { title: '博識の魔導師' } },
  { id: 'fusion_1', name: '二つの力', desc: '融合進化を行う', check: s => Object.keys(s.recipes).some(k => k.startsWith('fus_')), reward: { coins: 1500 } },
  { id: 'curse_5', name: '呪われし者', desc: '呪い5以上でクリア', check: s => s.bestCurse >= 5, reward: { coins: 5000 } },
  { id: 'curse_20', name: '深き呪い', desc: '呪い20以上でクリア', check: s => s.bestCurse >= 20, reward: { title: '呪いを喰らう者' } },
  { id: 'abyss_10', name: '深淵を覗く', desc: '深淵で10階に到達', check: s => s.abyssBest >= 10, reward: { coins: 4000 } },
  { id: 'abyss_30', name: '深淵の底へ', desc: '深淵で30階に到達', check: s => s.abyssBest >= 30, reward: { title: '深淵の探索者' } },
  { id: 'bossrush', name: 'ボスキラー', desc: 'ボスラッシュを完走', check: s => s.bossrushClear, reward: { coins: 5000 } },
  { id: 'throne', name: '玉座の主を討つ', desc: '裏ボスを倒す', check: s => s.cleared.throne, reward: { title: '玉座を砕く者' } },
  { id: 'oneweapon', name: '一途な想い', desc: '「武器ひとすじ」でクリア', check: s => s.challengeClear.oneweapon, reward: { coins: 3000 } },
  { id: 'nopassive', name: '素手の極意', desc: '「素手の心得」でクリア', check: s => s.challengeClear.nopassive, reward: { coins: 3000 } },
  { id: 'noheal', name: '不屈', desc: '「回復禁止」でクリア', check: s => s.challengeClear.noheal, reward: { coins: 3000 } },
  { id: 'dmg_1m', name: '百万の一撃', desc: '1回のプレイで100万ダメージ', check: s => s.bestDamage >= 1e6, reward: { coins: 1000 } },
  { id: 'dmg_1b', name: '億の彼方', desc: '1回のプレイで1億ダメージ', check: s => s.bestDamage >= 1e8, reward: { coins: 20000 } },
  { id: 'coins_10k', name: 'お小遣い', desc: '累計10,000コイン獲得', check: s => s.coinsTotal >= 10000, reward: { coins: 1000 } },
  { id: 'mythic', name: '神話の品', desc: 'ミシック装備を手に入れる', check: s => s.bestRarity >= 5, reward: { coins: 5000 } },
  { id: 'reborn', name: '生まれ変わり', desc: '転生する', check: s => s.reborn >= 1, reward: { coins: 2000 } },
  { id: 'all_chars', name: 'みんな集合', desc: '全キャラを解放', check: s => s.charsUnlocked >= D.CHARS.length, reward: { coins: 5000 } },
  { id: 'chr_lv20', name: '絆の深まり', desc: 'いずれかのキャラがLv20', check: s => s.bestCharLv >= 20, reward: { coins: 3000 } },
  { id: 'survive_30', name: '耐え抜く者', desc: '合計30分生き延びる', check: s => s.playTime >= 1800, reward: { coins: 500 } },
  { id: 'survive_600', name: '時間の旅人', desc: '合計10時間生き延びる', check: s => s.playTime >= 36000, reward: { title: '時間の旅人' } },
  { id: 'title_final', name: '最終称号', desc: '全ステージのハード版を呪い10以上でクリア', check: s => s.finalTitle, reward: { title: '星を継ぐ少女' } },
];
function countClears(s) { return ['forest', 'snow', 'ruins', 'desert', 'station'].filter(k => s.cleared[k]).length; }

// キャラレベル：1レベルごとに攻撃力 +1%、最大HP +1%
D.CHAR_LV_MAX = 50;
D.charXpNeed = lv => Math.floor(200 * Math.pow(lv, 1.5));
// プレイ中のレベルアップに必要な経験値
D.xpNeed = lv => Math.floor(4 + lv * 4 + Math.pow(lv, 1.55));
