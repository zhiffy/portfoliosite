/* Shavonne Wong — image lightbox
   Targets: .bp2-fig img · .bp2-source-gallery figure img
            .bp2-source-media img · .bp2-edition-strip figure img
            .bp2-story-aside img
   Caption priority: parent article data-title → sibling figcaption → alt
   Link: data-lb-href on parent .bp2-work article or parent figure */
(function () {
  'use strict';

  /* ── injected CSS ──────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '.sw-lb{position:fixed;inset:0;z-index:9900;',
      'background:rgba(24,25,43,0.93);',
      'display:flex;align-items:center;justify-content:center;',
      'opacity:0;transition:opacity 0.22s ease;cursor:zoom-out;}',
    '.sw-lb.sw-lb--open{opacity:1;}',
    '.sw-lb-inner{',
      'position:relative;display:flex;flex-direction:column;align-items:center;',
      'gap:14px;max-width:92vw;max-height:92vh;cursor:default;}',
    '.sw-lb-img{',
      'max-width:88vw;max-height:82vh;width:auto;height:auto;',
      'display:block;object-fit:contain;}',
    '.sw-lb-info{',
      'display:flex;flex-direction:column;align-items:center;gap:8px;',
      'text-align:center;max-width:60ch;}',
    '.sw-lb-title{',
      'font-family:Mulish,"Helvetica Neue",Arial,sans-serif;',
      'font-size:13px;font-style:italic;font-weight:300;letter-spacing:0.02em;',
      'color:rgba(255,255,255,0.75);}',
    '.sw-lb-cap{',
      'font-family:Mulish,"Helvetica Neue",Arial,sans-serif;',
      'font-size:10px;letter-spacing:0.14em;text-transform:uppercase;',
      'color:rgba(255,255,255,0.38);}',
    '.sw-lb-link{',
      'font-family:Mulish,"Helvetica Neue",Arial,sans-serif;',
      'font-size:10px;letter-spacing:0.16em;text-transform:uppercase;',
      'color:rgba(255,255,255,0.45);text-decoration:underline;text-underline-offset:3px;',
      'transition:color 0.15s ease;}',
    '.sw-lb-link:hover{color:rgba(255,255,255,0.8);}',
    '.sw-lb-btn{',
      'background:none;border:1px solid rgba(255,255,255,0.2);',
      'color:rgba(255,255,255,0.6);cursor:pointer;',
      'font-family:Mulish,"Helvetica Neue",Arial,sans-serif;',
      'font-size:10px;letter-spacing:0.16em;text-transform:uppercase;',
      'padding:8px 14px;',
      'transition:color 0.15s ease,border-color 0.15s ease;}',
    '.sw-lb-btn:hover,.sw-lb-btn:focus-visible{',
      'color:#fff;border-color:rgba(255,255,255,0.6);outline:none;}',
    '.sw-lb-close{position:fixed;top:18px;right:22px;}',
    '.sw-lb-prev{position:fixed;top:50%;left:16px;transform:translateY(-50%);}',
    '.sw-lb-next{position:fixed;top:50%;right:72px;transform:translateY(-50%);}',
    '.sw-lb-count{',
      'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);',
      'font-family:Mulish,"Helvetica Neue",Arial,sans-serif;',
      'font-size:10px;letter-spacing:0.18em;text-transform:uppercase;',
      'color:rgba(255,255,255,0.25);pointer-events:none;}',
    '@media(max-width:600px){',
      '.sw-lb-prev{left:8px;}.sw-lb-next{right:60px;}',
      '.sw-lb-close{top:12px;right:12px;}}',
  ].join('');
  document.head.appendChild(style);

  /* ── state ─────────────────────────────────────────────────────── */
  var entries = [];
  var current = 0;
  var overlay, imgEl, titleEl, capEl, linkEl, closeBtn, prevBtn, nextBtn, countEl;

  /* ── helpers ───────────────────────────────────────────────────── */
  function textOf(el) { return el ? (el.textContent || '').trim() : ''; }

  function metaFor(node) {
    /* Title: parent .bp2-work article data-title > figcaption > alt */
    var article = node.closest('[data-lb-href]') || node.closest('.bp2-work');
    var fig = node.closest('figure');
    var figcap = fig ? fig.querySelector('figcaption') : null;
    var artTitle = article ? (article.dataset.lbTitle || article.dataset.title || '') : '';
    var capText = textOf(figcap);
    var title = artTitle || capText || node.alt || '';
    /* Distinguish: if artTitle and figcap both exist, show both */
    var sub = (artTitle && capText && artTitle !== capText) ? capText : '';
    /* External link */
    var href = (article && article.dataset.lbHref) || (fig && fig.dataset.lbHref) || '';
    return { title: title, sub: sub, href: href, src: node.src, alt: node.alt || '' };
  }

  /* ── build overlay DOM ─────────────────────────────────────────── */
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'sw-lb';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image viewer');
    overlay.style.display = 'none';
    overlay.addEventListener('click', close);

    closeBtn = makeBtn('Close', 'sw-lb-btn sw-lb-close');
    closeBtn.setAttribute('aria-label', 'Close image viewer');
    closeBtn.addEventListener('click', close);

    prevBtn = makeBtn('Prev', 'sw-lb-btn sw-lb-prev');
    prevBtn.setAttribute('aria-label', 'Previous image');
    prevBtn.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });

    nextBtn = makeBtn('Next', 'sw-lb-btn sw-lb-next');
    nextBtn.setAttribute('aria-label', 'Next image');
    nextBtn.addEventListener('click', function (e) { e.stopPropagation(); step(1); });

    countEl = document.createElement('div');
    countEl.className = 'sw-lb-count';
    countEl.setAttribute('aria-live', 'polite');

    var inner = document.createElement('div');
    inner.className = 'sw-lb-inner';
    inner.addEventListener('click', function (e) { e.stopPropagation(); });

    imgEl = document.createElement('img');
    imgEl.className = 'sw-lb-img';
    imgEl.setAttribute('alt', '');

    var info = document.createElement('div');
    info.className = 'sw-lb-info';

    titleEl = document.createElement('div');
    titleEl.className = 'sw-lb-title';

    capEl = document.createElement('div');
    capEl.className = 'sw-lb-cap';

    linkEl = document.createElement('a');
    linkEl.className = 'sw-lb-link';
    linkEl.textContent = 'View on OpenSea';
    linkEl.target = '_blank';
    linkEl.rel = 'noreferrer';

    info.appendChild(titleEl);
    info.appendChild(capEl);
    info.appendChild(linkEl);
    inner.appendChild(imgEl);
    inner.appendChild(info);
    overlay.appendChild(closeBtn);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    overlay.appendChild(countEl);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
  }

  function makeBtn(text, cls) {
    var b = document.createElement('button');
    b.className = cls;
    b.textContent = text;
    return b;
  }

  /* ── open / close / navigate ───────────────────────────────────── */
  function open(index) {
    current = index;
    render();
    overlay.style.display = 'flex';
    overlay.offsetHeight;
    overlay.classList.add('sw-lb--open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('sw-lb--open');
    setTimeout(function () {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 240);
  }

  function step(dir) {
    var n = current + dir;
    if (n >= 0 && n < entries.length) { current = n; render(); }
  }

  function render() {
    var e = entries[current];
    imgEl.src = e.src;
    imgEl.alt = e.alt;

    titleEl.textContent = e.title;
    titleEl.style.display = e.title ? '' : 'none';

    capEl.textContent = e.sub;
    capEl.style.display = e.sub ? '' : 'none';

    if (e.href) {
      linkEl.href = e.href;
      linkEl.style.display = '';
    } else {
      linkEl.style.display = 'none';
    }

    var multi = entries.length > 1;
    prevBtn.style.display = (multi && current > 0) ? '' : 'none';
    nextBtn.style.display = (multi && current < entries.length - 1) ? '' : 'none';
    countEl.style.display = multi ? '' : 'none';
    countEl.textContent = multi ? (current + 1) + ' / ' + entries.length : '';
  }

  /* ── init ──────────────────────────────────────────────────────── */
  function init() {
    buildOverlay();

    var SELECTOR = [
      '.bp2-hero-cover img',
      '.bp2-fig img',
      '.bp2-source-gallery figure img',
      '.bp2-source-media img',
      '.bp2-story-aside img',
      '.bp2-edition-strip figure img',
    ].join(', ');

    var nodes = Array.from(document.querySelectorAll(SELECTOR));

    /* Build entry list; skip images inside navigating links */
    entries = [];
    var indexMap = [];
    nodes.forEach(function (node) {
      var link = node.closest('a');
      if (link && link.href &&
          link.href.indexOf('#') !== 0 &&
          !link.href.endsWith(location.pathname) &&
          !link.href.endsWith(location.pathname + '#')) {
        indexMap.push(-1);
        return;
      }
      indexMap.push(entries.length);
      entries.push(metaFor(node));
    });

    /* Attach click handlers */
    nodes.forEach(function (node, i) {
      if (indexMap[i] === -1) return;
      node.style.cursor = 'zoom-in';
      node.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        open(indexMap[i]);
      });
    });

    /* Keyboard navigation */
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('sw-lb--open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
