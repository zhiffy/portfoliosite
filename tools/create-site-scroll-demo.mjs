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
const port = 4176;
const baseUrl = `http://${host}:${port}`;
const outDir = path.join(root, "qa", "site-showcase-video");
const videoDir = path.join(outDir, "raw");
const profile = process.argv.includes("--vertical") ? "vertical" : "horizontal";
const outputSize = profile === "vertical"
  ? { width: 1080, height: 1920 }
  : { width: 1920, height: 1080 };
const viewportSize = profile === "vertical"
  ? { width: 390, height: 693 }
  : outputSize;
const rawVideoSize = profile === "vertical" ? viewportSize : outputSize;
const finalVideo = path.join(
  outDir,
  profile === "vertical"
    ? "shavonne-wong-website-scroll-demo-ig-vertical.mp4"
    : "shavonne-wong-website-scroll-demo.mp4",
);
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const route = [
  { path: "/", label: "Home", dwell: 0, scrollMs: 17000, easing: "linear" },
  { path: "/about/", label: "About", dwell: 0 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error("Preview server did not become available in time.");
}

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

async function pageReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 500 }).catch(() => {});
  await page.evaluate(async () => {
    document.querySelectorAll("img[loading='lazy']").forEach((img) => {
      img.loading = "eager";
    });
    const images = Array.from(document.images);
    await Promise.race([
      Promise.all([
        document.fonts?.ready || Promise.resolve(),
        Promise.all(images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })),
      ]),
      new Promise((resolve) => setTimeout(resolve, 1800)),
    ]);
    document.querySelectorAll("video").forEach((video) => {
      video.muted = true;
      video.playsInline = true;
      if (video.paused && typeof video.play === "function") {
        video.play().catch(() => {});
      }
    });
  });
}

async function easeScroll(page, durationMs, easing = "easeInOut") {
  await page.evaluate(async ({ duration, easingName }) => {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxY < 80) {
      await new Promise((resolve) => setTimeout(resolve, duration));
      return;
    }

    const start = performance.now();
    const curve = (t) => {
      if (easingName === "linear") return t;
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };
    await new Promise((resolve) => {
      function frame(now) {
        const progress = Math.min(1, (now - start) / duration);
        window.scrollTo(0, maxY * curve(progress));
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }, { duration: durationMs, easingName: easing });
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

async function scrollToSelector(page, selector, offset = 110, durationMs = 5200) {
  const targetY = await page.evaluate(({ selector, offset }) => {
    const el = document.querySelector(selector);
    if (!el) return window.scrollY;
    return window.scrollY + el.getBoundingClientRect().top - offset;
  }, { selector, offset });
  await scrollToY(page, targetY, durationMs, "easeInOut");
}

async function hoverExhibitions(page) {
  if (profile === "vertical") return;
  await page.waitForSelector("#exhibitions .abv-exh-entry", { timeout: 5000 });
  const boxes = await page.locator("#exhibitions .abv-exh-entry").evaluateAll((entries) => (
    entries
      .slice(0, 6)
      .map((entry) => {
        const rect = entry.getBoundingClientRect();
        return {
          x: rect.left + Math.min(rect.width - 28, Math.max(40, rect.width * 0.32)),
          y: rect.top + rect.height / 2,
        };
      })
      .filter((box) => box.y > 80 && box.y < window.innerHeight - 80)
  ));

  if (!boxes.length) return;
  await page.mouse.move(boxes[0].x, boxes[0].y);
  await sleep(650);
  for (const box of boxes.slice(1)) {
    await page.mouse.move(box.x, box.y, { steps: 18 });
    await sleep(650);
  }
  await page.mouse.move(1500, 190, { steps: 20 });
  await sleep(400);
}

async function recordAboutPage(page) {
  await scrollToSelector(page, "#exhibitions", 100, 5200);
  await hoverExhibitions(page);
  const finalY = await page.evaluate(() => {
    const brief = document.querySelector(".abv-brief");
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (!brief) return maxY;
    return Math.max(0, Math.min(maxY, window.scrollY + brief.getBoundingClientRect().top - window.innerHeight * 1.35));
  });
  await scrollToY(page, finalY, 5600, "easeInOut");
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

async function encodeMp4(rawWebm) {
  await new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      rawWebm,
      "-vf",
      `scale=${outputSize.width}:${outputSize.height}:force_original_aspect_ratio=decrease,pad=${outputSize.width}:${outputSize.height}:(ow-iw)/2:(oh-ih)/2:color=#f6f6f4`,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      finalVideo,
    ];
    const child = spawn(ffmpegPath, args, { cwd: root, stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}`))));
    child.on("error", reject);
  });
}

await rm(videoDir, { recursive: true, force: true }).catch(() => {});
await mkdir(videoDir, { recursive: true });
await rm(finalVideo, { force: true }).catch(() => {});

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
    viewport: viewportSize,
    deviceScaleFactor: profile === "vertical" ? 3 : 1,
    isMobile: profile === "vertical",
    hasTouch: profile === "vertical",
    recordVideo: { dir: videoDir, size: rawVideoSize },
  });
  const page = await context.newPage();

  for (const item of route) {
    console.log(`Recording ${item.label}`);
    await page.goto(`${baseUrl}${item.path}`, { waitUntil: "domcontentloaded" });
    await addCaptureStyles(page);
    await pageReady(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(item.dwell);
    if (item.path === "/about/") {
      await recordAboutPage(page);
    } else {
      await easeScroll(page, item.scrollMs, item.easing);
    }
  }

  const rawPathPromise = page.video().path();
  await context.close();
  const rawWebm = await rawPathPromise;
  await browser.close();
  browser = null;

  await encodeMp4(rawWebm);
  const info = await stat(finalVideo);
  console.log(JSON.stringify({ finalVideo, bytes: info.size }, null, 2));
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
