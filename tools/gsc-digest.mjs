#!/usr/bin/env node
/*
 * gsc-digest.mjs  -  Google Search Console performance digest
 * -----------------------------------------------------------
 * Twin of ga-digest.mjs. Pulls a short, plain-language search-performance
 * summary from the Search Console API and prints it as Markdown to stdout.
 * Designed to be dropped into the vault by the weekly website check-in task.
 *
 * Search Console is where the site's real, historical search visibility lives
 * (clicks, impressions, ranking position, and the actual queries people typed),
 * which is more useful than the freshly-installed GA4 property for now.
 *
 * Zero external dependencies: it refreshes the OAuth token saved by gsc-auth.mjs
 * and calls the Search Console API with fetch.
 *
 * Config (tools/gsc-digest.config.json):
 *   { "siteUrl": "https://www.shavonnewong.art/", "keyFile": "tools/gsc-oauth.json",
 *     "quotaProjectId": "core-chemist-500107-f4", "days": 28 }
 * Or environment variables: GSC_SITE_URL, GSC_DAYS, GSC_OAUTH (path).
 *
 * If anything is not configured yet, it prints a friendly one-liner and exits 0,
 * so the scheduled task never crashes on it.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'tools', 'gsc-digest.config.json');

function notConfigured(msg) {
  console.log(`Search Console not connected yet. ${msg} See tools/gsc-setup-guide.md.`);
  process.exit(0);
}

let cfg = {};
if (existsSync(CONFIG_PATH)) {
  try { cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); } catch { /* ignore */ }
}
const siteUrl = process.env.GSC_SITE_URL || cfg.siteUrl || '';
const days = Number(process.env.GSC_DAYS || cfg.days || 28);
const LAG = 3; // GSC finalizes data over ~2-3 days

function resolveCredsPath() {
  let p = process.env.GSC_OAUTH || cfg.keyFile || 'tools/gsc-oauth.json';
  if (p && !path.isAbsolute(p)) p = path.resolve(ROOT, p);
  return p || '';
}

if (!siteUrl) notConfigured('No siteUrl set.');
const credsPath = resolveCredsPath();
if (!credsPath || !existsSync(credsPath)) notConfigured('No login found (run node tools/gsc-auth.mjs).');

let creds;
try {
  creds = JSON.parse(readFileSync(credsPath, 'utf8'));
} catch (e) {
  notConfigured(`Login at ${credsPath} could not be read (${e.message}).`);
}
if (!creds.client_id || !creds.refresh_token) notConfigured('Login file is missing client_id or refresh_token.');

const quotaProject = creds.quota_project_id || cfg.quotaProjectId || process.env.GSC_QUOTA_PROJECT || '';

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
  if (!res.ok) throw new Error(`token refresh failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

// date helpers (YYYY-MM-DD)
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };
const curRange = { startDate: iso(daysAgo(LAG + days - 1)), endDate: iso(daysAgo(LAG)) };
const prevRange = { startDate: iso(daysAgo(LAG + 2 * days - 1)), endDate: iso(daysAgo(LAG + days)) };

const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

async function query(token, body) {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  if (quotaProject) headers['x-goog-user-project'] = quotaProject;
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`query failed (${res.status}): ${text}`);
    err.status = res.status;
    throw err;
  }
  return (await res.json()).rows || [];
}

async function listSites(token) {
  const headers = { authorization: `Bearer ${token}` };
  if (quotaProject) headers['x-goog-user-project'] = quotaProject;
  const res = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', { headers });
  if (!res.ok) return [];
  return ((await res.json()).siteEntry || []).map((s) => s.siteUrl);
}

const total = (rows) => {
  const r = rows[0];
  return r
    ? { clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 }
    : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
};
const pct = (cur, prev) => {
  if (!prev) return cur ? '(new)' : '(flat)';
  const change = Math.round(((cur - prev) / prev) * 100);
  return `(${change >= 0 ? '+' : ''}${change}% vs prior ${days}d)`;
};
const ctrStr = (x) => `${(x * 100).toFixed(1)}%`;
const posStr = (x) => x ? x.toFixed(1) : '-';

(async () => {
  try {
    const token = await accessToken();

    let totalsCur;
    try {
      totalsCur = total(await query(token, { ...curRange, dimensions: [] }));
    } catch (e) {
      if (e.status === 403 || e.status === 404) {
        const sites = await listSites(token);
        const hint = sites.length
          ? `Available properties: ${sites.join(', ')}. Update siteUrl in tools/gsc-digest.config.json to match one exactly.`
          : 'No properties were returned for this account. Confirm the Search Console API is enabled and this Google account has access.';
        console.log(`Search Console could not read "${siteUrl}". ${hint}`);
        process.exit(0);
      }
      throw e;
    }

    const totalsPrev = total(await query(token, { ...prevRange, dimensions: [] }));
    const queries = await query(token, { ...curRange, dimensions: ['query'], rowLimit: 10 });
    const pages = await query(token, { ...curRange, dimensions: ['page'], rowLimit: 10 });
    const countries = await query(token, { ...curRange, dimensions: ['country'], rowLimit: 6 });

    const out = [];
    out.push(`Search Console: ${siteUrl}`);
    out.push(`Window: ${curRange.startDate} to ${curRange.endDate} (last ${days} days, data lags ~${LAG}d)`);
    out.push('');
    out.push(`- Clicks ${totalsCur.clicks} ${pct(totalsCur.clicks, totalsPrev.clicks)}`);
    out.push(`- Impressions ${totalsCur.impressions} ${pct(totalsCur.impressions, totalsPrev.impressions)}`);
    out.push(`- Average CTR ${ctrStr(totalsCur.ctr)}`);
    out.push(`- Average position ${posStr(totalsCur.position)}`);
    if (queries.length) {
      out.push('');
      out.push('Top search queries (clicks | impressions | position)');
      for (const r of queries) out.push(`- ${r.keys[0]} (${r.clicks} | ${r.impressions} | ${posStr(r.position)})`);
    }
    if (pages.length) {
      out.push('');
      out.push('Top pages (clicks | impressions | position)');
      for (const r of pages) out.push(`- ${r.keys[0]} (${r.clicks} | ${r.impressions} | ${posStr(r.position)})`);
    }
    if (countries.length) {
      out.push('');
      out.push('Top countries (clicks)');
      out.push(countries.map((r) => `${(r.keys[0] || '').toUpperCase()} ${r.clicks}`).join(', '));
    }
    console.log(out.join('\n'));
  } catch (e) {
    // Never crash the weekly task: report the problem in plain language.
    console.log(`Search Console digest could not run this time: ${e.message}`);
    process.exit(0);
  }
})();
