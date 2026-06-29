import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const bundledNodeModules =
  "C:/Users/shavo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const playwrightModule = path.join(
  bundledNodeModules,
  ".pnpm",
  "playwright@1.61.0",
  "node_modules",
  "playwright",
  "index.mjs",
);

if (!existsSync(playwrightModule)) {
  throw new Error(`Playwright was not found at ${playwrightModule}`);
}

const { chromium } = await import(pathToFileURL(playwrightModule).href);

const host = "127.0.0.1";
const port = 4177;
const baseUrl = `http://${host}:${port}`;
const outDir = path.join(root, "qa", "site-showcase-video", "horizontal-collage");
const rawDir = path.join(outDir, "raw");
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const viewport = { width: 1920, height: 1080 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startServer() {
  const child = spawn(process.execPath, ["local-preview-server.mjs", String(port), host], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForServer() {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await sleep(220);
  }
  throw new Error("Preview server did not become available in time.");
}

async function pageReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 900 }).catch(() => {});
  await page.evaluate(async () => {
    const nearbyImages = Array.from(document.images).filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.top < window.innerHeight * 1.25;
    });
    await Promise.race([
      Promise.all([
        document.fonts?.ready || Promise.resolve(),
        Promise.all(nearbyImages.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })),
      ]),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]);
    document.querySelectorAll("video").forEach((video) => {
      video.muted = true;
      video.playsInline = true;
      video.play?.().catch(() => {});
    });
  });
}

async function addCaptureStyles(page) {
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      * { caret-color: transparent !important; }
      [data-page-nav] { transition: none !important; }
      .sw-subscribe-cta { display: none !important; }
    `,
  });
}

async function go(page, pathname) {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded" });
  await addCaptureStyles(page);
  await pageReady(page);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function scrollToY(page, targetY, durationMs, easing = "easeInOut") {
  await page.evaluate(async ({ targetY, duration, easingName }) => {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const startY = window.scrollY;
    const endY = Math.max(0, Math.min(maxY, targetY));
    const distance = endY - startY;
    const start = performance.now();
    const curve = (t) => {
      if (easingName === "linear") return t;
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };
    await new Promise((resolve) => {
      function frame(now) {
        const progress = Math.min(1, (now - start) / duration);
        window.scrollTo(0, startY + distance * curve(progress));
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }, { targetY, duration: durationMs, easingName: easing });
}

async function scrollWholePage(page, durationMs, easing = "easeInOut") {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  await scrollToY(page, maxY, durationMs, easing);
}

async function scrollToSelector(page, selector, offset = 100, durationMs = 4000) {
  const y = await page.evaluate(({ selector, offset }) => {
    const el = document.querySelector(selector);
    if (!el) return window.scrollY;
    return window.scrollY + el.getBoundingClientRect().top - offset;
  }, { selector, offset });
  await scrollToY(page, y, durationMs, "easeInOut");
}

async function scrollToElement(page, handle, offset = 100, durationMs = 1800) {
  const y = await handle.evaluate((el, offsetValue) => {
    return window.scrollY + el.getBoundingClientRect().top - offsetValue;
  }, offset);
  await scrollToY(page, y, durationMs, "easeInOut");
}

async function clickAndWait(page, selector, waitMs = 700) {
  await page.locator(selector).click();
  await page.waitForLoadState("networkidle", { timeout: 1800 }).catch(() => {});
  await sleep(waitMs);
}

async function encodeMp4(rawWebm, outputPath) {
  await new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      rawWebm,
      "-vf",
      "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#f6f6f4",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ];
    const child = spawn(ffmpegPath, args, { cwd: root, stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}`))));
    child.on("error", reject);
  });
}

async function recordClip(browser, slug, action) {
  console.log(`Recording ${slug}`);
  const clipRawDir = path.join(rawDir, slug);
  await rm(clipRawDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(clipRawDir, { recursive: true });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: clipRawDir, size: viewport },
  });
  const page = await context.newPage();
  await action(page);
  await sleep(450);

  const rawPathPromise = page.video().path();
  await context.close();
  const rawWebm = await rawPathPromise;
  const outputPath = path.join(outDir, `${slug}.mp4`);
  await rm(outputPath, { force: true }).catch(() => {});
  await encodeMp4(rawWebm, outputPath);
  const info = await stat(outputPath);
  console.log(JSON.stringify({ outputPath, bytes: info.size }, null, 2));
}

const clips = {
  async homepage(page) {
    await go(page, "/");
    await sleep(500);
    await scrollWholePage(page, 15500, "linear");
  },

  async about(page) {
    await go(page, "/about/");
    await sleep(500);
    const endY = await page.evaluate(() => {
      const brief = document.querySelector(".abv-brief");
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (!brief) return maxY;
      return Math.max(0, Math.min(maxY, window.scrollY + brief.getBoundingClientRect().top - window.innerHeight * 1.15));
    });
    await scrollToY(page, endY, 13500, "easeInOut");
  },

  async works(page) {
    await go(page, "/works/");
    await sleep(550);
    await scrollToSelector(page, ".wk2-tabbar", 86, 2400);
    await clickAndWait(page, "#tab-single", 1100);
    await page.waitForSelector("#panel-single .wk2-tile[data-single-work-id]", { timeout: 8000 }).catch(() => {});
    await scrollToSelector(page, "#panel-single .wk2-grid", 150, 2000);
    await sleep(1200);
    await clickAndWait(page, "#tab-projects", 900);
    await page.waitForSelector("#panel-projects.is-active", { timeout: 5000 }).catch(() => {});
    const meetEvaTile = await page.waitForSelector('#panel-projects a.wk2-tile[href*="meet-eva-here"]', { timeout: 8000 });
    await scrollToElement(page, meetEvaTile, 160, 1800);
    await sleep(650);
    await meetEvaTile.click({ force: true });
    await page.waitForURL("**/works/meet-eva-here/**", { timeout: 8000 }).catch(() => {});
    await pageReady(page);
    await sleep(900);
    await scrollWholePage(page, 4800, "easeInOut");
  },

  async writing(page) {
    await go(page, "/writing/");
    await sleep(550);
    const firstUpdate = await page.waitForSelector('.wr-card[href*="update2026jun"]', { timeout: 8000 });
    await scrollToElement(page, firstUpdate, 120, 1800);
    await sleep(650);
    await firstUpdate.click({ force: true });
    await page.waitForURL("**/update2026jun/**", { timeout: 8000 }).catch(() => {});
    await pageReady(page);
    await sleep(850);
    await scrollWholePage(page, 7600, "easeInOut");
  },
};

await mkdir(outDir, { recursive: true });

const requested = process.argv.slice(2).filter((arg) => clips[arg]);
const clipEntries = requested.length
  ? Object.entries(clips).filter(([slug]) => requested.includes(slug))
  : Object.entries(clips);

const server = startServer();
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(edgePath) ? edgePath : undefined,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  for (const [slug, action] of clipEntries) {
    await recordClip(browser, slug, action);
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
