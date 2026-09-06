import fs from 'node:fs';
import path from 'node:path';

// Validate the deployable output, where source-only checks cannot catch
// missing classic scripts or redirects to files removed during packaging.
export function validateBuiltSite(outDir, pages) {
  const failures = [];
  const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
    .map((match) => [match[1].toLowerCase(), match[3]]));
  function check(file, url) {
    if (!url || /^(?:https?:|data:|blob:|\/\/|#)/i.test(url)) return;
    const target = path.resolve(outDir, decodeURIComponent(url.split(/[?#]/)[0].replace(/^\//, '')));
    if (!target.startsWith(outDir + path.sep) || !fs.existsSync(target)) failures.push(`${file}: missing ${url}`);
  }
  for (const file of pages) {
    const html = fs.readFileSync(path.join(outDir, file), 'utf8')
      .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
    for (const match of html.matchAll(/<(?:script|img|source|video|link)\b[^>]*>/gi)) {
      const a = attrs(match[0]);
      check(file, a.src);
      check(file, a.poster);
      if (a.rel === 'stylesheet') check(file, a.href);
      for (const src of (a.srcset || '').split(',').filter(Boolean)) check(file, src.trim().split(/\s+/)[0]);
    }
  }
  const redirects = fs.readFileSync(path.join(outDir, '_redirects'), 'utf8');
  for (const line of redirects.split(/\r?\n/)) {
    const [source, destination, status] = line.trim().split(/\s+/);
    if (status?.startsWith('200') && !source.startsWith('#') && !destination.includes(':splat')) check('_redirects', destination);
  }
  if (failures.length) throw new Error(`Built site validation failed:\n${[...new Set(failures)].join('\n')}`);
  console.log(`Built site validated for ${pages.length} pages.`);
}
