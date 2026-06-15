# Self-hosting Mulish

This folder holds the self-hosted Mulish font. Two files are needed, and they
are the only thing that has to be downloaded by hand (the environment used to
set this up cannot pull binary files into the repo).

## What to download

Get the Mulish variable woff2 files (the variable font covers every weight in
one file per style, so two files cover the whole site).

Easiest route, Google Webfonts Helper:
1. Open https://gwfh.mranftl.com and search Mulish.
2. Choose the variable option if shown, otherwise select weights 200, 300, 400, 500, 600 in both normal and italic.
3. Set the charset to latin.
4. Download the zip and open it.

From the download, you need the normal woff2 and the italic woff2. Rename them
to exactly these names and drop both into this folder:

- mulish-variable.woff2  (the normal / upright file)
- mulish-italic-variable.woff2  (the italic file)

Direct files also exist on the Fontsource CDN if you prefer:
- https://cdn.jsdelivr.net/fontsource/fonts/mulish:vf@latest/latin-wght-normal.woff2  -> save as mulish-variable.woff2
- https://cdn.jsdelivr.net/fontsource/fonts/mulish:vf@latest/latin-wght-italic.woff2  -> save as mulish-italic-variable.woff2

## After the two files are here

The @font-face rules are written in mulish.css in this folder. To switch the
site over (Phase 2), the steps are:

1. Move the two @font-face blocks from mulish.css into the top of scroll-narrative.css (or @import mulish.css from it).
2. Remove the three Google Fonts lines from every page head: the two preconnect lines and the fonts.googleapis.com stylesheet link.
3. Add one preload to each page head so first paint stays fast:
   <link rel="preload" as="font" type="font/woff2" href="/assets/fonts/mulish/mulish-variable.woff2" crossorigin>
4. Bump the scroll-narrative.css cache version on every page.

Tell Claude the two files are in place and it will do steps 1 to 4, or follow
them by hand.
