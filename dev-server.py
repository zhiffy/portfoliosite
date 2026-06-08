"""
Local dev server that honours Netlify-style _redirects (200 rewrites only).
Reads _redirects at startup; restart to pick up changes.
Usage: python dev-server.py [port]
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
REDIRECTS_FILE = "_redirects"

# Parse 200 rewrite rules: "/clean/path/ /flat-file.html 200"
rewrites = {}
try:
    with open(REDIRECTS_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) >= 3 and parts[2] == "200":
                rewrites[parts[0].rstrip("/")] = parts[1]
except FileNotFoundError:
    pass


class RedirectHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Strip query string / fragment
        path = path.split("?", 1)[0].split("#", 1)[0]
        # Page document: exact clean-route match, then without trailing slash.
        target = rewrites.get(path) or rewrites.get(path.rstrip("/"))
        if target:
            return super().translate_path(target)
        # Nested asset under a clean route. The page lives at e.g. /about/, so
        # its relative CSS/JS resolves to /about/about-redesign.css. Strip the
        # route prefix and serve the file from the project root, mirroring the
        # rewriteCleanRoute logic in vite.config.mjs.
        if path != "/":
            prefixes = [r for r in rewrites if r and path.startswith(r + "/")]
            if prefixes:
                prefix = max(prefixes, key=len)
                nested = path[len(prefix) + 1:]
                if nested:
                    resolved = super().translate_path("/" + nested)
                    if os.path.isfile(resolved):
                        return resolved
        return super().translate_path(path)

    def log_message(self, fmt, *args):
        # Quieter logs
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


os.chdir(os.path.dirname(os.path.abspath(__file__)))
with http.server.ThreadingHTTPServer(("", PORT), RedirectHandler) as httpd:
    sys.stderr.write(f"Serving on http://127.0.0.1:{PORT}\n")
    httpd.serve_forever()
