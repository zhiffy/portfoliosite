import fs from 'node:fs/promises';

const outJson = '.codex-tmp/wayback-site-availability.json';
const outMd = '.codex-tmp/wayback-site-availability.md';
const outSheet = '.codex-tmp/wayback-site-save-sheet.html';
const sitemapUrl = 'https://www.shavonnewong.art/sitemap.xml';
const explicitUrls = ['https://www.shavonnewong.art/'];

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function saveUrl(url) {
  return `https://web.archive.org/save/${encodeURI(url)}`;
}

function historyUrl(url) {
  return `https://web.archive.org/web/*/${url}`;
}

function parseSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

async function getSitemapUrls() {
  const response = await fetch(sitemapUrl, {
    headers: { accept: 'application/xml,text/xml,*/*' },
  });
  if (!response.ok) throw new Error(`Sitemap fetch failed: ${response.status} ${response.statusText}`);
  const xml = await response.text();
  const liveUrls = parseSitemapUrls(xml);
  const localXml = await fs.readFile('sitemap.xml', 'utf8').catch(() => '');
  const localUrls = localXml ? parseSitemapUrls(localXml) : [];
  return [...new Set([...explicitUrls, ...liveUrls, ...localUrls])].sort();
}

async function checkAvailability(url) {
  const apiUrl = new URL('https://archive.org/wayback/available');
  apiUrl.searchParams.set('url', url);
  const response = await fetch(apiUrl, { headers: { accept: 'application/json' } });
  const body = await response.json().catch(() => ({}));
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
  const cdxResponse = await fetch(cdxUrl, { headers: { accept: 'application/json' } });
  const cdxBody = await cdxResponse.json().catch(() => []);
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

function renderSheet(results) {
  const rows = results.map((entry, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.url)}</a></td>
        <td>${entry.available ? `<a href="${escapeHtml(entry.archiveUrl)}" target="_blank" rel="noreferrer">Archive</a>` : 'Not found'}</td>
        <td><a href="${escapeHtml(saveUrl(entry.url))}" target="_blank" rel="noreferrer">Save</a></td>
        <td><a href="${escapeHtml(historyUrl(entry.url))}" target="_blank" rel="noreferrer">History</a></td>
      </tr>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wayback full-site save sheet</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2430; background: #f7f7fb; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { max-width: 860px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #d8dbe8; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; background: #eef0f8; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
    a { color: #465fb0; }
    td:nth-child(1) { width: 42px; color: #67708f; }
    td:nth-child(3), td:nth-child(4), td:nth-child(5) { width: 120px; }
  </style>
</head>
<body>
  <h1>Wayback full-site save sheet</h1>
  <p>Log into archive.org first, then use the Save links. URLs come from the live sitemap at ${escapeHtml(sitemapUrl)}, the local repo sitemap, and the explicit homepage URL.</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>URL</th>
        <th>Current archive</th>
        <th>Save</th>
        <th>History</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

function renderMarkdown(results) {
  const archived = results.filter((entry) => entry.available);
  const missing = results.filter((entry) => !entry.available);
  const lines = [
    '# Wayback Full Site Availability',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Live sitemap: ${sitemapUrl}`,
    'Local sitemap: sitemap.xml',
    `Explicit URLs: ${explicitUrls.join(', ')}`,
    '',
    `Already archived: ${archived.length}/${results.length}`,
    `Need Save Page Now: ${missing.length}/${results.length}`,
    '',
    '## Need Save Page Now',
    '',
  ];

  for (const entry of missing) {
    lines.push(`- ${entry.url}`);
    lines.push(`  - Save: ${saveUrl(entry.url)}`);
  }

  lines.push('', '## Already archived', '');
  for (const entry of archived) {
    lines.push(`- ${entry.url}`);
    lines.push(`  - Archive: ${entry.archiveUrl}`);
  }

  return `${lines.join('\n')}\n`;
}

const urls = await getSitemapUrls();
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
    console.log(`  -> check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

await fs.writeFile(outJson, `${JSON.stringify(results, null, 2)}\n`);
await fs.writeFile(outMd, renderMarkdown(results));
await fs.writeFile(outSheet, renderSheet(results));
console.log(`Report: ${outMd}`);
console.log(`Save sheet: ${outSheet}`);
