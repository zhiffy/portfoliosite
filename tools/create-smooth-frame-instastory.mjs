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
const port = 4178;
const baseUrl = `http://${host}:${port}`;
const outDir = path.join(root, "qa", "site-showcase-video");
const frameDir = path.join(outDir, "smooth-story-frames");
const overlayPng = path.join(outDir, "mulish-instastory-caption-overlay.png");
const outputVideo = path.join(outDir, "shavonne-wong-website-instastory-caption-mulish.mp4");
const checkSheet = path.join(outDir, "mulish-instastory-smooth-13s-check.jpg");
const contactSheet = path.join(outDir, "mulish-instastory-smooth-sheet.jpg");
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const fps = 25;
const viewport = { width: 390, height: 693 };

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

async function primePage(page, pathname) {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded" });
  await addCaptureStyles(page);
  await page.waitForLoadState("networkidle", { timeout: 900 }).catch(() => {});
  await page.evaluate(async () => {
    document.querySelectorAll("img[loading='lazy']").forEach((img) => {
      img.loading = "eager";
    });
    document.querySelectorAll("video").forEach((video) => {
      video.muted = true;
      video.playsInline = true;
      video.play?.().catch(() => {});
    });
    await Promise.race([
      Promise.all([
        document.fonts?.ready || Promise.resolve(),
        Promise.all(Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2200)),
    ]);
    window.scrollTo(0, 0);
  });
  await settle(page);
}

async function scrollInfo(page) {
  return page.evaluate(() => ({
    y: window.scrollY,
    maxY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  }));
}

async function captureFrame(page, index) {
  const file = path.join(frameDir, `frame-${String(index).padStart(5, "0")}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 92 });
}

async function captureScroll(page, frameState, fromY, toY, seconds, easing = "linear") {
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
    await captureFrame(page, frameState.index);
    frameState.index += 1;
  }
}

async function captureHold(page, frameState, seconds) {
  const count = Math.max(1, Math.round(seconds * fps));
  for (let i = 0; i < count; i += 1) {
    await settle(page);
    await captureFrame(page, frameState.index);
    frameState.index += 1;
  }
}

await rm(frameDir, { recursive: true, force: true }).catch(() => {});
await mkdir(frameDir, { recursive: true });

const server = startServer();
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(edgePath) ? edgePath : undefined,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const frameState = { index: 1 };

  await primePage(page, "/");
  const home = await scrollInfo(page);
  await captureScroll(page, frameState, 0, home.maxY, 17.0, "linear");
  await captureHold(page, frameState, 0.35);

  await primePage(page, "/about/");
  await captureHold(page, frameState, 0.35);
  const exhibitionsY = await page.evaluate(() => {
    const el = document.querySelector("#exhibitions");
    if (!el) return window.scrollY;
    return Math.max(0, window.scrollY + el.getBoundingClientRect().top - 92);
  });
  await captureScroll(page, frameState, 0, exhibitionsY, 5.2, "easeInOut");
  await captureHold(page, frameState, 0.35);
  const finalY = await page.evaluate(() => {
    const brief = document.querySelector(".abv-brief");
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (!brief) return maxY;
    return Math.max(0, Math.min(maxY, window.scrollY + brief.getBoundingClientRect().top - window.innerHeight * 1.35));
  });
  await captureScroll(page, frameState, exhibitionsY, finalY, 5.6, "easeInOut");
  await captureHold(page, frameState, 0.45);

  await context.close();
  await browser.close();
  browser = null;

  await ffmpeg([
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(frameDir, "frame-%05d.jpg"),
    "-i",
    overlayPng,
    "-filter_complex",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=#f6f6f4,setsar=1[base];[base][1:v]overlay=0:0:format=auto[v]",
    "-map",
    "[v]",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputVideo,
  ]);

  await ffmpeg([
    "-y",
    "-ss",
    "12.6",
    "-i",
    outputVideo,
    "-t",
    "1.2",
    "-vf",
    "fps=10,scale=270:-1,tile=6x2",
    "-frames:v",
    "1",
    checkSheet,
  ]);

  await ffmpeg([
    "-y",
    "-i",
    outputVideo,
    "-vf",
    "fps=1/5,scale=270:-1,tile=3x2",
    "-frames:v",
    "1",
    contactSheet,
  ]);

  const info = await stat(outputVideo);
  console.log(JSON.stringify({ outputVideo, bytes: info.size, frames: frameState.index - 1, checkSheet, contactSheet }, null, 2));
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
