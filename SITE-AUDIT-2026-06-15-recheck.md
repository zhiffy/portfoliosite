# Site audit (recheck), Shavonne Wong website V4

Date: 15 June 2026
Scope: all 29 source pages at the folder root, plus the shared CSS and JS, sitemap.xml, llms.txt, and robots.txt. The `dist/` build copy, `templates/`, and `.codex-tmp/` were excluded.

This supersedes the earlier `SITE-AUDIT-2026-06-15.md` from the evening before. That one was written before this morning's edits, and several of its alarms came from a corrupted local copy of the files rather than the real ones (see the method note). Findings here are verified against the canonical files through the editor.

## Method and an important environment note

Two things shaped how this audit was done, and they matter for reading it.

First, the Linux shell sandbox is serving partial and placeholder copies of many files (truncated, padded with null bytes). Scans run there reported corruption that is not in the real files. Every finding below was re-checked against the canonical file through the editor. The practical upshot is that several scary items from the earlier audit are environment artifacts, not real: the "truncated sitemap.xml", the "truncated llms.txt", and the "null bytes in 13 HTML files" are all clean in the actual files.

Second, I could not take fresh local screenshots. The shell cannot run the preview server because its copy of that file is corrupted, and the live site at shavonnewong.art is still the previous design, so it does not stand in for this folder. The layout and mobile notes below come from reading the CSS and the design rules, not from new renders. If you put V4 on a preview URL, I can do a proper visual pass.

## What is already strong

No broken internal links and no missing local assets were found anywhere across the 29 pages.

Navigation is consistent. The 25 standard pages share an identical six-link nav (Home, About, Works, Writing, Press, Contact) with identical targets. The homepage carries the same six, with its Contact pointing to an on-page section rather than the contact page, which is fine for a single-screen home. The three immersive sub-pages (Ophelia Retold, Ophelia Reassembled, Hello Eva) use a deliberate two-link nav.

Headers and footers are consistent by design. `site-header.js` rebuilds the right-hand control bar (Language plus the Mouse toggle) and injects the "Back to top" footer on every interior page at load, overwriting whatever static markup a page shipped with. So the rendered header and footer are uniform wherever that script loads, which after this morning's edits is every interior page.

SEO and AEO foundations are strong. Every page has a title, a meta description, a canonical link, a single H1, a lang attribute, and a viewport tag. robots.txt explicitly welcomes the AI answer-engine crawlers. llms.txt is complete and well structured. sitemap.xml is valid XML and, after the fix below, lists every live page. Structured data is thorough and correctly typed (Person, VisualArtwork, CreativeWorkSeries, BlogPosting, VideoObject, and breadcrumbs on the work pages).

Mobile structure reads as sound from the CSS (a viewport tag on every page, single-column reflow at the 901px breakpoint, and the small side gutters), which matches the render-based check in the earlier audit.

## Fixes already applied (verified)

1. Restored two genuinely broken pages. `love-is-love.html` and `meet-eva-here.html` were truncated mid-script in the real files, confirmed in git history, which left their video "theatre" close handlers broken (escape key and close button would not work, and the page tail was cut off). I restored the exact original script endings from the clean build copy and the prior git commit. Both files now close correctly and the inline scripts parse again.

2. Unified the title separators to the pipe. `works.html`, `by-proxy.html`, and `love-is-love.html` used a full stop, for example "Works. Shavonne Wong". They now read "Works | Shavonne Wong", matching every other page and their own social-card titles. By Proxy and Love is Love also had the full stop in `og:title`, which was fixed too.

3. Added the one missing sitemap entry. `/works/meet-eva-here/hello-eva/` was the only live page absent from sitemap.xml. It is now listed.

4. Removed dead header markup on `works-available.html`. Its header hard-coded "Available / Inventory" labels where the language switcher belongs. `site-header.js` overwrites that area at load, so the labels only caused a brief flash and went against the shared-header rule. The page now matches the standard header.

5. Unified the core stylesheet cache versions. Sixteen pages were pointing `scroll-narrative.css` and `scroll-pages.css` at older `?v=` strings (`ripple-v7`, and `scroll2` or `theatre`), so returning visitors were served stale core CSS. All sixteen now point at the current `20260614-link-fix` and `20260615-bp2-related`, so everyone loads the same current stylesheets.

6. Added Twitter card tags to fifteen pages. Every work page and the immersive sub-pages now carry `twitter:card`, `twitter:title`, `twitter:description`, and `twitter:image`, reusing each page's Open Graph values, so they share as rich cards on X instead of bare links.

7. Swept the em and en dashes. Five update-letter titles lost their em dash (for example the June 2025 letter now reads "Public rooms, studio notes June 2025"), the en dashes in the archived letters (date ranges and the "human-AI" and "human-machine" compounds) are now hyphens, and the lone em dash in the works-available list is now a comma. I left the purely decorative dash glyphs (the press list markers and the award index marker), since those are interface elements rather than prose.

8. Trimmed two long meta descriptions and added a breadcrumb. The home and June 2026 meta descriptions ran long for search snippets and are now about 155 characters each, and press.html now carries a BreadcrumbList (Home, Press) to match the works pages.

## Issues worth acting on

The three bulk items first flagged here (cache-version drift, social cards, and the dash sweep) are now done and have moved up into "Fixes already applied". What remains below is smaller.

### D. Smaller items

Static header markup still varies page to page (some ship the language switcher, some an empty slot, works-available had old labels). `site-header.js` normalizes all of it at load, so this is cosmetic, a brief flash, and a source-tidiness matter rather than something a visitor is left with.

The June 2025 letter's `<title>` and `og:title` say different things ("Public rooms..." versus "June 2025 Update"). Minor, worth aligning.

### E. Nice to have (carried from the earlier audit, still valid)

Self-host the Mulish font rather than loading it from Google Fonts, for faster first paint and one fewer third-party call. Pick a single social domain, since some links use twitter.com and others x.com. by-proxy.html pulls the full Tailwind CDN at runtime, which is heavy for one page, so compiling the few classes it needs would be lighter. Confirm the contact or "Book me" call to action reaches your Calendly, since the canonical Calendly link does not appear in the markup.

## Two things to flag beyond the page list

1. This folder keeps getting hit by sync corruption. Two pages were truly truncated, the git index is broken (it reports "unknown index entry format"), and the shell copy of many files is partial. The commit history already shows repeated "repair sync-corrupted files" work, so this is a recurring workflow risk rather than a one-off. Options worth weighing: let Dropbox finish syncing before editing, commit more often so recovery is easy, or keep the git repo outside the synced folder. I can help set that up.

2. The redesign in this folder is not what is live. shavonnewong.art still serves the previous design, with a different nav and an emoji hero that reads "Shavonne Wong is new media artist specializing in 3D and AI", which is also missing an "a". If you believed V4 was already live, it is not yet.

## What is left to consider

The big consistency wins (cache versions, social cards, dashes) are done, and so are the small SEO items. The home and June 2026 meta descriptions are trimmed, and press.html now has a BreadcrumbList. What remains is genuinely optional. You could align the June 2025 letter's title and og:title if you want them to match, and there is the nice-to-have list (self-host fonts, settle on one social domain, lighten by-proxy's Tailwind load, confirm the Calendly link resolves). The sync-corruption workflow risk is the one item worth treating as more than cosmetic.
