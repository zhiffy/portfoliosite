import { existsSync, readFileSync, writeFileSync } from "node:fs";

const newsletterDataPath = "uploads/newsletter-data.json";
const pages = JSON.parse(readFileSync(newsletterDataPath, "utf8"));

const navItems = [
  ["update2025jun", "June 2025"],
  ["update2025jan", "Jan 2025"],
  ["update2024jun", "June 2024"],
  ["update2024jan", "Jan 2024"],
  ["update2023june", "June 2023"],
  ["update2023jan", "Jan 2023"],
];

const chronological = [
  "update2023jan",
  "update2023june",
  "update2024jan",
  "update2024jun",
  "update2025jan",
  "update2025jun",
];

const displayDates = new Map([
  ["update2023jan", "January 2023"],
  ["update2023june", "June 2023"],
  ["update2024jan", "January 2024"],
  ["update2024jun", "June 2024"],
  ["update2025jan", "January 2025"],
  ["update2025jun", "June 2025"],
]);

const locations = new Map([
  ["update2023jan", "Singapore, SG"],
  ["update2023june", "Singapore, SG"],
  ["update2024jan", "Singapore, SG"],
  ["update2024jun", "Bangkok, TH"],
  ["update2025jan", "Singapore, SG"],
  ["update2025jun", "Singapore, SG"],
]);

const publishedDates = new Map([
  ["update2023jan", "2023-01-01"],
  ["update2023june", "2023-06-01"],
  ["update2024jan", "2024-01-01"],
  ["update2024jun", "2024-06-01"],
  ["update2025jan", "2025-01-01"],
  ["update2025jun", "2025-06-01"],
]);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripTags(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function pathWithLeadingSlash(src = "") {
  return src.startsWith("/") ? src : `/${src}`;
}

function webpCandidate(src = "") {
  return src.replace(/\.(jpe?g|png)$/i, ".webp");
}

function renderImage(src, alt, className = "nl-source-figure") {
  const normalizedSrc = pathWithLeadingSlash(src);
  const candidate = webpCandidate(src);
  const source = existsSync(candidate) ? `      <source srcset="${pathWithLeadingSlash(candidate)}" type="image/webp">\n` : "";
  return `    <figure class="${className}">
      <picture>
${source}        <img decoding="async" loading="lazy" src="${normalizedSrc}" alt="${escapeHtml(alt)}">
      </picture>
    </figure>`;
}

function findCover(slug) {
  const base = `assets/newsletters/${slug}/01`;
  return [".webp", ".jpg", ".jpeg", ".png"].map((ext) => `${base}${ext}`).find((file) => existsSync(file));
}

function firstParagraph(blocks) {
  const text = blocks
    .filter((block) => block.type === "html")
    .map((block) => stripTags(block.html))
    .find((textValue) => textValue.length > 50);
  return text || "Artist update from Shavonne Wong.";
}

function renderSourceBlocks(blocks) {
  const out = [];
  let gallery = [];

  function flushGallery() {
    if (!gallery.length) return;
    out.push(`  <div class="nl-source-gallery" data-count="${gallery.length}">
${gallery.map((block) => renderImage(block.src, block.alt)).join("\n")}
  </div>`);
    gallery = [];
  }

  for (const block of blocks) {
    if (block.type === "image") {
      gallery.push(block);
      continue;
    }

    flushGallery();
    if (block.type === "html") {
      out.push(`  <div class="nl-source-copy">
    ${block.html}
  </div>`);
    }
  }

  flushGallery();
  return out.join("\n\n");
}

function renderPage(page) {
  const slug = page.slug;
  const displayDate = displayDates.get(slug) || page.label;
  const shortLabel = page.label;
  const description = page.description || firstParagraph(page.blocks);
  const cover = findCover(slug);
  const coverAlt = `Opening image for the ${displayDate} artist update.`;
  const published = publishedDates.get(slug) || "2025-01-01";
  const index = chronological.indexOf(slug);
  const previousSlug = index > 0 ? chronological[index - 1] : null;
  const nextSlug = index >= 0 && index < chronological.length - 1 ? chronological[index + 1] : null;
  const firstImage = page.blocks.find((block) => block.type === "image")?.src || cover;
  const socialImage = firstImage ? pathWithLeadingSlash(firstImage) : "";
  const sourceBlocks = renderSourceBlocks(page.blocks);
  const archiveNav = navItems.map(([itemSlug, label]) => {
    const active = itemSlug === slug ? " is-active" : "";
    const aria = itemSlug === slug ? ' aria-current="page"' : "";
    return `        <a class="nl-archive-nav-link${active}" href="/${itemSlug}/"${aria}>${label}</a>`;
  }).join("\n");
  const previousLink = previousSlug ? `<a class="nl-foot-link" href="/${previousSlug}/">
        <span>Previous</span>
        <em>${displayDates.get(previousSlug)} Update</em>
      </a>` : `<a class="nl-foot-link" href="/writing/">
        <span>Archive</span>
        <em>Writing</em>
      </a>`;
  const nextLink = nextSlug ? `<a class="nl-foot-link" href="/${nextSlug}/">
        <span>Next</span>
        <em>${displayDates.get(nextSlug)} Update</em>
      </a>` : `<a class="nl-foot-link" href="/works/available/">
        <span>In the studio</span>
        <em>Available Works</em>
      </a>`;

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <title>${escapeHtml(displayDate)} Update | Shavonne Wong</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="Shavonne Wong">
  <link rel="canonical" href="https://shavonnewong.art/${slug}/">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(displayDate)} Update | Shavonne Wong">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${socialImage ? `<meta property="og:image" content="https://shavonnewong.art${socialImage}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  ${socialImage ? `<meta name="twitter:image" content="https://shavonnewong.art${socialImage}">` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mulish:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/scroll-narrative.css?v=20260613-prose-links">
  <link rel="stylesheet" href="/scroll-pages.css?v=20260902-eva-hero">
  <link rel="stylesheet" href="/update2025jun-redesign.css?v=20260613-live-archive">
  <link rel="stylesheet" href="/update-archive.css?v=20260613-live-archive">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${escapeHtml(displayDate)} Update | Shavonne Wong",
    "description": "${escapeHtml(description)}",
    ${socialImage ? `"image": "https://shavonnewong.art${socialImage}",` : ""}
    "datePublished": "${published}",
    "dateModified": "${published}",
    "author": {
      "@type": "Person",
      "name": "Shavonne Wong",
      "url": "https://shavonnewong.art/about/",
      "sameAs": "https://en.wikipedia.org/wiki/Shavonne_Wong"
    },
    "publisher": {
      "@type": "Person",
      "name": "Shavonne Wong"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://shavonnewong.art/${slug}/"
    },
    "isPartOf": {
      "@type": "Blog",
      "name": "Studio notes",
      "url": "https://shavonnewong.art/writing/"
    }
  }
  </script>
  <!-- Cloudflare Web Analytics -->
  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "ed11192c01f44bf2b6d068d312a11534"}'></script>
  <!-- End Cloudflare Web Analytics -->
</head>
<body class="sn-page-body">
  <a class="sn-skip-link" href="#main-content">Skip to content</a>
  <header class="sn-nav" data-page-nav>
    <a href="/#hero" class="sn-mark"><img decoding="async" class="sn-mark-logo" src="/assets/brand/wordmark-slate.webp" alt="Shavonne Wong" width="120" height="42"></a>
    <nav class="sn-links">
      <a href="/#hero" data-i18n="nav.home">Home</a>
      <a href="/about/" data-i18n="nav.about">About</a>
      <a href="/works/" data-i18n="nav.works">Works</a>
      <a href="/writing/" class="is-active" data-i18n="nav.writing">Writing</a>
      <a href="/press/" data-i18n="nav.press">Press</a>
      <a href="/contact/" data-i18n="nav.contact">Contact</a>
    </nav>
    <div class="sn-meta-right">
      <label class="sn-lang-switcher" data-language-switcher>
        <span class="sn-lang-kicker" data-i18n="ui.languageLabel">Language</span>
        <select class="sn-lang-select" data-language-select aria-label="Language" data-i18n-aria-label="ui.languageLabel" title="Language"></select>
      </label>
      <span>${escapeHtml(shortLabel)}</span>
      <span data-i18n="page.studioUpdate">Studio update</span>
    </div>
    <div class="sn-progress"><div class="sn-progress-bar" style="width:100%"></div></div>
  </header>

  <main id="main-content" class="nl-letter nl-source-page" data-screen-label="${escapeHtml(displayDate)} Update">
    <header class="nl-hero nl-wrap">
      <div class="nl-archive-kicker">Studio update archive</div>
      <h1 class="nl-hero-title"><em>${escapeHtml(displayDate.split(" ")[0])}</em> ${escapeHtml(displayDate.split(" ").slice(1).join(" "))} Update</h1>
      <div class="nl-hero-foot">
        <p class="nl-hero-lead">${escapeHtml(firstParagraph(page.blocks))}</p>
        <div>
          <div class="nl-hero-byline">Shavonne Wong</div>
          <div class="nl-hero-meta"><span>${escapeHtml(displayDate)}</span><span>${escapeHtml(locations.get(slug) || "Singapore, SG")}</span></div>
        </div>
      </div>
      ${cover ? renderImage(cover, coverAlt, "nl-fig nl-cover").replace('loading="lazy"', 'fetchpriority="high"') : ""}
      <nav class="nl-archive-nav" aria-label="Update archive">
${archiveNav}
      </nav>
    </header>

    <article class="nl-source-flow nl-wrap" aria-label="Live update content">
${sourceBlocks}
    </article>

    <nav class="nl-foot nl-wrap" aria-label="More updates">
      ${previousLink}
      ${nextLink}
    </nav>

    <footer class="sw-page-footer" data-site-footer>
      <div class="sw-page-footer__inner">
        <button class="sw-page-footer__top" type="button" data-site-back-top>Back to top</button>
      </div>
    </footer>
  </main>
  <script src="/site-header.js?v=20260606-footer"></script>
  <script src="/site-i18n.js?v=20260604-fix"></script>
</body>
</html>
`;
}

for (const page of pages.filter((item) => chronological.includes(item.slug))) {
  writeFileSync(`${page.slug}.html`, renderPage(page));
  const imageBlocks = page.blocks.filter((block) => block.type === "image").length;
  const textBlocks = page.blocks.filter((block) => block.type === "html").length;
  console.log(`Generated ${page.slug}.html (${textBlocks} text blocks, ${imageBlocks} content images plus cover)`);
}
