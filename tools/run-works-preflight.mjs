#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function fail(file, message) {
  failures.push({ file, message });
}

function warn(file, message) {
  warnings.push({ file, message });
}

function htmlFiles() {
  return fs.readdirSync(root)
    .filter((name) => name.endsWith('.html'))
    .sort();
}

function extractAttrs(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/\s([:\w-]+)\s*=\s*(['"])(.*?)\2/g)) {
    attrs[match[1].toLowerCase()] = match[3];
  }
  return attrs;
}

function metaValue(html, selectorName, selectorValue) {
  const attr = selectorName.toLowerCase();
  const target = selectorValue.toLowerCase();
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const attrs = extractAttrs(match[0]);
    if ((attrs[attr] || '').toLowerCase() === target) return attrs.content || '';
  }
  return '';
}

function linkValue(html, rel) {
  const target = rel.toLowerCase();
  for (const match of html.matchAll(/<link\s+[^>]*>/gi)) {
    const attrs = extractAttrs(match[0]);
    if ((attrs.rel || '').toLowerCase() === target) return attrs.href || '';
  }
  return '';
}

function titleValue(html) {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function cleanLocalUrl(value) {
  if (!value) return '';
  const url = value.trim();
  if (!url || url.startsWith('#')) return '';
  if (/^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(url)) return '';
  const clean = url.split('#')[0].split('?')[0];
  try {
    return decodeURI(clean);
  } catch {
    return clean;
  }
}

function routeMapFromRedirects() {
  if (!exists('_redirects')) return new Map();
  const routes = new Map();
  for (const raw of read('_redirects').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 3 && parts[2] === '200') routes.set(parts[0], parts[1]);
  }
  routes.set('/', '/index.html');
  return routes;
}

function localTargetExists(url, routeMap) {
  const cleaned = cleanLocalUrl(url);
  if (!cleaned) return true;
  if (routeMap.has(cleaned)) return true;
  if (cleaned.startsWith('/')) {
    const file = cleaned.slice(1);
    if (!file) return true;
    return exists(file) || exists(path.join(file, 'index.html'));
  }
  return exists(cleaned) || routeMap.has(`/${cleaned}`);
}

function checkMalformedHtml(files) {
  for (const file of files) {
    const html = read(file);
    if (html.includes('\u0000')) fail(file, 'contains null-byte padding');
    if (!/<\/html>\s*$/i.test(html)) fail(file, 'does not end with a closing </html> tag');
    const openScripts = countMatches(html, /<script\b/gi);
    const closeScripts = countMatches(html, /<\/script>/gi);
    if (openScripts !== closeScripts) {
      fail(file, `has ${openScripts} <script> tags but ${closeScripts} closing </script> tags`);
    }
    if (!/<h1\b/i.test(html) && file !== 'index.html') warn(file, 'has no visible H1 element');
  }
}

function checkSharedScripts(files) {
  for (const file of files) {
    if (file === 'index.html') continue;
    const html = read(file);
    const headerCount = countMatches(html, /site-header\.js/gi);
    const i18nCount = countMatches(html, /site-i18n\.js/gi);
    if (headerCount !== 1) fail(file, `loads site-header.js ${headerCount} times`);
    if (i18nCount !== 1) fail(file, `loads site-i18n.js ${i18nCount} times`);
  }
}

function checkMetadata(files) {
  const required = [
    ['name', 'description'],
    ['property', 'og:title'],
    ['property', 'og:description'],
    ['property', 'og:image'],
    ['name', 'twitter:card'],
    ['name', 'twitter:title'],
    ['name', 'twitter:description'],
    ['name', 'twitter:image']
  ];

  for (const file of files) {
    const html = read(file);
    const title = titleValue(html);
    if (!title) fail(file, 'is missing a <title>');
    else if (!title.includes('|')) fail(file, 'title does not use the required pipe separator');

    const canonical = linkValue(html, 'canonical');
    if (!canonical) fail(file, 'is missing a canonical link');
    else if (!canonical.startsWith('https://www.shavonnewong.art/')) {
      fail(file, `canonical is not on the www host: ${canonical}`);
    }

    for (const [attr, value] of required) {
      if (!metaValue(html, attr, value)) fail(file, `is missing ${attr}="${value}" metadata`);
    }

    const ogUrl = metaValue(html, 'property', 'og:url');
    if (ogUrl && !ogUrl.startsWith('https://www.shavonnewong.art/')) {
      fail(file, `og:url is not on the www host: ${ogUrl}`);
    }
  }
}

function checkJsonLd(files) {
  for (const file of files) {
    const html = read(file);
    for (const match of html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      const json = match[1].trim();
      if (!json) {
        fail(file, 'has an empty JSON-LD block');
        continue;
      }
      try {
        JSON.parse(json);
      } catch (error) {
        fail(file, `has invalid JSON-LD: ${error.message}`);
      }
    }
  }
}

function checkSitemap(files) {
  if (!exists('sitemap.xml')) {
    fail('sitemap.xml', 'is missing');
    return;
  }
  const sitemap = read('sitemap.xml');
  const urls = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]));
  const routeMap = routeMapFromRedirects();

  for (const file of files) {
    const canonical = linkValue(read(file), 'canonical');
    if (canonical && !urls.has(canonical)) fail(file, `canonical is absent from sitemap: ${canonical}`);
  }

  for (const url of urls) {
    if (!url.startsWith('https://www.shavonnewong.art/')) {
      fail('sitemap.xml', `contains non-www URL: ${url}`);
      continue;
    }
    const pathname = new URL(url).pathname;
    if (!localTargetExists(pathname, routeMap)) fail('sitemap.xml', `URL has no local route/file: ${url}`);
  }
}

function checkLocalAssets(files) {
  const routeMap = routeMapFromRedirects();
  const attrsToCheck = ['href', 'src', 'poster'];

  for (const file of files) {
    const html = read(file);
    for (const match of html.matchAll(/<[^>]+\s(?:href|src|poster)=['"][^'"]+['"][^>]*>/gi)) {
      const attrs = extractAttrs(match[0]);
      for (const attr of attrsToCheck) {
        const value = attrs[attr];
        if (!value) continue;
        if (!localTargetExists(value, routeMap)) fail(file, `references missing local ${attr}: ${value}`);
      }
    }

    for (const match of html.matchAll(/\bsrcset\s*=\s*(['"])(.*?)\1/gi)) {
      for (const candidate of match[2].split(',')) {
        const value = candidate.trim().split(/\s+/)[0];
        if (!localTargetExists(value, routeMap)) fail(file, `references missing local srcset asset: ${value}`);
      }
    }
  }
}

function checkDeploymentParity() {
  if (!exists('_redirects') || !exists('vercel.json')) return;
  const redirectsRoutes = [...routeMapFromRedirects().entries()]
    .filter(([source]) => source !== '/')
    .map(([source, destination]) => `${source} ${destination}`);
  const vercel = JSON.parse(read('vercel.json'));
  const vercelRoutes = new Set((vercel.rewrites || []).map((route) => `${route.source} ${route.destination}`));
  for (const route of redirectsRoutes) {
    if (!vercelRoutes.has(route)) fail('vercel.json', `missing rewrite mirrored from _redirects: ${route}`);
  }
}

function checkAvailabilityGate() {
  const css = exists('works-v2.css') ? read('works-v2.css') : '';
  const html = exists('works.html') ? read('works.html') : '';
  if (!/\.wk2-dot\s*\{[\s\S]*?display\s*:\s*none\s*;/i.test(css)) {
    fail('works-v2.css', 'does not hide .wk2-dot by default');
  }
  if (!/\.wk2-show-availability\s+\.wk2-dot\s*\{[\s\S]*?display\s*:/i.test(css)) {
    fail('works-v2.css', 'does not reveal .wk2-dot only under .wk2-show-availability');
  }
  if (!/classList\.toggle\(\s*['"]wk2-show-availability['"]\s*,\s*currentTab\(\)\s*===\s*['"]available['"]\s*\)/.test(html)) {
    fail('works.html', 'does not toggle availability labels strictly from the Available tab state');
  }
}

function main() {
  const files = htmlFiles();
  checkMalformedHtml(files);
  checkSharedScripts(files);
  checkMetadata(files);
  checkJsonLd(files);
  checkSitemap(files);
  checkLocalAssets(files);
  checkDeploymentParity();
  checkAvailabilityGate();

  if (warnings.length) {
    console.log('Warnings:');
    for (const item of warnings) console.log(`- ${item.file}: ${item.message}`);
  }

  if (failures.length) {
    console.error('Preflight failed:');
    for (const item of failures) console.error(`- ${item.file}: ${item.message}`);
    process.exit(1);
  }

  console.log(`Preflight passed for ${files.length} HTML files.`);
}

main();
