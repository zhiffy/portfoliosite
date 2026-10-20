#!/usr/bin/env node
/*
 * check-spacing.mjs  -  catches the "awkward spacing" problems before they ship
 * ---------------------------------------------------------------------------
 * Renders every journal essay and studio letter in a real browser at three
 * desktop widths and a phone width, and reports:
 *
 *   hole          A paragraph followed, in the same column and the same
 *                 section or event, by far more space than the paragraph
 *                 rhythm. Usually a rail photo taller than the text beside it.
 *                 Fix with more text in the row, never by cropping (rule C1).
 *   orphan-media  An image alone on its line with most of the width empty
 *                 beside it, not centred and not on the text axis. Usually a
 *                 lone support photo stacked under a side image. Fix with a
 *                 two-up (rule U5) or a gallery (rule G1).
 *   heading-wraps A short essay section title broken onto two lines on desktop.
 *
 * Usage (from the site root):
 *   node tools/check-spacing.mjs                 all essays and letters
 *   node tools/check-spacing.mjs update2025jun.html a-mirror-that-leaves-you-out.html
 *
 * Exit code 1 when anything is found, so it can gate a deploy. The detector
 * itself lives in tools/spacing-detector.js and runs in the page.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PORT = 4199;
const WIDTHS = [[1920, 1080], [1440, 900], [1280, 800], [1024, 768], [390, 844]];

async function loadChromium() {
  const candidates = [
    'playwright',
    process.env.PLAYWRIGHT_MODULE,
    'C:/Users/shavo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs',
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      const mod = await import(c.includes('/') ? pathToFileURL(c).href : c);
      return (mod.chromium || mod.default.chromium);
    } catch { /* try the next one */ }
  }
  console.error('check-spacing: Playwright not found. Run `npm i -D playwright` once, or set PLAYWRIGHT_MODULE to its index.mjs.');
  process.exit(2);
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(ROOT).filter((f) => f.endsWith('.html') && !/-zh-han[st]\.html$/.test(f))
      .filter((f) => /^update20\d\d/.test(f) || readFileSync(path.join(ROOT, f), 'utf8').includes('class="jr-page jr-essay'))
      .sort();

const detector = readFileSync(path.join(ROOT, 'tools', 'spacing-detector.js'), 'utf8');
const server = spawn(process.execPath, ['local-preview-server.mjs', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop);

const chromium = await loadChromium();
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch();
let total = 0;
for (const file of files) {
  if (!existsSync(path.join(ROOT, file))) { console.log(`skip ${file} (not found)`); continue; }
  for (const [w, h] of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(`http://127.0.0.1:${PORT}/${file}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    // Show reveal-on-scroll blocks and load every lazy image, so we measure the page as a reader ends up seeing it.
    await page.addStyleTag({ content: '[data-reveal]{opacity:1!important;transform:none!important}' });
    await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }));
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(60); }
    await page.waitForTimeout(1200);
    await page.evaluate(() => scrollTo(0, 0));
    await page.addScriptTag({ content: detector });
    const { issues } = await page.evaluate(() => window.__spacingAudit());
    if (issues.length) {
      console.log(`\n${file} @${w}px`);
      for (const i of issues) console.log(`  ${i.type.padEnd(13)} ${String(i.px).padStart(4)}px  y=${i.at}  ${i.after}${i.before ? '  ->  ' + i.before : ''}`);
    }
    total += issues.length;
    await page.close();
  }
}
await browser.close();
stop();
console.log(total ? `\ncheck-spacing: ${total} issue(s) across ${files.length} page(s).` : `check-spacing: PASS, ${files.length} page(s) clean at ${WIDTHS.map((x) => x[0]).join(', ')}px.`);
process.exit(total ? 1 : 0);
