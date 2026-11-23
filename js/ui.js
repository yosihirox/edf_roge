// 画面（拠点・メニュー・レベルアップ・リザルトなど）
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PARAM_NAMES = { dmg: '威力', cd: 'クールダウン', amount: '数', speed: '弾速', pierce: '貫通', size: '大きさ', dur: '持続', area: '範囲',
  length: '長さ', width: '太さ', radius: '半径', slow: '減速', spin: '回転', tick: '間隔', spread: '広がり' };
const FAC_NOTE = { training: 'スキルツリー', library: '図鑑・実績・記録', wardrobe: '衣装の着替え', forge: '装備の強化', altar: '呪いと縛り', gate: '転生' };

const UI = {
  levelKeys: null, cur: '', tab: 'enemies', timers: [],
  get sel() { return Save.data.last; },

  init() {
    hydrateIcons();
    $('#pauseBtn').onclick = () => { Sound.sfx('click'); this.togglePause(); };
    $('#speedBtn').onclick = () => { Sound.sfx('toggle'); this.cycleSpeed(); };
    $('#specialBtn').onclick = () => Game.useSpecial();
    $('#screen').addEventListener('click', e => this.onClick(e));
    $('#modal').addEventListener('click', e => this.onClick(e));
    $('#bootStart').onclick = () => this.bootGo();
    document.addEventListener('visibilitychange', () => { if (document.hidden && Game.run && !Game.run.over && !Game.run.paused) this.togglePause(); });
  },

  // ---------- 起動 ----------
  bootProgress(k) { $('#bootfill').style.width = Math.round(k * 100) + '%'; },
  bootReady() {
    $('#boot').classList.add('ready'); $('#bootStart').classList.remove('hidden');
    hydrateIcons();
    this.home(); // タイトルの後ろで拠点を用意しておく
  },
  bootGo() {
    Sound.init(); Sound.resume(); Sound.sfx('start'); Sound.playMenuBgm();
    const b = $('#boot'); b.classList.add('leave'); setTimeout(() => b.remove(), 600);
    this.cur = ''; this.home();
  },

  // ---------- 共通 ----------
  modalOpen() { return !$('#modal').classList.contains('hidden'); },
  openModal(html, cls = '') {
    const m = $('#modal'); m.innerHTML = `<div class="panel ${cls}">${html}</div>`; m.classList.remove('hidden');
    if (Game.run) Sound.duck(true);
  },
  closeModal() {
    this.clearTimers();
    $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; this.levelKeys = null;
    Sound.duck(false);
    const R = Game.run; if (R && !R.over) R.resumeT = 0.6;
  },
  later(fn, ms) { const id = setTimeout(fn, ms); this.timers.push(id); return id; },
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; },
  toast(text, sec = 2) {
    const t = document.createElement('div'); t.className = 'toastItem'; t.textContent = text;
    const box = $('#toast'); while (box.children.length >= 3) box.firstChild.remove();
    box.appendChild(t); setTimeout(() => t.classList.add('out'), sec * 1000 - 250); setTimeout(() => t.remove(), sec * 1000);
  },
  // 画面中央の告知（ボス出現・ラッシュ・ステージ名など）
  banner(kind, title, sub = '') {
    const box = $('#banner');
    if (kind !== 'mini') box.querySelectorAll('.bn:not(.mini)').forEach(x => x.remove());
    const el = document.createElement('div'); el.className = 'bn ' + kind;
    el.innerHTML = `<div class="bnin">${sub && kind === 'boss' ? `<small>${esc(sub)}</small>` : ''}<b>${esc(title)}</b>${sub && kind !== 'boss' ? `<small>${esc(sub)}</small>` : ''}</div>`;
    box.appendChild(el);
    const life = { boss: 2900, stage: 2600, clear: 2400, over: 2400, mini: 1200 }[kind] || 2000;
    setTimeout(() => el.classList.add('out'), life - 350); setTimeout(() => el.remove(), life);
  },
  buzz(ms) { try { if (navigator.vibrate && Save.data.settings.shake) navigator.vibrate(ms); } catch (e) { /* 未対応の端末では何もしない */ } },
  bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); },
  // 暗転をはさんで画面を切り替える
  wipe(fn) {
    const f = $('#fade'); f.classList.add('on');
    setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 140); }, 280);
  },
  // 同じ画面の描き直しではアニメーションもスクロール位置もそのまま。別の画面に移る時だけ動かす
  show(name, html) {
    const s = $('#screen'); const same = name === this.cur; const top = s.scrollTop;
    s.innerHTML = `<div class="page">${html}</div>`; s.classList.remove('hidden'); s.dataset.name = name;
    if (same) s.scrollTop = top; else { s.scrollTop = 0; s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter'); }
    this.cur = name;
  },
  hideScreen() { $('#screen').classList.add('hidden'); $('#screen').innerHTML = ''; this.cur = ''; },
  icon(key, fallback) {
    const im = Assets.get(key);
    return im ? `<img class="ico" src="${im.src}" alt="">` : `<span class="ico emo">${ic(fallback || 'sword')}</span>`;
  },
  pasIcon(id, cls = '') { return `<span class="ico pas ${cls}" style="--pc:${PASSIVE_COLORS[id] || '#fff'}">${ic(id)}</span>`; },
  charSrc(ch, key = 'chr_') {
    const cs = Save.data.chars[ch.id] || {}; const skin = D.SKINS.find(s => s.id === cs.skin) || D.SKINS[0];
    const im = Assets.hued(key + ch.id, skin.hue);
    return im ? (im.src || (im._url || (im._url = im.toDataURL()))) : null;
  },
  charImg(ch, cls = 'cimg') {
    const src = this.charSrc(ch);
    return src ? `<img class="${cls}" src="${src}" alt="">` : `<span class="${cls} ph" style="background:${ch.color}">${ch.name[0]}</span>`;
  },
  portrait(ch, cls = '') {
    const src = this.charSrc(ch, 'ptr_') || this.charSrc(ch);
    return src ? `<img class="ptr ${cls}" src="${src}" alt="">` : `<span class="ptr ph ${cls}" style="background:${ch.color}">${ch.name[0]}</span>`;
  },
  wallet() {
    const sv = Save.data;
    return `<div class="wallet"><span class="chip gold">${ic('coin')}<b>${fmtNum(sv.coins)}</b></span>${sv.facilities.forge ? `<span class="chip ore">${ic('ore')}<b>${fmtNum(sv.materials)}</b></span>` : ''}${sv.rebornPts ? `<span class="chip reb">${ic('spark')}<b>${sv.rebornPts}</b></span>` : ''}</div>`;
  },
  cost(n, unit = 'coin') { return `<span class="cost">${ic(unit)}${fmtNum(n)}</span>`; },
  header(title, back = 'home') {
    return `<div class="topbar"><button data-act="${back}" class="back" aria-label="戻る">${ic('back')}</button><h2>${title}</h2>${this.wallet()}</div>`;
  },
  // 確認ダイアログ（ブラウザ標準の confirm は使わない）
  confirmBox(title, text, okLabel, fn, danger = true) {
    this._confirm = fn;
    this.openModal(`<h2>${title}</h2><p class="center">${text}</p>
      <div class="row btnrow"><button data-act="confirmNo">やめる</button><button class="${danger ? 'danger' : 'primary'}" data-act="confirmOk">${okLabel}</button></div>`, 'small pop');
  },

  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) { if (e.target.closest('.result')) this.finishReveal(); return; }
    Sound.init(); Sound.resume();
    const a = el.dataset.act; const v = el.dataset.v;
    if (el.disabled) return;
    Sound.sfx({ home: 'back', confirmNo: 'back', closeModal: 'confirm', prep: 'confirm', go: 'start', retry: 'start', continue: 'start', resultOk: 'confirm', resume: 'confirm', confirmOk: 'confirm',
      toggle: 'toggle', toggleRun: 'toggle', tab: 'toggle', hard: 'toggle', selChar: 'toggle', selSup: 'toggle', selStage: 'toggle', vol: 'toggle', curse: 'toggle', challenge: 'toggle',
      pick: '', tree: '', build: '', skin: '', upgrade: '' }[a] ?? 'click');
    const sv = Save.data;
    switch (a) {
      case 'home': this.home(); break;
      case 'prep': this.prep(); break;
      case 'selChar': this.sel.char = v; if (this.sel.support === v) this.sel.support = null; this.prep(); break;
      case 'selSup': this.sel.support = v || null; this.prep(); break;
      case 'selStage': this.sel.stage = v; this.prep(); break;
      case 'hard': this.sel.hard = !this.sel.hard; this.prep(); break;
      case 'go': this.wipe(() => this.startRun()); break;
      case 'continue': { const r = Save.loadRun(); if (r) this.wipe(() => this.startRun(r)); break; }
      case 'discard': this.confirmBox('中断データを破棄', '中断したプレイを破棄しますか？', '破棄する', () => { Save.clearRun(); this.home(); }); break;
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
      case 'resetAll': this.confirmBox('最初からやり直す', 'すべてのセーブデータを消して最初からやり直しますか？<br><b class="warn">元に戻せません。</b>', '消してやり直す', () => { Save.reset(); this.cur = ''; this.home(); }); break;
      case 'confirmOk': { const fn = this._confirm; this._confirm = null; this.closeModal(); if (fn) fn(); break; }
      case 'confirmNo': this._confirm = null; if (Game.run && Game.run.paused) this.renderPause(); else this.closeModal(); break;
      // ラン中
      case 'pick': this.pickCard(+v, el); break;
      case 'rerollCards': this.rerollCards(); break;
      case 'banishMode': this.banishMode = !this.banishMode; this.renderLevelUp(false); break;
      case 'skipCard': this.closeModal(); break;
      case 'closeModal': this.closeModal(); break;
      case 'resume': this.togglePause(); break;
      case 'quit': this.confirmBox('あきらめる', 'このプレイを終了しますか？<br>ここまでの報酬は受け取れます。', 'あきらめる', () => { Game.run.paused = false; Game.finish(false); }); break;
      case 'suspend': Save.saveRun(Game.snapshot()); Save.write(); this.closeModal(); this.wipe(() => { Game.run = null; Sound.stopBgm(); this.home(); }); break;
      case 'toggleRun': sv.settings[v] = !sv.settings[v]; Save.write(); this.renderPause(); break;
      case 'resultOk': this.wipe(() => { this.closeModal(); Game.run = null; this.home(); }); break;
      case 'retry': this.wipe(() => { this.closeModal(); Game.run = null; this.startRun(); }); break;
    }
  },

  // ---------- 拠点 ----------
  home() {
    $('#hud').classList.add('hidden'); $('#game').classList.remove('dead');
    Sound.playMenuBgm();
    const sv = Save.data; const run = Save.loadRun();
    if (!sv.unlockedChars.includes(this.sel.char)) this.sel.char = 'lumina';
    const ch = D.CHARS.find(c => c.id === this.sel.char); const cs = sv.chars[ch.id];
    const facs = D.FACILITIES.map(f => {
      const built = sv.facilities[f.id]; const can = !built && sv.coins >= f.costs[0];
      return `<button class="fac ${built ? '' : 'locked'} ${can ? 'can' : ''}" data-act="facility" data-v="${f.id}">
        <span class="facic">${ic(built ? f.id : 'lock')}</span><span class="factx"><b>${f.name}</b><small>${built ? FAC_NOTE[f.id] : `建設 ${this.cost(f.costs[0])}`}</small></span></button>`;
    }).join('');
    this.show('home', `
      <div class="hub">
        <div class="hubtop">${sv.title ? `<span class="ptitle">${ic('trophy')}${esc(sv.title)}</span>` : '<span></span>'}${this.wallet()}
          <button class="iconbtn" data-act="settings" aria-label="設定">${ic('gear')}</button></div>
        <div class="hubmain">
          <div class="hero" style="--cc:${ch.color}">
            <div class="heroglow"></div>${this.portrait(ch, 'float')}
            <div class="nameplate"><small>${ch.title}</small><b>${ch.name}</b><i>Lv ${cs ? cs.lv : 1}</i></div>
          </div>
          <div class="hubside">
            <h1 class="logo"><span>星継ぎの</span>サバイバー</h1>
            ${run ? `<div class="resume"><button class="primary" data-act="continue">${ic('play')}中断したプレイを再開</button><button data-act="discard" class="ghost">破棄</button></div>` : ''}
            <button class="cta" data-act="prep"><span class="ctamain">出撃する</span><span class="ctasub">キャラクターとステージを選ぶ</span></button>
            <div class="sect">拠点</div>
            <div class="facs">${facs}</div>
            <p class="hint">移動だけで戦えます（WASD／矢印キー、スマホは画面をなぞる）。必殺技は Space か右下のボタン。</p>
          </div>
        </div>
      </div>`);
  },
  facility(id) {
    const sv = Save.data;
    if (!sv.facilities[id]) { this.buildConfirm(id); return; }
    ({ training: () => this.training(), library: () => this.records(), wardrobe: () => this.wardrobe(),
      forge: () => this.forge(), altar: () => this.altar(), gate: () => this.gate() })[id]();
  },
  buildConfirm(id) {
    const f = D.FACILITIES.find(x => x.id === id); const sv = Save.data; const ok = sv.coins >= f.costs[0];
    this.show('build', `${this.header(f.name)}<div class="box buildbox"><span class="facic big">${ic(id)}</span><p>${f.desc}</p>
      <p class="buildcost">建設費用 ${this.cost(f.costs[0])}</p>
      <button class="primary big" data-act="build" data-v="${id}" ${ok ? '' : 'disabled'}>${ok ? '建設する' : 'コインが足りません'}</button></div>`);
  },
  build(id) {
    const f = D.FACILITIES.find(x => x.id === id); const sv = Save.data;
    if (sv.coins < f.costs[0]) return;
    sv.coins -= f.costs[0]; sv.facilities[id] = 1; Save.write();
    Sound.sfx('buy'); this.toast(`${f.name}を建てた！`); this.facility(id);
  },

  // ---------- 出撃準備 ----------
  prep() {
    const sv = Save.data; const s = this.sel;
    if (!sv.unlockedChars.includes(s.char)) s.char = 'lumina';
    if (s.support && (!sv.unlockedChars.includes(s.support) || s.support === s.char)) s.support = null;
    let st = D.STAGES.find(x => x.id === s.stage);
    if (!st || !this.stageUnlocked(st)) { s.stage = 'forest'; st = D.STAGES[0]; }
    const chars = D.CHARS.map(c => {
      const un = sv.unlockedChars.includes(c.id); const cs = sv.chars[c.id];
      if (!un) {
        const ach = D.ACHIEVEMENTS.find(a => a.reward.char === c.id);
        return `<div class="ccard locked"><span class="cimg ph">${ic('lock')}</span><b>？？？</b><small>${ach ? '実績「' + ach.name + '」' : ''}</small></div>`;
      }
      return `<button class="ccard ${s.char === c.id ? 'on' : ''}" data-act="selChar" data-v="${c.id}" style="--cc:${c.color}">${this.charImg(c)}<b>${c.name}</b><small>Lv ${cs ? cs.lv : 1}</small></button>`;
    }).join('');
    const ch = D.CHARS.find(c => c.id === s.char); const w = D.WEAPONS[ch.weapon];
    const sups = `<button class="sup ${s.support ? '' : 'on'}" data-act="selSup" data-v="">なし</button>` + sv.unlockedChars.filter(id => id !== s.char).map(id => {
      const c = D.CHARS.find(x => x.id === id);
      return `<button class="sup ${s.support === id ? 'on' : ''}" data-act="selSup" data-v="${id}" style="--cc:${c.color}">${this.charImg(c, 'simg')}${c.name}</button>`;
    }).join('');
    const stages = D.STAGES.map(x => {
      if (!this.stageUnlocked(x)) return `<div class="scard locked">${ic('lock')}<span><b>？？？</b><small>${this.unlockText(x)}</small></span></div>`;
      const best = sv.stats.best[`${x.id}${s.hard ? '_hard' : ''}_${s.char}`];
      let info = x.special === 'abyss' ? `最高 ${sv.stats.abyssBest}階` : x.special === 'bossrush' ? 'ボスと連戦' : x.special === 'throne' ? '裏ボスを倒せ' : `${Math.floor(x.time / 60)}分生き残る`;
      if (x.special === 'vault') info = '5分・コイン大量';
      return `<button class="scard ${s.stage === x.id ? 'on' : ''}" data-act="selStage" data-v="${x.id}" style="--c:${x.color}">
        <span class="smarks">${sv.stats.cleared[x.id] ? `<i class="clr">${ic('check')}</i>` : ''}${sv.stats.clearedHard[x.id] ? `<i class="hclr">${ic('star')}</i>` : ''}</span>
        <b>${x.name}</b><small>${info}${best ? ` ・ 最高Lv${best.level}` : ''}</small></button>`;
    }).join('');
    const hardOk = !st.special && sv.stats.cleared[st.id];
    if (!hardOk) s.hard = false;
    const sup = s.support ? D.CHARS.find(c => c.id === s.support) : null;
    const altar = sv.facilities.altar && (sv.curse || sv.challenge) ? `<span class="tagchip warn">呪い ${sv.curse}${sv.challenge ? ` ・ ${D.CHALLENGES.find(c => c.id === sv.challenge).name}` : ''}</span>` : '';
    this.show('prep', `${this.header('出撃準備')}
      <div class="prep">
        <div class="prepchar">
          <div class="detail" style="--cc:${ch.color}">
            <div class="dport">${this.portrait(ch)}</div>
            <div class="dinfo">
              <small>${ch.title}</small><div class="sect">${ch.name}</div>
              <div class="drow">${this.icon(w.icon, 'sword')}<span><b>${w.name}</b><small>${w.desc}</small></span></div>
              <div class="drow"><span class="ico emo sp">${ic('spark')}</span><span><b>必殺 ${ch.specialName}</b><small>${ch.specialText}</small></span></div>
              <div class="drow"><span class="ico emo ps">${ic('up')}</span><span><b>固有の力</b><small>${ch.passiveText}</small></span></div>
            </div>
          </div>
          <div class="sect">キャラクター</div><div class="ccards">${chars}</div>
          <div class="sect">サポート <small>後ろについて一緒に戦い、能力の半分を受け継ぎます</small></div><div class="sups">${sups}</div>
        </div>
        <div class="prepstage">
          <div class="sect">ステージ</div><div class="scards">${stages}</div>
          ${hardOk ? `<button data-act="hard" class="switch ${s.hard ? 'on' : ''}"><i></i><span><b>ハード版</b><small>敵が強くなり、報酬2倍</small></span></button>` : ''}
        </div>
      </div>
      <div class="gobar"><div class="gosum"><b>${ch.name}${sup ? ` ＋ ${sup.name}` : ''}</b><small>${st.name}${s.hard ? '（ハード）' : ''}</small>${altar}</div>
        <button class="cta small" data-act="go"><span class="ctamain">出撃！</span></button></div>`);
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
    if (resume) Save.clearRun(); else Save.write();
    Game.start(opts);
    this.hideScreen();
    $('#game').classList.remove('dead'); $('#banner').innerHTML = '';
    $('#hud').classList.remove('hidden');
    $('#speedBtn').textContent = 'x1'; $('#speedBtn').classList.remove('on');
    const R = Game.run; const st = R.stage;
    const face = this.charSrc(R.char); $('#specialFace').innerHTML = face ? `<img src="${face}" alt="">` : '';
    this._wsig = ''; this._h = {}; this.hud();
    Render.fit();
    const goal = st.special === 'abyss' ? 'どこまで潜れるか' : st.special === 'bossrush' ? 'ボスをすべて倒せ' : st.special === 'throne' ? '裏ボスを倒せ' : `${Math.floor(st.time / 60)}分間 生き残れ`;
    setTimeout(() => this.banner('stage', st.name + (R.hard ? ' ★' : ''), resume ? 'つづきから' : goal), 350);
  },

  // ---------- HUD ----------
  hud() {
    const R = Game.run; if (!R) return;
    const p = R.player; const h = this._h || (this._h = {});
    $('#xpfill').style.width = (p.xp / D.xpNeed(p.level) * 100).toFixed(1) + '%';
    if (h.lv !== p.level) { $('#lvtext').textContent = `Lv ${p.level}`; if (h.lv) this.bump($('#lvtext')); h.lv = p.level; }
    if (R.xpPulse) { R.xpPulse = false; this.bump($('#xpbar')); }
    const st = R.stage;
    const tm = st.time ? fmtTime(st.time - R.t) : fmtTime(R.t);
    if (h.tm !== tm) { h.tm = tm; $('#timer').textContent = tm; $('#timer').classList.toggle('hot', !!st.time && st.time - R.t <= 30); }
    if (h.kills !== R.kills) { h.kills = R.kills; $('#kills').textContent = fmtNum(R.kills); this.bump($('#killsChip')); }
    if (h.gold !== R.gold) { h.gold = R.gold; $('#gold').textContent = fmtNum(R.gold); this.bump($('#goldChip')); }
    const ft = st.special === 'abyss' ? `深淵 ${R.floor}階` : R.hard ? '★ HARD' : '';
    if (h.ft !== ft) { h.ft = ft; $('#floorText').textContent = ft; }
    // 必殺技ゲージ
    const sb = $('#specialBtn'); const sp = Math.floor(R.special);
    if (h.sp !== sp) {
      sb.style.setProperty('--p', sp);
      const ready = sp >= 100;
      if (ready && !h.ready) { Sound.sfx('ready'); this.bump(sb); }
      h.ready = ready; h.sp = sp; sb.classList.toggle('ready', ready);
      $('#specialLabel').textContent = ready ? '必殺！' : sp + '%';
    }
    // ボスのHP
    const boss = R.bossIds.find(b => !b.dead); const bb = $('#bossbar');
    if (boss) {
      if (h.boss !== boss.id) { h.boss = boss.id; $('#bossname').textContent = boss.def.name; bb.classList.remove('hidden'); }
      const k = Math.max(0, boss.hp / boss.maxHp) * 100;
      $('#bossfill').style.width = k + '%'; $('#bosslag').style.width = k + '%';
    } else if (h.boss) { h.boss = 0; bb.classList.add('hidden'); }
    // 武器・パッシブ一覧（変化した時だけ作り直す）
    const sig = R.weapons.map(w => w.uid + ':' + w.level + (w.evo || '')).join(',') + '|' + JSON.stringify(R.passives);
    if (sig !== this._wsig) {
      this._wsig = sig;
      const mine = R.weapons.filter(w => w.owner === 'p');
      let ws = mine.map(w => `<div class="ws ${w.evo ? 'evo' : ''} ${w.rare ? 'rare' : ''}">${this.icon(w.icon, 'sword')}<i>${w.evo ? '★' : w.level}</i></div>`).join('');
      for (let i = mine.length; i < 6; i++) ws += '<div class="ws empty"></div>';
      const ids = Object.keys(R.passives);
      let ps = ids.map(id => `<div class="ws pas">${this.pasIcon(id)}<i>${R.passives[id]}</i></div>`).join('');
      for (let i = ids.length; i < 6; i++) ps += '<div class="ws pas empty"></div>';
      $('#wslots').innerHTML = `<div class="wrow">${ws}</div><div class="wrow">${ps}</div>`;
    }
  },

  togglePause() {
    const R = Game.run; if (!R || R.over) return;
    if (R.paused) { R.paused = false; this.closeModal(); return; }
    if (this.modalOpen()) return;
    R.paused = true;
    Save.saveRun(Game.snapshot()); Save.write();
    this.renderPause(true);
  },
  dmgRows(R, ws) {
    const max = Math.max(1, ...ws.map(w => R.dmgBy[w.uid] || 0));
    return ws.map(w => {
      const d = R.dmgBy[w.uid] || 0;
      return `<div class="drw">${this.icon(w.icon, 'sword')}<div class="drm"><div class="drt"><b>${w.name}</b>${w.owner === 's' ? '<span class="tagchip">サポート</span>' : ''}${w.rare ? '<span class="tagchip rare">レア</span>' : ''}
        <span class="lv ${w.evo ? 'evo' : ''}">${w.evo ? '★進化' : 'Lv ' + w.level}</span><em>${fmtNum(d)}</em></div><div class="dbar"><i style="width:${(d / max * 100).toFixed(1)}%"></i></div></div></div>`;
    }).join('');
  },
  renderPause(anim) {
    const R = Game.run; const st = Save.data.settings;
    const ps = Object.keys(R.passives).map(id => `<span class="pchip">${this.pasIcon(id, 'sm')}${D.PASSIVES[id].name}<b>Lv${R.passives[id]}</b></span>`).join('');
    const sw = (k, n) => `<button data-act="toggleRun" data-v="${k}" class="switch ${st[k] ? 'on' : ''}"><i></i><span><b>${n}</b></span></button>`;
    this.openModal(`<h2 class="mtitle">一時停止</h2>
      <div class="statline"><span>${ic('clock')}${fmtTime(R.t)}</span><span>Lv ${R.player.level}</span><span>${ic('skull')}${fmtNum(R.kills)}</span><span>${ic('coin')}${fmtNum(R.gold)}</span></div>
      <div class="drws">${this.dmgRows(R, R.weapons)}</div>
      <div class="pchips">${ps || '<span class="note">パッシブなし</span>'}</div>
      <p class="note center">合計ダメージ ${fmtNum(R.dmgTotal)} ・ 振り直し ${R.rerolls} ・ 封印 ${R.banishes}${R.player.revives ? ` ・ 復活 ${R.player.revives}` : ''}</p>
      <div class="switches">${sw('dmgNum', 'ダメージ数字')}${sw('shake', '揺れ・フラッシュ')}${sw('light', '軽量モード')}</div>
      <button class="primary big" data-act="resume">${ic('play')}再開する</button>
      <div class="row btnrow"><button data-act="suspend">中断して拠点へ</button><button data-act="quit" class="danger">あきらめる</button></div>`, anim ? 'pop' : '');
  },
  cycleSpeed() {
    const R = Game.run; if (!R) return;
    R.speed = R.speed === 1 ? 1.5 : R.speed === 1.5 ? 2 : 1;
    const b = $('#speedBtn'); b.textContent = 'x' + R.speed; b.classList.toggle('on', R.speed > 1); this.bump(b);
  },

  // ---------- レベルアップ ----------
  choiceLabel(c) {
    if (c.kind === 'wup') return `${c.w.name} Lv${c.w.level + 1 > D.WEAPON_MAX ? D.WEAPON_MAX : c.w.level}`;
    if (c.kind === 'wnew') return `${D.WEAPONS[c.id].name} 獲得`;
    if (c.kind === 'pup' || c.kind === 'pnew') return `${D.PASSIVES[c.id].name} Lv${Game.run.passives[c.id] || 1}`;
    if (c.kind === 'heal') return 'HP回復';
    return 'コイン +25';
  },
  choiceIcon(c) {
    if (c.kind === 'wup' || c.kind === 'wnew') return this.icon(D.WEAPONS[c.id].icon, 'sword');
    if (c.kind === 'pup' || c.kind === 'pnew') return this.pasIcon(c.id);
    return c.kind === 'heal' ? `<span class="ico emo heal">${ic('heal')}</span>` : ic('coin', 'ico');
  },
  pips(lv, max, next) { let s = ''; for (let i = 1; i <= max; i++) s += `<i class="${i <= lv ? 'on' : i === next ? 'next' : ''}"></i>`; return `<span class="pips">${s}</span>`; },
  cardHtml(c, i) {
    const R = Game.run;
    let name, lv = '', desc, tag, extra = '', kind = 'k-item', pips = '';
    if (c.kind === 'wup' || c.kind === 'wnew') {
      const d = D.WEAPONS[c.id]; name = d.name; kind = 'k-weapon'; tag = '武器';
      const el = D.ELEM[d.elem];
      extra = `<span class="lelem" style="--ec:${el.color}">${el.name}</span>`;
      if (c.kind === 'wnew') { lv = '<span class="new">NEW</span>'; desc = d.desc; pips = this.pips(0, D.WEAPON_MAX, 1); if (c.rare) extra += '<span class="rareTag">★レア 威力+30%</span>'; }
      else {
        lv = `Lv ${c.w.level} <em>▶</em> ${c.w.level + 1}`; pips = this.pips(c.w.level, D.WEAPON_MAX, c.w.level + 1);
        const delta = d.lv[c.w.level - 1];
        desc = Object.keys(delta).map(k => `${PARAM_NAMES[k] || k} <b class="up">${delta[k] > 0 ? '+' : ''}${k === 'cd' ? delta[k] + '秒' : delta[k]}</b>`).join('　');
        if (c.w.level + 1 === D.WEAPON_MAX) {
          const ev = D.EVOLUTIONS.find(e => e.from === c.id);
          extra += `<span class="evohint">${ic('spark')}最大Lv！「${D.PASSIVES[ev.passive].name}」があると宝箱で進化</span>`;
        }
      }
    } else if (c.kind === 'pup' || c.kind === 'pnew') {
      const d = D.PASSIVES[c.id]; name = d.name; kind = 'k-passive'; tag = 'パッシブ'; desc = d.desc;
      const cur = R.passives[c.id] || 0; const mx = d.max || D.PASSIVE_MAX;
      lv = c.kind === 'pnew' ? '<span class="new">NEW</span>' : `Lv ${cur} <em>▶</em> ${cur + 1}`; pips = this.pips(cur, mx, cur + 1);
      const ev = D.EVOLUTIONS.filter(e => e.passive === c.id).map(e => D.WEAPONS[e.from].name);
      if (ev.length) extra = `<span class="evohint">${ic('spark')}進化の鍵：${ev.slice(0, 3).join('・')}</span>`;
    } else if (c.kind === 'heal') { name = 'ケーキ'; tag = 'アイテム'; desc = 'HPを40回復'; }
    else { name = 'コイン袋'; tag = 'アイテム'; desc = 'コイン +25'; }
    return `<button class="lcard ${kind} ${this.banishMode ? 'banish' : ''} ${c.rare ? 'rare' : ''}" style="--i:${i}" data-act="pick" data-v="${i}">
      <span class="ltag">${tag}</span><kbd>${i + 1}</kbd>
      <span class="licon">${this.choiceIcon(c)}</span>
      <span class="lbody"><b class="lname">${name}</b><span class="llv">${lv}</span>${pips}<span class="ldesc">${desc}</span>${extra}</span></button>`;
  },
  showLevelUp() {
    const R = Game.run;
    this.banishMode = false;
    this.choices = Game.buildChoices(3 + Math.floor(R.stats.extraCard));
    this.renderLevelUp(true);
  },
  renderLevelUp(deal) {
    const R = Game.run;
    this.openModal(`<div class="lvhead"><div class="lvrays"></div><h2>LEVEL UP!</h2><span>Lv ${R.player.level}</span></div>
      <p class="lvsub ${this.banishMode ? 'warn' : ''}">${this.banishMode ? '封印するカードを選んでください（このプレイ中は二度と出ません）' : '強化を1つ選んでください'}</p>
      <div class="lcards n${this.choices.length} ${deal ? 'deal' : ''}">${this.choices.map((c, i) => this.cardHtml(c, i)).join('')}</div>
      <div class="row btnrow lvbtns">
        <button data-act="rerollCards" ${R.rerolls > 0 ? '' : 'disabled'}>${ic('reroll')}振り直し<b class="cnt">${R.rerolls}</b></button>
        <button data-act="banishMode" ${R.banishes > 0 ? '' : 'disabled'} class="${this.banishMode ? 'on' : ''}">${ic('ban')}封印<b class="cnt">${R.banishes}</b></button>
        <button data-act="skipCard">${ic('skip')}スキップ</button>
      </div>`, 'levelup' + (deal ? ' pop' : ''));
    // 配られている間は選べないようにして、誤タップを防ぐ
    this.lockUntil = deal ? performance.now() + 420 : 0;
    if (deal) this.choices.forEach((_, i) => this.later(() => Sound.sfx('deal'), 90 + i * 80));
    this.levelKeys = i => { const el = document.querySelectorAll('.lcard')[i]; if (el) this.pickCard(i, el); };
  },
  pickCard(i, el) {
    const R = Game.run; const c = this.choices[i]; if (!c || this.picking || performance.now() < this.lockUntil) return;
    if (this.banishMode) {
      if (c.kind === 'heal' || c.kind === 'gold') { Sound.sfx('deny'); return; }
      Sound.sfx('stamp');
      R.banished.push(c.id); R.banishes--; this.banishMode = false;
      this.choices.splice(i, 1);
      const more = Game.buildChoices(1).filter(x => !this.choices.some(y => y.kind === x.kind && y.id === x.id));
      this.choices.push(...more.slice(0, 1));
      this.renderLevelUp(false); return;
    }
    // 選んだカードが光って、ほかは引っ込む
    Sound.sfx('pick'); this.buzz(15);
    this.picking = true; this.levelKeys = null;
    document.querySelectorAll('.lcard').forEach(x => x.classList.add(x === el ? 'picked' : 'gone'));
    setTimeout(() => { this.picking = false; Game.applyChoice(c); this.closeModal(); }, 380);
  },
  rerollCards() {
    const R = Game.run; if (R.rerolls <= 0 || this.picking) return;
    R.rerolls--; this.choices = Game.buildChoices(this.choices.length); this.renderLevelUp(true);
  },

  showChest(results) {
    const closed = Assets.get('item_chest'), open = Assets.get('item_chest_open');
    this.openModal(`<div class="chest"><div class="rays"></div>${closed ? `<img id="chestImg" class="shake" src="${closed.src}" alt="">` : '<div id="chestImg" class="shake chestph"></div>'}</div>
      <div class="roulette" id="roul">？？？</div><div id="chestList" class="chestList"></div>
      <button class="primary big hidden" id="chestOk" data-act="closeModal">受け取る</button>`, 'chestp pop');
    Sound.sfx('chest');
    const pool = Object.values(D.WEAPONS).map(w => w.name).concat(Object.values(D.PASSIVES).map(p => p.name));
    const roul = $('#roul'); const list = $('#chestList'); let shown = 0, n = 0;
    this.later(() => {
      const im = $('#chestImg'); if (!im) return;
      im.classList.remove('shake'); im.classList.add('open'); if (open && im.tagName === 'IMG') im.src = open.src;
      $('.chest').classList.add('opened'); Sound.sfx('chestOpen'); this.buzz(40);
      const tick = setInterval(() => {
        if (!roul.isConnected) { clearInterval(tick); return; }
        roul.textContent = pool[Math.floor(Math.random() * pool.length)]; Sound.sfx('tick');
        if (++n % 7 === 0) {
          const r = results[shown++];
          list.insertAdjacentHTML('beforeend', `<div class="${r.evo ? 'evoText' : ''}">${r.evo ? ic('spark', 'ico') : r.icon || ''}<span>${esc(r.text)}</span></div>`);
          Sound.sfx(r.evo ? 'evolve' : 'coin');
          if (r.evo) { $('#modal .panel').classList.add('evoflash'); this.buzz(80); }
          if (shown >= results.length) { clearInterval(tick); roul.classList.add('done'); roul.textContent = results.some(x => x.evo) ? '進化！' : `${results.length - 1}つ強化`; $('#chestOk').classList.remove('hidden'); }
        }
      }, 60);
      this.timers.push(tick);
    }, 750);
  },

  // ---------- 終了の瞬間とリザルト ----------
  endMoment(win) {
    this.closeModal(); $('#banner').innerHTML = '';
    $('#hud').classList.add('hidden');
    if (!win) $('#game').classList.add('dead');
    this.banner(win ? 'clear' : 'over', win ? 'STAGE CLEAR' : 'GAME OVER', win ? 'ステージクリア！' : 'やられてしまった…');
  },
  showResult(r) {
    const R = Game.run; const st = R.stage;
    const ws = R.weapons.filter(w => R.dmgBy[w.uid]).sort((a, b) => (R.dmgBy[b.uid] || 0) - (R.dmgBy[a.uid] || 0));
    const eq = r.equips.map(it => `<div class="eq rv" style="--rc:${D.RARITY[it.rarity].color}"><b>${it.name}</b><small>${D.RARITY[it.rarity].name}</small></div>`).join('');
    const ach = r.newAch.map(a => `<div class="ach rv">${ic('trophy')}<span><b>${a.name}</b>${a.reward ? `<small>${a.reward}</small>` : ''}</span></div>`).join('');
    const tile = (label, val, n, fmt, rec) => `<div class="rv"><small>${label}</small><b ${n !== undefined ? `data-n="${n}" data-f="${fmt}"` : ''}>${val}</b>${rec ? '<span class="newrec">NEW RECORD</span>' : ''}</div>`;
    this.openModal(`<div class="result ${r.win ? 'win' : 'lose'}" style="--cc:${R.char.color}">
      <div class="rhead rv"><div class="rtitle">${r.win ? 'STAGE CLEAR' : 'GAME OVER'}</div><div class="rsub">${st.name}${R.hard ? '（ハード）' : ''} ・ ${R.char.name}</div></div>
      <div class="rbody">
        <div class="rport rv">${this.portrait(R.char)}</div>
        <div class="rmain">
          <div class="resgrid">
            ${tile('生存時間', fmtTime(R.t), Math.floor(R.t), 'time', r.rec.time || r.rec.fastest)}${tile('撃破数', '0', R.kills, 'num', r.rec.kills)}${tile('レベル', '0', R.player.level, 'int', r.rec.level)}
            ${tile('総ダメージ', '0', Math.floor(R.dmgTotal), 'num')}${st.special === 'abyss' ? tile('到達', R.floor + '階') : ''}
          </div>
          <div class="rcoin rv">${ic('coin')}<small>獲得コイン</small><b data-n="${r.coins}" data-f="plus">0</b></div>
          <div class="rxp rv"><div class="rxpt"><b>${R.char.name}</b><span id="rxpLv">Lv ${r.before.lv}</span><em>経験値 +${fmtNum(r.cxp)}</em></div>
            <div class="xpb"><i id="rxpFill" style="width:${(r.before.ratio * 100).toFixed(1)}%"></i></div></div>
          ${eq ? `<div class="sect rv">手に入れた装備 <small>鍛冶屋で装備できます</small></div><div class="eqs">${eq}</div>` : ''}
          ${ach ? `<div class="sect rv">実績達成</div><div class="achs">${ach}</div>` : ''}
          ${ws.length ? `<div class="sect rv">武器ごとのダメージ</div><div class="drws rv">${this.dmgRows(R, ws)}</div>` : ''}
        </div>
      </div>
      <div class="row btnrow rv rbtns"><button data-act="retry">${ic('reroll')}もう一度</button><button class="primary big" data-act="resultOk">${ic('home')}拠点へ</button></div>
    </div>`, 'resultp pop');
    this._res = r; this.revealing = true;
    const els = [...document.querySelectorAll('#modal .rv')];
    els.forEach((el, i) => this.later(() => this.revealOne(el), 250 + i * (i < 8 ? 190 : 110)));
    this.later(() => { this.revealing = false; }, 250 + els.length * 190 + 900);
  },
  fmtBy(f, v) { return f === 'time' ? fmtTime(v) : f === 'plus' ? '+' + fmtNum(v) : f === 'int' ? String(Math.floor(v)) : fmtNum(v); },
  revealOne(el, instant) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    const r = this._res;
    if (!instant) Sound.sfx(el.classList.contains('rhead') ? 'stamp' : el.classList.contains('ach') || el.classList.contains('eq') ? 'coin' : 'deal');
    el.querySelectorAll('[data-n]').forEach(b => {
      const to = +b.dataset.n, f = b.dataset.f;
      if (instant || to <= 0) { b.textContent = this.fmtBy(f, to); return; }
      const t0 = performance.now(), dur = 550;
      const step = () => {
        if (!b.isConnected) return;
        const k = Math.min(1, (performance.now() - t0) / dur);
        b.textContent = this.fmtBy(f, to * (1 - Math.pow(1 - k, 3)));
        if (k < 1 && this.revealing) { Sound.sfx('tick'); requestAnimationFrame(step); } else { b.textContent = this.fmtBy(f, to); b.classList.add('done'); }
      };
      step();
    });
    if (el.classList.contains('rxp')) {
      const fill = $('#rxpFill'), lv = $('#rxpLv');
      const end = () => { fill.style.width = (r.after.ratio * 100).toFixed(1) + '%'; lv.textContent = 'Lv ' + r.after.lv; if (r.lvUp) { lv.classList.add('up'); lv.textContent += ' UP!'; } };
      if (instant) { fill.style.transition = 'none'; end(); }
      else if (r.lvUp) { requestAnimationFrame(() => { fill.style.width = '100%'; }); this.later(() => { Sound.sfx('level'); fill.style.transition = 'none'; fill.style.width = '0%'; void fill.offsetWidth; fill.style.transition = ''; end(); }, 650); }
      else requestAnimationFrame(end);
    }
  },
  // タップで演出を飛ばして、結果をすぐ全部見せる
  finishReveal() {
    if (!this.revealing) return;
    this.revealing = false; this.clearTimers();
    document.querySelectorAll('#modal .rv').forEach(el => this.revealOne(el, true));
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
        <b>${n.name}</b><small>${statTxt}</small>${this.pips(l, n.max, 0)}${max ? '<em class="mx">MAX</em>' : `<em>${this.cost(cost(n))}</em>`}</button>`;
    }).join('');
    const first = this.cur !== 'training';
    this.show('training', `${this.header('訓練所')}
      <p class="note">取ったノードの隣が解放されます。コインはプレイで集まります。</p>
      <div class="treewrap"><div class="tree" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}">${lines}</svg>${ns}</div></div>`);
    if (first) { const tw = $('.treewrap'); tw.scrollLeft = (tw.scrollWidth - tw.clientWidth) / 2; }
  },
  buyNode(id) {
    const sv = Save.data; const n = D.TREE.find(x => x.id === id);
    const l = sv.tree[id] || 0; const c = Math.floor(n.cost * Math.pow(1.6, l));
    const ok = n.req.length === 0 || n.req.some(r => (sv.tree[r] || 0) > 0);
    if (!ok || l >= n.max) { Sound.sfx('deny'); return; }
    if (sv.coins < c) { Sound.sfx('deny'); this.toast('コインが足りません'); return; }
    sv.coins -= c; sv.tree[id] = l + 1; Save.write(); Sound.sfx('buy');
    const sc = $('.treewrap') ? $('.treewrap').scrollLeft : null;
    this.training();
    if (sc !== null) $('.treewrap').scrollLeft = sc;
    const nd = document.querySelector(`.tnode[data-v="${id}"]`); if (nd) this.bump(nd);
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
        return `<div class="dexi">${this.icon(w.icon, 'sword')}<b>${w.name}</b><small>${w.desc}<br>[${D.ELEM[w.elem].name}] ${st.weaponsSeen[k] ? '使用済み' : '未使用'}</small></div>`;
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
        const r = a.reward; const rt = r.coins ? this.cost(r.coins) : r.weapon ? `武器：${D.WEAPONS[r.weapon].name}` : r.char ? `キャラ：${D.CHARS.find(c => c.id === r.char).name}` : r.title ? `称号：${r.title}` : '';
        return `<div class="achrow ${sv.achievements[a.id] ? 'got' : ''}">${ic(sv.achievements[a.id] ? 'trophy' : 'lock')}<span><b>${a.name}</b><small>${a.desc} ／ 報酬 ${rt}</small></span></div>`;
      }).join('') + (sv.titles.length ? `<div class="sect">称号（タップで表示）</div><div class="row">${sv.titles.map(t => `<button data-act="title" data-v="${esc(t)}" class="${sv.title === t ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>` : '');
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
    this.show('records', `${this.header('記録室')}<div class="tabs">${tabs.map(([k, n]) => `<button data-act="tab" data-v="${k}" class="${this.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>${body}`);
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
        return `<button data-act="skin" data-c="${id}" data-v="${s.id}" class="${on ? 'on' : ''}">${s.name}<small>${own ? (on ? '着用中' : '着替える') : this.cost(s.cost)}${bonus ? ' ' + bonus : ''}</small></button>`;
      }).join('');
      const need = D.charXpNeed(cs.lv);
      return `<div class="box wr">${this.charImg(ch)}<div><b>${ch.name}</b> <small>Lv${cs.lv}${cs.lv < D.CHAR_LV_MAX ? `（次まで ${need - cs.xp}）` : ' MAX'}・攻撃/HP +${cs.lv - 1}%</small><div class="row">${skins}</div></div></div>`;
    }).join('');
    this.show('wardrobe', `${this.header('衣装室')}<p class="note">衣装は見た目が変わり、少しだけ能力も上がります。キャラLvはそのキャラで遊ぶと上がります。</p>${rows}`);
  },
  skin(cid, sid) {
    const sv = Save.data; const cs = sv.chars[cid]; const s = D.SKINS.find(x => x.id === sid);
    if (!cs.skins.includes(sid)) { if (sv.coins < s.cost) { Sound.sfx('deny'); this.toast('コインが足りません'); return; } sv.coins -= s.cost; cs.skins.push(sid); Sound.sfx('buy'); } else Sound.sfx('toggle');
    cs.skin = sid; Save.write(); this.wardrobe();
  },

  // ---------- 鍛冶屋 ----------
  itemHtml(it, actions) {
    const r = D.RARITY[it.rarity];
    const af = it.affixes.map((a, i) => `<li>${affixText({ stat: a.stat, value: a.value * (1 + (it.plus || 0) * 0.1) })}${actions && actions.reroll ? ` <button class="tiny" data-act="reroll1" data-v="${it.uid}" data-i="${i}">付け替え ${this.cost(200 * (it.rarity + 1))}</button>` : ''}</li>`).join('');
    const sp = it.special ? `<li class="sp">✦ ${D.SPECIALS.find(s => s.id === it.special).name}</li>` : '';
    return `<div class="item" style="--rc:${r.color}"><b>${it.name}${it.plus ? ' +' + it.plus : ''}</b> <small>${r.name}・${D.EQUIP_SLOTS.find(s => s.id === it.slot).name}</small><ul>${af}${sp}</ul>${actions ? actions.html : ''}</div>`;
  },
  forge() {
    const sv = Save.data;
    const eq = D.EQUIP_SLOTS.map(s => {
      const it = sv.equip[s.id];
      return `<div class="slotbox"><h4>${s.name}</h4>${it ? this.itemHtml(it, { reroll: true, html: `<div class="row"><button data-act="upgrade" data-v="${it.uid}">強化 ${this.cost(this.upCost(it), 'ore')}</button><button data-act="unequip" data-v="${s.id}">外す</button></div>` }) : '<p class="note">なし</p>'}</div>`;
    }).join('');
    const inv = sv.inventory.slice().sort((a, b) => b.rarity - a.rarity).map(it => this.itemHtml(it, { reroll: false,
      html: `<div class="row"><button data-act="equip" data-v="${it.uid}">装備</button><button data-act="upgrade" data-v="${it.uid}">強化 ${this.cost(this.upCost(it), 'ore')}</button><button data-act="salvage" data-v="${it.uid}" class="danger">分解 +${this.cost(this.salvageVal(it), 'ore')}</button></div>` })).join('');
    this.show('forge', `${this.header('鍛冶屋')}
      <p class="note">装備は強敵・ボスが落とします。強化で効果が上がり、装備中の効果は「付け替え」で別の効果に変えられます。</p>
      <div class="sect">装備中</div><div class="slots">${eq}</div>
      <div class="sect">持ち物（${sv.inventory.length}）</div>
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
    const c = this.upCost(f.it); if (sv.materials < c) { Sound.sfx('deny'); this.toast('素材が足りません。装備を分解すると手に入ります'); return; }
    if (f.it.plus >= 10) { Sound.sfx('deny'); this.toast('これ以上強化できません'); return; }
    sv.materials -= c; f.it.plus++; Save.write(); Sound.sfx('buy'); this.forge();
  },
  rerollAffix(uid, i) {
    const sv = Save.data; const f = this.findItem(uid); if (!f) return;
    const c = 200 * (f.it.rarity + 1); if (sv.coins < c) { Sound.sfx('deny'); this.toast('コインが足りません'); return; }
    sv.coins -= c; Sound.sfx('buy');
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
    sv.materials += m; Save.write(); this.toast(`素材 +${m}`); this.forge();
  },

  // ---------- 呪いの祭壇 ----------
  altar() {
    const sv = Save.data;
    const ch = D.CHALLENGES.map(c => `<button data-act="challenge" data-v="${c.id}" class="${sv.challenge === c.id ? 'on' : ''}">${c.name}<small>${c.desc}・クリア報酬 +${c.reward * 100}%</small></button>`).join('');
    this.show('altar', `${this.header('呪いの祭壇')}
      <div class="box center cursebox"><div class="cursenum"><small>呪い</small><b>${sv.curse}</b></div>
        <p>敵のHP +${sv.curse * 18}%・数 +${sv.curse * 10}%<br>獲得コイン +${sv.curse * 20}%</p>
        <div class="row"><button data-act="curse" data-v="-1">− 下げる</button><button data-act="curse" data-v="1">＋ 上げる</button><button data-act="curse" data-v="5">＋5</button></div>
        <p class="note">上限なし。最高クリア：${Math.max(0, sv.stats.bestCurse)}</p></div>
      <div class="sect">縛りプレイ（1つまで）</div><div class="row col">${ch}</div>`);
  },

  // ---------- 転生の門 ----------
  gate() {
    const sv = Save.data; const st = sv.stats;
    const ok = !!sv.achievements.allclear;
    const pts = 1 + Object.keys(st.clearedHard).length + Math.floor(Math.max(0, st.bestCurse) / 5);
    this.show('gate', `${this.header('転生の門')}
      <div class="box"><p>転生すると<b>スキルツリーとコインがリセット</b>されます。代わりに転生ポイントを得て、<br>1ポイントごとに「攻撃・HP・金運 +5%、経験値 +3%」がずっと付きます。</p>
      <p>キャラ・衣装・装備・実績・施設はそのままです。</p>
      <p>現在の転生ポイント：${sv.rebornPts}　今転生すると：<b>+${pts}</b></p>
      ${ok ? `<button class="danger" data-act="reborn">転生する</button>` : '<p class="warn">5つのステージをすべてクリアすると転生できます</p>'}</div>`);
  },
  reborn() {
    const sv = Save.data; const st = sv.stats;
    if (!sv.achievements.allclear) return;
    this.confirmBox('転生する', 'スキルツリーとコインがリセットされます。<br>転生しますか？', '転生する', () => {
      const pts = 1 + Object.keys(st.clearedHard).length + Math.floor(Math.max(0, st.bestCurse) / 5);
      sv.rebornPts += pts; sv.tree = {}; sv.coins = 0; st.reborn++;
      checkAchievements(); Save.write(); Sound.sfx('evolve'); this.toast(`転生！ ポイント +${pts}`); this.home();
    });
  },

  // ---------- 設定 ----------
settings() {
    const st = Save.data.settings;
    const tg = (k, n, d) => `<button data-act="toggle" data-v="${k}" class="switch ${st[k] ? 'on' : ''}"><i></i><span><b>${n}</b><small>${d}</small></span></button>`;
    const vol = (k, n) => `<div class="volrow"><b>${n}</b><button data-act="vol" data-v="${k}" data-d="-0.1" aria-label="下げる">−</button>
      <div class="volbar">${Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(st[k] * 10) ? 'on' : ''}"></i>`).join('')}</div>
      <button data-act="vol" data-v="${k}" data-d="0.1" aria-label="上げる">＋</button></div>`;
    this.show('settings', `${this.header('設定')}
      <div class="sect">サウンド</div><div class="box">${vol('bgm', 'BGM')}${vol('sfx', '効果音')}</div>
      <div class="sect">画面</div>
      <div class="switches col">${tg('dmgNum', 'ダメージ数字', '敵に与えたダメージを表示します')}${tg('shake', '揺れ・フラッシュ', '画面の揺れ、光、振動の演出')}${tg('light', '軽量モード', '演出と敵の数を減らして軽くします')}</div>
      <div class="sect">セーブデータ</div>
      <div class="box"><p class="note">機種変更やバックアップ用に、ファイルで書き出し・読み込みができます。</p>
      <div class="row"><button data-act="export">書き出す</button><button data-act="import">読み込む</button><button data-act="resetAll" class="danger">最初から</button></div>
      <input type="file" id="importFile" accept="application/json,.json" class="hidden"></div>
      <div class="sect">iPhoneで遊ぶには</div><p class="note">Safariでこのページを開き、共有ボタン →「ホーム画面に追加」。アプリのように全画面で起動できます。</p>`);
  },
  importSave() {
    const f = $('#importFile');
    f.onchange = () => {
      const file = f.files[0]; if (!file) return;
      file.text().then(t => { try { Save.importText(t); this.toast('読み込みました'); this.cur = ''; this.home(); } catch (e) { this.toast('読み込めませんでした：' + e.message); } });
    };
    f.click();
  },
};
