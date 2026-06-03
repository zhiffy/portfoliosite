import { existsSync, readdirSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";

const root = process.cwd();

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
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
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

export default defineConfig({
  appType: "mpa",
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: htmlEntries,
    },
  },
  plugins: [copyStaticFiles()],
});
