// =============================================================
//  UI (HTML オーバーレイ) と入力
// =============================================================
class UI {
  constructor(game) {
    this.g = game;
    game.ui = this;
    this.modalOpen = false;
    this.shakeAmt = 0;
    this.$ = id => document.getElementById(id);
    this.mapIndex = 0;
    this.diffIndex = 1;
    this.buildTitle();
    this.buildBar();
    this.bindInput();
  }

  // ---------- タイトル ----------
  buildTitle() {
    const maps = this.$('mapSelect'), diffs = this.$('diffSelect');
    MAPS.forEach((m, i) => {
      const b = document.createElement('button');
      b.textContent = m.name;
      b.onclick = () => { this.mapIndex = i; this.refreshTitle(); };
      maps.appendChild(b);
    });
    DIFFICULTIES.forEach((d, i) => {
      const b = document.createElement('button');
      b.textContent = d.name;
      b.onclick = () => { this.diffIndex = i; this.refreshTitle(); };
      diffs.appendChild(b);
    });
    this.$('startBtn').onclick = () => {
      this.$('title').classList.add('hidden');
      this.$('result').classList.add('hidden');
      this.g.newRun(this.mapIndex, this.diffIndex);
    };
    this.$('resetSave').onclick = () => {
      if (confirm('アーマーと記録をリセットしますか？')) { this.g.save = { armor: 0, best: {}, clears: {} }; writeSave(this.g.save); this.refreshTitle(); }
    };
    this.refreshTitle();
  }
  refreshTitle() {
    [...this.$('mapSelect').children].forEach((b, i) => b.classList.toggle('on', i === this.mapIndex));
    [...this.$('diffSelect').children].forEach((b, i) => b.classList.toggle('on', i === this.diffIndex));
    const s = this.g.save;
    const bonus = Math.min(100, s.armor * 0.4).toFixed(1);
    const rec = DIFFICULTIES.map(d => `${d.name}: 最高 W${s.best[d.key] || 0}${s.clears[d.key] ? ` / クリア${s.clears[d.key]}回` : ''}`).join('<br>');
    this.$('metaInfo').innerHTML = `回収アーマー: <b>${s.armor}</b>（全隊員の耐久 +${bonus}%）<br>${rec}`;
  }

  // ---------- 下部の配置バー ----------
  buildBar() {
    const bar = this.$('deployBar');
    CLASS_KEYS.forEach((k, i) => {
      const c = CLASSES[k];
      const b = document.createElement('button');
      b.className = 'deploy';
      b.dataset.cls = k;
      b.style.borderColor = c.color;
      b.innerHTML = `<span class="key">${i + 1}</span><span class="cname" style="color:${c.color}">${c.name}</span><span class="wname"></span><span class="cost"></span>`;
      b.onclick = () => this.selectPlacing(k);
      b.title = c.desc;
      bar.appendChild(b);
    });
    this.$('waveBtn').onclick = () => this.g.startWave();
    this.$('pauseBtn').onclick = () => { this.g.paused = !this.g.paused; };
    this.$('speedBtn').onclick = () => { this.g.speed = this.g.speed === 1 ? 2 : this.g.speed === 2 ? 3 : 1; };
    this.$('sellBtn').onclick = () => { if (this.g.selected) this.g.sellUnit(this.g.selected); };
    this.$('toTitle').onclick = () => this.backToTitle();
    this.$('continueBtn').onclick = () => { this.$('result').classList.add('hidden'); this.g.continueEndless(); };
    this.$('quitBtn').onclick = () => {
      if (confirm('作戦を中断してタイトルに戻りますか？（回収したアーマーは持ち帰れます）')) { this.g.commitMeta(); this.backToTitle(); }
    };
  }
  backToTitle() {
    this.g.state = 'title';
    this.$('result').classList.add('hidden');
    this.$('cards').classList.add('hidden');
    this.modalOpen = false;
    this.$('title').classList.remove('hidden');
    this.refreshTitle();
  }

  selectPlacing(k) {
    if (this.g.state !== 'play') return;
    this.g.placing = this.g.placing === k ? null : k;
    this.g.selected = null;
  }

  // ---------- 入力 ----------
  bindInput() {
    const cv = this.g.canvas;
    const toTile = ev => {
      const r = cv.getBoundingClientRect();
      const x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
      return { x, y, c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
    };
    cv.addEventListener('mousemove', ev => { this.g.hover = toTile(ev); });
    cv.addEventListener('mouseleave', () => { this.g.hover = null; });
    cv.addEventListener('click', ev => {
      const g = this.g;
      if (g.state !== 'play' || this.modalOpen) return;
      const t = toTile(ev);
      g.hover = t;
      const u = g.units.find(u => u.c === t.c && u.r === t.r);
      if (u) { g.selected = u; g.placing = null; return; }
      if (g.placing) {
        if (g.placeUnit(g.placing, t.c, t.r)) {
          if (!ev.shiftKey && g.sp < g.deployCost(g.placing)) g.placing = null;
        }
        return;
      }
      g.selected = null;
    });
    cv.addEventListener('contextmenu', ev => { ev.preventDefault(); this.g.placing = null; this.g.selected = null; });
    window.addEventListener('keydown', ev => {
      const g = this.g;
      if (g.state !== 'play') return;
      if (this.modalOpen) {
        const n = parseInt(ev.key, 10);
        if (n >= 1 && n <= 3) { const el = this.$('cardList').children[n - 1]; if (el) el.click(); }
        return;
      }
      if (ev.key >= '1' && ev.key <= '4') this.selectPlacing(CLASS_KEYS[+ev.key - 1]);
      else if (ev.key === ' ') { ev.preventDefault(); g.startWave(); }
      else if (ev.key === 'p' || ev.key === 'P') g.paused = !g.paused;
      else if (ev.key === 'f' || ev.key === 'F') this.$('speedBtn').click();
      else if (ev.key === 'Escape') { g.placing = null; g.selected = null; }
      else if ((ev.key === 'Delete' || ev.key === 's' || ev.key === 'S') && g.selected) g.sellUnit(g.selected);
    });
  }

  // ---------- 毎フレーム更新 ----------
  update(dt) {
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
    const g = this.g;
    if (g.state === 'title') return;
    this.$('wave').textContent = `${g.wave}${g.endless ? '' : ' / ' + FINAL_WAVE}`;
    this.$('baseHp').textContent = `${Math.max(0, Math.ceil(g.baseHp))} / ${g.baseMax}`;
    this.$('sp').textContent = g.sp;
    this.$('level').textContent = g.level;
    this.$('xpFill').style.width = (100 * g.xp / g.xpNeed()) + '%';
    this.$('armor').textContent = g.armorGained;
    this.$('diffName').textContent = `${g.diff.name} / ${MAPS[g.mapIndex].name}`;
    this.$('enemyCount').textContent = g.enemies.length + g.spawnQueue.length;
    const wb = this.$('waveBtn');
    wb.disabled = g.waveActive;
    wb.textContent = g.waveActive ? '交戦中…' : `▶ ウェーブ ${g.wave + 1} 開始`;
    this.$('pauseBtn').textContent = g.paused ? '▶ 再開' : 'Ⅱ 一時停止';
    this.$('speedBtn').textContent = `速度 x${g.speed}`;
    [...this.$('deployBar').children].forEach(b => {
      const k = b.dataset.cls;
      const cost = g.deployCost(k);
      b.querySelector('.cost').textContent = `${cost} SP`;
      b.querySelector('.wname').textContent = WEAPONS[g.weapons[k]].name;
      b.classList.toggle('on', g.placing === k);
      b.classList.toggle('poor', g.sp < cost);
    });
    // 選択ユニット
    const s = g.selected;
    const info = this.$('unitInfo');
    if (s && g.units.includes(s)) {
      info.classList.remove('hidden');
      const w = g.weaponOf(s);
      const dmg = g.unitDmg(s, w), iv = g.unitInterval(s, w);
      const mult = (w.pellets || 1) * (w.shots || 1) * (w.type === 'strike' ? w.hits : 1);
      this.$('unitText').innerHTML =
        `<b style="color:${CLASSES[s.cls].color}">${CLASSES[s.cls].name}</b> 耐久 ${Math.ceil(s.hp)}/${Math.ceil(s.maxHp)}<br>` +
        `${w.cat}: <b>${w.name}</b><br>威力 ${dmg.toFixed(0)}${mult > 1 ? '×' + mult : ''} / 間隔 ${iv.toFixed(2)}秒 / 射程 ${g.unitRange(s).toFixed(0)}`;
      this.$('sellBtn').textContent = `回収 (+${Math.round(s.paid * 0.6)}SP)`;
    } else {
      info.classList.add('hidden');
    }
  }

  // ---------- カード ----------
  showCards(title, cards, onPick) {
    this.modalOpen = true;
    this.$('cardTitle').textContent = title;
    const list = this.$('cardList');
    list.innerHTML = '';
    cards.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'card r' + c.rarity;
      const cls = c.cls ? CLASSES[c.cls] : null;
      const kindLabel = { weapon: '武器', mod: '強化', gear: '補助装備', supply: '補給' }[c.kind];
      let stats = '';
      if (c.kind === 'weapon') {
        const w = WEAPONS[c.weapon];
        const mult = (w.pellets || 1) * (w.shots || 1) * (w.type === 'strike' ? w.hits : 1);
        const cur = WEAPONS[this.g.weapons[c.cls]];
        stats = `<div class="stats">威力 ${w.dmg}${mult > 1 ? '×' + mult : ''} / 間隔 ${w.rate}s / 射程 ${w.range}${w.pierce ? ' / 貫通' : ''}${w.splash ? ' / 爆発' : ''}${w.air ? ' / 対空' : ''}</div><div class="cur">現在: ${cur.name}</div>`;
      }
      el.innerHTML =
        `<div class="ckey">${i + 1}</div>` +
        `<div class="rar" style="color:${RARITY[c.rarity].color}">${RARITY[c.rarity].name}・${kindLabel}</div>` +
        `<div class="cls" style="background:${cls ? cls.color : '#546e7a'}">${cls ? cls.name : '全兵科'}</div>` +
        `<div class="icon">${this.cardIcon(c)}</div>` +
        `<div class="cname">${c.name}</div>` +
        `<div class="cdesc">${c.desc}</div>${stats}`;
      el.onclick = () => {
        this.$('cards').classList.add('hidden');
        this.modalOpen = false;
        onPick(c);
      };
      list.appendChild(el);
    });
    this.$('cards').classList.remove('hidden');
  }

  cardIcon(c) {
    const key = c.kind === 'weapon' ? 'card_' + c.weapon : 'card_' + c.id;
    if (IMG[key]) return `<img src="${IMG[key].src}">`;
    const icons = { weapon: '🔫', mod: '⬆', gear: '🛡', supply: '📦' };
    if (c.kind === 'weapon') {
      const w = WEAPONS[c.weapon];
      return { hitscan: '🔫', cone: '⚡', line: '➶', rocket: '🚀', chain: '⚡', strike: '✈', drone: '🛸' }[w.type];
    }
    return icons[c.kind];
  }

  // ---------- 結果 ----------
  showResult(win, armor) {
    const g = this.g;
    this.$('resultTitle').textContent = win ? '作戦成功' : '作戦失敗';
    this.$('resultTitle').className = win ? 'win' : 'lose';
    const hist = g.history.map(c => c.name).join('、');
    this.$('resultText').innerHTML =
      `到達ウェーブ: <b>${g.wave}</b> / 撃破数: <b>${g.kills}</b> / レベル: <b>${g.level}</b><br>` +
      `持ち帰ったアーマー: <b>+${armor}</b>（累計 ${g.save.armor}）<br><small>取得装備: ${hist || 'なし'}</small>`;
    this.$('continueBtn').classList.toggle('hidden', !win);
    this.$('result').classList.remove('hidden');
  }

  radio(text, urgent) {
    const el = this.$('radio');
    el.textContent = '📻 ' + text;
    el.classList.toggle('urgent', !!urgent);
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
  shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); }
}
