import fs from 'node:fs/promises';
import path from 'node:path';

const pressPath = path.resolve('press.html');
const outDir = path.resolve('.codex-tmp');
const jsonReportPath = path.join(outDir, 'wayback-press-archive-report.json');
const mdReportPath = path.join(outDir, 'wayback-press-archive-report.md');
const saveSheetPath = path.join(outDir, 'wayback-press-save-sheet.html');
const missingSaveSheetPath = path.join(outDir, 'wayback-press-missing-save-sheet.html');
const availabilityPath = path.join(outDir, 'wayback-press-availability.json');
const availabilityMdPath = path.join(outDir, 'wayback-press-availability.md');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function originalUrlFromPressHref(href) {
  const waybackMatch = href.match(/^https?:\/\/web\.archive\.org\/web\/[^/]+\/(https?:\/\/.+)$/i);
  if (waybackMatch) return decodeURI(waybackMatch[1]);

  const compactWaybackMatch = href.match(/^https?:\/\/web\.archive\.org\/web\/[^/]+\/(.+)$/i);
  return compactWaybackMatch ? `https://${decodeURI(compactWaybackMatch[1])}` : href;
}

function archivePageUrl(originalUrl, timestamp) {
  return `https://web.archive.org/web/${timestamp}/${originalUrl}`;
}

function savePageUrl(originalUrl) {
  return `https://web.archive.org/save/${encodeURI(originalUrl)}`;
}

function extractPressLinks(html) {
  const links = [];
  const anchorPattern = /<a\s+[^>]*class="[^"]*\bpr-row\b[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const anchorHtml = match[2];
    if (!/^https?:\/\//i.test(href)) continue;

    const originalUrl = originalUrlFromPressHref(href);
    const title = stripTags(anchorHtml.match(/<span class="pr-title">([\s\S]*?)<\/span>/)?.[1] ?? originalUrl);
    const publication = stripTags(anchorHtml.match(/<span class="pr-pub">([\s\S]*?)<\/span>/)?.[1] ?? '');

    links.push({ href, originalUrl, title, publication });
  }

  const seen = new Map();
  for (const link of links) {
    if (!seen.has(link.originalUrl)) seen.set(link.originalUrl, link);
  }
  return [...seen.values()];
}

async function submitToWayback(link) {
  const form = new URLSearchParams({
    url: link.originalUrl,
    capture_all: 'on',
    skip_first_archive: '1',
  });

  const response = await fetch('https://web.archive.org/save', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'Mozilla/5.0 (compatible; ShavonnePressArchive/1.0)',
    },
    body: form,
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  if (!response.ok) {
    return {
      ...link,
      status: 'submit_failed',
      httpStatus: response.status,
      message: body?.message ?? body?.raw ?? response.statusText,
    };
  }

  if (!body?.job_id) {
    return {
      ...link,
      status: 'submitted_without_job',
      httpStatus: response.status,
      message: body?.message ?? body?.raw ?? 'Wayback accepted the request but did not return a job id.',
      raw: body,
    };
  }

  return {
    ...link,
    status: 'submitted',
    httpStatus: response.status,
    jobId: body.job_id,
  };
}

async function pollWaybackJob(result) {
  if (!result.jobId) return result;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await wait(5000);
    const response = await fetch(`https://web.archive.org/save/status/${result.jobId}`, {
      headers: { accept: 'application/json' },
    });
    const body = await response.json().catch(() => ({}));

    if (body.status === 'success') {
      const timestamp = body.timestamp ?? body.original_job_id?.timestamp;
      return {
        ...result,
        status: 'saved',
        timestamp,
        archiveUrl: timestamp ? archivePageUrl(result.originalUrl, timestamp) : body.archive_url,
        message: body.message,
      };
    }

    if (body.status === 'error') {
      return {
        ...result,
        status: 'save_failed',
        message: body.message ?? body.status_ext ?? 'Wayback reported an error.',
        raw: body,
      };
    }
  }

  return {
    ...result,
    status: 'pending',
    message: 'Wayback accepted the job, but it was still pending after two minutes.',
  };
}

async function checkAvailability(link) {
  const apiUrl = new URL('https://archive.org/wayback/available');
  apiUrl.searchParams.set('url', link.originalUrl);

  const response = await fetch(apiUrl, { headers: { accept: 'application/json' } });
  const body = await response.json().catch(() => ({}));
  const closest = body?.archived_snapshots?.closest;
  if (closest?.available) {
    return {
      ...link,
      available: true,
      archiveUrl: closest.url,
      timestamp: closest.timestamp,
      statusCode: closest.status,
    };
  }

  const cdxUrl = new URL('https://web.archive.org/cdx');
  cdxUrl.searchParams.set('url', link.originalUrl);
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
      ...link,
      available: true,
      archiveUrl: archivePageUrl(cdxMatch[2] ?? link.originalUrl, cdxMatch[0]),
      timestamp: cdxMatch[0],
      statusCode: cdxMatch[1],
      source: 'cdx',
    };
  }

  return { ...link, available: false };
}

function renderMarkdown(results) {
  const savedAt = new Date().toISOString();
  const lines = [
    '# Wayback Press Archive Report',
    '',
    `Generated: ${savedAt}`,
    '',
    '| Status | Publication | Title | Original | Archive |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const result of results) {
    const status = result.status === 'saved' ? 'saved' : result.status;
    const archive = result.archiveUrl ? `[archive](${result.archiveUrl})` : (result.message ?? '');
    lines.push(
      `| ${status} | ${result.publication.replace(/\|/g, '\\|')} | ${result.title.replace(/\|/g, '\\|')} | [original](${result.originalUrl}) | ${archive.replace(/\|/g, '\\|')} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSaveSheet(links) {
  const rows = links.map((link, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(link.publication)}</td>
        <td>${escapeHtml(link.title)}</td>
        <td><a href="${escapeHtml(link.originalUrl)}" target="_blank" rel="noreferrer">Original</a></td>
        <td><a href="${escapeHtml(savePageUrl(link.originalUrl))}" target="_blank" rel="noreferrer">Save to Wayback</a></td>
        <td><a href="https://web.archive.org/web/*/${escapeHtml(link.originalUrl)}" target="_blank" rel="noreferrer">Archive history</a></td>
      </tr>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wayback press save sheet</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2430; background: #f7f7fb; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { max-width: 860px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #d8dbe8; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; background: #eef0f8; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
    a { color: #465fb0; }
    td:nth-child(1) { width: 42px; color: #67708f; }
    td:nth-child(2) { width: 160px; color: #535b78; }
  </style>
</head>
<body>
  <h1>Wayback press save sheet</h1>
  <p>Log into archive.org first, then use the “Save to Wayback” links. The original article URLs are unwrapped from any existing Wayback links on the press page.</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Publication</th>
        <th>Title</th>
        <th>Original</th>
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

function renderAvailabilityMarkdown(results) {
  const savedAt = new Date().toISOString();
  const available = results.filter((entry) => entry.available);
  const missing = results.filter((entry) => !entry.available);
  const lines = [
    '# Wayback Press Availability',
    '',
    `Generated: ${savedAt}`,
    '',
    `Already archived: ${available.length}/${results.length}`,
    `Need a fresh save: ${missing.length}/${results.length}`,
    '',
    '## Need a fresh Save Page Now capture',
    '',
  ];

  for (const entry of missing) {
    lines.push(`- ${entry.publication} - ${entry.title}`);
    lines.push(`  - Original: ${entry.originalUrl}`);
    lines.push(`  - Save: ${savePageUrl(entry.originalUrl)}`);
  }

  lines.push('', '## Already archived', '');

  for (const entry of available) {
    lines.push(`- ${entry.publication} - ${entry.title}`);
    lines.push(`  - Archive: ${entry.archiveUrl}`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const html = await fs.readFile(pressPath, 'utf8');
  let links = extractPressLinks(html);
  const results = [];

  await fs.writeFile(saveSheetPath, renderSaveSheet(links));

  console.log(`Found ${links.length} unique press links.`);
  console.log(`Save sheet: ${saveSheetPath}`);

  if (process.argv.includes('--sheet-only')) {
    return;
  }

  if (process.argv.includes('--check-existing')) {
    const availability = [];
    for (const [index, link] of links.entries()) {
      console.log(`[${index + 1}/${links.length}] Checking: ${link.title}`);
      try {
        const result = await checkAvailability(link);
        availability.push(result);
        console.log(`  -> ${result.available ? 'available' : 'not found'}${result.archiveUrl ? ` ${result.archiveUrl}` : ''}`);
      } catch (error) {
        availability.push({
          ...link,
          available: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`  -> check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      await wait(750);
    }
    await fs.writeFile(availabilityPath, `${JSON.stringify(availability, null, 2)}\n`);
    await fs.writeFile(availabilityMdPath, renderAvailabilityMarkdown(availability));
    await fs.writeFile(missingSaveSheetPath, renderSaveSheet(availability.filter((entry) => !entry.available)));
    console.log(`Availability report: ${availabilityPath}`);
    console.log(`Readable availability report: ${availabilityMdPath}`);
    console.log(`Missing-only save sheet: ${missingSaveSheetPath}`);
    const availableCount = availability.filter((entry) => entry.available).length;
    console.log(`${availableCount}/${availability.length} already have Wayback captures.`);
    return;
  }

  if (process.argv.includes('--missing-only')) {
    const availability = JSON.parse(await fs.readFile(availabilityPath, 'utf8'));
    const missingUrls = new Set(availability.filter((entry) => !entry.available).map((entry) => entry.originalUrl));
    links = links.filter((link) => missingUrls.has(link.originalUrl));
    await fs.writeFile(missingSaveSheetPath, renderSaveSheet(links));
    console.log(`Saving ${links.length} links from ${availabilityPath}.`);
  }

  for (const [index, link] of links.entries()) {
    console.log(`[${index + 1}/${links.length}] Saving: ${link.title}`);
    try {
      const submitted = await submitToWayback(link);
      const result = await pollWaybackJob(submitted);
      results.push(result);
      console.log(`  -> ${result.status}${result.archiveUrl ? ` ${result.archiveUrl}` : result.message ? `: ${result.message}` : ''}`);
    } catch (error) {
      results.push({
        ...link,
        status: 'script_error',
        message: error instanceof Error ? error.message : String(error),
      });
      console.log(`  -> script_error: ${error instanceof Error ? error.message : String(error)}`);
    }

    await wait(3500);
  }

  await fs.writeFile(jsonReportPath, `${JSON.stringify(results, null, 2)}\n`);
  await fs.writeFile(mdReportPath, renderMarkdown(results));

  const counts = results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] ?? 0) + 1;
    return summary;
  }, {});

  console.log(`Report: ${mdReportPath}`);
  console.log(`Save sheet: ${saveSheetPath}`);
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
