/* gallery-scroll.js — progressive enhancement for the scroll galleries.

   Update-letter galleries (.nl-gallery), fine pointers (desktop) only:
     · mouse drag-to-scroll, with click suppression after a drag
     · thin chevron buttons that page ~80% of the visible width

   Work-page galleries (.sp-gallery), fine pointers only:
     · the strip advances HORIZONTALLY as the page is scrolled VERTICALLY.
       Image 1 holds until the strip is fully on screen, then it traverses,
       landing on the last image just as the strip leaves the top — so the
       motion tracks the section's time on screen. No pinning / scroll-jacking.

   Everything works with zero JS (native horizontal scroll + keyboard), and
   touch keeps native swipe. Respects prefers-reduced-motion. */
(function () {
  'use strict';
  function reduce() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function addChevrons(g, track) {
    if (!track.id) track.id = 'nlgal-' + Math.random().toString(36).slice(2, 7);
    var prev = makeBtn('prev', '‹', 'Scroll gallery left', track.id);
    var next = makeBtn('next', '›', 'Scroll gallery right', track.id);
    g.appendChild(prev);
    g.appendChild(next);
    function page(dir) {
      track.scrollBy({ left: dir * Math.round(track.clientWidth * 0.8), behavior: reduce() ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', function () { page(-1); });
    next.addEventListener('click', function () { page(1); });
    function update() {
      var max = track.scrollWidth - track.clientWidth - 1;
      prev.disabled = track.scrollLeft <= 0;
      next.disabled = track.scrollLeft >= max;
    }
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    Array.prototype.forEach.call(track.querySelectorAll('img'), function (im) {
      if (!im.complete) im.addEventListener('load', update);
    });
    update();
  }

  function makeBtn(dir, glyph, label, controls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nl-gallery-nav nl-gallery-nav--' + dir;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-controls', controls);
    b.innerHTML = '<span aria-hidden="true">' + glyph + '</span>';
    return b;
  }

  function addDrag(track) {
    track.classList.add('is-draggable');
    Array.prototype.forEach.call(track.querySelectorAll('img'), function (im) { im.setAttribute('draggable', 'false'); });
    var down = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = track.getBoundingClientRect();
      if (e.clientY > r.bottom - 18) return; // leave the native scrollbar alone
      down = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
      track.classList.add('is-grabbing');
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    function end(e) {
      if (!down) return;
      down = false;
      track.classList.remove('is-grabbing');
      try { track.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
      moved = false;
    }, true);
  }

  /* Map vertical scroll position to each work-page gallery's scroll-left, so
     the filmstrip slides sideways as that section travels up the viewport. */
  function initScrollDriven(items) {
    function compute() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var max = it.track.scrollWidth - it.track.clientWidth;
        if (max <= 2) { it.track.scrollLeft = 0; continue; }
        var r = it.g.getBoundingClientRect();
        var center = r.top + r.height / 2;
        // flip through while the section crosses the central viewing band:
        // p=0 while its centre is below ~68% of the viewport (still settling in,
        // image 1 held), p=1 once its centre reaches ~34% (done before it starts
        // leaving the top). Tightens the window so it neither starts early nor
        // drags on after the images are seen.
        var enter = vh * 0.68;
        var exit = vh * 0.34;
        var p = (enter - center) / (enter - exit);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        it.track.scrollLeft = p * max;
      }
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { compute(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    items.forEach(function (it) {
      Array.prototype.forEach.call(it.track.querySelectorAll('img'), function (im) {
        if (!im.complete) im.addEventListener('load', onScroll);
      });
    });
    compute();
  }

  function init() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || reduce()) return;
    // both the update-letter (.nl-gallery) and work-page (.sp-gallery) strips
    // advance on vertical scroll via the same central-band mapping.
    var items = [];
    Array.prototype.forEach.call(document.querySelectorAll('.nl-gallery, .sp-gallery'), function (g) {
      var track = g.querySelector('.nl-gallery-track, .sp-gallery-track');
      if (track) items.push({ g: g, track: track });
    });
    if (items.length) initScrollDriven(items);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
