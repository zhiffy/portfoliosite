/* ============================================================
   site-header.js  —  one consistent header across the whole site.

   Loaded on every page EXCEPT the homepage (which runs the fuller
   scroll-narrative.js control bar). Three jobs:

   1. Normalise the header's right cluster into a single segmented
      control bar:  [ EN v | Mouse on/off ]  — identical on every page,
      regardless of what markup the page shipped with.
   2. Wire the Mouse on/off toggle so the cursor ripple can be turned
      off anywhere. It speaks the same contract fluid-renderer.js
      already listens for (localStorage 'sw-mouse-effect' +
      'sw:ripple-toggle' event).
   3. On the six Writing update pages, add left/right (and keyboard)
      navigation to move between articles.

   Must load BEFORE site-i18n.js so the language <select> it creates is
   picked up and populated by the i18n bootstrap.
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  // The homepage owns its own control bar via scroll-narrative.js.
  var isHome = !!document.querySelector('[data-stage], .sn-strip');

  /* ---------- 1 + 2 : normalise control bar + mouse toggle ---------- */
  if (!isHome) {
    var meta = document.querySelector('.sn-meta-right');
    if (meta) {
      // reuse an existing language switcher, or build one
      var lang = meta.querySelector('[data-language-switcher]');
      if (!lang) {
        lang = document.createElement('label');
        lang.className = 'sn-lang-switcher';
        lang.setAttribute('data-language-switcher', '');
        var kicker = document.createElement('span');
        kicker.className = 'sn-lang-kicker';
        kicker.setAttribute('data-i18n', 'ui.languageLabel');
        kicker.textContent = 'Language';
        var sel = document.createElement('select');
        sel.className = 'sn-lang-select';
        sel.setAttribute('data-language-select', '');
        sel.setAttribute('aria-label', 'Language');
        sel.setAttribute('data-i18n-aria-label', 'ui.languageLabel');
        sel.setAttribute('title', 'Language');
        lang.appendChild(kicker);
        lang.appendChild(sel);
      }

      // mouse toggle button
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sn-view-toggle';
      btn.setAttribute('data-mouse-effect-toggle', '');
      btn.setAttribute('title', 'Toggle mouse effect');
      btn.setAttribute('data-i18n-title', 'controls.mouseEffectTitle');
      var lbl = document.createElement('span');
      lbl.setAttribute('data-mouse-effect-label', '');
      lbl.textContent = 'Mouse on';
      btn.appendChild(lbl);

      // assemble a single segmented bar; drop the page's old label spans
      var bar = document.createElement('div');
      bar.className = 'sn-controlbar';
      bar.setAttribute('aria-label', 'Display options');
      bar.appendChild(lang);
      bar.appendChild(btn);

      meta.textContent = '';
      meta.appendChild(bar);

      // ---- wire the mouse toggle ----
      var KEY = 'sw-mouse-effect';
      function readOn() {
        try { return window.localStorage.getItem(KEY) !== 'off'; }
        catch (e) { return true; }
      }
      function tr(key, fb) {
        try {
          var v = window.SW_I18N && window.SW_I18N.t(key);
          return (v && v !== key) ? v : fb;
        } catch (e) { return fb; }
      }
      var on = readOn() && !docEl.classList.contains('sn-mouse-effect-off');
      function sync() {
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        lbl.textContent = on ? tr('controls.mouseOn', 'Mouse on') : tr('controls.mouseOff', 'Mouse off');
        docEl.classList.toggle('sn-mouse-effect-off', !on);
      }
      btn.addEventListener('click', function () {
        on = !on;
        try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
        window.dispatchEvent(new CustomEvent('sw:ripple-toggle', { detail: { enabled: on } }));
        sync();
      });
      // keep the label in the right language when i18n changes
      window.addEventListener('sw:i18n-change', sync);
      sync();
    }
  }

  /* ---------- 3 : article pager (Writing update pages) ---------- */
  var ARTICLES = [
    { file: 'update2026jun.html',  label: 'June 2026' },
    { file: 'update2025jun.html',  label: 'June 2025' },
    { file: 'update2025jan.html',  label: 'January 2025' },
    { file: 'update2024jun.html',  label: 'June 2024' },
    { file: 'update2024jan.html',  label: 'January 2024' },
    { file: 'update2023june.html', label: 'June 2023' },
    { file: 'update2023jan.html',  label: 'January 2023' }
  ];
  var here = (location.pathname.split('/').pop() || '').toLowerCase();
  var idx = -1;
  for (var i = 0; i < ARTICLES.length; i++) { if (ARTICLES[i].file === here) { idx = i; break; } }

  if (idx !== -1) {
    var newer = idx > 0 ? ARTICLES[idx - 1] : null;                 // <- left
    var older = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null; // -> right

    function makeArrow(dir, target) {
      if (!target) return null;
      var a = document.createElement('a');
      a.className = 'nl-pager nl-pager--' + dir;
      a.href = target.file;
      a.setAttribute('aria-label', (dir === 'prev' ? 'Newer update: ' : 'Older update: ') + target.label);
      var chev = document.createElement('span');
      chev.className = 'nl-pager-chevron';
      chev.setAttribute('aria-hidden', 'true');
      chev.textContent = dir === 'prev' ? '\u2190' : '\u2192';
      var info = document.createElement('span');
      info.className = 'nl-pager-info';
      var d = document.createElement('span');
      d.className = 'nl-pager-dir';
      d.textContent = dir === 'prev' ? 'Newer' : 'Older';
      var l = document.createElement('span');
      l.className = 'nl-pager-label';
      l.textContent = target.label;
      info.appendChild(d);
      info.appendChild(l);
      a.appendChild(chev);
      a.appendChild(info);
      return a;
    }

    var left = makeArrow('prev', newer);
    var right = makeArrow('next', older);
    if (left) document.body.appendChild(left);
    if (right) document.body.appendChild(right);

    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var t = e.target || {};
      var tag = t.tagName || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || t.isContentEditable) return;
      if (e.key === 'ArrowLeft' && newer) { location.href = newer.file; }
      else if (e.key === 'ArrowRight' && older) { location.href = older.file; }
    });
  }

  /* ---------- 4 : scroll thread (Iris progress accent) ---------- */
  (function () {
    var thread = document.createElement('div');
    thread.className = 'sw-scroll-thread';
    thread.setAttribute('aria-hidden', 'true');
    document.body.appendChild(thread);

    var vh = window.innerHeight;
    var idleTimer = 0;
    var raf = 0;

    function scrollMetrics() {
      var doc = document.documentElement, body = document.body;
      var y = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
      var sh = Math.max(doc.scrollHeight, body.scrollHeight);
      var max = sh - window.innerHeight;
      return { y: y, max: max };
    }

    function paint() {
      raf = 0;
      var m = scrollMetrics();
      if (m.max <= 40) { thread.style.height = '0px'; return; }
      var p = Math.max(0, Math.min(1, m.y / m.max));
      thread.style.height = (p * vh) + 'px';
    }

    function onScroll() {
      if (!raf) raf = window.requestAnimationFrame(paint);
      thread.classList.add('is-on');
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(function () {
        thread.classList.remove('is-on');
      }, 700);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      vh = window.innerHeight;
      if (!raf) raf = window.requestAnimationFrame(paint);
    }, { passive: true });
    paint();
  })();
})();
