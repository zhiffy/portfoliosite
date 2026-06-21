/* ============================================================
   press-hover.js  —  cursor-following image preview for the
   press / talks / exhibition list rows.

   Each row reveals a small contextual photo that tracks the
   cursor. Hover-capable pointers only; the image loads on first
   hover and is reused after. Motion follows the house easing.

   ROBUSTNESS (2026-06-21): this uses EVENT DELEGATION on the
   document rather than binding listeners to each row at load.
   That means the effect can never be detached by a layout change
   (e.g. raising a page title), a DOM re-render, or rows that
   appear after load (e.g. the About "Show all" exhibitions
   toggle). The floating preview is a fixed-position child of
   <body> with a very high z-index, so no ancestor can clip it.
   Do not revert this to per-row attach(); that is the pattern
   that kept breaking whenever the title was moved.

   URL->preview mappings live in /assets/data/press-previews.json.
   Edit that file (not this one) to add, remove, or update previews.
   ============================================================ */
(function () {
  'use strict';

  // Hover-capable, fine pointer only (no touch / coarse).
  var canHover = false;
  try { canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches; }
  catch (e) { canHover = false; }
  if (!canHover) return;

  var ROW_SELECTOR = '.nl-press-item a, .pr-row, .abv-exh-entry, [data-press-img]';

  // Exhibition entries stay here — they match by text content, not URL,
  // so they don't belong in the URL-keyed JSON.
  var exhibitionPreviewMap = [
    ['Meet Eva Here Platform Project, Taipei Dangdai', '/assets/eras/interactive%20installations/15-exhibition-history-taipei-dangdai-installation.webp'],
    ['EVA The Columns Gallery - Singapore', '/assets/eras/interactive%20installations/18-exhibition-view-audience-with-eva-screen.jpg'],
    ['Meet Eva Here Platform Project, ART SG 2025', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],
    ['Scenes: The Sensory and Remembered Image', '/assets/after-ophelia/13-paris-photo.webp'],
    ["Artist's Proof: Singapore at 60", '/assets/features/ap60-artist-proof-singapore-at-60.webp'],
    ['Talking to Machines', '/assets/eras/interactive%20installations/11-exhibition-history-art-central-audience-talk.jpg'],
    ['ART SG The Columns Gallery - Singapore', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],
    ['Bang & Olufsen Art Showcase', '/assets/features/bang-olufsen-artist-page.webp'],
    ['In The Ether ArtScience Museum', '/assets/features/lume-studios-onbd-installation.webp'],
    ['Shavonne Wong NFT Factory', '/assets/newsletters/update2024jan/02.webp'],
    ['Infinite Games: Hello World!', '/assets/features/beijing-798-art-district-screening.webp'],
    ['Sound and Vision II', '/assets/features/lume-studios-onbd-installation.webp'],
    ['W1 Curates x Canary Labs', '/assets/features/w1-curates-london-poster.webp'],
    ['The Ties That Bind UltraSuperNew Gallery', '/assets/features/the-ties-that-bind-exhibition-signage.webp'],
    ['The Times of Chimeras', '/assets/features/venice-biennale-cameroon-pavilion.webp'],
    ['SEA Focus The Columns Gallery - Singapore', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],
    ['Beijing Contemporary', '/assets/features/beijing-contemporary-art-expo-exterior.webp'],
    ['6060 Exhibition', '/assets/features/nfc-stage-screening.webp'],
    ['Digital Paradise', '/assets/features/sanya-digital-art-installation.webp'],
    ['Future C', '/assets/features/neal-digital-gallery-installation.webp'],
    ['Material Sense The Columns Gallery - Singapore', '/assets/eras/3d/the-mirror-world.webp'],
    ['The Columns Gallery Kiaf Plus', '/assets/features/neal-digital-gallery-installation.webp'],
  ];

  // pressPreviewMap is populated from /assets/data/press-previews.json.
  // Format after loading: [[urlSubstring, previewPath], ...]
  var pressPreviewMap = [];

  // ---- floating preview element (fixed child of <body>, unclippable) ----
  var preview = document.createElement('div');
  preview.className = 'sn-press-hover-preview';
  preview.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:99999;transition:opacity 0.18s ease;opacity:0;';
  var previewImg = document.createElement('img');
  previewImg.alt = '';
  previewImg.decoding = 'async';
  previewImg.style.cssText = 'display:block;width:320px;height:auto;max-height:232px;object-fit:contain;border-radius:3px;box-shadow:0 4px 24px rgba(0,0,0,0.18);background:var(--surface,#f5f5f6);transition:opacity 0.12s ease;';
  preview.appendChild(previewImg);
  document.body.appendChild(preview);

  function ensureAttached() {
    // Defensive: if anything ever detaches the preview, re-home it on <body>.
    if (preview.parentNode !== document.body) document.body.appendChild(preview);
  }

  var mouseX = 0, mouseY = 0, curX = 0, curY = 0;
  var raf = null;
  var active = false;
  var currentEl = null;
  var previewCache = Object.create(null);

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animate() {
    curX += (mouseX + 18 - curX) * 0.10;
    curY += (mouseY - 60 - curY) * 0.10;
    preview.style.transform = 'translate(' + curX + 'px,' + curY + 'px)';
    if (active) raf = requestAnimationFrame(animate);
  }

  function resolveImg(el) {
    if (!el) return null;
    if (el.dataset && el.dataset.pressImg) return el.dataset.pressImg;
    var rowText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    for (var j = 0; j < exhibitionPreviewMap.length; j++) {
      if (rowText.indexOf(exhibitionPreviewMap[j][0]) !== -1) return exhibitionPreviewMap[j][1];
    }
    var href = el.href || el.getAttribute('href') || '';
    if (!href) return null;
    for (var i = 0; i < pressPreviewMap.length; i++) {
      if (href.indexOf(pressPreviewMap[i][0]) !== -1) return pressPreviewMap[i][1];
    }
    return null;
  }

  function preloadImg(src) {
    if (!src || previewCache[src]) return;
    var img = new Image();
    img.decoding = 'async';
    img.src = src;
    previewCache[src] = img;
  }

  function setPreviewImg(src) {
    if (!src) return;
    preloadImg(src);
    if (previewImg.getAttribute('src') !== src) {
      previewImg.onload = function () {
        if (previewImg.getAttribute('src') === src) previewImg.style.opacity = '1';
      };
      previewImg.style.opacity = '0';
      previewImg.src = src;
      if (previewImg.complete) {
        previewImg.onload = null;
        previewImg.style.opacity = '1';
      }
      return;
    }
    previewImg.style.opacity = '1';
  }

  function show(el) {
    var imgSrc = resolveImg(el);
    if (!imgSrc) return;
    currentEl = el;
    ensureAttached();
    setPreviewImg(imgSrc);
    active = true;
    preview.style.opacity = '1';
    curX = mouseX + 18;
    curY = mouseY - 60;
    if (!raf) raf = requestAnimationFrame(animate);
  }

  function hide() {
    currentEl = null;
    active = false;
    preview.style.opacity = '0';
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  // ---- delegation: listeners live on the document, never on the rows ----
  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest && e.target.closest(ROW_SELECTOR);
    if (!el || el === currentEl) return;
    show(el);
  });

  document.addEventListener('mouseout', function (e) {
    if (!currentEl) return;
    var el = e.target.closest && e.target.closest(ROW_SELECTOR);
    if (el !== currentEl) return;
    // Ignore moves to a child still inside the same row.
    if (e.relatedTarget && currentEl.contains(e.relatedTarget)) return;
    hide();
  });

  // Load URL->preview map from JSON. Delegation is already live, so even if
  // this fetch is slow or fails, exhibition rows (text-matched) keep working
  // and press rows start working the moment the map resolves.
  fetch('/assets/data/press-previews.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      pressPreviewMap = data.map(function (e) { return [e.match, e.preview]; });
    })
    .catch(function () {});

}());
