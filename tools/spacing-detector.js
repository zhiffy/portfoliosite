// Layout spacing audit. Pure DOM, no dependencies. Returns { para, issues }.
// Shared by tools/check-spacing.mjs; keep the two copies identical.
window.__spacingAudit = function (opts) {
  opts = Object.assign({ holePx: 72, gapFactor: 3.2, headingGapPx: 150, orphanShare: 0.45 }, opts || {});
  const main = document.querySelector('main') || document.body;
  const chrome = el => el.closest('.sw-page-footer, .sn-nav, dialog, [hidden], [class*="subscribe"], [class*="toast"], .nl-cover, .jr-hero');
  // Galleries and photo strips count as one block each; their inner images are not measured separately.
  const groupSel = '.nl-gallery, .sp-gallery, .jr-strip, .nl-twoup, .jr-duo';
  const skip = el => chrome(el) || (el.closest(groupSel) && !el.matches(groupSel));
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.height > 4 && r.width > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const textSel = 'p, li, h1, h2, h3, h4, blockquote, dt, dd, [class*="venue"], [class*="-pub"], [class*="byline"], .nl-sign, .nl-featured-sub, .nl-featured-tag, .nl-featured-when';
  const texts = [...main.querySelectorAll(textSel)].filter(el => vis(el) && !skip(el) && !el.closest('figure, .jr-embed') && !el.querySelector(textSel) && (el.innerText || '').trim());
  const media = [...main.querySelectorAll('img, video, iframe, .jr-embed-frame, ' + groupSel)].filter(el => vis(el) && !skip(el) && !chrome(el) && !(el.tagName === 'IFRAME' && el.closest('.jr-embed-frame')));
  const content = [...texts, ...media];
  const R = el => el.getBoundingClientRect();
  const y0 = window.scrollY;
  const label = el => (el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '') + ' "' + (el.innerText || el.getAttribute('alt') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 48) + '"');
  const ms = texts.filter(e => e.tagName === 'P').map(e => parseFloat(getComputedStyle(e).marginBottom) || 0).filter(m => m > 2).sort((a, b) => a - b);
  const para = ms.length ? ms[Math.floor(ms.length / 2)] : 20;
  const ox = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > Math.min(a.width, b.width) * 0.5;
  // The unit a gap belongs to: an essay section, a letter event, one press feature or list item.
  const box = el => el.closest('.jr-sec, article, [class*="press-feature"]:not(section), [class*="-item"], li, .nl-section, section') || main;
  const issues = [];
  const add = (type, px, el, other) => issues.push({ type, px: Math.round(px), at: Math.round(R(el).bottom + y0), after: label(el), before: other ? label(other) : '' });
  // 1. hole: two blocks in the same column and the same section/event, with far more space between them than the paragraph rhythm
  const sorted = content.slice().sort((a, b) => R(a).top - R(b).top);
  for (const a of texts) {
    const ra = R(a);
    const next = sorted.find(b => b !== a && !a.contains(b) && !b.contains(a) && R(b).top >= ra.bottom - 1 && ox(ra, R(b)));
    if (!next || box(next) !== box(a)) continue;
    const gap = R(next).top - ra.bottom;
    // Text vertically centred beside a photo in a letter event grid leaves designed air, not a hole.
    if (a.closest('.nl-ev-text') && !next.closest('.nl-ev-text')) continue;
    // A rail: the stretch beside the gap is filled by running text in the other column (title left, prose right).
    const band = { top: ra.bottom + 4, bottom: R(next).top - 4 };
    if (texts.some(o => o !== a && !ox(ra, R(o)) && R(o).bottom > band.top && R(o).top < band.bottom)) continue;
    const heading = /^H[1-4]$/.test(next.tagName) || next.matches('.jr-h, .jr-sec-label, .jr-beat, [class*="title"], [class*="label"], [class*="kicker"]') || next.closest('.jr-pull, .jr-essay-foot, .jr-next');
    const limit = heading ? opts.headingGapPx : Math.max(opts.holePx, para * opts.gapFactor);
    if (gap > limit) add('hole', gap, a, next);
  }
  // 2. orphan media: an image sitting alone on its line with most of the content width empty beside it, not centred and not on the text axis
  const mr = R(main.querySelector('.jr-flow, .nl-wrap, article, section') || main);
  const textLefts = new Set(texts.map(t => Math.round(R(t).left)));
  for (const m of media) {
    if (m.tagName === 'IFRAME' || m.matches('.jr-strip, .jr-duo')) continue;
    const rm = R(m);
    if (rm.width > mr.width * (1 - opts.orphanShare)) continue;
    const beside = content.some(o => o !== m && !o.contains(m) && !m.contains(o) && R(o).bottom > rm.top + 8 && R(o).top < rm.bottom - 8 && !ox(rm, R(o)));
    if (beside) continue;
    const leftGap = rm.left - mr.left, rightGap = mr.right - rm.right;
    if (Math.abs(leftGap - rightGap) < mr.width * 0.15) continue; // centred
    if ([...textLefts].some(x => Math.abs(x - rm.left) < 3) && leftGap > mr.width * 0.2) continue; // sits on an indented text axis
    add('orphan-media', Math.max(leftGap, rightGap), m);
  }
  // 3. essay section titles that wrap on a wide screen
  if (innerWidth >= 1200) for (const h of main.querySelectorAll('.jr-flow h2')) {
    if (!vis(h)) continue; const lh = parseFloat(getComputedStyle(h).lineHeight) || 1;
    if (Math.round(R(h).height / lh) > 1 && (h.innerText || '').trim().split(/\s+/).length <= 8) add('heading-wraps', 2, h);
  }
  // 4. no gutter: text touching the screen edge (fixed side pager and chrome excluded)
  const vw = document.documentElement.clientWidth;
  for (const t of texts) { const r = R(t); if (getComputedStyle(t).position === 'fixed' || t.closest('[class*="pager"], [class*="nav"]')) continue;
    if (r.left < 12 || r.right > vw - 12) { add('no-gutter', Math.min(r.left, vw - r.right), t); break; } }
  return { para: Math.round(para), issues };
};
