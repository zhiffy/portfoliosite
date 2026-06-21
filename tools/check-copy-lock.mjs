#!/usr/bin/env node
/*
 * check-copy-lock.mjs  -  freeze protected copy against accidental edits
 * ---------------------------------------------------------------------
 * Purpose: stop body text (bio, artist statement, any canonical copy) from
 * being silently reworded during formatting or layout work. Formatting changes
 * (tags, classes, indentation, whitespace) produce ZERO diff. Any change to the
 * actual words is caught and fails the check until it is deliberately re-locked.
 *
 * How it works:
 *   Wrap a protected passage in your HTML with a matched comment pair:
 *
 *     <!-- copy-lock:about-bio -->
 *       ... any markup, paragraphs, links ...
 *     <!-- /copy-lock:about-bio -->
 *
 *   The checker extracts the VISIBLE TEXT inside each pair (tags stripped,
 *   whitespace collapsed, a few HTML entities decoded), hashes it, and compares
 *   it to a committed baseline in tools/copy-lock.snapshot.json.
 *
 * Commands:
 *   node tools/check-copy-lock.mjs            check every locked region (exit 1 on drift)
 *   node tools/check-copy-lock.mjs --update   re-baseline the snapshot from current text
 *   node tools/check-copy-lock.mjs --list     list every locked region and its word count
 *   node tools/check-copy-lock.mjs --help     show this help
 *
 * Files scanned: tools/copy-lock.config.json -> { "files": [...] }. If that file
 * is absent, defaults to ["about.html"]. Add more files (index.html, the i18n
 * body files, work pages) to extend protection - no code change needed.
 *
 * Re-locking: when you INTENTIONALLY change locked copy, run with --update. That
 * is the one deliberate step that says "yes, these new words are correct now."
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'tools', 'copy-lock.config.json');
const SNAP_PATH = path.join(ROOT, 'tools', 'copy-lock.snapshot.json');
const DEFAULT_FILES = ['about.html'];

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

function loadFiles() {
  if (existsSync(CONFIG_PATH)) {
    try {
      const c = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
      if (Array.isArray(c.files) && c.files.length) return c.files;
    } catch (e) {
      console.error(`copy-lock: could not parse ${rel(CONFIG_PATH)} (${e.message}); using defaults.`);
    }
  }
  return DEFAULT_FILES;
}

// Reduce a chunk of HTML to comparable visible text. Tags, comments, indentation
// and entity spelling are formatting and must not register as a change; words,
// punctuation and order are content and must.
function normalize(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')   // drop nested HTML comments
    .replace(/<[^>]+>/g, ' ')           // strip tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pull every copy-lock region out of one file's raw text.
function extractRegions(raw) {
  const regions = {};
  const openRe = /<!--\s*copy-lock:([a-z0-9._-]+)\s*-->/gi;
  let m;
  while ((m = openRe.exec(raw))) {
    const key = m[1];
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const closeRe = new RegExp(`<!--\\s*/copy-lock:${esc}\\s*-->`, 'i');
    const rest = raw.slice(openRe.lastIndex);
    const cm = closeRe.exec(rest);
    if (!cm) {
      regions[key] = { error: `open marker has no matching <!-- /copy-lock:${key} -->` };
      continue;
    }
    const text = normalize(rest.slice(0, cm.index));
    if (regions[key]) regions[key] = { error: `duplicate region key "${key}" in same file` };
    else regions[key] = { text, sha: sha(text), words: text ? text.split(' ').length : 0 };
  }
  return regions;
}

function gather(files) {
  const out = {};
  for (const f of files) {
    const abs = path.join(ROOT, f);
    if (!existsSync(abs)) { out[f] = { __missing: true }; continue; }
    out[f] = extractRegions(readFileSync(abs, 'utf8'));
  }
  return out;
}

// Word-level diff (LCS). Removed words show as [-word-], added as {+word+}.
function wordDiff(oldText, newText) {
  const a = oldText ? oldText.split(' ') : [];
  const b = newText ? newText.split(' ') : [];
  const n = a.length, mLen = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(mLen + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = mLen - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const parts = [];
  let i = 0, j = 0;
  while (i < n && j < mLen) {
    if (a[i] === b[j]) { parts.push(a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { parts.push(`[-${a[i]}-]`); i++; }
    else { parts.push(`{+${b[j]}+}`); j++; }
  }
  while (i < n) parts.push(`[-${a[i++]}-]`);
  while (j < mLen) parts.push(`{+${b[j++]}+}`);
  return parts.join(' ');
}

function hasErrors(current) {
  for (const file of Object.keys(current))
    for (const key of Object.keys(current[file]))
      if (key !== '__missing' && current[file][key].error) return true;
  return false;
}

function cmdList(files) {
  const current = gather(files);
  let count = 0;
  for (const file of files) {
    const regions = current[file] || {};
    if (regions.__missing) { console.log(`  ! ${file} (file not found)`); continue; }
    const keys = Object.keys(regions);
    if (!keys.length) { console.log(`  - ${file} (no copy-lock regions)`); continue; }
    for (const key of keys) {
      const r = regions[key];
      if (r.error) console.log(`  ! ${file}  ${key}  ERROR: ${r.error}`);
      else { console.log(`  - ${file}  ${key}  (${r.words} words)`); count++; }
    }
  }
  console.log(`\n${count} locked region(s).`);
}

function cmdUpdate(files) {
  const current = gather(files);
  if (hasErrors(current)) {
    console.error('Refusing to update: fix the marker errors above first.\n');
    cmdList(files);
    process.exitCode = 1;
    return;
  }
  const snap = { _meta: { updated: new Date().toISOString(), note: 'Baseline for tools/check-copy-lock.mjs. Regenerated with --update.' } };
  let count = 0;
  for (const file of files) {
    const regions = current[file] || {};
    if (regions.__missing) continue;
    const keys = Object.keys(regions);
    if (!keys.length) continue;
    snap[file] = {};
    for (const key of keys) { snap[file][key] = { sha: regions[key].sha, text: regions[key].text }; count++; }
  }
  writeFileSync(SNAP_PATH, JSON.stringify(snap, null, 2) + '\n');
  console.log(`Locked ${count} region(s) -> ${rel(SNAP_PATH)}`);
}

function cmdCheck(files) {
  if (!existsSync(SNAP_PATH)) {
    console.error(`No baseline found at ${rel(SNAP_PATH)}.\nRun:  node tools/check-copy-lock.mjs --update`);
    process.exitCode = 1;
    return;
  }
  const snap = JSON.parse(readFileSync(SNAP_PATH, 'utf8'));
  const current = gather(files);
  const problems = [];
  let ok = 0;

  for (const file of files) {
    const cur = current[file] || {};
    if (cur.__missing) { problems.push(`${file}: file not found`); continue; }
    const baseRegions = (snap[file] && typeof snap[file] === 'object') ? snap[file] : {};
    const keys = new Set([...Object.keys(baseRegions), ...Object.keys(cur)]);
    for (const key of keys) {
      const base = baseRegions[key];
      const now = cur[key];
      if (now && now.error) { problems.push(`${file}  ${key}: ${now.error}`); continue; }
      if (!base && now) { problems.push(`${file}  ${key}: NEW locked region, not in baseline. Run --update to lock it.`); continue; }
      if (base && !now) { problems.push(`${file}  ${key}: marker MISSING from file (was locked). Restore it or run --update.`); continue; }
      if (base.sha === now.sha) { ok++; continue; }
      problems.push(
        `${file}  ${key}: TEXT CHANGED\n` +
        `      diff: ${wordDiff(base.text, now.text)}`
      );
    }
  }

  if (!problems.length) {
    console.log(`copy-lock: PASS  -  ${ok} region(s) unchanged.`);
    return;
  }
  console.error(`copy-lock: FAIL  -  ${problems.length} issue(s), ${ok} region(s) unchanged.\n`);
  for (const p of problems) console.error('  * ' + p + '\n');
  console.error('If these wording changes are intentional, re-lock with:  node tools/check-copy-lock.mjs --update');
  process.exitCode = 1;
}

const arg = process.argv[2];
const files = loadFiles();
if (arg === '--help' || arg === '-h') {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace(/^[\s\S]*?\n \*/, ' *'));
} else if (arg === '--update' || arg === 'update' || arg === '--lock') {
  cmdUpdate(files);
} else if (arg === '--list' || arg === 'list') {
  cmdList(files);
} else if (!arg || arg === 'check' || arg === '--check') {
  cmdCheck(files);
} else {
  console.error(`Unknown argument "${arg}". Try --help.`);
  process.exitCode = 1;
}
