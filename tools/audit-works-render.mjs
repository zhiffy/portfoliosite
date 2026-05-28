#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (typeof WebSocket === 'undefined') {
  console.error('This render audit needs a Node runtime with global WebSocket support.');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const edgePath = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const screenshotDir = path.join(root, 'qa', 'works-screenshots');
const profileDir = path.join(os.tmpdir(), `codex-works-render-${Date.now()}`);
const issues = [];
const misses = new Set();

const routes = [
  '/works/',
  '/works/available/',
  '/works/after-ophelia/',
  '/works/meet-eva-here/',
  '/works/the-ties-that-bind/',
  '/works/by-proxy/',
  '/works/3d-single-works/',
  '/works/love-is-love/',
  '/works/vogue-singapore/',
  '/works/6529-meme-card/',
  '/works/whirlwind-of-the-waking-dream/',
  '/works/meet-eva-here/chatbot/',
  '/works/meet-eva-here/diary/',
  '/works/after-ophelia/ophelia-retold/',
  '/works/after-ophelia/ophelia-reassembled/',
];

const screenshots = [
  { route: '/works/', vp: 'mobile', width: 390, height: 844, mobile: true },
  { route: '/works/', vp: 'desktop', width: 1440, height: 1000, mobile: false },
  { route: '/works/available/', vp: 'mobile', width: 390, height: 844, mobile: true },
  { route: '/works/available/', vp: 'desktop', width: 1440, height: 1000, mobile: false },
  { route: '/works/3d-single-works/', vp: 'mobile', width: 390, height: 844, mobile: true },
  { route: '/works/3d-single-works/', vp: 'desktop', width: 1440, height: 1000, mobile: false },
  { route: '/works/after-ophelia/', vp: 'mobile', width: 390, height: 844, mobile: true },
  { route: '/works/meet-eva-here/', vp: 'mobile', width: 390, height: 844, mobile: true },
  { route: '/works/by-proxy/', vp: 'mobile', width: 390, height: 844, mobile: true },
  { route: '/works/by-proxy/', vp: 'desktop', width: 1440, height: 1000, mobile: false },
  { route: '/works/whirlwind-of-the-waking-dream/', vp: 'mobile', width: 390, height: 844, mobile: true },
  { route: '/works/the-ties-that-bind/', vp: 'desktop', width: 1440, height: 1000, mobile: false },
];

const lcpRoutes = ['/works/', '/works/whirlwind-of-the-waking-dream/'];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function parseRedirects() {
  const rewrites = new Map();
  const redirects = new Map();
  for (const raw of read('_redirects').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, status] = line.split(/\s+/);
    if (status === '200') rewrites.set(from, to.replace(/^\//, ''));
    if (status?.startsWith('301')) redirects.set(from, to);
  }
  return { rewrites, redirects };
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.ico': 'image/x-icon',
  }[ext] || 'application/octet-stream';
}

function createServer(rewrites, redirects) {
  return http.createServer((req, res) => {
    const route = decodeURIComponent(req.url.split('?')[0]);
    if (redirects.has(route)) {
      res.writeHead(301, { Location: redirects.get(route) });
      res.end();
      return;
    }

    const fileRoute = rewrites.get(route) || (route === '/' ? 'index.html' : route.replace(/^\//, ''));
    const file = path.resolve(root, fileRoute);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      misses.add(route);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType(file) });
    fs.createReadStream(file).pipe(res);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

async function waitForPage(debugPort) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await getJson(`http://127.0.0.1:${debugPort}/json/list`);
      const page = list.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error('Edge page debugging endpoint did not start.');
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  return {
    send(method, params = {}) {
      const callId = (id += 1);
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime exception');
  }
  return result.result.value;
}

async function navigate(client, url, waitMs = 1200) {
  await client.send('Page.navigate', { url });
  for (let i = 0; i < 160; i += 1) {
    if ((await evaluate(client, 'document.readyState')) === 'complete') break;
    await sleep(100);
  }
  await sleep(waitMs);
}

async function setViewport(client, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    mobile: viewport.mobile,
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile });
}

function screenshotName(route, vp) {
  return `${vp}-${route.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '-') || 'home'}.png`;
}

async function auditPage(client, baseUrl, route, viewportName) {
  await navigate(client, `${baseUrl}${route}`);
  const data = await evaluate(
    client,
    `(() => {
      const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
        && getComputedStyle(el).visibility !== 'hidden'
        && getComputedStyle(el).display !== 'none';
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      const nameOf = (el) => (el.getAttribute('aria-label') || el.innerText || el.textContent || Array.from(el.querySelectorAll('img')).map((img) => img.alt).join(' ') || el.title || '').trim();
      const smallTouch = Array.from(document.querySelectorAll('.sp-plate-play, .sp-plate-sound, .sp-hero-sound, .sp-hero-fullscreen, .wk-chip, .av-chip'))
        .filter(visible)
        .map((el) => ({ sel: el.className, text: el.textContent.trim(), ...rect(el) }))
        .filter((r) => r.w < 44 || r.h < 36);
      const textOverflow = Array.from(document.querySelectorAll('.wk-chip, .av-chip, .av-card-title, .av-card-line, .wk-meta-title, .wk-meta-copy, .wk-meta-status, .sp-plate-title, .sp-plate-meta, .sp-prev-next a, .sp-tile-title, .sp-status-pill'))
        .filter(visible)
        .map((el) => ({ text: (el.textContent || '').trim().slice(0, 80), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight }))
        .filter((o) => o.sw > o.cw + 2 || o.sh > o.ch + 8);
      const brokenImages = Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src);
      const blankMedia = Array.from(document.querySelectorAll('.wk-media, .av-card-media, .sp-plate-media, .sp-project-hero-media'))
        .filter(visible)
        .map((el) => ({ cls: el.className, ...rect(el) }))
        .filter((r) => r.w < 40 || r.h < 40);
      const staleVisible = Array.from(document.querySelectorAll('[data-end-date]'))
        .filter((el) => new Date(el.dataset.endDate) < new Date() && visible(el)).length;
      const mobileAutoplayVideos = window.matchMedia('(max-width: 760px)').matches ? document.querySelectorAll('video[autoplay]').length : 0;
      const unnamedLinks = Array.from(document.querySelectorAll('a')).filter((a) => !nameOf(a)).length;
      const unnamedButtons = Array.from(document.querySelectorAll('button')).filter((button) => !nameOf(button)).length;
      return {
        h1: document.querySelectorAll('h1').length,
        width: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        smallTouch,
        textOverflow,
        brokenImages,
        blankMedia,
        staleVisible,
        mobileAutoplayVideos,
        unnamedLinks,
        unnamedButtons,
        seriesTiles: document.querySelectorAll('.sp-series-tile').length,
        cards: document.querySelectorAll('.wk-card:not(.wk-card--edition)').length,
        availableCards: document.querySelectorAll('.av-card').length
      };
    })()`,
  );

  if (data.h1 !== 1) issues.push(`${viewportName} ${route}: expected 1 h1, found ${data.h1}`);
  if (data.width > data.viewport + 4) issues.push(`${viewportName} ${route}: horizontal overflow ${data.width}/${data.viewport}`);
  if (data.smallTouch.length) issues.push(`${viewportName} ${route}: small touch controls ${JSON.stringify(data.smallTouch.slice(0, 3))}`);
  if (data.textOverflow.length) issues.push(`${viewportName} ${route}: text overflow ${JSON.stringify(data.textOverflow.slice(0, 3))}`);
  if (data.brokenImages.length) issues.push(`${viewportName} ${route}: broken images ${data.brokenImages.slice(0, 3).join(', ')}`);
  if (data.blankMedia.length) issues.push(`${viewportName} ${route}: blank media boxes ${JSON.stringify(data.blankMedia.slice(0, 3))}`);
  if (data.staleVisible) issues.push(`${viewportName} ${route}: stale on-view notices still visible`);
  if (data.mobileAutoplayVideos) issues.push(`${viewportName} ${route}: video autoplay present under mobile breakpoint`);
  if (data.unnamedLinks) issues.push(`${viewportName} ${route}: ${data.unnamedLinks} unnamed link(s)`);
  if (data.unnamedButtons) issues.push(`${viewportName} ${route}: ${data.unnamedButtons} unnamed button(s)`);
  if (route === '/works/' && data.cards !== 6) issues.push(`${viewportName} ${route}: expected 6 cards, found ${data.cards}`);
  if (route === '/works/available/' && data.availableCards < 3) issues.push(`${viewportName} ${route}: expected at least 3 available-work cards, found ${data.availableCards}`);
  if (route === '/works/3d-single-works/' && data.seriesTiles < 40) issues.push(`${viewportName} ${route}: expected the 3D contact sheet, found ${data.seriesTiles} tiles`);
  if (route === '/works/by-proxy/' && data.seriesTiles !== 60) issues.push(`${viewportName} ${route}: expected 60 By Proxy tiles, found ${data.seriesTiles}`);
}

async function captureScreenshot(client, baseUrl, shot) {
  console.log(`Screenshot: ${shot.vp} ${shot.route}`);
  await setViewport(client, shot);
  await auditPage(client, baseUrl, shot.route, shot.vp);
  const metrics = await evaluate(client, `(() => ({
    width: Math.ceil(Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)),
    height: Math.ceil(Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0)),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  }))()`);
  const captureFullPage = process.env.FULL_PAGE_SCREENSHOTS === '1' && metrics.height <= 10000;
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: captureFullPage,
    fromSurface: true,
    ...(captureFullPage ? {} : {
      clip: {
        x: 0,
        y: 0,
        width: metrics.viewportWidth,
        height: metrics.viewportHeight,
        scale: 1,
      },
    }),
  });
  const file = path.join(screenshotDir, screenshotName(shot.route, shot.vp));
  fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  console.log(`Wrote: ${path.relative(root, file)}`);
  return path.relative(root, file);
}

async function auditLcp(client, baseUrl) {
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 210000,
    uploadThroughput: 95000,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await setViewport(client, { width: 390, height: 844, mobile: true });

  const report = [];
  for (const route of lcpRoutes) {
    console.log(`LCP: ${route}`);
    await navigate(client, `${baseUrl}${route}?lcp=${Date.now()}`, 3500);
    const lcp = await evaluate(client, 'Math.round(window.__lcp || 0)');
    const lcpInfo = await evaluate(client, 'window.__lcpInfo || ""');
    const budget = route === '/works/whirlwind-of-the-waking-dream/' ? 3000 : 2600;
    report.push(`${route} throttled local LCP ~= ${lcp}ms${lcpInfo ? ` (${lcpInfo})` : ''}`);
    if (!lcp) issues.push(`${route}: LCP not reported`);
    if (lcp > budget) issues.push(`${route}: throttled local LCP ${lcp}ms${lcpInfo ? ` (${lcpInfo})` : ''}`);
  }
  return report;
}

async function checkRedirects(baseUrl, redirects) {
  const failures = [];
  for (const [from, to] of redirects) {
    const result = await new Promise((resolve, reject) => {
      http
        .get(`${baseUrl}${from}`, (res) => {
          res.resume();
          res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location || '' }));
        })
        .on('error', reject);
    });
    if (result.status !== 301 || result.location !== to) {
      failures.push(`${from} -> ${result.status} ${result.location}`);
    }
  }
  if (failures.length) issues.push(`redirect failures: ${failures.join('; ')}`);
}

async function main() {
  if (!fs.existsSync(edgePath)) {
    console.error(`Edge was not found at ${edgePath}. Set EDGE_PATH to a Chromium/Edge executable and rerun.`);
    process.exit(1);
  }

  fs.mkdirSync(screenshotDir, { recursive: true });
  const { rewrites, redirects } = parseRedirects();
  const server = createServer(rewrites, redirects);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  console.log(`Render audit server: ${baseUrl}`);
  const debugPort = 9650 + Math.floor(Math.random() * 200);
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });

  try {
    const target = await waitForPage(debugPort);
    const client = await connect(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__lcp=0;window.__lcpInfo='';try{new PerformanceObserver((list)=>{const entries=list.getEntries();const entry=entries[entries.length-1];window.__lcp=entry.startTime;const el=entry.element;window.__lcpInfo=el?((el.tagName||'')+'.'+(el.className||'')+' '+((el.currentSrc||el.src||el.textContent||'').toString().slice(0,90))):'';}).observe({type:'largest-contentful-paint',buffered:true});}catch(e){}`,
    });

    await checkRedirects(baseUrl, redirects);

    for (const viewport of [
      { width: 390, height: 844, mobile: true, name: 'mobile' },
      { width: 1440, height: 1000, mobile: false, name: 'desktop' },
    ]) {
      console.log(`Audit viewport: ${viewport.name}`);
      await setViewport(client, viewport);
      for (const route of routes) {
        console.log(`Audit page: ${viewport.name} ${route}`);
        await auditPage(client, baseUrl, route, viewport.name);
      }
    }

    const shotFiles = [];
    for (const shot of screenshots) shotFiles.push(await captureScreenshot(client, baseUrl, shot));
    const lcpReport = await auditLcp(client, baseUrl);

    client.close();

    if (misses.size) issues.push(`404s during render: ${[...misses].join(', ')}`);
    if (issues.length) {
      console.error(`Works render audit failed with ${issues.length} issue(s):`);
      for (const issue of issues) console.error(`- ${issue}`);
      process.exitCode = 1;
    } else {
      console.log('Works render audit passed.');
      console.log(`Redirects checked: ${redirects.size}`);
      console.log(`Screenshots written: ${shotFiles.length}`);
      for (const file of shotFiles) console.log(`- ${file}`);
      for (const line of lcpReport) console.log(line);
    }
  } finally {
    edge.kill();
    await sleep(1200);
    server.close();
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
