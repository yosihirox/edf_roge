// 画面（拠点・メニュー・レベルアップ・リザルトなど）
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PARAM_NAMES = { dmg: '威力', cd: 'クールダウン', amount: '数', speed: '弾速', pierce: '貫通', size: '大きさ', dur: '持続', area: '範囲',
  length: '長さ', width: '太さ', radius: '半径', slow: '減速', spin: '回転', tick: '間隔', spread: '広がり' };

const UI = {
  levelKeys: null,
  sel: { char: 'lumina', support: null, stage: 'forest', hard: false },
  tab: 'enemies',

  init() {
    $('#pauseBtn').onclick = () => this.togglePause();
    $('#speedBtn').onclick = () => this.cycleSpeed();
    $('#specialBtn').onclick = () => Game.useSpecial();
    $('#screen').addEventListener('click', e => this.onClick(e));
    $('#modal').addEventListener('click', e => this.onClick(e));
    document.addEventListener('visibilitychange', () => { if (document.hidden && Game.run && !Game.run.over && !Game.run.paused) this.togglePause(); });
    this.home();
  },

  // ---------- 共通 ----------
  modalOpen() { return !$('#modal').classList.contains('hidden'); },
  openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="panel">${html}</div>`; m.classList.remove('hidden'); },
  closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; this.levelKeys = null; },
  toast(text, sec = 2) {
    const t = document.createElement('div'); t.className = 'toastItem'; t.textContent = text;
    const box = $('#toast'); while (box.children.length >= 3) box.firstChild.remove();
    box.appendChild(t); setTimeout(() => t.remove(), sec * 1000);
  },
  show(html) { const s = $('#screen'); s.innerHTML = html; s.classList.remove('hidden'); s.scrollTop = 0; },
  hideScreen() { $('#screen').classList.add('hidden'); $('#screen').innerHTML = ''; },
  icon(key, fallback) {
    const im = Assets.get(key);
    return im ? `<img class="ico" src="${im.src}" alt="">` : `<span class="ico emo">${fallback || '✦'}</span>`;
  },
  charImg(ch, cls = 'cimg') {
    const cs = Save.data.chars[ch.id] || {}; const skin = D.SKINS.find(s => s.id === cs.skin) || D.SKINS[0];
    const im = Assets.hued('chr_' + ch.id, skin.hue);
    const src = im ? (im.src || im.toDataURL()) : null;
    return src ? `<img class="${cls}" src="${src}" alt="">` : `<span class="${cls} ph" style="background:${ch.color}">${ch.name[0]}</span>`;
  },
  header(title, back = 'home') {
    const sv = Save.data;
    return `<div class="topbar"><button data-act="${back}" class="back">← 戻る</button><h2>${title}</h2>
      <div class="money">🪙 ${fmtNum(sv.coins)}${sv.facilities.forge ? ` ・ ⚙ ${fmtNum(sv.materials)}` : ''}</div></div>`;
  },

  onClick(e) {
    const el = e.target.closest('[data-act]'); if (!el) return;
    Sound.init(); Sound.resume(); Sound.sfx('click');
    const a = el.dataset.act; const v = el.dataset.v;
    const sv = Save.data;
    switch (a) {
      case 'home': this.home(); break;
      case 'prep': this.prep(); break;
      case 'selChar': this.sel.char = v; if (this.sel.support === v) this.sel.support = null; this.prep(); break;
      case 'selSup': this.sel.support = this.sel.support === v ? null : v; this.prep(); break;
      case 'selStage': this.sel.stage = v; this.prep(); break;
      case 'hard': this.sel.hard = !this.sel.hard; this.prep(); break;
      case 'go': this.startRun(); break;
      case 'continue': { const r = Save.loadRun(); if (r) this.startRun(r); break; }
      case 'discard': Save.clearRun(); this.home(); break;
      case 'facility': this.facility(v); break;
      case 'build': this.build(v); break;
      case 'tree': this.buyNode(v); break;
      case 'tab': this.tab = v; this.records(); break;
      case 'skin': this.skin(el.dataset.c, v); break;
      case 'equip': this.equipItem(v); break;
      case 'unequip': sv.equip[v] = null; Save.write(); this.forge(); break;
      case 'upgrade': this.upgradeItem(v); break;
      case 'reroll1': this.rerollAffix(v, +el.dataset.i); break;
      case 'salvage': this.salvage(v); break;
      case 'salvageLow': this.salvageLow(); break;
      case 'curse': sv.curse = Math.max(0, sv.curse + (+v)); Save.write(); this.altar(); break;
      case 'challenge': sv.challenge = sv.challenge === v ? null : v; Save.write(); this.altar(); break;
      case 'reborn': this.reborn(); break;
      case 'title': sv.title = v; Save.write(); this.records(); break;
      case 'settings': this.settings(); break;
      case 'toggle': sv.settings[v] = !sv.settings[v]; Save.write(); this.settings(); break;
      case 'vol': sv.settings[v] = Math.round(Math.min(1, Math.max(0, sv.settings[v] + (+el.dataset.d))) * 10) / 10; Sound.applyVolume(); Save.write(); this.settings(); break;
      case 'export': Save.exportFile(); break;
      case 'import': this.importSave(); break;
      case 'resetAll': if (confirm('本当に最初からやり直しますか？（元に戻せません）')) { Save.reset(); this.home(); } break;
      // ラン中
      case 'pick': this.pickCard(+v); break;
      case 'rerollCards': this.rerollCards(); break;
      case 'banishMode': this.banishMode = !this.banishMode; this.renderLevelUp(); break;
      case 'skipCard': this.closeModal(); break;
      case 'closeModal': this.closeModal(); break;
      case 'resume': this.togglePause(); break;
      case 'quit': this.closeModal(); Game.run.paused = false; Game.finish(false); break;
      case 'suspend': Save.saveRun(Game.snapshot()); Save.write(); Game.run = null; Sound.stopBgm(); this.closeModal(); this.home(); break;
      case 'toggleRun': sv.settings[v] = !sv.settings[v]; Save.write(); this.renderPause(); break;
      case 'resultOk': this.closeModal(); Game.run = null; this.home(); break;
      case 'retry': { this.closeModal(); Game.run = null; this.startRun(); break; }
    }
  },

  // ---------- 拠点 ----------
  home() {
    $('#hud').classList.add('hidden');
    const sv = Save.data; const run = Save.loadRun();
    const facs = D.FACILITIES.map(f => {
      const built = sv.facilities[f.id];
      return `<button class="fac ${built ? '' : 'locked'}" data-act="facility" data-v="${f.id}">
        <b>${f.name}</b><small>${built ? f.desc : `建設 🪙${fmtNum(f.costs[0])}`}</small></button>`;
    }).join('');
    const title = sv.title ? `<div class="ptitle">〈${esc(sv.title)}〉</div>` : '';
    this.show(`
      <div class="home">
        <div class="logo"><span>星継ぎの</span>サバイバー</div>
        ${title}
        <div class="money big">🪙 ${fmtNum(sv.coins)}${sv.facilities.forge ? ` ・ ⚙ ${fmtNum(sv.materials)}` : ''}${sv.rebornPts ? ` ・ ✧転生 ${sv.rebornPts}` : ''}</div>
        ${run ? `<div class="resume"><button class="primary" data-act="continue">▶ 中断したプレイを再開</button><button data-act="discard" class="small">破棄</button></div>` : ''}
        <button class="primary huge" data-act="prep">出撃する</button>
        <h3>拠点</h3>
        <div class="facs">${facs}</div>
        <button data-act="settings" class="wide">⚙ 設定・セーブデータ</button>
        <p class="hint">操作：移動だけ（WASD／矢印、スマホは画面をなぞる）。攻撃は自動。Spaceまたは「必殺」ボタンで必殺技。</p>
      </div>`);
  },
  facility(id) {
    const sv = Save.data;
    if (!sv.facilities[id]) { this.buildConfirm(id); return; }
    ({ training: () => this.training(), library: () => this.records(), wardrobe: () => this.wardrobe(),
      forge: () => this.forge(), altar: () => this.altar(), gate: () => this.gate() })[id]();
  },
  buildConfirm(id) {
    const f = D.FACILITIES.find(x => x.id === id); const sv = Save.data;
    this.show(`${this.header(f.name)}<div class="box"><p>${f.desc}</p><p>建設費用：🪙${fmtNum(f.costs[0])}</p>
      <button class="primary" data-act="build" data-v="${id}" ${sv.coins < f.costs[0] ? 'disabled' : ''}>建設する</button></div>`);
  },
  build(id) {
    const f = D.FACILITIES.find(x => x.id === id); const sv = Save.data;
    if (sv.coins < f.costs[0]) return;
    sv.coins -= f.costs[0]; sv.facilities[id] = 1; Save.write();
    this.toast(`${f.name}を建てた！`); this.facility(id);
  },

  // ---------- 出撃準備 ----------
  prep() {
    const sv = Save.data; const s = this.sel;
    if (!sv.unlockedChars.includes(s.char)) s.char = 'lumina';
    const chars = D.CHARS.map(c => {
      const un = sv.unlockedChars.includes(c.id);
      const cs = sv.chars[c.id];
      if (!un) {
        const ach = D.ACHIEVEMENTS.find(a => a.reward.char === c.id);
        return `<div class="ccard locked"><span class="cimg ph">?</span><b>？？？</b><small>${ach ? '実績「' + ach.name + '」で解放' : ''}</small></div>`;
      }
      return `<div class="ccard ${s.char === c.id ? 'on' : ''} ${s.support === c.id ? 'sup' : ''}">
        <button data-act="selChar" data-v="${c.id}" class="cmain">${this.charImg(c)}<b>${c.name}</b><small>${c.title} Lv${cs ? cs.lv : 1}</small></button>
        <button data-act="selSup" data-v="${c.id}" class="small supbtn" ${s.char === c.id ? 'disabled' : ''}>${s.support === c.id ? 'サポート中' : 'サポートに'}</button></div>`;
    }).join('');
    const ch = D.CHARS.find(c => c.id === s.char);
    const stages = D.STAGES.map(st => {
      const un = this.stageUnlocked(st);
      if (!un) return `<div class="scard locked"><b>？？？</b><small>${this.unlockText(st)}</small></div>`;
      const best = sv.stats.best[`${st.id}${s.hard ? '_hard' : ''}_${s.char}`];
      const clr = sv.stats.cleared[st.id] ? '✔' : '';
      const hclr = sv.stats.clearedHard[st.id] ? '★' : '';
      let info = st.special === 'abyss' ? `最高 ${sv.stats.abyssBest}階` : st.special === 'bossrush' ? 'ボスと連戦' : st.special === 'throne' ? '裏ボスを倒せ' : `${Math.floor(st.time / 60)}分生き残る`;
      if (st.special === 'vault') info = '5分・コイン大量';
      return `<button class="scard ${s.stage === st.id ? 'on' : ''}" data-act="selStage" data-v="${st.id}" style="--c:${st.color}">
        <b>${st.name} ${clr}${hclr}</b><small>${info}${best ? ` ・ 最高Lv${best.level}` : ''}</small></button>`;
    }).join('');
    const st = D.STAGES.find(x => x.id === s.stage);
    const hardOk = !st.special && sv.stats.cleared[st.id];
    if (!hardOk) s.hard = false;
    const sup = s.support ? D.CHARS.find(c => c.id === s.support) : null;
    const altar = sv.facilities.altar ? `<p class="note">呪い ${sv.curse}${sv.challenge ? ` ・ 縛り「${D.CHALLENGES.find(c => c.id === sv.challenge).name}」` : ''}（呪いの祭壇で変更）</p>` : '';
    this.show(`${this.header('出撃準備')}
      <h3>キャラクター</h3><div class="ccards">${chars}</div>
      <div class="box">
        <b>${ch.name}</b>：${ch.passiveText}<br>初期武器：${D.WEAPONS[ch.weapon].name} ／ 必殺技：${ch.specialName}（${ch.specialText}）
        ${sup ? `<br><b>サポート：${sup.name}</b>（${D.WEAPONS[sup.weapon].name}で援護、能力の半分を受け継ぐ）` : '<br><small>サポートキャラを選ぶと、後ろについて一緒に戦います</small>'}
      </div>
      <h3>ステージ</h3><div class="scards">${stages}</div>
      ${hardOk ? `<label class="hardtog"><button data-act="hard" class="${s.hard ? 'on' : ''}">${s.hard ? '★ハード版 ON' : 'ハード版 OFF'}</button> 敵が強く、報酬2倍</label>` : ''}
      ${altar}
      <button class="primary huge" data-act="go">出撃！</button>`);
  },
  stageUnlocked(st) {
    const c = Save.data.stats.cleared;
    if (!st.unlock) return true;
    if (st.unlock === 'allclear') return !!Save.data.achievements.allclear;
    return !!c[st.unlock];
  },
  unlockText(st) {
    if (st.unlock === 'allclear') return '5ステージをすべてクリアで解放';
    const s = D.STAGES.find(x => x.id === st.unlock); return `「${s.name}」クリアで解放`;
  },

  startRun(resume) {
    Sound.init(); Sound.resume();
    const s = this.sel;
    const opts = resume ? { stage: resume.stage, hard: resume.hard, char: resume.char, support: resume.support, resume } : { stage: s.stage, hard: s.hard, char: s.char, support: s.support };
    if (resume) Save.clearRun();
    Game.start(opts);
    this.hideScreen();
    $('#hud').classList.remove('hidden');
    $('#speedBtn').textContent = 'x1';
    Render.fit();
  },

  // ---------- HUD ----------
  hud() {
    const R = Game.run; if (!R) return;
    const p = R.player;
    $('#xpfill').style.width = (p.xp / D.xpNeed(p.level) * 100).toFixed(1) + '%';
    $('#lvtext').textContent = `Lv ${p.level}`;
    const st = R.stage;
    $('#timer').textContent = st.time ? fmtTime(st.time - R.t) : fmtTime(R.t);
    $('#kills').textContent = fmtNum(R.kills);
    $('#gold').textContent = fmtNum(R.gold);
    $('#floorText').textContent = st.special === 'abyss' ? `深淵 ${R.floor}階` : R.hard ? '★HARD' : '';
    const sb = $('#specialBtn');
    $('#specialFill').style.height = R.special + '%';
    sb.classList.toggle('ready', R.special >= 100);
    // 武器・パッシブ一覧（変化した時だけ作り直す）
    const sig = R.weapons.map(w => w.uid + ':' + w.level + (w.evo || '')).join(',') + '|' + JSON.stringify(R.passives);
    if (sig !== this._wsig) {
      this._wsig = sig;
      const ws = R.weapons.filter(w => w.owner === 'p').map(w => `<div class="ws ${w.evo ? 'evo' : ''} ${w.rare ? 'rare' : ''}">${this.icon(w.icon, '⚔')}<i>${w.evo ? '★' : w.level}</i></div>`).join('');
      const ps = Object.keys(R.passives).map(id => `<div class="ws pas"><span class="emo">${this.passiveEmoji(id)}</span><i>${R.passives[id]}</i></div>`).join('');
      $('#wslots').innerHTML = `<div class="wrow">${ws}</div><div class="wrow">${ps}</div>`;
    }
  },
  passiveEmoji(id) { return { might: '🎀', armor: '🛡', maxHp: '❤', regen: '🌸', cooldown: '⏳', area: '🔍', projSpeed: '🪶', duration: '🌙', amount: '🔔', moveSpeed: '👟', magnet: '🧲', luck: '🍀' }[id] || '✦'; },

  togglePause() {
    const R = Game.run; if (!R || R.over) return;
    if (R.paused) { R.paused = false; this.closeModal(); return; }
    if (this.modalOpen()) return;
    R.paused = true;
    Save.saveRun(Game.snapshot()); Save.write();
    this.renderPause();
  },
  renderPause() {
    const R = Game.run; const st = Save.data.settings;
    const ws = R.weapons.map(w => {
      const d = R.dmgBy[w.uid] || 0;
      return `<tr><td>${this.icon(w.icon, '⚔')}</td><td>${w.name}${w.owner === 's' ? '（サポート）' : ''}${w.rare ? ' <span class="rareTag">レア</span>' : ''}</td><td>${w.evo ? 'MAX★' : 'Lv' + w.level}</td><td>${fmtNum(d)}</td></tr>`;
    }).join('');
    const ps = Object.keys(R.passives).map(id => `${this.passiveEmoji(id)} ${D.PASSIVES[id].name} Lv${R.passives[id]}`).join('<br>');
    this.openModal(`<h2>一時停止</h2>
      <table class="wtable"><tr><th></th><th>武器</th><th>Lv</th><th>与ダメージ</th></tr>${ws}</table>
      <p>${ps || 'パッシブなし'}</p>
      <p class="note">合計ダメージ ${fmtNum(R.dmgTotal)} ・ 振り直し ${R.rerolls} ・ 封印 ${R.banishes}${R.player.revives ? ` ・ 復活 ${R.player.revives}` : ''}</p>
      <div class="row">
        <button data-act="toggleRun" data-v="dmgNum">ダメージ数字 ${st.dmgNum ? 'ON' : 'OFF'}</button>
        <button data-act="toggleRun" data-v="light">軽量モード ${st.light ? 'ON' : 'OFF'}</button>
        <button data-act="toggleRun" data-v="shake">揺れ・フラッシュ ${st.shake ? 'ON' : 'OFF'}</button>
      </div>
      <button class="primary" data-act="resume">再開</button>
      <div class="row"><button data-act="suspend">中断して拠点へ（あとで再開）</button><button data-act="quit" class="danger">あきらめる</button></div>`);
  },
  cycleSpeed() {
    const R = Game.run; if (!R) return;
    R.speed = R.speed === 1 ? 1.5 : R.speed === 1.5 ? 2 : 1;
    $('#speedBtn').textContent = 'x' + R.speed;
  },

  // ---------- レベルアップ ----------
  choiceLabel(c) {
    if (c.kind === 'wup') return `${c.w.name} Lv${c.w.level + 1 > D.WEAPON_MAX ? D.WEAPON_MAX : c.w.level}`;
    if (c.kind === 'wnew') return `${D.WEAPONS[c.id].name} 獲得`;
    if (c.kind === 'pup' || c.kind === 'pnew') return `${D.PASSIVES[c.id].name} Lv${Game.run.passives[c.id] || 1}`;
    if (c.kind === 'heal') return 'HP回復';
    return 'コイン +25';
  },
  cardHtml(c, i) {
    const R = Game.run;
    let icon, name, lv, desc, tag = '';
    if (c.kind === 'wup' || c.kind === 'wnew') {
      const d = D.WEAPONS[c.id];
      icon = this.icon(d.icon, '⚔'); name = d.name;
      if (c.kind === 'wnew') { lv = 'NEW'; desc = d.desc; if (c.rare) tag = '<span class="rareTag">★レア 威力+30%</span>'; }
      else {
        lv = `Lv${c.w.level} → ${c.w.level + 1}`;
        const delta = d.lv[c.w.level - 1];
        desc = Object.keys(delta).map(k => `${PARAM_NAMES[k] || k} ${delta[k] > 0 ? '+' : ''}${k === 'cd' ? delta[k] + '秒' : delta[k]}`).join('、');
        if (c.w.level + 1 === D.WEAPON_MAX) {
          const ev = D.EVOLUTIONS.find(e => e.from === c.id);
          desc += `<br><small class="evo">最大Lv！ ${D.PASSIVES[ev.passive].name}があると宝箱で進化</small>`;
        }
      }
      desc += ` <small class="elem" style="color:${D.ELEM[d.elem].color}">[${D.ELEM[d.elem].name}]</small>`;
    } else if (c.kind === 'pup' || c.kind === 'pnew') {
      const d = D.PASSIVES[c.id];
      icon = `<span class="ico emo">${this.passiveEmoji(c.id)}</span>`; name = d.name;
      lv = c.kind === 'pnew' ? 'NEW' : `Lv${R.passives[c.id]} → ${R.passives[c.id] + 1}`; desc = d.desc;
      const ev = D.EVOLUTIONS.filter(e => e.passive === c.id).map(e => D.WEAPONS[e.from].name);
      if (ev.length) desc += `<br><small class="evo">進化に使う：${ev.slice(0, 3).join('・')}</small>`;
    } else if (c.kind === 'heal') { icon = '<span class="ico emo">🍰</span>'; name = 'ケーキ'; lv = ''; desc = 'HPを40回復'; }
    else { icon = '<span class="ico emo">🪙</span>'; name = 'コイン袋'; lv = ''; desc = 'コイン +25'; }
    return `<button class="card ${this.banishMode ? 'banish' : ''} ${c.rare ? 'rare' : ''}" data-act="pick" data-v="${i}">
      <div class="ch">${icon}<div><b>${name}</b><small>${lv}</small></div></div><p>${desc}</p>${tag}<kbd>${i + 1}</kbd></button>`;
  },
  showLevelUp() {
    const R = Game.run;
    this.banishMode = false;
    this.choices = Game.buildChoices(3 + Math.floor(R.stats.extraCard));
    this.renderLevelUp();
  },
  renderLevelUp() {
    const R = Game.run;
    this.openModal(`<h2 class="lvh">レベルアップ！ <small>Lv ${R.player.level}</small></h2>
      ${this.banishMode ? '<p class="warn">封印するカードを選んでください（このプレイ中は二度と出ません）</p>' : ''}
      <div class="cards">${this.choices.map((c, i) => this.cardHtml(c, i)).join('')}</div>
      <div class="row">
        <button data-act="rerollCards" ${R.rerolls > 0 ? '' : 'disabled'}>振り直し (${R.rerolls})</button>
        <button data-act="banishMode" ${R.banishes > 0 ? '' : 'disabled'} class="${this.banishMode ? 'on' : ''}">封印 (${R.banishes})</button>
        <button data-act="skipCard">スキップ</button>
      </div>`);
    this.levelKeys = i => { if (this.choices[i]) this.pickCard(i); };
  },
  pickCard(i) {
    const R = Game.run; const c = this.choices[i]; if (!c) return;
    if (this.banishMode) {
      if (c.kind === 'heal' || c.kind === 'gold') return;
      R.banished.push(c.id); R.banishes--; this.banishMode = false;
      this.choices.splice(i, 1);
      const more = Game.buildChoices(1).filter(x => !this.choices.some(y => y.kind === x.kind && y.id === x.id));
      this.choices.push(...more.slice(0, 1));
      this.renderLevelUp(); return;
    }
    Game.applyChoice(c);
    this.closeModal();
  },
  rerollCards() {
    const R = Game.run; if (R.rerolls <= 0) return;
    R.rerolls--; this.choices = Game.buildChoices(this.choices.length); this.renderLevelUp();
  },

  showChest(results) {
    const names = results.map(r => r.text);
    this.openModal(`<h2>宝箱！</h2><div class="roulette" id="roul"></div><div id="chestList" class="chestList"></div>
      <button class="primary hidden" id="chestOk" data-act="closeModal">OK</button>`);
    // ルーレット演出
    const pool = Object.values(D.WEAPONS).map(w => w.name).concat(Object.values(D.PASSIVES).map(p => p.name));
    let n = 0; const roul = $('#roul'); const list = $('#chestList'); let shown = 0;
    const tick = setInterval(() => {
      if (!roul.isConnected) { clearInterval(tick); return; }
      roul.textContent = pool[Math.floor(Math.random() * pool.length)];
      n++;
      if (n % 8 === 0) {
        const r = results[shown++];
        list.insertAdjacentHTML('beforeend', `<div class="${r.evo ? 'evoText' : ''}">${esc(r.text)}</div>`);
        Sound.sfx(r.evo ? 'evolve' : 'coin');
        if (shown >= results.length) { clearInterval(tick); roul.textContent = '✦'; $('#chestOk').classList.remove('hidden'); }
      }
    }, 60);
  },

  showResult(r) {
    const R = Game.run;
    $('#hud').classList.add('hidden');
    const ws = R.weapons.filter(w => R.dmgBy[w.uid]).sort((a, b) => (R.dmgBy[b.uid] || 0) - (R.dmgBy[a.uid] || 0))
      .map(w => `<tr><td>${this.icon(w.icon, '⚔')}</td><td>${w.name}</td><td>${fmtNum(R.dmgBy[w.uid])}</td></tr>`).join('');
    const eq = r.equips.map(it => `<div class="eq" style="--rc:${D.RARITY[it.rarity].color}">${it.name} <small>${D.RARITY[it.rarity].name}</small></div>`).join('');
    const ach = r.newAch.map(a => `<div class="ach">🏆 ${a.name}${a.reward ? ` <small>${a.reward}</small>` : ''}</div>`).join('');
    const st = R.stage;
    this.openModal(`<h2 class="${r.win ? 'win' : 'lose'}">${r.win ? 'ステージクリア！' : 'やられてしまった…'}</h2>
      <div class="resgrid">
        <div>時間<b>${fmtTime(R.t)}</b></div><div>撃破<b>${fmtNum(R.kills)}</b></div><div>Lv<b>${R.player.level}</b></div>
        <div>総ダメージ<b>${fmtNum(R.dmgTotal)}</b></div>${st.special === 'abyss' ? `<div>到達<b>${R.floor}階</b></div>` : ''}
        <div>獲得コイン<b>🪙${fmtNum(r.coins)}</b></div>
      </div>
      <p>${R.char.name} 経験値 +${r.cxp}${r.lvUp ? ` <b class="up">キャラLv${r.charLv}にアップ！</b>` : ''}</p>
      ${eq ? `<h3>手に入れた装備</h3><div class="eqs">${eq}</div><p class="note">鍛冶屋で装備できます</p>` : ''}
      ${ach ? `<h3>実績達成</h3>${ach}` : ''}
      <table class="wtable">${ws}</table>
      <div class="row"><button class="primary" data-act="resultOk">拠点へ</button><button data-act="retry">もう一度</button></div>`);
  },

  // ---------- 訓練所（スキルツリー） ----------
  training() {
    const sv = Save.data; const S = 76;
    const nodes = D.TREE;
    const lv = id => sv.tree[id] || 0;
    const avail = n => n.req.length === 0 || n.req.some(r => lv(r) > 0);
    const cost = n => Math.floor(n.cost * Math.pow(1.6, lv(n.id)));
    const W = 9 * S, H = 6 * S;
    let lines = '';
    for (const n of nodes) for (const r of n.req) {
      const m = nodes.find(x => x.id === r);
      lines += `<line x1="${m.x * S + S / 2}" y1="${m.y * S + S / 2}" x2="${n.x * S + S / 2}" y2="${n.y * S + S / 2}" class="${lv(r) ? 'on' : ''}"/>`;
    }
    const ns = nodes.map(n => {
      const l = lv(n.id); const max = l >= n.max; const ok = avail(n);
      const statTxt = n.stat === 'revival' ? '復活 +1' : n.stat === 'reroll' ? `振り直し +${n.per}` : n.stat === 'banish' ? `封印 +${n.per}` : n.stat === 'extraCard' ? 'カード +1枚' :
        n.stat === 'amount' ? '発射数 +1' : n.stat === 'armor' ? '防御 +1' : n.stat === 'regen' ? `回復 +${n.per}/秒` : `+${Math.round(n.per * 100)}%`;
      return `<button class="tnode ${l ? 'has' : ''} ${max ? 'max' : ''} ${ok ? '' : 'lock'}" style="left:${n.x * S + 4}px;top:${n.y * S + 4}px;width:${S - 8}px;height:${S - 8}px"
        data-act="tree" data-v="${n.id}" ${ok && !max && sv.coins >= cost(n) ? '' : 'aria-disabled="true"'}>
        <b>${n.name}</b><small>${statTxt}</small><i>${l}/${n.max}</i>${max ? '' : `<em>🪙${fmtNum(cost(n))}</em>`}</button>`;
    }).join('');
    this.show(`${this.header('訓練所 ─ スキルツリー')}
      <p class="note">取ったノードの隣が解放されます。コインはプレイで集まります。</p>
      <div class="treewrap"><div class="tree" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}">${lines}</svg>${ns}</div></div>`);
  },
  buyNode(id) {
    const sv = Save.data; const n = D.TREE.find(x => x.id === id);
    const l = sv.tree[id] || 0; const c = Math.floor(n.cost * Math.pow(1.6, l));
    const ok = n.req.length === 0 || n.req.some(r => (sv.tree[r] || 0) > 0);
    if (!ok || l >= n.max) return;
    if (sv.coins < c) { this.toast('コインが足りません'); return; }
    sv.coins -= c; sv.tree[id] = l + 1; Save.write(); Sound.sfx('level');
    const sc = $('.treewrap') ? [$('.treewrap').scrollLeft, $('#screen').scrollTop] : null;
    this.training();
    if (sc) { $('.treewrap').scrollLeft = sc[0]; $('#screen').scrollTop = sc[1]; }
  },

  // ---------- 記録室 ----------
  records() {
    const sv = Save.data; const st = sv.stats;
    const tabs = [['enemies', '敵図鑑'], ['weapons', '武器図鑑'], ['recipes', '進化レシピ'], ['ach', '実績'], ['best', 'ベスト記録'], ['stats', '統計']];
    let body = '';
    if (this.tab === 'enemies') {
      const all = Object.entries(D.ENEMIES).concat(Object.entries(D.BOSSES));
      const seen = all.filter(([k]) => st.enemyKills[k]).length;
      body = `<p class="note">発見 ${seen}/${all.length}（100体倒すと弱点がわかる）</p><div class="dex">` + all.map(([k, e]) => {
        const n = st.enemyKills[k] || 0;
        if (!n) return `<div class="dexi unk">？？？</div>`;
        const im = Assets.get(e.img);
        return `<div class="dexi">${im ? `<img src="${im.src}">` : `<span class="dot" style="background:${e.color}"></span>`}<b>${e.name}</b>
          <small>撃破 ${fmtNum(n)}<br>弱点 ${n >= 100 || D.BOSSES[k] ? `<span style="color:${D.ELEM[e.weak].color}">${D.ELEM[e.weak].name}</span>` : '？'}</small></div>`;
      }).join('') + '</div>';
    } else if (this.tab === 'weapons') {
      const ids = Object.keys(D.WEAPONS); const seen = ids.filter(k => st.weaponsSeen[k]).length;
      body = `<p class="note">使用 ${seen}/${ids.length}</p><div class="dex">` + ids.map(k => {
        const w = D.WEAPONS[k]; const un = sv.unlockedWeapons.includes(k);
        if (!un) { const a = D.ACHIEVEMENTS.find(x => x.reward.weapon === k); return `<div class="dexi unk">？？？<small>${a ? '実績「' + a.name + '」' : ''}</small></div>`; }
        return `<div class="dexi">${this.icon(w.icon, '⚔')}<b>${w.name}</b><small>${w.desc}<br>[${D.ELEM[w.elem].name}] ${st.weaponsSeen[k] ? '使用済み' : '未使用'}</small></div>`;
      }).join('') + '</div>';
    } else if (this.tab === 'recipes') {
      const all = D.EVOLUTIONS.length + D.FUSIONS.length; const got = Object.keys(st.recipes).length;
      body = `<p class="note">発見 ${got}/${all}（武器を最大Lvにして宝箱を開けると進化）</p><div class="dex">` +
        D.EVOLUTIONS.map(e => st.recipes[e.id] ? `<div class="dexi"><b>${e.name}</b><small>${D.WEAPONS[e.from].name} ＋ ${D.PASSIVES[e.passive].name}</small></div>`
          : `<div class="dexi unk">？？？<small>${D.WEAPONS[e.from].name} ＋ ？</small></div>`).join('') +
        D.FUSIONS.map(f => st.recipes[f.id] ? `<div class="dexi fus"><b>${f.name}</b><small>融合：${D.WEAPONS[f.from[0]].name} ＋ ${D.WEAPONS[f.from[1]].name}</small></div>`
          : `<div class="dexi unk fus">？？？<small>融合進化</small></div>`).join('') + '</div>';
    } else if (this.tab === 'ach') {
      const got = Object.keys(sv.achievements).length;
      body = `<p class="note">達成 ${got}/${D.ACHIEVEMENTS.length}</p>` + D.ACHIEVEMENTS.map(a => {
        const r = a.reward; const rt = r.coins ? `🪙${fmtNum(r.coins)}` : r.weapon ? `武器：${D.WEAPONS[r.weapon].name}` : r.char ? `キャラ：${D.CHARS.find(c => c.id === r.char).name}` : r.title ? `称号：${r.title}` : '';
        return `<div class="achrow ${sv.achievements[a.id] ? 'got' : ''}"><b>${sv.achievements[a.id] ? '🏆' : '・'} ${a.name}</b><small>${a.desc} ／ 報酬 ${rt}</small></div>`;
      }).join('') + (sv.titles.length ? `<h3>称号（タップで表示）</h3><div class="row">${sv.titles.map(t => `<button data-act="title" data-v="${esc(t)}" class="${sv.title === t ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>` : '');
    } else if (this.tab === 'best') {
      const rows = Object.entries(st.best).sort().map(([k, b]) => {
        const [sid, h, cid] = k.includes('_hard_') ? [k.split('_hard_')[0], true, k.split('_hard_')[1]] : [k.split('_')[0], false, k.split('_').slice(1).join('_')];
        const s = D.STAGES.find(x => x.id === sid); const c = D.CHARS.find(x => x.id === cid);
        if (!s || !c) return '';
        return `<tr><td>${s.name}${h ? '★' : ''}</td><td>${c.name}</td><td>${fmtTime(b.time)}</td><td>${fmtNum(b.kills)}</td><td>${b.level}</td><td>${b.clears}</td><td>${b.fastest ? fmtTime(b.fastest) : '-'}</td></tr>`;
      }).join('');
      body = rows ? `<table class="wtable"><tr><th>ステージ</th><th>キャラ</th><th>最長</th><th>撃破</th><th>Lv</th><th>クリア</th><th>最速</th></tr>${rows}</table>` : '<p>まだ記録がありません</p>';
    } else {
      body = `<div class="resgrid">
        <div>プレイ回数<b>${st.runs}</b></div><div>累計撃破<b>${fmtNum(st.kills)}</b></div><div>プレイ時間<b>${Math.floor(st.playTime / 3600)}時間${Math.floor(st.playTime % 3600 / 60)}分</b></div>
        <div>累計コイン<b>${fmtNum(st.coinsTotal)}</b></div><div>最高Lv<b>${st.bestLevel}</b></div><div>最高ダメージ<b>${fmtNum(st.bestDamage)}</b></div>
        <div>最高呪いクリア<b>${Math.max(0, st.bestCurse)}</b></div><div>深淵最高<b>${st.abyssBest}階</b></div><div>転生<b>${st.reborn}回</b></div></div>`;
    }
    this.show(`${this.header('記録室')}<div class="tabs">${tabs.map(([k, n]) => `<button data-act="tab" data-v="${k}" class="${this.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>${body}`);
  },

  // ---------- 衣装室 ----------
  wardrobe() {
    const sv = Save.data;
    const rows = sv.unlockedChars.map(id => {
      const ch = D.CHARS.find(c => c.id === id);
      const cs = sv.chars[id] || (sv.chars[id] = { lv: 1, xp: 0, skin: 'default', skins: ['default'] });
      const skins = D.SKINS.map(s => {
        const own = cs.skins.includes(s.id); const on = cs.skin === s.id;
        const bonus = Object.keys(s.bonus).map(k => `${({ might: '攻撃', maxHp: 'HP', greed: '金運' })[k]}+${Math.round(s.bonus[k] * 100)}%`).join('');
        return `<button data-act="skin" data-c="${id}" data-v="${s.id}" class="${on ? 'on' : ''}">${s.name}<small>${own ? (on ? '着用中' : '着替える') : '🪙' + fmtNum(s.cost)}${bonus ? ' ' + bonus : ''}</small></button>`;
      }).join('');
      const need = D.charXpNeed(cs.lv);
      return `<div class="box wr">${this.charImg(ch)}<div><b>${ch.name}</b> <small>Lv${cs.lv}${cs.lv < D.CHAR_LV_MAX ? `（次まで ${need - cs.xp}）` : ' MAX'}・攻撃/HP +${cs.lv - 1}%</small><div class="row">${skins}</div></div></div>`;
    }).join('');
    this.show(`${this.header('衣装室')}<p class="note">衣装は見た目が変わり、少しだけ能力も上がります。キャラLvはそのキャラで遊ぶと上がります。</p>${rows}`);
  },
  skin(cid, sid) {
    const sv = Save.data; const cs = sv.chars[cid]; const s = D.SKINS.find(x => x.id === sid);
    if (!cs.skins.includes(sid)) { if (sv.coins < s.cost) { this.toast('コインが足りません'); return; } sv.coins -= s.cost; cs.skins.push(sid); }
    cs.skin = sid; Save.write(); this.wardrobe();
  },

  // ---------- 鍛冶屋 ----------
  itemHtml(it, actions) {
    const r = D.RARITY[it.rarity];
    const af = it.affixes.map((a, i) => `<li>${affixText({ stat: a.stat, value: a.value * (1 + (it.plus || 0) * 0.1) })}${actions && actions.reroll ? ` <button class="tiny" data-act="reroll1" data-v="${it.uid}" data-i="${i}">付け替え 🪙${200 * (it.rarity + 1)}</button>` : ''}</li>`).join('');
    const sp = it.special ? `<li class="sp">✦ ${D.SPECIALS.find(s => s.id === it.special).name}</li>` : '';
    return `<div class="item" style="--rc:${r.color}"><b>${it.name}${it.plus ? ' +' + it.plus : ''}</b> <small>${r.name}・${D.EQUIP_SLOTS.find(s => s.id === it.slot).name}</small><ul>${af}${sp}</ul>${actions ? actions.html : ''}</div>`;
  },
  forge() {
    const sv = Save.data;
    const eq = D.EQUIP_SLOTS.map(s => {
      const it = sv.equip[s.id];
      return `<div class="slotbox"><h4>${s.name}</h4>${it ? this.itemHtml(it, { reroll: true, html: `<div class="row"><button data-act="upgrade" data-v="${it.uid}">強化 ⚙${this.upCost(it)}</button><button data-act="unequip" data-v="${s.id}">外す</button></div>` }) : '<p class="note">なし</p>'}</div>`;
    }).join('');
    const inv = sv.inventory.slice().sort((a, b) => b.rarity - a.rarity).map(it => this.itemHtml(it, { reroll: false,
      html: `<div class="row"><button data-act="equip" data-v="${it.uid}">装備</button><button data-act="upgrade" data-v="${it.uid}">強化 ⚙${this.upCost(it)}</button><button data-act="salvage" data-v="${it.uid}" class="danger">分解 +⚙${this.salvageVal(it)}</button></div>` })).join('');
    this.show(`${this.header('鍛冶屋')}
      <p class="note">装備は強敵・ボスが落とします。強化で効果が上がり、装備中の効果は「付け替え」で別の効果に変えられます。</p>
      <h3>装備中</h3><div class="slots">${eq}</div>
      <h3>持ち物（${sv.inventory.length}）</h3>
      ${sv.inventory.length ? '<button data-act="salvageLow" class="small">レア以下をまとめて分解</button>' : ''}
      <div class="items">${inv || '<p class="note">まだ装備がありません</p>'}</div>`);
  },
  findItem(uid) {
    const sv = Save.data;
    for (const s in sv.equip) if (sv.equip[s] && sv.equip[s].uid === uid) return { it: sv.equip[s], where: 'equip', slot: s };
    const i = sv.inventory.findIndex(x => x.uid === uid); return i >= 0 ? { it: sv.inventory[i], where: 'inv', idx: i } : null;
  },
  upCost(it) { return (it.plus + 1) * 5 * (it.rarity + 1); },
  salvageVal(it) { return (it.rarity + 1) * 3 + (it.plus || 0) * 2; },
  equipItem(uid) {
    const sv = Save.data; const f = this.findItem(uid); if (!f || f.where !== 'inv') return;
    const cur = sv.equip[f.it.slot]; sv.inventory.splice(f.idx, 1);
    if (cur) sv.inventory.push(cur);
    sv.equip[f.it.slot] = f.it; Save.write(); this.forge();
  },
  upgradeItem(uid) {
    const sv = Save.data; const f = this.findItem(uid); if (!f) return;
    const c = this.upCost(f.it); if (sv.materials < c) { this.toast('素材（⚙）が足りません。装備を分解すると手に入ります'); return; }
    if (f.it.plus >= 10) { this.toast('これ以上強化できません'); return; }
    sv.materials -= c; f.it.plus++; Save.write(); Sound.sfx('level'); this.forge();
  },
  rerollAffix(uid, i) {
    const sv = Save.data; const f = this.findItem(uid); if (!f) return;
    const c = 200 * (f.it.rarity + 1); if (sv.coins < c) { this.toast('コインが足りません'); return; }
    sv.coins -= c;
    const na = rollAffix(f.it.affixes.filter((_, k) => k !== i).map(a => a.stat));
    na.value = Math.round(na.value * (1 + f.it.rarity * 0.15) * 1000) / 1000;
    f.it.affixes[i] = na; Save.write(); this.forge();
  },
  salvage(uid) {
    const sv = Save.data; const f = this.findItem(uid); if (!f || f.where !== 'inv') return;
    sv.materials += this.salvageVal(f.it); sv.inventory.splice(f.idx, 1); Save.write(); this.forge();
  },
  salvageLow() {
    const sv = Save.data; let m = 0;
    sv.inventory = sv.inventory.filter(it => { if (it.rarity <= 2) { m += this.salvageVal(it); return false; } return true; });
    sv.materials += m; Save.write(); this.toast(`⚙ +${m}`); this.forge();
  },

  // ---------- 呪いの祭壇 ----------
  altar() {
    const sv = Save.data;
    const ch = D.CHALLENGES.map(c => `<button data-act="challenge" data-v="${c.id}" class="${sv.challenge === c.id ? 'on' : ''}">${c.name}<small>${c.desc}・クリア報酬 +${c.reward * 100}%</small></button>`).join('');
    this.show(`${this.header('呪いの祭壇')}
      <div class="box center"><h3>呪い ${sv.curse}</h3>
        <p>敵のHP +${sv.curse * 18}%・数 +${sv.curse * 10}%<br>獲得コイン +${sv.curse * 20}%</p>
        <div class="row"><button data-act="curse" data-v="-1">− 下げる</button><button data-act="curse" data-v="1">＋ 上げる</button><button data-act="curse" data-v="5">＋5</button></div>
        <p class="note">上限なし。最高クリア：${Math.max(0, sv.stats.bestCurse)}</p></div>
      <h3>縛りプレイ（1つまで）</h3><div class="row col">${ch}</div>`);
  },

  // ---------- 転生の門 ----------
  gate() {
    const sv = Save.data; const st = sv.stats;
    const ok = !!sv.achievements.allclear;
    const pts = 1 + Object.keys(st.clearedHard).length + Math.floor(Math.max(0, st.bestCurse) / 5);
    this.show(`${this.header('転生の門')}
      <div class="box"><p>転生すると<b>スキルツリーとコインがリセット</b>されます。代わりに転生ポイントを得て、<br>1ポイントごとに「攻撃・HP・金運 +5%、経験値 +3%」がずっと付きます。</p>
      <p>キャラ・衣装・装備・実績・施設はそのままです。</p>
      <p>現在の転生ポイント：${sv.rebornPts}　今転生すると：<b>+${pts}</b></p>
      ${ok ? `<button class="danger" data-act="reborn">転生する</button>` : '<p class="warn">5つのステージをすべてクリアすると転生できます</p>'}</div>`);
  },
  reborn() {
    const sv = Save.data; const st = sv.stats;
    if (!sv.achievements.allclear) return;
    if (!confirm('スキルツリーとコインがリセットされます。転生しますか？')) return;
    const pts = 1 + Object.keys(st.clearedHard).length + Math.floor(Math.max(0, st.bestCurse) / 5);
    sv.rebornPts += pts; sv.tree = {}; sv.coins = 0; st.reborn++;
    checkAchievements(); Save.write(); this.toast(`転生！ ポイント +${pts}`); this.home();
  },

  // ---------- 設定 ----------
  settings() {
    const st = Save.data.settings;
    const tg = (k, n) => `<button data-act="toggle" data-v="${k}" class="${st[k] ? 'on' : ''}">${n} ${st[k] ? 'ON' : 'OFF'}</button>`;
    const vol = (k, n) => `<div class="row">${n} <button data-act="vol" data-v="${k}" data-d="-0.1">−</button><b>${Math.round(st[k] * 100)}%</b><button data-act="vol" data-v="${k}" data-d="0.1">＋</button></div>`;
    this.show(`${this.header('設定')}
      <div class="box">${tg('dmgNum', 'ダメージ数字')} ${tg('light', '軽量モード')} ${tg('shake', '揺れ・フラッシュ')}
      ${vol('bgm', 'BGM')}${vol('sfx', '効果音')}</div>
      <h3>セーブデータ</h3>
      <div class="box"><p class="note">機種変更やバックアップ用に、ファイルで書き出し・読み込みができます。</p>
      <div class="row"><button data-act="export">書き出す</button><button data-act="import">読み込む</button><button data-act="resetAll" class="danger">最初から</button></div>
      <input type="file" id="importFile" accept="application/json,.json" class="hidden"></div>
      <h3>iPhoneで遊ぶには</h3><p class="note">Safariでこのページを開き、共有ボタン →「ホーム画面に追加」。アプリのように全画面で起動できます。</p>`);
  },
  importSave() {
    const f = $('#importFile');
    f.onchange = () => {
      const file = f.files[0]; if (!file) return;
      file.text().then(t => { try { Save.importText(t); this.toast('読み込みました'); this.home(); } catch (e) { this.toast('読み込めませんでした：' + e.message); } });
    };
    f.click();
  },
};
