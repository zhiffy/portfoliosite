#!/usr/bin/env node
/*
 * ga-digest.mjs  -  weekly Google Analytics 4 site-signals digest
 * --------------------------------------------------------------
 * Pulls a short, plain-language traffic summary from the GA4 Data API and prints
 * it as Markdown to stdout. Designed to be run by the weekly website check-in
 * scheduled task, which drops the output into the vault.
 *
 * Zero external dependencies: it signs a service-account JWT with Node's built-in
 * crypto, exchanges it for an access token, and calls the Data API with fetch.
 *
 * Configuration (tools/ga-digest.config.json):
 *   { "propertyId": "123456789", "keyFile": "../ga-service-account.json", "days": 7 }
 * Or environment variables: GA_PROPERTY_ID, GA_SERVICE_ACCOUNT_KEY (path), GA_DAYS.
 *
 * The key file is a secret. Keep it OUTSIDE the repo (the default path points to
 * the parent folder) or anywhere gitignored. See tools/ga-setup-guide.md.
 *
 * If anything is not configured yet, it prints a friendly one-liner and exits 0,
 * so the scheduled task never crashes on it.
 */

import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'tools', 'ga-digest.config.json');

function notConfigured(msg) {
  console.log(`Analytics not connected yet. ${msg} See tools/ga-setup-guide.md.`);
  process.exit(0);
}

let cfg = {};
if (existsSync(CONFIG_PATH)) {
  try { cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); } catch { /* ignore */ }
}
const propertyId = process.env.GA_PROPERTY_ID || cfg.propertyId || '';
const days = Number(process.env.GA_DAYS || cfg.days || 7);

// Resolve a credentials file. Supports a service-account key OR keyless user
// credentials (gcloud Application Default Credentials / OAuth refresh token), so
// it still works when an org policy blocks service-account key creation.
function resolveCredsPath() {
  let p = process.env.GA_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS || cfg.keyFile || '';
  if (p && !path.isAbsolute(p)) p = path.resolve(ROOT, p);
  if (p && existsSync(p)) return p;
  // gcloud user login (no key file): application_default_credentials.json
  const adc = process.platform === 'win32'
    ? path.join(process.env.APPDATA || '', 'gcloud', 'application_default_credentials.json')
    : path.join(process.env.CLOUDSDK_CONFIG || path.join(process.env.HOME || '', '.config', 'gcloud'), 'application_default_credentials.json');
  if (existsSync(adc)) return adc;
  return p || '';
}

if (!propertyId || /your-ga4-property-id|put-/i.test(propertyId)) notConfigured('No GA4 property id set.');
const credsPath = resolveCredsPath();
if (!credsPath || !existsSync(credsPath)) notConfigured('No credentials found (service-account key or gcloud login).');

let creds;
try {
  creds = JSON.parse(readFileSync(credsPath, 'utf8'));
} catch (e) {
  notConfigured(`Credentials at ${credsPath} could not be read (${e.message}).`);
}
const credType = creds.type
  || (creds.private_key ? 'service_account' : (creds.refresh_token ? 'authorized_user' : ''));
if (credType === 'service_account' && (!creds.client_email || !creds.private_key)) notConfigured('Service-account key is missing client_email or private_key.');
if (credType === 'authorized_user' && (!creds.client_id || !creds.refresh_token)) notConfigured('User credentials are missing client_id or refresh_token.');
if (!credType) notConfigured('Credentials file is not a recognized service-account or user-credential JSON.');

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function signJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const signingInput = `${header}.${claim}`;
  const signature = b64url(createSign('RSA-SHA256').update(signingInput).sign(creds.private_key));
  return `${signingInput}.${signature}`;
}

async function accessToken() {
  if (credType === 'authorized_user') {
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
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signJwt()
    })
  });
  if (!res.ok) throw new Error(`token exchange failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

// date helpers (YYYY-MM-DD), ranges end yesterday
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };
const curRange = { startDate: iso(daysAgo(days)), endDate: iso(daysAgo(1)) };
const prevRange = { startDate: iso(daysAgo(days * 2)), endDate: iso(daysAgo(days + 1)) };

async function batchReports(token) {
  const requests = [
    { dateRanges: [curRange], metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'sessions' }] },
    { dateRanges: [prevRange], metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'sessions' }] },
    { dateRanges: [curRange], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], limit: 8, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] },
    { dateRanges: [curRange], dimensions: [{ name: 'country' }], metrics: [{ name: 'totalUsers' }], limit: 6, orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }] },
    { dateRanges: [curRange], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], limit: 6, orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }
  ];
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  // user credentials require a quota project header for the Data API
  const quotaProject = creds.quota_project_id || cfg.quotaProjectId || process.env.GA_QUOTA_PROJECT || '';
  if (credType === 'authorized_user' && quotaProject) headers['x-goog-user-project'] = quotaProject;
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requests })
  });
  if (!res.ok) throw new Error(`runReport failed (${res.status}): ${await res.text()}`);
  return (await res.json()).reports || [];
}

const totals = (report) => {
  const r = (report.rows && report.rows[0]) || null;
  const m = r ? r.metricValues.map((v) => Number(v.value)) : [0, 0, 0];
  return { views: m[0] || 0, users: m[1] || 0, sessions: m[2] || 0 };
};
const rowsOf = (report) =>
  (report.rows || []).map((r) => ({ label: r.dimensionValues[0].value, value: Number(r.metricValues[0].value) }));
const pct = (cur, prev) => {
  if (!prev) return cur ? '(new)' : '(flat)';
  const change = Math.round(((cur - prev) / prev) * 100);
  return `(${change >= 0 ? '+' : ''}${change}% vs prior ${days}d)`;
};

(async () => {
  try {
    const token = await accessToken();
    const reports = await batchReports(token);
    const cur = totals(reports[0]);
    const prev = totals(reports[1]);
    const pages = rowsOf(reports[2]);
    const countries = rowsOf(reports[3]);
    const channels = rowsOf(reports[4]);

    const out = [];
    out.push(`Window: ${curRange.startDate} to ${curRange.endDate} (last ${days} days)`);
    out.push('');
    out.push(`- Page views ${cur.views} ${pct(cur.views, prev.views)}`);
    out.push(`- Visitors ${cur.users} ${pct(cur.users, prev.users)}`);
    out.push(`- Sessions ${cur.sessions} ${pct(cur.sessions, prev.sessions)}`);
    if (pages.length) {
      out.push('');
      out.push('Most viewed pages');
      for (const p of pages) out.push(`- ${p.label} (${p.value})`);
    }
    if (countries.length) {
      out.push('');
      out.push('Top countries');
      out.push(countries.map((c) => `${c.label} ${c.value}`).join(', '));
    }
    if (channels.length) {
      out.push('');
      out.push('Where visitors came from');
      out.push(channels.map((c) => `${c.label} ${c.value}`).join(', '));
    }
    console.log(out.join('\n'));
  } catch (e) {
    // Never crash the weekly task: report the problem in plain language.
    console.log(`Analytics digest could not run this time: ${e.message}`);
    process.exit(0);
  }
})();
