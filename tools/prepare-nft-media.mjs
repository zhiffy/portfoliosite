import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const root = process.cwd();
const sourceVideosDir = "D:\\Dropbox\\Gen V Agency\\Renders\\NFTs\\videos";
const sourceStillsDir = "D:\\Dropbox\\Gen V Agency\\Renders\\NFTs\\stills";
const dataPath = path.join(root, "assets", "data", "3d-single-works.json");
const stillsOutDir = path.join(root, "assets", "one-of-ones");
const videosOutDir = path.join(root, "assets", "one-of-ones", "videos");
const tempDir = path.join(root, ".media-tmp");

const videoSources = {
  "a-life-short-lived": "A Life Short Lived.mp4",
  "beauty": "Beauty.mp4",
  "beyond-the-surface": "Beyond The Surface.mp4",
  "duality-of-eth-extrovert": "Duality of Self_Extrovert_2.mp4",
  "duality-of-eth-introvert": "Duality of Self_Introvert_2.mp4",
  "everything-yet-nothing": "Everything, Yet Nothing.mp4",
  "glow": "Glow.mp4",
  "goldfish": "Goldfish.mp4",
  "i-am-not-confident": "I Am (Not) Confident.mp4",
  "i-am-not-happy": "I Am (Not) Happy.mp4",
  "i-am-not-zen": "I Am (not) Zen.mp4",
  "ice-and-fire": "Ice and Fire.mp4",
  "in-suspension": "grief_3x_short.mp4",
  "kin-i": "Kin I.mp4",
  "kin-ii": "Kin II.mp4",
  "lilium-in-pearls-i": "Lilium in Pearls I.mp4",
  "lilium-in-pearls-ii": "Lilium in Pearls II.mp4",
  "lilium-in-pearls-iii": "Lilium in Pearls III.mp4",
  "lunah-moon-i": "Lunah Moon.mp4",
  "lunah-moon-ii": "Lunah Moon II.mp4",
  "lunah-moon-iii": "Lunah Moon III.mp4",
  "natures-muse": "MarieClaire_Nature'sMuse_highres.mp4",
  "oceans-whisper": "MarieClaire_Ocean'sWhisper_highres.mp4",
  "panopticon": "Panopticon_Final_1.mp4",
  "stargazers-dream": "MaireClaire_Stargazer'sDream_highres.mp4",
  "stellae-i": "Stellae I.mp4",
  "stellae-ii": "Stellae II.mp4",
  "stellae-iii": "Stellae III.mp4",
  "suspense": "Suspense.mp4",
  "the-hug": "The Hug.mp4",
  "the-illusion-of-connection-i": "The Illusion of Connection I.mp4",
  "the-kiss": "The Kiss.mp4",
  "the-legend-of-the-white-snake": "The Legend of the White Snake.mp4",
  "the-loneliness-of-an-orchid": "The Loneliness of an Orchid.mp4",
  "the-mirror-world": "The Mirror World.mp4",
  "the-shimmering-veil-i": "The Shimmering Veil_I.mp4",
  "the-shimmering-veil-ii": "The Shimmering Veil_II.mp4",
  "the-shimmering-veil-iii": "The Shimmering Veil_III.mp4",
  "uplift": "Uplift.mp4",
  "whirlwind-of-the-waking-dream": "Whirlwind of the Waking Dream.mp4",
  "year-of-the-tiger": "Year_Of_The_Tiger.mp4",
  "year-of-the-tiger-2": "Year_Of_The_Tiger_2.mp4",
  "year-of-the-tiger-3": "Year_Of_The_Tiger_3.mp4",
};

const stillSources = {
  "a-life-short-lived": "A Life Short Lived copy.jpg",
  "beauty": "Beauty.jpg",
  "beyond-the-surface": "BeyondTheSurface_3.jpg",
  "duality-of-eth-extrovert": "Duality of Self_Extrovert.jpg",
  "duality-of-eth-introvert": "Duality of Self_Introvert.jpg",
  "everything-yet-nothing": "Coraline_EverythingYetNothing.png",
  "goldfish": "Goldfish.png",
  "ice-and-fire": "Still.jpg",
  "in-suspension": "In Suspension_SunSet.jpg",
  "kin-i": "Kin I.jpg",
  "kin-ii": "Kin II.jpg",
  "lilium-in-pearls-i": "Lilium in Pearls I.png",
  "lilium-in-pearls-ii": "Lilium in Pearls II.png",
  "lilium-in-pearls-iii": "Lilium in Pearls III.png",
  "lunah-moon-i": "Lunah Moon I.png",
  "lunah-moon-ii": "Lunah Moon II.png",
  "lunah-moon-iii": "Lunah Moon III.png",
  "natures-muse": "MarieClaire_Nature_highres_still2.jpg",
  "oceans-whisper": "MarieClaire_Underwater_highres_still.jpg",
  "panopticon": "Panopticon_Final_1 copy.jpg",
  "stargazers-dream": "MarieClaire_Space_highres_still.jpg",
  "the-illusion-of-connection-i": "The Illusion of Connection I copy.jpg",
  "the-invisible-march-of-time-i": "Invisible March of Time_1_Old.png",
  "the-invisible-march-of-time-ii": "Invisible March of Time_1_Young.png",
  "the-kiss": "The Kiss.jpg",
  "the-legend-of-the-white-snake": "The Legend of the White Snake.png",
  "the-loneliness-of-an-orchid": "The Loneliness of an Orchid copy.jpg",
  "the-mirror-world": "The Mirror World.jpg",
  "the-shimmering-veil-i": "The Shimmering Veil_I.jpg",
  "the-shimmering-veil-ii": "The Shimmering Veil_II.jpg",
  "the-shimmering-veil-iii": "The Shimmering Veil_III.jpg",
  "uplift": "Uplift.png",
  "whirlwind-of-the-waking-dream": "Whirlwind of the Waking Dream copy 2.jpg",
  "year-of-the-tiger": "Year_Of_The_Tiger copy.jpg",
  "year-of-the-tiger-2": "Year_Of_The_Tiger_2 copy.jpg",
  "year-of-the-tiger-3": "Year_Of_The_Tiger_3 copy.jpg",
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

async function extractPoster(videoPath, outPath) {
  await run(ffmpegPath, [
    "-y",
    "-ss",
    "1",
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outPath,
  ]);
}

async function optimizeStill(sourcePath, outPath) {
  await sharp(sourcePath)
    .rotate()
    .resize({
      width: 1800,
      height: 1800,
      fit: "inside",
      withoutEnlargement: true,
    })
    .sharpen({ sigma: 0.6, m1: 0.6, m2: 0.25 })
    .jpeg({
      quality: 84,
      mozjpeg: true,
      progressive: true,
    })
    .toFile(outPath);
}

async function optimizeVideo(sourcePath, outPath) {
  await run(ffmpegPath, [
    "-y",
    "-i",
    sourcePath,
    "-an",
    "-vf",
    "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "25",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outPath,
  ]);
}

function fileFromMap(baseDir, map, id) {
  const file = map[id];
  if (!file) return null;
  const fullPath = path.join(baseDir, file);
  return existsSync(fullPath) ? fullPath : null;
}

await mkdir(stillsOutDir, { recursive: true });
await mkdir(videosOutDir, { recursive: true });
await mkdir(tempDir, { recursive: true });

const data = JSON.parse(await readFile(dataPath, "utf8"));
const report = [];

for (const item of data) {
  const id = item.id;
  const imageOut = path.join(stillsOutDir, `${id}.jpg`);
  const videoOut = path.join(videosOutDir, `${id}.mp4`);
  const sourceVideo = fileFromMap(sourceVideosDir, videoSources, id);
  let sourceStill = fileFromMap(sourceStillsDir, stillSources, id);

  if (!sourceStill && sourceVideo) {
    const extracted = path.join(tempDir, `${id}.jpg`);
    await extractPoster(sourceVideo, extracted);
    sourceStill = extracted;
  }

  if (sourceStill) {
    await optimizeStill(sourceStill, imageOut);
    item.image = `/assets/one-of-ones/${id}.jpg`;
  }

  if (sourceVideo) {
    await optimizeVideo(sourceVideo, videoOut);
    item.video_url = `/assets/one-of-ones/videos/${id}.mp4`;
  } else {
    item.video_url = null;
  }

  report.push({
    id,
    image: Boolean(sourceStill),
    video: Boolean(sourceVideo),
  });
}

await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
await rm(tempDir, { recursive: true, force: true });

const images = report.filter((item) => item.image).length;
const videos = report.filter((item) => item.video).length;
const missingVideos = report.filter((item) => !item.video).map((item) => item.id);
const missingImages = report.filter((item) => !item.image).map((item) => item.id);

console.log(JSON.stringify({ images, videos, missingImages, missingVideos }, null, 2));
