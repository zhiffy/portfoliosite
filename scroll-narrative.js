/* ============================================================
   Shavonne Wong - Scroll Narrative
   Horizontal site engine:
   - Body height is inflated to match the strip width.
   - On scroll, the strip translates X by -scrollY.
   - Per-section "horizontal progress" drives parallax,
     press crossfade, and the dark contact flip.
   ============================================================ */

(function () {
  'use strict';

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const docEl = document.documentElement;
  const scrollModeKey = 'sw-home-scroll-mode';
  const mouseEffectKey = 'sw-mouse-effect';
  const readSetting = (key) => {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  };
  const writeSetting = (key, value) => {
    try { window.localStorage.setItem(key, value); } catch (error) {}
  };
  // Scroll mode resolution:
  //   1. Explicit user preference in localStorage ('vertical' or 'horizontal') always wins.
  //   2. Otherwise, auto-default to vertical ONLY when the device is clearly unsuited
  //      for horizontal-scroll: narrow viewport (phones / small tablets in portrait),
  //      or the user has asked for reduced motion at the OS level.
  //      Horizontal stays the default everywhere else — including touchscreen laptops,
  //      windowed desktops, and tablets in landscape — because that is the signature
  //      of this site.
  const autoPrefersVertical = () => {
    try {
      if (window.matchMedia('(max-width: 900px)').matches) return true;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch (error) {}
    return false;
  };
  const storedScrollMode = readSetting(scrollModeKey);
  let forceVertical;
  if (storedScrollMode === 'vertical' || storedScrollMode === 'horizontal') {
    forceVertical = storedScrollMode === 'vertical';
  } else {
    forceVertical = docEl.classList.contains('sn-vertical-mode') || autoPrefersVertical();
  }
  let mouseEffectEnabled = readSetting(mouseEffectKey) !== 'off' && !docEl.classList.contains('sn-mouse-effect-off');
  const isNarrow = () => forceVertical || window.matchMedia('(max-width: 900px)').matches;
  // Width-only check: the hero overlap + inverted blend should run in desktop
  // vertical-scroll mode too, but NOT on phones (which keep the stacked hero).
  const isMobileViewport = () => window.matchMedia('(max-width: 900px)').matches;
  const prefersReducedMotion = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (error) { return false; }
  };
  // Hero pin budget as a fraction of viewport height. Set to 0 to disable the
  // pinned-hero sweep entirely (kill switch).
  const HERO_PIN_VH = 0.45;
  const i18n = () => window.SW_I18N;
  const text = (key, fallback, vars) => {
    const api = i18n();
    if (!api || typeof api.t !== 'function') return fallback;
    return api.t(key, vars) || fallback;
  };

  // ---------- DOM refs ----------
  const nav = document.querySelector('[data-nav]');
  const progressBar = document.querySelector('[data-progress]');
  const scrollReadout = document.querySelector('[data-scroll-readout]');
  const scrollModeToggle = document.querySelector('[data-scroll-mode-toggle]');
  const scrollModeLabel = document.querySelector('[data-scroll-mode-label]');
  const mouseEffectToggle = document.querySelector('[data-mouse-effect-toggle]');
  const mouseEffectLabel = document.querySelector('[data-mouse-effect-label]');

  const stage = document.querySelector('[data-stage]');
  const strip = document.querySelector('[data-strip]');
  const panels = Array.from(document.querySelectorAll('.sn-panel'));
  const panelLinks = Array.from(document.querySelectorAll('[data-panel-link]'));

  const parallaxNodes = Array.from(document.querySelectorAll('[data-parallax]'));
  const stmtWords = Array.from(document.querySelectorAll('.sn-stmt-body [data-reveal]'));

  const heroPanel = document.querySelector('[data-panel="hero"]');
  const heroFrameEl = document.querySelector('.sn-hero-frame');
  const heroTypeInvert = document.querySelector('.sn-hero-type-invert');
  const heroMediaTile = document.querySelector('[data-hero-media-tile]');
  const heroMediaLayers = Array.from(document.querySelectorAll('[data-hero-media-layer]'));
  const heroMediaTitle = document.querySelector('[data-hero-media-title]');
  const heroMediaMeta = document.querySelector('[data-hero-media-meta]');
  const heroMediaToggle = document.querySelector('[data-hero-media-toggle]');
  const heroInvertBg = document.querySelector('[data-hero-invert-bg]');
  const heroTypeBase = document.querySelector('.sn-hero-type-base');
  // Defaults: pause the hero autoplay when the user has asked for reduced motion
  // or reduced data at the OS level. Stays an explicit toggle either way.
  let userPausedHero = false;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) userPausedHero = true;
    if (window.matchMedia('(prefers-reduced-data: reduce)').matches) userPausedHero = true;
  } catch (error) {}
  const erasPanel = document.querySelector('[data-panel="eras"]');
  const statementPanel = document.querySelector('[data-panel="statement"]');
  const statementBody = document.querySelector('.sn-statement-body');
  const aboutPanel = document.querySelector('[data-panel="about"]');
  const worksPanel = document.querySelector('[data-works]');
  const worksCounter = document.querySelector('[data-works-counter]');
  const workEls = Array.from(document.querySelectorAll('[data-work]'));

  const writingPanel = document.querySelector('[data-writing]');
  const writingEls = Array.from(document.querySelectorAll('[data-essay]'));
  const writingCounter = document.querySelector('[data-writing-counter]');
  const writingDots = Array.from(document.querySelectorAll('[data-writing-dot]'));
  const writingCount = writingEls.length;

  const pressPanel = document.querySelector('[data-press-scene]');
  const pressQuotes = Array.from(document.querySelectorAll('[data-press-quote]'));
  const pressIndex = Array.from(document.querySelectorAll('[data-press-index] li'));
  const pressCounter = document.querySelector('[data-press-counter]');
  const pressCount = pressQuotes.length;
  const tickerTrack = document.querySelector('[data-ticker-track]');

  const contactPanel = document.querySelector('[data-panel="contact"]');
  const contactSigil = document.querySelector('[data-parallax-contact]');

  const badges = Array.from(document.querySelectorAll('[data-badge]'));
  const jumpLinks = Array.from(document.querySelectorAll('[data-jump]'));

  // ---------- state ----------
  let stripWidth = 0;
  let baseTotalScroll = 0;
  let totalScroll = 0;
  let erasPinStart = 0;
  let erasPinDistance = 0;
  let aboutPinStart = 0;
  let aboutPinDistance = 0;
  let statementPinStart = 0;
  let statementPinDistance = 0;
  let worksPinStart = 0;
  let worksPinDistance = 0;
  let writingPinStart = 0;
  let writingPinDistance = 0;
  let pressPinStart = 0;
  let pressPinDistance = 0;
  let heroPinStart = 0;
  let heroPinDistance = 0;
  let heroPinned = false;
  let heroSweepGeom = null;
  let pinSections = [];
  let currentX = 0;
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let scrollY = 0;
  let lastScrollY = 0;
  let scrollVel = 0;
  let lastWritingIdx = -1;
  let lastPressIdx = -1;
  let lastPanelId = '';
  let aboutProgress = 0;
  let narrow = isNarrow();
  const heroMediaItems = [
    {
      type: 'video',
      src: '/assets/one-of-ones/videos/whirlwind-of-the-waking-dream.mp4',
      poster: '/assets/one-of-ones/whirlwind-of-the-waking-dream.jpg',
      title: 'Whirlwind of the Waking Dream',
      meta: '2024 / 3D generative video',
      ratioW: 16,
      ratioH: 9,
      label: 'Whirlwind of the Waking Dream video'
    },
    {
      type: 'video',
      src: '/assets/one-of-ones/videos/in-suspension.mp4',
      poster: '/assets/one-of-ones/in-suspension.jpg',
      title: 'In Suspension',
      meta: '2023 / 3D video',
      ratioW: 16,
      ratioH: 9,
      label: 'In Suspension video'
    },
    {
      type: 'video',
      src: '/assets/one-of-ones/videos/the-mirror-world.mp4',
      poster: '/assets/one-of-ones/the-mirror-world.jpg',
      title: 'The Mirror World',
      meta: '2023 / 3D video',
      ratioW: 16,
      ratioH: 9,
      label: 'The Mirror World video'
    },
    {
      type: 'video',
      src: '/assets/one-of-ones/videos/the-kiss.mp4',
      poster: '/assets/one-of-ones/the-kiss.jpg',
      title: 'The Kiss',
      meta: '2023 / 3D video',
      ratioW: 16,
      ratioH: 9,
      label: 'The Kiss video'
    },
    {
      type: 'video',
      src: '/assets/one-of-ones/videos/the-illusion-of-connection-i.mp4',
      poster: '/assets/one-of-ones/the-illusion-of-connection-i.jpg',
      title: 'The Illusion of Connection',
      meta: '2023 / 3D video',
      ratioW: 16,
      ratioH: 9,
      label: 'The Illusion of Connection video'
    }
  ];
  let heroMediaIndex = 0;
  let heroLayerIndex = 0;
  let heroWasVisible = null;
  let lastHeroProgress = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTouchPanAt = 0;
  let wheelTargetY = window.scrollY || window.pageYOffset || 0;
  let wheelRaf = 0;

  function syncDisplayOptions() {
    docEl.classList.toggle('sn-vertical-mode', forceVertical);
    docEl.classList.toggle('sn-mouse-effect-off', !mouseEffectEnabled);
    if (scrollModeToggle) {
      scrollModeToggle.setAttribute('aria-pressed', forceVertical ? 'true' : 'false');
      scrollModeToggle.setAttribute('title', text('controls.scrollModeTitle', 'Switch homepage scroll mode'));
      scrollModeToggle.classList.toggle('is-on', forceVertical);
    }
    if (scrollModeLabel) scrollModeLabel.textContent = text('controls.vertical', 'Vertical');
    if (mouseEffectToggle) {
      mouseEffectToggle.setAttribute('aria-pressed', mouseEffectEnabled ? 'true' : 'false');
      mouseEffectToggle.setAttribute('title', text('controls.mouseEffectTitle', 'Toggle mouse effect'));
      mouseEffectToggle.classList.toggle('is-on', mouseEffectEnabled);
    }
    if (mouseEffectLabel) {
      mouseEffectLabel.textContent = mouseEffectEnabled
        ? text('controls.mouseOn', 'Mouse on')
        : text('controls.mouseOff', 'Mouse off');
    }
  }

  function heroItemText(item, field) {
    if (!item) return '';
    return text(item[field + 'Key'], item[field] || '');
  }

  function makeHeroMediaNode(item) {
    if (item.type === 'video') {
      const video = document.createElement('video');
      video.className = 'sn-hero-media-asset';
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('aria-label', heroItemText(item, 'label'));
      if (item.poster) video.poster = item.poster;

      const source = document.createElement('source');
      source.src = item.src;
      source.type = 'video/mp4';
      video.appendChild(source);
      return video;
    }

    const img = document.createElement('img');
    img.className = 'sn-hero-media-asset';
    img.src = item.src;
    img.alt = heroItemText(item, 'label');
    img.loading = 'eager';
    img.decoding = 'async';
    return img;
  }

  function renderHeroMediaLayer(layer, item) {
    if (!layer || !item) return;
    layer.replaceChildren(makeHeroMediaNode(item));
    layer.dataset.heroMediaType = item.type;
  }

  function setHeroMediaText(item) {
    if (heroMediaTitle) heroMediaTitle.textContent = heroItemText(item, 'title');
    if (heroMediaMeta) heroMediaMeta.textContent = heroItemText(item, 'meta');
  }

  function setHeroMediaRatio(item) {
    if (!heroFrameEl || !item) return;
    heroFrameEl.style.setProperty('--hero-media-ratio-w', String(item.ratioW));
    heroFrameEl.style.setProperty('--hero-media-ratio-h', String(item.ratioH));
  }

  function clearHeroMediaLayout() {
    if (!heroFrameEl) return;
    [
      '--hero-media-w',
      '--hero-media-h',
      '--hero-media-left',
      '--hero-media-top',
      '--hero-invert-clip-top',
      '--hero-invert-clip-right',
      '--hero-invert-clip-bottom',
      '--hero-invert-clip-left',
      '--hero-base-clip-right'
    ].forEach((prop) => {
      heroFrameEl.style.removeProperty(prop);
    });
  }

  function setHeroMediaLayoutVar(name, value) {
    if (heroFrameEl) heroFrameEl.style.setProperty(name, value);
  }

  function syncHeroInvertClip() {
    if (heroPinned) return;
    if (!heroFrameEl || !heroTypeInvert || !heroMediaTile || isMobileViewport()) return;
    const mediaRect = heroMediaTile.getBoundingClientRect();
    const invertRect = heroTypeInvert.getBoundingClientRect();
    if (!mediaRect.width || !mediaRect.height || !invertRect.width || !invertRect.height) return;

    // top/bottom = 0: no vertical clipping, full letterforms show without splits.
    const top = 0;
    const bottom = 0;
    // Left clip: start of the video tile (where text/video overlap begins).
    const left = Math.max(0, mediaRect.left - invertRect.left);
    // Right clip: cover the full visual text right edge, including any font overflow
    // beyond the grid column. We measure from the BASE layer's .sn-hero-word span
    // because the base layer's clip-path has not been applied yet at this point in
    // execution, so getBoundingClientRect() returns the true ink edge unambiguously.
    // (Measuring from inside the invert layer — which shares the same 2-col grid —
    // gave misleading results because the invert's own clip was already set or its
    // column constraint masked the overflow.)
    let nameRight = mediaRect.right; // safe fallback: video right edge
    if (heroTypeBase) {
      const baseWordEl = heroTypeBase.querySelector('.sn-hero-word');
      if (baseWordEl) {
        nameRight = Math.max(nameRight, baseWordEl.getBoundingClientRect().right);
      } else {
        const baseStack = heroTypeBase.querySelector('.sn-hero-name-stack');
        if (baseStack) nameRight = Math.max(nameRight, baseStack.getBoundingClientRect().right);
      }
    }
    // 8px buffer absorbs sub-pixel rounding and glyph optical-margin overshoot.
    const right = Math.max(0, invertRect.right - nameRight - 8);
    heroFrameEl.style.setProperty('--hero-invert-clip-top', top.toFixed(2) + 'px');
    heroFrameEl.style.setProperty('--hero-invert-clip-left', left.toFixed(2) + 'px');
    heroFrameEl.style.setProperty('--hero-invert-clip-right', right.toFixed(2) + 'px');
    heroFrameEl.style.setProperty('--hero-invert-clip-bottom', bottom.toFixed(2) + 'px');
    // Clip the base text layer to hide its overlap with the video tile —
    // the invert layer owns that zone and shows inverted-video colors through the text.
    if (heroTypeBase) {
      const baseRect = heroTypeBase.getBoundingClientRect();
      const baseClipRight = Math.max(0, baseRect.right - mediaRect.left);
      heroFrameEl.style.setProperty('--hero-base-clip-right', baseClipRight.toFixed(2) + 'px');
    }
  }

  function captureHeroSweepGeom() {
    if (!heroFrameEl || !heroMediaTile || !heroTypeInvert) return null;
    const tileRect = heroMediaTile.getBoundingClientRect();
    const invertRect = heroTypeInvert.getBoundingClientRect();
    if (!tileRect.width || !invertRect.width) return null;
    const baseRect = heroTypeBase ? heroTypeBase.getBoundingClientRect() : invertRect;
    const baseW = parseFloat(getComputedStyle(heroFrameEl).getPropertyValue('--hero-media-w')) || tileRect.width;
    return {
      rightEdge: tileRect.right,     // media panel right edge, kept anchored (no gap)
      frameLeft: heroFrameEl.getBoundingClientRect().left, // target: page/content left edge
      baseW: baseW,                  // original media width, restored on release
      invertLeft0: invertRect.left,  // invert layer left, for clip-left inset math
      baseRight0: baseRect.right     // base layer right, for base-clip-right inset math
    };
  }

  // Hero pin sweep: while the hero is pinned full-screen, the invert/base boundary
  // travels left across the name so the inverted blend covers progressively more of
  // it (ending at ~90%), then the pin releases and the strip carries the hero away.
  // Geometry is captured ONCE at pin entry; per-frame cost is two style writes only.
  function setHeroPinTransitions(disable) {
    // .sn-hero-media has "transition: width/height .45s" and the type layers have
    // "transition: all" — these animate the scroll-driven width/clip changes over
    // time, which lags the sweep and (on release) freezes a half-swept clip. Suppress
    // them inline while pinned; restore (empty string) on release.
    const value = disable ? 'none' : '';
    const fig = heroMediaTile ? heroMediaTile.parentElement : null;
    [fig, heroMediaTile, heroTypeBase, heroTypeInvert].forEach((el) => {
      if (el) el.style.transition = value;
    });
  }

  function setHeroSweep(progress) {
    if (!heroFrameEl) return;
    const p = clamp(progress);
    if (p <= 0) {
      if (heroPinned) {
        const g = heroSweepGeom;
        if (heroMediaTile) heroMediaTile.style.transform = '';
        if (g) {
          // Commit rest clip instantly while transitions are still suppressed, so
          // nothing animates back from a swept value and leaves a stuck clip.
          const restBoundary = g.rightEdge - g.baseW;
          heroFrameEl.style.setProperty('--hero-invert-clip-left', Math.max(0, restBoundary - g.invertLeft0).toFixed(2) + 'px');
          heroFrameEl.style.setProperty('--hero-base-clip-right', Math.max(0, g.baseRight0 - restBoundary).toFixed(2) + 'px');
          void heroFrameEl.offsetWidth;
        }
        heroPinned = false;
        heroSweepGeom = null;
        heroFrameEl.classList.remove('is-hero-pinned');
        setHeroPinTransitions(false);
        syncHeroInvertClip();
      }
      return;
    }
    if (!heroSweepGeom) heroSweepGeom = captureHeroSweepGeom();
    const g = heroSweepGeom;
    if (!g) return;
    if (!heroPinned) setHeroPinTransitions(true);
    heroPinned = true;
    heroFrameEl.classList.add('is-hero-pinned');
    // Scale the media panel UP uniformly (right + top edges anchored) so it reaches
    // the page's left edge with no gap and WITHOUT changing aspect ratio — the video
    // keeps its framing (faces aren't cropped) and simply bleeds off the bottom. The
    // invert/base boundary tracks the scaled panel's left edge so the inverted blend
    // sweeps across and covers the whole name as the panel grows.
    const sMax = g.baseW > 0 ? (g.rightEdge - g.frameLeft) / g.baseW : 1;
    const s = 1 + easeInOut(p) * Math.max(0, sMax - 1);
    if (heroMediaTile) {
      heroMediaTile.style.transformOrigin = 'top right';
      heroMediaTile.style.transform = 'scale(' + s.toFixed(4) + ')';
    }
    const boundary = g.rightEdge - g.baseW * s;
    const invertLeft = Math.max(0, boundary - g.invertLeft0);
    const baseRight = Math.max(0, g.baseRight0 - boundary);
    heroFrameEl.style.setProperty('--hero-invert-clip-left', invertLeft.toFixed(2) + 'px');
    heroFrameEl.style.setProperty('--hero-base-clip-right', baseRight.toFixed(2) + 'px');
  }

  function applyHeroMediaLayout() {
    const item = heroMediaItems[heroMediaIndex];
    if (!heroFrameEl || !item) return;
    setHeroMediaRatio(item);

    if (isMobileViewport()) {
      clearHeroMediaLayout();
      return;
    }

    const ratio = item.ratioW / Math.max(1, item.ratioH);
    const frameRect = heroFrameEl.getBoundingClientRect();
    const frameW = Math.max(1, frameRect.width);
    const frameH = Math.max(1, frameRect.height);
    const tabletPortrait = window.matchMedia('(min-width: 901px) and (max-width: 1100px) and (orientation: portrait)').matches;

    if (tabletPortrait) {
      const fitW = frameW;
      const fitH = fitW / ratio;
      const top = clamp(vh * 0.25, 300, 350);
      setHeroMediaLayoutVar('--hero-media-w', fitW.toFixed(2) + 'px');
      setHeroMediaLayoutVar('--hero-media-h', fitH.toFixed(2) + 'px');
      setHeroMediaLayoutVar('--hero-media-left', '0px');
      setHeroMediaLayoutVar('--hero-media-top', top.toFixed(2) + 'px');
      requestAnimationFrame(syncHeroInvertClip);
      return;
    }

    const desiredW = Math.min(Math.max(960, vw * 0.64), 1280, frameW);
    const maxH = Math.max(1, frameH - 8);
    const fitW = Math.max(1, Math.min(desiredW, maxH * ratio));
    const fitH = fitW / ratio;
    const left = Math.max(0, frameW - fitW);
    const top = Math.max(0, frameH - fitH);

    setHeroMediaLayoutVar('--hero-media-w', fitW.toFixed(2) + 'px');
    setHeroMediaLayoutVar('--hero-media-h', fitH.toFixed(2) + 'px');
    setHeroMediaLayoutVar('--hero-media-left', left.toFixed(2) + 'px');
    setHeroMediaLayoutVar('--hero-media-top', top.toFixed(2) + 'px');
    requestAnimationFrame(syncHeroInvertClip);
  }

  function playActiveHeroVideo() {
    if (userPausedHero) return;
    const activeLayer = heroMediaLayers[heroLayerIndex];
    const video = activeLayer ? activeLayer.querySelector('video') : null;
    if (!video || document.hidden || typeof video.play !== 'function') return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
  }

  function pauseAllHeroVideos() {
    heroMediaLayers.forEach((layer) => {
      const video = layer ? layer.querySelector('video') : null;
      if (video && typeof video.pause === 'function') {
        try { video.pause(); } catch (error) {}
      }
    });
  }

  function syncHeroToggleState() {
    if (!heroMediaToggle) return;
    const state = userPausedHero ? 'paused' : 'playing';
    heroMediaToggle.setAttribute('data-state', state);
    const label = userPausedHero ? 'Play hero video' : 'Pause hero video';
    heroMediaToggle.setAttribute('aria-label', label);
    heroMediaToggle.setAttribute('aria-pressed', userPausedHero ? 'true' : 'false');
  }

  function detachHeroVideoSources() {
    // Under reduced-data / reduced-motion, don't fetch the video bytes at all.
    // Clear the <source> src and force the video to drop its load.
    heroMediaLayers.forEach((layer) => {
      const video = layer ? layer.querySelector('video') : null;
      if (!video) return;
      const source = video.querySelector('source[data-hero-video-source]');
      if (source && source.getAttribute('src')) {
        // Store the original src on the source element so it can be re-attached
        // if the user explicitly hits play.
        source.setAttribute('data-hero-video-src-deferred', source.getAttribute('src'));
        source.removeAttribute('src');
        try { video.load(); } catch (error) {}
      }
    });
  }

  function reattachHeroVideoSources() {
    heroMediaLayers.forEach((layer) => {
      const video = layer ? layer.querySelector('video') : null;
      if (!video) return;
      const source = video.querySelector('source[data-hero-video-source]');
      if (source && !source.getAttribute('src')) {
        const deferred = source.getAttribute('data-hero-video-src-deferred') || video.getAttribute('data-hero-video-src');
        if (deferred) {
          source.setAttribute('src', deferred);
          try { video.load(); } catch (error) {}
        }
      }
    });
  }

  function setupHeroMediaToggle() {
    if (!heroMediaToggle) return;
    syncHeroToggleState();
    if (userPausedHero) {
      detachHeroVideoSources();
      pauseAllHeroVideos();
    }
    heroMediaToggle.addEventListener('click', () => {
      userPausedHero = !userPausedHero;
      if (userPausedHero) {
        pauseAllHeroVideos();
      } else {
        reattachHeroVideoSources();
        playActiveHeroVideo();
      }
      syncHeroToggleState();
    });
  }

  function pauseInactiveHeroVideos() {
    heroMediaLayers.forEach((layer, index) => {
      if (index === heroLayerIndex) return;
      const video = layer.querySelector('video');
      if (video && typeof video.pause === 'function') video.pause();
    });
  }

  function setHeroMediaProgress(progress) {
    lastHeroProgress = clamp(progress);
    const scale = (1 + lastHeroProgress * 0.025).toFixed(4);
    const lift = (-1.6 * lastHeroProgress).toFixed(3) + '%';
    heroMediaLayers.forEach((layer) => {
      layer.style.transform = 'translate3d(0,' + lift + ',0) scale(' + scale + ')';
    });
  }

  function setHeroMedia(index, immediate = false) {
    if (!heroMediaLayers.length || !heroMediaItems.length) return;
    const safeIndex = (index + heroMediaItems.length) % heroMediaItems.length;
    const item = heroMediaItems[safeIndex];
    const nextLayerIndex = immediate || heroMediaLayers.length === 1
      ? heroLayerIndex
      : (heroLayerIndex + 1) % heroMediaLayers.length;
    const nextLayer = heroMediaLayers[nextLayerIndex];

    heroMediaIndex = safeIndex;
    renderHeroMediaLayer(nextLayer, item);
    setHeroMediaText(item);
    applyHeroMediaLayout();
    setHeroMediaProgress(lastHeroProgress);

    heroMediaLayers.forEach((layer, index) => {
      const active = index === nextLayerIndex;
      layer.classList.toggle('is-active', active);
      layer.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    heroLayerIndex = nextLayerIndex;
    window.setTimeout(playActiveHeroVideo, 60);
    window.setTimeout(pauseInactiveHeroVideos, 480);
  }

  function advanceHeroMedia() {
    setHeroMedia(heroMediaIndex + 1);
  }

  function preloadHeroMedia() {
    heroMediaItems.forEach((item) => {
      if (item.type !== 'image') return;
      const img = new Image();
      img.src = item.src;
    });
  }

  function setupHeroMedia() {
    if (!heroMediaLayers.length || !heroMediaItems.length) return;
    setHeroMedia(0, true);
    preloadHeroMedia();
    if (heroPanel && 'IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => updateHeroExitState(entry.isIntersecting));
      }, { threshold: 0 });
      heroObserver.observe(heroPanel);
    }
    document.addEventListener('visibilitychange', playActiveHeroVideo);
    window.addEventListener('pointermove', playActiveHeroVideo, { passive: true });
    window.addEventListener('touchstart', playActiveHeroVideo, { passive: true });
    window.setInterval(() => {
      const activeLayer = heroMediaLayers[heroLayerIndex];
      const activeVideo = activeLayer ? activeLayer.querySelector('video') : null;
      if (activeVideo && activeVideo.paused) playActiveHeroVideo();
    }, 1200);
  }

  function updateHeroExitState(isVisible) {
    if (heroWasVisible === null) {
      heroWasVisible = isVisible;
      return;
    }
    if (heroWasVisible && !isVisible) advanceHeroMedia();
    heroWasVisible = isVisible;
  }

  // ---------- setup body height to match strip ----------
  function recompute() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    narrow = isNarrow();

    if (narrow) {
      // mobile: revert to natural vertical layout
      document.body.style.height = '';
      strip.style.transform = '';
      totalScroll = 0;
      pinSections = [];
      heroPinned = false;
      heroSweepGeom = null;
      heroPinDistance = 0;
      setHeroPinTransitions(false);
      if (erasPanel) erasPanel.style.setProperty('--eras-copy-y', '0px');
      setAboutProgress(1);
      applyHeroMediaLayout();
      return;
    }

    applyHeroMediaLayout();
    heroSweepGeom = null;

    stripWidth = strip.scrollWidth;
    baseTotalScroll = Math.max(0, stripWidth - vw);

    // Hero pin: hold the hero full-screen for a short budget while the inverted
    // blend sweeps across the name, then release. Desktop horizontal only —
    // disabled under reduced-motion (accessibility guard); narrow viewports never
    // reach here (handled by the early return above).
    heroPinStart = 0;
    heroPinDistance = (heroPanel && !prefersReducedMotion() && HERO_PIN_VH > 0)
      ? Math.round(vh * HERO_PIN_VH)
      : 0;

    const erasFrame = erasPanel ? erasPanel.querySelector('.sn-eras-frame') : null;
    const erasFrameStyle = erasFrame ? window.getComputedStyle(erasFrame) : null;
    const erasContentBottom = erasFrame
      ? Array.from(erasFrame.children).reduce((max, child) => {
          return Math.max(max, child.offsetTop + child.offsetHeight);
        }, 0) + (parseFloat(erasFrameStyle.paddingBottom) || 0)
      : 0;
    const erasScrollable = erasFrame
      ? Math.max(
          0,
          erasFrame.scrollHeight - erasFrame.clientHeight,
          erasContentBottom - erasFrame.clientHeight
        )
      : 0;
    erasPinDistance = erasScrollable > 1
      ? Math.max(erasScrollable * 1.35, Math.min(vh * 0.9, 820))
      : 0;
    erasPinStart = erasPanel
      ? clamp(erasPanel.offsetLeft, 0, baseTotalScroll)
      : 0;
    if (erasPanel && erasPinDistance <= 0) {
      erasPanel.style.setProperty('--eras-copy-y', '0px');
    }

    aboutPinDistance = aboutPanel ? Math.max(vh * 3.2, 2600) : 0;
    aboutPinStart = aboutPanel
      ? clamp(aboutPanel.offsetLeft, 0, baseTotalScroll)
      : 0;

    statementPinDistance = statementPanel ? Math.max(vh * 1.45, 1320) : 0;
    statementPinStart = aboutPanel
      ? aboutPinStart
      : (statementPanel ? clamp(statementPanel.offsetLeft, 0, baseTotalScroll) : 0);

    worksPinDistance = worksPanel
      ? Math.max(0, worksPanel.scrollHeight - worksPanel.clientHeight)
      : 0;
    worksPinStart = worksPanel
      ? clamp(worksPanel.offsetLeft, 0, baseTotalScroll)
      : 0;

    writingPinDistance = writingPanel && writingCount > 1
      ? Math.max(vh * 1.25, (writingCount - 1) * 520)
      : 0;
    writingPinStart = writingPanel
      ? clamp(writingPanel.offsetLeft, 0, baseTotalScroll)
      : 0;

    pressPinDistance = pressPanel && pressCount > 1
      ? Math.max(vh * 1.45, (pressCount - 1) * 270)
      : 0;
    pressPinStart = pressPanel
      ? clamp(pressPanel.offsetLeft, 0, baseTotalScroll)
      : 0;

    pinSections = [
      heroPanel && heroPinDistance > 0 ? {
        id: 'hero',
        x: heroPinStart,
        distance: heroPinDistance,
        apply(progress) {
          setHeroSweep(progress);
        }
      } : null,
      erasPanel && erasPinDistance > 0 ? {
        id: 'eras',
        x: erasPinStart,
        distance: erasPinDistance,
        apply(progress) {
          const shift = -erasScrollable * easeInOut(clamp(progress));
          erasPanel.style.setProperty('--eras-copy-y', shift.toFixed(2) + 'px');
        }
      } : null,
      aboutPanel && aboutPinDistance > 0 ? {
        id: 'about',
        x: aboutPinStart,
        distance: aboutPinDistance,
        apply(progress) {
          setAboutProgress(progress);
        }
      } : null,
      statementPanel && statementPinDistance > 0 ? {
        id: 'statement',
        x: statementPinStart,
        distance: statementPinDistance,
        apply(progress) {
          setStatementProgress(progress);
        }
      } : null,
      worksPanel && worksPinDistance > 0 ? {
        id: 'works',
        x: worksPinStart,
        distance: worksPinDistance,
        apply(progress) {
          worksPanel.scrollTop = clamp(progress) * worksPinDistance;
        }
      } : null,
      writingPanel && writingPinDistance > 0 ? {
        id: 'writing',
        x: writingPinStart,
        distance: writingPinDistance,
        apply(progress) {
          const index = Math.min(
            writingCount - 1,
            Math.floor(clamp(progress) * writingCount * 0.999)
          );
          setActiveWriting(index);
        }
      } : null,
      pressPanel && pressPinDistance > 0 ? {
        id: 'press',
        x: pressPinStart,
        distance: pressPinDistance,
        apply(progress) {
          const index = Math.min(
            pressCount - 1,
            Math.floor(clamp(progress) * pressCount * 0.999)
          );
          setActivePress(index);
        }
      } : null
    ].filter(Boolean).sort((a, b) => a.x - b.x);

    totalScroll = baseTotalScroll + pinSections.reduce((sum, pin) => sum + pin.distance, 0);
    document.body.style.height = (totalScroll + vh) + 'px';
  }

  // ---------- reveals (statement) ----------
  function setupReveals() {
    if (!('IntersectionObserver' in window)) {
      stmtWords.forEach(w => w.classList.add('is-on'));
      return;
    }
    // For horizontal mode the IO root is the viewport (which is the stage),
    // but words live inside the translated strip - IO still fires correctly
    // because IntersectionObserver tracks intersection with the visual viewport.
    const wordObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const idx = stmtWords.indexOf(e.target);
          e.target.style.transitionDelay = (idx * 0.08) + 's';
          e.target.classList.add('is-on');
          wordObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.4, rootMargin: '0px 0px 0px 0px' });
    stmtWords.forEach(w => wordObs.observe(w));
  }

  // ---------- helpers ----------
  function panelProgress(el) {
    // 0..1 progress through a panel based on how its left edge passes
    // through the viewport. 0 when panel.left = vw (just appeared on right);
    // 1 when panel.right = 0 (just left on the left).
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    if (r.right < 0) return 1;
    if (r.left > vw) return 0;
    const denom = vw + r.width;
    return clamp((vw - r.left) / denom);
  }

  function panelLocal(el) {
    // 0..1 across panel width as it scrolls past viewport center
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const centerHit = clamp(-r.left / Math.max(1, r.width - vw));
    return centerHit;
  }

  function mapScrollToX(y) {
    if (!pinSections.length) {
      return clamp(y, 0, baseTotalScroll);
    }

    let extraDistance = 0;
    for (let i = 0; i < pinSections.length; i += 1) {
      const pin = pinSections[i];
      const pinStartY = pin.x + extraDistance;
      const pinEndY = pinStartY + pin.distance;

      if (y < pinStartY) {
        for (let j = i; j < pinSections.length; j += 1) {
          pinSections[j].apply(0);
        }
        return clamp(y - extraDistance, 0, baseTotalScroll);
      }

      if (y <= pinEndY) {
        const progress = (y - pinStartY) / Math.max(1, pin.distance);
        pin.apply(progress);
        for (let j = i + 1; j < pinSections.length; j += 1) {
          pinSections[j].apply(0);
        }
        return pin.x;
      }

      pin.apply(1);
      extraDistance += pin.distance;
    }

    return clamp(y - extraDistance, 0, baseTotalScroll);
  }

  function scrollTargetForPanel(el) {
    if (!el) return 0;
    const x = clamp(el.offsetLeft, 0, baseTotalScroll);
    const targetPin = pinSections.find((pin) => {
      return (pin.id === 'eras' && el === erasPanel) ||
        (pin.id === 'about' && el === aboutPanel) ||
        (pin.id === 'statement' && el === statementPanel) ||
        (pin.id === 'works' && el === worksPanel) ||
        (pin.id === 'writing' && el === writingPanel) ||
        (pin.id === 'press' && el === pressPanel);
    });
    const targetX = targetPin ? targetPin.x : x;
    const extraDistance = pinSections.reduce((sum, pin) => {
      return pin.x < targetX - 0.5 ? sum + pin.distance : sum;
    }, 0);
    return clamp(targetX + extraDistance, 0, totalScroll);
  }

  function setAboutProgress(progress) {
    if (!aboutPanel) return;
    const p = clamp(progress);
    aboutProgress = p;
    // Phase 1 (0 -> 0.45): entry - photo + card slide in.
    // Let the portrait arrive a little ahead of the card so it is visible
    // as soon as the About panel starts to settle into view.
    // Phase 2 (0.45 -> 0.55): hold (intro is fully ready)
    // Phase 3 (0.55 -> 1): exit - about lifts UPWARD off-screen,
    //                      revealing the artist-statement panel beneath.
    const entry = easeInOut(clamp((p + 0.105) / 0.30));
    const cardEntry = easeInOut(clamp((p - 0.08) / 0.30));
    const exit = easeInOut(clamp((p - 0.42) / 0.18));
    aboutPanel.style.setProperty('--about-photo-alpha', entry.toFixed(4));
    aboutPanel.style.setProperty('--about-card-alpha', cardEntry.toFixed(4));
    aboutPanel.style.setProperty('--about-photo-x', ((1 - entry) * 160).toFixed(2) + 'px');
    aboutPanel.style.setProperty('--about-card-x', ((1 - cardEntry) * 160).toFixed(2) + 'px');
    aboutPanel.style.setProperty('--about-exit-y', (exit * -100).toFixed(3) + '%');
    if (statementPanel) {
      statementPanel.style.setProperty('--statement-y', ((1 - exit) * 100).toFixed(3) + '%');
      if (p < 0.999) setStatementTextProgress(0);
    }
    aboutPanel.classList.toggle('is-intro-ready', p >= 0.45 && p <= 0.6);
    aboutPanel.classList.toggle('is-about-pinned', p > 0 && p < 1);
    aboutPanel.classList.toggle('is-about-exited', p >= 0.999);
  }

  // The statement panel sits directly beneath the About panel in the same
  // horizontal slot (z-1, with About on top at z-2). Sliding About upward
  // reveals it. No vertical motion needed on the statement itself - clear
  // any legacy transform so it stays at translateY(0).
  function updateStatementPosition() {
    if (!statementPanel) return;
    if (narrow) {
      statementPanel.style.removeProperty('--statement-y');
      statementPanel.style.removeProperty('--statement-copy-y');
      statementPanel.classList.remove('is-revealing', 'is-revealed');
      return;
    }
    const exit = easeInOut(clamp((aboutProgress - 0.42) / 0.18));
    statementPanel.style.setProperty('--statement-y', ((1 - exit) * 100).toFixed(3) + '%');
    const r = statementPanel.getBoundingClientRect();
    statementPanel.classList.toggle('is-revealing', r.left < vw && r.right > 0);
    statementPanel.classList.toggle('is-revealed', r.left <= 0 && r.right > 0);
  }

  function setStatementProgress(progress) {
    if (!statementPanel) return;
    statementPanel.style.setProperty('--statement-y', '0%');
    setStatementTextProgress(progress);
  }

  function setStatementTextProgress(progress) {
    if (!statementPanel || !statementBody) return;
    const input = clamp(progress);
    const local = input;
    const windowH = Math.max(1, statementBody.clientHeight || vh * 0.45);
    const contentH = Math.max(windowH, statementBody.scrollHeight || windowH);
    const startY = Math.max(64, windowH * 0.09);
    const endY = windowH * 0.72 - contentH;
    const y = lerp(startY, endY, local);
    statementPanel.style.setProperty('--statement-copy-y', y.toFixed(2) + 'px');
    statementPanel.style.setProperty('--statement-copy-progress', local.toFixed(4));
  }

  function writingNoteLabel(index) {
    return text('home.writing.noteAria', 'Show writing note {n}', { n: String(index + 1) });
  }

  function syncWritingLabels() {
    writingDots.forEach((dot, index) => dot.setAttribute('aria-label', writingNoteLabel(index)));
    writingEls.forEach((essay, index) => essay.setAttribute('aria-label', writingNoteLabel(index)));
  }

  function syncActiveHeroMediaLabel() {
    const item = heroMediaItems[heroMediaIndex];
    const activeLayer = heroMediaLayers[heroLayerIndex];
    if (!item || !activeLayer) return;
    const asset = activeLayer.querySelector('.sn-hero-media-asset');
    if (!asset) return;
    const label = heroItemText(item, 'label');
    if (asset.tagName === 'IMG') {
      asset.alt = label;
    } else {
      asset.setAttribute('aria-label', label);
    }
  }

  function syncLocalizedDynamicText() {
    syncDisplayOptions();
    setHeroMediaText(heroMediaItems[heroMediaIndex]);
    syncActiveHeroMediaLabel();
    syncWritingLabels();
    recompute();
    update();
  }

  function setActiveWriting(index) {
    if (!writingEls.length) return;
    const safeIndex = clamp(index, 0, writingEls.length - 1);
    if (safeIndex === lastWritingIdx) return;
    const previousIdx = lastWritingIdx;
    const direction = previousIdx < 0 || safeIndex >= previousIdx ? 'next' : 'prev';
    if (writingPanel) writingPanel.dataset.writingDir = direction;

    writingEls.forEach((essay, ei) => {
      const active = ei === safeIndex;
      const offset = ei - safeIndex;
      const distance = Math.abs(offset);
      const previewSlot = active ? 0 : ((ei - safeIndex + writingEls.length) % writingEls.length);
      essay.style.setProperty('--stack-offset', String(offset));
      essay.style.setProperty('--stack-alpha', String(Math.max(0.16, 0.74 - Math.abs(offset) * 0.16)));
      essay.style.setProperty('--note-alpha', active ? '1' : '0.82');
      essay.style.setProperty('--note-scale', active ? '1' : '0.975');
      essay.style.setProperty('--note-z', active ? '10' : String(writingEls.length - previewSlot));
      essay.dataset.previewSlot = String(previewSlot);
      essay.classList.toggle('is-on', active);
      essay.classList.toggle('is-entering', active && previousIdx >= 0);
      essay.classList.toggle('is-exiting', ei === previousIdx && !active);
      essay.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active) {
        essay.removeAttribute('tabindex');
        essay.removeAttribute('role');
        if (previousIdx >= 0) {
          window.setTimeout(() => essay.classList.remove('is-entering'), 760);
        }
      } else {
        if (ei === previousIdx) {
          window.setTimeout(() => essay.classList.remove('is-exiting'), 820);
        }
        essay.setAttribute('tabindex', '0');
        essay.setAttribute('role', 'button');
        essay.setAttribute('aria-label', writingNoteLabel(ei));
      }
    });
    writingDots.forEach((dot, di) => {
      const active = di === safeIndex;
      dot.classList.toggle('is-on', active);
      if (active) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
    if (writingCounter) {
      writingCounter.textContent =
        String(safeIndex + 1).padStart(2, '0') + ' / ' +
        String(writingCount).padStart(2, '0');
    }
    lastWritingIdx = safeIndex;
  }

  function setActivePress(index) {
    if (!pressQuotes.length) return;
    const safeIndex = clamp(index, 0, pressQuotes.length - 1);
    if (safeIndex === lastPressIdx) return;

    pressQuotes.forEach((quote, qi) => {
      const active = qi === safeIndex;
      quote.classList.toggle('is-on', active);
      quote.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    pressIndex.forEach((item, qi) => item.classList.toggle('is-on', qi === safeIndex));
    if (pressCounter) {
      pressCounter.textContent =
        String(safeIndex + 1).padStart(2, '0') + ' / ' +
        String(pressCount).padStart(2, '0');
    }
    lastPressIdx = safeIndex;
  }

  function setPanelStates() {
    let current = null;
    let closest = Infinity;

    panels.forEach((panel) => {
      const r = panel.getBoundingClientRect();
      const visible = narrow ? (r.bottom > 0 && r.top < vh) : (r.right > 0 && r.left < vw);
      const center = narrow ? r.top + r.height / 2 : r.left + r.width / 2;
      const dist = Math.abs(center - (narrow ? vh : vw) / 2);
      const local = narrow
        ? clamp((vh - r.top) / Math.max(1, vh + r.height))
        : clamp((vw - r.left) / Math.max(1, vw + r.width));

      panel.style.setProperty('--panel-local', local.toFixed(3));
      panel.classList.toggle('is-near', visible);

      if (visible && dist < closest) {
        current = panel;
        closest = dist;
      }
    });

    const currentId = current ? current.id : '';
    if (currentId !== lastPanelId) {
      panels.forEach((panel) => panel.classList.toggle('is-current', panel === current));
      jumpLinks.forEach((link) => {
        const target = link.getAttribute('data-jump');
        link.classList.toggle('is-active', !!target && target === currentId);
      });
      lastPanelId = currentId;
    }
  }

  // ---------- main tick ----------
  function update() {
    scrollY = window.scrollY || window.pageYOffset;
    scrollVel = scrollY - lastScrollY;
    lastScrollY = scrollY;

    if (!narrow) {
      // Vertical page scroll drives horizontal travel, except Works pins
      // while its featured entries scroll vertically.
      currentX = mapScrollToX(clamp(scrollY, 0, totalScroll));
      strip.style.transform = 'translate3d(' + (-currentX).toFixed(2) + 'px,0,0)';
    }

    const verticalMaxScroll = Math.max(
      0,
      Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - vh
    );
    const progressMax = narrow ? verticalMaxScroll : totalScroll;
    const progress = progressMax > 0 ? clamp(scrollY / progressMax) : 0;
    if (progressBar) progressBar.style.width = (progress * 100) + '%';
    if (scrollReadout) {
      scrollReadout.textContent =
        String(Math.round(progress * 100)).padStart(2, '0') + ' / 100';
    }

    setPanelStates();
    updateStatementPosition();

    // ---------- HERO media rotation + parallax ----------
    if (heroPanel) {
      const r = heroPanel.getBoundingClientRect();
      const heroVisible = narrow
        ? r.bottom > 0 && r.top < vh
        : r.right > 0 && r.left < vw;
      updateHeroExitState(heroVisible);

      const heroTravel = Math.max(1, Math.min(narrow ? r.height : r.width, narrow ? vh : vw) * 0.72);
      const heroScrub = narrow
        ? (r.bottom <= 0 ? 1 : r.top >= 0 ? 0 : clamp(-r.top / heroTravel))
        : (r.right <= 0 ? 1 : r.left >= 0 ? 0 : clamp(-r.left / heroTravel));
      setHeroMediaProgress(heroScrub);

      if (r.right > -200 && r.left < vw + 200) {
        // amount of horizontal scroll INTO this panel (0..panelWidth)
        const into = Math.max(0, -r.left);
        parallaxNodes.forEach((n) => {
          const k = parseFloat(n.getAttribute('data-parallax')) || 0;
          // Layers inside the strip already translate with it.
          // Add per-layer offset: positive k => lingers (looks slower);
          // negative k => exits faster.
          const x = into * k;
          n.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
        });
        syncHeroInvertClip();
      }
    }

    // ---------- ROTATING BADGES ----------
    badges.forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.right > -200 && r.left < vw + 200) {
        const deg = scrollY * 0.06;
        b.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)';
      }
    });

    // ---------- WORKS counter ----------
    if (worksPanel && worksCounter && workEls.length) {
      const scrollable = Math.max(0, worksPanel.scrollHeight - worksPanel.clientHeight);
      const local = scrollable > 0 ? clamp(worksPanel.scrollTop / scrollable) : panelLocal(worksPanel);
      const idx = Math.min(workEls.length, Math.max(1, Math.ceil(local * workEls.length)));
      worksCounter.textContent =
        String(idx).padStart(2, '0') + ' / ' +
        String(workEls.length).padStart(2, '0');
    }

    // ---------- CONTACT parallax + nav flip ----------
    if (contactPanel) {
      const r = contactPanel.getBoundingClientRect();
      const contactVisible = narrow ? (r.bottom > 0 && r.top < vh) : (r.right > 0 && r.left < vw);
      if (contactVisible) {
        const local = narrow ? clamp(1 - (r.top / vh)) : clamp(1 - (r.left / vw));
        if (contactSigil) {
          const k = parseFloat(contactSigil.getAttribute('data-parallax-contact')) || 0;
          // sigil drifts inside the panel
          const x = narrow ? 0 : (local - 0.5) * 240 * k;
          contactSigil.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
          contactSigil.style.opacity = clamp(local * 1.5).toFixed(3);
        }
        // flip nav to dark when contact dominates the viewport
        if (narrow ? r.top < vh * 0.42 : r.left < vw * 0.4) {
          nav && nav.setAttribute('data-mode', 'dark');
        } else {
          nav && nav.setAttribute('data-mode', 'light');
        }
      } else {
        nav && nav.setAttribute('data-mode', 'light');
      }
    }

    rafTicking = false;
  }

  let rafTicking = false;
  function onScroll() {
    if (!wheelRaf) wheelTargetY = window.scrollY || window.pageYOffset || 0;
    if (!rafTicking) {
      rafTicking = true;
      requestAnimationFrame(update);
    }
  }

  function scrollableWheelTarget(target, delta, axis = 'y') {
    if (Math.abs(delta) <= 0) return null;
    let node = target;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.nodeType === 1) {
        if (axis === 'y' && node === erasPanel) return null;
        const style = window.getComputedStyle(node);
        const overflow = axis === 'x' ? style.overflowX : style.overflowY;
        const scrollSize = axis === 'x' ? node.scrollWidth : node.scrollHeight;
        const clientSize = axis === 'x' ? node.clientWidth : node.clientHeight;
        const scrollPos = axis === 'x' ? node.scrollLeft : node.scrollTop;
        const canScroll = /(auto|scroll)/.test(overflow) && scrollSize > clientSize + 1;
        if (canScroll) {
          const atStart = scrollPos <= 0;
          const atEnd = scrollPos + clientSize >= scrollSize - 1;
          if ((delta < 0 && !atStart) || (delta > 0 && !atEnd)) return node;
        }
      }
      node = node.parentElement;
    }
    return null;
  }

  function normalizedWheelDelta(ev) {
    const raw = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
    if (ev.deltaMode === 1) return raw * 22;
    if (ev.deltaMode === 2) return raw * Math.max(1, vh);
    const magnitude = Math.abs(raw);
    const boost = magnitude >= 90 ? 1.55 : magnitude >= 36 ? 1.25 : 1;
    return raw * boost;
  }

  function stopWheelSmoothing(syncToViewport = true) {
    if (wheelRaf) {
      cancelAnimationFrame(wheelRaf);
      wheelRaf = 0;
    }
    if (syncToViewport) wheelTargetY = window.scrollY || window.pageYOffset || 0;
  }

  function stepWheelSmoothing() {
    const current = window.scrollY || window.pageYOffset || 0;
    const diff = wheelTargetY - current;
    if (Math.abs(diff) < 0.8) {
      window.scrollTo({ top: wheelTargetY, behavior: 'auto' });
      wheelRaf = 0;
      onScroll();
      return;
    }
    const ease = Math.abs(diff) > vh * 0.7 ? 0.42 : 0.34;
    window.scrollTo({ top: current + diff * ease, behavior: 'auto' });
    onScroll();
    wheelRaf = requestAnimationFrame(stepWheelSmoothing);
  }

  function onWheel(ev) {
    if (narrow || ev.ctrlKey) {
      stopWheelSmoothing();
      return;
    }
    const absX = Math.abs(ev.deltaX);
    const absY = Math.abs(ev.deltaY);
    if (absY >= absX) {
      stopWheelSmoothing();
      return;
    }
    if (scrollableWheelTarget(ev.target, ev.deltaX, 'x')) {
      stopWheelSmoothing(false);
      return;
    }
    const delta = normalizedWheelDelta(ev);
    if (!delta) return;
    ev.preventDefault();
    const maxScroll = totalScroll;
    if (!wheelRaf) wheelTargetY = window.scrollY || window.pageYOffset || 0;
    wheelTargetY = clamp(wheelTargetY + delta, 0, maxScroll);
    if (!wheelRaf) wheelRaf = requestAnimationFrame(stepWheelSmoothing);
  }

  function onResize() {
    // If the user hasn't pinned a preference, re-evaluate auto-default
    // when the viewport changes (rotation, window resize, etc.).
    const stored = readSetting(scrollModeKey);
    if (stored !== 'vertical' && stored !== 'horizontal') {
      const want = autoPrefersVertical();
      if (want !== forceVertical) {
        forceVertical = want;
        syncDisplayOptions();
      }
    }
    narrow = isNarrow();
    stopWheelSmoothing();
    recompute();
    update();
  }

  // ---------- nav jumps: scrollTo a panel's left edge ----------
  function jumpTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    stopWheelSmoothing();
    if (narrow) {
      // vertical layout: scroll element into view normally
      window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
      return;
    }
    if (id === 'about' && aboutPanel && aboutPinDistance > 0) {
      window.scrollTo({ top: scrollTargetForPanel(aboutPanel) + aboutPinDistance * 0.45, behavior: 'smooth' });
      return;
    }
    if (id === 'statement' && aboutPanel && aboutPinDistance > 0) {
      window.scrollTo({
        top: scrollTargetForPanel(aboutPanel) + aboutPinDistance + statementPinDistance * 0.42,
        behavior: 'smooth'
      });
      return;
    }
    const target = scrollTargetForPanel(el);
    window.scrollTo({ top: target, behavior: 'smooth' });
  }
  jumpLinks.forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = a.getAttribute('data-jump');
      jumpTo(id);
    });
  });

  pressIndex.forEach((item) => {
    const index = Number(item.getAttribute('data-press-idx')) || 0;
    item.addEventListener('mouseenter', () => setActivePress(index));
    item.addEventListener('focus', () => setActivePress(index));
    item.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      setActivePress(index);
    });
    item.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      ev.stopPropagation();
      setActivePress(index);
    });
  });

  function jumpToWriting(index) {
    if (!writingPanel || !writingEls[index]) return;
    if (narrow) {
      writingEls[index].scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    const local = writingCount <= 1 ? 0 : index / (writingCount - 1);
    const writingPin = pinSections.find((pin) => pin.id === 'writing');
    const start = writingPin
      ? scrollTargetForPanel(writingPanel)
      : (window.scrollY || window.pageYOffset) + writingPanel.getBoundingClientRect().left;
    const travel = writingPin ? writingPin.distance : Math.max(0, writingPanel.scrollWidth - vw);
    const target = clamp(start + travel * local, 0, totalScroll);
    window.scrollTo({ top: target, behavior: 'smooth' });
  }

  writingDots.forEach((dot, index) => {
    dot.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      setActiveWriting(index);
      jumpToWriting(index);
    });
  });

  writingEls.forEach((essay, index) => {
    essay.addEventListener('click', (ev) => {
      if (essay.classList.contains('is-on') || narrow) return;
      if (shouldIgnorePanelOpen(ev.target)) return;
      ev.preventDefault();
      setActiveWriting(index);
      jumpToWriting(index);
    });
    essay.addEventListener('keydown', (ev) => {
      if (essay.classList.contains('is-on') || narrow) return;
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      if (shouldIgnorePanelOpen(ev.target)) return;
      ev.preventDefault();
      setActiveWriting(index);
      jumpToWriting(index);
    });
  });

  function shouldIgnorePanelOpen(target) {
    if (!target || target.nodeType !== 1) return false;
    return !!target.closest('a, button, input, select, textarea, label, [data-no-panel-link]');
  }

  function isNativeNavigationTarget(panel) {
    return panel && (panel.tagName === 'A' || panel.tagName === 'BUTTON');
  }

  function isRecentTouchPan() {
    return Date.now() - lastTouchPanAt < 520;
  }

  function openPanel(panel) {
    const href = panel.getAttribute('data-panel-link');
    if (href) window.location.href = href;
  }

  panelLinks.forEach((panel) => {
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '0');
    panel.addEventListener('click', (ev) => {
      if (shouldIgnorePanelOpen(ev.target)) return;
      if (narrow && (!isNativeNavigationTarget(panel) || isRecentTouchPan())) return;
      openPanel(panel);
    });
    panel.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      if (shouldIgnorePanelOpen(ev.target)) return;
      if (narrow && !isNativeNavigationTarget(panel)) return;
      ev.preventDefault();
      openPanel(panel);
    });
  });

  function setupDisplayOptions() {
    syncDisplayOptions();
    if (scrollModeToggle) {
      scrollModeToggle.addEventListener('click', () => {
        forceVertical = !forceVertical;
        writeSetting(scrollModeKey, forceVertical ? 'vertical' : 'horizontal');
        syncDisplayOptions();
        narrow = isNarrow();
        recompute();
        update();
      });
    }
    if (mouseEffectToggle) {
      mouseEffectToggle.addEventListener('click', () => {
        mouseEffectEnabled = !mouseEffectEnabled;
        writeSetting(mouseEffectKey, mouseEffectEnabled ? 'on' : 'off');
        syncDisplayOptions();
        window.dispatchEvent(new CustomEvent('sw:ripple-toggle', {
          detail: { enabled: mouseEffectEnabled }
        }));
      });
    }
  }

  // ---------- init ----------
  function init() {
    setupDisplayOptions();
    window.addEventListener('sw:i18n-change', syncLocalizedDynamicText);
    setupReveals();
    setupHeroMedia();
    setupHeroMediaToggle();
    setActiveWriting(0);
    setActivePress(0);
    syncWritingLabels();

    recompute();
    update();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', (ev) => {
      const touch = ev.touches && ev.touches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });
    window.addEventListener('touchmove', (ev) => {
      const touch = ev.touches && ev.touches[0];
      if (!touch) return;
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);
      if (dy > 8 && dy >= dx) lastTouchPanAt = Date.now();
    }, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', () => {
      const id = window.location.hash ? window.location.hash.slice(1) : '';
      if (id) jumpTo(id);
    });
    if (worksPanel) worksPanel.addEventListener('scroll', onScroll, { passive: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { recompute(); update(); });
    }
    // recompute once after layout/images settle
    setTimeout(() => { recompute(); update(); }, 400);
    if (window.location.hash) {
      setTimeout(() => jumpTo(window.location.hash.slice(1)), 120);
      setTimeout(() => jumpTo(window.location.hash.slice(1)), 650);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
