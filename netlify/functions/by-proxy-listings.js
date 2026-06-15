// Netlify Function (v2): live OpenSea listings for selected project collections.
// Ported from the former Vercel handler. Serves the same JSON shape at
// /api/by-proxy-listings so assets/js/by-proxy-listings.js needs no change.
// Requires the environment variable OPENSEA_API_KEY (set in Netlify site settings).

const COLLECTIONS = {
  'by-proxy-by-shavonne-wong-and-lenne-chai': {
    contract: '0x46ac8540d698167fcbb9e846511beb8cf8af9bd8'
  },
  'love-is-love-shavonnewong': {
    contract: '0x30de3508e1f826910a254719258346570b27627e'
  },
  'echoes-of-identity-by-shavonne-wong': {
    contract: '0x069eeda3395242bd0d382e3ec5738704569b8885'
  }
};
const DEFAULT_COLLECTION_SLUG = 'by-proxy-by-shavonne-wong-and-lenne-chai';
const MAX_PAGES = 5;

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 's-maxage=300, stale-while-revalidate=3600'
};

function getOfferItems(listing) {
  const offer = listing?.protocol_data?.parameters?.offer;
  if (Array.isArray(offer)) return offer;
  const asset = listing?.maker_asset_bundle?.assets?.[0];
  return asset ? [asset] : [];
}

function extractOfferItem(listing, contractAddress) {
  const contract = String(contractAddress || '').toLowerCase();
  for (const item of getOfferItems(listing)) {
    const token = String(item?.token || item?.asset_contract?.address || '').toLowerCase();
    const identifier = item?.identifierOrCriteria ?? item?.token_id ?? item?.identifier;
    if ((!contract || !token || token === contract) && identifier !== undefined && identifier !== null && identifier !== '') {
      return { token_id: String(identifier), contract: token || contract };
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

function resolveCollection(request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get('collection') || url.searchParams.get('slug') || DEFAULT_COLLECTION_SLUG;
  const slug = Object.prototype.hasOwnProperty.call(COLLECTIONS, requested) ? requested : DEFAULT_COLLECTION_SLUG;
  return {
    slug,
    contract: COLLECTIONS[slug].contract,
    collection_url: `https://opensea.io/collection/${slug}`,
    open_sea_url: `https://api.opensea.io/api/v2/listings/collection/${slug}/all`
  };
}

async function fetchOpenSeaPage(apiKey, collection, next) {
  const params = new URLSearchParams({ limit: '200' });
  if (next) params.set('next', next);

  const response = await fetch(`${collection.open_sea_url}?${params.toString()}`, {
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

export default async (request) => {
  const collection = resolveCollection(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...JSON_HEADERS, Allow: 'GET, OPTIONS' }
    });
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'OpenSea API key is not configured.',
      collection_slug: collection.slug,
      collection_url: collection.collection_url,
      listings: [],
      listed_token_ids: []
    }), { status: 503, headers: JSON_HEADERS });
  }

  try {
    const listingsByToken = new Map();
    let next = '';
    let page = 0;

    do {
      const payload = await fetchOpenSeaPage(apiKey, collection, next);
      const listings = Array.isArray(payload?.listings) ? payload.listings : [];

      for (const listing of listings) {
        const item = extractOfferItem(listing, collection.contract);
        if (!item?.token_id || listingsByToken.has(item.token_id)) continue;
        const contract = item.contract || collection.contract;

        listingsByToken.set(item.token_id, {
          token_id: item.token_id,
          url: contract
            ? `https://opensea.io/item/ethereum/${contract}/${item.token_id}`
            : collection.collection_url,
          price: extractPrice(listing)
        });
      }

      next = payload?.next || '';
      page += 1;
      if (!listings.length) break;
    } while (next && page < MAX_PAGES);

    const listings = Array.from(listingsByToken.values());
    return new Response(JSON.stringify({
      collection_slug: collection.slug,
      collection_url: collection.collection_url,
      updated_at: new Date().toISOString(),
      listed_token_ids: listings.map((listing) => listing.token_id),
      listings
    }), { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Could not load OpenSea listings.',
      details: error instanceof Error ? error.message : String(error),
      collection_slug: collection.slug,
      collection_url: collection.collection_url,
      listings: [],
      listed_token_ids: []
    }), { status: 502, headers: JSON_HEADERS });
  }
};

export const config = {
  path: '/api/by-proxy-listings'
};
