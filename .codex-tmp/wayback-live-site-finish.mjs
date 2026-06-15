import fs from 'node:fs/promises';

const urls = [
  'https://www.shavonnewong.art/11x',
  'https://www.shavonnewong.art/nfts/v/the-shimmering-veil-ii',
  'https://www.shavonnewong.art/projects/meet-eva-here',
  'https://www.shavonnewong.art/projects/vogue-singapore',
  'https://www.shavonnewong.art/shuuemura',
  'https://www.shavonnewong.art/update2023jan',
  'https://www.shavonnewong.art/update2024jan',
  'https://www.shavonnewong.art/update2025jan',
  'https://www.shavonnewong.art/update2025jun',
];
const outJson = '.codex-tmp/wayback-live-site-finish-report.json';
const outMd = '.codex-tmp/wayback-live-site-finish-report.md';

function saveUrl(url) {
  return `https://web.archive.org/save/${encodeURI(url)}`;
}

function archiveFromFinalUrl(finalUrl) {
  return /^https:\/\/web\.archive\.org\/web\/\d+\//.test(finalUrl) ? finalUrl : '';
}

async function saveOne(url) {
  const response = await fetch(saveUrl(url), {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; ShavonneLiveSiteArchive/1.0)',
    },
  });
  const text = await response.text();
  const archiveUrl = archiveFromFinalUrl(response.url);
  return {
    url,
    status: archiveUrl ? 'saved' : 'unknown',
    httpStatus: response.status,
    archiveUrl,
    finalUrl: response.url,
    note: archiveUrl ? '' : text.slice(0, 300).replace(/\s+/g, ' ').trim(),
  };
}

function renderMarkdown(results) {
  const saved = results.filter((entry) => entry.status === 'saved');
  const unknown = results.filter((entry) => entry.status !== 'saved');
  const lines = [
    '# Wayback Live Site Finish Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Saved: ${saved.length}/${results.length}`,
    `Needs review: ${unknown.length}/${results.length}`,
    '',
    '## Saved',
    '',
  ];

  for (const entry of saved) {
    lines.push(`- ${entry.url}`);
    lines.push(`  - Archive: ${entry.archiveUrl}`);
  }

  lines.push('', '## Needs review', '');
  for (const entry of unknown) {
    lines.push(`- ${entry.url}`);
    lines.push(`  - Status: ${entry.httpStatus}`);
    lines.push(`  - Final URL: ${entry.finalUrl}`);
    if (entry.note) lines.push(`  - Note: ${entry.note}`);
  }

  return `${lines.join('\n')}\n`;
}

const results = [];
for (const [index, url] of urls.entries()) {
  console.log(`[${index + 1}/${urls.length}] Saving ${url}`);
  try {
    const result = await saveOne(url);
    results.push(result);
    console.log(`  -> ${result.status}${result.archiveUrl ? ` ${result.archiveUrl}` : ` ${result.httpStatus}`}`);
  } catch (error) {
    results.push({
      url,
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    console.log(`  -> error: ${error instanceof Error ? error.message : String(error)}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 15000));
}

await fs.writeFile(outJson, `${JSON.stringify(results, null, 2)}\n`);
await fs.writeFile(outMd, renderMarkdown(results));
console.log(`Report: ${outMd}`);
