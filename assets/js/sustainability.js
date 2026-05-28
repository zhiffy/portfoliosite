(function () {
  const monthIndex = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
  };

  function hideExpiredDates() {
    const now = new Date();
    document.querySelectorAll('[data-end-date]').forEach((el) => {
      const end = new Date(`${el.dataset.endDate}T23:59:59`);
      if (!Number.isNaN(end.getTime()) && end < now) {
        el.style.display = 'none';
      }
    });
  }

  function parseUpdatedStamp(text) {
    const match = text.match(/Updated\s+([A-Za-z]+)\s+(\d{4})/i);
    if (!match) return null;
    const month = monthIndex[match[1].toLowerCase()];
    const year = Number(match[2]);
    if (month === undefined || Number.isNaN(year)) return null;
    return new Date(year, month, 1);
  }

  function hideStaleUpdatedStamps() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);

    document.querySelectorAll('.sp-updated').forEach((el) => {
      const stampDate = parseUpdatedStamp(el.textContent || '');
      if (stampDate && stampDate < cutoff) {
        el.style.display = 'none';
      }
    });
  }

  function cleanStatusFallbacks() {
    document.querySelectorAll('.sp-plate-status').forEach((el) => {
      const raw = el.textContent || '';
      const cleaned = raw.replace(/\s*\((?:null|undefined|NaN|\s*)\s+remaining\)/i, '');
      if (cleaned !== raw) el.textContent = cleaned;
    });
  }

  function setupVideoControls() {
    const isMobile = window.matchMedia('(max-width: 760px)').matches;

    document.querySelectorAll('video').forEach((video) => {
      if (isMobile) {
        video.removeAttribute('autoplay');
        video.autoplay = false;
        video.pause();
      } else if (video.hasAttribute('data-desktop-autoplay')) {
        video.hidden = false;
        const poster = video.parentElement ? video.parentElement.querySelector('.sp-hero-poster') : null;
        if (poster) poster.hidden = true;
        video.setAttribute('autoplay', '');
        video.autoplay = true;
        video.play().catch(() => {});
      }
    });

    document.querySelectorAll('.sp-plate').forEach((plate) => {
      const video = plate.querySelector('.sp-plate-video');
      if (!video) return;

      const play = plate.querySelector('.sp-plate-play');
      const sound = plate.querySelector('.sp-plate-sound');
      const media = plate.querySelector('.sp-plate-media');

      const playVideo = () => {
        video.load();
        video.play().catch(() => {});
        plate.classList.add('is-playing');
        if (play) play.setAttribute('aria-label', 'Pause video');
      };

      const pauseVideo = () => {
        video.pause();
        plate.classList.remove('is-playing');
        if (play) play.setAttribute('aria-label', 'Play video');
      };

      if (play) {
        play.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (video.paused) playVideo();
          else pauseVideo();
        });
      }

      if (media) {
        media.addEventListener('click', () => {
          if (video.paused) playVideo();
        });
      }

      if (sound) {
        sound.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          video.muted = !video.muted;
          sound.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
          sound.textContent = video.muted ? 'Sound' : 'Mute';
        });
      }
    });

    document.querySelectorAll('.sp-project-hero-media').forEach((hero) => {
      const video = hero.querySelector('video');
      if (!video) return;

      const sound = hero.querySelector('.sp-hero-sound');
      const full = hero.querySelector('.sp-hero-fullscreen');

      if (sound) {
        sound.addEventListener('click', () => {
          video.muted = !video.muted;
          sound.setAttribute('aria-label', video.muted ? 'Turn hero sound on' : 'Turn hero sound off');
          sound.textContent = video.muted ? 'Sound' : 'Mute';
        });
      }

      if (full) {
        full.addEventListener('click', () => {
          if (video.requestFullscreen) video.requestFullscreen();
        });
      }
    });
  }

  function renderSeriesIndexes() {
    document.querySelectorAll('[data-series-src]').forEach((grid) => {
      fetch(grid.dataset.seriesSrc)
        .then((response) => response.json())
        .then((items) => {
          grid.innerHTML = items.map((item, index) => {
            const image = item.image.startsWith('/') || item.image.startsWith('http')
              ? item.image
              : `/assets/by-proxy/${item.image}`;
            const url = item.marketplace_url || 'https://opensea.io/collection/by-proxy-by-shavonne-wong-and-lenne-chai';
            const num = String(index + 1).padStart(2, '0');
            return `
              <li class="sp-series-tile">
                <a href="${url}">
                  <figure>
                    <img src="${image}" alt="By Proxy: ${item.title}" loading="lazy">
                    <figcaption>
                      <span class="sp-tile-num">${num}</span>
                      <span class="sp-tile-title">${item.title}</span>
                      <span class="sp-tile-status">${item.status}</span>
                    </figcaption>
                  </figure>
                </a>
              </li>
            `;
          }).join('');
        })
        .catch(() => {
          grid.insertAdjacentHTML(
            'afterend',
            '<p class="sp-gap-note">Context coming. <a href="mailto:studio@shavonnewong.art?subject=Context request">Ask the studio &rarr;</a></p>'
          );
        });
    });
  }

  hideExpiredDates();
  hideStaleUpdatedStamps();
  cleanStatusFallbacks();
  setupVideoControls();
  renderSeriesIndexes();
})();
