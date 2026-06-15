(function () {
  const DEFAULT_COLLECTION_URL = 'https://opensea.io/collection/by-proxy-by-shavonne-wong-and-lenne-chai';
  const DEFAULT_ENDPOINT = '/api/by-proxy-listings';

  const indexes = Array.from(document.querySelectorAll('[data-bp-listings-endpoint]'))
    .filter((element) => element.querySelector('[data-cell]'));
  const standaloneBanners = Array.from(document.querySelectorAll('[data-bp-listing-banner][data-bp-listings-endpoint]'));
  if (!indexes.length && !standaloneBanners.length) return;

  function isLocalhost() {
    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
  }

  function collectionUrl(target) {
    return target.getAttribute('data-bp-collection-url') || DEFAULT_COLLECTION_URL;
  }

  function tokenFromUrl(url) {
    const match = String(url || '').match(/\/(\d+)(?:[/?#]|$)/);
    return match ? match[1] : '';
  }

  function cellTitle(cell) {
    return cell.getAttribute('data-title') || cell.querySelector('.bp2-cell-title')?.textContent?.trim() || 'Listed work';
  }

  function cellNumber(cell) {
    return cell.querySelector('.bp2-cell-num')?.textContent?.trim() || '';
  }

  function setBanner(banner, text, href, strongText) {
    if (!banner) return;
    banner.href = href || collectionUrl(banner);
    banner.textContent = text;
    if (strongText) {
      banner.append(' ');
      const strong = document.createElement('strong');
      strong.textContent = strongText;
      banner.append(strong);
    }
  }

  function setCellStatus(cell, status) {
    const overlay = cell.querySelector('.bp2-cell-overlay');
    const dot = cell.querySelector('.bp2-cell-dot');
    const existingStatus = cell.querySelector('.bp2-cell-status');

    cell.dataset.status = status;
    dot?.classList.toggle('bp2-cell-dot--listed', status === 'listed');
    dot?.classList.toggle('bp2-cell-dot--sold', status !== 'listed');

    if (status === 'listed') {
      if (!existingStatus && overlay) {
        const statusLabel = document.createElement('span');
        statusLabel.className = 'bp2-cell-status';
        statusLabel.textContent = 'Listed';
        overlay.prepend(statusLabel);
      }
    } else {
      existingStatus?.remove();
    }
  }

  function resetListedState(cells) {
    cells.forEach((cell) => setCellStatus(cell, 'sold'));
  }

  async function loadListings(endpoint) {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Listings endpoint returned ${response.status}`);
    return response.json();
  }

  function listingLabel(count, target) {
    const singular = target.getAttribute('data-bp-listing-singular') || 'listed work';
    const plural = target.getAttribute('data-bp-listing-plural') || 'listed works';
    if (count === 1) return `1 ${singular}`;
    return `${count} ${plural}`;
  }

  async function applyBannerOnly(banner) {
    const endpoint = banner.getAttribute('data-bp-listings-endpoint') || DEFAULT_ENDPOINT;
    const fallback = collectionUrl(banner);

    if (isLocalhost()) {
      setBanner(banner, 'Live listing check unavailable.', fallback, 'View OpenSea');
      return;
    }

    try {
      const payload = await loadListings(endpoint);
      const listings = Array.isArray(payload?.listings) ? payload.listings : [];
      const href = payload?.collection_url || fallback;

      if (listings.length) {
        setBanner(banner, 'Currently on OpenSea', href, listingLabel(listings.length, banner));
        return;
      }

      setBanner(banner, 'No works currently listed.', href);
    } catch {
      setBanner(banner, 'Live listing check unavailable.', fallback, 'View OpenSea');
    }
  }

  async function applyListings(index) {
    const banner = index.querySelector('[data-bp-listing-banner]');
    const endpoint = index.getAttribute('data-bp-listings-endpoint') || DEFAULT_ENDPOINT;
    const fallback = collectionUrl(index);
    const cells = Array.from(index.querySelectorAll('[data-cell]'));

    resetListedState(cells);

    if (isLocalhost()) {
      setBanner(banner, 'Live listing check unavailable.', fallback, 'View OpenSea');
      return;
    }

    try {
      const payload = await loadListings(endpoint);
      const listings = Array.isArray(payload?.listings) ? payload.listings : [];
      const listedTokens = new Set(
        listings
          .map((listing) => String(listing?.token_id || ''))
          .filter(Boolean)
      );

      const listedCells = cells.filter((cell) => listedTokens.has(tokenFromUrl(cell.href)));
      listedCells.forEach((cell) => setCellStatus(cell, 'listed'));

      if (listedCells.length === 1) {
        const cell = listedCells[0];
        const tokenId = tokenFromUrl(cell.href);
        const listing = listings.find((item) => String(item?.token_id) === tokenId);
        const number = cellNumber(cell);
        const label = `${cellTitle(cell)}${number ? `, #${Number(number)}` : ''}`;
        setBanner(banner, 'Listed work', listing?.url || cell.href, label);
        return;
      }

      if (listedCells.length > 1) {
        setBanner(banner, 'Listed works', payload?.collection_url || fallback, `${listedCells.length} currently listed`);
        return;
      }

      setBanner(banner, 'No works currently listed.', payload?.collection_url || fallback);
    } catch {
      setBanner(banner, 'Live listing check unavailable.', fallback, 'View OpenSea');
    }
  }

  indexes.forEach(applyListings);
  standaloneBanners.forEach(applyBannerOnly);
})();
