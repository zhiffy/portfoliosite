import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundledPlaywright =
  'C:/Users/shavo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';
const { chromium } = await import(pathToFileURL(bundledPlaywright).href);

const pressHtmlPath = path.join(workspace, 'press.html');
const hoverJsPath = path.join(workspace, 'press-hover.js');
const outDir = path.join(workspace, 'assets/press/previews');
const tmpDir = path.join(workspace, '.codex-tmp/press-link-captures');
const reportPath = path.join(workspace, '.codex-tmp/press-link-preview-report.json');

const html = await fs.readFile(pressHtmlPath, 'utf8');

function decodeEntities(value) {
  return value
    .replace(/&mdash;/g, '-')
    .replace(/&#8599;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-')
    .toLowerCase()
    .slice(0, 74)
    .replace(/-+$/g, '');
}

function mapKey(href) {
  const archiveMatch = href.match(/https?:\/\/web\.archive\.org\/web\/\d+\/(https?:\/\/.+)$/i);
  const target = archiveMatch ? archiveMatch[1] : href;
  try {
    const url = new URL(target);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname}`.replace(/\/$/g, '');
  } catch {
    return href;
  }
}

const rows = [];
const rowRe =
  /<a\s+class="pr-row"\s+href="([^"]+)"[\s\S]*?<span class="pr-title">([\s\S]*?)<\/span>[\s\S]*?<span class="pr-pub">([\s\S]*?)<\/span>/gi;
let match;
while ((match = rowRe.exec(html))) {
  const href = match[1];
  const title = decodeEntities(match[2].replace(/<[^>]+>/g, ' '));
  const pub = decodeEntities(match[3].replace(/<[^>]+>/g, ' '));
  const key = mapKey(href);
  if (rows.some((row) => row.key === key)) continue;
  const fileBase = `${slug(pub)}-${slug(title)}`.replace(/^-|-$/g, '');
  rows.push({
    href,
    key,
    title,
    pub,
    fileName: key.startsWith('verymulan.com/story/')
      ? 'verymulan-ai-nft-new-world.webp'
      : `${fileBase.length > 10 ? fileBase : slug(key)}.webp`,
  });
}

const fallbackUrls = new Map([
  [
    'adobe.com/uk/creativecloud/nft-art/best-nft-artists.html',
    'https://web.archive.org/web/20250617021530/https://www.adobe.com/uk/creativecloud/nft-art/best-nft-artists.html',
  ],
]);

const fallbackPreviewFiles = new Map([
  [
    'adobe.com/uk/creativecloud/nft-art/best-nft-artists.html',
    '/assets/press/previews/adobe-com-the-best-nft-artists-and-coolest-nfts-around-right-now.webp',
  ],
]);

const curatedPreviewFiles = new Map([
  [
    'straitstimes.com/singapore/community/what-does-the-rise-of-genai-mean-for-singapores-creative-arts',
    '/assets/press/previews/straitstimes-genai-singapore-creative-arts-2026.webp',
  ],
  [
    'straitstimes.com/life/arts/chat-with-an-ai-influencer-view-van-gogh-high-end-works-at-art-sg-s-e-a-focus-and-sothebys-show',
    '/assets/press/previews/straitstimes-com-chat-with-an-ai-influencer-view-van-gogh-high-end-works.webp',
  ],
  [
    'iconsingapore.com/beauty/shavonne-wong-shu-uemura-makeup-collection-art',
    '/assets/press/previews/iconsingapore-com-shavonne-wong-x-shu-uemura-3d.webp',
  ],
  [
    'herworld.com/pov/shavonne-wong-new-media-artist-blurring-line-between-reality-and-surreal',
    '/assets/press/previews/herworld-com-shavonne-wong-the-new-media-artist-blurring-the-line-betwee.webp',
  ],
  [
    'nftnow.com/features/shavonne-wong-on-art-and-fostering-diversity-in-web3',
    '/assets/press/previews/nftnow-com-shavonne-wong-on-art-and-fostering-diversity-in-web3.webp',
  ],
  [
    'iconsingapore.com/people/photographer-turned-digital-artist-shavonne-wong-is-making-waves-in-the-region',
    '/assets/features/icon-singapore-feature.webp',
  ],
  [
    'straitstimes.com/life/arts/arts-picks-new-works-by-nobel-laureate-and-digital-artist-on-show',
    '/assets/features/the-ties-that-bind-article.webp',
  ],
  [
    'prestigeonline.com/id/pursuits/asian-artists-to-watch-this-2023',
    '/assets/features/prestige-asia-artists-to-watch-2023.webp',
  ],
  [
    'tatlerasia.com/lifestyle/arts/singaporean-fashion-photographer-shavonne-wong-nft',
    '/assets/press/previews/tatlerasia-com-singaporean-fashion-photographer-shavonne-wong-makes-a-sp.webp',
  ],
  [
    'fliphtml5.com/grzod/pvmy/basic',
    '/assets/features/tatler-hong-kong-model-persona-feature.webp',
  ],
  [
    'lifestyleasia.com/bk/culture/art/contemporary-asian-artists-nfts',
    '/assets/press/previews/lifestyleasia-com-7-contemporary-asian-artists-and-their-creative-unique.webp',
  ],
  [
    'lifestyleasia.com/hk/tech/contemporary-asian-artists-and-their-nfts',
    '/assets/press/previews/lifestyleasia-com-contemporary-asian-artists-and-their-nft-creations-you.webp',
  ],
  [
    'news.artnet.com/art-world/venice-biennale-nft-cameroon-pavilion-2075164',
    '/assets/press/previews/news-artnet-com-the-venice-biennale-is-getting-its-first-nft-art-exhibit.webp',
  ],
  [
    'tatlerasia.com/lifestyle/arts/idris-elba-buys-first-nft-from-singaporean-artist-shavonne-wong',
    '/assets/press/previews/tatlerasia-com-this-singaporean-artist-s-nft-was-just-snapped-up-by-holl.webp',
  ],
]);

const cleanupCss = `
  #wm-ipp, #wm-ipp-base, #donato, #wm-ipp-inside, .wb-autocomplete-suggestions,
  iframe[src*="archive.org"], iframe[src*="doubleclick"], iframe[id*="google"],
  iframe[src*="googlesyndication"], iframe[src*="ad"], iframe[title*="advert" i],
  [role="dialog"][aria-modal="true"], [aria-modal="true"],
  #modal-popup, .modal-popup, .mfp-bg, .mfp-wrap, .dexter-Modal_overlay,
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [class*="subscribe" i], [id*="subscribe" i], [class*="newsletter" i],
  [class*="advertisement" i], [id*="advertisement" i], [class*="ad-banner" i],
  [class*="adslot" i], [id*="adslot" i], [class*="billboard" i],
  [class*="leaderboard" i], [id*="leaderboard" i], [class*="adunit" i],
  [id*="adunit" i], [data-ad], [data-ad-unit], [data-testid*="ad" i],
  .OUTBRAIN, .trc_related_container, .taboola, .ad, .ads, .advert {
    display: none !important;
    visibility: hidden !important;
  }

  html, body {
    scroll-behavior: auto !important;
  }

  * {
    animation: none !important;
    transition: none !important;
  }
`;

async function settle(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function cleanupPage(page) {
  await page.addStyleTag({ content: cleanupCss }).catch(() => {});
  await page
    .evaluate(() => {
      const clickText = /^(accept|agree|reject|decline|close|got it|continue|privacy choices|ok|x)$/i;
      document.querySelectorAll('button, [role="button"], [aria-label*="close" i]').forEach((node) => {
        if (clickText.test((node.textContent || '').trim()) || /close|dismiss/i.test(node.getAttribute('aria-label') || '')) {
          node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      });
      document.querySelectorAll('*').forEach((node) => {
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        if ((style.position === 'fixed' || style.position === 'sticky') && rect.height > 44) {
          const text = (node.textContent || '').slice(0, 500);
          if (/cookie|subscribe|newsletter|advert|privacy|archive|wayback|sign up|login|register/i.test(text)) {
            node.style.setProperty('display', 'none', 'important');
          }
        }
      });
    })
    .catch(() => {});
}

function titleNeedles(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 8);
}

async function findClip(page, item) {
  return await page.evaluate((payload) => {
    const needles = payload.needles;
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 80 && rect.height > 18 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const scoreText = (text) => {
      const lower = (text || '').toLowerCase();
      return needles.reduce((score, word) => score + (lower.includes(word) ? 1 : 0), 0);
    };
    const headings = [...document.querySelectorAll('h1, h2, [class*="headline" i], [class*="title" i]')]
      .filter(visible)
      .map((node) => ({
        node,
        score: scoreText(node.textContent || ''),
        text: (node.textContent || '').trim(),
        rect: node.getBoundingClientRect(),
      }))
      .filter((item) => item.text.length > 8)
      .sort((a, b) => b.score - a.score || b.rect.height - a.rect.height);

    const heading = headings[0];
    if (!heading) {
      return { x: 0, y: 0, width: Math.min(window.innerWidth, 1400), height: Math.min(window.innerHeight, 1000) };
    }

    const headingTop = Math.max(0, heading.rect.top + window.scrollY - 100);
    const headingBottom = heading.rect.bottom + window.scrollY;
    const images = [...document.images]
      .filter(visible)
      .map((img) => {
        const rect = img.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        return {
          x: rect.left + window.scrollX,
          y: top,
          right: rect.right + window.scrollX,
          bottom: rect.bottom + window.scrollY,
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height,
          distance: Math.abs(top - headingBottom),
        };
      })
      .filter((img) => img.width > 220 && img.height > 120 && img.y > headingTop - 500 && img.y < headingBottom + 1400)
      .sort((a, b) => a.distance - b.distance || b.area - a.area);

    const hero = images[0];
    const x1 = Math.max(0, Math.min(heading.rect.left + window.scrollX, hero?.x ?? heading.rect.left + window.scrollX) - 70);
    const x2 = Math.min(
      document.documentElement.scrollWidth,
      Math.max(heading.rect.right + window.scrollX, hero?.right ?? heading.rect.right + window.scrollX) + 70
    );
    const y1 = Math.max(0, Math.min(headingTop, hero?.y ?? headingTop) - 24);
    const y2 = Math.min(
      document.documentElement.scrollHeight,
      Math.max(headingBottom + 260, hero?.bottom ?? headingBottom + 320) + 90
    );

    return {
      x: Math.floor(x1),
      y: Math.floor(y1),
      width: Math.max(760, Math.floor(x2 - x1)),
      height: Math.max(560, Math.floor(y2 - y1)),
    };
  }, { needles: titleNeedles(item.title) });
}

async function captureOne(browser, item) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1600 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(45000);
  const targets = [item.href, fallbackUrls.get(item.key)].filter(Boolean);
  let loaded = false;
  let lastError;
  for (const target of targets) {
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
      loaded = true;
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!loaded) throw lastError ?? new Error(`Could not load ${item.href}`);
  await settle(page);
  await cleanupPage(page);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.waitForTimeout(500);
  const clip = await findClip(page, item);
  await cleanupPage(page);

  const rawPath = path.join(tmpDir, item.fileName.replace(/\.webp$/, '.png'));
  const pageSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  const clampedX = Math.max(0, Math.min(clip.x, Math.max(0, pageSize.width - 401)));
  const clampedY = Math.max(0, Math.min(clip.y, Math.max(0, pageSize.height - 321)));
  const safeClip = {
    x: clampedX,
    y: clampedY,
    width: Math.max(400, Math.min(clip.width, 1400, pageSize.width - clampedX)),
    height: Math.max(320, Math.min(clip.height, 1200, pageSize.height - clampedY)),
  };
  try {
    await page.screenshot({ path: rawPath, clip: safeClip, animations: 'disabled' });
  } catch {
    await page.screenshot({
      path: rawPath,
      clip: {
        x: 0,
        y: 0,
        width: Math.min(1400, pageSize.width),
        height: Math.min(1000, pageSize.height),
      },
      animations: 'disabled',
    });
  }
  await page.close();

  const outPath = path.join(outDir, item.fileName);
  await sharp(rawPath)
    .resize(1100, 733, { fit: 'cover', position: 'top' })
    .webp({ quality: 84 })
    .toFile(outPath);

  return {
    key: item.key,
    title: item.title,
    href: item.href,
    file: `/assets/press/previews/${item.fileName}`,
    clip: safeClip,
  };
}

function rewritePressMap(hoverJs, captures) {
  const capturedByKey = new Map(captures.map((item) => [item.key, item]));
  const completeRows = rows.map((row) => capturedByKey.get(row.key) ?? {
    key: row.key,
    file: fallbackPreviewFiles.get(row.key),
  }).map((item) => ({
    ...item,
    file: curatedPreviewFiles.get(item.key) ?? item.file,
  })).filter((item) => item.file);
  const generated = completeRows
    .map((item) => `    ['${item.key.replace(/'/g, "\\'")}', '${item.file}'],`)
    .join('\n');
  const special = [
    `    ['aisdc.aisingapore.org/main-stage', '/assets/features/ap60-artist-proof-singapore-at-60.webp'],`,
    `    ['artcentralhongkong.com/programme/2025-performance', '/assets/meet-eva-here/14-art-central-landscape.jpg'],`,
    `    ['artsg.com/wp-content/uploads/2025/01/ART-SG-2025-Opening-Release_EN.pdf', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],`,
    `    ['bacc.or.th/en/events/90389', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],`,
    `    ['bloomberg.com/digitaloriginals', '/assets/features/bloomberg-quicktake-tweet.webp'],`,
  ].join('\n');
  const replacement = `var pressPreviewMap = [\n${generated}\n${special}\n  ];`;
  return hoverJs.replace(/var pressPreviewMap = \[[\s\S]*?\n  \];/, replacement);
}

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(tmpDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const captured = [];
try {
  for (const item of rows) {
    console.log(`Capturing ${item.pub}: ${item.title}`);
    try {
      const result = await captureOne(browser, item);
      captured.push(result);
      console.log(`  -> ${result.file}`);
    } catch (error) {
      console.log(`  !! ${error.message}`);
    }
  }
} finally {
  await browser.close();
}

if (captured.length) {
  const hoverJs = await fs.readFile(hoverJsPath, 'utf8');
  await fs.writeFile(hoverJsPath, rewritePressMap(hoverJs, captured));
}

await fs.writeFile(
  reportPath,
  JSON.stringify({ capturedAt: new Date().toISOString(), requested: rows.length, captured }, null, 2) + '\n'
);

console.log(`Captured ${captured.length}/${rows.length}`);
console.log(path.relative(workspace, reportPath));
