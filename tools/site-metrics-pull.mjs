#!/usr/bin/env node
/*
 * site-metrics-pull.mjs  -  enriched weekly pull for the Site Analytics dashboard
 * -------------------------------------------------------------------------------
 * Companion to ga-digest.mjs / gsc-digest.mjs. Pulls the richer dataset the
 * weekly-visibility-check task needs to rebuild the Claude dashboard artifact and
 * append the weekly YAML block to the vault's Codex site-metrics-history.md:
 *   GA4 (7d): totals, prior-week baselines, per-page views + engagement + users,
 *             sessionSource/medium referrers, countries with engagement
 *   GSC (28d, 3d lag): totals, top queries, top pages, daily rows for weekly series
 * Prints one JSON object to stdout. Run from the site root:
 *   node tools/site-metrics-pull.mjs
 * Uses the same OAuth credential files as the digests (tools/ga-oauth.json,
 * tools/gsc-oauth.json, quota project core-chemist-500107-f4). Zero dependencies.
 * Created 2026-07-09 for the weekly analytics dashboard (see vault _AI_Drafts/Codex/
 * site-metrics-history.md for the schema and interpretation rules).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const gaCreds = JSON.parse(readFileSync(path.join(ROOT, 'tools/ga-oauth.json'), 'utf8'));
const gscCreds = JSON.parse(readFileSync(path.join(ROOT, 'tools/gsc-oauth.json'), 'utf8'));
const QUOTA = 'core-chemist-500107-f4';
const PROPERTY = '542403795';
const SITE = 'https://www.shavonnewong.art/';

async function token(creds) {
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

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };

async function main() {
  const out = {};

  // ---------- GA4 ----------
  const gaTok = await token(gaCreds);
  const gaHeaders = {
    authorization: `Bearer ${gaTok}`,
    'content-type': 'application/json',
    'x-goog-user-project': QUOTA
  };
  const cur = { startDate: iso(daysAgo(7)), endDate: iso(daysAgo(1)) };
  const weeks = [];
  for (let w = 1; w <= 4; w++) {
    weeks.push({ startDate: iso(daysAgo(7 * (w + 1))), endDate: iso(daysAgo(7 * w + 1)) });
  }
  const requests = [
    { dateRanges: [cur], dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }], metrics: [{ name: 'sessions' }], limit: 15, orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] },
    { dateRanges: [cur], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'userEngagementDuration' }, { name: 'totalUsers' }], limit: 30, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] },
    { dateRanges: [cur], metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'sessions' }] },
    { dateRanges: weeks, metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'sessions' }] },
    { dateRanges: [cur], dimensions: [{ name: 'country' }], metrics: [{ name: 'totalUsers' }, { name: 'userEngagementDuration' }], limit: 10, orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }] }
  ];
  const gaRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:batchRunReports`, {
    method: 'POST', headers: gaHeaders, body: JSON.stringify({ requests })
  });
  if (!gaRes.ok) throw new Error(`GA batch failed (${gaRes.status}): ${await gaRes.text()}`);
  const ga = (await gaRes.json()).reports;
  out.gaWindow = cur;
  out.sources = (ga[0].rows || []).map(r => ({
    source: r.dimensionValues[0].value, medium: r.dimensionValues[1].value,
    sessions: +r.metricValues[0].value
  }));
  out.pages = (ga[1].rows || []).map(r => ({
    path: r.dimensionValues[0].value,
    views: +r.metricValues[0].value,
    engagementSec: +r.metricValues[1].value,
    users: +r.metricValues[2].value
  }));
  const tot = ga[2].rows?.[0]?.metricValues.map(v => +v.value) || [0, 0, 0];
  out.totals = { pageViews: tot[0], visitors: tot[1], sessions: tot[2] };
  out.baselineWeeks = (ga[3].rows || []).map(r => ({
    range: r.dimensionValues?.[0]?.value ?? '',
    pageViews: +r.metricValues[0].value,
    visitors: +r.metricValues[1].value,
    sessions: +r.metricValues[2].value
  }));
  out.countries = (ga[4].rows || []).map(r => ({
    country: r.dimensionValues[0].value,
    users: +r.metricValues[0].value,
    engagementSec: +r.metricValues[1].value
  }));

  // ---------- GSC ----------
  const gscTok = await token(gscCreds);
  const gscHeaders = {
    authorization: `Bearer ${gscTok}`,
    'content-type': 'application/json',
    'x-goog-user-project': QUOTA
  };
  const LAG = 3;
  const gscRange = { startDate: iso(daysAgo(28 + LAG)), endDate: iso(daysAgo(LAG)) };
  out.gscWindow = gscRange;
  async function gscQuery(body) {
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
      method: 'POST', headers: gscHeaders, body: JSON.stringify({ ...gscRange, ...body })
    });
    if (!res.ok) throw new Error(`GSC failed (${res.status}): ${await res.text()}`);
    return (await res.json()).rows || [];
  }
  out.gscTotals = (await gscQuery({ rowLimit: 1 }))[0] || {};
  out.gscQueries = (await gscQuery({ dimensions: ['query'], rowLimit: 40 })).map(r => ({
    query: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: +r.position.toFixed(1)
  }));
  out.gscPages = (await gscQuery({ dimensions: ['page'], rowLimit: 25 })).map(r => ({
    page: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: +r.position.toFixed(1)
  }));
  out.gscDaily = (await gscQuery({ dimensions: ['date'], rowLimit: 40 })).map(r => ({
    date: r.keys[0], clicks: r.clicks, impressions: r.impressions
  }));

  console.log(JSON.stringify(out, null, 1));
}
main().catch(e => { console.error(e.message); process.exit(1); });
