import { existsSync, readdirSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";

const root = process.cwd();

const cleanRoutes = {
  "/about/": "about.html",
  "/press/": "press.html",
  "/writing/": "writing.html",
  "/works/": "works.html",
  "/works/available/": "works-available.html",
  "/works/conditional/": "conditional.html",
  "/works/after-ophelia/": "after-ophelia.html",
  "/works/after-ophelia/ophelia-retold/": "after-ophelia-ophelia-retold.html",
  "/works/after-ophelia/ophelia-reassembled/": "after-ophelia-ophelia-reassembled.html",
  "/works/by-proxy/": "by-proxy.html",
  "/works/love-is-love/": "love-is-love.html",
  "/works/meet-eva-here/": "meet-eva-here.html",
  "/works/meet-eva-here/chatbot/": "meet-eva-here-chatbot.html",
  "/works/meet-eva-here/diary/": "meet-eva-here-diary.html",
  "/works/6529-meme-card/": "6529-meme-card.html",
  "/works/the-ties-that-bind/": "the-ties-that-bind.html",
  "/works/vogue-singapore/": "vogue-singapore.html",
  "/works/whirlwind-of-the-waking-dream/": "whirlwind-of-the-waking-dream.html",
};

function rewriteCleanRoute(request) {
  if (!request.url) return;
  const url = new URL(request.url, "http://local.preview");
  const target = cleanRoutes[url.pathname] || cleanRoutes[`${url.pathname}/`];
  if (!target) return;
  request.url = `/${target}${url.search}${url.hash}`;
}

const htmlEntries = Object.fromEntries(
  readdirSync(root)
    .filter((file) => file.endsWith(".html"))
    .filter((file) => !file.includes(".tmp."))
    .filter((file) => !file.includes(" v1"))
    .map((file) => [
      file.replace(/\.html$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "index",
      path.resolve(root, file),
    ]),
);

function copyStaticFiles() {
  const copyTargets = [
    "assets",
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
      server.middlewares.use((request, _response, next) => {
        rewriteCleanRoute(request);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
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
