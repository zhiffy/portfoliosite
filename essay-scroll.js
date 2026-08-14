/* ============================================================
   essay-scroll.js
   Scroll behaviour for .jr-essay visual-essay pages.

   Scope, deliberately narrow:
     - reveals FIGURES, PULL QUOTES, BREAKS and the THRESHOLD line
       as they enter the reading band. Body paragraphs are never
       hidden, so text is readable on first paint, with JS off,
       in print, and to crawlers.
     - draws the single Iris threshold line across the page once.

   No pinning, no scroll-jacking, no parallax, no scaling of any
   image (site rule C1, no crop, no ratio change).

   The `jr-js` class is set by a tiny inline script in the page
   head, before first paint, so nothing flashes visible then hides.
   If that inline script is absent, this file adds nothing and the
   page renders fully static, which is a safe fallback.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('jr-js')) return;

  var essay = document.querySelector('.jr-essay');
  if (!essay) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var targets = essay.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  // No IntersectionObserver, or motion is not wanted: show everything.
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-in');
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry.isIntersecting) continue;

      var el = entry.target;

      // Stagger the children of a pair so they do not land as one slab.
      var kids = el.classList.contains('jr-strip') ? el.children : null;
      if (kids) {
        for (var k = 0; k < kids.length; k++) {
          kids[k].style.transitionDelay = (k * 90) + 'ms';
        }
      }

      el.classList.add('is-in');
      observer.unobserve(el);
    }
  }, {
    // Fire a little before the element is fully on screen, so the
    // movement has finished by the time the eye arrives.
    rootMargin: '0px 0px -12% 0px',
    threshold: 0.08
  });

  for (var j = 0; j < targets.length; j++) observer.observe(targets[j]);

  // Safety net: anything still hidden after load (a figure inside a
  // collapsed container, a very short page) is shown outright.
  window.addEventListener('load', function () {
    window.setTimeout(function () {
      var stuck = essay.querySelectorAll('[data-reveal]:not(.is-in)');
      for (var i = 0; i < stuck.length; i++) {
        var rect = stuck[i].getBoundingClientRect();
        if (rect.top < window.innerHeight) stuck[i].classList.add('is-in');
      }
    }, 400);
  });
})();
