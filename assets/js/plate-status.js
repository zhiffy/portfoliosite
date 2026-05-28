(function () {
  // ============================================================
  // Plate status auto-tagger
  // Reads the existing text of each .sp-plate-status element and
  // attaches a data-status attribute so the CSS dot variant can
  // colour-code availability. Lets us add per-component dots
  // across Suite pages without manually editing every plate.
  // ============================================================
  function tag(el) {
    const text = (el.textContent || '').toLowerCase();
    const flags = [];
    if (text.includes('not for sale')) flags.push('nfs');
    else if (text.includes('available')) flags.push('available');
    else if (text.includes('sold')) flags.push('sold');
    if (flags.length) el.setAttribute('data-status', flags.join(' '));
  }

  function run() {
    document.querySelectorAll('.sp-plate-status').forEach(tag);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
