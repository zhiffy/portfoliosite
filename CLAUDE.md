# Website Working Rules and Shavonne's Design Preferences

Read this before any design, layout, or copy work on this site. It records what Shavonne has approved and rejected in practice. The writing-style rules from the vault CLAUDE.md (no em dashes, no en dashes, no colons as prose separators, no "gap", sentence case for public copy, etc.) apply to ALL site copy, captions, and meta text.

## Core standing rules (apply to every page, read these first)

C1. **Never crop an image and never change an aspect ratio.** This is the single most-repeated instruction. Content images render at their natural ratio. To control size, cap by HEIGHT (the image scales down, keeping its ratio) — never by `object-fit: cover` or a forced `aspect-ratio`. The one deliberate exception is the update-letter header cover, which is a full-width horizontal band (see U3).
C2. **Use the full width; no narrow text columns.** Narrow prose hugging the left with a dead right half is the most-flagged problem. See Layout 1, 2a, 2b.
C3. **No edge-to-edge on mobile.** Content keeps a small side gutter (~16px) on phones; it should never touch the screen edges. See U8.
C4. **Don't dwarf text with media, and don't leave big vertical gaps.** When an image is much taller than the text beside it, cap its height; when an event has two images, sit them side by side, not stacked. See U4, U5.
C9. **`sp-project-line` must never wrap inside the hero copy column.** The `.sp-project-hero-copy` column is roughly half the page width. At its default `clamp(28px, 4vw, 58px)` font size, a sentence-length `sp-project-line` wraps to 3+ lines inside that column and creates large vertical gaps. On any work page with a long title, move `sp-project-line` OUT of `sp-project-hero-copy` and place it as a direct child of `sp-project-hero` AFTER the figure — then add a scoped inline style with `grid-column: 1 / -1; max-width: none; font-size: clamp(17px, 1.6vw, 22px)` so it spans both columns as a single horizontal line. This was flagged 2026-06-14 on the Whirlwind of the Waking Dream page.
C5. **Bump the `?v=` cache string** on every stylesheet (or shared JS) edit, on every page that links it. Shavonne also version-bumps these herself, so preserve her existing version strings on other files and only change the ones you touched.
C6. **Verify visually before delivering** (see Process 15), and **never invent facts** about people, venues, dates, or work — every specific claim must be true and sourced.
C7. **Roundtable significant design decisions.** Shavonne likes a structured roundtable (with per-expert ratings) before building a new interaction or pattern, and a second fresh-panel roundtable for the bigger ones. Include a numeric rating from each expert.
C8. **Headers are always canonical and shared.** Every standard page uses the same fixed site header contract: `<header class="sn-nav" data-page-nav>`, the shared wordmark, the six shared nav links, `.sn-meta-right`, `.sn-progress`, and `site-header.js` loaded before `site-i18n.js`. Do not add page-specific right-side labels such as "Project page", "Work page", title text, breadcrumbs, or empty square controls inside the site header. Put page context in the hero, subnav, breadcrumbs, or body instead. `site-header.js` owns the language selector, Mouse toggle, active nav state, and header normalization; if editing a page, confirm the file is not truncated and that the shared scripts still load so the header can normalize.

## Layout principles (learned from her direct feedback)

1. **Use the full width of the page.** Narrow text columns hugging the left with a dead right half are the single most-flagged problem. Before delivering any layout change, render at 1920px and check for large empty zones.
2. **Never lay paragraphs out side by side.** No multi-column prose, no paragraph "panels". Prose is always a single column. Watch for the shared-stylesheet trap: `.sp-image-card` carries `grid-column: span 4`, so an image card placed directly inside a grid text stack silently creates columns and paragraphs flow sideways. Always pin text stacks to one explicit column.
2a. **Never cap prose width with `max-width` on paragraph elements.** Do NOT write `max-width: 68ch`, `max-width: 60ch`, or any character-count or pixel constraint directly on body paragraph classes (`.nl-press-feature-body`, `.nl-ev-body`, `.nl-ahead-body`, etc.). The containing `nl-wrap` section already controls the reading measure. Adding a second cap on individual paragraphs makes text look like a narrow column inside an otherwise wide section — this is the same problem as rule 1 but happening at the paragraph level. If measure control is needed, apply it to the wrapping container only.

2b. **Check the `@media` override blocks, not just the base rules.** This problem keeps coming back because a cap gets removed from the base declaration but a stray one survives inside a desktop `@media (min-width: 901px)` block, where a quick read misses it. Before delivering, grep the whole stylesheet (every media block included) for `ch` and for `max-width`, and confirm no prose wrapper or paragraph is capped on desktop. Known repeat offender, fixed 2026-06-13: `.nl-ahead-body` (the "Hi all" / "Looking ahead" intro) carried `max-width: 58ch` inside the desktop media block. Because that `ch` value was computed against the wrapper's own ~16px font while the paragraphs render at ~28px, the cap collapsed to ~487px inside a ~974px grid column, leaving ~490px of dead space to the right. It is now `max-width: none` so the prose fills its `0.78fr` column. If you ever re-add a measure cap to a large-italic block, express it on the paragraph itself (not the wrapper) and only if it still fills the column.
3. **Two-column is fine when the columns are different kinds of content.** Approved patterns: text left / media right (work page sections), title-and-venue rail left / prose right (letter events), label left / text right (notes, coming-soon items, Looking Ahead). Rejected pattern: a small kicker label occupying a whole left column on work pages; there the kicker sits above the content instead.
4. **Media is moderate inside text flow.** In work-page sections, images and video cap around 600px when inline with text, or size to their own column in a text/media split. Media should not dwarf the prose, and should not be tiny either. Image rows inside letter events span the full content width.
5. **No orphan slots in galleries.** If a gallery has 2 images, it gets a 2-column grid, not a 3-column grid with an empty cell. After moving or removing any image, re-check its old container.
6. **Everything aligns to an axis.** A section should not have text on one axis, images on a second, and a closing line on a third. Closing notes in letter events use the label-left / text-right row so they return to the rail axis.

## Heroes and page tops

7. **One display element per hero.** The title is the only large type. The old pattern of a giant purple pull-quote competing with the title is rejected. The project line is a short deck (max ~32px) placed ABOVE the intro: kicker, title, deck, intro, actions. Long conceptual lines move into body sections at reading scale.
8. **Hero image centers vertically** against the copy stack. No voids under top-right images.
9. **Update letters open with exactly one cover image, never two, never a wordy void.** Fixed 2:1 crop, full content width, directly under the lead/byline row, small tracked uppercase caption (e.g. "The Kiss, Venice Biennale, 2022"). Two equal hero images read as indecisive. New letters inherit this via a `nl-cover` figure. (This 2:1 cover band is the one deliberate exception to the no-crop rule C1 — Shavonne explicitly wants the header horizontal and full width, not a centred square.)

## Conditional page specifics

10. Conditional is presented as an ongoing series, "a mirror that erases you", with a Conditions section (the variables as research questions, never as a product feature list) and named stagings: The Mirror (working title) FIRST, then The Waiting Room. Schema is CreativeWorkSeries with hasPart.
11. Never mention unconfirmed programs, venues, or pending submissions on the public site (no LACMA, Serpentine, Lumen, etc. until confirmed). Status lines stay factual: "in development", "first physical prototype in build".
12. Site-specific adaptability is implied through the Conditions framing and one FAQ line with the studio email. Never sound commercial about it.

## Design system

13. **The design-system authority** is `Shavonne Wong Design System.pdf` (repo root) plus the CSS custom-property tokens defined in `scroll-narrative.css`: `--bg` Haze (page), `--text` Slate (type), `--text-2` Fog (metadata), `--accent-deep` / `--sw-iris` Iris (the single threshold accent), `--hairline` and `--hairline-strong` (rules). Type is Mulish only, no serif. Palette is Haze page / Slate type / Fog metadata / one Iris accent. No warm colors anywhere. Spend the Iris accent at most once per page (a 0.5px threshold line), never on utility chrome like nav arrows, gallery controls, or buttons.

## Lines and dividers

(Original L1–L3 wording was lost to a file-sync corruption on 2026-06-14 and reconstructed below from the surviving fragment and L4–L6; treat as intent, not exact prior text.)

L1. **Group with space first.** Whitespace does the separating; reach for a drawn line only where space alone fails to group content.
L2. **Two treatments only.** 1px solid from the tokens (`--hairline` for row separators, `--hairline-strong` for a group's single opening rule). 0.5px is reserved solely for the Iris threshold line, at most once per page, never stacked against a hairline. No dotted, no dashed, no raw rgba, no `var(--text)` borders for decorative rules.
L3. **Resets ship with the pattern.** Any repeating row or list includes its `:first-child` / `:last-child` border suppression in the same change. A list without its reset is unfinished.
L4. **Check the seam before shipping.** Whenever you touch a section edge, footer, or list boundary, confirm the rendered seam shows exactly one line, or none if it is banded.

## Process rules

15. **Verify visually before delivering.** Render changed pages headless at 1920px (and the affected section), look at the screenshot, then hand over. Full-page screenshots distort fixed headers; use viewport shots to judge nav overlap. Lazy images need scroll-priming before judging "missing" media. Also screenshot a mobile width (~390px) for anything that changes layout.
16. **Bump the `?v=` cache string** on every stylesheet edit, on every page that links it. Only change the version on the file you actually edited; leave Shavonne's version strings on other stylesheets alone.
17. **Shavonne edits files in parallel** (and a Codex branch workflow exists, see CLAUDE_DESIGN.md). Re-read a file region before editing if any time has passed; her saves can land mid-task (one stylesheet was caught half-written once). Never revert her changes. Note: large files can sync in a partial/truncated state — if something looks cut off or out of order, re-read before editing and do not append blindly (an append once landed mid-file and corrupted this very document).
18. Scope experimental CSS to a page class first (e.g. `.sp-conditional-page`), promote to the shared stylesheet only once she approves the pattern, then roll out to sibling pages. The pilot-one-then-roll-out approach is her preference for multi-page changes.
19. Mobile always keeps the stacked single-column behavior (breakpoint 901px) when adding desktop layouts.
20. `render-3d.webp` and `print.webp` in assets/conditional are placeholder graphics awaiting real images.
21. When Shavonne sends media to add to the site, always rename it descriptively, optimize it for web delivery, and keep the optimized files in the relevant `/assets/` project folder. Prefer WebP with a JPG or PNG fallback when the page needs one, and avoid leaving pasted or clipboard filenames in public markup.

## Update-letter (archive) pages — `update20XXxxx.html`

These are Shavonne's studio letters. They share `update2025jun-redesign.css` (the rich `nl-` system) plus `update-archive.css` (archive overrides, scoped to `.nl-archive-rich`). All of them should be **consistent with each other and with the reference page `update2026jun`** — that page defines the look; each letter keeps its own content but matches the treatment.

U1. **Rich layout, not the old source-flow.** Every letter uses the reference's components: a single hero with `nl-cover`, an `nl-ahead` intro band, `nl-section` blocks of `nl-event` items (image beside text), press lists, an `nl-ahead` "Looking ahead" band, and the two-link `nl-foot`. The `.nl-archive-rich` class on `<main>` activates the no-crop overrides.
U2. **Strip template residue.** Drop the imported junk headers ("Artist Update", "JAN 20XX", a bare "20XX", duplicated leads) and the old "Studio update archive" pill nav. Navigation between letters lives entirely in `site-header.js` (do not duplicate it in the letter HTML/CSS): a fixed side pager on the screen edges (left = newer, right = older, expands on hover, arrow-key support) plus a quiet top switcher in the masthead ("All updates" link to /writing/ on the left; "Newer · current month/year · Older" on the right, small tracked-uppercase Fog, no border). If letter navigation needs changing, edit `site-header.js`, and bump its `?v=` site-wide. The clean-URL matching bug (`pathname.split('/').pop()` is empty for trailing-slash URLs) is fixed there — don't reintroduce it.
U3. **Header cover = full-width horizontal 2:1 band.** Shavonne wants the opener horizontal and spanning the page, not a centred square. This is the only allowed crop on these pages (`.nl-archive-rich .nl-cover img` is `object-fit:cover; aspect-ratio:2/1`).
U4. **Content images: natural ratio, never cropped, height-capped.** Event-media images cap at ~430px tall (`max-height`), support/two-up images ~460px, the scroll gallery ~330px — all `width:auto`, so nothing is ever cropped; tall portraits simply scale down so they don't dwarf short text or leave a huge vertical gap.
U5. **Two images in an event sit SIDE BY SIDE, not stacked.** When an event has exactly two photos, put both in the media area as an in-grid two-up (`nl-ev-media nl-twoup`) beside the text — never one image beside the text with the second stacked below (that wastes vertical space and leaves a gap). On phones the pair stacks to one column.
U6. **More than 3 photos → a horizontal scroll gallery** (see "Update-page galleries" below). Keep a lead image with the text when one is doing narrative work; the rest go in the gallery.
U7. **Press lists work like 2026jun.** A press/feature list uses `nl-press-item` rows (publication + headline left, date right) and reveals a contextual image on hover via `data-press-img` + `press-hover.js`. Compact "what's ahead" rows that lead with an arrow (`nl-press-num`) must use the three-column grid (arrow / text / date) — do not drop a third child into the default two-column `nl-press-item`, it shoves the text right with a big gap.
U8. **Mobile gutter.** Hero, sections, footer, and band text get a ~16px side padding on phones (they zero horizontal padding on desktop because the page is centred within its max-width; restore the gutter under the 760px breakpoint).
U9. **Remove unrelated trailing teaser images.** The imported letters ended with a stray decorative image (often a "The Ties That Bind" shot) that has nothing to do with that letter — drop these. Only keep a closing image if it is genuinely part of that letter's story.
U10. **Preserve all of a letter's real content and media** otherwise; only de-template and re-lay-out. Keep image counts intact when restructuring.

### Scroll galleries (rule added 2026-06-14, two roundtables; reworked 2026-06-14 to scroll-driven across update letters and project pages)

These now run the same way on the update (studio-letter) pages (`.nl-gallery` / `.nl-gallery-track`) and on the work/project pages (`.sp-gallery` / `.sp-gallery-track`). Shared behavior lives in `gallery-scroll.js`; the work-page styling lives in `work-gallery.css`, the letter styling in `update-archive.css`.

G1. **More than 3 photos becomes a scroll gallery.** Any documentation section or event with more than 3 photos renders them as a horizontal filmstrip, never a tall stacked grid. If a lead image is doing narrative work beside the text, keep that lead with the text and put the remaining photos (2 or more) in the gallery; otherwise the whole photo group becomes the gallery. Three or fewer photos stay as a single image, a side-by-side pair, or a small two-up, never a scroller.

G2. **How a gallery looks.** CSS-first, works with no JS. Every frame is a uniform HEIGHT with natural width, so nothing is ever cropped and no aspect ratio changes (this is how the no-crop rule is honoured in a filmstrip). Restrained chrome: a peek of the next frame and a thin Fog scrollbar, which stays visible so the viewer can scrub the strip by hand. No photo-count label (removed 2026-06-14), no dots, no card shadows, no Iris accent. The track is a focusable region (role="group", aria-label, tabindex=0) that scrolls with arrow keys; swipe on mobile; real alt text on every image.

G3. **Scroll-driven advance (`gallery-scroll.js`).** On desktop (fine pointer), the strip advances horizontally as the page is scrolled vertically. The travel is mapped to the section crossing the central viewing band: image 1 holds until the strip is fully on screen (its centre reaches ~68% of the viewport), it flips through while the section is mid-screen, and it lands on the last image as the section starts to leave the top (~34%). No pinning or scroll-jacking; the page scrolls normally. The earlier chevron buttons and mouse drag-to-scroll were removed 2026-06-14 in favour of this; the visible scrollbar is the manual affordance. Touch keeps native swipe; `prefers-reduced-motion` and coarse pointers fall back to plain manual scroll.

G4. **Scope.** Galleries are for documentation and installation photos only, never for artworks, heroes, press features, or the works themselves. On a project page that means doc-style sections (process studies, exhibition and event photos) become galleries, while the works display (the `sp-plate` cards) and the 3-up "Related projects" module never do. At most one gallery per section.

### Work / project page treatment (rolled out 2026-06-14 from After Ophelia)

Project pages that use the section system (`.sp-section.sp-project-grid` with a `.sp-text-stack`) load `work-gallery.css` plus `gallery-scroll.js`. The file applies these generically, so linking it is most of the rollout:

T1. **Separate with whitespace, not hairlines.** The per-section divider (`.sp-section.sp-project-grid` bottom border) and the rule above each media card (`.sp-image-card` top border) are removed; the vertical rhythm carries the separation. If removing a line ever merges two sections so they read as one, restore a single opening hairline rather than zeroing dogmatically (see L1, L2).

T2. **Tight title spacing.** On subnav pages the kicker rail collapses to one column, which turned the grid `gap` into a large row-gap and left a void under each heading. `row-gap` is pinned small (~8px) so each title sits close to its content.

T3. **Prose fills its column, media never overflows.** The text stack is itself a grid; its single column is bounded to `minmax(0,1fr)` so wide media (galleries, 2-ups) fill the real column width and scroll or split instead of stretching the stack and clipping. Body prose fills the column rather than hugging a narrow measure (see Layout 1, 2a).

T4. **Bespoke pages are exempt.** Pages with custom layouts that do not use the section system (by-proxy's image wall, love-is-love) are not swept into this treatment; by-proxy in particular is a concept piece and must not be filmstripped.

## Works page (`works.html`)

W1. **Single-work modal exits.** In the `[data-single-modal]` dialog, show a primary filled "View project page" button when that work's data (`3d-single-works.json`) has a `project_url`; the marketplace link is the secondary outlined button. When a work has only one of the two, it sits alone — never leave an empty button slot.
W2. **Flip between works inside the modal.** Prev/next navigation walks the works **as currently shown** (the visible, sorted cards in the active tab — captured when the modal opens, not the raw JSON order). Thin Slate chevrons centred on the media, hidden at the first/last work; a "N / M" counter bottom-centre matching the image lightbox; arrow-key support; swipe on mobile; a screen-reader live announcement of "Work X of N: Title". Stop at the ends (no wrap). Flipping must not push browser history (Back closes the modal).

## Site-wide interaction (cursor ripple)

R1. The cursor ripple (`fluid-renderer.js`) is **viewport-anchored** (re-positioned into the page each frame), runs over page content including the big titles, at ~70% of homepage strength on inner pages. The single "Mouse on/off" header toggle controls it everywhere, and it respects `prefers-reduced-motion`. The **nav bar must NOT ripple** — Shavonne asked for it to stay still. If the effect ever dilutes or smears, the cause is the displacement map being stretched over full page height instead of the viewport; anchor it to the viewport.

## Copy and voice (all site copy)

V1. Site copy follows the vault writing-style rules (no em/en dashes, no colon-as-separator, sentence case for public copy, plus the banned-words list). One phrase flagged recently and added to that list: **"I keep landing on the same thing" / "landing on the same thing"** — not her voice, do not use. Lead with image and feeling; keep her warm, lightly self-deprecating, fragment-friendly register; never invent facts, venues, or dates. When describing a work, prefer the approved language from the vault note or the page over fresh phrasing. Shavonne sometimes asks to "roundtable" a piece of copy too — run the roundtable when she does.
