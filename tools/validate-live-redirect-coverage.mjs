#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemapUrl = process.env.LEGACY_SITEMAP_URL || 'https://www.shavonnewong.art/sitemap.xml';
const relevantPattern = /work|project|nft|superrare|opensea|vogue|ophelia|eva|proxy|love|ties|meme|6529|renai|whirlwind|orchid|waking|digital-art/i;

function parseRedirectRules() {
  const rules = [];
  for (const raw of fs.readFileSync(path.join(root, '_redirects'), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, status] = line.split(/\s+/);
    if (status === '200' || status?.startsWith('301')) rules.push({ from, to, status });
  }
  return rules;
}

function isCovered(route, rules) {
  return rules.some((rule) => {
    if (rule.from === route) return true;
    if (!rule.from.endsWith('*')) return false;
    return route.startsWith(rule.from.slice(0, -1));
  });
}

async function main() {
  if (typeof fetch !== 'function') {
    console.error('This validator needs a Node runtime with global fetch support.');
    process.exit(1);
  }

  const response = await fetch(sitemapUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ShavonneWongRedirectCoverage/1.0)',
      Accept: 'application/xml,text/xml,*/*',
    },
  });
  if (!response.ok) {
    console.error(`Could not fetch legacy sitemap: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const relevantRoutes = [...new Set(urls
    .filter((url) => relevantPattern.test(url))
    .map((url) => new URL(url).pathname))]
    .sort();

  const rules = parseRedirectRules();
  const missing = relevantRoutes.filter((route) => !isCovered(route, rules));
  if (missing.length) {
    console.error(`Live redirect coverage failed with ${missing.length} missing path(s):`);
    for (const route of missing) console.error(`- ${route}`);
    process.exit(1);
  }

  console.log(`Live redirect coverage passed (${relevantRoutes.length} legacy Works/NFT paths covered).`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
