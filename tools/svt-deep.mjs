#!/usr/bin/env node
/*
 * svt-deep.mjs - refresh the SEO Detail block in the Search Visibility Tracker.
 * Pulls a trailing 90-day cut from Search Console (top queries, top pages,
 * countries, and the name / works / hidden split) and writes it into the
 * AUTO_SEO_DETAIL object delimited by SVT_DETAIL_START / SVT_DETAIL_END inside
 * tools/search-visibility-tracker.html. The existing "ga" sub-object is preserved
 * (GA4 is refreshed separately), so this script only touches the GSC fields.
 *
 * Reuses tools/gsc-oauth.json and tools/gsc-digest.config.json (same as svt-sync).
 * Usage: node tools/svt-deep.mjs
 * Prints a JSON status line. Never throws.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HTML = path.join(ROOT, 'tools', 'search-visibility-tracker.html');
const CFG = path.join(ROOT, 'tools', 'gsc-digest.config.json');
function done(o){ console.log(JSON.stringify(o)); process.exit(0); }

let cfg = {};
if (existsSync(CFG)) { try { cfg = JSON.parse(readFileSync(CFG, 'utf8')); } catch {} }
const siteUrl = process.env.GSC_SITE_URL || cfg.siteUrl || '';
if (!siteUrl) done({ ok: false, error: 'no siteUrl' });

let credsPath = process.env.GSC_OAUTH || cfg.keyFile || 'tools/gsc-oauth.json';
if (!path.isAbsolute(credsPath)) credsPath = path.resolve(ROOT, credsPath);
if (!existsSync(credsPath)) done({ ok: false, error: 'no oauth token' });
let creds; try { creds = JSON.parse(readFileSync(credsPath, 'utf8')); } catch { done({ ok: false, error: 'token unreadable' }); }
const quota = creds.quota_project_id || cfg.quotaProjectId || '';

function isoOf(d){ return d.toISOString().slice(0,10); }
const end = new Date(); end.setUTCDate(end.getUTCDate() - 3);
const start = new Date(end); start.setUTCDate(start.getUTCDate() - 89);
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function human(d){ return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }

async function token(){
  const r = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ client_id: creds.client_id, client_secret: creds.client_secret || '', refresh_token: creds.refresh_token, grant_type:'refresh_token' }) });
  if (!r.ok) throw new Error('token ' + r.status);
  return (await r.json()).access_token;
}
const ep = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
async function q(t, body){
  const h = { authorization: 'Bearer ' + t, 'content-type':'application/json' }; if (quota) h['x-goog-user-project'] = quota;
  const r = await fetch(ep, { method:'POST', headers:h, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('query ' + r.status + ' ' + (await r.text()).slice(0,160));
  return (await r.json()).rows || [];
}
const NAME = /shavonne/i;
const OLD = /^\/(projects|nfts)(\/|$)|^\/art$/;
const r1 = n => Math.round(n * 10) / 10;

function inject(detail){
  if (!existsSync(HTML)) return { ok:false, error:'tracker html not found' };
  let html = readFileSync(HTML, 'utf8');
  const A = '/*SVT_DETAIL_START*/', B = '/*SVT_DETAIL_END*/';
  const i = html.indexOf(A), j = html.indexOf(B);
  if (i < 0 || j < 0 || j < i) return { ok:false, error:'detail markers not found' };
  let existing = {};
  try { existing = JSON.parse(html.slice(i + A.length, j)); } catch {}
  const merged = Object.assign({}, existing, detail);
  if (existing.ga) merged.ga = existing.ga; // preserve GA4 sub-object
  const block = JSON.stringify(merged, null, 1);
  html = html.slice(0, i + A.length) + block + html.slice(j);
  writeFileSync(HTML, html);
  return { ok:true };
}

(async () => {
  try {
    const t = await token();
    const base = { startDate: isoOf(start), endDate: isoOf(end) };
    const tot = (await q(t, { ...base, dimensions: [] }))[0] || {};
    const queries = await q(t, { ...base, dimensions:['query'], rowLimit: 250 });
    const pages = await q(t, { ...base, dimensions:['page'], rowLimit: 50 });
    const countries = await q(t, { ...base, dimensions:['country'], rowLimit: 20 });

    let name = 0, works = 0, visible = 0; const nonName = [];
    for (const r of queries) {
      const k = (r.keys && r.keys[0]) || ''; const c = r.clicks || 0; visible += c;
      if (NAME.test(k)) name += c; else { works += c; nonName.push(r); }
    }
    const CC = { sgp:'Singapore', hkg:'Hong Kong', usa:'United States', aus:'Australia', ita:'Italy', fra:'France',
      gbr:'United Kingdom', can:'Canada', jpn:'Japan', tha:'Thailand', deu:'Germany', chn:'China', kor:'South Korea',
      twn:'Taiwan', idn:'Indonesia', mys:'Malaysia', mmr:'Myanmar', nld:'Netherlands', esp:'Spain', che:'Switzerland' };

    const detail = {
      window: '90 days, ' + human(start) + ' to ' + human(end),
      name: Math.round(name), works: Math.round(works), hidden: Math.max(0, Math.round((tot.clicks || 0) - visible)),
      topQueries: queries.slice(0, 6).map(r => [r.keys[0], Math.round(r.clicks||0), Math.round(r.impressions||0), r1(r.position||0)]),
      nonName: nonName.sort((a,b)=>(b.impressions||0)-(a.impressions||0)).slice(0, 10).map(r => [r.keys[0], Math.round(r.impressions||0), Math.round(r.clicks||0), r1(r.position||0)]),
      pages: pages.slice(0, 12).map(r => { const p = r.keys[0].replace(/^https?:\/\/[^/]+/, ''); return [p, Math.round(r.clicks||0), Math.round(r.impressions||0), r1(r.position||0), OLD.test(p)]; }),
      countries: countries.slice(0, 12).map(r => { const k = r.keys[0]; return [CC[k] || k.toUpperCase(), Math.round(r.clicks||0), Math.round(r.impressions||0)]; })
    };
    const res = inject(detail);
    done({ ok: res.ok, error: res.error || null, window: detail.window, name: detail.name, works: detail.works, hidden: detail.hidden });
  } catch (e) { done({ ok:false, error: String((e && e.message) || e) }); }
})();
