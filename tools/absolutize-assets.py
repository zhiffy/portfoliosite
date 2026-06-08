"""
One-off: convert relative asset references in HTML to root-absolute paths so
clean routes like /about/ resolve assets from the site root in every
environment (Netlify prod, vite build, vite dev, dev-server.py).

Rewrites:
  href="name.css"            -> href="/name.css"   (root-level stylesheets)
  ="assets/..."              -> ="/assets/..."      (src / poster / href / source)

Leaves untouched: anything already absolute (/...), protocol (http:, //),
fragments (#...), mailto:, data:, and srcset (already absolute).
"""
import glob
import re
import sys

# Relative root-level stylesheet: href="something.css"[?query] with no leading
# slash and not an external URL.
CSS_RE = re.compile(r'href="(?!https?:|//|/)([^"/][^"]*\.css)')

# Relative assets/ reference behind an attribute opening quote.
ASSETS_RE = re.compile(r'="assets/')

total_css = 0
total_assets = 0
changed = []

for path in sorted(glob.glob("*.html")):
    with open(path, encoding="utf-8") as f:
        original = f.read()

    text, n_css = CSS_RE.subn(r'href="/\1', original)
    text, n_assets = ASSETS_RE.subn('="/assets/', text)

    if text != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        total_css += n_css
        total_assets += n_assets
        changed.append((path, n_css, n_assets))

for path, n_css, n_assets in changed:
    print(f"{path}: css={n_css} assets={n_assets}")
print(f"\nFiles changed: {len(changed)}  css refs: {total_css}  asset refs: {total_assets}")
