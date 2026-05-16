/* ============================================================
   Shavonne Wong — Scroll Narrative
   Horizontal site engine:
   - Body height is inflated to match the strip width.
   - On scroll, the strip translates X by -scrollY.
   - Per-section "horizontal progress" drives parallax, era-rail
     fill, press crossfade, and the dark contact flip.
   ============================================================ */

(function () {
  'use strict';

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const isNarrow = () => window.matchMedia('(max-width: 900px)').matches;

  // ---------- DOM refs ----------
  const nav = document.querySelector('[data-nav]');
  const progressBar = document.querySelector('[data-progress]');
  const scrollReadout = document.querySelector('[data-scroll-readout]');

  const stage = document.querySelector('[data-stage]');
  const strip = document.querySelector('[data-strip]');
  const panels = Array.from(document.querySelectorAll('.sn-panel'));
  const panelLinks = Array.from(document.querySelectorAll('[data-panel-link]'));

  const parallaxNodes = Array.from(document.querySelectorAll('[data-parallax]'));
  const stmtWords = Array.from(document.querySelectorAll('.sn-stmt-body [data-reveal]'));

  const heroPanel = document.querySelector('[data-panel="hero"]');
  const heroPlateVideo = document.querySelector('.sn-plate-video');
  const heroVideo = document.querySelector('.sn-plate-video video');
  const heroFrame = document.querySelector('[data-video-frame]');
  const statementPanel = document.querySelector('[data-panel="statement"]');
  const erasPanel = document.querySelector('[data-eras]');
  const erasTrack = document.querySelector('.sn-eras-track');
  const eraFill = document.querySelector('[data-era-fill]');
  const eraEls = Array.from(document.querySelectorAll('[data-era]'));
  const eraMarkers = Array.from(document.querySelectorAll('[data-era-marker]'));
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
  let eraPinStart = 0;
  let eraPinDistance = 0;
  let aboutPinStart = 0;
  let aboutPinDistance = 0;
  let worksPinStart = 0;
  let worksPinDistance = 0;
  let writingPinStart = 0;
  let writingPinDistance = 0;
  let pressPinStart = 0;
  let pressPinDistance = 0;
  let pinSections = [];
  let currentX = 0;
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let scrollY = 0;
  let lastScrollY = 0;
  let scrollVel = 0;
  let lastWritingIdx = -1;
  let lastPressIdx = -1;
  let lastEraIdx = -1;
  let lastPanelId = '';
  let narrow = isNarrow();
  const heroFrameCount = 45;
  const heroFrames = Array.from({ length: heroFrameCount }, (_, i) => {
    return 'assets/videos/everything-yet-nothing-scrub/everything-yet-nothing-' +
      String(i + 1).padStart(3, '0') + '.jpg';
  });
  const heroStartFrame = 1;
  const heroStartIdx = Math.min(heroFrames.length - 1, Math.max(0, heroStartFrame - 1));
  let heroFrameBuildStarted = false;
  let heroFramesReady = false;
  let lastHeroFrameIdx = -1;
  let lastHeroProgress = 0;

  function buildHeroFrames() {
    if (!heroFrame || heroFrameBuildStarted) return;
    heroFrameBuildStarted = true;
    heroFramesReady = true;
    heroFrame.src = heroFrames[heroStartIdx];
    heroFrame.setAttribute('data-frame-count', String(heroFrames.length));
    heroFrame.setAttribute('data-frame-index', String(heroStartIdx + 1));
    if (heroPlateVideo) heroPlateVideo.classList.add('is-frame-ready');
    heroFrames.forEach((src, idx) => {
      if (idx === heroStartIdx) return;
      const img = new Image();
      img.src = src;
    });
    setHeroFrameProgress(lastHeroProgress);
  }

  function setHeroFrameProgress(progress) {
    lastHeroProgress = clamp(progress);
    if (heroFrame) {
      const scale = (1 + lastHeroProgress * 0.035).toFixed(4);
      const lift = (-2.4 * lastHeroProgress).toFixed(3) + '%';
      heroFrame.style.transform = 'translate3d(0,' + lift + ',0) scale(' + scale + ')';
    }
    if (heroFramesReady && heroFrames.length && heroFrame) {
      const scrubRange = Math.max(0, heroFrames.length - 1 - heroStartIdx);
      const idx = Math.min(
        heroFrames.length - 1,
        heroStartIdx + Math.round(lastHeroProgress * scrubRange)
      );
      if (idx !== lastHeroFrameIdx) {
        heroFrame.src = heroFrames[idx];
        heroFrame.setAttribute('data-frame-index', String(idx + 1));
        lastHeroFrameIdx = idx;
      }
      return;
    }

    if (heroVideo) {
      const scale = (1 + lastHeroProgress * 0.025).toFixed(4);
      const lift = (-1.6 * lastHeroProgress).toFixed(3) + '%';
      heroVideo.style.transform = 'translate3d(0,' + lift + ',0) scale(' + scale + ')';
    }
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
      if (erasTrack) erasTrack.style.transform = '';
      totalScroll = 0;
      pinSections = [];
      setAboutProgress(1);
      eraEls.forEach((era) => {
        era.style.transform = '';
        era.style.opacity = '';
        era.style.zIndex = '';
      });
      return;
    }

    stripWidth = strip.scrollWidth;
    baseTotalScroll = Math.max(0, stripWidth - vw);

    if (erasPanel && erasTrack && eraEls.length) {
      const eraViewport = erasTrack.parentElement || erasPanel;
      const lastEraCard = eraEls[eraEls.length - 1];
      const naturalTravel = Math.max(0, erasTrack.scrollHeight - eraViewport.clientHeight);
      const lastCardTravel = lastEraCard ? Math.max(0, lastEraCard.offsetTop - 8) : 0;
      eraPinDistance = Math.max(vh * 0.75, naturalTravel, lastCardTravel);
      eraPinStart = clamp(erasPanel.offsetLeft, 0, baseTotalScroll);
    } else {
      eraPinDistance = 0;
      eraPinStart = 0;
    }

    aboutPinDistance = aboutPanel ? Math.max(vh * 0.9, 720) : 0;
    aboutPinStart = aboutPanel
      ? clamp(aboutPanel.offsetLeft, 0, baseTotalScroll)
      : 0;

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
      erasPanel && eraPinDistance > 0 ? {
        id: 'eras',
        x: eraPinStart,
        distance: eraPinDistance,
        apply(progress) {
          setEraProgress(progress);
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
    // body height = total horizontal distance + one viewport (so the last
    // scroll position equals stripWidth and the strip ends fully visible)
    document.body.style.height = (totalScroll + vh) + 'px';
  }

  // ---------- reveals (statement) ----------
  function setupReveals() {
    if (!('IntersectionObserver' in window)) {
      stmtWords.forEach(w => w.classList.add('is-on'));
      return;
    }
    // For horizontal mode the IO root is the viewport (which is the stage),
    // but words live inside the translated strip — IO still fires correctly
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

  function eraPanelProgress(el) {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    if (r.right < 0) return 1;
    if (r.left > vw) return 0;
    return clamp((vw - r.left) / Math.max(1, vw * 0.82));
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

  function hasPin(id) {
    return pinSections.some(pin => pin.id === id);
  }

  function setAboutProgress(progress) {
    if (!aboutPanel) return;
    const local = easeInOut(clamp(progress));
    const cardLocal = easeInOut(clamp((progress - 0.18) / 0.82));
    aboutPanel.style.setProperty('--about-photo-alpha', local.toFixed(4));
    aboutPanel.style.setProperty('--about-card-alpha', cardLocal.toFixed(4));
    aboutPanel.style.setProperty('--about-photo-x', ((1 - local) * 160).toFixed(2) + 'px');
    aboutPanel.style.setProperty('--about-card-x', ((1 - cardLocal) * 160).toFixed(2) + 'px');
    aboutPanel.classList.toggle('is-intro-ready', progress >= 0.995);
    aboutPanel.classList.toggle('is-about-pinned', progress > 0 && progress < 1);
  }

  function setEraProgress(progress) {
    if (!erasPanel) return;
    const local = clamp(progress);
    erasPanel.style.setProperty('--era-progress', local.toFixed(4));
    if (eraFill) {
      const pct = (local * 100).toFixed(2) + '%';
      eraFill.style.width = pct;
      eraFill.style.height = '100%';
    }

    if (eraEls.length) {
      applyEraScroll(local);
      const position = local * Math.max(1, eraEls.length - 1);
      const i = Math.min(
        eraEls.length - 1,
        Math.round(position)
      );
      setActiveEra(i);
      applyEraScroll(local);
    }
  }

  function applyEraScroll(progress) {
    if (!erasTrack || !eraEls.length) return;
    const local = clamp(progress);
    const viewport = erasTrack.parentElement || erasPanel;
    const naturalTravel = Math.max(0, erasTrack.scrollHeight - viewport.clientHeight);
    const lastCard = eraEls[eraEls.length - 1];
    const lastCardTravel = lastCard ? Math.max(0, lastCard.offsetTop - 8) : 0;
    const travel = Math.max(naturalTravel, lastCardTravel);
    erasTrack.style.transform = 'translate3d(0,' + (-travel * local).toFixed(2) + 'px,0)';
  }

  function setActiveEra(index) {
    if (!eraEls.length || index === lastEraIdx) return;
    const previousIdx = lastEraIdx;
    const direction = previousIdx < 0 || index >= previousIdx ? 'next' : 'prev';
    if (erasPanel) erasPanel.dataset.eraDir = direction;
    eraEls.forEach((era, ei) => {
      const active = ei === index;
      const offset = ei - index;
      era.style.setProperty('--era-offset', String(offset));
      era.classList.toggle('is-active', active);
      era.classList.toggle('is-next', offset === 1);
      era.classList.toggle('is-prev', offset < 0);
      era.classList.remove('is-entering');
      era.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    eraMarkers.forEach((marker, mi) => {
      const active = mi === index;
      marker.classList.toggle('is-active', active);
      if (active) {
        marker.setAttribute('aria-current', 'true');
      } else {
        marker.removeAttribute('aria-current');
      }
    });
    lastEraIdx = index;
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
        essay.setAttribute('aria-label', 'Show writing note ' + String(ei + 1));
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
      const visible = r.right > 0 && r.left < vw;
      const center = r.left + r.width / 2;
      const dist = Math.abs(center - vw / 2);
      const local = clamp((vw - r.left) / Math.max(1, vw + r.width));

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

    const progress = totalScroll > 0 ? clamp(scrollY / totalScroll) : 0;
    if (progressBar) progressBar.style.width = (progress * 100) + '%';
    if (scrollReadout) {
      scrollReadout.textContent =
        String(Math.round(progress * 100)).padStart(2, '0') + ' / 100';
    }

    setPanelStates();

    // ---------- HERO frame scrub + parallax ----------
    if (heroPanel) {
      const r = heroPanel.getBoundingClientRect();
      const heroTravel = Math.max(1, Math.min(r.width, vw) * 0.72);
      const heroScrub = r.right <= 0
        ? 1
        : r.left >= 0
          ? 0
          : clamp(-r.left / heroTravel);
      setHeroFrameProgress(heroScrub);

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

    // ---------- CAREER TIMELINE — era-rail fill ----------
    if (!narrow && erasPanel && erasTrack && !hasPin('eras')) {
      setEraProgress(eraPanelProgress(erasPanel));
    }

    // ---------- WORKS counter ----------
    if (worksPanel && worksCounter && workEls.length) {
      const scrollable = Math.max(0, worksPanel.scrollHeight - worksPanel.clientHeight);
      const local = scrollable > 0 ? clamp(worksPanel.scrollTop / scrollable) : panelLocal(worksPanel);
      const idx = Math.min(workEls.length, Math.max(1, Math.ceil(local * workEls.length)));
      worksCounter.textContent =
        String(idx).padStart(2, '0') + ' / ' +
        String(workEls.length).padStart(2, '0');
    }

    // ---------- TICKER scroll-velocity boost ----------
    if (tickerTrack) {
      const kick = clamp(Math.abs(scrollVel) * 0.008, 0, 1);
      const dur = Math.max(150, 210 - kick * 35);
      tickerTrack.style.animationDuration = dur.toFixed(2) + 's';
    }

    // ---------- CONTACT parallax + nav flip ----------
    if (contactPanel) {
      const r = contactPanel.getBoundingClientRect();
      if (r.right > 0 && r.left < vw) {
        const local = clamp(1 - (r.left / vw));
        if (contactSigil) {
          const k = parseFloat(contactSigil.getAttribute('data-parallax-contact')) || 0;
          // sigil drifts horizontally inside the panel
          const x = (local - 0.5) * 240 * k;
          contactSigil.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
          contactSigil.style.opacity = clamp(local * 1.5).toFixed(3);
        }
        // flip nav to dark when contact dominates the viewport
        if (r.left < vw * 0.4) {
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
    if (!rafTicking) {
      rafTicking = true;
      requestAnimationFrame(update);
    }
  }

  function onWheel(ev) {
    if (narrow || ev.ctrlKey) return;
    const delta = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
    if (!delta) return;
    ev.preventDefault();
    const next = clamp((window.scrollY || window.pageYOffset) + delta, 0, totalScroll);
    window.scrollTo({ top: next, behavior: 'auto' });
  }

  function onResize() {
    recompute();
    update();
  }

  // ---------- nav jumps: scrollTo a panel's left edge ----------
  function jumpTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (narrow) {
      // vertical layout: scroll element into view normally
      window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
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

  function jumpToEra(index) {
    if (!erasPanel || !eraEls[index]) return;
    if (narrow) {
      eraEls[index].scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }

    const panelRect = erasPanel.getBoundingClientRect();
    const local = eraEls.length <= 1 ? 0 : index / (eraEls.length - 1);
    const eraPin = pinSections.find(pin => pin.id === 'eras');
    const start = eraPin ? scrollTargetForPanel(erasPanel) : scrollY + panelRect.left;
    const travel = eraPin ? eraPin.distance : Math.max(0, panelRect.width - vw);
    const target = clamp(start + travel * local, 0, totalScroll);
    window.scrollTo({ top: target, behavior: 'smooth' });
  }

  eraMarkers.forEach((marker) => {
    marker.addEventListener('click', () => {
      const index = Number(marker.getAttribute('data-era-index')) || 0;
      setActiveEra(index);
      jumpToEra(index);
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
    const writingPin = pinSections.find(pin => pin.id === 'writing');
    const start = writingPin ? scrollTargetForPanel(writingPanel) : scrollY + writingPanel.getBoundingClientRect().left;
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
      ev.preventDefault();
      ev.stopPropagation();
      setActiveWriting(index);
      jumpToWriting(index);
    });
    essay.addEventListener('keydown', (ev) => {
      if (essay.classList.contains('is-on') || narrow) return;
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      ev.stopPropagation();
      setActiveWriting(index);
      jumpToWriting(index);
    });
  });

  function shouldIgnorePanelOpen(target) {
    return !!(target && target.closest && target.closest('a, button, input, textarea, select, [data-no-panel-link]'));
  }

  function openPanel(panel) {
    const url = panel.getAttribute('data-panel-link');
    if (!url) return;
    window.location.href = url;
  }

  panelLinks.forEach((panel) => {
    panel.setAttribute('tabindex', '0');
    panel.addEventListener('click', (ev) => {
      if (shouldIgnorePanelOpen(ev.target)) return;
      openPanel(panel);
    });
    panel.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      if (shouldIgnorePanelOpen(ev.target)) return;
      ev.preventDefault();
      openPanel(panel);
    });
  });

  // ---------- init ----------
  function init() {
    setupReveals();
    buildHeroFrames();
    setActiveEra(0);
    setActiveWriting(0);
    setActivePress(0);

    recompute();
    update();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
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
