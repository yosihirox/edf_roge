// 画像の読み込み（無い画像は null のまま。描画側で図形にフォールバック）と効果音・BGM
'use strict';
const Assets = {
  img: {},
  tinted: {},
  load(onDone, onProgress) {
    const list = (window.ASSET_MANIFEST && window.ASSET_MANIFEST.assets) || [];
    let left = list.length; const total = left;
    if (!left) { onDone(); return; }
    const done = () => { if (onProgress) onProgress(1 - Math.max(0, left - 1) / total); if (--left === 0) onDone(); };
    for (const a of list) {
      const im = new Image();
      im.onload = () => { this.img[a.key] = im; done(); };
      im.onerror = () => done();
      im.src = `assets/img/${a.key}.png`;
    }
    // 読み込みが遅くても始められるように
    setTimeout(() => { if (left > 0) { left = 1; done(); } }, 4000);
  },
  get(key) { return this.img[key] || null; },
  // 色相をずらした画像（衣装・ゴールドスライムなど）をキャッシュして返す
  hued(key, hue) {
    const im = this.img[key];
    if (!im || !hue) return im || null;
    const ck = key + '_' + hue;
    if (this.tinted[ck]) return this.tinted[ck];
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const x = c.getContext('2d');
    x.filter = `hue-rotate(${hue}deg) saturate(1.2)`;
    x.drawImage(im, 0, 0);
    this.tinted[ck] = c;
    return c;
  },
};

// ---------- 音（WebAudio で合成。音声ファイル不要） ----------
const Sound = {
  ctx: null, master: null, bgmGain: null, bgmFilter: null, sfxGain: null, bgmTimer: null, bgm: null, last: {}, nbuf: null, gemStreak: 0, killStreak: 0, ducked: false,
  init() {
    if (this.ctx) return;
    try {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      // 音が重なっても割れないように、最後にコンプレッサーを通す
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18; comp.connect(c.destination);
      this.master = c.createGain(); this.master.connect(comp);
      this.bgmFilter = c.createBiquadFilter(); this.bgmFilter.type = 'lowpass'; this.bgmFilter.frequency.value = 16000; this.bgmFilter.connect(this.master);
      this.bgmGain = c.createGain(); this.bgmGain.connect(this.bgmFilter);
      this.sfxGain = c.createGain(); this.sfxGain.connect(this.master);
      const n = c.sampleRate; this.nbuf = c.createBuffer(1, n, n); const d = this.nbuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolume();
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  applyVolume() {
    if (!this.ctx) return;
    const st = Save.data.settings;
    this.bgmGain.gain.value = st.bgm * 0.3 * (this.ducked ? 0.55 : 1);
    this.sfxGain.gain.value = st.sfx * 0.5;
  },
  // メニューや一時停止の間は、BGMをこもらせて小さくする
  duck(on) {
    if (!this.ctx || this.ducked === on) { this.ducked = on; return; }
    this.ducked = on; const t = this.ctx.currentTime;
    this.bgmFilter.frequency.cancelScheduledValues(t); this.bgmFilter.frequency.setTargetAtTime(on ? 650 : 16000, t, on ? 0.08 : 0.25);
    this.bgmGain.gain.setTargetAtTime(Save.data.settings.bgm * 0.3 * (on ? 0.55 : 1), t, 0.1);
  },
  // at: 何秒後に鳴らすか。atk: 立ち上がりの長さ
  tone(freq, dur, type = 'square', vol = 0.3, slide = 0, dest, at = 0, atk = 0.004) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain); o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol = 0.3, o = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + (o.at || 0);
    const s = this.ctx.createBufferSource(); s.buffer = this.nbuf; s.loop = true;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let node = s;
    if (o.hp || o.lp) { const f = this.ctx.createBiquadFilter(); f.type = o.hp ? 'highpass' : 'lowpass'; f.frequency.setValueAtTime(o.hp || o.lp, t); if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur); node.connect(f); node = f; }
    node.connect(g); g.connect(o.dest || this.sfxGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  },
  seq(notes, step, dur, type, vol) { notes.forEach((f, i) => this.tone(f, dur, type, vol, 0, null, i * step)); },
  // 同じ音が連打されすぎないよう間引く
  sfx(name) {
    if (!this.ctx) return;
    const now = performance.now();
    const gap = { hit: 45, gem: 30, shoot: 70, kill: 40, tick: 28, coin: 40, deal: 30 }[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    const since = now - (this.last[name] || 0);
    this.last[name] = now;
    switch (name) {
      case 'hit': this.tone(200 + Math.random() * 90, 0.05, 'square', 0.06, 0.5); this.noise(0.03, 0.05, { hp: 2500 }); break;
      case 'kill': { // 連続で倒すほど音が上がっていく
        this.killStreak = since < 260 ? Math.min(14, this.killStreak + 1) : 0;
        this.tone(330 * Math.pow(2, this.killStreak / 12), 0.07, 'triangle', 0.09, 1.6); break;
      }
      case 'gem': {
        this.gemStreak = since < 320 ? Math.min(19, this.gemStreak + 1) : 0;
        const f = 784 * Math.pow(2, [0, 2, 4, 7, 9][this.gemStreak % 5] / 12 + Math.floor(this.gemStreak / 5) / 2.5);
        this.tone(f, 0.09, 'sine', 0.12, 1.02); this.tone(f * 2, 0.05, 'sine', 0.04); break;
      }
      case 'shoot': this.tone(620, 0.05, 'triangle', 0.05, 0.6); break;
      case 'level': this.seq([523, 659, 784, 1046, 1318], 0.06, 0.2, 'triangle', 0.16); this.tone(2093, 0.5, 'sine', 0.05, 1, null, 0.3); this.noise(0.5, 0.05, { hp: 5000, at: 0.05 }); break;
      case 'hurt': this.tone(150, 0.22, 'sawtooth', 0.2, 0.4); this.tone(70, 0.18, 'sine', 0.35, 0.5); this.noise(0.08, 0.15, { lp: 900 }); break;
      case 'boom': this.noise(0.4, 0.35, { lp: 1800, sweep: 200 }); this.tone(95, 0.32, 'sine', 0.35, 0.35); break;
      case 'bigboom': this.noise(0.9, 0.5, { lp: 2400, sweep: 120 }); this.tone(70, 0.7, 'sine', 0.5, 0.3); this.tone(140, 0.3, 'sawtooth', 0.15, 0.3); break;
      case 'chest': this.seq([392, 523, 659, 784, 1046, 1318], 0.085, 0.2, 'triangle', 0.16); break;
      case 'chestOpen': this.noise(0.25, 0.2, { hp: 1200 }); this.seq([784, 1046, 1318, 1568, 2093], 0.05, 0.35, 'sine', 0.12); break;
      case 'evolve': this.seq([523, 784, 1046, 1568], 0.11, 0.5, 'sawtooth', 0.09); this.seq([1046, 1568, 2093, 3136], 0.11, 0.5, 'sine', 0.07); this.noise(1.2, 0.08, { hp: 4000 }); break;
      case 'special': this.tone(180, 0.7, 'sawtooth', 0.18, 7); this.noise(0.6, 0.22, { hp: 600, sweep: 6000 }); this.tone(1568, 0.6, 'sine', 0.1, 1, null, 0.45); break;
      case 'coin': this.tone(1318, 0.07, 'square', 0.06); this.tone(1976, 0.12, 'square', 0.06, 0, null, 0.055); break;
      case 'heal': this.seq([659, 880, 1318], 0.07, 0.25, 'sine', 0.14); break;
      case 'click': this.tone(880, 0.045, 'triangle', 0.1, 1.25); break;
      case 'confirm': this.tone(660, 0.07, 'triangle', 0.12); this.tone(990, 0.12, 'triangle', 0.12, 0, null, 0.06); break;
      case 'back': this.tone(620, 0.06, 'triangle', 0.1, 0.7); break;
      case 'deny': this.tone(180, 0.09, 'square', 0.08); this.tone(150, 0.12, 'square', 0.08, 0, null, 0.09); break;
      case 'toggle': this.tone(1046, 0.04, 'sine', 0.12); break;
      case 'buy': this.tone(784, 0.07, 'triangle', 0.12); this.tone(1175, 0.09, 'triangle', 0.12, 0, null, 0.06); this.tone(1568, 0.25, 'sine', 0.1, 0, null, 0.12); break;
      case 'deal': this.noise(0.06, 0.12, { hp: 3000 }); this.tone(500, 0.04, 'triangle', 0.05, 1.5); break;
      case 'pick': this.tone(784, 0.08, 'triangle', 0.14); this.tone(1175, 0.1, 'triangle', 0.14, 0, null, 0.05); this.tone(1568, 0.3, 'sine', 0.12, 0, null, 0.1); this.noise(0.25, 0.04, { hp: 6000, at: 0.1 }); break;
      case 'tick': this.tone(1400 + Math.random() * 200, 0.03, 'square', 0.035); break;
      case 'stamp': this.noise(0.12, 0.3, { lp: 1200 }); this.tone(110, 0.2, 'sine', 0.4, 0.5); break;
      case 'warn': for (let i = 0; i < 3; i++) { this.tone(440, 0.22, 'sawtooth', 0.1, 1.5, null, i * 0.42); this.tone(220, 0.22, 'square', 0.06, 1.5, null, i * 0.42); } break;
      case 'alert': this.tone(740, 0.1, 'square', 0.08); this.tone(740, 0.14, 'square', 0.08, 0, null, 0.14); break;
      case 'start': this.noise(0.5, 0.18, { hp: 400, sweep: 5000 }); this.seq([392, 523, 784], 0.07, 0.25, 'triangle', 0.14); break;
      case 'ready': this.seq([1046, 1568, 2093], 0.05, 0.2, 'sine', 0.1); break;
      case 'clear': this.seq([523, 659, 784, 1046, 784, 1046, 1318], 0.12, 0.3, 'triangle', 0.15); this.seq([262, 330, 392, 523, 392, 523, 659], 0.12, 0.3, 'square', 0.05); this.tone(1568, 1.2, 'sine', 0.1, 1, null, 0.84); break;
      case 'over': this.seq([392, 349, 311, 262, 196], 0.22, 0.5, 'triangle', 0.16); this.tone(98, 1.4, 'sine', 0.2, 0.7, null, 0.9); break;
    }
  },
  // ---------- BGM ----------
  // ステージごとに音階・テンポ・旋律が決まる（毎回同じ曲になるよう、乱数は固定の種から作る）。
  // boss=true で速く重く。cfg.calm は拠点用の静かな曲。
  playBgm(cfg, boss = false) {
    this.stopBgm();
    if (!this.ctx || !cfg) return;
    let seed = (cfg.root * 131 + cfg.tempo * 7 + (boss ? 99 : 0)) % 2147483647 || 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const phrase = () => { const a = []; let p = 2 + Math.floor(rnd() * 3); for (let i = 0; i < 16; i++) { p = Math.max(0, Math.min(9, p + Math.floor(rnd() * 5) - 2)); a.push(rnd() < (cfg.calm ? 0.55 : 0.28) ? null : p); } a[0] = a[0] === null ? 2 : a[0]; return a; };
    const A = phrase(), B = phrase(); const A2 = A.slice(); for (let i = 12; i < 16; i++) A2[i] = B[i];
    const tempo = boss ? cfg.tempo * 1.2 : cfg.tempo;
    this.bgm = { cfg, boss, d: 60 / tempo / 4, step: 0, next: this.ctx.currentTime + 0.08, mel: [].concat(A, A2, B, A), prog: cfg.calm ? [0, 3, 1, 4] : boss ? [0, 0, 3, 4] : [0, 3, 4, 2], root: boss ? cfg.root - 2 : cfg.root };
    this.bgmTimer = setInterval(() => {
      const b = this.bgm; if (!b || !this.ctx) return;
      if (b.next < this.ctx.currentTime - 0.5) b.next = this.ctx.currentTime + 0.05; // 画面を離れていた分は飛ばす
      while (b.next < this.ctx.currentTime + 0.25) { this.bgmStep(b, b.step++, b.next - this.ctx.currentTime); b.next += b.d; }
    }, 70);
  },
  playMenuBgm() { if (this.bgm && this.bgm.cfg.calm) return; this.playBgm({ root: 60, scale: [0, 2, 4, 7, 9], tempo: 78, calm: true }); },
  bgmStep(b, s, at) {
    const sc = b.cfg.scale, n = sc.length, G = this.bgmGain, d = b.d;
    const midi = deg => b.root + Math.floor(deg / n) * 12 + sc[((deg % n) + n) % n];
    const f = m => 440 * Math.pow(2, (m - 69) / 12);
    const bar = Math.floor(s / 16), st = s % 16, ch = b.prog[bar % b.prog.length], calm = b.cfg.calm;
    if (st === 0) for (const k of [0, 2, 4]) this.tone(f(midi(ch + k)), d * 15.5, 'sine', 0.045, 0, G, at, d * 2);
    if (calm) {
      if (st % 4 === 0) this.tone(f(midi(ch + [0, 2, 4, 2][st / 4]) + 12), d * 6, 'triangle', 0.07, 0, G, at, 0.02);
      if (st === 0) this.tone(f(midi(ch) - 24), d * 14, 'sine', 0.2, 0, G, at, 0.05);
      const m = b.mel[Math.floor(s / 4) % b.mel.length];
      if (st % 4 === 2 && m !== null && bar % 2) this.tone(f(midi(m) + 24), d * 5, 'sine', 0.05, 0, G, at, 0.02);
      return;
    }
    if (st === 0 || st === 6 || st === 8 || st === 14 || (b.boss && st % 2 === 0)) this.tone(f(midi(ch) - 24), d * (b.boss ? 1.6 : 3), 'triangle', 0.26, 0, G, at);
    if (st % 2 === 0) this.tone(f(midi(ch + [0, 2, 4, 2, 4, 2, 0, 2][st / 2]) + 12), d * 1.6, 'triangle', 0.05, 0, G, at);
    const m = b.mel[Math.floor(s / 2) % b.mel.length];
    if (st % 2 === 0 && m !== null) this.tone(f(midi(m) + 12), d * 1.8, b.boss ? 'sawtooth' : 'square', b.boss ? 0.045 : 0.05, 0, G, at, 0.01);
    if (st % 8 === 0 || (b.boss && st % 4 === 0)) this.tone(120, 0.14, 'sine', 0.4, 0.3, G, at);
    if (st % 8 === 4) this.noise(0.1, 0.1, { hp: 1800, at, dest: G });
    if (st % 4 === 2) this.noise(0.035, 0.05, { hp: 7000, at, dest: G });
  },
  stopBgm() { if (this.bgmTimer) clearInterval(this.bgmTimer); this.bgmTimer = null; this.bgm = null; },
};
