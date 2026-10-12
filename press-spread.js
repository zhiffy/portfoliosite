/* This viewer is limited to the marked newspaper controls on the two pages. */
(function () {
  'use strict';
  var dialog = document.querySelector('[data-press-spread-dialog]');
  if (!dialog) return;
  dialog.dataset.pressSpreadReady = 'true';
  var image = dialog.querySelector('[data-spread-image]');
  var viewport = dialog.querySelector('[data-spread-scroll]');
  var note = dialog.querySelector('[data-spread-note]');
  var choices = Array.from(dialog.querySelectorAll('[data-spread-version]'));
  var zoom = dialog.querySelector('[data-spread-zoom]');
  var trigger = null;
  var oldOverflow = '';
  function fit() {
    viewport.classList.remove('is-zoomed');
    viewport.scrollLeft = viewport.scrollTop = 0;
    zoom.setAttribute('aria-pressed', 'false');
  }
  function select(version) {
    image.src = version === 'original' ? dialog.dataset.originalSrc : dialog.dataset.aiSrc;
    note.textContent = version === 'original' ? dialog.dataset.originalNote : dialog.dataset.aiNote;
    choices.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.spreadVersion === version)); });
    fit();
  }
  document.querySelectorAll('[data-open-press-spread]').forEach(function (control) {
    control.addEventListener('click', function (event) {
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      trigger = control;
      oldOverflow = document.body.style.overflow;
      select('original');
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      dialog.querySelector('[data-spread-close]').focus();
    });
  });
  choices.forEach(function (button) { button.addEventListener('click', function () { select(button.dataset.spreadVersion); }); });
  zoom.addEventListener('click', function () {
    var active = viewport.classList.toggle('is-zoomed');
    zoom.setAttribute('aria-pressed', String(active));
    if (!active) fit();
  });
  dialog.querySelector('[data-spread-fit]').addEventListener('click', fit);
  dialog.querySelector('[data-spread-close]').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    if (event.target !== dialog) return;
    var bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', function () {
    document.body.style.overflow = oldOverflow;
    fit();
    if (trigger) trigger.focus();
  });
}());
