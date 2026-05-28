# Works Catalog Launch QA

Last updated: 2026-05-27

## Scope

This report covers the V3 Works catalog refactor:

- `/works/`
- `/works/[project-slug]/`
- `/works/[project-slug]/[work-slug]/` for selected standalone work pages

The catalog uses clean routes served by `_redirects`, with root HTML files retained as static backing files.

## Primary Launch Command

Run this from the site root before deploying:

```bash
node tools/run-works-preflight.mjs
```

When network or browser access is unavailable:

```bash
node tools/run-works-preflight.mjs --static-only
```

Useful partial runs:

```bash
node tools/run-works-preflight.mjs --skip-external
node tools/run-works-preflight.mjs --skip-render
```

Before launch, while the Squarespace sitemap is still live, also run:

```bash
node tools/validate-live-redirect-coverage.mjs
```

## Latest Full Preflight Result

```text
PASS Works catalog model
PASS Full-site local links
PASS Live external links
PASS Rendered Works audit

Redirects checked: 52
/works/ throttled local LCP ~= 1796ms
/works/whirlwind-of-the-waking-dream/ throttled local LCP ~= 2456ms
```

## Validators

- `tools/validate-works-catalog.mjs`
  Checks Works routes, redirects, sitemap coverage, headers syntax, metadata, canonicals, JSON-LD, OG image dimensions, heading order, project section order, plate counts, plate body depth, status vocabulary, marketplace/explorer/chain lines, image alt text, button names, By Proxy JSON count, and removed overlay UI.

- `tools/validate-site-links.mjs`
  Checks all local HTML pages for broken local links, broken anchors, broken local assets, and stale Works `.html` references outside `_redirects`.

- `tools/validate-external-links.mjs`
  Checks live external URLs used by Works pages, By Proxy JSON, and the About page Person-schema `sameAs` links.

- `tools/audit-works-render.mjs`
  Starts a local static server, runs headless Edge, checks all Works routes on mobile and desktop, verifies redirects, catches layout/media/accessibility basics, writes screenshots, and measures local throttled LCP for `/works/` and Whirlwind.

- `tools/validate-live-redirect-coverage.mjs`
  Fetches the current live sitemap and verifies relevant legacy Works/NFT/project paths are covered by `_redirects`. This is a pre-launch legacy-site check, not a recurring post-launch audit.

## Generated QA Artifacts

Screenshots are written to:

```text
qa/works-screenshots/
```

Key files:

- `qa/works-screenshots/mobile-works.png`
- `qa/works-screenshots/desktop-works.png`
- `qa/works-screenshots/mobile-works-by-proxy.png`
- `qa/works-screenshots/desktop-works-by-proxy.png`
- `qa/works-screenshots/mobile-works-whirlwind-of-the-waking-dream.png`

## Deploy Files

- `_redirects`: clean route rewrites and old URL 301s
- `_headers`: cache and baseline security headers
- `vercel.json`: Vercel rewrites, redirects, and headers fallback
- `redirects-squarespace-url-mappings.txt`: copy-paste URL Mappings fallback if Squarespace remains the serving host
- `sitemap.xml`: clean URL discovery
- `robots.txt`: sitemap declaration
- `favicon.ico`: avoids browser favicon 404

Hosting-specific notes live in `HOSTING_HANDOFF.md`. The current public `www` host resolves to Squarespace, so confirm the final production host before assuming `_redirects` and `_headers` will be applied.

## Manual Checks Still Required On Deployed Preview

- Confirm the production host is Netlify or supports `_redirects` and `_headers` with compatible syntax.
- Test several old URLs on the live preview and confirm they return HTTP 301 to clean routes.
- Run Lighthouse against the deployed `/works/` and `/works/whirlwind-of-the-waking-dream/`.
- Run a manual VoiceOver pass through `/works/`, one project page, one video plate, and By Proxy's series grid.
- Submit or refresh `https://shavonnewong.art/sitemap.xml` in Search Console after launch.

## Go/No-Go Notes

The local catalog is launch-ready when `node tools/run-works-preflight.mjs` passes.

If Whirlwind LCP rises above 2.5s on a deployed preview, first check whether the deployed host is serving image caching and compression correctly. The current page uses a dedicated mobile still and no hero video autoplay.
