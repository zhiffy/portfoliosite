#!/usr/bin/env node
/*
 * build-i18n.mjs  -  static localized-page generator
 * ---------------------------------------------------
 * Translations are stored data (i18n/bodies + i18n/status.json). This script is
 * the deterministic assembler: it owns every error-prone piece (canonical,
 * hreflang, JSON-LD, og:locale, the CJK/Thai font link, noindex, redirects and
 * sitemap) so that hand editing can never break them.
 *
 * Commands:
 *   node tools/build-i18n.mjs extract [page]   refresh English body + pick up hand-authored localized pages
 *   node tools/build-i18n.mjs build   [page]   assemble localized pages + regenerate managed blocks
 *   node tools/build-i18n.mjs check   [page]   report which translations have drifted from English
 *   node tools/build-i18n.mjs all              extract, build, check
 *
 * Index gate: a localized page is built with <meta robots noindex> and is left
 * OUT of hreflang and the sitemap until it is current and has a status that may
 * be indexed. Both "machine" and "reviewed" translations are indexable because
 * the live site discloses AI translation to visitors.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const I18N = path.join(ROOT, 'i18n');
const BODIES = path.join(I18N, 'bodies');
const STATUS_PATH = path.join(I18N, 'status.json');
const cfg = JSON.parse(readFileSync(path.join(I18N, 'config.json'), 'utf8'));

const PERSON = {
  '@type': 'Person',
  name: 'Shavonne Wong',
  url: cfg.origin + '/',
  image: cfg.profilePhoto,
  jobTitle: 'New media artist',
  birthPlace: { '@type': 'Place', name: 'Singapore' },
  homeLocation: [ { '@type': 'Place', name: 'Singapore' }, { '@type': 'Place', name: 'Bangkok' } ],
  knowsAbout: ['New media art', 'Artificial intelligence', '3D rendering', 'Interactive installation', 'Digital art'],
  email: 'mailto:studio@shavonnewong.art',
  sameAs: [
    'https://en.wikipedia.org/wiki/Shavonne_Wong',
    'https://www.instagram.com/shavonne.wong/',
    'https://x.com/shavonnewong_',
    'https://sg.linkedin.com/in/shavonnew',
    'https://ocula.com/artists/shavonne-wong/',
    'https://seafocus.sg/artists/shavonne-wong/'
  ]
};

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const lang = (code) => cfg.languages.find((l) => l.code === code);
const readStatus = () => (existsSync(STATUS_PATH) ? JSON.parse(readFileSync(STATUS_PATH, 'utf8')) : {});
const writeStatus = (s) => writeFileSync(STATUS_PATH, JSON.stringify(s, null, 2) + '\n');
const bodyPath = (page, code) => path.join(BODIES, `${page}.${code}.html`);
const outFile = (page, code) => (code === 'en'
  ? cfg.pages[page].enSource
  : `${cfg.pages[page].enSource.replace(/\.html$/, '')}-${lang(code).slug}.html`);
// Page-first URL shape: /<page-path>/<lang>/ (e.g. /about/zh-hans/). en is the base.
const urlPath = (page, code) => (code === 'en'
  ? cfg.pages[page].urlBase
  : `${cfg.pages[page].urlBase}${lang(code).slug}/`);
const url = (page, code) => cfg.origin + urlPath(page, code);

// localized langs (non-en) that have a body file on disk
const builtLangs = (page) =>
  cfg.languages.filter((l) => l.code !== 'en' && existsSync(bodyPath(page, l.code))).map((l) => l.code);

// current English source hash for a page (the drift baseline)
const enHash = (page) => (existsSync(bodyPath(page, 'en')) ? sha(readFileSync(bodyPath(page, 'en'), 'utf8')) : null);
const isFresh = (page, code, status) =>
  Boolean(status[page] && status[page][code] && status[page][code].src === enHash(page));
const indexableStatuses = new Set(['machine', 'reviewed']);
// langs cleared for indexing: en plus any built lang that is indexable AND not stale
const advertisedLangs = (page, status) =>
  ['en', ...builtLangs(page).filter((c) => status[page] && status[page][c]
    && indexableStatuses.has(status[page][c].status) && isFresh(page, c, status))];

function sliceBody(html, page) {
  const p = cfg.pages[page];
  const start = html.indexOf(p.bodyStart);
  const end = html.indexOf(p.bodyEnd, start + 1);
  if (start < 0 || end < 0) throw new Error(`body anchors not found in source for "${page}" (file may be truncated)`);
  const bodyEnd = p.bodyEnd === '</main>' ? end + p.bodyEnd.length : end;
  const region = html.slice(start, bodyEnd).replace(/\s+$/, '') + '\n';
  if (!region.includes('</main>') || region.length < 1000) throw new Error(`extracted "${page}" body looks truncated`);
  return region;
}

function extract(page) {
  mkdirSync(BODIES, { recursive: true });
  const status = readStatus();
  status[page] = status[page] || {};
  const enHtml = readFileSync(path.join(ROOT, cfg.pages[page].enSource), 'utf8');
  const enBody = sliceBody(enHtml, page);
  writeFileSync(bodyPath(page, 'en'), enBody);
  status[page].en = { hash: sha(enBody) };
  // adopt any hand-authored localized page exactly once, then it becomes data
  for (const l of cfg.languages) {
    if (l.code === 'en') continue;
    const hand = path.join(ROOT, `${l.slug}-${page}.html`);
    if (existsSync(hand) && !existsSync(bodyPath(page, l.code))) {
      writeFileSync(bodyPath(page, l.code), sliceBody(readFileSync(hand, 'utf8'), page));
      status[page][l.code] = { status: 'machine', src: status[page].en.hash };
      console.log(`  adopted ${l.slug}-${page}.html -> i18n/bodies/${page}.${l.code}.html (status: machine)`);
    }
  }
  writeStatus(status);
  console.log(`extract: ${page} (en hash ${status[page].en.hash})`);
}

function head(page, code, status) {
  const p = cfg.pages[page];
  const L = lang(code);
  const noindex = !(advertisedLangs(page, status).includes(code));
  const adv = advertisedLangs(page, status);
  const lines = [];
  lines.push('  <meta charset="utf-8" />');
  lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1" />');
  lines.push('  <link rel="icon" href="/favicon.ico" sizes="any">');
  lines.push('  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">');
  lines.push('  <link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  lines.push('  <link rel="manifest" href="/site.webmanifest">');
  lines.push(`  <title>${p.meta.title[code]}</title>`);
  lines.push(`  <meta name="description" content="${p.meta.description[code]}">`);
  lines.push('  <meta name="author" content="Shavonne Wong">');
  if (noindex) lines.push('  <meta name="robots" content="noindex">');
  lines.push(`  <link rel="canonical" href="${url(page, code)}">`);
  // hreflang cluster: only indexable (advertised) languages
  for (const c of adv) lines.push(`  <link rel="alternate" hreflang="${lang(c).htmlLang}" href="${url(page, c)}">`);
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${url(page, 'en')}">`);
  lines.push(`  <meta property="og:type" content="${p.ogType}">`);
  lines.push(`  <meta property="og:url" content="${url(page, code)}">`);
  lines.push(`  <meta property="og:title" content="${p.meta.title[code]}">`);
  lines.push(`  <meta property="og:description" content="${p.meta.ogDescription[code]}">`);
  lines.push(`  <meta property="og:image" content="${cfg.profilePhoto}">`);
  lines.push('  <meta property="og:image:width" content="1024">');
  lines.push('  <meta property="og:image:height" content="1024">');
  lines.push(`  <meta property="og:locale" content="${L.ogLocale}">`);
  if (code !== 'en') lines.push('  <meta property="og:locale:alternate" content="en_US">');
  lines.push('  <meta name="twitter:card" content="summary_large_image">');
  lines.push(`  <meta name="twitter:title" content="${p.meta.title[code]}">`);
  lines.push(`  <meta name="twitter:description" content="${p.meta.ogDescription[code]}">`);
  lines.push(`  <meta name="twitter:image" content="${cfg.profilePhoto}">`);
  lines.push('  <link rel="preload" as="font" type="font/woff2" href="/assets/fonts/mulish/mulish-variable.woff2" crossorigin>');
  for (const s of p.styles) lines.push(`  <link rel="stylesheet" href="${s}">`);
  // The localized font CSS loads after the page styles so its --sans/--serif
  // redefinition wins the cascade.
  if (L.font) lines.push(`  <link rel="stylesheet" href="${L.font}">`);
  const ld = { '@context': 'https://schema.org', '@type': p.jsonldType, inLanguage: L.htmlLang, url: url(page, code), name: p.meta.title[code], mainEntity: PERSON };
  lines.push('  <script type="application/ld+json">');
  lines.push('  ' + JSON.stringify(ld, null, 2).split('\n').join('\n  '));
  lines.push('  </script>');
  lines.push('  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "ed11192c01f44bf2b6d068d312a11534"}\'></script>');
  lines.push('  <!-- Google tag (gtag.js) -->');
  lines.push('  <script async src="https://www.googletagmanager.com/gtag/js?id=G-L9KCWXRT7E"></script>');
  lines.push('  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag(\'js\',new Date());gtag(\'config\',\'G-L9KCWXRT7E\');</script>');
  return lines.join('\n');
}

function header(page, code) {
  const n = cfg.nav;
  const navLinks = n.order.map((key) => {
    const pageOf = n.page[key];
    const localized = pageOf && code !== 'en' && existsSync(bodyPath(pageOf, code));
    const href = localized ? urlPath(pageOf, code) : n.hrefs[key];
    const active = pageOf === page ? ' class="is-active"' : '';
    return `      <a href="${href}"${active} data-i18n="nav.${key}">${n.labels[key][code]}</a>`;
  }).join('\n');
  return [
    '<header class="sn-nav" data-page-nav>',
    '    <a href="/#hero" class="sn-mark"><img decoding="async" class="sn-mark-logo" src="/assets/brand/wordmark-slate.webp" alt="Shavonne Wong" width="120" height="42"></a>',
    '    <nav class="sn-links">',
    navLinks,
    '    </nav>',
    '    <div class="sn-meta-right">',
    '      <label class="sn-lang-switcher" data-language-switcher>',
    `              <span class="sn-lang-kicker" data-i18n="ui.languageLabel">${n.languageLabel[code]}</span>`,
    `              <select class="sn-lang-select" data-language-select aria-label="${n.languageLabel[code]}" data-i18n-aria-label="ui.languageLabel" title="${n.languageLabel[code]}"></select>`,
    '            </label>',
    '    </div>',
    '    <div class="sn-progress"><div class="sn-progress-bar" style="width:100%"></div></div>',
    '  </header>'
  ].join('\n');
}

// Transform-in-place: localize the English page rather than rebuild it, so each
// page keeps its own head, stylesheets, scripts, JSON-LD and og:image. Works on
// any page template; per-page config is just enSource, urlBase, body anchors,
// and the localized title/description.
function assemble(page, code, status) {
  const p = cfg.pages[page];
  let html = readFileSync(path.join(ROOT, p.enSource), 'utf8');
  const start = html.indexOf(p.bodyStart);
  const end = html.indexOf(p.bodyEnd, start + 1);
  if (start < 0 || end < 0) throw new Error(`body anchors not found in ${p.enSource} for "${page}"`);
  const bodyEnd = p.bodyEnd === '</main>' ? end + p.bodyEnd.length : end;
  const body = readFileSync(bodyPath(page, code), 'utf8').replace(/\s+$/, '');
  html = html.slice(0, start) + body + html.slice(bodyEnd);
  return localizeNav(localizeHead(html, page, code, status), page, code, status);
}

function localizeHead(html, page, code, status) {
  const L = lang(code);
  const adv = advertisedLangs(page, status);
  const noindex = !adv.includes(code);
  const m = cfg.pages[page].meta || {};
  const title = m.title && m.title[code];
  const desc = m.description && m.description[code];
  const ogdesc = (m.ogDescription && m.ogDescription[code]) || desc;
  const self = url(page, code);
  if (title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
    html = html.replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${title}$2`);
    html = html.replace(/(<meta name="twitter:title" content=")[^"]*("\s*\/?>)/, `$1${title}$2`);
  }
  if (desc) html = html.replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${desc}$2`);
  if (ogdesc) {
    html = html.replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/, `$1${ogdesc}$2`);
    html = html.replace(/(<meta name="twitter:description" content=")[^"]*("\s*\/?>)/, `$1${ogdesc}$2`);
  }
  html = html.replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1${self}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*("\s*\/?>)/, `$1${self}$2`);
  // drop any hreflang / og:locale the English page already carries
  html = html.replace(/[ \t]*<!-- i18n:hreflang -->[\s\S]*?<!-- \/i18n:hreflang -->\n?/g, '');
  html = html.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>\n?/g, '');
  html = html.replace(/[ \t]*<meta property="og:locale[^>]*>\n?/g, '');
  // inject this page's own hreflang cluster + locale + noindex after the canonical
  const inject = [];
  if (noindex) inject.push('<meta name="robots" content="noindex">');
  for (const c of adv) inject.push(`<link rel="alternate" hreflang="${lang(c).htmlLang}" href="${url(page, c)}">`);
  inject.push(`<link rel="alternate" hreflang="x-default" href="${url(page, 'en')}">`);
  inject.push(`<meta property="og:locale" content="${L.ogLocale}">`);
  if (code !== 'en') inject.push('<meta property="og:locale:alternate" content="en_US">');
  html = html.replace(/(<link rel="canonical" href="[^"]*"\s*\/?>)/, `$1\n  ${inject.join('\n  ')}`);
  // the localized font CSS loads last so its --sans/--serif override wins
  if (L.font) html = html.replace('</head>', `  <link rel="stylesheet" href="${L.font}">\n</head>`);
  return html;
}

function hasAdvertisedLocalizedPage(page, code, status) {
  return page && code !== 'en' && advertisedLangs(page, status).includes(code);
}

function localizeNav(html, page, code, status) {
  const n = cfg.nav;
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang(code).htmlLang}"`);
  html = html.replace(/(<a class="sn-skip-link" href="#main-content">)[^<]*(<\/a>)/, `$1${n.skip[code]}$2`);
  html = html.replace(/(data-i18n="ui.languageLabel">)[^<]*(<)/g, `$1${n.languageLabel[code]}$2`);
  for (const key of n.order) {
    const label = n.labels[key][code];
    const pageOf = n.page[key];
    const localized = hasAdvertisedLocalizedPage(pageOf, code, status);
    if (localized) {
      html = html.replace(new RegExp(`<a href="[^"]*"([^>]*?)data-i18n="nav.${key}">[^<]*<`),
        `<a href="${urlPath(pageOf, code)}"$1data-i18n="nav.${key}">${label}<`);
    } else {
      html = html.replace(new RegExp(`(data-i18n="nav.${key}">)[^<]*(<)`), `$1${label}$2`);
    }
  }
  return html;
}

function replaceBlock(file, start, end, inner) {
  const text = readFileSync(file, 'utf8');
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i < 0 || j < 0) { console.log(`  ! markers ${start} missing in ${path.basename(file)} (skipped)`); return; }
  const next = text.slice(0, i + start.length) + '\n' + inner + '\n' + text.slice(j);
  writeFileSync(file, next);
}

function upsertBlock(file, start, end, inner, afterPattern) {
  let text = readFileSync(file, 'utf8');
  if (text.includes(start) && text.includes(end)) {
    const i = text.indexOf(start), j = text.indexOf(end);
    text = text.slice(0, i + start.length) + '\n' + inner + '\n' + text.slice(j);
  } else if (afterPattern.test(text)) {
    text = text.replace(afterPattern, (mm) => `${mm}\n  ${start}\n${inner}\n  ${end}`);
  } else {
    console.log(`  ! cannot place ${start} in ${path.basename(file)} (anchor missing)`); return;
  }
  writeFileSync(file, text);
}

// Regenerate every generator-owned region across ALL configured pages: each
// English page's hreflang block (managed in its head), the shared localized
// redirects, and the shared localized sitemap entries. hreflang lives in the
// heads; the sitemap just lists the localized URLs so they get crawled.
function updateManagedAll(status) {
  const pages = Object.keys(cfg.pages);
  for (const page of pages) {
    const adv = advertisedLangs(page, status);
    const hl = [...adv.map((c) => `  <link rel="alternate" hreflang="${lang(c).htmlLang}" href="${url(page, c)}">`),
      `  <link rel="alternate" hreflang="x-default" href="${url(page, 'en')}">`].join('\n');
    upsertBlock(path.join(ROOT, cfg.pages[page].enSource), '<!-- i18n:hreflang -->', '<!-- /i18n:hreflang -->',
      hl, /<link rel="canonical" href="[^"]*"\s*\/?>/);
  }
  const routes = [];
  for (const page of pages) {
    for (const c of builtLangs(page)) {
      const slug = lang(c).slug, base = cfg.pages[page].urlBase, file = outFile(page, c);
      routes.push(`${base}${slug}/ /${file} 200`);
      routes.push(`/${file} ${base}${slug}/ 301!`);
      routes.push(`/${slug}/${page}/ ${base}${slug}/ 301!`);
      routes.push(`/${slug}-${page}.html ${base}${slug}/ 301!`);
    }
  }
  replaceBlock(path.join(ROOT, '_redirects'), '# i18n:localized-routes:start', '# i18n:localized-routes:end',
    routes.join('\n') || '# (none yet)');
  const entries = [];
  for (const page of pages) {
    for (const c of advertisedLangs(page, status)) {
      if (c === 'en') continue;
      entries.push('  <url>');
      entries.push(`    <loc>${url(page, c)}</loc>`);
      entries.push('    <lastmod>2026-06-20</lastmod>');
      entries.push('  </url>');
    }
  }
  replaceBlock(path.join(ROOT, 'sitemap.xml'), '<!-- i18n:localized-urls:start -->', '<!-- i18n:localized-urls:end -->',
    entries.join('\n'));
}

function ensureFonts() {
  const candidates = [
    process.env.CJK_PYTHON,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python312', 'python.exe'),
    'python3',
    'python'
  ].filter(Boolean);
  const tried = [];
  for (const python of [...new Set(candidates)]) {
    if (python.endsWith('.exe') && !existsSync(python)) continue;
    try {
      const output = execFileSync(python, ['tools/subset-cjk.py'], { cwd: ROOT, encoding: 'utf8' });
      if (output) process.stdout.write(output);
      return;
    } catch (e) {
      tried.push(python);
    }
  }
  console.log(`  ! CJK font subset skipped (need Python + fonttools + brotli). Tried: ${tried.join(', ')}. Run tools/subset-cjk.py manually.`);
}

function build() {
  ensureFonts();
  const status = readStatus();
  for (const page of Object.keys(cfg.pages)) {
    for (const c of builtLangs(page)) {
      writeFileSync(path.join(ROOT, outFile(page, c)), assemble(page, c, status));
      const st = (status[page] && status[page][c]) || {};
      const indexable = indexableStatuses.has(st.status);
      const fresh = isFresh(page, c, status);
      if (indexable && !fresh) console.log(`  !! STALE: ${page}.${c} is ${st.status} but its English source changed since translation. Held to noindex until refreshed.`);
      const state = indexable && fresh ? `indexed (${st.status})` : indexable && !fresh ? 'noindex (stale)' : 'noindex until indexable';
      console.log(`build: ${outFile(page, c)}  (${c}, ${state})`);
    }
  }
  updateManagedAll(status);
  console.log('build: managed hreflang, redirects, and sitemap refreshed across all pages');
}

function check(page) {
  const status = readStatus();
  if (!status[page] || !status[page].en) { console.log(`check: ${page} not extracted yet`); return; }
  const cur = sha(readFileSync(bodyPath(page, 'en'), 'utf8'));
  let stale = 0;
  for (const c of builtLangs(page)) {
    const st = status[page][c] || {};
    if (st.src !== cur) { console.log(`  STALE: ${page}.${c} translated from ${st.src}, English now ${cur}`); stale++; }
    else console.log(`  ok:    ${page}.${c} (${st.status || 'machine'})`);
  }
  if (!stale) console.log(`check: ${page} all translations current`);
}

const [cmd = 'all', page] = process.argv.slice(2);
const allPages = () => Object.keys(cfg.pages);
if (cmd === 'all') { allPages().forEach(extract); build(); allPages().forEach(check); }
else if (cmd === 'build') build();
else if (cmd === 'extract') (page ? [page] : allPages()).forEach(extract);
else if (cmd === 'check') (page ? [page] : allPages()).forEach(check);
else { console.log('usage: build-i18n.mjs [all|build|extract|check] [page]'); process.exit(1); }
