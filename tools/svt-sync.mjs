#!/usr/bin/env node
/*
 * svt-sync.mjs - pull one month from Search Console and write it into the
 * Search Visibility Tracker (tools/search-visibility-tracker.html), inside the
 * AUTO_SEO block delimited by SVT_SEO_START / SVT_SEO_END. Idempotent: re-running
 * a month replaces that month's row rather than duplicating it.
 *
 * Reuses the OAuth token + config from gsc-digest (tools/gsc-oauth.json,
 * tools/gsc-digest.config.json).
 *
 * Usage: node tools/svt-sync.mjs [YYYY-MM]   (defaults to last complete month)
 * Prints a JSON status line plus a human summary. Never throws.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HTML = path.join(ROOT, 'tools', 'search-visibility-tracker.html');
const CFG = path.join(ROOT, 'tools', 'gsc-digest.config.json');
let cfg = {};
if (existsSync(CFG)) { try { cfg = JSON.parse(readFileSync(CFG, 'utf8')); } catch { /* ignore */ } }
const siteUrl = process.env.GSC_SITE_URL || cfg.siteUrl || '';
function done(obj) { console.log(JSON.stringify(obj)); process.exit(0); }
if (!siteUrl) done({ ok: false, error: 'no siteUrl' });

let credsPath = process.env.GSC_OAUTH || cfg.keyFile || 'tools/gsc-oauth.json';
if (!path.isAbsolute(credsPath)) credsPath = path.resolve(ROOT, credsPath);
if (!existsSync(credsPath)) done({ ok: false, error: 'no oauth token' });
let creds; try { creds = JSON.parse(readFileSync(credsPath, 'utf8')); } catch { done({ ok: false, error: 'token unreadable' }); }
if (!creds.refresh_token || !creds.client_id) done({ ok: false, error: 'token missing fields' });
const quotaProject = creds.quota_project_id || cfg.quotaProjectId || '';

function lastCompleteMonth() { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d; }
let arg = process.argv[2], y, m;
if (arg && /^\d{4}-\d{2}$/.test(arg)) { y = +arg.slice(0, 4); m = +arg.slice(5, 7); }
else { const d = lastCompleteMonth(); y = d.getUTCFullYear(); m = d.getUTCMonth() + 1; }
const monthStr = `${y}-${String(m).padStart(2, '0')}`;
const start = `${monthStr}-01`;
const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
let end = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
const lag = new Date(); lag.setUTCDate(lag.getUTCDate() - 3);
const lagIso = lag.toISOString().slice(0, 10);
if (end > lagIso) end = lagIso;
if (start > end) done({ ok: false, error: 'month not available yet' });

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.client_id, client_secret: creds.client_secret || '', refresh_token: creds.refresh_token, grant_type: 'refresh_token' }) });
  if (!res.ok) throw new Error('token refresh ' + res.status);
  return (await res.json()).access_token;
}
const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
async function q(token, body) {
  const headers = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
  if (quotaProject) headers['x-goog-user-project'] = quotaProject;
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('query ' + res.status + ' ' + (await res.text()).slice(0, 160));
  return (await res.json()).rows || [];
}
const NAME = /shavonne/i;
const WORKS = /(\beva\b|ophelia|conditional|the mirror|by proxy|love is love|companion|shimmering veil|hello eva|meet eva|after ophelia)/i;

function injectMonth(row) {
  if (!existsSync(HTML)) return { ok: false, error: 'tracker html not found at ' + HTML };
  let html = readFileSync(HTML, 'utf8');
  const A = '/*SVT_SEO_START*/', B = '/*SVT_SEO_END*/';
  const i = html.indexOf(A), j = html.indexOf(B);
  if (i < 0 || j < 0 || j < i) return { ok: false, error: 'markers not found' };
  let arr = [];
  try { arr = JSON.parse(html.slice(i + A.length, j)); } catch { return { ok: false, error: 'AUTO_SEO not parseable' }; }
  arr = arr.filter(r => r.month !== row.month);
  arr.push(row);
  arr.sort((a, b) => a.month < b.month ? -1 : 1);
  const block = '[\n' + arr.map(e => '    ' + JSON.stringify(e)).join(',\n') + '\n  ]';
  html = html.slice(0, i + A.length) + block + html.slice(j);
  writeFileSync(HTML, html);
  return { ok: true, months: arr.length };
}

(async () => {
  try {
    const token = await accessToken();
    const t = (await q(token, { startDate: start, endDate: end, dimensions: [] }))[0] || {};
    const rows = await q(token, { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 1000 });
    let name = 0, works = 0, disc = 0;
    for (const r of rows) { const k = (r.keys && r.keys[0]) || ''; const c = r.clicks || 0; if (NAME.test(k)) name += c; else if (WORKS.test(k)) works += c; else disc += c; }
    const row = { month: monthStr, clicks: Math.round(t.clicks || 0), impressions: Math.round(t.impressions || 0),
      ctr: Math.round((t.ctr || 0) * 1000) / 10, position: Math.round((t.position || 0) * 10) / 10,
      name: Math.round(name), works: Math.round(works), discovery: Math.round(disc), note: '' };
    const res = injectMonth(row);
    done({ ok: res.ok, error: res.error || null, months: res.months || null, row });
  } catch (e) { done({ ok: false, error: String((e && e.message) || e) }); }
})();
