(function () {
  const DATA_URL = '/assets/data/3d-single-works.json';
  const els = {
    filters: document.querySelector('[data-single-work-filters]'),
    grid: document.querySelector('[data-single-work-groups]'),
    count: document.querySelector('[data-single-work-count]'),
    modal: document.querySelector('[data-work-modal]'),
    modalBody: document.querySelector('[data-work-modal-body]'),
    jsonLd: document.querySelector('#single-works-jsonld')
  };

  const clusterMeta = {
    'the-watched-self': {
      label: 'The Watched Self',
      focus: 'Identity, self-image, the gap between projected and felt',
      lede: 'These works are about the difference between what I projected and what I felt — and about the experience of being watched while doing both. Some are direct studies in self-presentation: the I Am (Not) trilogy names a feeling and undermines it; Kin, Beauty, Glow, Goldfish hold portraits at the surface where mood becomes posture. Others extend outward — Panopticon, The Mirror World, The Illusion of Connection — into surveillance, mirroring, the construction of being seen. Made one at a time across 2021–2023, the works share a pulse.'
    },
    'stories-older-than-me': {
      label: 'Stories Older Than Me',
      focus: 'Heritage, mythology, stories already being told',
      lede: 'A small cluster of works grounded in stories I grew up with — the Year of the Tiger trilogy made for the 2022 lunar new year, and The Legend Of The White Snake from the same period. These pieces are unusual in my practice in that the source material is older than I am. Both treat the figure as a vessel for a story already being told, rather than building one from scratch. They sit alongside the rest of my work as a quieter, more rooted register.'
    },
    'moons-and-flowers': {
      label: 'Moons and Flowers',
      focus: 'Lunar, floral, oceanic studies — natural forms as carriers of feeling',
      lede: 'The works in this cluster all reach for natural forms — moons, flowers, oceans, fire, light — as carriers of feeling I could not say directly. The three trilogies (Stellae, Lunah Moon, Lilium in Pearls) were each made as series, returning to the same image-vocabulary three times to see what changed. The single pieces sit in the same register. This is the gentlest body of work in my practice — the one closest to lyric poetry.'
    },
    'held-in-time': {
      label: 'Held in Time',
      focus: 'Suspended states, transience, weight',
      lede: 'These works hold still. The Invisible March of Time pair tries to render duration itself as visible; the others sit in adjacent territory — moments that pause, postures that will not resolve, weights that do not lift. I am using “cluster” loosely here: these were not made as a series, but read together they ask the same question — what does it mean to hold a moment open, knowing it will end, and not look away?'
    },
    'on-the-surface': {
      label: 'On the Surface',
      focus: 'Material, illusion, the constructed image',
      lede: 'The smallest of the five clusters and the most technical. The Shimmering Veil trilogy started as a study in material — how light behaves on a synthetic surface that pretends to be fabric, water, skin. Whirlwind of the Waking Dream and Beyond The Surface live in the same family: works where the question is what the image is made of, rather than what it depicts. These are the works closest to my photography training — the part of my practice still concerned with the surface of things.'
    }
  };

  const clusterOrder = [
    'the-watched-self',
    'stories-older-than-me',
    'moons-and-flowers',
    'held-in-time',
    'on-the-surface'
  ];

  const state = {
    items: [],
    mode: 'clusters',
    filter: 'all'
  };
  let hashTargetSynced = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function matches(item) {
    if (state.filter === 'all') return true;
    if (state.filter.startsWith('year:')) return String(item.year) === state.filter.slice(5);
    if (state.filter.startsWith('status:')) return item.status === state.filter.slice(7);
    return true;
  }

  function statusClass(item) {
    return `sp-status-pill is-${String(item.status || '').toLowerCase().replace(/\s+/g, '-')}`;
  }

  function tileHtml(item, index) {
    const num = String(index + 1).padStart(2, '0');
    const content = `
      <figure>
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="eager" decoding="async">
        <figcaption>
          <span class="sp-tile-num">${num}</span>
          <span class="sp-tile-title">${escapeHtml(item.title)}</span>
          <span class="sp-tile-status">${escapeHtml(item.year)}</span>
          <span class="${statusClass(item)}">${escapeHtml(item.status)}</span>
        </figcaption>
      </figure>
    `;
    if (item.project_url) {
      return `<li class="sp-series-tile" id="${escapeHtml(item.id)}"><a href="${escapeHtml(item.project_url)}">${content}</a></li>`;
    }
    return `<li class="sp-series-tile" id="${escapeHtml(item.id)}"><button type="button" data-work-id="${escapeHtml(item.id)}">${content}</button></li>`;
  }

  function sortWorks(a, b) {
    if (a.series_cluster === b.series_cluster && a.series_position && b.series_position) {
      return a.series_position - b.series_position;
    }
    return Number(b.year || 0) - Number(a.year || 0) || a.title.localeCompare(b.title);
  }

  function renderFilters() {
    if (!els.filters) return;
    const years = [...new Set(state.items.map((item) => String(item.year)).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
    const statuses = [...new Set(state.items.map((item) => item.status).filter(Boolean))].sort();
    const filterChips = [
      ['all', 'All'],
      ...years.map((year) => [`year:${year}`, year]),
      ...statuses.map((status) => [`status:${status}`, status])
    ];
    const modeChips = [
      ['clusters', 'Clusters'],
      ['contact', 'Contact sheet']
    ];
    els.filters.innerHTML = `
      <div class="sp-work-filter-group" role="group" aria-label="View mode">
        ${modeChips.map(([value, label]) => (
          `<button class="wk-chip${state.mode === value ? ' is-active' : ''}" type="button" data-view-mode="${escapeHtml(value)}">${escapeHtml(label)}</button>`
        )).join('')}
      </div>
      <div class="sp-work-filter-group" role="group" aria-label="Filter works">
        ${filterChips.map(([value, label]) => (
      `<button class="wk-chip${state.filter === value ? ' is-active' : ''}" type="button" data-work-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`
        )).join('')}
      </div>
    `;
  }

  function clusterSectionHtml(clusterId, items, indexOffset) {
    const meta = clusterMeta[clusterId];
    if (!meta || !items.length) return '';
    return `
      <section class="sp-work-cluster" data-cluster="${escapeHtml(clusterId)}">
        <div class="sp-work-cluster-head">
          <h3 class="sp-kicker">${escapeHtml(meta.label)} &middot; ${items.length} works</h3>
          <p class="sp-work-cluster-focus">${escapeHtml(meta.focus)}</p>
          <p class="sp-work-cluster-copy">${escapeHtml(meta.lede)}</p>
        </div>
        <ol class="sp-series-grid sp-work-cluster-grid">
          ${items.sort(sortWorks).map((item, index) => tileHtml(item, indexOffset + index)).join('')}
        </ol>
      </section>
    `;
  }

  function renderWorks() {
    if (!els.grid) return;
    const filtered = state.items.filter(matches);
    let index = 0;
    const sections = [];

    if (state.mode === 'contact') {
      const contactItems = filtered.sort(sortWorks);
      if (contactItems.length) {
        sections.push(`
          <section class="sp-work-cluster" data-cluster="contact-sheet">
            <div class="sp-work-cluster-head">
              <h3 class="sp-kicker">Contact sheet &middot; ${contactItems.length} works</h3>
              <p class="sp-work-cluster-focus">A flat view of the full body of work.</p>
            </div>
          <ol class="sp-series-grid">
              ${contactItems.map((item, itemIndex) => tileHtml(item, itemIndex)).join('')}
          </ol>
          </section>
        `);
      }
    } else {
      clusterOrder.forEach((clusterId) => {
        const items = filtered.filter((item) => item.series_cluster === clusterId);
        if (!items.length) return;
        sections.push(clusterSectionHtml(clusterId, items, index));
        index += items.length;
      });
    }

    els.grid.innerHTML = sections.join('') || '<p class="sp-copy">No works match this filter.</p>';
    if (els.count) els.count.textContent = `${filtered.length} works`;
    syncHashTarget();
  }

  function syncHashTarget() {
    if (hashTargetSynced || !window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    hashTargetSynced = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
  }

  function renderJsonLd() {
    if (!els.jsonLd) return;
    const origin = 'https://shavonnewong.art';
    els.jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: '3D Single Works',
      creator: { '@type': 'Person', name: 'Shavonne Wong' },
      dateCreated: '2020/2024',
      artMedium: 'Single-channel 3D video',
      url: `${origin}/works/3d-single-works/`,
      image: `${origin}/assets/one-of-ones/natures-muse.jpg`,
      description: 'A body of single-channel 3D video works by Shavonne Wong on identity, mythology, nature, time, surface, and digitally constructed bodies.',
      hasPart: state.items.map((item) => ({
        '@type': 'VisualArtwork',
        name: item.title,
        dateCreated: String(item.year),
        artMedium: item.medium,
        duration: item.duration || undefined,
        image: item.image?.startsWith('/') ? `${origin}${item.image}` : item.image
      }))
    });
  }

  function modalMarketHtml(item) {
    const pieces = [];
    if (item.marketplace_url && /^https?:\/\//i.test(item.marketplace_url)) {
      pieces.push(`<a href="${escapeHtml(item.marketplace_url)}">Marketplace &rarr;</a>`);
    }
    if (item.chain) pieces.push(`Chain: ${escapeHtml(item.chain)}`);
    return pieces.length ? `<p class="sw-modal-market">${pieces.join(' &middot; ')}</p>` : '';
  }

  function openModal(item) {
    if (!els.modal || !els.modalBody) return;
    const media = item.video_url
      ? `<video src="${escapeHtml(item.video_url)}" poster="${escapeHtml(item.image)}" controls playsinline></video>`
      : `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">`;
    els.modalBody.innerHTML = `
      <figure class="sw-modal-media">${media}</figure>
      <div class="sw-modal-copy">
        <button class="sw-modal-close" type="button" data-modal-close>Close</button>
        <p class="sp-kicker">${escapeHtml(item.status)} &middot; ${escapeHtml(item.year)}</p>
        <h3 class="sw-modal-title">${escapeHtml(item.title)}</h3>
        <p class="sw-modal-meta">${escapeHtml(item.medium)}${item.duration ? ` &middot; ${escapeHtml(item.duration)}` : ''}${item.edition_info ? ` &middot; ${escapeHtml(item.edition_info)}` : ''}</p>
        <p class="sw-modal-description">${escapeHtml(item.brief_description || '')}</p>
        ${modalMarketHtml(item)}
      </div>
    `;
    els.modal.hidden = false;
  }

  function closeModal() {
    if (!els.modal) return;
    const video = els.modal.querySelector('video');
    if (video) video.pause();
    els.modal.hidden = true;
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const filter = event.target.closest('[data-work-filter]');
      if (filter) {
        state.filter = filter.dataset.workFilter || 'all';
        renderFilters();
        renderWorks();
        return;
      }

      const mode = event.target.closest('[data-view-mode]');
      if (mode) {
        state.mode = mode.dataset.viewMode || 'clusters';
        renderFilters();
        renderWorks();
        return;
      }

      const workButton = event.target.closest('[data-work-id]');
      if (workButton) {
        const item = state.items.find((entry) => entry.id === workButton.dataset.workId);
        if (item) openModal(item);
        return;
      }

      if (event.target.closest('[data-modal-close]') || event.target.closest('[data-modal-backdrop]')) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  bindEvents();
  fetch(DATA_URL, { cache: 'no-store' })
    .then((response) => response.json())
    .then((items) => {
      state.items = items;
      renderFilters();
      renderWorks();
      renderJsonLd();
    })
    .catch(() => {
      if (els.grid) els.grid.innerHTML = '<p class="sp-copy">The contact sheet is temporarily unavailable. Please check back soon.</p>';
    });
})();
