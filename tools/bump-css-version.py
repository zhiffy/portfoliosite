"""One-off: bump cache-busting ?v= tokens for the CSS files edited in the
eras-typography pass so browsers fetch the new styles."""
import glob
import re

NEW = "20260608-eras"
FILES = ["scroll-narrative.css", "home-vertical-v2.css"]

patterns = [(re.compile(re.escape(f) + r"\?v=[^\"']*"), f + "?v=" + NEW) for f in FILES]

changed = 0
for path in sorted(glob.glob("*.html")):
    text = open(path, encoding="utf-8").read()
    original = text
    for rx, repl in patterns:
        text = rx.sub(repl, text)
    if text != original:
        open(path, "w", encoding="utf-8").write(text)
        changed += 1
        print("bumped", path)
print("files changed:", changed)
