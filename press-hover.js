/* ============================================================
   press-hover.js  —  cursor-following image preview for the
   press / talks list rows on the update letter pages.

   Each .nl-press-item[data-press-img] reveals a small contextual
   photo that tracks the cursor. Hover-capable pointers only; the
   image loads on first hover and is reused after. Motion follows
   the house easing (slow, controlled, no spring).
   ============================================================ */
(function () {
  'use strict';

  // Hover-capable, fine pointer only (no touch / coarse).
  var canHover = false;
  try { canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches; }
  catch (e) { canHover = false; }
  if (!canHover) return;

  var items = Array.prototype.slice.call(
    document.querySelectorAll('.nl-press-item[data-press-img]')
  );
  if (!items.length) return;

  // Single shared preview node.
  var preview = document.createElement('figure');
  preview.className = 'nl-press-preview';
  preview.setAttribute('aria-hidden', 'true');
  var inner = document.createElement('div');
  inner.className = 'nl-press-preview-inner';
  var img = document.createElement('img');
  img.decoding = 'async';
  img.alt = '';
  inner.appendChild(img);
  preview.appendChild(inner);
  document.body.appendChild(preview);

  var active = null;          // current item
  var shown = false;
  var loadedSrc = '';
  var targetX = 0, targetY = 0;
  var curX = 0, curY = 0;
  var raf = 0;
  var OFFSET = 26;            // gap from cursor
  var opacity = 0;            // JS-driven fade (CSS transition/animation
                             // stalls on this compositor-promoted node)
  var FADE_IN = 0.12;        // per-frame increment (~200ms in)
  var FADE_OUT = 0.16;       // per-frame decrement (~150ms out)

  inner.style.opacity = '0';

  function size() {
    return { w: preview.offsetWidth || 280, h: preview.offsetHeight || 220 };
  }

  function place(now) {
    var s = size();
    var vw = window.innerWidth, vh = window.innerHeight;
    // default: to the right of the cursor, vertically centered
    var x = targetX + OFFSET;
    if (x + s.w > vw - 12) x = targetX - OFFSET - s.w;   // flip left near right edge
    if (x < 12) x = 12;
    var y = targetY - s.h / 2;
    if (y < 12) y = 12;
    if (y + s.h > vh - 12) y = vh - 12 - s.h;
    if (now) { curX = x; curY = y; }
    else {
      // ease toward target for a soft, trailing follow
      curX += (x - curX) * 0.22;
      curY += (y - curY) * 0.22;
    }
    preview.style.transform = 'translate(' + Math.round(curX) + 'px, ' + Math.round(curY) + 'px)';
  }

  function loop() {
    raf = 0;
    var beforeX = curX, beforeY = curY;
    place(false);

    // drive the fade in JS — deterministic, immune to the compositor
    // quirk that pins CSS opacity transitions/animations at 0 here.
    if (shown) {
      if (opacity < 1) opacity = Math.min(1, opacity + FADE_IN);
    } else if (opacity > 0) {
      opacity = Math.max(0, opacity - FADE_OUT);
    }
    inner.style.opacity = opacity.toFixed(3);

    var moving = Math.abs(curX - beforeX) > 0.3 || Math.abs(curY - beforeY) > 0.3;
    var fading = (shown && opacity < 1) || (!shown && opacity > 0);
    if (moving || fading) {
      raf = window.requestAnimationFrame(loop);
    } else if (!shown) {
      // fully hidden — park off-screen so it can't intercept anything
      preview.style.transform = 'translate(-9999px, -9999px)';
    }
  }

  function ensureLoop() {
    if (!raf) raf = window.requestAnimationFrame(loop);
  }

  function show(item, e) {
    active = item;
    var src = item.getAttribute('data-press-img');
    if (src && src !== loadedSrc) { img.src = src; loadedSrc = src; }
    targetX = e.clientX; targetY = e.clientY;
    place(true);                 // snap to first position (no slide-in from origin)
    shown = true;
    ensureLoop();
  }

  function hide() {
    shown = false;
    active = null;
    ensureLoop();                // let the loop fade it out
  }

  items.forEach(function (item) {
    item.addEventListener('pointerenter', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      show(item, e);
    });
    item.addEventListener('pointermove', function (e) {
      if (!shown || active !== item) return;
      targetX = e.clientX; targetY = e.clientY;
      ensureLoop();
    });
    item.addEventListener('pointerleave', function () { hide(); });
  });

  // Safety: hide if the page scrolls or the window blurs.
  window.addEventListener('scroll', function () { if (shown) hide(); }, { passive: true });
  window.addEventListener('blur', function () { if (shown) hide(); });
})();
