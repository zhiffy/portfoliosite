import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import {
  NEWSLETTER_ALLOWED_METHODS,
  NEWSLETTER_HEADERS,
  readNodeJsonBody,
  subscribeToStudioUpdates,
} from "./lib/brevo-subscribe.js";

const root = process.cwd();
const port = Number(process.argv[2] || 4174);
const host = process.argv[3] || "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

const routes = {
  "/": "index.html",
  "/about/": "about.html",
  "/about/zh-hans/": "about-zh-hans.html",
  "/about/zh-hant/": "about-zh-hant.html",
  "/contact/": "contact.html",
  "/contact/zh-hans/": "contact-zh-hans.html",
  "/contact/zh-hant/": "contact-zh-hant.html",
  "/press/": "press.html",
  "/press/zh-hans/": "press-zh-hans.html",
  "/press/zh-hant/": "press-zh-hant.html",
  "/writing/": "writing.html",
  "/writing/zh-hans/": "writing-zh-hans.html",
  "/writing/zh-hant/": "writing-zh-hant.html",
  "/works/": "works.html",
  "/works/after-ophelia/": "after-ophelia.html",
  "/works/the-bubble-we-call-home/": "the-bubble-we-call-home.html",
  "/works/available/": "works-available.html",
  "/works/by-proxy/": "by-proxy.html",
  "/works/conditional/": "conditional.html",
  "/works/love-is-love/": "love-is-love.html",
  "/works/meet-eva-here/": "meet-eva-here.html",
  "/works/6529-meme-card/": "6529-meme-card.html",
  "/works/the-ties-that-bind/": "the-ties-that-bind.html",
  "/works/echoes-of-identity/": "echoes-of-identity.html",
  "/works/vogue-singapore/": "vogue-singapore.html",
  "/works/whirlwind-of-the-waking-dream/": "whirlwind-of-the-waking-dream.html",
  "/works/whirlwind-of-the-waking-world/": "whirlwind-of-the-waking-dream.html",
  "/update2023jan/": "update2023jan.html",
  "/update2023june/": "update2023june.html",
  "/update2024jan/": "update2024jan.html",
  "/update2024jun/": "update2024jun.html",
  "/update2025jan/": "update2025jan.html",
  "/update2025jun/": "update2025jun.html",
  "/update2026jun/": "update2026jun.html",
};

const redirects = {
  "/about-zh-hans.html": "/about/zh-hans/",
  "/about-zh-hant.html": "/about/zh-hant/",
  "/zh-hans/about/": "/about/zh-hans/",
  "/zh-hant/about/": "/about/zh-hant/",
  "/zh-hans-about.html": "/about/zh-hans/",
  "/zh-hant-about.html": "/about/zh-hant/",
  "/contact-zh-hans.html": "/contact/zh-hans/",
  "/contact-zh-hant.html": "/contact/zh-hant/",
  "/zh-hans/contact/": "/contact/zh-hans/",
  "/zh-hant/contact/": "/contact/zh-hant/",
  "/zh-hans-contact.html": "/contact/zh-hans/",
  "/zh-hant-contact.html": "/contact/zh-hant/",
  "/writing-zh-hans.html": "/writing/zh-hans/",
  "/writing-zh-hant.html": "/writing/zh-hant/",
  "/zh-hans/writing/": "/writing/zh-hans/",
  "/zh-hant/writing/": "/writing/zh-hant/",
  "/zh-hans-writing.html": "/writing/zh-hans/",
  "/zh-hant-writing.html": "/writing/zh-hant/",
  "/press-zh-hans.html": "/press/zh-hans/",
  "/press-zh-hant.html": "/press/zh-hant/",
  "/zh-hans/press/": "/press/zh-hans/",
  "/zh-hant/press/": "/press/zh-hant/",
  "/zh-hans-press.html": "/press/zh-hans/",
  "/zh-hant-press.html": "/press/zh-hant/",
};

if (existsSync("_redirects")) {
  for (const raw of readFileSync("_redirects", "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [source, destination, status] = line.split(/\s+/);
    if (status === "200") routes[source] = destination.replace(/^\/+/, "");
    if (status && status.startsWith("301")) redirects[source] = destination;
  }
}

async function handleNewsletterSignup(request, response) {
  if (request.url !== "/api/newsletter-subscribe") return false;

  if (request.method === "OPTIONS") {
    response.writeHead(204, { Allow: NEWSLETTER_ALLOWED_METHODS });
    response.end();
    return true;
  }

  if (request.method !== "POST") {
    response.writeHead(405, { ...NEWSLETTER_HEADERS, Allow: NEWSLETTER_ALLOWED_METHODS });
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return true;
  }

  try {
    const payload = await readNodeJsonBody(request);
    const result = await subscribeToStudioUpdates(payload);
    response.writeHead(result.status, NEWSLETTER_HEADERS);
    response.end(JSON.stringify(result.body));
  } catch (error) {
    response.writeHead(500, NEWSLETTER_HEADERS);
    response.end(JSON.stringify({
      error: "Newsletter signup failed.",
      details: error instanceof Error ? error.message : String(error),
    }));
  }

  return true;
}

function respond(response, status, body, type = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": type,
  });
  response.end(body);
}

function resolveFile(requestPath) {
  const mappedRoute = routes[requestPath] || routes[`${requestPath}/`];
  let relativePath = mappedRoute || requestPath.replace(/^\/+/, "") || "index.html";
  const routePrefix = Object.keys(routes)
    .sort((a, b) => b.length - a.length)
    .find((route) => requestPath.startsWith(route));

  if (!mappedRoute && routePrefix) {
    const nestedAsset = requestPath.slice(routePrefix.length);
    const nestedAssetPath = path.resolve(root, nestedAsset);
    if (nestedAsset && nestedAssetPath.startsWith(root) && existsSync(nestedAssetPath)) {
      relativePath = nestedAsset;
    }
  }
  let filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root)) return null;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!existsSync(filePath) && !path.extname(filePath)) {
    filePath = path.resolve(root, `${relativePath}.html`);
  }

  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    return null;
  }
  return filePath;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);
    if (await handleNewsletterSignup(request, response)) return;
    const redirectTarget = redirects[url.pathname] || redirects[`${url.pathname}/`];
    if (redirectTarget) {
      response.writeHead(301, {
        "Cache-Control": "no-store",
        "Location": redirectTarget,
      });
      response.end();
      return;
    }

    const filePath = resolveFile(decodeURIComponent(url.pathname));

    if (!filePath) {
      respond(response, 404, "Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[extension] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    respond(response, 500, error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, host, () => {
  console.log(`Preview server running at http://${host}:${port}/`);
});
