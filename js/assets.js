// 画像の読み込み（無い画像は null のまま。描画側で図形にフォールバック）と効果音・BGM
'use strict';
const Assets = {
  img: {},
  tinted: {},
  load(onDone) {
    const list = (window.ASSET_MANIFEST && window.ASSET_MANIFEST.assets) || [];
    let left = list.length;
    if (!left) { onDone(); return; }
    const done = () => { if (--left === 0) onDone(); };
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
  ctx: null, master: null, bgmGain: null, sfxGain: null, bgmTimer: null, step: 0, last: {},
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain(); this.bgmGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.applyVolume();
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  applyVolume() {
    if (!this.ctx) return;
    const st = Save.data.settings;
    this.bgmGain.gain.value = st.bgm * 0.25;
    this.sfxGain.gain.value = st.sfx * 0.5;
  },
  tone(freq, dur, type = 'square', vol = 0.3, slide = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); const g = this.ctx.createGain();
    g.gain.value = vol; s.buffer = buf; s.connect(g); g.connect(this.sfxGain); s.start();
  },
  // 同じ音が連打されすぎないよう間引く
  sfx(name) {
    if (!this.ctx) return;
    const now = performance.now();
    const gap = { hit: 45, gem: 35, shoot: 70 }[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'hit': this.tone(220 + Math.random() * 80, 0.05, 'square', 0.08, 0.5); break;
      case 'gem': this.tone(880 + Math.random() * 200, 0.06, 'sine', 0.12, 1.5); break;
      case 'shoot': this.tone(600, 0.05, 'triangle', 0.06, 0.6); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.15, 'square', 0.15), i * 70)); break;
      case 'hurt': this.tone(160, 0.2, 'sawtooth', 0.2, 0.4); break;
      case 'boom': this.noise(0.35, 0.35); this.tone(90, 0.3, 'sine', 0.3, 0.4); break;
      case 'chest': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.18), i * 90)); break;
      case 'evolve': [523, 784, 1046, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.12), i * 120)); break;
      case 'special': this.tone(200, 0.6, 'sawtooth', 0.2, 6); this.noise(0.5, 0.2); break;
      case 'coin': this.tone(1318, 0.08, 'square', 0.08); setTimeout(() => this.tone(1760, 0.1, 'square', 0.08), 60); break;
      case 'click': this.tone(700, 0.04, 'triangle', 0.1); break;
      case 'clear': [523, 659, 784, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'square', 0.15), i * 140)); break;
      case 'over': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.18), i * 200)); break;
    }
  },
  // ステージごとの簡単なBGM（音階とテンポを変える）。ボス戦は boss=true で別パターン
  playBgm(cfg, boss = false) {
    this.stopBgm();
    if (!this.ctx || !cfg) return;
    const beat = 60 / (boss ? cfg.tempo * 1.25 : cfg.tempo) / 2;
    this.step = 0;
    const scale = cfg.scale; const root = boss ? cfg.root - 2 : cfg.root;
    const mel = []; let p = 0;
    for (let i = 0; i < 32; i++) { p = Math.max(-2, Math.min(scale.length + 3, p + Math.floor(Math.random() * 5) - 2)); mel.push(Math.random() < 0.2 ? null : p); }
    const midi = (deg) => { const o = Math.floor(deg / scale.length); const d = ((deg % scale.length) + scale.length) % scale.length; return root + o * 12 + scale[d]; };
    const f = m => 440 * Math.pow(2, (m - 69) / 12);
    this.bgmTimer = setInterval(() => {
      const s = this.step++;
      if (s % 4 === 0) this.tone(f(midi(0) - 24 + (Math.floor(s / 16) % 2 ? scale[3] || 5 : 0)), beat * 3.5, 'triangle', 0.25, 0, this.bgmGain);
      if (boss && s % 2 === 0) this.tone(60, 0.08, 'sine', 0.3, 0.5, this.bgmGain);
      const m = mel[s % mel.length];
      if (m !== null) this.tone(f(midi(m) + 12), beat * 0.9, boss ? 'sawtooth' : 'square', 0.07, 0, this.bgmGain);
    }, beat * 1000);
  },
  stopBgm() { if (this.bgmTimer) clearInterval(this.bgmTimer); this.bgmTimer = null; },
};
