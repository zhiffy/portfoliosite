#!/usr/bin/env node
/*
 * svt-month.mjs - one calendar month of Search Console metrics for the
 * Search Visibility Tracker. Reuses the OAuth token + config that gsc-digest
 * already uses (tools/gsc-oauth.json, tools/gsc-digest.config.json).
 *
 * Prints ONE line of JSON:
 *   {month, clicks, impressions, ctr, position, name, works, discovery, note}
 * where name/works/discovery are click counts bucketed by query.
 *
 * Usage: node tools/svt-month.mjs [YYYY-MM]   (defaults to last complete month)
 * Never throws: on any problem it prints {"error":"..."} and exits 0, so the
 * scheduled task can read the JSON and fall back gracefully.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CFG = path.join(ROOT, 'tools', 'gsc-digest.config.json');
let cfg = {};
if (existsSync(CFG)) { try { cfg = JSON.parse(readFileSync(CFG, 'utf8')); } catch { /* ignore */ } }
const siteUrl = process.env.GSC_SITE_URL || cfg.siteUrl || '';
function fail(msg) { console.log(JSON.stringify({ error: msg })); process.exit(0); }
if (!siteUrl) fail('no siteUrl in tools/gsc-digest.config.json');

let credsPath = process.env.GSC_OAUTH || cfg.keyFile || 'tools/gsc-oauth.json';
if (!path.isAbsolute(credsPath)) credsPath = path.resolve(ROOT, credsPath);
if (!existsSync(credsPath)) fail('no oauth token (run node tools/gsc-auth.mjs)');
let creds;
try { creds = JSON.parse(readFileSync(credsPath, 'utf8')); } catch (e) { fail('token unreadable'); }
if (!creds.refresh_token || !creds.client_id) fail('token missing client_id or refresh_token');
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
if (start > end) fail('month not available yet (data lag)');

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.client_id, client_secret: creds.client_secret || '', refresh_token: creds.refresh_token, grant_type: 'refresh_token' })
  });
  if (!res.ok) throw new Error('token refresh failed ' + res.status);
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

(async () => {
  try {
    const token = await accessToken();
    const t = (await q(token, { startDate: start, endDate: end, dimensions: [] }))[0] || {};
    const rows = await q(token, { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 1000 });
    let name = 0, works = 0, disc = 0;
    for (const r of rows) {
      const key = (r.keys && r.keys[0]) || ''; const c = r.clicks || 0;
      if (NAME.test(key)) name += c; else if (WORKS.test(key)) works += c; else disc += c;
    }
    const out = {
      month: monthStr,
      clicks: Math.round(t.clicks || 0),
      impressions: Math.round(t.impressions || 0),
      ctr: Math.round((t.ctr || 0) * 1000) / 10,
      position: Math.round((t.position || 0) * 10) / 10,
      name: Math.round(name), works: Math.round(works), discovery: Math.round(disc),
      note: ''
    };
    console.log(JSON.stringify(out));
  } catch (e) { console.log(JSON.stringify({ error: String((e && e.message) || e) })); process.exit(0); }
})();
