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
  "/works/the-bubble-we-call-home/": "the-bubble-we-call-home.html",
  "/works/by-proxy/": "by-proxy.html",
  "/works/love-is-love/": "love-is-love.html",
  "/works/meet-eva-here/": "meet-eva-here.html",
  "/works/6529-meme-card/": "6529-meme-card.html",
  "/works/the-ties-that-bind/": "the-ties-that-bind.html",
  "/works/echoes-of-identity/": "echoes-of-identity.html",
  "/works/vogue-singapore/": "vogue-singapore.html",
  "/works/whirlwind-of-the-waking-dream/": "whirlwind-of-the-waking-dream.html",
  "/works/whirlwind-of-the-waking-world/": "whirlwind-of-the-waking-dream.html",
  "/works/zh-hans/": "works-zh-hans.html",
  "/works/zh-hant/": "works-zh-hant.html",
  "/works/available/zh-hans/": "works-available-zh-hans.html",
  "/works/available/zh-hant/": "works-available-zh-hant.html",
  "/works/conditional/zh-hans/": "conditional-zh-hans.html",
  "/works/conditional/zh-hant/": "conditional-zh-hant.html",
  "/works/after-ophelia/zh-hans/": "after-ophelia-zh-hans.html",
  "/works/after-ophelia/zh-hant/": "after-ophelia-zh-hant.html",
  "/works/meet-eva-here/zh-hans/": "meet-eva-here-zh-hans.html",
  "/works/meet-eva-here/zh-hant/": "meet-eva-here-zh-hant.html",
  "/works/the-ties-that-bind/zh-hans/": "the-ties-that-bind-zh-hans.html",
  "/works/the-ties-that-bind/zh-hant/": "the-ties-that-bind-zh-hant.html",
  "/works/the-bubble-we-call-home/zh-hans/": "the-bubble-we-call-home-zh-hans.html",
  "/works/the-bubble-we-call-home/zh-hant/": "the-bubble-we-call-home-zh-hant.html",
  "/works/echoes-of-identity/zh-hans/": "echoes-of-identity-zh-hans.html",
  "/works/echoes-of-identity/zh-hant/": "echoes-of-identity-zh-hant.html",
  "/works/whirlwind-of-the-waking-dream/zh-hans/": "whirlwind-of-the-waking-dream-zh-hans.html",
  "/works/whirlwind-of-the-waking-dream/zh-hant/": "whirlwind-of-the-waking-dream-zh-hant.html",
  "/works/love-is-love/zh-hans/": "love-is-love-zh-hans.html",
  "/works/love-is-love/zh-hant/": "love-is-love-zh-hant.html",
  "/works/by-proxy/zh-hans/": "by-proxy-zh-hans.html",
  "/works/by-proxy/zh-hant/": "by-proxy-zh-hant.html",
  "/works/vogue-singapore/zh-hans/": "vogue-singapore-zh-hans.html",
  "/works/vogue-singapore/zh-hant/": "vogue-singapore-zh-hant.html",
  "/works/6529-meme-card/zh-hans/": "6529-meme-card-zh-hans.html",
  "/works/6529-meme-card/zh-hant/": "6529-meme-card-zh-hant.html",
  "/update2026jun/zh-hans/": "update2026jun-zh-hans.html",
  "/update2026jun/zh-hant/": "update2026jun-zh-hant.html",
  "/update2025jun/zh-hans/": "update2025jun-zh-hans.html",
  "/update2025jun/zh-hant/": "update2025jun-zh-hant.html",
  "/update2025jan/zh-hans/": "update2025jan-zh-hans.html",
  "/update2025jan/zh-hant/": "update2025jan-zh-hant.html",
  "/update2024jun/zh-hans/": "update2024jun-zh-hans.html",
  "/update2024jun/zh-hant/": "update2024jun-zh-hant.html",
  "/update2024jan/zh-hans/": "update2024jan-zh-hans.html",
  "/update2024jan/zh-hant/": "update2024jan-zh-hant.html",
  "/update2023june/zh-hans/": "update2023june-zh-hans.html",
  "/update2023june/zh-hant/": "update2023june-zh-hant.html",
  "/update2023jan/zh-hans/": "update2023jan-zh-hans.html",
  "/update2023jan/zh-hant/": "update2023jan-zh-hant.html",
};

const cleanRedirects = {
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

function redirectCleanRoute(request, response) {
  if (!request.url) return false;
  const url = new URL(request.url, "http://local.preview");
  const target = cleanRedirects[url.pathname] || cleanRedirects[`${url.pathname}/`];
  if (!target) return false;
  response.statusCode = 301;
  response.setHeader("Location", target);
  response.end();
  return true;
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
        if (redirectCleanRoute(request, response)) return;
        rewriteCleanRoute(request);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (await handleNewsletterSignup(request, response)) return;
        if (redirectCleanRoute(request, response)) return;
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
