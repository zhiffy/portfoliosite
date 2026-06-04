const COLLECTION_SLUG = 'by-proxy-by-shavonne-wong-and-lenne-chai';
const CONTRACT_ADDRESS = '0x46ac8540d698167fcbb9e846511beb8cf8af9bd8';
const COLLECTION_URL = `https://opensea.io/collection/${COLLECTION_SLUG}`;
const OPEN_SEA_URL = `https://api.opensea.io/api/v2/listings/collection/${COLLECTION_SLUG}/all`;
const MAX_PAGES = 5;

function setJsonHeaders(response, status = 200) {
  response.status(status);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
}

function getOfferItems(listing) {
  const offer = listing?.protocol_data?.parameters?.offer;
  if (Array.isArray(offer)) return offer;
  const asset = listing?.maker_asset_bundle?.assets?.[0];
  return asset ? [asset] : [];
}

function extractTokenId(listing) {
  for (const item of getOfferItems(listing)) {
    const token = String(item?.token || item?.asset_contract?.address || '').toLowerCase();
    const identifier = item?.identifierOrCriteria ?? item?.token_id ?? item?.identifier;
    if ((!token || token === CONTRACT_ADDRESS) && identifier !== undefined && identifier !== null && identifier !== '') {
      return String(identifier);
    }
  }
  return null;
}

function extractPrice(listing) {
  const price = listing?.price?.current || listing?.current_price || listing?.price;
  const value = price?.value ?? price?.amount ?? listing?.base_price;
  const decimals = Number(price?.decimals ?? price?.currency?.decimals ?? listing?.payment_token?.decimals ?? 18);
  const currency = price?.currency || listing?.payment_token || {};
  const symbol = currency.symbol || currency.name || null;
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || !Number.isFinite(decimals)) {
    return { value: null, currency: symbol };
  }

  return {
    value: numeric / (10 ** decimals),
    currency: symbol
  };
}

async function fetchOpenSeaPage(apiKey, next) {
  const params = new URLSearchParams({ limit: '200' });
  if (next) params.set('next', next);

  const response = await fetch(`${OPEN_SEA_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'x-api-key': apiKey
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenSea returned ${response.status}${body ? `: ${body.slice(0, 180)}` : ''}`);
  }

  return response.json();
}

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'GET') {
    setJsonHeaders(response, 405);
    response.setHeader('Allow', 'GET, OPTIONS');
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    setJsonHeaders(response, 503);
    response.end(JSON.stringify({
      error: 'OpenSea API key is not configured.',
      collection_url: COLLECTION_URL,
      listings: [],
      listed_token_ids: []
    }));
    return;
  }

  try {
    const listingsByToken = new Map();
    let next = '';
    let page = 0;

    do {
      const payload = await fetchOpenSeaPage(apiKey, next);
      const listings = Array.isArray(payload?.listings) ? payload.listings : [];

      for (const listing of listings) {
        const tokenId = extractTokenId(listing);
        if (!tokenId || listingsByToken.has(tokenId)) continue;

        listingsByToken.set(tokenId, {
          token_id: tokenId,
          url: `https://opensea.io/item/ethereum/${CONTRACT_ADDRESS}/${tokenId}`,
          price: extractPrice(listing)
        });
      }

      next = payload?.next || '';
      page += 1;
      if (!listings.length) break;
    } while (next && page < MAX_PAGES);

    const listings = Array.from(listingsByToken.values());
    setJsonHeaders(response);
    response.end(JSON.stringify({
      collection_slug: COLLECTION_SLUG,
      collection_url: COLLECTION_URL,
      updated_at: new Date().toISOString(),
      listed_token_ids: listings.map((listing) => listing.token_id),
      listings
    }));
  } catch (error) {
    setJsonHeaders(response, 502);
    response.end(JSON.stringify({
      error: 'Could not load OpenSea listings.',
      details: error instanceof Error ? error.message : String(error),
      collection_url: COLLECTION_URL,
      listings: [],
      listed_token_ids: []
    }));
  }
}
