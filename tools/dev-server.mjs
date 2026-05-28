#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 4173);
const host = process.argv[3] || '127.0.0.1';

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

const rewrites = new Map();
const redirects = [];

const redirectsPath = path.join(root, '_redirects');
if (fs.existsSync(redirectsPath)) {
  const lines = fs.readFileSync(redirectsPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const [from, to, status = '301'] = line.split(/\s+/);
    if (!from || !to) continue;

    if (status === '200') {
      rewrites.set(normalizeRoute(from), to.replace(/^\//, ''));
    } else if (status.startsWith('301')) {
      redirects.push({ from: normalizeRoute(from), to });
    }
  }
}

function normalizeRoute(route) {
  if (!route.startsWith('/')) return `/${route}`;
  return route;
}

function cleanPathname(url) {
  try {
    return decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  } catch {
    return '/';
  }
}

function matchRedirect(route) {
  for (const redirect of redirects) {
    if (redirect.from === route) return redirect.to;
    if (redirect.from.endsWith('*') && route.startsWith(redirect.from.slice(0, -1))) {
      return redirect.to;
    }
  }
  return null;
}

function resolveFile(route) {
  const rewritten = rewrites.get(route);
  if (rewritten) return path.join(root, rewritten);

  if (route === '/') return path.join(root, 'index.html');

  const requested = route.replace(/^\/+/, '');
  const direct = path.join(root, requested);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;

  const htmlFile = path.join(root, `${requested.replace(/\/$/, '')}.html`);
  if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isFile()) return htmlFile;

  const indexFile = path.join(root, requested, 'index.html');
  if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) return indexFile;

  return null;
}

function isInsideRoot(filePath) {
  const relative = path.relative(root, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

const server = http.createServer((request, response) => {
  const route = normalizeRoute(cleanPathname(request.url));
  const redirectTarget = matchRedirect(route);
  if (redirectTarget) {
    response.writeHead(301, { Location: redirectTarget });
    response.end();
    return;
  }

  const filePath = resolveFile(route);
  if (!filePath || !isInsideRoot(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Unable to read file');
  });

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
  });
  stream.pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/`);
});
