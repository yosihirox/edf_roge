// 起動とメインループ
'use strict';
(function () {
  Save.load();
  const canvas = document.getElementById('game');
  Render.init(canvas);
  Input.init(canvas);
  UI.init();
  Assets.load(() => { if (!Game.run) UI.home(); });

  let last = performance.now(); let hudT = 0;
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    const R = Game.run;
    if (R && !R.over && !R.paused && !UI.modalOpen()) {
      // 倍速時は細かく分けて更新（すり抜け防止）
      const steps = R.speed > 1 ? 2 : 1;
      for (let i = 0; i < steps; i++) Game.update(dt * R.speed / steps);
    }
    if (R) {
      Render.draw();
      hudT -= dt; if (hudT <= 0) { hudT = 0.1; UI.hud(); }
    } else {
      const c = Render.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#14101f'; c.fillRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // オートセーブ（拠点の状態）
  setInterval(() => { if (!Game.run) Save.write(); }, 15000);
  // PWA（オフラインでも起動できるように）
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
