/* ============================================================
   Shavonne Wong — cursor warp
   Pure SVG feDisplacementMap. No canvas, no DOM overlay, no
   circular mask. A small radial gradient follows the cursor,
   modulating where the displacement happens. Outside that
   small area the displacement is zero, so there is no visible
   boundary — pixels look untouched.
   ============================================================ */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const gradient = document.getElementById('cursorMaskGradient');
  if (!gradient) return;

  let targetX = window.innerWidth * 0.5;
  let targetY = window.innerHeight * 0.5;
  let currentX = targetX;
  let currentY = targetY;
  let raf = 0;
  let running = false;
  let lastMove = 0;

  function tick(now) {
    // ease toward the latest pointer position so the deformation
    // settles after the mouse stops, instead of snapping.
    const ease = 0.18;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    gradient.setAttribute('cx', currentX.toFixed(2));
    gradient.setAttribute('cy', currentY.toFixed(2));

    const dx = Math.abs(targetX - currentX);
    const dy = Math.abs(targetY - currentY);
    const settled = dx < 0.4 && dy < 0.4;

    if (settled && now - lastMove > 300) {
      running = false;
      raf = 0;
      return;
    }
    raf = window.requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    raf = window.requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    lastMove = performance.now();
    start();
  }, { passive: true });

  window.addEventListener('resize', () => {
    // gradient uses userSpaceOnUse so resizing doesn't need a fix,
    // but kick a frame so the cursor's relative position re-reads.
    start();
  });
})();
