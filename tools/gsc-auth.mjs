#!/usr/bin/env node
/*
 * gsc-auth.mjs  -  one-time keyless login for the Search Console digest
 * --------------------------------------------------------------------
 * Twin of ga-auth.mjs, but for Google Search Console instead of GA4. It reuses
 * the SAME OAuth client you already created (tools/ga-oauth-client.json), opens
 * Google's consent page, captures the approval on a local loopback port, and
 * saves a refresh token to tools/gsc-oauth.json (gitignored, inside the repo).
 * After that, gsc-digest.mjs uses that token. No key file, nothing pasted by hand.
 *
 * Before running: make sure the "Google Search Console API" is enabled in your
 * Cloud project (core-chemist-500107-f4). See tools/gsc-setup-guide.md.
 *
 * Run:  node tools/gsc-auth.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const CLIENT_PATH = path.join(ROOT, 'tools', 'ga-oauth-client.json');
const OUT = path.resolve(ROOT, 'tools/gsc-oauth.json');
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

if (!existsSync(CLIENT_PATH)) {
  console.error(`Missing ${path.relative(ROOT, CLIENT_PATH)}.
This reuses the same Desktop-app OAuth client you made for GA. If it is gone,
re-download it from the Google Cloud console and save it as tools/ga-oauth-client.json.
See tools/gsc-setup-guide.md.`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(CLIENT_PATH, 'utf8'));
const client = raw.installed || raw.web || raw;
if (!client.client_id || !client.client_secret) {
  console.error('That client JSON has no client_id / client_secret. Re-download the Desktop app client.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  const code = u.searchParams.get('code');
  if (!code) { res.end('Waiting for Google. You can close this tab if nothing happens.'); return; }
  try {
    const port = server.address().port;
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: client.client_id,
        client_secret: client.client_secret,
        redirect_uri: `http://127.0.0.1:${port}`,
        grant_type: 'authorization_code'
      })
    });
    const j = await r.json();
    if (!j.refresh_token) throw new Error(`No refresh token returned. Response: ${JSON.stringify(j)}`);
    writeFileSync(OUT, JSON.stringify({
      type: 'authorized_user',
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: j.refresh_token
    }, null, 2) + '\n');
    res.end('Done. Close this tab and return to your terminal.');
    console.log(`\nSaved login to ${OUT}`);
    console.log('Next: run  node tools/gsc-digest.mjs  (the site url is already set in tools/gsc-digest.config.json)');
  } catch (e) {
    res.end('Something went wrong: ' + e.message);
    console.error('\n' + e.message);
  } finally {
    setTimeout(() => server.close(), 500);
  }
});

const requestedPort = Number(process.env.GSC_AUTH_PORT || 0);
server.listen(requestedPort, '127.0.0.1', () => {
  const port = server.address().port;
  const redirect = `http://127.0.0.1:${port}`;
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirect,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'select_account consent'
  });
  console.log('A browser window should open. If it does not, paste this into your browser,');
  console.log('sign in with your work account, and click Allow:\n');
  console.log(authUrl + '\n');
  if (process.env.GSC_AUTH_NO_OPEN === '1') return;
  const open = process.platform === 'win32'
    ? ['rundll32', ['url.dll,FileProtocolHandler', authUrl]]
    : process.platform === 'darwin' ? ['open', [authUrl]] : ['xdg-open', [authUrl]];
  try { spawn(open[0], open[1], { stdio: 'ignore', detached: true }).unref(); } catch { /* user can paste manually */ }
});
