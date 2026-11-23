// 起動とメインループ
'use strict';
(function () {
  Save.load();
  const canvas = document.getElementById('game');
  Render.init(canvas);
  Input.init(canvas);
  UI.init();
  Assets.load(() => UI.bootReady(), k => UI.bootProgress(k));

  let last = performance.now(); let hudT = 0;
  function frame(now) {
    const raw = Math.min(0.05, (now - last) / 1000); last = now;
    const R = Game.run;
    if (R) {
      const hold = R.paused || UI.modalOpen();
      if (!hold) {
        Game.tickReal(raw);
        if (R.over) Game.updateFx(raw * 0.5);           // 終了後も火花だけはゆっくり動かす
        else if (R.hitstop > 0) R.hitstop -= raw;        // ヒットストップ中は世界を止める
        else {
          let dt = raw;
          if (R.slowmo > 0) { R.slowmo -= raw; dt *= 0.3; }                                   // ボス撃破のスロー
          if (R.resumeT > 0) { R.resumeT -= raw; dt *= 1 - Math.max(0, R.resumeT) / 0.6 * 0.85; } // メニューを閉じた直後はゆっくり動き出す
          // 倍速時は細かく分けて更新（すり抜け防止）
          const steps = R.speed > 1 ? 2 : 1;
          for (let i = 0; i < steps; i++) Game.update(dt * R.speed / steps);
        }
      }
      Render.draw();
      hudT -= raw; if (hudT <= 0) { hudT = 0.1; UI.hud(); }
    } else Render.drawMenuBg(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // オートセーブ（拠点の状態）
  setInterval(() => { if (!Game.run) Save.write(); }, 15000);
  // PWA（オフラインでも起動できるように）
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
