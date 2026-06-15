import fs from 'node:fs/promises';

const sitemapUrl = 'https://www.shavonnewong.art/sitemap.xml';
const outJson = '.codex-tmp/wayback-live-site-final-availability.json';
const outMd = '.codex-tmp/wayback-live-site-final-availability.md';

function parseSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

async function fetchJsonWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal });
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function checkAvailability(url) {
  const apiUrl = new URL('https://archive.org/wayback/available');
  apiUrl.searchParams.set('url', url);
  const body = await fetchJsonWithTimeout(apiUrl);
  const closest = body?.archived_snapshots?.closest;
  if (closest?.available) {
    return {
      url,
      available: true,
      archiveUrl: closest.url?.replace(/^http:/, 'https:'),
      timestamp: closest.timestamp,
      statusCode: closest.status,
    };
  }

  const cdxUrl = new URL('https://web.archive.org/cdx');
  cdxUrl.searchParams.set('url', url);
  cdxUrl.searchParams.set('output', 'json');
  cdxUrl.searchParams.set('fl', 'timestamp,statuscode,original');
  cdxUrl.searchParams.set('filter', 'statuscode:200');
  cdxUrl.searchParams.set('limit', '1');
  cdxUrl.searchParams.set('sort', 'reverse');
  const cdxBody = await fetchJsonWithTimeout(cdxUrl);
  const cdxMatch = Array.isArray(cdxBody) ? cdxBody[1] : null;
  if (cdxMatch?.[0]) {
    return {
      url,
      available: true,
      archiveUrl: `https://web.archive.org/web/${cdxMatch[0]}/${cdxMatch[2] ?? url}`,
      timestamp: cdxMatch[0],
      statusCode: cdxMatch[1],
      source: 'cdx',
    };
  }

  return { url, available: false };
}

function renderMarkdown(results) {
  const archived = results.filter((entry) => entry.available);
  const missing = results.filter((entry) => !entry.available);
  const lines = [
    '# Wayback Live Site Final Availability',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Sitemap: ${sitemapUrl}`,
    '',
    `Archived: ${archived.length}/${results.length}`,
    `Missing or blocked: ${missing.length}/${results.length}`,
    '',
    '## Missing or blocked',
    '',
  ];

  for (const entry of missing) {
    lines.push(`- ${entry.url}`);
  }

  lines.push('', '## Archived', '');
  for (const entry of archived) {
    lines.push(`- ${entry.url}`);
    lines.push(`  - Archive: ${entry.archiveUrl}`);
  }

  return `${lines.join('\n')}\n`;
}

const sitemapResponse = await fetch(sitemapUrl, { headers: { accept: 'application/xml,text/xml,*/*' } });
const sitemapXml = await sitemapResponse.text();
const urls = parseSitemapUrls(sitemapXml);
const results = [];

for (const [index, url] of urls.entries()) {
  console.log(`[${index + 1}/${urls.length}] Checking ${url}`);
  try {
    const result = await checkAvailability(url);
    results.push(result);
    console.log(`  -> ${result.available ? 'available' : 'not found'}${result.archiveUrl ? ` ${result.archiveUrl}` : ''}`);
  } catch (error) {
    results.push({
      url,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`  -> error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await fs.writeFile(outJson, `${JSON.stringify(results, null, 2)}\n`);
await fs.writeFile(outMd, renderMarkdown(results));
console.log(`Report: ${outMd}`);
