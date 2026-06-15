# Site Audit, shavonnewong.art

Date: 15 June 2026
Scope: all 29 canonical pages at the repo root (7 main pages, 11 work and project pages, 4 sub-pages, 7 studio update letters). The `dist/` build copy, `templates/`, and `.codex-tmp/` were excluded. Findings below are verified against the source HTML, the Vite build config, and headless renders at 1920px and 390px.

## Headline

The site is in strong shape. SEO and AEO foundations are better than most artist sites (full structured data, an llms.txt, a robots.txt that welcomes AI crawlers, near-complete alt text). No broken internal links or missing assets were found. The issues worth acting on are a small cluster of high-value fixes, most of them quick.

The single most valuable fix: four important pages (About, Conditional, Press, and Works) do not load the shared `site-header.js` and `site-i18n.js`. That one omission is the root cause of several separate symptoms below.

## Priority 1, fix these first (high impact, mostly quick)

### 1. Four key pages are missing the shared header and i18n scripts
About, Conditional, Press, and Works load no shared site JavaScript except the Cloudflare beacon. Every other interior page loads `site-header.js` then `site-i18n.js`. The Vite build only copies those files into `dist/`; it never injects them into a page, so a page that does not reference them ships without them. Confirmed in source and in the built output.

Consequences on those four pages:
- The language selector renders as a permanently empty box. The `<select>` is empty in the static HTML and only `site-i18n.js` fills it. With the script absent, it can never populate. This is the empty square visible in the top right of About, Conditional, Press, and Works on both desktop and mobile.
- No "Back to top" footer. That footer is injected by `site-header.js`. These pages therefore have no footer at all, while 22 other pages do.
- No Mouse on/off toggle, no active-nav highlight normalization, no header normalization.

Fix: add the same two script tags these pages are missing, matching the order used on Writing and Contact:
```html
<script src="/site-header.js?v=20260606-footer" defer></script>
<script src="/site-i18n.js?v=20260604-fix" defer></script>
```
Effort: four one-line-pair edits. This resolves findings 1, 5 (footer), and the empty-box symptom in one move.

Note: the homepage (`index.html`) deliberately omits `site-header.js` because it runs its own `scroll-narrative.js` header system and hardcodes its control bar. It does load `site-i18n.js`, so its language selector works. The homepage is a correct special case and is not part of this finding.

### 2. NULL-byte corruption in 7 HTML files
Seven pages contain runs of NULL bytes embedded in the source, almost certainly from a bad file-sync or save (the design notes already record sync-corruption incidents around 14 June). Counts:

| File | NULL bytes |
|---|---|
| update2026jun.html | 1350 (across 2 lines) |
| the-ties-that-bind.html | 1102 |
| update2024jun.html | 285 |
| 6529-meme-card.html | 93 |
| vogue-singapore.html | 93 |
| after-ophelia.html | 89 |
| the-bubble-we-call-home.html | 43 |

In `after-ophelia.html` the run sits right at an `</h...>` tag boundary, which points to a chunk of real markup having been overwritten with zeros. The pages still render because the corruption is localized, but this is genuine source damage. Recommend restoring each file region from git history rather than only stripping the zeros, so any overwritten content comes back. Verify with `git diff` before and after.

Effort: medium. Worth doing carefully because content may be missing, not just bytes.

### 3. sitemap.xml is missing two live pages
The sitemap lists 27 of 29 pages. Missing:
- `/press/` (a main navigation page)
- `/works/meet-eva-here/hello-eva/`

Both are real, linked, indexable pages. Add two `<url>` entries. Effort: quick.

### 4. llms.txt is truncated mid-file
The file cuts off inside the Press entry, at `- [Press](https://shavonnewo`. The Press link, the Contact entry, and anything after them are missing. This weakens the answer-engine reading list that the rest of the AEO setup is clearly built around. Re-save the complete file. Effort: quick.

## Priority 2, consistency and polish

### 5. The header's right side is inconsistent across pages, and carries labels the design system forbids
Every page renders a different `.sn-meta-right`:
- Homepage: language selector, a "Vertical" scroll-mode toggle, and "Mouse on"
- About: language selector only (the empty box)
- Conditional, Meet Eva Here, After Ophelia: language selector plus "Project page"
- Writing: language selector plus "Writing" and "Archive"
- Works: language selector plus "Works. Catalog"
- Press: language selector plus "Full page"
- June 2026 update: language selector plus "Studio update"
- Contact: language selector plus "Contact" on a dark header

These page-context labels are written into each page's static header. The design contract (CLAUDE.md rule C8) states the header is canonical and shared, and specifically prohibits "page-specific right-side labels such as 'Project page', 'Work page', title text, breadcrumbs, or empty square controls inside the site header." Both the labels and the empty box are exactly the things C8 says to keep out. Recommend removing the page-context spans from `.sn-meta-right` and letting the header hold only the language selector and Mouse toggle, with page context living in the hero or subnav instead.

### 6. Title-tag separator is inconsistent
Most titles use a pipe, for example `About | Shavonne Wong`. Three pages use a period instead:
- `By Proxy. Shavonne Wong`
- `Works. Shavonne Wong`
- `Love is Love. Shavonne Wong`

Unify on the pipe form for a consistent look in search results and browser tabs. Effort: quick.

### 7. Social-card meta coverage is uneven
- The seven update letters carry only 4 Open Graph tags and no `twitter:*` card tags. Most work pages also have no Twitter card tags. The main pages (Home, About, Works, Press, Writing, Contact) have 7 OG tags plus 4 Twitter tags.
- Result: when an update letter or a work page is shared on X, it falls back to a bare link rather than a rich card.

Recommend a shared OG and Twitter block on every page (same image, title, description pattern already used on the main pages). Effort: medium, mechanical.

### 8. Homepage nav uses a different hook than the contract
The homepage header uses `data-nav`; every other page uses `data-page-nav`. It works because the homepage runs its own system, but it is a deviation from the shared contract and is worth aligning or documenting as intentional.

### 9. A few images lack usable alt text
Alt coverage is otherwise excellent (well over 99 percent across roughly 380 images). The exceptions:
- `index.html`: three content images carry empty `alt=""` (the Vogue cover, "the-mirror-world", and a Taipei exhibition image). Empty alt marks an image decorative, but these are meaningful, so give them real descriptions.
- `works.html`: one `<img>` has empty `alt` and an empty `src` (a modal template image populated by JS). Harmless, but the empty `src` can trigger a stray request; consider removing it from static markup.

## Priority 3, nice to have

- Self-host the Mulish font. The pages pull it from `fonts.googleapis.com` and `fonts.gstatic.com`, which is render-blocking and adds a third-party dependency. Self-hosting two or three weights would speed first paint and remove the external call.
- Unify social link domains. Some pages link `twitter.com` (update2023jan, update2024jan) and others link `x.com` (About, Contact, Home, and others). Both resolve, but pick one.
- Cache-version drift on shared assets. `site-i18n.js` is `?v=20260604-fix` on 14 pages and `?v=20260604-writing` on Writing. `scroll-narrative.css` is `?v=20260614-link-fix` on most pages and two newer strings on the homepage. Not breaking, but rule C5 asks for matched version strings.
- Theatre "Full work page" links use `href="#"` and set the real destination via JavaScript (`data-theatre-full`). These are not broken, but a crawler or a no-JS visitor cannot follow them. Putting the real URL in `href` is a small progressive-enhancement and SEO win. Same idea for the Works modal action links.
- Verify the "Book me" call to action. No Calendly URL appears anywhere in the HTML or JS, and the canonical link the studio uses (`calendly.com/studio-shavonnewong/new-meeting`) is not present. Confirm the button actually reaches the booking page.
- `press.html` structured data has `CollectionPage` but no `BreadcrumbList`, while Works and Available works pair the two. Add the breadcrumb for parity.
- Periodic readability review. Several character-count (`ch`) measures live in `scroll-pages.css` and the update-letter CSS. The ones inspected are deliberate and reasonable (for example the 58ch FAQ measure), but rules 2a and 2b flag this pattern as a recurring source of narrow-column problems, so it is worth a grep-and-eyeball pass after any large CSS edit.

## What is already good (leave alone)

- No broken internal links and no missing local assets across all pages.
- Navigation is consistent. All 25 standard pages share an identical six-link nav with identical targets. The three immersive sub-pages (Ophelia Retold, Ophelia Reassembled, Hello Eva) use a deliberate two-link `sp-screen-nav`, which reads as intentional.
- Structured data is thorough and correctly typed: `Person` for About and Home, `VisualArtwork` and `CreativeWork` for works, `CreativeWorkSeries` for Conditional, `BlogPosting` for updates, `VideoObject` where there is video, plus breadcrumbs on work pages.
- Mobile holds up well. Every page has a viewport meta tag, content reflows to a single column at the 901px breakpoint, the six-link nav fits at 390px without breaking, and side gutters are preserved. The only mobile defect is the same empty language box from finding 1.
- The press archive links to `web.archive.org` snapshots in many places, which is a smart hedge against link rot.
- Every page has a meta description, a canonical link, a single H1, and `lang="en"`.

## The five quickest high-value moves

1. Add the two shared script tags to About, Conditional, Press, and Works. Fixes the dead language selector, the missing footer, and the Mouse toggle on all four at once.
2. Add `/press/` and `/works/meet-eva-here/hello-eva/` to `sitemap.xml`.
3. Re-save the full `llms.txt` (it is currently truncated).
4. Strip or restore the NULL-byte runs in the seven affected files (check git for lost content).
5. Change three page titles to the pipe separator.

## Method

Static analysis with BeautifulSoup over all 29 pages for head metadata, header and footer signatures, nav targets, link and asset resolution, structured data types, and alt coverage. Link targets were resolved against `_redirects` and the Vite clean-route map to avoid false positives. Headless Chromium (Playwright) captured desktop (1920px) and mobile (390px) renders of 13 representative pages; header corners and mobile nav were cropped for close inspection. Media-heavy pages render with blank areas in headless capture because video does not autoplay and some lazy images do not load, so those blanks were not treated as layout defects.
