import fs from 'node:fs/promises';

const jsonPath = '.codex-tmp/wayback-live-site-final-availability.json';
const mdPath = '.codex-tmp/wayback-live-site-final-availability.md';

const confirmed = new Map([
  ['https://www.shavonnewong.art/nfts/available', '20260614075703'],
  ['https://www.shavonnewong.art/nfts/v/stargazers-dream', '20260614082246'],
  ['https://www.shavonnewong.art/nfts/v/6gwmhj423z6h2nys2gz394sjeygjwn', '20260614080040'],
  ['https://www.shavonnewong.art/nfts/v/the-shimmering-veil-i', '20260614082846'],
  ['https://www.shavonnewong.art/nfts/v/the-hug', '20260614082548'],
  ['https://www.shavonnewong.art/nfts/v/suspense', '20260614082514'],
  ['https://www.shavonnewong.art/nfts/v/kin-i', '20260614081115'],
]);

function renderMarkdown(results) {
  const archived = results.filter((entry) => entry.available);
  const missing = results.filter((entry) => !entry.available);
  const lines = [
    '# Wayback Live Site Final Availability',
    '',
    `Generated: ${new Date().toISOString()}`,
    'Sitemap: https://www.shavonnewong.art/sitemap.xml',
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

const results = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
for (const entry of results) {
  const timestamp = confirmed.get(entry.url);
  if (timestamp) {
    entry.available = true;
    entry.archiveUrl = `https://web.archive.org/web/${timestamp}/${entry.url}`;
    entry.timestamp = timestamp;
    entry.statusCode = '200';
    entry.source = 'cdx-confirmed';
    delete entry.error;
  }
}

await fs.writeFile(jsonPath, `${JSON.stringify(results, null, 2)}\n`);
await fs.writeFile(mdPath, renderMarkdown(results));
console.log(`Updated ${mdPath}`);
