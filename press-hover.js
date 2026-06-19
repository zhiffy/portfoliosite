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
    ['straitstimes.com/singapore/community/what-does-the-rise-of-genai-mean-for-singapores-creative-arts', '/assets/press/previews/straitstimes-genai-singapore-creative-arts-2026.webp'],
    ['straitstimes.com/life/arts/chat-with-an-ai-influencer', '/assets/press/previews/straitstimes-com-chat-with-an-ai-influencer-view-van-gogh-high-end-works.webp'],
    ['straitstimes.com/life/arts/how-to-collect-young-artists', '/assets/press/previews/straitstimes-com-how-to-collect-young-artists-start-with-these-eight-hot.webp'],
    ['straitstimes.com/life/arts/arts-picks-new-works-by-nobel-laureate', '/assets/press/previews/straitstimes-genai-singapore-creative-arts-2026.webp'],
    ['tatlerasia.com/lifestyle/arts/idris-elba-buys-first-nft-from-singaporean-artist-shavonne-wong', '/assets/press/previews/tatlerasia-com-this-singaporean-artist-s-nft-was-just-snapped-up-by-holl.webp'],
    ['tatlerasia.com/lifestyle/arts/singaporean-fashion-photographer-shavonne-wong-nft', '/assets/press/previews/tatlerasia-com-singaporean-fashion-photographer-shavonne-wong-makes-a-sp.webp'],
    ['verymulan.com', '/assets/press/previews/verymulan-com-ai-nft.webp'],
    ['vogue.sg/metaverse-shavonne-wong', '/assets/press/previews/vogue-sg-metaverse-shavonne-wong.webp'],
    ['vogue.sg/singaporean-nft-artists', '/assets/press/previews/vogue-sg-notable-singaporean-nft-artists-to-know-of-so-far.webp'],
    ['vogue.sg/the-noteworthy-nfts-displayed-at-the-venice-biennale-2022', '/assets/press/previews/vogue-sg-the-noteworthy-nfts-displayed-at-the-venice-biennale-2022.webp'],
  ];

  // ---- floating preview element ----
  var preview = document.createElement('div');
  preview.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9999;transition:opacity 0.18s ease;opacity:0;';
  var previewImg = document.createElement('img');
  previewImg.style.cssText = 'display:block;width:220px;height:auto;max-height:160px;object-fit:contain;border-radius:3px;box-shadow:0 4px 24px rgba(0,0,0,0.18);background:var(--surface,#f5f5f6);';
  preview.appendChild(previewImg);
  document.body.appendChild(preview);

  var mouseX = 0, mouseY = 0, curX = 0, curY = 0;
  var raf = null;
  var active = false;

  document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animate() {
    curX += (mouseX + 18 - curX) * 0.10;
    curY += (mouseY - 60 - curY) * 0.10;
    preview.style.transform = 'translate(' + curX + 'px,' + curY + 'px)';
    if (active) raf = requestAnimationFrame(animate);
  }

  function resolveImg(href) {
    if (!href) return null;
    for (var i = 0; i < pressPreviewMap.length; i++) {
      if (href.indexOf(pressPreviewMap[i][0]) !== -1) return pressPreviewMap[i][1];
    }
    return null;
  }

  function attach(el) {
    var imgSrc = el.dataset.pressImg || resolveImg(el.href || el.getAttribute('href') || '');
    if (!imgSrc) return;
    var loaded = false;
    el.addEventListener('mouseenter', function() {
      if (!loaded) { previewImg.src = imgSrc; loaded = true; }
      active = true;
      preview.style.opacity = '1';
      curX = mouseX + 18; curY = mouseY - 60;
      raf = requestAnimationFrame(animate);
    });
    el.addEventListener('mouseleave', function() {
      active = false;
      preview.style.opacity = '0';
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }

  // Attach to all press rows — nl-press-item and pr-row links with data-press-img or mapped hrefs
  var rows = document.querySelectorAll('.nl-press-item a, .pr-row, [data-press-img]');
  rows.forEach(function(el) { attach(el); });

}());
