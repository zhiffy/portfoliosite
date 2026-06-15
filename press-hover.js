/* ============================================================
   press-hover.js  —  cursor-following image preview for the
   press / talks list rows on the update letter pages.

   Each .nl-press-item[data-press-img] reveals a small contextual
   photo that tracks the cursor. Hover-capable pointers only; the
   image loads on first hover and is reused after. Motion follows
   the house easing (slow, controlled, no spring).
   ============================================================ */
(function () {
  'use strict';

  // Hover-capable, fine pointer only (no touch / coarse).
  var canHover = false;
  try { canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches; }
  catch (e) { canHover = false; }
  if (!canHover) return;

  var pressPreviewMap = [
    ['brandinginasia.com/shavonne-wong-each-medium-has-taught-me-something-different-about-creativity-itself', '/assets/press/previews/brandinginasia-com-shavonne-wong-each-medium-has-taught-me-something-dif.webp'],
    ['adobe.com/uk/creativecloud/nft-art/best-nft-artists', '/assets/press/previews/adobe-com-the-best-nft-artists-and-coolest-nfts-around-right-now.webp'],
    ['aisdc.aisingapore.org/main-stage', '/assets/features/ap60-artist-proof-singapore-at-60.webp'],
    ['artcentralhongkong.com/programme/2025-performance', '/assets/meet-eva-here/14-art-central-landscape.jpg'],
    ['artsg.com/wp-content/uploads/2025/01/ART-SG-2025-Opening-Release_EN.pdf', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],
    ['bacc.or.th/en/events/90389', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],
    ['bloomberg.com/digitaloriginals', '/assets/features/bloomberg-quicktake-tweet.webp'],
    ['cntrfld.art/in-conversation-shavonne-wong', '/assets/press/previews/cntrfld-art-shavonne-wong-inside-the-bubble.webp'],
    ['cnalifestyle.channelnewsasia.com/entertainment/singapore-nft-artist-shavonne-wong-hollywood-actor-idris-elba', '/assets/press/previews/cnalifestyle-channelnewsasia-com-the-story-behind-how-this-singaporean-a.webp'],
    ['coindesk.com/consensus-magazine/2024/04/23/web3-artist-shavonne-wong-on-the-future-of-nfts', '/assets/press/previews/coindesk-com-web3-artist-shavonne-wong-on-the-future-of-nfts.webp'],
    ['consensus-hongkong2025.coindesk.com/agenda/speaker/-shavonne-wong', '/assets/press/previews/coindesk-com-web3-artist-shavonne-wong-on-the-future-of-nfts.webp'],
    ['culture3.com/posts/stepping-across-the-uncanny-valley-with-shavonne-wong', '/assets/press/previews/culture3-com-stepping-across-the-uncanny-valley-with-shavonne-wong.webp'],
    ['femalemag.com.sg/gallery/culture/what-is-an-nft-singapore-digital-artists', '/assets/press/previews/femalemag-com-sg-what-exactly-is-an-nft-4-singapore-visual-artists-give-.webp'],
    ['forbes.com/sites/biancasalonga/2021/09/06/nfts-find-its-place-on-the-cover-of-vogue', '/assets/press/previews/forbes-com-nfts-find-a-place-on-the-cover-of-vogue-as-a-new-fragrance-an.webp'],
    ['grazia.sg/culture/grazia-game-changers-shavonne-wong-digital-art-fashion-photography', '/assets/press/previews/grazia-sg-grazia-game-changers-shavonne-wong-on-making-the-nft-world-mor.webp'],
    ['herworld.com/pov/shavonne-wong-new-media-artist-blurring-line-between-reality-and-surreal', '/assets/press/previews/herworld-com-shavonne-wong-the-new-media-artist-blurring-the-line-betwee.webp'],
    ['iconsingapore.com/beauty/shavonne-wong-shu-umemura-makeup-collection-art', '/assets/press/previews/iconsingapore-com-shavonne-wong-x-shu-uemura-3d.webp'],
    ['iconsingapore.com/people/photographer-turned-digital-artist-shavonne-wong-is-making-waves-in-the-region', '/assets/press/previews/iconsingapore-com-shavonne-wong-x-shu-uemura-3d.webp'],
    ['lifestyleasia.com/bk/culture/art/contemporary-asian-artists-nfts', '/assets/press/previews/lifestyleasia-com-7-contemporary-asian-artists-and-their-creative-unique.webp'],
    ['lifestyleasia.com/hk/tech/contemporary-asian-artists-and-their-nfts', '/assets/press/previews/lifestyleasia-com-contemporary-asian-artists-and-their-nft-creations-you.webp'],
    ['mens-folio.com/style/a-conversation-in-meta-shavonne-wong', '/assets/press/previews/mens-folio-com-a-conversation-in-meta-with-3d-virtual-model-creator-and-.webp'],
    ['news.artnet.com/art-world/venice-biennale-nft-cameroon-pavilion', '/assets/press/previews/news-artnet-com-the-venice-biennale-is-getting-its-first-nft-art-exhibit.webp'],
    ['nftculture.com/newsletter/beyond-the-gallery-5-women-revolutionizing-the-art-world-through-nfts', '/assets/press/previews/nftculture-com-beyond-the-gallery-5-women-revolutionizing-the-art-world-.webp'],
    ['nftnow.com/features/shavonne-wong-on-art-and-fostering-diversity-in-web3', '/assets/press/previews/nftnow-com-shavonne-wong-on-art-and-fostering-diversity-in-web3.webp'],
    ['nylon.com.sg/shu-uemura-releases-collab-with-acclaimed-new-media-artist-shavonne-wong', '/assets/press/previews/nylon-com-sg-shu-uemura-releases-collab-with-acclaimed-new-media-artist-.webp'],
    ['prestigeonline.com/id/pursuits/asian-artists-to-watch-this-2023', '/assets/press/previews/prestigeonline-com-asian-artists-to-watch-this-2023.webp'],
    ['prestigeonline.com/sg/people/40-under-40/shavonne-wong-prestige-40-under-40-2023', '/assets/features/prestige-asia-artists-to-watch-2023.webp'],
    ['straitstimes.com/life/arts/chat-with-an-ai-influencer-view-van-gogh-high-end-works-at-art-sg', '/assets/press/previews/straitstimes-com-chat-with-an-ai-influencer-view-van-gogh-high-end-works.webp'],
    ['straitstimes.com/life/arts/how-to-collect-young-artists-start-with-these-eight-hot-names', '/assets/press/previews/straitstimes-com-how-to-collect-young-artists-start-with-these-eight-hot.webp'],
    ['straitstimes.com/life/arts/arts-picks-new-works-by-nobel-laureate-and-digital-artist-on-show', '/assets/press/previews/straitstimes-com-how-to-collect-young-artists-start-with-these-eight-hot.webp'],
    ['scitechanddigital.news/2023/04/21/the-grand-opening-of-digital-paradise', '/assets/features/sanya-digital-art-installation.webp'],
    ['tatlerasia.com/lifestyle/arts/idris-elba-buys-first-nft-from-singaporean-artist-shavonne-wong', '/assets/press/previews/tatlerasia-com-this-singaporean-artist-s-nft-was-just-snapped-up-by-holl.webp'],
    ['tatlerasia.com/lifestyle/arts/singaporean-fashion-photographer-shavonne-wong-nft', '/assets/press/previews/tatlerasia-com-singaporean-fashion-photographer-shavonne-wong-makes-a-sp.webp'],
    ['tatlerasia.com/power-purpose/technology/meta-versed-shavonne-wong-virtual-model-creator', '/assets/features/tatler-hong-kong-model-persona-feature.webp'],
    ['taipeidangdai.com/wp-content/uploads/2025/05/Taipei-Dangdai-2025-Press-Release_Closing-Press-Release.pdf', '/assets/meet-eva-here/15-whatsapp-image-2025-03-27-at-23-07-18.webp'],
    ['fliphtml5.com/grzod/pvmy/basic', '/assets/press/previews/tatlerasia-com-singaporean-fashion-photographer-shavonne-wong-makes-a-sp.webp'],
    ['verymulan.com/story/', '/assets/press/previews/verymulan-com-ai-nft.webp'],
    ['vogue.it/news/article/shavonne-wong-3d-makeup', '/assets/features/vogue-italia-instagram-feature.webp'],
    ['vogue.sg/next-in-vogue-conversations-highlights', '/assets/features/vogue-singapore-nft-artist-article.webp'],
    ['vogue.sg/metaverse-shavonne-wong', '/assets/press/previews/vogue-sg-metaverse-shavonne-wong.webp'],
    ['vogue.sg/singaporean-nft-artists', '/assets/press/previews/vogue-sg-notable-singaporean-nft-artists-to-know-of-so-far.webp'],
    ['vogue.sg/the-noteworthy-nfts-displayed-at-the-venice-biennale-2022', '/assets/press/previews/vogue-sg-the-noteworthy-nfts-displayed-at-the-venice-biennale-2022.webp']
  ];

  document.querySelectorAll('.pr-row[href]:not([data-press-img])').forEach(function (row) {
    var href = row.href || row.getAttribute('href') || '';
    var match = pressPreviewMap.find(function (entry) { return href.indexOf(entry[0]) !== -1; });
    if (match) row.setAttribute('data-press-img', match[1]);
  });

  document.querySelectorAll('.abv-tp-item:not([data-press-img])').forEach(function (item) {
    var link = item.querySelector('a[href]');
    if (!link) return;
    var href = link.href || link.getAttribute('href') || '';
    var match = pressPreviewMap.find(function (entry) { return href.indexOf(entry[0]) !== -1; });
    if (match) item.setAttribute('data-press-img', match[1]);
  });

  var aboutExhibitionPreviewMap = [
    ['Meet Eva Here|Platform Project, Taipei Dangdai', '/assets/meet-eva-here/15-whatsapp-image-2025-03-27-at-23-07-18.webp'],
    ['EVA|The Columns Gallery', '/assets/meet-eva-here/07-dsc00655.webp'],
    ['Meet Eva Here|Platform Project, ART SG 2025', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],
    ['Artist\'s Proof: Singapore at 60|The Culture Story', '/assets/features/ap60-artist-proof-singapore-at-60.webp'],
    ['Talking to Machines|Performance Lecture, Art Central', '/assets/meet-eva-here/14-art-central-landscape.jpg'],
    ['ART SG|The Columns Gallery', '/assets/features/art-sg-meet-eva-here-shavonne-wong-2025.webp'],
    ['Bang & Olufsen Art Showcase ft. Shavonne Wong|Bang & Olufsen', '/assets/features/bang-olufsen-artist-page.webp'],
    ['Infinite Games: Hello World!|Neal Gallery', '/assets/features/neal-digital-gallery-installation.webp'],
    ['The Ties That Bind|UltraSuperNew Gallery', '/assets/features/the-ties-that-bind-exhibition-signage.webp'],
    ['The Times of Chimeras|Cameroon Pavilion', '/assets/features/venice-biennale-cameroon-pavilion.webp'],
    ['Beijing Contemporary|Neal Digital Gallery', '/assets/features/beijing-contemporary-art-expo-exterior.webp'],
    ['Digital Paradise|Neal Digital Gallery', '/assets/features/sanya-digital-art-installation.webp'],
    ['6060 Exhibition|NFC Summit', '/assets/features/nfc-stage-screening.webp'],
    ['W1 Curates x Canary Labs|W1 Curates', '/assets/features/w1-curates-london-poster.webp']
  ];

  document.querySelectorAll('.abv-exh-entry:not([data-exh-image])').forEach(function (entry) {
    var title = entry.querySelector('.abv-exh-t')?.textContent?.trim() || '';
    var venue = entry.querySelector('.abv-exh-v')?.textContent?.trim() || '';
    var match = aboutExhibitionPreviewMap.find(function (preview) {
      var parts = preview[0].split('|');
      return title.indexOf(parts[0]) !== -1 && venue.indexOf(parts[1]) !== -1;
    });
    if (match) entry.setAttribute('data-exh-image', match[1]);
  });

  var items = Array.prototype.slice.call(
    document.querySelectorAll('.nl-press-item[data-press-img], .pr-row[data-press-img], .abv-tp-item[data-press-img], .abv-exh-entry[data-exh-image]')
  );
  if (!items.length) return;

  // Single shared preview node.
  var preview = document.createElement('figure');
  preview.className = 'nl-press-preview';
  preview.setAttribute('aria-hidden', 'true');
  var inner = document.createElement('div');
  inner.className = 'nl-press-preview-inner';
  var img = document.createElement('img');
  img.decoding = 'async';
  img.alt = '';
  inner.appendChild(img);
  preview.appendChild(inner);
  document.body.appendChild(preview);

  var active = null;          // current item
  var shown = false;
  var loadedSrc = '';
  var targetX = 0, targetY = 0;
  var curX = 0, curY = 0;
  var raf = 0;
  var OFFSET = 26;            // gap from cursor
  var opacity = 0;            // JS-driven fade (CSS transition/animation
                             // stalls on this compositor-promoted node)
  var FADE_IN = 0.12;        // per-frame increment (~200ms in)
  var FADE_OUT = 0.16;       // per-frame decrement (~150ms out)

  inner.style.opacity = '0';

  function size() {
    return { w: preview.offsetWidth || 280, h: preview.offsetHeight || 220 };
  }

  function place(now) {
    var s = size();
    var vw = window.innerWidth, vh = window.innerHeight;
    // default: to the right of the cursor, vertically centered
    var x = targetX + OFFSET;
    if (x + s.w > vw - 12) x = targetX - OFFSET - s.w;   // flip left near right edge
    if (x < 12) x = 12;
    var y = targetY - s.h / 2;
    if (y < 12) y = 12;
    if (y + s.h > vh - 12) y = vh - 12 - s.h;
    if (now) { curX = x; curY = y; }
    else {
      // ease toward target for a soft, trailing follow
      curX += (x - curX) * 0.22;
      curY += (y - curY) * 0.22;
    }
    preview.style.transform = 'translate(' + Math.round(curX) + 'px, ' + Math.round(curY) + 'px)';
  }

  function loop() {
    raf = 0;
    var beforeX = curX, beforeY = curY;
    place(false);

    // drive the fade in JS — deterministic, immune to the compositor
    // quirk that pins CSS opacity transitions/animations at 0 here.
    if (shown) {
      if (opacity < 1) opacity = Math.min(1, opacity + FADE_IN);
    } else if (opacity > 0) {
      opacity = Math.max(0, opacity - FADE_OUT);
    }
    inner.style.opacity = opacity.toFixed(3);

    var moving = Math.abs(curX - beforeX) > 0.3 || Math.abs(curY - beforeY) > 0.3;
    var fading = (shown && opacity < 1) || (!shown && opacity > 0);
    if (moving || fading) {
      raf = window.requestAnimationFrame(loop);
    } else if (!shown) {
      // fully hidden — park off-screen so it can't intercept anything
      preview.style.transform = 'translate(-9999px, -9999px)';
    }
  }

  function ensureLoop() {
    if (!raf) raf = window.requestAnimationFrame(loop);
  }

  function show(item, e) {
    active = item;
    var src = item.getAttribute('data-press-img') || item.getAttribute('data-exh-image');
    if (src && src !== loadedSrc) { img.src = src; loadedSrc = src; }
    targetX = e.clientX; targetY = e.clientY;
    place(true);                 // snap to first position (no slide-in from origin)
    shown = true;
    ensureLoop();
  }

  function hide() {
    shown = false;
    active = null;
    ensureLoop();                // let the loop fade it out
  }

  items.forEach(function (item) {
    item.addEventListener('pointerenter', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      show(item, e);
    });
    item.addEventListener('pointermove', function (e) {
      if (!shown || active !== item) return;
      targetX = e.clientX; targetY = e.clientY;
      ensureLoop();
    });
    item.addEventListener('pointerleave', function () { hide(); });
    item.addEventListener('mouseenter', function (e) { show(item, e); });
    item.addEventListener('mousemove', function (e) {
      if (!shown || active !== item) return;
      targetX = e.clientX; targetY = e.clientY;
      ensureLoop();
    });
    item.addEventListener('mouseleave', function () { hide(); });
  });

  // Safety: hide if the page scrolls or the window blurs.
  window.addEventListener('scroll', function () { if (shown) hide(); }, { passive: true });
  window.addEventListener('blur', function () { if (shown) hide(); });
})();
