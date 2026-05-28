#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...parts) => path.join(root, ...parts);

const worksPages = [
  { route: '/works/', file: 'works.html', type: 'grid' },
  { route: '/works/available/', file: 'works-available.html', type: 'available' },
  { route: '/works/after-ophelia/', file: 'after-ophelia.html', type: 'project', plates: 2 },
  { route: '/works/meet-eva-here/', file: 'meet-eva-here.html', type: 'project', plates: 3 },
  { route: '/works/the-ties-that-bind/', file: 'the-ties-that-bind.html', type: 'project', plates: 7 },
  { route: '/works/whirlwind-of-the-waking-dream/', file: 'whirlwind-of-the-waking-dream.html', type: 'work' },
  { route: '/works/3d-single-works/', file: '3d-single-works.html', type: 'body' },
  { route: '/works/love-is-love/', file: 'love-is-love.html', type: 'project', plates: 2 },
  { route: '/works/vogue-singapore/', file: 'vogue-singapore.html', type: 'project' },
  { route: '/works/6529-meme-card/', file: '6529-meme-card.html', type: 'project' },
  { route: '/works/by-proxy/', file: 'by-proxy.html', type: 'project', minFeaturedPlates: 5 },
  { route: '/works/meet-eva-here/chatbot/', file: 'meet-eva-here-chatbot.html', type: 'work' },
  { route: '/works/meet-eva-here/diary/', file: 'meet-eva-here-diary.html', type: 'work' },
  { route: '/works/after-ophelia/ophelia-retold/', file: 'after-ophelia-ophelia-retold.html', type: 'work' },
  { route: '/works/after-ophelia/ophelia-reassembled/', file: 'after-ophelia-ophelia-reassembled.html', type: 'work' },
];

const projectSectionOrder = ['overview', 'work', 'exhibitions', 'related', 'contact'];
const statusPattern = /^(Available &middot; edition of \d+( \(\d+ remaining\))?|Sold out &middot; edition of \d+|Edition of \d+|Unique &middot; sold|Unique &middot; not for sale|Unique &middot; available|1\/1 NFT &middot; sold for \d+ ETH on Manifold|Ongoing project|Installation documentation|Archive)$/;
const issues = [];

function read(file) {
  return fs.readFileSync(rel(file), 'utf8');
}

function exists(file) {
  return fs.existsSync(rel(file));
}

function fail(message) {
  issues.push(message);
}

function matches(html, regex) {
  return [...html.matchAll(regex)];
}

function stripTags(input) {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordCount(input) {
  return (stripTags(input).match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu) || []).length;
}

function parseRedirects() {
  const rewrites = new Map();
  const redirects = new Map();
  for (const raw of read('_redirects').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, status] = line.split(/\s+/);
    if (status === '200') rewrites.set(from, to.replace(/^\//, ''));
    if (status?.startsWith('301')) redirects.set(from, to);
  }
  return { rewrites, redirects };
}

function imageSize(file) {
  const buf = fs.readFileSync(rel(file));
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function validateMetadata(page, html) {
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${page.file}: missing title`);
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!description) fail(`${page.file}: missing meta description`);
  if (description && description.length > 160) fail(`${page.file}: meta description is ${description.length} chars`);

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) fail(`${page.file}: missing canonical`);
  if (canonical && canonical !== `https://shavonnewong.art${page.route}`) {
    fail(`${page.file}: canonical is ${canonical}, expected https://shavonnewong.art${page.route}`);
  }

  const ogImage = html.match(/<meta property="og:image" content="https:\/\/shavonnewong\.art\/([^"]+)"/)?.[1];
  if (!ogImage) {
    fail(`${page.file}: missing og:image`);
  } else if (!exists(ogImage)) {
    fail(`${page.file}: og:image file missing at ${ogImage}`);
  } else {
    const size = imageSize(ogImage);
    if (!size || size.width !== 1200 || size.height !== 630) {
      fail(`${page.file}: og:image must be 1200x630, found ${size ? `${size.width}x${size.height}` : 'unknown'}`);
    }
  }

  for (const [index, match] of matches(html, /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g).entries()) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      fail(`${page.file}: JSON-LD block ${index + 1} does not parse (${error.message})`);
    }
  }
  if (page.type !== 'grid' && !/<script\b[^>]*type="application\/ld\+json"/.test(html)) {
    fail(`${page.file}: missing JSON-LD`);
  }
}

function validateHeadings(page, html) {
  const headingMatches = matches(html, /<h([1-4])\b[^>]*>[\s\S]*?<\/h\1>/g);
  const levels = headingMatches.map((m) => Number(m[1]));
  const h1Count = levels.filter((n) => n === 1).length;
  if (h1Count !== 1) fail(`${page.file}: expected 1 h1, found ${h1Count}`);
  let previous = 0;
  for (const level of levels) {
    if (previous && level > previous + 1) fail(`${page.file}: heading skip h${previous} to h${level}`);
    previous = level;
  }
}

function validateProjectSections(page, html) {
  if (page.type !== 'project') return;
  let cursor = -1;
  for (const id of projectSectionOrder) {
    const index = html.indexOf(`id="${id}"`);
    if (index < 0) {
      fail(`${page.file}: missing #${id}`);
    } else if (index < cursor) {
      fail(`${page.file}: #${id} appears out of order`);
    } else {
      cursor = index;
    }
  }
  const related = html.match(/<section[^>]+id="related"[\s\S]*?<\/section>/)?.[0] || '';
  const relatedRoutes = new Set(matches(related, /href="(\/works\/[^"#]+\/)"/g).map((m) => m[1]));
  if (relatedRoutes.size < 3) fail(`${page.file}: related section links to ${relatedRoutes.size} project routes`);
}

function validateBodySections(page, html) {
  if (page.type !== 'body') return;
  const sectionOrder = ['works', 'exhibitions', 'related', 'contact'];
  let cursor = -1;
  for (const id of sectionOrder) {
    const index = html.indexOf(`id="${id}"`);
    if (index < 0) {
      fail(`${page.file}: missing #${id}`);
    } else if (index < cursor) {
      fail(`${page.file}: #${id} appears out of order`);
    } else {
      cursor = index;
    }
  }
  if (!/data-single-work-groups/.test(html)) fail(`${page.file}: missing JSON-backed contact sheet mount`);
  if (!/data-work-modal/.test(html)) fail(`${page.file}: missing single-work modal`);
  if (!/\/assets\/data\/3d-single-works\.json/.test(read('assets/js/3d-single-works.js'))) {
    fail('assets/js/3d-single-works.js: missing 3D single works data source');
  }
}

function validatePlates(page, html) {
  const statuses = matches(html, /<div class="sp-plate-status">([^<]+)<\/div>/g).map((m) => m[1].trim());
  for (const status of statuses) {
    if (!statusPattern.test(status)) fail(`${page.file}: status outside vocabulary: ${status}`);
  }
  for (const [index, body] of matches(html, /<p class="sp-plate-body">([\s\S]*?)<\/p>/g).map((m) => m[1]).entries()) {
    const count = wordCount(body);
    if (count < 50) fail(`${page.file}: plate body ${index + 1} has ${count} words`);
  }
  const plateCount = matches(html, /<article class="[^"]*\bsp-plate\b/g).length;
  if (page.plates !== undefined && plateCount !== page.plates) {
    fail(`${page.file}: expected ${page.plates} plates, found ${plateCount}`);
  }
  if (page.minFeaturedPlates !== undefined && plateCount < page.minFeaturedPlates) {
    fail(`${page.file}: expected at least ${page.minFeaturedPlates} featured plates, found ${plateCount}`);
  }
  for (const [index, plate] of matches(html, /<article class="[^"]*\bsp-plate\b[^>]*>[\s\S]*?<\/article>/g).map((m) => m[0]).entries()) {
    if (!/<video\b/.test(plate)) continue;
    const duration = plate.match(/<span class="sp-plate-duration">([^<]+)<\/span>/)?.[1] || '';
    const medium = plate.match(/<span class="sp-plate-medium">([^<]+)<\/span>/)?.[1] || '';
    if (!/(\d+:\d+|loop)/i.test(duration)) fail(`${page.file}: video plate ${index + 1} missing visible duration`);
    if (!/(\d+:\d+|loop)/i.test(medium)) fail(`${page.file}: video plate ${index + 1} missing duration in medium line`);
  }
  for (const match of matches(html, /<(?:p|div) class="([^"]*\b(?:sp-plate-market|sp-series-marketplace)\b[^"]*)"[^>]*>([\s\S]*?)<\/(?:p|div)>/g)) {
    const classes = match[1];
    const market = match[2];
    const text = stripTags(market);
    const isCollectionOnlySeriesLine = /\bsp-series-marketplace\b/.test(classes)
      && !/\bsp-plate-market\b/.test(classes)
      && /View the complete edition on OpenSea/i.test(text);
    if (!/<a\b/.test(market)) fail(`${page.file}: market line missing link`);
    if (isCollectionOnlySeriesLine) continue;
    if (!/(Etherscan|Basescan|Tezblock)/i.test(text)) fail(`${page.file}: market line missing explorer`);
    if (!/Chain:/i.test(text)) fail(`${page.file}: market line missing chain`);
  }
}

function validateAccessibility(page, html) {
  for (const image of matches(html, /<img\b([^>]*)>/g)) {
    if (!/\balt=/.test(image[1])) fail(`${page.file}: image missing alt`);
  }
  for (const button of matches(html, /<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const hasLabel = /aria-label="[^"]+"/.test(button[1]) || stripTags(button[2]).length > 0;
    if (!hasLabel) fail(`${page.file}: button missing accessible name`);
  }
}

function validateRoutesAndSitemap() {
  const { rewrites, redirects } = parseRedirects();
  for (const page of worksPages) {
    if (!exists(page.file)) fail(`${page.file}: missing file`);
    if (rewrites.get(page.route) !== page.file) {
      fail(`${page.route}: missing rewrite to ${page.file}`);
    }
  }
  for (const page of worksPages.filter((p) => p.file.endsWith('.html'))) {
    const oldRoute = `/${page.file}`;
    if (!redirects.has(oldRoute)) fail(`${oldRoute}: missing 301 redirect`);
  }

  const sitemap = read('sitemap.xml');
  const sitemapUrls = matches(sitemap, /<loc>([^<]+)<\/loc>/g).map((m) => m[1]);
  const sitemapSet = new Set(sitemapUrls);
  for (const page of worksPages) {
    const url = `https://shavonnewong.art${page.route}`;
    if (!sitemapSet.has(url)) fail(`sitemap.xml: missing ${url}`);
  }
  for (const url of sitemapUrls) {
    if (/\/works?\.html|after-ophelia\.html|meet-eva-here\.html|the-ties-that-bind\.html|by-proxy\.html|love-is-love\.html|vogue-singapore\.html|6529-meme-card\.html|whirlwind-of-the-waking-dream\.html|3d-single-works\.html/.test(url)) {
      fail(`sitemap.xml: old Works URL leaked: ${url}`);
    }
  }
  if (sitemapSet.size !== sitemapUrls.length) fail('sitemap.xml: duplicate URLs found');
  if (!/Sitemap:\s*https:\/\/shavonnewong\.art\/sitemap\.xml/.test(read('robots.txt'))) {
    fail('robots.txt: missing sitemap directive');
  }
}

function validateHeaders() {
  let currentPath = null;
  for (const [index, raw] of read('_headers').split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    if (/^\S/.test(raw)) {
      if (!raw.startsWith('/')) fail(`_headers:${index + 1}: path rule must start with /`);
      currentPath = raw.trim();
    } else if (/^\s{2}\S/.test(raw)) {
      if (!currentPath) fail(`_headers:${index + 1}: header without path`);
      if (!/^\s{2}[^:]+:\s*.+$/.test(raw)) fail(`_headers:${index + 1}: malformed header`);
    } else {
      fail(`_headers:${index + 1}: unexpected indentation`);
    }
  }
}

function validateGrid(html) {
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  const staticCards = matches(markup, /<a class="wk-card(?![^"]*\bwk-card--edition\b)\b/g);
  if (staticCards.length !== 6) fail('works.html: expected 6 static project/body cards');
  if (!/href="\/works\/3d-single-works\/"/.test(html)) fail('works.html: missing 3D Single Works collection card');
  if (/\/assets\/data\/available\.json|wk-card-archive/.test(html) || /wk-card-archive/.test(read('works-redesign.css'))) {
    fail('works.html: individual 1/1 archive cards should be collapsed into the 3D Single Works card');
  }
  if (!/class="wk-search-input"/.test(html)) fail('works.html: missing search input');
  if (!/<a class="wk-chip wk-chip-link" href="\/works\/available\/">Available works <span>&rarr;<\/span><\/a>/.test(html)) {
    fail('works.html: Available works chip should link to /works/available/');
  }
  if (/data-filter="available"/.test(html)) fail('works.html: Available works should not be a local filter');
  if (/wk-pill|wk-media-scrim/.test(html) || /wk-pill|wk-media-scrim/.test(read('works-redesign.css'))) {
    fail('works grid: old overlay pill/scrim classes remain');
  }
}

function validateManifests() {
  const byProxy = JSON.parse(read('assets/data/by-proxy.json'));
  if (byProxy.length !== 60) fail(`assets/data/by-proxy.json: expected 60 entries, found ${byProxy.length}`);
  for (const [index, item] of byProxy.entries()) {
    for (const field of ['id', 'title', 'image', 'marketplace_url', 'etherscan_url', 'status']) {
      if (!item[field]) fail(`assets/data/by-proxy.json entry ${index + 1}: missing ${field}`);
    }
  }
  if (!/data-series-src="\/assets\/data\/by-proxy\.json"/.test(read('by-proxy.html'))) {
    fail('by-proxy.html: missing JSON-backed series grid');
  }

  const available = JSON.parse(read('assets/data/available.json'));
  const availableMerged = JSON.parse(read('assets/data/available.merged.json'));
  if (!Array.isArray(available)) fail('assets/data/available.json: expected array');
  if (!Array.isArray(availableMerged.items)) fail('assets/data/available.merged.json: expected items array');
  const editionTypes = new Set(available.map((item) => item.edition_type));
  for (const type of ['unique', 'series', 'edition']) {
    if (!editionTypes.has(type)) fail(`assets/data/available.json: missing ${type} example`);
  }
  for (const [index, item] of available.entries()) {
    for (const field of ['id', 'edition_type', 'title', 'year', 'medium', 'image', 'price_band', 'primary_action']) {
      if (!item[field]) fail(`assets/data/available.json entry ${index + 1}: missing ${field}`);
    }
    if (item.edition_type === 'series') {
      if (!item.series_section_url?.startsWith('/works/') || !item.series_section_url.includes('#available')) {
        fail(`assets/data/available.json entry ${index + 1}: series must link to project #available section`);
      }
      if (/opensea|manifold|superrare/i.test(item.series_section_url)) {
        fail(`assets/data/available.json entry ${index + 1}: series card links directly to marketplace`);
      }
    }
  }
  if (!/id="available"[\s\S]*data-series-src="\/assets\/data\/by-proxy\.json"/.test(read('by-proxy.html'))) {
    fail('by-proxy.html: #available section must contain the series grid');
  }
  if (!/id="available"[\s\S]*class="sp-series-grid"/.test(read('love-is-love.html'))) {
    fail('love-is-love.html: #available section must contain the series grid');
  }

  const singleWorks = JSON.parse(read('assets/data/3d-single-works.json'));
  if (!Array.isArray(singleWorks)) fail('assets/data/3d-single-works.json: expected array');
  if (singleWorks.length !== 45) {
    fail(`assets/data/3d-single-works.json: expected 45 single works, found ${singleWorks.length}`);
  }
  for (const id of ['whirlwind-of-the-waking-dream']) {
    if (!singleWorks.some((item) => item.id === id)) fail(`assets/data/3d-single-works.json: missing ${id}`);
  }
  for (const id of ['faces-of-freedom', 'vogue-singapore-nft-cover']) {
    if (!available.some((item) => item.id === id)) fail(`assets/data/available.json: missing commission ${id}`);
    if (singleWorks.some((item) => item.id === id)) fail(`assets/data/3d-single-works.json: commission ${id} should not be in 3D Single Works`);
  }
  for (const [index, item] of singleWorks.entries()) {
    for (const field of ['id', 'title', 'year', 'medium', 'status', 'image', 'brief_description', 'edition_info']) {
      if (!item[field]) fail(`assets/data/3d-single-works.json entry ${index + 1}: missing ${field}`);
    }
    if (item.series_cluster && !Number.isInteger(item.series_position)) {
      fail(`assets/data/3d-single-works.json entry ${index + 1}: clustered work missing numeric series_position`);
    }
  }
  const clusterSizes = new Map();
  for (const item of singleWorks) {
    if (!item.series_cluster) continue;
    clusterSizes.set(item.series_cluster, (clusterSizes.get(item.series_cluster) || 0) + 1);
  }
  const expectedClusters = new Map([
    ['the-watched-self', 15],
    ['stories-older-than-me', 4],
    ['moons-and-flowers', 14],
    ['held-in-time', 7],
    ['on-the-surface', 5],
  ]);
  for (const [cluster, size] of expectedClusters) {
    if (clusterSizes.get(cluster) !== size) {
      fail(`assets/data/3d-single-works.json: cluster ${cluster} has ${clusterSizes.get(cluster) || 0} works, expected ${size}`);
    }
  }
  for (const cluster of clusterSizes.keys()) {
    if (!expectedClusters.has(cluster)) fail(`assets/data/3d-single-works.json: unexpected cluster ${cluster}`);
  }
  if (!/data-single-work-groups/.test(read('3d-single-works.html'))) {
    fail('3d-single-works.html: missing contact-sheet grid container');
  }
}

function main() {
  validateRoutesAndSitemap();
  validateHeaders();
  validateManifests();

  for (const page of worksPages) {
    const html = read(page.file);
    validateMetadata(page, html);
    validateHeadings(page, html);
    validateProjectSections(page, html);
    validateBodySections(page, html);
    validatePlates(page, html);
    validateAccessibility(page, html);
    if (/target="_blank"/.test(html)) fail(`${page.file}: target="_blank" should not be used in catalog links`);
    if (/Inquire|Coming soon|wk-pill|wk-media-scrim/.test(html)) fail(`${page.file}: removed catalog language/class remains`);
    if (page.type === 'grid') validateGrid(html);
  }

  if (issues.length) {
    console.error(`Works catalog validation failed with ${issues.length} issue(s):`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }
  console.log(`Works catalog validation passed (${worksPages.length} pages).`);
}

main();
