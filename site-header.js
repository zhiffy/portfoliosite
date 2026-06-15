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
    var pageNav = document.querySelector('.sn-nav[data-page-nav], .sn-nav');
    if (pageNav) {
      var links = [
        { href: '/#hero', label: 'Home', key: 'nav.home', match: /^\/(?:index\.html)?$/ },
        { href: '/about/', label: 'About', key: 'nav.about', match: /^\/about(?:\.html|\/)?$/ },
        { href: '/works/', label: 'Works', key: 'nav.works', match: /^\/(?:works(?:\/.*)?|6529-meme-card|after-ophelia|after-ophelia-ophelia-reassembled|after-ophelia-ophelia-retold|by-proxy|conditional|love-is-love|meet-eva-here|meet-eva-here-chatbot|meet-eva-here-diary|meet-eva-here-hello-eva|the-bubble-we-call-home|the-ties-that-bind|vogue-singapore|whirlwind-of-the-waking-dream|works-available)(?:\.html|\/)?$/ },
        { href: '/writing/', label: 'Writing', key: 'nav.writing', match: /^\/(?:writing|update20\d{2}(?:jan|june?))(?:\.html|\/)?$/ },
        { href: '/press/', label: 'Press', key: 'nav.press', match: /^\/press(?:\.html|\/)?$/ },
        { href: '/contact/', label: 'Contact', key: 'nav.contact', match: /^\/contact(?:\.html|\/)?$/ }
      ];
      var path = location.pathname.toLowerCase().replace(/\/+$/, '') || '/';

      var mark = pageNav.querySelector('.sn-mark');
      if (!mark) {
        mark = document.createElement('a');
        mark.className = 'sn-mark';
        pageNav.insertBefore(mark, pageNav.firstChild);
      }
      mark.setAttribute('href', '/#hero');
      if (!mark.querySelector('.sn-mark-logo')) {
        mark.textContent = '';
        var logo = document.createElement('img');
        logo.className = 'sn-mark-logo';
        logo.setAttribute('decoding', 'async');
        logo.setAttribute('src', '/assets/brand/wordmark-slate.webp');
        logo.setAttribute('alt', 'Shavonne Wong');
        logo.setAttribute('width', '120');
        logo.setAttribute('height', '42');
        mark.appendChild(logo);
      }

      var navLinks = pageNav.querySelector('.sn-links');
      if (!navLinks) {
        navLinks = document.createElement('nav');
        navLinks.className = 'sn-links';
        mark.insertAdjacentElement('afterend', navLinks);
      }
      navLinks.textContent = '';
      links.forEach(function (item) {
        var a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        a.setAttribute('data-i18n', item.key);
        if (item.match.test(path)) a.className = 'is-active';
        navLinks.appendChild(a);
      });

      var meta = pageNav.querySelector('.sn-meta-right');
      if (!meta) {
        meta = document.createElement('div');
        meta.className = 'sn-meta-right';
        var progress = pageNav.querySelector('.sn-progress');
        pageNav.insertBefore(meta, progress || null);
      }

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
  // Resolve both clean URLs (/update2026jun/) and direct .html paths.
  var here = (location.pathname.toLowerCase().replace(/\/+$/, '').split('/').pop() || '');
  var idx = -1;
  for (var i = 0; i < ARTICLES.length; i++) {
    if (ARTICLES[i].file === here || ARTICLES[i].file.replace(/\.html$/, '') === here) { idx = i; break; }
  }
  function urlFor(t) { return '/' + t.file.replace(/\.html$/, '') + '/'; }

  if (idx !== -1) {
    var newer = idx > 0 ? ARTICLES[idx - 1] : null;                 // <- left
    var older = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null; // -> right

    function makeArrow(dir, target) {
      if (!target) return null;
      var a = document.createElement('a');
      a.className = 'nl-pager nl-pager--' + dir;
      a.href = urlFor(target);
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
      if (e.key === 'ArrowLeft' && newer) { location.href = urlFor(newer); }
      else if (e.key === 'ArrowRight' && older) { location.href = urlFor(older); }
    });

    // Top-of-letter switcher: an "All updates" jump plus adjacent steps, near
    // the masthead, so readers never have to scroll to move between letters.
    var letterMain = document.getElementById('main-content') || document.querySelector('main.nl-letter');
    if (letterMain && !document.querySelector('.nl-switch')) {
      var swStyle = document.createElement('style');
      swStyle.textContent =
        '.nl-switch{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:12px;padding-bottom:6px;margin-bottom:clamp(6px,1.4vw,14px);font-family:Mulish,Helvetica Neue,Arial,sans-serif}' +
        '.nl-switch a{text-decoration:none}' +
        '.nl-switch-all,.nl-switch-step,.nl-switch-current{font-size:11px;letter-spacing:.16em;text-transform:uppercase}' +
        '.nl-switch-all,.nl-switch-step{color:var(--text-3,#6b6c80);transition:color .16s ease}' +
        '.nl-switch-all:hover,a.nl-switch-step:hover{color:var(--text,#18192B)}' +
        '.nl-switch-current{color:var(--text,#18192B);font-weight:600}' +
        '.nl-switch-pager{display:flex;align-items:center;gap:18px}' +
        '.nl-switch-step{display:inline-flex;align-items:center;gap:7px}' +
        'span.nl-switch-step{opacity:.32}' +
        '.nl-switch-chev{font-size:13px;line-height:1}' +
        '@media(max-width:700px){.nl-switch{flex-wrap:wrap;gap:10px}.nl-switch-pager{gap:14px}}';
      document.head.appendChild(swStyle);

      var sw = document.createElement('nav');
      sw.className = 'nl-switch nl-wrap';
      sw.setAttribute('aria-label', 'Studio updates');
      function stepHtml(target, dir) {
        var chev = dir === 'prev' ? '←' : '→';
        var word = dir === 'prev' ? 'Newer' : 'Older';
        var inner = dir === 'prev'
          ? '<span class="nl-switch-chev" aria-hidden="true">' + chev + '</span>' + word
          : word + '<span class="nl-switch-chev" aria-hidden="true">' + chev + '</span>';
        if (!target) return '<span class="nl-switch-step">' + inner + '</span>';
        return '<a class="nl-switch-step" href="' + urlFor(target) + '" aria-label="' +
          (dir === 'prev' ? 'Newer update: ' : 'Older update: ') + target.label + '">' + inner + '</a>';
      }
      sw.innerHTML =
        '<a class="nl-switch-all" href="/writing/">All updates</a>' +
        '<div class="nl-switch-pager">' +
          stepHtml(newer, 'prev') +
          '<span class="nl-switch-current">' + ARTICLES[idx].label + '</span>' +
          stepHtml(older, 'next') +
        '</div>';
      letterMain.insertBefore(sw, letterMain.firstChild);
    }
  }

  /* ---------- 4 : consistent page footer ---------- */
  (function () {
    var oldFooters = document.querySelectorAll('.wr-footer-nav, .sp-footer-nav, .wk-footer-nav, .wk2-footer');
    for (var f = 0; f < oldFooters.length; f++) oldFooters[f].remove();

    var styleId = 'sw-page-footer-style';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent =
        'main:has(>.sw-page-footer){padding-bottom:clamp(28px,4vh,46px)!important}' +
        '.sw-page-footer{margin:clamp(26px,4vh,48px) auto 0;padding:clamp(16px,2.4vh,24px) clamp(20px,4vw,72px) clamp(18px,3vh,28px);font-family:Mulish,Helvetica Neue,Arial,sans-serif;color:#18192B}' +
        '.sw-page-footer__inner{max-width:1500px;margin:0 auto;display:flex;justify-content:flex-end}' +
        '.sw-page-footer__top{appearance:none;border:1px solid rgba(79,88,166,.62);background:transparent;color:#4F58A6;min-height:42px;padding:0 18px;font:inherit;font-size:11px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s ease,color .2s ease,border-color .2s ease}' +
        '.sw-page-footer__top:hover,.sw-page-footer__top:focus-visible{background:#4F58A6;color:#F8F8FC;border-color:#4F58A6;outline:0}' +
        '@media(max-width:700px){main:has(>.sw-page-footer){padding-bottom:32px!important}.sw-page-footer{margin-top:30px;padding:16px 18px 18px}.sw-page-footer__inner{justify-content:flex-start}.sw-page-footer__top{width:100%;justify-content:center}}';
      document.head.appendChild(style);
    }

    var main = document.querySelector('main');
    if (!main || main.querySelector('[data-site-footer]')) return;

    var footer = document.createElement('footer');
    footer.className = 'sw-page-footer';
    footer.setAttribute('data-site-footer', '');
    footer.innerHTML =
      '<div class="sw-page-footer__inner">' +
        '<button class="sw-page-footer__top" type="button" data-site-back-top>Back to top</button>' +
      '</div>';
    main.appendChild(footer);
  })();

  document.addEventListener('click', function (e) {
    var target = e.target && e.target.closest ? e.target.closest('[data-site-back-top]') : null;
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 5 : scroll thread (Iris progress accent) ---------- */
  if (!isHome) (function () {
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

  /* ---------- 6 : sticky subscribe CTA ---------- */
  if (!isHome) (function () {
    var KEY = 'sw-subscribe-cta-dismissed';
    if (document.getElementById('sw-subscribe-cta')) return;
    try {
      if (window.localStorage.getItem(KEY) === 'yes') return;
    } catch (e) {}

    var styleId = 'sw-subscribe-cta-style';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent =
        '.sw-subscribe-cta{position:fixed;right:clamp(14px,2vw,28px);bottom:clamp(14px,2vw,28px);z-index:140;display:flex;align-items:center;gap:12px;max-width:min(390px,calc(100vw - 28px));padding:12px 12px 12px 15px;background:#18192B;color:#EDEDF4;border:1px solid rgba(237,237,244,.22);box-shadow:0 18px 44px rgba(24,25,43,.2);font-family:Mulish,Helvetica Neue,Arial,sans-serif;opacity:0;transform:translateY(10px);transition:opacity .28s ease,transform .28s ease}' +
        '.sw-subscribe-cta.is-visible{opacity:1;transform:translateY(0)}' +
        '.sw-subscribe-cta__link{display:grid;gap:1px;min-width:0;color:inherit;text-decoration:none}' +
        '.sw-subscribe-cta__kicker{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#D0D3EC;white-space:nowrap}' +
        '.sw-subscribe-cta__title{font-size:14px;line-height:1.25;font-style:italic;font-weight:300;color:#fff}' +
        '.sw-subscribe-cta__button{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 13px;border:1px solid rgba(237,237,244,.45);color:#fff;font-size:10px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}' +
        '.sw-subscribe-cta__close{appearance:none;border:0;background:transparent;color:#D0D3EC;font:inherit;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:8px 2px;cursor:pointer}' +
        '.sw-subscribe-cta__link:hover .sw-subscribe-cta__button{background:#EDEDF4;color:#18192B}' +
        '.sw-subscribe-cta__close:hover{color:#fff}' +
        '@media(max-width:640px){.sw-subscribe-cta{left:12px;right:12px;bottom:12px;max-width:none;gap:10px}.sw-subscribe-cta__title{font-size:13px}.sw-subscribe-cta__button{padding:0 10px}.sw-subscribe-cta__close{font-size:10px}}' +
        '@media(prefers-reduced-motion:reduce){.sw-subscribe-cta{transition:none}}';
      document.head.appendChild(style);
    }

    function targetHref() {
      var form = document.querySelector('[data-newsletter-form]');
      if (form) {
        if (!form.id) form.id = 'sw-subscribe-form';
        return '#' + form.id;
      }
      return 'writing.html#sw-subscribe-form';
    }

    var cta = document.createElement('aside');
    cta.id = 'sw-subscribe-cta';
    cta.className = 'sw-subscribe-cta';
    cta.setAttribute('aria-label', 'Subscribe to studio updates');
    cta.innerHTML =
      '<a class="sw-subscribe-cta__link" href="' + targetHref() + '">' +
        '<span class="sw-subscribe-cta__kicker">Studio updates</span>' +
        '<span class="sw-subscribe-cta__title">New work, exhibitions, and drops.</span>' +
      '</a>' +
      '<a class="sw-subscribe-cta__button" href="' + targetHref() + '">Subscribe</a>' +
      '<button class="sw-subscribe-cta__close" type="button" aria-label="Dismiss subscribe prompt">Close</button>';

    cta.querySelector('.sw-subscribe-cta__close').addEventListener('click', function () {
      cta.remove();
      try { window.localStorage.setItem(KEY, 'yes'); } catch (e) {}
    });

    document.body.appendChild(cta);
    window.requestAnimationFrame(function () {
      cta.classList.add('is-visible');
    });
  })();
})();
