// エントリーポイント
(function () {
  loadAssets();
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  const ui = new UI(game);
  window.game = game; // デバッグ用
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let i = 0; i < game.speed; i++) game.update(dt);
    ui.update(dt);
    game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
