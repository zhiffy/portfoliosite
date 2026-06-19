import { existsSync, readdirSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";
import {
  NEWSLETTER_ALLOWED_METHODS,
  NEWSLETTER_HEADERS,
  readNodeJsonBody,
  subscribeToStudioUpdates,
} from "./lib/mailerlite-subscribe.js";

const root = process.cwd();

const cleanRoutes = {
  "/about/": "about.html",
  "/contact/": "contact.html",
  "/press/": "press.html",
  "/writing/": "writing.html",
  "/update2023jan/": "update2023jan.html",
  "/update2023june/": "update2023june.html",
  "/update2024jan/": "update2024jan.html",
  "/update2024jun/": "update2024jun.html",
  "/update2025jan/": "update2025jan.html",
  "/update2025jun/": "update2025jun.html",
  "/update2026jun/": "update2026jun.html",
  "/works/": "works.html",
  "/works/available/": "works-available.html",
  "/works/conditional/": "conditional.html",
  "/works/after-ophelia/": "after-ophelia.html",
  "/works/after-ophelia/ophelia-retold/": "after-ophelia-ophelia-retold.html",
  "/works/after-ophelia/ophelia-reassembled/": "after-ophelia-ophelia-reassembled.html",
  "/works/the-bubble-we-call-home/": "the-bubble-we-call-home.html",
  "/works/by-proxy/": "by-proxy.html",
  "/works/love-is-love/": "love-is-love.html",
  "/works/meet-eva-here/": "meet-eva-here.html",
  "/works/meet-eva-here/chatbot/": "meet-eva-here-chatbot.html",
  "/works/meet-eva-here/diary/": "meet-eva-here-diary.html",
  "/works/meet-eva-here/hello-eva/": "meet-eva-here-hello-eva.html",
  "/works/6529-meme-card/": "6529-meme-card.html",
  "/works/the-ties-that-bind/": "the-ties-that-bind.html",
  "/works/echoes-of-identity/": "echoes-of-identity.html",
  "/works/vogue-singapore/": "vogue-singapore.html",
  "/works/whirlwind-of-the-waking-dream/": "whirlwind-of-the-waking-dream.html",
  "/works/whirlwind-of-the-waking-world/": "whirlwind-of-the-waking-dream.html",
};

function rewriteCleanRoute(request) {
  if (!request.url) return;
  const url = new URL(request.url, "http://local.preview");
  const target = cleanRoutes[url.pathname] || cleanRoutes[`${url.pathname}/`];
  if (target) {
    request.url = `/${target}${url.search}${url.hash}`;
    return;
  }

  const routePrefix = Object.keys(cleanRoutes)
    .sort((a, b) => b.length - a.length)
    .find((route) => url.pathname.startsWith(route));
  if (!routePrefix) return;

  const nestedAsset = url.pathname.slice(routePrefix.length);
  if (!nestedAsset) return;

  const assetPath = path.resolve(root, nestedAsset);
  if (assetPath.startsWith(root) && existsSync(assetPath)) {
    request.url = `/${nestedAsset}${url.search}${url.hash}`;
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

const htmlEntries = Object.fromEntries(
  readdirSync(root)
    .filter((file) => file.endsWith(".html"))
    .filter((file) => !file.includes(".tmp."))
    .filter((file) => !file.includes(" v1"))
    .map((file) => [
      file.replace(/\.html$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "index",
      file,
    ]),
);

function copyStaticFiles() {
  const copyTargets = [
    "assets",
    "contact.css",
    "uploads",
    "fluid-renderer.js",
    "favicon.ico",
    "lightbox.js",
    "press-hover.js",
    "robots.txt",
    "scroll-narrative.js",
    "site-header.js",
    "site-i18n.js",
    "sitemap.xml",
    "subscribe.js",
    "_headers",
    "_redirects",
  ];

  const excludedPathParts = [
    path.join("assets", "videos", "everything-yet-nothing-frames"),
    path.join("assets", "videos", "everything-yet-nothing-scrub"),
  ];

  return {
    name: "copy-static-site-files",
    async closeBundle() {
      const outDir = path.resolve(root, "dist");
      await mkdir(outDir, { recursive: true });

      for (const target of copyTargets) {
        const source = path.resolve(root, target);
        if (!existsSync(source)) continue;

        await cp(source, path.resolve(outDir, target), {
          recursive: true,
          force: true,
          filter: (sourcePath) => {
            const relative = path.relative(root, sourcePath);
            return !excludedPathParts.some((excluded) => relative.startsWith(excluded));
          },
        });
      }
    },
  };
}

function cleanRouteDevServer() {
  return {
    name: "clean-route-dev-server",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (await handleNewsletterSignup(request, response)) return;
        rewriteCleanRoute(request);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (await handleNewsletterSignup(request, response)) return;
        rewriteCleanRoute(request);
        next();
      });
    },
  };
}

export default defineConfig({
  appType: "mpa",
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: htmlEntries,
    },
  },
  plugins: [cleanRouteDevServer(), copyStaticFiles()],
});
