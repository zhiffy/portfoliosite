(function () {
  const nav = document.querySelector('.sp-subnav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const targets = links
    .map((link) => {
      const id = decodeURIComponent(link.getAttribute('href').slice(1));
      return { link, target: document.getElementById(id) };
    })
    .filter((item) => item.target);

  if (!targets.length || !('IntersectionObserver' in window)) return;

  let timer = 0;

  function setCurrent(link) {
    links.forEach((candidate) => candidate.classList.toggle('is-current', candidate === link));
  }

  function syncCurrent() {
    timer = 0;
    const navBottom = nav.getBoundingClientRect().bottom;
    const visible = targets
      .map((item) => ({ ...item, rect: item.target.getBoundingClientRect() }))
      .filter((item) => item.rect.bottom > navBottom + 8 && item.rect.top < window.innerHeight * 0.62)
      .sort((a, b) => a.rect.top - b.rect.top);

    setCurrent((visible[0] || targets[0]).link);
  }

  function scheduleSync() {
    if (timer) return;
    timer = window.setTimeout(syncCurrent, 100);
  }

  const observer = new IntersectionObserver(scheduleSync, {
    root: null,
    rootMargin: '-96px 0px -35% 0px',
    threshold: [0, 0.08, 0.2, 0.45],
  });

  targets.forEach((item) => observer.observe(item.target));
  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('hashchange', scheduleSync);
  syncCurrent();
})();
