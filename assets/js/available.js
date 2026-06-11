(function () {
  const DATA_URL = '/assets/data/available.json';
  const MERGED_URL = '/assets/data/available.merged.json';
  const CACHE_KEY = 'sw-available-merged-v6';
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const FALLBACK_COUNT_MAX_AGE = 92 * 24 * 60 * 60 * 1000;

  const state = {
    items: [],
    filters: {
      type: 'all',
      price: 'all',
      medium: 'all',
      chain: 'all'
    },
    hideSold: false,
    sort: 'recent'
  };

  const els = {
    grid: document.querySelector('[data-available-grid]'),
    empty: document.querySelector('[data-available-empty]'),
    count: document.querySelector('[data-available-count]'),
    filterbar: document.querySelector('[data-available-filterbar]'),
    sort: document.querySelector('[data-available-sort]'),
    hideSold: document.querySelector('[data-hide-sold]'),
    jsonLd: document.querySelector('#av-jsonld') || document.querySelector('script[type="application/ld+json"]')
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizePayload(payload) {
    if (Array.isArray(payload)) return { items: payload, generatedAt: null };
    if (payload && Array.isArray(payload.items)) {
      return {
        items: payload.items,
        generatedAt: payload.generated_at || payload.cached_at || payload.updated_at || null
      };
    }
    return { items: [], generatedAt: null };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  async function fetchWithTimeout(url, options = {}, timeout = 3500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  function readCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || !Array.isArray(cached.items)) return null;
      if (Date.now() - Number(cached.cached_at || 0) > CACHE_TTL) return null;
      return cached.items;
    } catch {
      return null;
    }
  }

  function writeCache(items) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        cached_at: Date.now(),
        items
      }));
    } catch {
      // sessionStorage can fail in private contexts; the page can still render.
    }
  }

  function dateIsFresh(dateValue) {
    if (!dateValue) return false;
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= FALLBACK_COUNT_MAX_AGE;
  }

  function applyFallbackCounts(item) {
    const next = { ...item };
    if (next.edition_type === 'series' && typeof next.series_available !== 'number') {
      if (typeof next.series_available_fallback === 'number' && dateIsFresh(next.fallback_updated)) {
        next.series_available = next.series_available_fallback;
        next.availability_count_source = 'fallback';
      }
    }
    if (next.edition_type === 'edition' && typeof next.edition_remaining !== 'number') {
      if (typeof next.edition_remaining_fallback === 'number' && dateIsFresh(next.fallback_updated)) {
        next.edition_remaining = next.edition_remaining_fallback;
        next.availability_count_source = 'fallback';
      }
    }
    return next;
  }

  async function loadBaseline() {
    try {
      const merged = normalizePayload(await fetchJson(MERGED_URL));
      if (merged.items.length) {
        const generated = merged.generatedAt ? new Date(merged.generatedAt).getTime() : 0;
        if (generated && Date.now() - generated <= CACHE_TTL) {
          return { items: merged.items.map(applyFallbackCounts), needsRuntime: false };
        }
        // Stale merged data should not override the hand-maintained source file.
      }
    } catch {
      // A merged file is optional. The hand-maintained inventory is the fallback.
    }

    const base = normalizePayload(await fetchJson(DATA_URL));
    return { items: base.items, needsRuntime: true };
  }

  async function fetchOpenSeaListedCount(source) {
    if (!source.collection_slug) throw new Error('Missing OpenSea collection slug');
    let next = '';
    let page = 0;
    let listingCount = 0;
    const tokenIds = new Set();
    const contract = (source.contract || '').toLowerCase();

    while (page < 5) {
      const params = new URLSearchParams({ limit: '200' });
      if (next) params.set('next', next);
      const url = `https://api.opensea.io/api/v2/listings/collection/${encodeURIComponent(source.collection_slug)}/all?${params.toString()}`;
      const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`OpenSea returned ${response.status}`);
      const data = await response.json();
      const listings = Array.isArray(data.listings) ? data.listings : [];
      listingCount += listings.length;

      listings.forEach((listing) => {
        const offers = listing?.protocol_data?.parameters?.offer || [];
        offers.forEach((offer) => {
          const token = String(offer.token || '').toLowerCase();
          const identifier = offer.identifierOrCriteria;
          if ((!contract || token === contract) && identifier !== undefined && identifier !== null) {
            tokenIds.add(String(identifier));
          }
        });
      });

      next = data.next || '';
      if (!next || listings.length === 0) break;
      page += 1;
    }

    return tokenIds.size || listingCount;
  }

  function findNumberDeep(input, keys) {
    const queue = [input];
    const wanted = new Set(keys);
    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      for (const [key, value] of Object.entries(current)) {
        if (wanted.has(key) && value !== null && value !== undefined && value !== '') {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) return parsed;
        }
        if (value && typeof value === 'object') queue.push(value);
      }
    }
    return null;
  }

  async function fetchManifoldRemaining(source) {
    if (!source.api_url && (!source.marketplace_contract || !source.listing_id)) {
      throw new Error('Missing Manifold listing source');
    }
    const network = String(source.network || source.chain_id || '');
    const base = network === '10'
      ? 'https://optimism.marketplace.api.manifoldxyz.dev'
      : 'https://marketplace.api.manifoldxyz.dev';
    const url = source.api_url || `${base}/listing/${source.marketplace_contract}/${source.listing_id}`;
    const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Manifold returned ${response.status}`);
    const data = await response.json();
    const totalAvailable = findNumberDeep(data, ['totalAvailable', 'total_available', 'tokenMax', 'maxSupply']);
    const totalSold = findNumberDeep(data, ['totalSold', 'total_sold', 'sold', 'minted']);
    if (totalAvailable === null || totalSold === null) throw new Error('Missing Manifold inventory fields');
    return Math.max(0, totalAvailable - totalSold);
  }

  async function reconcileItem(item) {
    const source = item.availability_source;
    if (!source) return applyFallbackCounts(item);

    try {
      if (source.provider === 'opensea' && item.edition_type === 'series') {
        const count = await fetchOpenSeaListedCount(source);
        return {
          ...item,
          series_available: Math.min(count, Number(item.series_total || count)),
          availability_count_source: 'live'
        };
      }
      if (source.provider === 'manifold' && item.edition_type === 'edition') {
        return {
          ...item,
          edition_remaining: await fetchManifoldRemaining(source),
          availability_count_source: 'live'
        };
      }
    } catch {
      return applyFallbackCounts(item);
    }

    return applyFallbackCounts(item);
  }

  async function loadInitialItems() {
    const cached = readCache();
    if (cached) return { items: cached.map(applyFallbackCounts), needsRuntime: false };

    const baseline = await loadBaseline();
    const items = baseline.items.map(applyFallbackCounts);
    if (!baseline.needsRuntime) writeCache(items);
    return { items, needsRuntime: baseline.needsRuntime };
  }

  async function refreshLiveCounts(items) {
    const reconciled = await Promise.all(items.map(reconcileItem));
    writeCache(reconciled);
    return reconciled;
  }

  function typeLabel(type) {
    if (type === 'unique') return '1/1';
    if (type === 'series') return '1/1/X';
    return 'Editions';
  }

  function statusText(item) {
    if (item.edition_type === 'unique') {
      if (item.status === 'sold') return 'Unique \u00b7 sold';
      if (item.status === 'listed') return 'Unique \u00b7 listed';
      if (item.status === 'not_for_sale') return 'Unique \u00b7 not for sale';
      return 'Unique \u00b7 available';
    }
    if (item.edition_type === 'series') {
      if (typeof item.series_available === 'number') {
        if (item.series_available <= 0) return 'Sold out';
        return `${item.series_available} of ${item.series_total} available`;
      }
      return `${item.series_total} unique works`;
    }
    if (item.edition_type === 'edition') {
      if (typeof item.edition_remaining === 'number') {
        if (item.edition_remaining <= 0) return 'Sold out';
        return `Edition of ${item.edition_total} \u00b7 ${item.edition_remaining} remaining`;
      }
      if (item.status === 'listed') return `Edition of ${item.edition_total} \u00b7 listed`;
      return `Edition of ${item.edition_total}`;
    }
    return '';
  }

  function isSold(item) {
    return item.status === 'sold'
      || item.status === 'sold_out'
      || (item.edition_type === 'series' && typeof item.series_available === 'number' && item.series_available <= 0)
      || (item.edition_type === 'edition' && typeof item.edition_remaining === 'number' && item.edition_remaining <= 0);
  }

  function availabilityRank(item) {
    if (item.status === 'not_for_sale') return 1;
    return isSold(item) ? 1 : 0;
  }

  function waitlistUrl(item) {
    return `mailto:studio@shavonnewong.art?subject=${encodeURIComponent(`Waitlist \u2014 ${item.title}`)}`;
  }

  function inquireUrl(item) {
    return item.primary_action?.url || `mailto:studio@shavonnewong.art?subject=${encodeURIComponent(`Acquisition \u2014 ${item.title}`)}`;
  }

  function actionHtml(item, sold) {
    if (sold) {
      return `<a class="av-card-primary" href="${escapeHtml(waitlistUrl(item))}">Join the waitlist for similar work &rarr;</a>`;
    }
    const action = item.edition_type === 'series'
      ? { label: 'Browse the series', url: item.series_section_url || item.primary_action?.url }
      : item.primary_action;
    if (!action) return '';
    const label = action.type === 'inquire' ? 'Talk to the artist directly' : action.label;
    const url = action.type === 'inquire' ? inquireUrl(item) : action.url;
    return `<a class="av-card-primary" href="${escapeHtml(url)}">${escapeHtml(label)} &rarr;</a>`;
  }

  function signalText(item) {
    if (item.recently_sold_count) {
      const sold = Number(item.recently_sold_count);
      return `${sold} sold in the last 30 days`;
    }
    if (!item.added) return '';
    const added = new Date(`${item.added}T00:00:00`);
    const now = new Date();
    if (!Number.isNaN(added.getTime()) && added.getFullYear() === now.getFullYear() && added.getMonth() === now.getMonth()) {
      return 'Added this month';
    }
    return '';
  }

  function parentLine(item) {
    if (item.edition_type === 'series') return '<span class="av-card-parent">Series \u00b7 1/1/X</span>';
    const parent = item.parent_project;
    if (!parent?.url || !parent?.title) return '';
    return `<span class="av-card-parent">From <a href="${escapeHtml(parent.url)}">${escapeHtml(parent.title)}</a> &rarr;</span>`;
  }

  function verificationLine(item) {
    const pieces = [];
    if (item.verification?.url && item.verification?.label) {
      pieces.push(`<a href="${escapeHtml(item.verification.url)}">${escapeHtml(item.verification.label)} &rarr;</a>`);
    }
    if (item.chain) pieces.push(`Chain: ${escapeHtml(item.chain)}`);
    if (!pieces.length) return '';
    return `<p class="av-card-verify">${pieces.join(' \u00b7 ')}</p>`;
  }

  function cardHtml(item) {
    const sold = isSold(item);
    const mediaTags = (item.medium_tags || []).join(' ');
    const classes = ['av-card'];
    if (item.edition_type === 'series') classes.push('av-card-series');
    if (sold) classes.push('is-sold');
    const signal = signalText(item);
    return `
      <article id="${escapeHtml(item.id)}" class="${classes.join(' ')}" data-type="${escapeHtml(item.edition_type)}" data-medium="${escapeHtml(mediaTags)}" data-price="${escapeHtml(item.price_band || '')}" data-status="${sold ? 'sold' : escapeHtml(item.status || 'available')}" data-chain="${escapeHtml(item.chain || '')}" data-added="${escapeHtml(item.added || '')}" data-parent-project="${escapeHtml(item.parent_project?.title || item.title)}">
        <figure class="av-card-media">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.image_alt || item.title)}" loading="eager" decoding="async">
        </figure>
        <div class="av-card-meta">
          ${parentLine(item)}
          <h3 class="av-card-title">${escapeHtml(item.title)}</h3>
          <div class="av-card-line">
            <span class="av-card-year">${escapeHtml(item.year)}</span>
            <span class="av-card-medium">${escapeHtml(item.medium)}</span>
          </div>
          <div class="av-card-status">${escapeHtml(statusText(item))}</div>
          ${item.price_display ? `<div class="av-card-priceband">${escapeHtml(item.price_display)}</div>` : ''}
          <div class="av-card-actions">${actionHtml(item, sold)}</div>
          ${verificationLine(item)}
          ${signal ? `<p class="av-card-signal">${escapeHtml(signal)}</p>` : ''}
        </div>
      </article>
    `;
  }

  function matchesFilters(item) {
    const filters = state.filters;
    if (filters.type !== 'all' && item.edition_type !== filters.type) return false;
    if (filters.price !== 'all' && item.price_band !== filters.price) return false;
    if (filters.medium !== 'all' && !(item.medium_tags || []).includes(filters.medium)) return false;
    if (filters.chain !== 'all' && item.chain !== filters.chain) return false;
    if (state.hideSold && isSold(item)) return false;
    return true;
  }

  function sortItems(items) {
    const next = [...items];
    if (state.sort === 'project') {
      next.sort((a, b) => {
        const parentA = a.parent_project?.title || a.title;
        const parentB = b.parent_project?.title || b.title;
        const byProject = parentA.localeCompare(parentB);
        if (byProject) return byProject;
        if (typeof a.project_order === 'number' && typeof b.project_order === 'number') {
          return a.project_order - b.project_order;
        }
        const byAvailability = availabilityRank(a) - availabilityRank(b);
        if (byAvailability) return byAvailability;
        return a.title.localeCompare(b.title);
      });
      return next;
    }
    next.sort((a, b) => {
      const byAvailability = availabilityRank(a) - availabilityRank(b);
      if (byAvailability) return byAvailability;
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearA !== yearB) return yearB - yearA;
      const dateA = new Date(`${a.added || '1900-01-01'}T00:00:00`).getTime();
      const dateB = new Date(`${b.added || '1900-01-01'}T00:00:00`).getTime();
      return dateB - dateA || a.title.localeCompare(b.title);
    });
    return next;
  }

  function updateHeaderCount(items) {
    if (!els.count) return;
    const projects = new Set(items.map((item) => item.parent_project?.title || item.title));
    const workLabel = items.length === 1 ? 'work' : 'works';
    const projectLabel = projects.size === 1 ? 'project' : 'projects';
    els.count.textContent = `${items.length} ${workLabel} across ${projects.size} ${projectLabel}`;
  }

  function updateEmptyState(total, visible) {
    if (!els.empty) return;
    if (total === 0) {
      els.empty.innerHTML = 'Currently sold out. New work releasing soon. Talk to me directly about commissions or studio visits: <a href="mailto:studio@shavonnewong.art">studio@shavonnewong.art</a>.';
      els.empty.hidden = false;
      if (els.filterbar) els.filterbar.hidden = true;
      return;
    }
    if (visible === 0) {
      els.empty.innerHTML = 'No works match this filter. <a href="#" data-reset-filters>Reset filters &rarr;</a>';
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;
  }

  function syncChips() {
    document.querySelectorAll('.av-chip[data-filter-key]').forEach((chip) => {
      const key = chip.dataset.filterKey;
      const active = state.filters[key] === chip.dataset.filterValue;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', String(active));
    });
  }

  function configureChainFilters(items) {
    const chains = new Set(items.map((item) => item.chain).filter(Boolean));
    document.querySelectorAll('[data-filter-group="chain"]').forEach((group) => {
      group.hidden = chains.size <= 1;
    });
    document.querySelectorAll('.av-chip[data-filter-key="chain"]').forEach((chip) => {
      chip.hidden = chains.size <= 1 || (chip.dataset.filterValue !== 'all' && !chains.has(chip.dataset.filterValue));
    });
    document.querySelectorAll('[data-chain-separator]').forEach((separator) => {
      separator.hidden = chains.size <= 1;
    });
    if (chains.size <= 1) state.filters.chain = 'all';
  }

  function renderJsonLd(items) {
    if (!els.jsonLd) return;
    const origin = 'https://shavonnewong.art';
    const itemListElement = items.map((item, index) => {
      const sold = isSold(item);
      const url = item.edition_type === 'series'
        ? item.series_section_url
        : (item.primary_action?.url || item.parent_project?.url || '/works/available/');
      const offer = {
        '@type': 'Offer',
        availability: sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        seller: { '@type': 'Person', name: 'Shavonne Wong' },
        validFrom: item.added || undefined,
        url
      };
      if (item.price_display && /^\$/.test(item.price_display)) {
        offer.price = item.price_display.replace(/[^0-9.]/g, '');
        offer.priceCurrency = 'USD';
      }
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'VisualArtwork',
          name: item.title,
          creator: { '@type': 'Person', name: 'Shavonne Wong' },
          dateCreated: String(item.year),
          artMedium: item.medium,
          image: item.image && item.image.startsWith('/') ? `${origin}${item.image}` : item.image,
          url: item.parent_project?.url ? `${origin}${item.parent_project.url}` : `${origin}/works/available/`,
          offers: offer
        }
      };
    });

    els.jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Available works - Shavonne Wong',
      url: `${origin}/works/available/`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement
      }
    });
  }

  function render() {
    const visible = sortItems(state.items.filter(matchesFilters));
    if (els.grid) {
      els.grid.innerHTML = visible.map(cardHtml).join('');
    }
    syncChips();
    updateHeaderCount(state.items);
    updateEmptyState(state.items.length, visible.length);
    renderJsonLd(state.items);
  }

  function resetFilters() {
    state.filters = { type: 'all', price: 'all', medium: 'all', chain: 'all' };
    state.hideSold = false;
    if (els.hideSold) els.hideSold.checked = false;
    render();
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const reset = event.target.closest('[data-reset-filters]');
      if (reset) {
        event.preventDefault();
        resetFilters();
        return;
      }

      const toggle = event.target.closest('[data-menu-toggle]');
      if (toggle) {
        const menu = toggle.closest('.av-menu');
        const open = !menu.classList.contains('is-open');
        document.querySelectorAll('.av-menu.is-open').forEach((item) => item.classList.remove('is-open'));
        menu.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        return;
      }

      const chip = event.target.closest('.av-chip[data-filter-key]');
      if (chip) {
        state.filters[chip.dataset.filterKey] = chip.dataset.filterValue;
        render();
        return;
      }

      if (!event.target.closest('.av-menu')) {
        document.querySelectorAll('.av-menu.is-open').forEach((menu) => {
          menu.classList.remove('is-open');
          const menuToggle = menu.querySelector('[data-menu-toggle]');
          if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        });
      }
    });

    if (els.sort) {
      els.sort.addEventListener('change', () => {
        state.sort = els.sort.value;
        render();
      });
    }

    if (els.hideSold) {
      els.hideSold.addEventListener('change', () => {
        state.hideSold = els.hideSold.checked;
        render();
      });
    }
  }

  bindEvents();
  loadInitialItems()
    .then(({ items, needsRuntime }) => {
      state.items = items;
      configureChainFilters(state.items);
      render();
      if (!needsRuntime) return null;
      return refreshLiveCounts(items).then((reconciled) => {
        state.items = reconciled;
        configureChainFilters(state.items);
        render();
        return null;
      });
    })
    .catch(() => {
      // Listing data failed to load. Keep the static server-rendered inventory
      // visible instead of wiping it, and say so plainly.
      if (els.count) els.count.textContent = 'Live listing data is unavailable right now; the inventory below may not reflect current availability.';
    });
})();
