import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const outDir = path.resolve('assets/press/previews');
const tmpDir = path.resolve('.codex-tmp/wayback-press-captures');

const captures = [
  {
    name: 'cntrfld-art-shavonne-wong-inside-the-bubble.webp',
    url: 'https://web.archive.org/web/20251211153642/https://cntrfld.art/in-conversation-shavonne-wong/',
    title: 'Shavonne Wong: Inside the Bubble',
    clip: { x: 360, y: 315, width: 980, height: 653 }
  },
  {
    name: 'culture3-com-stepping-across-the-uncanny-valley-with-shavonne-wong.webp',
    url: 'https://web.archive.org/web/20251012144759/https://www.culture3.com/posts/stepping-across-the-uncanny-valley-with-shavonne-wong',
    title: 'Stepping across the Uncanny Valley',
    clip: { x: 40, y: 660, width: 1280, height: 853 }
  },
  {
    name: 'herworld-com-shavonne-wong-the-new-media-artist-blurring-the-line-betwee.webp',
    url: 'https://web.archive.org/web/20250313145816/https://www.herworld.com/pov/shavonne-wong-new-media-artist-blurring-line-between-reality-and-surreal',
    title: 'Shavonne Wong: The new media artist',
    clip: { x: 160, y: 480, width: 1040, height: 693 }
  },
  {
    name: 'news-artnet-com-the-venice-biennale-is-getting-its-first-nft-art-exhibit.webp',
    url: 'https://web.archive.org/web/20260613173528/https://news.artnet.com/art-world/venice-biennale-nft-cameroon-pavilion-2075164',
    title: 'The Venice Biennale Is Getting Its First NFT',
    clip: { x: 95, y: 285, width: 840, height: 560 }
  },
  {
    name: 'femalemag-com-sg-what-exactly-is-an-nft-4-singapore-visual-artists-give-.webp',
    url: 'https://web.archive.org/web/20240221073224/https://www.femalemag.com.sg/gallery/culture/what-is-an-nft-singapore-digital-artists/',
    title: 'What Exactly Is An NFT?',
    clip: { x: 150, y: 285, width: 1060, height: 707 }
  },
  {
    name: 'iconsingapore-com-shavonne-wong-x-shu-uemura-3d.webp',
    url: 'https://web.archive.org/web/20250722183413/https://www.iconsingapore.com/beauty/shavonne-wong-shu-umemura-makeup-collection-art',
    title: 'Shavonne Wong x Shu Uemura',
    clip: { x: 160, y: 455, width: 1040, height: 693 }
  },
  {
    name: 'coindesk-com-web3-artist-shavonne-wong-on-the-future-of-nfts.webp',
    url: 'https://web.archive.org/web/20240524191856/https://www.coindesk.com/consensus-magazine/2024/04/23/web3-artist-shavonne-wong-on-the-future-of-nfts/',
    title: 'Web3 Artist Shavonne Wong',
    clip: { x: 200, y: 160, width: 980, height: 653 }
  },
  {
    name: 'fisheyeimmersive-com-paris-photo-explorer-limage-a-lere-digitale.webp',
    url: 'https://web.archive.org/web/20260209045525/https://fisheyeimmersive.com/article/paris-photo-explorer-limage-a-lere-digitale/',
    title: "Paris Photo: explorer l'image",
    clip: { x: 200, y: 270, width: 1040, height: 693 }
  },
  {
    name: 'nftnow-com-shavonne-wong-on-art-and-fostering-diversity-in-web3.webp',
    url: 'https://web.archive.org/web/20250119092558/https://nftnow.com/features/shavonne-wong-on-art-and-fostering-diversity-in-web3/',
    title: 'Shavonne Wong On Art and Fostering Diversity'
  },
  {
    name: 'adobe-com-the-best-nft-artists-and-coolest-nfts-around-right-now.webp',
    url: 'https://web.archive.org/web/20250617021530/https://www.adobe.com/uk/creativecloud/nft-art/best-nft-artists.html',
    title: 'The best NFT artists'
  },
  {
    name: 'prestigeonline-com-asian-artists-to-watch-this-2023.webp',
    url: 'https://web.archive.org/web/20230323154813/https://www.prestigeonline.com/id/pursuits/asian-artists-to-watch-this-2023/',
    title: 'Asian Artists to Watch',
    clip: { x: 40, y: 80, width: 1100, height: 733 }
  },
  {
    name: 'vogue-sg-metaverse-shavonne-wong.webp',
    url: 'https://web.archive.org/web/20250721234229/https://vogue.sg/metaverse-shavonne-wong/',
    title: 'successful NFT artist',
    clip: { x: 0, y: 300, width: 1400, height: 933 }
  },
  {
    name: 'lifestyleasia-com-contemporary-asian-artists-and-their-nft-creations-you.webp',
    url: 'https://web.archive.org/web/20231207004800/https://www.lifestyleasia.com/hk/tech/contemporary-asian-artists-and-their-nfts/',
    title: 'Contemporary Asian artists',
    viewport: { width: 1100, height: 1300 },
    clip: { x: 0, y: 430, width: 1100, height: 733 }
  }
];

const cleanupCss = `
  #wm-ipp, #wm-ipp-base, #donato, #wm-ipp-inside, .wb-autocomplete-suggestions,
  iframe[src*="archive.org"], iframe[src*="doubleclick"], iframe[id*="google"],
  #modal-popup, .modal-popup, .mfp-bg, .mfp-wrap, .dexter-Modal_overlay,
  [role="dialog"][aria-modal="true"], [aria-modal="true"],
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [class*="advertisement" i], [id*="advertisement" i], [class*="ad-banner" i],
  [class*="adslot" i], [id*="adslot" i], [class*="billboard" i],
  [class*="leaderboard" i], [id*="leaderboard" i], [class*="adunit" i],
  [id*="adunit" i], [data-ad], [data-ad-unit], [data-testid*="ad" i] {
    display: none !important;
    visibility: hidden !important;
  }

  html, body {
    scroll-behavior: auto !important;
  }

  body {
    padding-top: 0 !important;
  }

  * {
    animation: none !important;
    transition: none !important;
  }
`;

async function waitForPage(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

async function cleanupPage(page) {
  await page.addStyleTag({ content: cleanupCss }).catch(() => {});
  await page.evaluate(() => {
    const removeText = /^(accept|agree|reject|decline|close|got it|continue|privacy choices|ok|x)$/i;
    document.querySelectorAll('button, [role="button"], [aria-label*="close" i]').forEach((node) => {
      if (removeText.test(node.textContent || '')) {
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    document
      .querySelectorAll('#modal-popup, .modal-popup, .mfp-bg, .mfp-wrap, .dexter-Modal_overlay, [role="dialog"][aria-modal="true"], [aria-modal="true"]')
      .forEach((node) => node.remove());
    document.querySelectorAll('*').forEach((node) => {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if ((style.position === 'fixed' || style.position === 'sticky') && rect.height > 40) {
        const text = (node.textContent || '').slice(0, 300);
        if (/cookie|subscribe|newsletter|advert|privacy|archive|wayback|sign up|doesn.t match your location|actionable insights/i.test(text)) {
          node.style.setProperty('display', 'none', 'important');
        }
      }
    });
  }).catch(() => {});
}

async function findArticleClip(page, expectedTitle) {
  return await page.evaluate((expectedTitle) => {
    const titleNeedle = expectedTitle.toLowerCase();
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 80 && rect.height > 20 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    const headings = [...document.querySelectorAll('h1, [class*="title" i], [class*="headline" i]')]
      .filter(visible)
      .map((node) => ({ node, text: (node.textContent || '').trim(), rect: node.getBoundingClientRect() }));

    let heading = headings.find((item) => item.text.toLowerCase().includes(titleNeedle));
    heading ||= headings.find((item) => /shavonne|nft|artist|asian|photo/i.test(item.text));
    heading ||= headings[0];

    if (!heading) {
      return { x: 0, y: 0, width: window.innerWidth, height: Math.min(window.innerHeight, 900) };
    }

    const hRect = heading.rect;
    const headingTop = Math.max(0, hRect.top + window.scrollY - 120);
    const headingBottom = hRect.bottom + window.scrollY;
    const imageCandidates = [...document.images]
      .filter((img) => {
        const rect = img.getBoundingClientRect();
        if (!visible(img)) return false;
        const top = rect.top + window.scrollY;
        return rect.width > 220 && rect.height > 140 && top > headingTop - 260 && top < headingBottom + 1200;
      })
      .map((img) => {
        const rect = img.getBoundingClientRect();
        return {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          right: rect.right + window.scrollX,
          bottom: rect.bottom + window.scrollY,
          area: rect.width * rect.height
        };
      })
      .sort((a, b) => b.area - a.area);

    const hero = imageCandidates[0];
    const x1 = Math.max(0, Math.min(hRect.left + window.scrollX, hero?.x ?? hRect.left + window.scrollX) - 70);
    const x2 = Math.min(
      document.documentElement.scrollWidth,
      Math.max(hRect.right + window.scrollX, hero?.right ?? hRect.right + window.scrollX) + 70
    );
    const y1 = Math.max(0, Math.min(headingTop, hero?.y ?? headingTop) - 20);
    const y2 = Math.min(
      document.documentElement.scrollHeight,
      Math.max(headingBottom + 260, hero?.bottom ?? headingBottom + 260) + 80
    );

    return {
      x: Math.floor(x1),
      y: Math.floor(y1),
      width: Math.max(700, Math.floor(x2 - x1)),
      height: Math.max(500, Math.floor(y2 - y1))
    };
  }, expectedTitle);
}

async function captureOne(browser, item) {
  const page = await browser.newPage({
    viewport: item.viewport ?? { width: 1440, height: 1600 },
    deviceScaleFactor: 1
  });
  page.setDefaultTimeout(45000);
  await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPage(page);
  await cleanupPage(page);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.waitForTimeout(600);

  const clip = item.clip ?? await findArticleClip(page, item.title);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.waitForTimeout(800);
  await cleanupPage(page);

  const rawPath = path.join(tmpDir, item.name.replace(/\.webp$/, '.png'));
  const maxClip = {
    x: Math.max(0, clip.x),
    y: Math.max(0, clip.y),
    width: Math.min(clip.width, 1400),
    height: Math.min(clip.height, 1200)
  };
  await page.screenshot({ path: rawPath, clip: maxClip, animations: 'disabled' });
  await page.close();

  const outPath = path.join(outDir, item.name);
  await sharp(rawPath)
    .resize(1100, 733, { fit: 'cover', position: 'top' })
    .webp({ quality: 82 })
    .toFile(outPath);

  return { outPath, rawPath, clip: maxClip };
}

await fs.mkdir(tmpDir, { recursive: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const item of captures) {
    console.log(`Capturing ${item.name}`);
    const result = await captureOne(browser, item);
    console.log(`  -> ${path.relative(process.cwd(), result.outPath)}`);
  }
} finally {
  await browser.close();
}
