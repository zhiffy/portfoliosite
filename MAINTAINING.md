# Maintaining the Works Catalog

Launch QA status and deploy-preview checks live in `WORKS_LAUNCH_QA.md`.
Hosting-specific launch notes live in `HOSTING_HANDOFF.md`.

## Newsletter And Contact

- Newsletter forms post to `/api/newsletter-subscribe`, which creates or updates the address in MailerLite's main subscriber list.
- Set `MAILERLITE_API_KEY` in the deploy host environment before testing live newsletter signups.
- The contact page form posts to `/api/contact` (a Netlify function at `netlify/functions/contact.js`), which relays to Google Sheets via the `CONTACT_SHEET_WEBHOOK_URL` environment variable. Do not reintroduce Formspree.

## Quarterly

- Walk every project page and individual work page.
- Refresh or remove any `data-end-date` on-view notices.
- Confirm every `.sp-plate-status` value uses the approved vocabulary.
- Verify marketplace links, Etherscan links, and chain labels.
- Check that By Proxy still renders from `/assets/data/by-proxy.json`.
- Walk `/assets/data/3d-single-works.json`: confirm every 3D single-work tile has the right status, representative still, marketplace link, and pair/trilogy grouping before changing the single-work grid on `/works/`.
- Walk `/assets/data/available.json`: confirm each listed work still belongs in the collector inventory, update fallback counts only when recently checked, and remove stale per-card price displays.
- Keep commissioned covers and NFT commissions, such as Vogue Singapore NFT Cover and 6529 Meme Card, in `/assets/data/available.json` and the `/works/` commissions footer rather than in the single-work grid.
- Treat `/assets/data/available.merged.json` as a generated/cache file for reconciled marketplace counts; it may be overwritten by a build-time fetch, while `/assets/data/available.json` remains the editorial source of truth.
- Review OpenSea and Manifold API endpoint assumptions for `/assets/js/available.js`; if endpoint behavior changes, update the runtime reconciliation before refreshing fallback counts.
- Review price bands (`under_2k`, `2k_10k`, `10k_plus`) against current studio pricing and collector-facing strategy.
- Run `node tools/validate-works-catalog.mjs` from the site root.
- Run `node tools/validate-site-links.mjs` from the site root.
- Run `node tools/validate-external-links.mjs` from the site root when network access is available.
- Run `node tools/audit-works-render.mjs` from the site root to refresh screenshots and run the local render audit.
- Or run `node tools/run-works-preflight.mjs` for the full sequence.
- Use `node tools/run-works-preflight.mjs --static-only` when network/browser access is unavailable.
- Before launch from the current Squarespace site, run `node tools/validate-live-redirect-coverage.mjs`.

## On Each Major Show

- Add the show to the relevant exhibition history.
- Add per-work attribution when a shown work differs from the whole project.
- Refresh press links and image captions.
- Regenerate the project OG image when the lead public image changes.

## On Each New Work

- Add a `.sp-plate`, `.sp-edition-summary`, or series JSON entry.
- Add 3D-era single-channel videos to `/assets/data/3d-single-works.json` so they render as direct marketplace links on `/works/`.
- Update the project page `hasPart` Schema.org JSON-LD.
- Update `/works/` search terms and `/assets/data/available.json` when the work should appear in the collector inventory.
- Add a dedicated work page only when the work warrants its own stable URL.
- Add the clean route to `sitemap.xml`.
- Add or confirm the old URL redirect in `_redirects`.
- If Vercel is in the launch path, add or confirm the route in `vercel.json`.
- If Squarespace remains in the launch path, add or confirm the old URL mapping in `redirects-squarespace-url-mappings.txt`.

## Annually

- Regenerate all 1200 x 630 OG images.
- Audit Schema.org against the current spec.
- Run heading-order and VoiceOver passes.
- Run Lighthouse on `/works/` and one heavyweight project page; compare against the local render audit LCP numbers.
- Review `robots.txt`, `sitemap.xml`, `_redirects`, and `_headers` before launch.
