#!/usr/bin/env node
/**
 * validate-press-previews.mjs
 *
 * Checks that the three parts of the press hover preview system stay in sync:
 *   1. press.html (+ zh-hans / zh-hant) — the press rows (.pr-row links)
 *   2. assets/data/press-previews.json  — URL->preview mappings
 *   3. assets/press/previews/           — actual image files on disk
 *
 * Also checks press-hover.js is NOT hardcoding URL entries
 * (regression check: the map must live in the JSON, not the JS).
 *
 * Usage:
 *   node tools/validate-press-previews.mjs
 *
 * Exit 0 = all clear. Exit 1 = problems found (printed to stdout).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// helpers

function readFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function listDir(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs);
}

// Extract hrefs from press rows in HTML
function extractPrRowHrefs(html) {
  const hrefs = [];
  // Match <a class="pr-row" href="..."> or <a href="..." class="pr-row">
  const patterns = [
    /<a\s[^>]*class="[^"]*pr-row[^"]*"[^>]*href="([^"]+)"/g,
    /<a\s[^>]*href="([^"]+)"[^>]*class="[^"]*pr-row[^"]*"/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      hrefs.push(m[1]);
    }
  }
  return [...new Set(hrefs)];
}

// load data

const errors = [];
const warnings = [];

// 1. Load press-previews.json
const jsonPath = 'assets/data/press-previews.json';
const jsonRaw = readFile(jsonPath);
if (!jsonRaw) {
  errors.push('MISSING: ' + jsonPath + ' -- run the data-driven refactor first');
  process.exit(1);
}
let previewData;
try {
  previewData = JSON.parse(jsonRaw);
} catch (e) {
  errors.push('INVALID JSON: ' + jsonPath + ' -- ' + e.message);
  process.exit(1);
}

const jsonMatches = new Set(previewData.map(function(e) { return e.match; }));

// 2. Check every preview file referenced in JSON actually exists on disk
for (const entry of previewData) {
  const previewRel = entry.preview.replace(/^\//, '');
  if (!fileExists(previewRel)) {
    errors.push('MISSING FILE: ' + entry.preview + ' (referenced by match "' + entry.match + '")');
  }
}

// 3. Check every file in assets/press/previews/ is referenced by JSON
const previewsDir = 'assets/press/previews';
const previewFiles = listDir(previewsDir);
const referencedPreviews = new Set(
  previewData
    .map(function(e) { return e.preview; })
    .filter(function(p) { return p.startsWith('/assets/press/previews/'); })
    .map(function(p) { return path.basename(p); })
);
for (const file of previewFiles) {
  if (!referencedPreviews.has(file)) {
    warnings.push('UNUSED FILE: /assets/press/previews/' + file + ' -- not in JSON (may be safe to delete)');
  }
}

// 4. Check press.html rows have JSON entries
const pressFiles = ['press.html', 'press-zh-hans.html', 'press-zh-hant.html'];
const unmapped = new Set();
for (const htmlFile of pressFiles) {
  const html = readFile(htmlFile);
  if (!html) {
    warnings.push('NOT FOUND: ' + htmlFile);
    continue;
  }
  const hrefs = extractPrRowHrefs(html);
  for (const href of hrefs) {
    const matched = [...jsonMatches].some(function(m) { return href.includes(m); });
    if (!matched) {
      if (href.startsWith('#') || href.startsWith('mailto:') || href === '/') continue;
      unmapped.add(href);
    }
  }
}
for (const href of unmapped) {
  warnings.push('NO PREVIEW ENTRY: "' + href + '" -- add to assets/data/press-previews.json');
}

// 5. Regression check: press-hover.js must NOT contain hardcoded URL entries
const hoverJs = readFile('press-hover.js');
const regressionMarkers = [
  'straitstimes.com/singapore/community/what-does-the-rise-of-genai',
  'cntrfld.art/in-conversation-shavonne-wong',
  'brandinginasia.com/shavonne-wong',
];
if (hoverJs && regressionMarkers.some(function(m) { return hoverJs.includes(m); })) {
  errors.push('REGRESSION: press-hover.js contains hardcoded URL entries -- the map must live in assets/data/press-previews.json');
}

// 6. Check press-hover.js fetches the JSON
if (hoverJs && !hoverJs.includes('press-previews.json')) {
  errors.push('press-hover.js does not fetch press-previews.json -- it may be the old hardcoded version');
}

// report

const hasErrors = errors.length > 0;
const hasWarnings = warnings.length > 0;

if (!hasErrors && !hasWarnings) {
  console.log('OK press previews: all clear');
  console.log('  ' + previewData.length + ' JSON entries, ' + previewFiles.length + ' preview files');
  process.exit(0);
}

if (hasErrors) {
  console.log('\n-- ERRORS (must fix before deploying) --');
  errors.forEach(function(e) { console.log('  X ' + e); });
}

if (hasWarnings) {
  console.log('\n-- WARNINGS (review recommended) --');
  warnings.forEach(function(w) { console.log('  ! ' + w); });
}

console.log('\n' + errors.length + ' error(s), ' + warnings.length + ' warning(s)');
process.exit(hasErrors ? 1 : 0);
