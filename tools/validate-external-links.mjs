#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const timeoutMs = Number(process.env.EXTERNAL_LINK_TIMEOUT_MS || 25000);
const issues = [];

const catalogFiles = [
  'works.html',
  'works-available.html',
  'after-ophelia.html',
  'meet-eva-here.html',
  'the-ties-that-bind.html',
  'by-proxy.html',
  '3d-single-works.html',
  'love-is-love.html',
  'vogue-singapore.html',
  '6529-meme-card.html',
  'whirlwind-of-the-waking-dream.html',
  'meet-eva-here-chatbot.html',
  'meet-eva-here-diary.html',
  'after-ophelia-ophelia-retold.html',
  'after-ophelia-ophelia-reassembled.html',
];

const skippedHosts = new Set([
  'schema.org',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function cleanUrl(raw) {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/[)"'.,;]+$/g, '')
    .trim();
}

function shouldSkip(url) {
  const parsed = new URL(url);
  if (skippedHosts.has(parsed.hostname)) return true;

  const canonicalSelf = parsed.hostname === 'shavonnewong.art';
  if (canonicalSelf && (parsed.pathname.startsWith('/works/') || parsed.pathname.startsWith('/assets/'))) return true;
  if (canonicalSelf && parsed.pathname === '/') return true;

  return false;
}

function collectUrls() {
  const urls = new Set();
  for (const file of catalogFiles) {
    const html = read(file);
    for (const match of html.matchAll(/https?:\/\/[^"'<>\s)]+/g)) {
      const url = cleanUrl(match[0]);
      try {
        if (!shouldSkip(url)) urls.add(url);
      } catch {
        issues.push(`${file}: malformed URL ${url}`);
      }
    }
  }

  const byProxy = JSON.parse(read('assets/data/by-proxy.json'));
  for (const [index, item] of byProxy.entries()) {
    for (const field of ['marketplace_url', 'etherscan_url']) {
      if (!item[field]) {
        issues.push(`assets/data/by-proxy.json entry ${index + 1}: missing ${field}`);
        continue;
      }
      const url = cleanUrl(item[field]);
      try {
        if (!shouldSkip(url)) urls.add(url);
      } catch {
        issues.push(`assets/data/by-proxy.json entry ${index + 1}: malformed ${field} ${url}`);
      }
    }
  }

  const available = JSON.parse(read('assets/data/available.json'));
  for (const [index, item] of available.entries()) {
    for (const value of [
      item.primary_action?.url,
      item.verification?.url
    ]) {
      if (!value || !/^https?:\/\//i.test(value)) continue;
      const url = cleanUrl(value);
      try {
        if (!shouldSkip(url)) urls.add(url);
      } catch {
        issues.push(`assets/data/available.json entry ${index + 1}: malformed URL ${url}`);
      }
    }
  }

  const singleWorks = JSON.parse(read('assets/data/3d-single-works.json'));
  for (const [index, item] of singleWorks.entries()) {
    if (!item.marketplace_url || !/^https?:\/\//i.test(item.marketplace_url)) continue;
    const url = cleanUrl(item.marketplace_url);
    try {
      if (!shouldSkip(url)) urls.add(url);
    } catch {
      issues.push(`assets/data/3d-single-works.json entry ${index + 1}: malformed marketplace_url ${url}`);
    }
  }

  const about = read('about.html');
  for (const match of about.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const json = JSON.parse(match[1]);
      if (json['@type'] !== 'Person') continue;
      for (const value of json.sameAs || []) {
        const url = cleanUrl(value);
        if (!shouldSkip(url)) urls.add(url);
      }
    } catch {
      issues.push('about.html: Person JSON-LD does not parse');
    }
  }
  return [...urls].sort();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShavonneWongCatalogLinkCheck/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url) {
  try {
    const response = await fetchWithTimeout(url);
    if (response.status >= 200 && response.status < 400) {
      return { url, status: response.status, finalUrl: response.url };
    }
    return { url, status: response.status, finalUrl: response.url, error: response.statusText || 'HTTP error' };
  } catch (error) {
    return { url, status: 'ERR', finalUrl: '', error: error.name === 'AbortError' ? `Timed out after ${timeoutMs}ms` : error.message };
  }
}

async function main() {
  if (typeof fetch !== 'function') {
    console.error('This validator needs a Node runtime with global fetch support.');
    process.exit(1);
  }

  const urls = collectUrls();
  if (issues.length) {
    console.error(`External link validation failed before network checks with ${issues.length} issue(s):`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  const results = [];
  const concurrency = Number(process.env.EXTERNAL_LINK_CONCURRENCY || 5);
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      results.push(await checkUrl(url));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  const failures = results.filter((result) => result.status === 'ERR' || Number(result.status) >= 400);
  if (failures.length) {
    console.error(`External link validation failed with ${failures.length} issue(s):`);
    for (const failure of failures) {
      console.error(`- ${failure.status} ${failure.url}${failure.error ? ` (${failure.error})` : ''}`);
    }
    process.exit(1);
  }

  const redirects = results.filter((result) => result.finalUrl && result.finalUrl !== result.url);
  console.log(`External link validation passed (${results.length} URLs checked).`);
  if (redirects.length) {
    console.log(`Redirects followed: ${redirects.length}`);
    for (const redirect of redirects.slice(0, 10)) console.log(`- ${redirect.url} -> ${redirect.finalUrl}`);
    if (redirects.length > 10) console.log(`- ...and ${redirects.length - 10} more`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
