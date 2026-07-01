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
const port = 4179;
const baseUrl = `http://${host}:${port}`;
const outDir = path.join(root, "qa", "site-showcase-video", "horizontal-collage");
const frameRoot = path.join(outDir, "loaded-frames");
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const viewport = { width: 1920, height: 1080 };
const fps = 25;

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

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { cwd: root, stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}`))));
    child.on("error", reject);
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

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function waitForImages(page, timeoutMs = 2600) {
  await page.evaluate(async (timeout) => {
    document.querySelectorAll("img[loading='lazy']").forEach((img) => {
      img.loading = "eager";
      img.decoding = "sync";
    });

    const imagePromises = Array.from(document.images).map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    });

    const videoPromises = Array.from(document.querySelectorAll("video")).map((video) => {
      video.muted = true;
      video.playsInline = true;
      video.play?.().catch(() => {});
      if (video.readyState >= 2) return Promise.resolve();
      return new Promise((resolve) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        video.addEventListener("error", resolve, { once: true });
      });
    });

    await Promise.race([
      Promise.all([
        document.fonts?.ready || Promise.resolve(),
        Promise.all(imagePromises),
        Promise.all(videoPromises),
      ]),
      new Promise((resolve) => setTimeout(resolve, timeout)),
    ]);
  }, timeoutMs);
  await settle(page);
}

async function primePage(page, pathname, options = {}) {
  const scrollPreload = options.scrollPreload !== false;
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded" });
  await addCaptureStyles(page);
  await page.waitForLoadState("networkidle", { timeout: 1000 }).catch(() => {});
  await waitForImages(page);
  if (scrollPreload) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await waitForImages(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitForImages(page);
  }
}

async function maxScrollY(page) {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
}

async function currentScrollY(page) {
  return page.evaluate(() => window.scrollY);
}

async function selectorY(page, selector, offset = 100) {
  return page.evaluate(({ selector, offset }) => {
    const el = document.querySelector(selector);
    if (!el) return window.scrollY;
    return Math.max(0, window.scrollY + el.getBoundingClientRect().top - offset);
  }, { selector, offset });
}

async function elementY(handle, offset = 100) {
  return handle.evaluate((el, offsetValue) => (
    Math.max(0, window.scrollY + el.getBoundingClientRect().top - offsetValue)
  ), offset);
}

async function captureFrame(page, frameDir, index) {
  const file = path.join(frameDir, `frame-${String(index).padStart(5, "0")}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 90 });
}

async function captureScroll(page, frameState, fromY, toY, seconds, easing = "easeInOut") {
  const count = Math.max(1, Math.round(seconds * fps));
  const curve = (t) => {
    if (easing === "linear") return t;
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  };

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 1 : i / (count - 1);
    const y = fromY + (toY - fromY) * curve(t);
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await settle(page);
    await captureFrame(page, frameState.frameDir, frameState.index);
    frameState.index += 1;
  }
}

async function captureHold(page, frameState, seconds) {
  const count = Math.max(1, Math.round(seconds * fps));
  for (let i = 0; i < count; i += 1) {
    await settle(page);
    await captureFrame(page, frameState.frameDir, frameState.index);
    frameState.index += 1;
  }
}

async function clickLoaded(page, selector, waitMs = 300) {
  await page.locator(selector).click({ force: true });
  await page.waitForLoadState("networkidle", { timeout: 1400 }).catch(() => {});
  await waitForImages(page);
  if (waitMs) await sleep(waitMs);
}

async function clickHandleLoaded(page, handle) {
  await handle.click({ force: true });
  await page.waitForLoadState("networkidle", { timeout: 1400 }).catch(() => {});
  await waitForImages(page);
}

async function encodeClip(slug, frameDir) {
  const outputPath = path.join(outDir, `${slug}.mp4`);
  await rm(outputPath, { force: true }).catch(() => {});
  await ffmpeg([
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(frameDir, "frame-%05d.jpg"),
    "-vf",
    "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#f6f6f4,setsar=1",
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
  ]);
  const info = await stat(outputPath);
  console.log(JSON.stringify({ outputPath, bytes: info.size }, null, 2));
}

async function recordClip(browser, slug, action) {
  console.log(`Recording ${slug}`);
  const frameDir = path.join(frameRoot, slug);
  await rm(frameDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(frameDir, { recursive: true });

  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const frameState = { index: 1, frameDir };
  await action(page, frameState);
  await context.close();
  await encodeClip(slug, frameDir);
}

const clips = {
  async homepage(page, frameState) {
    await primePage(page, "/", { scrollPreload: false });
    await captureScroll(page, frameState, 0, await maxScrollY(page), 15.5, "linear");
  },

  async about(page, frameState) {
    await primePage(page, "/about/");
    const endY = await page.evaluate(() => {
      const brief = document.querySelector(".abv-brief");
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (!brief) return maxY;
      return Math.max(0, Math.min(maxY, window.scrollY + brief.getBoundingClientRect().top - window.innerHeight * 1.15));
    });
    await captureScroll(page, frameState, 0, endY, 13.5, "easeInOut");
  },

  async works(page, frameState) {
    await primePage(page, "/works/");
    await captureScroll(page, frameState, 0, await selectorY(page, ".wk2-tabbar", 86), 2.4, "easeInOut");

    await clickLoaded(page, "#tab-single", 300);
    await page.waitForSelector("#panel-single .wk2-tile[data-single-work-id]", { timeout: 8000 }).catch(() => {});
    await waitForImages(page, 3200);
    const singleY = await selectorY(page, "#panel-single .wk2-grid", 150);
    await captureScroll(page, frameState, await currentScrollY(page), singleY, 2.0, "easeInOut");
    await captureHold(page, frameState, 0.8);

    await clickLoaded(page, "#tab-projects", 250);
    await page.waitForSelector("#panel-projects.is-active", { timeout: 5000 }).catch(() => {});
    await waitForImages(page);
    const meetEvaTile = await page.waitForSelector('#panel-projects a.wk2-tile[href*="meet-eva-here"]', { timeout: 8000 });
    const meetEvaY = await elementY(meetEvaTile, 160);
    await captureScroll(page, frameState, await currentScrollY(page), meetEvaY, 1.8, "easeInOut");
    await clickHandleLoaded(page, meetEvaTile);
    await page.waitForURL("**/works/meet-eva-here/**", { timeout: 8000 }).catch(() => {});
    await waitForImages(page);
    await captureScroll(page, frameState, 0, await maxScrollY(page), 4.8, "easeInOut");
  },

  async writing(page, frameState) {
    await primePage(page, "/writing/");
    const firstUpdate = await page.waitForSelector('.wr-card[href*="update2026jun"]', { timeout: 8000 });
    const updateY = await elementY(firstUpdate, 120);
    await captureScroll(page, frameState, 0, updateY, 1.8, "easeInOut");
    await clickHandleLoaded(page, firstUpdate);
    await page.waitForURL("**/update2026jun/**", { timeout: 8000 }).catch(() => {});
    await waitForImages(page);
    await captureScroll(page, frameState, 0, await maxScrollY(page), 7.6, "easeInOut");
  },
};

await mkdir(outDir, { recursive: true });
await mkdir(frameRoot, { recursive: true });

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
