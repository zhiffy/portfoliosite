/* ============================================================
   nav-writing.js  -  the "Writing" item in the site header.

   Turns the header's Writing link (data-i18n="nav.writing", or the older
   "nav.journal") into a small menu that opens to Journal and Newsletters.
   Without JavaScript the plain link to /journal/ stays, so nothing breaks.

   Loaded by site-header.js on interior pages and directly by index.html.
   Desktop: opens on hover or click, panel sits under the word.
   Phones (900px and under, where the nav is one scrolling row): opens on tap
   as a full-width row under the header, so the scrolling row cannot clip it.
   Escape, a click elsewhere, or tabbing away closes it.
   ============================================================ */
(function () {
  'use strict';

  var ITEMS = [
    { href: '/journal/', key: 'nav.journal', label: 'Journal',
      match: /^\/(?:journal(?:\/.*)?|writing|open-tabs|there-is-no-universal-user|a-mirror-that-leaves-you-out)(?:\.html)?$/ },
    { href: '/newsletters/', key: 'nav.newsletters', label: 'Newsletters',
      match: /^\/(?:newsletters?(?:\/.*)?|update20\d{2}(?:jan|june?)(?:\/.*)?)(?:\.html)?$/ }
  ];
  var MOBILE = '(max-width: 900px)';
  var HOVER = '(hover: hover) and (pointer: fine)';

  function injectStyle() {
    if (document.getElementById('sn-wmenu-style')) return;
    var style = document.createElement('style');
    style.id = 'sn-wmenu-style';
    style.textContent =
      '.sn-wmenu{position:relative;display:inline-flex;align-items:center;flex:0 0 auto}' +
      '.sn-wmenu-btn{appearance:none;border:0;background:none;padding:0;margin:0;font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;min-height:24px;white-space:nowrap}' +
      '.sn-wmenu-btn:hover,.sn-wmenu-btn:focus-visible,.sn-wmenu-btn.is-active,.sn-wmenu.is-open .sn-wmenu-btn{color:var(--accent-deep)}' +
      '.sn-wmenu-btn:focus-visible{outline:1px solid currentColor;outline-offset:4px}' +
      '.sn-wmenu-chev{width:5px;height:5px;border-right:1px solid currentColor;border-bottom:1px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform 160ms ease}' +
      '.sn-wmenu.is-open .sn-wmenu-chev{transform:translateY(1px) rotate(-135deg)}' +
      '.sn-wmenu-panel{position:absolute;top:100%;z-index:120;background:var(--bg);border:1px solid var(--hairline-strong);padding:6px 0;min-width:168px;display:grid;text-transform:none;letter-spacing:0;font-weight:400}' +
      '.sn-wmenu-panel[hidden]{display:none}' +
      '.sn-wmenu-panel a{display:block;padding:9px 16px;font-size:14px;line-height:1.3;color:var(--text);text-decoration:none;white-space:nowrap}' +
      '.sn-wmenu-panel a:hover,.sn-wmenu-panel a:focus-visible,.sn-wmenu-panel a.is-current{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;outline:0}' +
      '@media ' + MOBILE + '{.sn-wmenu-btn{min-height:30px}.sn-wmenu-panel{left:0!important;right:0;min-width:0;border-left:0;border-right:0;display:flex;gap:24px;padding:8px var(--pad,16px) 10px}.sn-wmenu-panel a{padding:4px 0;font-size:13px}}' +
      '@media (prefers-reduced-motion: reduce){.sn-wmenu-chev{transition:none}}';
    document.head.appendChild(style);
  }

  function slugFor() {
    var SLUGS = { 'zh-Hans': 'zh-hans', 'zh-Hant': 'zh-hant' };
    return SLUGS[document.documentElement.getAttribute('lang')] || '';
  }

  function build() {
    var header = document.querySelector('.sn-nav');
    var links = header && header.querySelector('.sn-links');
    if (!links || links.querySelector('.sn-wmenu')) return;
    var link = links.querySelector('a[data-i18n="nav.writing"], a[data-i18n="nav.journal"]');
    if (!link) return;
    injectStyle();

    var path = location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    var current = -1;
    var exact = -1;
    ITEMS.forEach(function (item, i) {
      if (item.match.test(path)) current = i;
      var base = item.href.replace(/\/+$/, '');
      if (path === base || (slugFor() && path === base + '/' + slugFor())) exact = i;
    });

    var wrap = document.createElement('span');
    wrap.className = 'sn-wmenu';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sn-wmenu-btn' + (current > -1 ? ' is-active' : '');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'sn-wmenu-panel');
    var label = document.createElement('span');
    label.setAttribute('data-i18n', 'nav.writing');
    label.textContent = 'Writing';
    var chev = document.createElement('span');
    chev.className = 'sn-wmenu-chev';
    chev.setAttribute('aria-hidden', 'true');
    btn.appendChild(label);
    btn.appendChild(chev);
    wrap.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'sn-wmenu-panel';
    panel.id = 'sn-wmenu-panel';
    panel.hidden = true;
    // On a Chinese page, point straight at the Chinese Journal / Newsletters
    // pages (both exist), so the address shown on hover and "open in new tab"
    // match where the click goes. site-i18n.js also localizes on click.
    var slug = slugFor();
    ITEMS.forEach(function (item, i) {
      var a = document.createElement('a');
      a.href = item.href + (slug ? slug + '/' : '');
      a.setAttribute('data-i18n', item.key);
      a.textContent = item.label;
      // Underline the section you are in; tell screen readers "current page"
      // only on the Journal or Newsletters page itself, not on an essay or letter.
      if (i === current) a.className = 'is-current';
      if (i === exact) a.setAttribute('aria-current', 'page');
      panel.appendChild(a);
    });

    link.replaceWith(wrap);
    // The panel lives on the header, not inside the nav row, because the
    // phone nav row scrolls sideways and would clip anything hanging below it.
    header.appendChild(panel);

    function place() {
      if (window.matchMedia(MOBILE).matches) { panel.style.left = ''; return; }
      var h = header.getBoundingClientRect();
      var b = btn.getBoundingClientRect();
      panel.style.left = Math.max(0, Math.round(b.left - h.left - 16)) + 'px';
    }
    function open() {
      if (!panel.hidden) return;
      place();
      panel.hidden = false;
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close(refocus) {
      if (panel.hidden) return;
      panel.hidden = true;
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (refocus) btn.focus();
    }

    // Hover opens the menu on desktop, so the click that usually follows must
    // not close it again. A click only closes a menu that a click opened.
    var openedBy = '';
    btn.addEventListener('click', function () {
      if (panel.hidden) { open(); openedBy = 'click'; return; }
      if (openedBy === 'hover') { openedBy = 'click'; return; }
      close(false);
    });

    var hoverTimer = null;
    function hoverOpen() {
      if (!window.matchMedia(HOVER).matches || window.matchMedia(MOBILE).matches) return;
      clearTimeout(hoverTimer);
      if (panel.hidden) { open(); openedBy = 'hover'; }
    }
    function hoverClose() {
      if (!window.matchMedia(HOVER).matches || window.matchMedia(MOBILE).matches) return;
      if (openedBy === 'click' || openedBy === 'key') return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { close(false); }, 180);
    }
    wrap.addEventListener('mouseenter', hoverOpen);
    wrap.addEventListener('mouseleave', hoverClose);
    panel.addEventListener('mouseenter', hoverOpen);
    panel.addEventListener('mouseleave', hoverClose);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        var inside = wrap.contains(document.activeElement) || panel.contains(document.activeElement);
        close(inside);
      }
    });
    // The panel sits at the end of the header in the DOM, so keyboard focus
    // is steered by hand: into the panel from the button, and back out to the
    // next header link after the last item.
    var panelLinks = panel.querySelectorAll('a');
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey && !panel.hidden)) {
        e.preventDefault();
        if (panel.hidden) { open(); openedBy = 'key'; } else if (openedBy === 'hover') { openedBy = 'key'; }
        panelLinks[0].focus();
      }
    });
    panel.addEventListener('keydown', function (e) {
      var i = Array.prototype.indexOf.call(panelLinks, document.activeElement);
      if (e.key === 'ArrowDown' && i < panelLinks.length - 1) { e.preventDefault(); panelLinks[i + 1].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? panelLinks[i - 1] : btn).focus(); }
      else if (e.key === 'Tab' && e.shiftKey && i === 0) { e.preventDefault(); btn.focus(); }
      else if (e.key === 'Tab' && !e.shiftKey && i === panelLinks.length - 1) {
        var next = wrap.nextElementSibling;
        if (next && typeof next.focus === 'function') { e.preventDefault(); close(false); next.focus(); }
      }
    });
    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (wrap.contains(e.target) || panel.contains(e.target)) return;
      close(false);
    });
    wrap.addEventListener('focusout', function (e) {
      if (panel.hidden) return;
      if (e.relatedTarget && (panel.contains(e.relatedTarget) || wrap.contains(e.relatedTarget))) return;
      if (!e.relatedTarget && openedBy === 'hover') return;
      close(false);
    });
    // Do not come back to an open menu after using the browser's Back button.
    window.addEventListener('pagehide', function () { close(false); });
    panel.addEventListener('focusout', function (e) {
      if (e.relatedTarget && (panel.contains(e.relatedTarget) || wrap.contains(e.relatedTarget))) return;
      close(false);
    });
    window.addEventListener('resize', function () { if (!panel.hidden) place(); });

    if (window.SW_I18N && typeof window.SW_I18N.apply === 'function') {
      window.SW_I18N.apply(wrap);
      window.SW_I18N.apply(panel);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
