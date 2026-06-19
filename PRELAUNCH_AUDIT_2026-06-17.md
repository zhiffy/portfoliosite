# Pre-Launch Audit & Roundtable for shavonnewong.art (v5)

**Date:** 2026-06-17
**Scope:** All 30 public pages, three dimensions (SEO & technical health, content/facts/links/voice, design & layout) plus a launch-readiness roundtable.
**Method:** Deterministic checks (meta, sitemap, llms.txt, forms, preflight, corruption, broken-image scan), two deep code-level audits, and headless visual rendering at 1920px and 390px. Findings below were cross-verified; a few subagent claims were corrected on verification and are noted.

---

## Fixes applied (2026-06-17)

All four must-fix items and the should-fix queue were applied to the site this session, with the three decisions you gave: the Hamlet figure standardises to "fewer than 60 times", Meet Eva Here now reads as six sites including the Canal St Show (body copy and schema), and the RenaiXance capital X is kept.

**Applied:** B-1 em dash, B-2 ten concept-render alt labels, the Works modal "View project page" button (nine works wired, the pre-built primary-button CSS is now used), the About exhibitions curated default (opens at 17 selected entries, trim further whenever you like), the B-3 colon pass across the long-form pages and update letters, B-4 alt/aria/JSON-LD em dashes, B-5 hyphen connectors, B-6 meta-description colons, B-7, B-8, B-9, B-11 header label, and C-4 dotted/dashed hairlines to solid with cache bumps. A missed em dash on the Hello Eva sub-page, a stray "quietly", and a corrupted separator on the available page were also fixed.

**Follow-up decisions, now applied:** B-10 the About Conditional description is trimmed to the format-level line with the comply-to-reappear clause removed. C-3 the rich archive layer (nl-archive-rich, update-archive.css, gallery-scroll.js) is now on all seven update letters. C-5 the three immersive sub-pages (Hello Eva, Ophelia Retold, Ophelia Reassembled) now carry the canonical site header. All three were rendered and checked at 1920px. Only the B-12 arrow nicety stays skipped, because it would force a site-wide i18n cache bump for a cosmetic change.

**Factual record:** F1 in the site CLAUDE.md still says "five venues". The site now says six, so update F1 to match when you have a moment, or tell me to.

**Mid-session file corruption, repaired:** partway through, 16 files were corrupted (null-byte padding or a truncated closing tag). All were files written through the Edit tool during concurrent edits. The cause is unconfirmed; it correlated with the editor write path under concurrency in this environment, not with any one application (the folder is not in Dropbox). Each file was repaired in place from its on-disk content, preserving the v5 work and the edits rather than reverting to git, which would have lost the v5 changes. The preflight passes for all 30 files and no corruption remains.

**Verification:** preflight 30/30 pass, zero em or en dashes anywhere, all inline JS syntax-checked, JSON-LD valid, no remaining corruption, and the Vite build bundles cleanly (the deploy build runs on Netlify).

---

## Launch decision at a glance

**Verdict: GO, conditional on a short must-fix list.** The site is fundamentally launch-ready. The technical and SEO foundation is strong, the structure is clean, the design rules are well honoured, and the positioning is right for the curator/collector/press audience. Nothing requires redesign or a delay of days. There are four items that should be fixed before flipping the DNS, all quick, plus a fast-follow list for the week after.

**Overall launch-readiness rating (panel consensus): 7.8 / 10 as it stands today, ~9 / 10 once the four must-fix items are cleared.**

### Fix before launch (the critical few)

1. **Em dash in body copy**. `meet-eva-here-hello-eva.html:92`. The work description joins two clauses with an em dash. Replace it with a full stop or comma. Violates the absolute no-em-dash rule in prominent prose.
2. **Concept renders labelled "installation view"**. 10 instances across 9 pages. The pre-venue render `compliance-reality.webp` carries `alt="Conditional installation view..."`. Conditional has no installed venue (F2); this misrepresents the work to the exact people who matter. Change to "concept render" everywhere (`update2026jun.html` already does this correctly, use it as the model).
3. **Works modal cannot reach project pages**. `works.html`. The single-work dialog only has a "View marketplace" link. Nine works have a populated `project_url` and the primary-button CSS already exists unused. Add the "View project page" button (rule W1).
4. **About exhibitions opens as a 50-row wall**. `about.html`. The "Selected only" curation is opt-in (the ledger only collapses on click). Default it ON so the page opens with ~10-12 highlights (rule A4). One-line change: add `is-selected-only` to the ledger and set the toggle to `aria-pressed="true"` / label "Show all".

### Before you deploy (process)

- **Run `npm run build` and smoke-test `dist/`.** Netlify publishes the Vite `dist/` build, not the raw root HTML this audit read. The content and CSS carry through the build unchanged, so the findings hold, but a build failure would itself be a launch blocker. Confirm the build is green and spot-check a built page.
- **Missing validators.** `CLAUDE.md` (process rule 23) references `validate-works-catalog.mjs`, `validate-site-links.mjs`, and `validate-external-links.mjs`. Only `tools/run-works-preflight.mjs` exists (it passes, 30 files). Either restore the validators or update the rule so the preflight is the single source of truth.

---

## What passed (so the green is visible)

The following were checked and are clean. This is most of the site.

- **Meta and social cards.** All 30 pages carry a `<title>` with the pipe separator, plus complete `og:` and `twitter:` card tags (`twitter:card/title/description/image`). The homepage title is correct (`Shavonne Wong | New media artist...`).
- **Canonical domain.** 30 of 30 canonicals use `https://www.shavonnewong.art/`, consistent with the sitemap and robots. No www / non-www split.
- **Sitemap.** All live pages are covered (under clean URLs such as `/works/conditional/`). 30 `<loc>` entries.
- **llms.txt and robots.txt.** `llms.txt` is complete (not truncated) and robots welcomes the AI answer-engine crawlers and points to both the sitemap and `llms.txt`. Strong AEO posture.
- **Forms.** Contact posts to `/api/contact`, newsletter to `/api/newsletter-subscribe`; the Netlify functions exist (`contact.js`, `newsletter-subscribe.js`, `by-proxy-listings.js`). No Formspree anywhere.
- **Works preflight** passes for all 30 HTML files.
- **No corruption.** Git deltas are small positive edits; spot-checked files close cleanly with `</html>`. No truncation or null bytes.
- **No broken or placeholder media.** A headless scan of the key pages returned zero 4xx media and zero broken `<img>` (naturalWidth 0). The old `render-3d.webp` / `print.webp` placeholders (CLAUDE.md rule 20) are no longer referenced anywhere; `assets/conditional/` now holds real images.
- **Shared header contract.** Every interior page loads `site-header.js` before `site-i18n.js`, with the canonical six-link nav and no page-specific right-side labels (one small exception, see D-6).
- **No-crop honoured.** Content images render at natural ratio (update letters force `object-fit:contain`); only the 2:1 letter cover band and uniform thumbnails use `cover`.
- **Full-width prose.** No dead-column prose found; the known repeat offender `.nl-ahead-body` cap is removed.
- **C9 long-title fix** confirmed visually on `whirlwind-of-the-waking-dream` and `after-ophelia` (the tagline spans the full width as one line).
- **Heroes** carry one display element each (verified visually on About, Works, Conditional, Whirlwind, the June 2026 letter).
- **Type and accent discipline.** Letter-spacing tops out at exactly 0.04em; Conditional schema is `CreativeWorkSeries` with `hasPart`; no unconfirmed venues (no LACMA / Serpentine / Lumen / NAC) in any public copy, meta, or schema.
- **Mobile.** Side gutter present and single-column stacking confirmed at 390px on the homepage, About, and Conditional.
- **Links.** Zero broken internal links. A sample of ~20 external links resolves; LinkedIn, Ocula, and Proof-of-Concept return bot-block codes (999/403), which is not the same as dead, and warrant a manual click before launch.
- **Voice, the clean part.** No en dashes anywhere. None of the banned words appear in visible copy (`gap`, `quietly`, `something shifted`, `lives inside`, `cursed`, `landing on the same thing`). No all-lowercase public headings.

---

## Findings by dimension

Severity markers. **[Blocker]** = fix before launch · **[Should-fix]** = fix this week · **[Nice]** = polish.

### A. SEO & technical health

Strong overall. The only items are the build/validator process notes already listed above. No meta, sitemap, canonical, or form defects. This dimension is the site's clearest strength.

### B. Content, facts, links, voice

- **[Blocker] B-1. Em dash in prose**. `meet-eva-here-hello-eva.html:92`. (See must-fix 1.)
- **[Blocker] B-2. "installation view" on concept renders**. 10 instances: `conditional.html:182` and `:241`, plus the related-work card on `index.html:231`, `works.html` (Conditional card), `after-ophelia.html:276`, `meet-eva-here.html:339`, `meet-eva-here-chatbot.html:82`, `meet-eva-here-diary.html:78`, `the-bubble-we-call-home.html:181`, `the-ties-that-bind.html:215`. (See must-fix 2.)
- **[Should-fix] B-3. Colon used as a prose separator**. Pervasive in long-form body copy (roughly 25+ instances): `meet-eva-here.html` (~12), `after-ophelia.html` (several), plus `after-ophelia-ophelia-reassembled`, the meet-eva sub-pages, `the-ties-that-bind`, `whirlwind`, several update letters, and `works-available.html`. Example: "It documents a threshold moment: the period when...". The rule asks for a full-sentence rewrite. This is the highest-volume voice issue; worth one focused pass.
- **[Should-fix] B-4. Em dashes in alt / aria / JSON-LD**. Raw or `&mdash;` in `love-is-love.html:486`, `vogue-singapore.html:159`, `works.html:196`, `whirlwind:205/243`, `writing.html:36` (JSON-LD name), `meet-eva-here-hello-eva.html:72`, `after-ophelia-ophelia-retold.html:74`, `after-ophelia-ophelia-reassembled.html:80`. Replace with commas. (Confirmed by Python scan; a shell byte-grep missed these, so trust the file list.)
- **[Should-fix] B-5. Hyphen as a prose connector**. `about.html` ("its first NFT collection - 1,925 collectibles", "BLOOM - an artist collective", "NFT Asia - a community") and `index.html:340` ("Forbes 30 Under 30 Asia - Arts"). Rewrite with commas or as full sentences. The Venue-City hyphens in the exhibition ledger are the same pattern at lower stakes.
- **[Should-fix] B-6. "studio note:" colon in meta descriptions**. The six update letters and `writing.html` (description, og, twitter). Rewrite without the colon.
- **[Should-fix] B-7. Hamlet figure inconsistent**. `about.html:207` and `index.html:427` say Ophelia "spoke fewer than 400 words in Hamlet"; `after-ophelia.html:120` says "fewer than 60 times". Pick one metric and use it on all three. Confirm the number against a source before settling.
- **[Should-fix] B-8. Eva venue count inconsistent on one page**. `meet-eva-here.html` body says "five exhibition sites" (matches the binding record F1), but the page's own exhibition history (lines 310-311) lists a sixth (Canal St Show, New York, 2024) that the plate text and schema omit. Reconcile so the page is internally consistent. Flagged for your decision because it touches the binding factual record, not silently corrected.
- **[Should-fix] B-9. "RenaiXance" capitalisation**. `about.html:366` writes "The Renaixance Rising" (lowercase x) against 8 correct instances elsewhere. Fix the one outlier.
- **[Should-fix] B-10. Conditional mechanic foregrounded on About**. `about.html:140-143` and `:605` lead with the comply-to-reappear / colour-correct mechanic, which rules 11 and V2 treat as a Waiting Room variable, not the format-level description. There is a real tension here: this is almost verbatim your approved Catherine Tan email language. Recommend trimming to the format-level line and dropping the comply-to-reappear clause for consistency with the Conditional page, but flagging rather than deciding because your own approved sources conflict. The Conditional page itself is correct.
- **[Should-fix] B-11. Redundant "Contact" label in the site header**. `contact.html:59` puts a `Contact` span in `.sn-meta-right`, a page-specific right-side label that C8 prohibits. Remove it; the active nav state carries it.
- **[Nice] B-12.** Decorative `&mdash;` index glyphs on `press.html` and `update2024jun.html`; ASCII `->` vs `&rarr;` inconsistency on `index.html:331/458`; three `alt=""` decorative hover thumbnails on the homepage.

### C. Design & layout

- **[Should-fix] C-1. Works modal missing the project-page button (W1)**. `works.html`. (See must-fix 3.)
- **[Should-fix] C-2. About exhibitions default view (A4)**. `about.html`. (See must-fix 4. Verified: 50 total entries; the `is-selected-only` class is only applied on click, so the default is the full wall.)
- **[Should-fix] C-3. Update letters inconsistent**. Only 2 of 7 letters carry the rich `nl-archive-rich` + `update-archive.css` + `gallery-scroll.js` layer; the other 5, including the reference `update2026jun.html`, use plain `nl-letter`. The base stylesheet has absorbed the no-crop fix so nothing is visually broken and the non-rich letters contain no galleries, but the documented contract and the "2026jun is the reference" claim now disagree. Decide whether the rich layer is redundant (update the rulebook) or should be added to all 7 for parity.
- **[Should-fix] C-4. Dotted / dashed decorative hairlines (L2)**. `writing-redesign.css` (`.wk-card-num`, `.wr-meta-row`) and `works-redesign.css` (`.wk-meta-foot`, `.av-provenance`, `.wk-loop-more`) use dotted/dashed rules that render on `writing.html` and `works-available.html`. L2 permits solid hairlines only. Change to `solid`.
- **[Should-fix] C-5. Immersive sub-pages use a non-canonical header (C8/C10)**. `after-ophelia-ophelia-reassembled.html`, `after-ophelia-ophelia-retold.html`, `meet-eva-here-hello-eva.html` use `<header class="sp-screen-nav">`, so they have no language switcher, progress bar, or six-link nav. They are internally consistent as a deliberate immersive variant. Decide: document them as an exception class alongside `index.html`, or give them the canonical header.
- **[Nice] C-6.** Iris fill on the About exhibitions toggle active state; dashed + Iris hover on the Works filter tabs; a 0.5px `--hairline` line on `whirlwind:128` (token/weight mismatch); `about-redesign.css` is linked but effectively dead; the About background is Haze not literal white, which is the design system's own token (rules A2 and 13 are in tension, reconcile the rulebook rather than the page).

---

## Roundtable, launch readiness

Five seats, three rounds, ratings out of 10 for "ready to replace the live site today". The panel argued; it did not force consensus.

### Round 1, opening reads

**Maya, art director (design system), 8/10.**
The restraint is the achievement. Haze/Slate/Fog with a single Iris line, Mulish throughout, height-capped images at natural ratio: this reads as an artist who controls her own frame. Heroes are clean, one display element each. My eye snags in one place: the About exhibitions section is a 50-row spreadsheet on load. That is the least "premium" surface on the site and it sits on the page curators read most.

**Devin, front-end and build, 8.5/10.**
Technically tidy. Shared header contract holds across 29 interior pages, scripts load in the right order, cache versions are present, canonical domain is uniform, no broken media. Two reservations. The deploy serves the Vite `dist/` build, so this audit and the live artifact are one build step apart; I want a green build and a smoke-test before I sign. And the Works single-work modal has no path to the project page for nine works that have one, with the button CSS sitting there unused. That is a functional dead end, not a cosmetic note.

**Priya, SEO and AEO, 9/10.**
This is the strongest dimension. Pipe titles, full social cards on every page, complete sitemap under clean URLs, a real `llms.txt`, robots that welcomes answer engines, structured data on the work pages. The site is built to be quoted by an AI search engine, which is exactly where discovery is going. Minor drag from colons in meta descriptions, cosmetic. I would ship the SEO as-is.

**Laurent, art-world positioning (curator / collector / press), 7.5/10.**
The argument lands: this is a practice about image systems and being seen, and the site performs that rather than just asserting it. But I am the audience for the one real credibility problem. Pre-venue renders labelled "installation view" tell a curator the work is installed when it is not. Repeated ten times, that is a pattern a careful reader will catch, and it costs trust precisely with the people Conditional is pitched to. Fix that and the About wall and I am at a 9.

**Nadia, copy editor and voice, 7/10.**
Her voice is intact: warm, lightly self-deprecating, image-first. The discipline is real, no en dashes, none of the banned tics. But the colon-as-separator habit is everywhere in the long-form copy, there is a live em dash in a work description, and three small factual inconsistencies (the Hamlet figure, the Eva venue count, the RenaiXance capital). None are fatal; together they read as "not quite final proof".

### Round 2, cross-examination

**Laurent vs Devin, is the alt-text a launch blocker?** Devin: it is a ten-minute find-and-replace, do not gate the launch on it, just do it. Laurent: I agree it is cheap, but it is the one defect aimed straight at my audience, so it belongs on the must-fix list, not the someday list. Agreed: must-fix, but quick. (Laurent holds 7, Devin moves to 8 once the modal dead end is named a real defect.)

**Maya vs Nadia, what hurts the premium read most?** Maya: the About exhibitions wall, visually. Nadia: the colon pattern, in the reading. They converge: the wall is the one-line fix with the biggest visible payoff, so it goes on the must-fix list; the colon pass is a real edit but a fast-follow, since it is volume work and does not misrepresent anything. (Maya re-rates 7.5 after sitting with the wall; Nadia holds 7.)

**Priya pushes back on perfectionism.** Do not let a colon hunt in meta descriptions delay a launch this technically sound. The cost of staying on the old site another week is higher than the cost of these tics. The panel agrees: launch when the four must-fix items clear, run the voice pass in week one. (Priya holds 9.)

**Devin's closing condition.** I will not sign "go" in the abstract. My go is "go once the build is green and the four items are fixed", because the thing that actually ships is `dist/`, not the files we read.

### Round 3, convergence

The panel converges on **conditional go**. As it stands today the site is a 7.8 average. The disagreements were about ordering, not direction: everyone wants the same four things fixed first, and everyone agrees none of them is hard.

| Seat | Today | After must-fix |
|---|---|---|
| Maya, design | 7.5 | 9 |
| Devin, build | 8 | 9 |
| Priya, SEO/AEO | 9 | 9.5 |
| Laurent, positioning | 7 | 9 |
| Nadia, voice | 7 | 8.5 (9 after the colon pass) |
| **Average** | **7.8** | **~9** |

**Synthesis.** This is not a site that needs more work to be good; it is a good site that needs four small corrections to be honest and finished. The foundation (technical, SEO, design discipline, positioning) is genuinely strong, stronger than most artist sites the panel has seen. The risk is not structural, it is the handful of details that, left in, would undercut the credibility the rest of the site earns: a render that claims to be an installation, a key page that opens as a spreadsheet, a modal that strands the viewer, and one stray em dash. Clear those, confirm the build, and replace the live site with confidence. Run the voice-and-facts pass in the first week after.

---

## Prioritised punch-list

**Before launch (a few hours of work)**

- [ ] Em dash → comma/period, `meet-eva-here-hello-eva.html:92`
- [ ] "installation view" → "concept render" on the Conditional render, all 10 instances (model: `update2026jun.html`)
- [ ] Add the "View project page" primary button to the Works single-work modal (9 works with `project_url`)
- [ ] Default the About exhibitions ledger to `is-selected-only` (curated view on load)
- [ ] Run `npm run build`, confirm green, smoke-test a built page from `dist/`

**Week one (fast-follow)**

- [ ] Colon-as-separator pass across the long-form work pages and update letters (B-3)
- [ ] Em dashes in alt/aria/JSON-LD → commas (B-4)
- [ ] Hyphen-as-connector fixes on About and the homepage (B-5)
- [ ] Remove colons from update-letter and writing meta descriptions (B-6)
- [ ] Reconcile the Hamlet figure, the Eva venue count, and "RenaiXance" (B-7, B-8, B-9)
- [ ] Decide on the About Conditional mechanic wording (B-10) and remove the header "Contact" label (B-11)
- [ ] Dotted/dashed hairlines → solid on writing and works-available (C-4)
- [ ] Manually click the LinkedIn, Ocula, and Proof-of-Concept external links

**When convenient (polish / rulebook)**

- [ ] Decide the update-letter rich-class question and update CLAUDE.md (C-3)
- [ ] Document the immersive sub-page header exception, or canonicalise it (C-5)
- [ ] Restore or retire the three missing validators referenced in CLAUDE.md
- [ ] Nice-to-have items C-6 and B-12; reconcile the A2 "white" vs Haze token wording

---

*Audit run 2026-06-17. Pages read at source; the deployed artifact is the Vite `dist/` build, which transforms asset paths but not the copy, structure, or CSS this report assessed. Factual claims about external links reflect only what was actually fetched.*
