#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const issues = [];
const rewrites = new Map();
const dynamicFragments = new Map();
const oldWorksPattern = /\b(?:works|after-ophelia|meet-eva-here|the-ties-that-bind|by-proxy|love-is-love|vogue-singapore|6529-meme-card|whirlwind-of-the-waking-dream|3d-single-works)\.html\b/;

for (const raw of fs.readFileSync(path.join(root, '_redirects'), 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const [from, to, status] = line.split(/\s+/);
  if (status === '200') rewrites.set(from, to.replace(/^\//, ''));
}

function existsRoute(route) {
  if (route === '/') return fs.existsSync(path.join(root, 'index.html'));
  if (rewrites.has(route)) return fs.existsSync(path.join(root, rewrites.get(route)));
  return fs.existsSync(path.join(root, route.replace(/^\//, '')));
}

function routeFile(route) {
  if (route === '/') return 'index.html';
  if (rewrites.has(route)) return rewrites.get(route);
  return route.replace(/^\//, '');
}

function hasFragment(file, id) {
  if (!file.endsWith('.html')) return true;
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  if (id === 'top') return true;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\bid=["']${escaped}["']|\\bname=["']${escaped}["']`).test(html)
    || getDynamicFragments(file).has(id);
}

function getDynamicFragments(file) {
  if (dynamicFragments.has(file)) return dynamicFragments.get(file);
  const ids = new Set();
  if (file === '3d-single-works.html') {
    const items = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/3d-single-works.json'), 'utf8'));
    for (const item of items) {
      if (item.id) ids.add(String(item.id));
    }
  }
  dynamicFragments.set(file, ids);
  return ids;
}

function normalizeLink(baseFile, raw) {
  if (!raw || raw.startsWith('#')) return { skip: true };
  if (raw.startsWith('//')) return { skip: true };
  if (/^(?:https?:|mailto:|tel:|data:|javascript:|app:)/i.test(raw)) return { skip: true };

  const [beforeHash, hash = ''] = raw.split('#');
  const pathname = beforeHash.split('?')[0];
  if (!pathname) return { skip: true };

  let route;
  if (pathname.startsWith('/')) {
    route = pathname;
  } else {
    route = `/${path.posix.normalize(path.posix.join(path.posix.dirname(`/${baseFile.replace(/\\/g, '/')}`), pathname))}`;
  }
  return { route, hash };
}

const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html'));

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const linkHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');

  for (const match of linkHtml.matchAll(/(?:href|src|poster)=["']([^"']+)["']/g)) {
    const raw = match[1];
    const link = normalizeLink(file, raw);
    if (link.skip) continue;

    if (!existsRoute(link.route)) {
      issues.push(`${file}: missing local target ${raw} -> ${link.route}`);
    } else if (link.hash) {
      const targetFile = routeFile(link.route);
      if (!hasFragment(targetFile, link.hash)) {
        issues.push(`${file}: missing fragment #${link.hash} in ${targetFile} from ${raw}`);
      }
    }
  }

  if (oldWorksPattern.test(html)) {
    const oldRefs = [...html.matchAll(oldWorksPattern)].map((match) => match[0]);
    issues.push(`${file}: old Works .html reference(s): ${[...new Set(oldRefs)].join(', ')}`);
  }
}

for (const file of ['site-i18n.js', 'scroll-narrative.js', 'scroll-pages.css', 'works-redesign.css']) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  const text = fs.readFileSync(fullPath, 'utf8');
  if (oldWorksPattern.test(text)) {
    const refs = [...text.matchAll(oldWorksPattern)].map((match) => match[0]);
    issues.push(`${file}: old Works .html reference(s): ${[...new Set(refs)].join(', ')}`);
  }
}

if (issues.length) {
  console.error(`Full-site local link validation failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Full-site local link validation passed (${htmlFiles.length} HTML files checked).`);
