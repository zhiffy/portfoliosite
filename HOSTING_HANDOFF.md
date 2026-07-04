# Hosting Handoff

Last updated: 2026-05-27

## Current Live Host

DNS lookup during QA showed:

```text
www.shavonnewong.art CNAME ext-sq.squarespace.com
```

The current public site is still served by Squarespace. The V3 redesign workspace itself does not include an existing Netlify, Vercel, nginx, Cloudflare Pages, Firebase, or package-based deploy configuration.

## What Is Ready In This Workspace

- `_redirects`
  Netlify-style clean route rewrites and 301 redirects.

- `_headers`
  Netlify-style cache and baseline security headers.

- `sitemap.xml`
  Clean URL sitemap for the new catalog.

- `robots.txt`
  Sitemap declaration.

Cache intent:

- HTML and clean `/works/*` routes should revalidate immediately.
- `/assets/data/*` and JSON should be short-cache because series manifests can change.
- Images, videos, CSS, JS, and favicon can be long-cache immutable because filenames or query versions change when assets change.

## Launch Decision

Before launch, confirm the production host.

If deploying to Netlify or a Netlify-compatible static host:

- Keep `_redirects` and `_headers` at the publish root.
- Publish this directory as the static site root.
- Run `node tools/run-works-preflight.mjs` before deploy.

If deploying to Vercel, nginx, Cloudflare Pages, or another host:

- For Vercel, use `vercel.json`.
- For nginx, Cloudflare Pages, or another host, translate `_redirects` into that host's redirect/rewrite format.
- Translate `_headers` into that host's header configuration unless using `vercel.json`.
- Do not assume `_redirects` or `_headers` will be honored outside Netlify-compatible hosts.
- Run the local preflight after translation, then test redirects on the deployed preview.

If keeping Squarespace as the serving host:

- `_redirects` and `_headers` will not apply as static files.
- Use `redirects-squarespace-url-mappings.txt` as the copy-paste URL Mappings source.
- Paste only the mapping lines into Squarespace's URL Mappings field; comments or extra prose will not save.
- The file expands the legacy `/nfts/v/...` sitemap URLs explicitly rather than relying on `_redirects` wildcard syntax.
- Test old URLs from the live sitemap before switching traffic.

## Required Preview Checks

Run:

```bash
node tools/run-works-preflight.mjs
node tools/validate-live-redirect-coverage.mjs
```

Then on the deployed preview, manually confirm:

- `/works/` loads without `.html`.
- Each `/works/[project-slug]/` clean URL loads.
- Old V3 `.html` URLs return HTTP 301.
- Old Squarespace `/projects/...` URLs return HTTP 301.
- Old Squarespace `/nfts/...` and `/nfts/v/...` URLs return HTTP 301.
- `https://shavonnewong.art/sitemap.xml` serves the new clean sitemap.
- `https://shavonnewong.art/robots.txt` points to the new sitemap.
