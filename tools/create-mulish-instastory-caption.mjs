import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "qa", "site-showcase-video");
const inputVideo = path.join(outDir, "shavonne-wong-website-scroll-demo-ig-vertical.mp4");
const outputVideo = path.join(outDir, "shavonne-wong-website-instastory-caption-mulish.mp4");
const overlayHtml = path.join(outDir, "mulish-instastory-caption.html");
const overlayPng = path.join(outDir, "mulish-instastory-caption-overlay.png");
const startFrame = path.join(outDir, "mulish-instastory-caption-start.jpg");
const contactSheet = path.join(outDir, "mulish-instastory-caption-sheet.jpg");

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
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

if (!existsSync(playwrightModule)) {
  throw new Error(`Playwright was not found at ${playwrightModule}`);
}

const { chromium } = await import(pathToFileURL(playwrightModule).href);

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { cwd: root, stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}`))));
    child.on("error", reject);
  });
}

await mkdir(outDir, { recursive: true });

const fontUrl = pathToFileURL(path.join(root, "assets", "fonts", "mulish", "mulish-variable.woff2")).href;
const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @font-face {
      font-family: "MulishStory";
      src: url("${fontUrl}") format("woff2");
      font-weight: 200 1000;
      font-style: normal;
      font-display: block;
    }
    html,
    body {
      width: 1080px;
      height: 1920px;
      margin: 0;
      overflow: hidden;
      background: transparent;
    }
    body {
      font-family: "MulishStory", "Mulish", Arial, sans-serif;
    }
    .caption {
      position: absolute;
      left: 72px;
      right: 72px;
      top: 146px;
      padding: 42px 48px 46px;
      border-radius: 34px;
      color: #20232f;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(247, 247, 250, 0.88));
      border: 1px solid rgba(32, 35, 47, 0.12);
      box-shadow: 0 24px 72px rgba(32, 35, 47, 0.22);
      text-align: center;
      box-sizing: border-box;
    }
    .line-1 {
      display: block;
      font-size: 62px;
      line-height: 1.02;
      font-weight: 850;
      letter-spacing: 0;
    }
    .line-2 {
      display: block;
      margin-top: 22px;
      font-size: 44px;
      line-height: 1.14;
      font-weight: 650;
      letter-spacing: 0;
    }
    .site {
      display: inline-block;
      margin-top: 22px;
      padding: 12px 24px 15px;
      border-radius: 999px;
      color: #f7f7fa;
      background: #20232f;
      font-size: 45px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 0;
      box-shadow: 0 10px 28px rgba(32, 35, 47, 0.2);
    }
    .sparkle {
      display: inline-block;
      margin-left: 8px;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="caption">
    <span class="line-1">My website is also<br>newly revamped!</span>
    <span class="line-2">Subscribe to my soon to be<br>released newsletter at</span>
    <span class="site">shavonnewong.art <span class="sparkle">✨</span></span>
  </div>
</body>
</html>`;

await writeFile(overlayHtml, html, "utf8");

const browser = await chromium.launch({
  headless: true,
  executablePath: existsSync(edgePath) ? edgePath : undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(overlayHtml).href, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: overlayPng, omitBackground: true });
} finally {
  await browser.close().catch(() => {});
}

await ffmpeg([
  "-y",
  "-ss",
  "0.5",
  "-i",
  inputVideo,
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
  "0.1",
  "-i",
  outputVideo,
  "-frames:v",
  "1",
  startFrame,
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

console.log(JSON.stringify({ outputVideo, overlayPng, startFrame, contactSheet }, null, 2));
