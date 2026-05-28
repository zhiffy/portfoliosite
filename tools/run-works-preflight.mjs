#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const args = new Set(process.argv.slice(2));

const staticOnly = args.has('--static-only');
const skipExternal = staticOnly || args.has('--skip-external');
const skipRender = staticOnly || args.has('--skip-render');

const checks = [
  {
    name: 'Works catalog model',
    script: 'tools/validate-works-catalog.mjs',
  },
  {
    name: 'Full-site local links',
    script: 'tools/validate-site-links.mjs',
  },
];

if (!skipExternal) {
  checks.push({
    name: 'Live external links',
    script: 'tools/validate-external-links.mjs',
  });
}

if (!skipRender) {
  checks.push({
    name: 'Rendered Works audit',
    script: 'tools/audit-works-render.mjs',
  });
}

function runCheck(check) {
  return new Promise((resolve) => {
    const started = Date.now();
    console.log(`\n== ${check.name} ==`);
    const child = spawn(node, [check.script], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('exit', (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      resolve({ ...check, code, seconds });
    });
  });
}

async function main() {
  console.log('Works preflight starting.');
  if (staticOnly) console.log('Mode: static-only');
  else {
    if (skipExternal) console.log('Skipping live external links.');
    if (skipRender) console.log('Skipping rendered Works audit.');
  }

  const results = [];
  for (const check of checks) results.push(await runCheck(check));

  const failed = results.filter((result) => result.code !== 0);
  console.log('\n== Summary ==');
  for (const result of results) {
    const label = result.code === 0 ? 'PASS' : 'FAIL';
    console.log(`${label} ${result.name} (${result.seconds}s)`);
  }

  if (failed.length) {
    console.error(`\nWorks preflight failed with ${failed.length} failed check(s).`);
    process.exit(1);
  }

  console.log('\nWorks preflight passed.');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
