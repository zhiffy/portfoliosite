#!/usr/bin/env node
/*
 * gsc-migration-watch.mjs  -  one-line "is the URL migration landing yet?" status
 * ------------------------------------------------------------------------------
 * Purpose: after the Jun 2026 revamp moved the site from the old Squarespace URL
 * structure (/projects/..., /nfts, /art, /links, /11x, /update20xx) to the new
 * clean /works/... structure, Google kept ranking the OLD urls. The 301 redirect +
 * canonical fix that lets the new pages inherit ranking authority went live
 * 2026-07-05. This watcher reports, in ONE line, whether Google has started
 * crediting search clicks/impressions to the new /works/ pages yet.
 *
 * It is consumed by the daily-briefing task (Step 6d). It reuses the same
 * Search Console OAuth login as gsc-digest.mjs and prints:
 *   WEBSITE_WATCH: <human one-liner for the briefing>
 *   STATUS: WAITING | MOVING | HELD
 * On any error it prints a friendly one-liner and exits 0, so it never crashes
 * the briefing (same contract as gsc-digest.mjs).
 *
 * Run from the site root:  node tools/gsc-migration-watch.mjs
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'tools', 'gsc-digest.config.json');
const STATE_PATH = path.join(ROOT, 'tools', 'gsc-migration-watch.state.json');

// Migration facts (edit only if the timeline changes)
const REDIRECT_FIX = '2026-07-05'; // day the 301 + canonical fix went live
const LAUNCH_LABEL = 'the Jun 3 launch';

function bail(msg) {
  console.log(`WEBSITE_WATCH: Search migration watch unavailable this run. ${msg}`);
  console.log('STATUS: UNKNOWN');
  process.exit(0);
}

let cfg = {};
if (existsSync(CONFIG_PATH)) {
  try { cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); } catch { /* ignore */ }
}
const siteUrl = process.env.GSC_SITE_URL || cfg.siteUrl || '';
if (!siteUrl) bail('No siteUrl configured.');

let credsPath = process.env.GSC_OAUTH || cfg.keyFile || 'tools/gsc-oauth.json';
if (credsPath && !path.isAbsolute(credsPath)) credsPath = path.resolve(ROOT, credsPath);
if (!existsSync(credsPath)) bail('No Search Console login found.');

let creds;
try { creds = JSON.parse(readFileSync(credsPath, 'utf8')); }
catch (e) { bail(`Login could not be read (${e.message}).`); }
if (!creds.client_id || !creds.refresh_token) bail('Login file missing client_id or refresh_token.');

const quotaProject = creds.quota_project_id || cfg.quotaProjectId || process.env.GSC_QUOTA_PROJECT || '';

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };
const LAG = 3, WINDOW = 28;
const startDate = iso(daysAgo(LAG + WINDOW - 1));
const endDate = iso(daysAgo(LAG));

function daysBetween(fromIsoStr) {
  const ms = Date.now() - Date.parse(fromIsoStr + 'T00:00:00Z');
  return Math.max(0, Math.round(ms / 86400000));
}

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret || '',
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) throw new Error(`token refresh failed (${res.status})`);
  return (await res.json()).access_token;
}

async function queryPages(token) {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  if (quotaProject) headers['x-goog-user-project'] = quotaProject;
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(endpoint, {
    method: 'POST', headers,
    body: JSON.stringify({ startDate, endDate, dimensions: ['page'], rowLimit: 500 })
  });
  if (!res.ok) throw new Error(`query failed (${res.status})`);
  return (await res.json()).rows || [];
}

const OLD_RE = /\/(projects|nfts|art|links)\b|\/11x|\/update20/i;
const NEW_RE = /\/works\//i;

(async () => {
  try {
    const token = await accessToken();
    const rows = await queryPages(token);

    const acc = { neu: { c: 0, i: 0 }, old: { c: 0, i: 0 }, other: { c: 0, i: 0 } };
    for (const r of rows) {
      const u = r.keys[0];
      const bucket = NEW_RE.test(u) ? 'neu' : OLD_RE.test(u) ? 'old' : 'other';
      acc[bucket].c += r.clicks || 0;
      acc[bucket].i += r.impressions || 0;
    }
    const neu = acc.neu, old = acc.old;
    const sinceFix = daysBetween(REDIRECT_FIX);

    // Status thresholds
    let status;
    if (neu.c >= 10 || (neu.i > 0 && neu.i >= old.i)) status = 'HELD';
    else if (neu.c >= 1) status = 'MOVING';
    else status = 'WAITING';

    // Detect first-ever crossing for a celebratory note
    let firstClick = false;
    let prev = {};
    if (existsSync(STATE_PATH)) { try { prev = JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { /* ignore */ } }
    if ((prev.newClicks || 0) === 0 && neu.c > 0) firstClick = true;

    let text;
    if (status === 'WAITING') {
      text = `Search migration: your new /works/ pages still have 0 search clicks (${neu.i} impressions/28d) while the old URLs hold ${old.c} clicks / ${old.i} impressions. Google has not re-crawled since the Jul 5 redirect fix (${sinceFix}d ago). No action, just waiting.`;
    } else if (status === 'MOVING') {
      text = `Search migration is starting to land${firstClick ? ' (first clicks just showed up)' : ''}: /works/ pages now earn ${neu.c} clicks / ${neu.i} impressions over 28d, up from 0 at ${LAUNCH_LABEL}. Old URLs down to ${old.c} clicks / ${old.i} impressions. Google is swapping in the new pages.`;
    } else {
      text = `Search migration has taken hold: /works/ pages now earn ${neu.c} clicks / ${neu.i} impressions over 28d and are overtaking the old URLs (${old.c} clicks / ${old.i} impr). The SEO and AEO work is now being credited to the new pages.`;
    }

    // Persist state for first-crossing detection
    try {
      writeFileSync(STATE_PATH, JSON.stringify({
        updated: endDate, window: `${startDate}..${endDate}`,
        newClicks: neu.c, newImpr: neu.i, oldClicks: old.c, oldImpr: old.i, status
      }, null, 2) + '\n');
    } catch { /* non-fatal */ }

    console.log(`WEBSITE_WATCH: ${text}`);
    console.log(`STATUS: ${status}`);
  } catch (e) {
    bail(e.message);
  }
})();
