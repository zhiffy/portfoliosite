# Site audit, 2026-06-16

Verified against source files in the repo root. Issues grouped by severity.

---

## Priority 1 — Fix these first

### 1. Ten pages missing `site-header.js` and/or `site-i18n.js` (rule C10)

Without these scripts: no Back-to-top footer, no Mouse toggle, no active-nav state, and the language selector is an empty box.

Pages missing **both** scripts:
- `conditional.html`
- `press.html`
- `works.html`
- `works-available.html`
- `echoes-of-identity.html`
- `after-ophelia-ophelia-retold.html`
- `after-ophelia-ophelia-reassembled.html`
- `meet-eva-here-chatbot.html`
- `meet-eva-here-diary.html`
- `meet-eva-here-hello-eva.html`

Page missing **site-i18n.js only**:
- `update2023june.html`

Fix: add to each page's `<head>`, in this order, matching version strings on other pages:
```html
<script src="/site-header.js?v=20260606-footer" defer></script>
<script src="/site-i18n.js?v=20260604-fix" defer></script>
```

### 2. `llms.txt` is still truncated (rule S4 / rule 27)

File cuts off mid-entry at `- [Press](https://shavonnewo` — exactly the same truncation flagged in the June 15 audit. It was not restored. Restore the full file from git history.

### 3. Three pages missing from `sitemap.xml` (rule S3 / rule 25)

These live pages have no `<url>` entry:
- `/press/`
- `/update2023jan/`
- `/update2023june/`

---

## Priority 2 — Consistency issues

### 4. All six archive letters have `<title>` / `og:title` mismatches (rule U13)

The `<title>` uses the evocative name; `og:title` still says the old generic form. They must match.

| File | `<title>` | `og:title` |
|---|---|---|
| update2023jan.html | A year of firsts, studio notes January 2023 | January 2023 Update |
| update2023june.html | My first solo, studio notes June 2023 | June 2023 Update |
| update2024jan.html | Closing out the year, studio notes January 2024 | January 2024 Update |
| update2024jun.html | June 2024 Update | June 2024 Update |
| update2025jan.html | Eva goes public, studio notes January 2025 | January 2025 Update |
| update2025jun.html | Public rooms, studio notes June 2025 | June 2025 Update |

Note: `update2024jun.html` also has no evocative name at all — both title and og:title say "June 2024 Update". Per rule U12 the approved title for that letter is **"A win, and a move"**.

Fix: update `og:title` on each letter to match its `<title>`. And for update2024jun, set both `<title>` and `og:title` to "A win, and a move, studio notes June 2024 | Shavonne Wong".

### 5. `update2026jun.html` title is in the wrong format (rule S1)

Current: `Shavonne Wong - June 2026 Update | Goodbye to Eva, Paris Photo & a New Direction`

Problems: starts with "Shavonne Wong -" (name goes after the pipe, not before); uses a dash before "June 2026 Update" which is not the pipe pattern. Should follow the same form as other letters.

Suggested fix: `Goodbye to Eva, into the mirror, studio notes June 2026 | Shavonne Wong`

### 6. Two update letters have page-context labels in the header (rule C8)

- `update2023jan.html` — `<span>January 2023</span>` inside `.sn-meta-right`
- `update2023june.html` — `<span>June 2023</span>` inside `.sn-meta-right`

These are exactly the page-specific right-side labels C8 prohibits. Remove the `<span>` elements; `site-header.js` will normalize the control bar at load.

---

## Priority 3 — CSS issues

### 7. `.sp-copy` body paragraphs capped at 64ch on work pages (rule 2a)

In `scroll-pages.css` (outside any `@media` block, applies globally):
```css
.sp-copy { max-width: 64ch; }
.sp-text-stack .sp-copy { max-width: 64ch; }
```

`sp-copy` is the body paragraph class on every work/project page. This is exactly the "prose paragraph max-width" pattern rules 2 and 2a prohibit. The `sp-text-stack` column is already bounded; adding a 64ch cap on the paragraphs inside it creates a narrow column within the column, leaving dead space to the right on wide viewports. Set both to `max-width: none`.

### 8. `.nl-fig img` base rule still has `object-fit: cover` (rule C1 / U11)

In `update2025jun-redesign.css`:
```css
.nl-fig img {
  object-fit: cover;
}
```

This is the base rule that applies to all figure images in letter pages. `update-archive.css` overrides it with `object-fit: contain !important` for archive pages (`.nl-archive-rich`) across most contexts — so archive letters are largely protected. However:

- `.nl-press-feature-img .nl-fig img` resets `width` and `height` but does **not** reset `object-fit`, so feature images in the press section still inherit `cover`. Whether this visibly crops depends on the rendered height of the container, but it is fragile.
- Any future non-archive letter using `update2025jun-redesign.css` will crop all its figures by default.

The safer fix: change the base rule to `object-fit: contain` and only apply `cover` on the explicit cover selector (`.nl-cover img`).

### 9. `.sp-related-card img` and `.sp-writing-thumb img` force aspect-ratio crops (rule C1)

In `scroll-pages.css`:
```css
.sp-related-card img { aspect-ratio: 3 / 2; object-fit: cover; }
.sp-writing-thumb img { aspect-ratio: 16 / 10; object-fit: cover; }
```

These are UI card thumbnails (the Related Projects module and Writing page cards), not content images. Cropping here is common UI practice, but it contradicts C1 which says never force an aspect ratio. If the images used have predictable compositions these could stay; if not, consider `object-fit: contain` with a background fill, or supplying purpose-cropped thumbs so the layout crop matches intent.

---

## What is already correct (do not change)

- Footer seam: `main > .sp-section:last-of-type { border-bottom: 0; }` is in `scroll-pages.css` — the double-line problem is already fixed.
- Letter-spacing values across all audited stylesheets are within the 0.04em cap.
- All 30 pages have `twitter:card` and `og:image` meta.
- Social card coverage is complete.
- `about.html` title uses pipe correctly: "About | Shavonne Wong".
- `update-archive.css` correctly overrides the cover rule for event-media and two-up images on archive pages with `object-fit: contain !important`.
- `update-archive.css` correctly applies the 2:1 cover crop only to `.nl-cover img`.
