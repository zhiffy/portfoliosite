(function () {
  // ============================================================
  // By Proxy — Series catalog
  // Populates the #available grid from /assets/data/by-proxy.json
  // with status filters and a per-work detail modal. Mirrors the
  // 3d-single-works.js pattern.
  // ============================================================

  const grid = document.querySelector('[data-series-src], [data-bp-series-src]');
  if (!grid) return;
  const DATA_URL = grid.getAttribute('data-series-src') || grid.getAttribute('data-bp-series-src') || '/assets/data/by-proxy.json';
  const filterHost = document.querySelector('[data-series-filterbar]');
  const countHost = document.querySelector('[data-series-count]');

  const ASSET_BASE = '/assets/by-proxy/';

  const state = {
    items: [],
    filter: 'all'
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&amp;/g, '&')
      .replace(/&middot;/g, '·')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeStatus(raw) {
    const s = String(raw || '').toLowerCase();
    if (s.includes('available')) return 'available';
    if (s.includes('sold')) return 'sold';
    return 'other';
  }

  function statusLabel(item) {
    const norm = normalizeStatus(item.status);
    if (norm === 'available') return 'Available';
    if (norm === 'sold') return 'Sold';
    return String(item.status || '').replace(/&middot;/g, '·');
  }

  function imageUrl(item) {
    const img = item.image || '';
    if (img.startsWith('/') || img.startsWith('http')) return img;
    return ASSET_BASE + img;
  }

  function matches(item) {
    if (state.filter === 'all') return true;
    return normalizeStatus(item.status) === state.filter;
  }

  function tileHtml(item) {
    const norm = normalizeStatus(item.status);
    const availClass = norm === 'available' ? 'wk-avail--available'
      : norm === 'sold' ? 'wk-avail--sold' : 'wk-avail--not-for-sale';
    const numLabel = item.id ? `#${escapeHtml(item.id)}` : '';
    return `
      <li class="sp-series-tile bp-tile" data-status="${escapeHtml(norm)}" id="bp-${escapeHtml(item.id)}">
        <button type="button" data-work-id="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.title)}">
          <figure>
            <img src="${escapeHtml(imageUrl(item))}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">
          </figure>
          <figcaption>
            <span class="bp-tile-num">${numLabel}</span>
            <span class="bp-tile-title">${escapeHtml(item.title)}</span>
            <span class="wk-avail ${availClass}">
              <span class="wk-avail-dot" aria-hidden="true"></span>
              <span class="wk-avail-label">${escapeHtml(statusLabel(item))}</span>
            </span>
          </figcaption>
        </button>
      </li>
    `;
  }

  function renderFilters() {
    if (!filterHost) return;
    const counts = state.items.reduce((acc, item) => {
      const k = normalizeStatus(item.status);
      acc[k] = (acc[k] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    }, {});
    const chips = [
      ['all', 'All works', counts.all || 0],
      ['available', 'Available', counts.available || 0],
      ['sold', 'Sold', counts.sold || 0]
    ];
    filterHost.innerHTML = chips
      .filter(([key, , n]) => key === 'all' || n > 0)
      .map(([key, label, n]) => `
        <button class="wk-chip${state.filter === key ? ' is-active' : ''}" type="button" data-series-filter="${escapeHtml(key)}" aria-pressed="${state.filter === key ? 'true' : 'false'}">
          ${escapeHtml(label)}<span>&middot; ${n}</span>
        </button>
      `).join('');
  }

  function renderGrid() {
    const filtered = state.items.filter(matches);
    grid.innerHTML = filtered.length
      ? filtered.map(tileHtml).join('')
      : '<li class="sp-copy">No works match this filter.</li>';
    if (countHost) {
      const total = state.items.length;
      const showing = filtered.length;
      countHost.textContent = showing === total ? `${total} works` : `${showing} of ${total} works`;
    }
  }

  function openModal(item) {
    const modal = document.querySelector('[data-bp-modal]');
    const body = document.querySelector('[data-bp-modal-body]');
    if (!modal || !body) return;
    const norm = normalizeStatus(item.status);
    const availClass = norm === 'available' ? 'wk-avail--available'
      : norm === 'sold' ? 'wk-avail--sold' : 'wk-avail--not-for-sale';
    const links = [];
    if (item.marketplace_url) links.push(`<a href="${escapeHtml(item.marketplace_url)}">View on OpenSea &rarr;</a>`);
    if (item.etherscan_url) links.push(`<a href="${escapeHtml(item.etherscan_url)}">Verify on Etherscan &rarr;</a>`);
    const linksHtml = links.length ? `<p class="sw-modal-market">${links.join(' &middot; ')} &middot; Chain: Ethereum</p>` : '';
    const acquireHtml = norm === 'available'
      ? `<p class="sw-modal-acquire">For acquisitions: <a href="mailto:studio@shavonnewong.art?subject=Acquisition%20-%20By%20Proxy%20${encodeURIComponent(item.title || '')}">studio@shavonnewong.art</a></p>`
      : '';
    body.innerHTML = `
      <figure class="sw-modal-media">
        <img src="${escapeHtml(imageUrl(item))}" alt="${escapeHtml(item.title)}">
      </figure>
      <div class="sw-modal-copy">
        <button class="sw-modal-close" type="button" data-bp-modal-close>Close</button>
        <p class="sp-kicker">By Proxy &middot; 2022 &middot; ${item.id ? '#' + escapeHtml(item.id) : ''}</p>
        <h3 class="sw-modal-title">${escapeHtml(item.title)}</h3>
        <p class="sw-modal-meta">CGI and digital photography &middot; unique 1/1</p>
        <p class="sw-modal-avail">
          <span class="wk-avail ${availClass}">
            <span class="wk-avail-dot" aria-hidden="true"></span>
            <span class="wk-avail-label">${escapeHtml(statusLabel(item))}</span>
          </span>
        </p>
        ${acquireHtml}
        ${linksHtml}
      </div>
    `;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.querySelector('[data-bp-modal]');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const filterBtn = event.target.closest('[data-series-filter]');
      if (filterBtn) {
        state.filter = filterBtn.getAttribute('data-series-filter') || 'all';
        renderFilters();
        renderGrid();
        return;
      }
      const workBtn = event.target.closest('[data-work-id]');
      if (workBtn) {
        const id = workBtn.getAttribute('data-work-id');
        const item = state.items.find((it) => String(it.id) === String(id));
        if (item) openModal(item);
        return;
      }
      if (event.target.closest('[data-bp-modal-close]') || event.target.closest('[data-bp-modal-backdrop]')) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  bindEvents();
  fetch(DATA_URL, { cache: 'no-store' })
    .then((r) => r.ok ? r.json() : Promise.reject(r.status))
    .then((items) => {
      state.items = items;
      renderFilters();
      renderGrid();
    })
    .catch(() => {
      grid.innerHTML = '<li class="sp-copy">The series catalog is temporarily unavailable.</li>';
    });
})();
