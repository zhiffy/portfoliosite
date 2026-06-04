(function () {
  const COLLECTION_URL = 'https://opensea.io/collection/by-proxy-by-shavonne-wong-and-lenne-chai';

  const index = document.querySelector('[data-bp-listings-endpoint]');
  if (!index) return;

  const banner = document.querySelector('[data-bp-listing-banner]');
  const endpoint = index.getAttribute('data-bp-listings-endpoint') || '/api/by-proxy-listings';
  const cells = Array.from(index.querySelectorAll('[data-cell]'));

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

  function setBanner(text, href, strongText) {
    if (!banner) return;
    banner.href = href || COLLECTION_URL;
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

  function resetListedState() {
    cells.forEach((cell) => setCellStatus(cell, 'sold'));
  }

  async function loadListings() {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Listings endpoint returned ${response.status}`);
    return response.json();
  }

  async function applyListings() {
    resetListedState();

    try {
      const payload = await loadListings();
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
        setBanner('Listed work', listing?.url || cell.href, label);
        return;
      }

      if (listedCells.length > 1) {
        setBanner('Listed works', payload?.collection_url || COLLECTION_URL, `${listedCells.length} currently listed`);
        return;
      }

      setBanner('No works currently listed.', payload?.collection_url || COLLECTION_URL);
    } catch {
      setBanner('View current listings on OpenSea.', COLLECTION_URL);
    }
  }

  applyListings();
})();
