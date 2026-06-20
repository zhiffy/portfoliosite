import { readFile } from "node:fs/promises";

const HOST = "www.shavonnewong.art";
const KEY = "c7d8ef3c9a2b4f56b8d1e0a93c4f5276";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

function parseSitemapUrls(xml) {
  return Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g), (match) => match[1])
    .filter((url) => {
      try {
        return new URL(url).hostname === HOST;
      } catch {
        return false;
      }
    });
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const sitemap = await readFile("sitemap.xml", "utf8");
  const urlList = parseSitemapUrls(sitemap);

  if (!urlList.length) {
    throw new Error("No URLs found in sitemap.xml");
  }

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  if (isDryRun) {
    console.log(`IndexNow dry run: ${urlList.length} URLs ready`);
    console.log(`Key location: ${KEY_LOCATION}`);
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  console.log(`IndexNow response: ${response.status} ${response.statusText}`);
  if (body) console.log(body);

  if (!response.ok && response.status !== 202) {
    throw new Error("IndexNow submission failed");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
