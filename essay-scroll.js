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

   This file adds the `jr-js` class only after it has successfully
   prepared the reveal observer. If the script is missing or fails,
   the page stays fully visible as a safe fallback.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var essay = document.querySelector('.jr-essay');
  if (!essay) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var targets = essay.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  // No IntersectionObserver, or motion is not wanted: leave everything
  // visible and do not enable the hidden reveal state.
  if (reduce || !('IntersectionObserver' in window)) {
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

  // Anything already in view must stay visible when reveal mode turns on.
  // Observe only the remaining targets, then enable the CSS hidden state.
  var viewportBottom = window.innerHeight || document.documentElement.clientHeight;
  for (var j = 0; j < targets.length; j++) {
    if (targets[j].getBoundingClientRect().top < viewportBottom) {
      targets[j].classList.add('is-in');
    } else {
      observer.observe(targets[j]);
    }
  }
  root.classList.add('jr-js');

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
