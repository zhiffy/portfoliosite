/* Studio-notes newsletter and contact forms. Newsletter signups go through the
   private site endpoint, while the contact form stays on Formspree. */
(function () {
  function mountStickyCta() {
    var KEY = 'sw-subscribe-cta-dismissed';
    if (document.getElementById('sw-subscribe-cta')) return;
    try {
      if (window.localStorage.getItem(KEY) === 'yes') return;
    } catch (e) {}

    var styleId = 'sw-subscribe-cta-style';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent =
        '.sw-subscribe-cta{position:fixed;right:clamp(14px,2vw,28px);bottom:clamp(14px,2vw,28px);z-index:140;display:flex;align-items:center;gap:12px;max-width:min(390px,calc(100vw - 28px));padding:12px 12px 12px 15px;background:#18192B;color:#EDEDF4;border:1px solid rgba(237,237,244,.22);box-shadow:0 18px 44px rgba(24,25,43,.2);font-family:Mulish,Helvetica Neue,Arial,sans-serif;opacity:0;transform:translateY(10px);transition:opacity .28s ease,transform .28s ease}' +
        '.sw-subscribe-cta.is-visible{opacity:1;transform:translateY(0)}' +
        '.sw-subscribe-cta__link{display:grid;gap:1px;min-width:0;color:inherit;text-decoration:none}' +
        '.sw-subscribe-cta__kicker{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#D0D3EC;white-space:nowrap}' +
        '.sw-subscribe-cta__title{font-size:14px;line-height:1.25;font-style:italic;font-weight:300;color:#fff}' +
        '.sw-subscribe-cta__button{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 13px;border:1px solid rgba(237,237,244,.45);color:#fff;font-size:10px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}' +
        '.sw-subscribe-cta__close{appearance:none;border:0;background:transparent;color:#D0D3EC;font:inherit;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:8px 2px;cursor:pointer}' +
        '.sw-subscribe-cta__link:hover .sw-subscribe-cta__button{background:#EDEDF4;color:#18192B}' +
        '.sw-subscribe-cta__close:hover{color:#fff}' +
        '@media(max-width:640px){.sw-subscribe-cta{left:12px;right:12px;bottom:12px;max-width:none;gap:10px}.sw-subscribe-cta__title{font-size:13px}.sw-subscribe-cta__button{padding:0 10px}.sw-subscribe-cta__close{font-size:10px}}' +
        '@media(prefers-reduced-motion:reduce){.sw-subscribe-cta{transition:none}}';
      document.head.appendChild(style);
    }

    function targetHref() {
      var form = document.querySelector('[data-newsletter-form]');
      if (form) {
        if (!form.id) form.id = 'sw-subscribe-form';
        return '#' + form.id;
      }
      return 'writing.html#sw-subscribe-form';
    }

    var href = targetHref();
    var cta = document.createElement('aside');
    cta.id = 'sw-subscribe-cta';
    cta.className = 'sw-subscribe-cta';
    cta.setAttribute('aria-label', 'Subscribe to studio updates');
    cta.innerHTML =
      '<a class="sw-subscribe-cta__link" href="' + href + '">' +
        '<span class="sw-subscribe-cta__kicker">Studio updates</span>' +
        '<span class="sw-subscribe-cta__title">New work, exhibitions, and drops.</span>' +
      '</a>' +
      '<a class="sw-subscribe-cta__button" href="' + href + '">Subscribe</a>' +
      '<button class="sw-subscribe-cta__close" type="button" aria-label="Dismiss subscribe prompt">Close</button>';

    cta.querySelector('.sw-subscribe-cta__close').addEventListener('click', function () {
      cta.remove();
      try { window.localStorage.setItem(KEY, 'yes'); } catch (e) {}
    });

    document.body.appendChild(cta);
    window.requestAnimationFrame(function () {
      cta.classList.add('is-visible');
    });
  }

  function wireForm(form, options) {
    var scope = form.parentElement || document;
    var btn = form.querySelector('[type="submit"]');
    var ok = scope.querySelector('[data-fs-success]');
    var err = scope.querySelector('[data-fs-error]');
    var label = btn ? btn.textContent : options.defaultLabel;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (err) err.textContent = '';
      if (ok) ok.textContent = '';
      if (btn) { btn.disabled = true; btn.textContent = options.pendingLabel; }
      var formData = new FormData(form);
      var request = {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      };
      if (options.json) {
        var payload = {};
        formData.forEach(function (value, key) {
          payload[key] = value;
        });
        payload.page = window.location.pathname || '/';
        request.headers['Content-Type'] = 'application/json';
        request.body = JSON.stringify(payload);
      } else {
        request.body = formData;
      }
      fetch(form.action, request).then(function (res) {
        if (res.ok) {
          form.style.display = 'none';
          if (ok) ok.textContent = options.successText;
          if (options.newsletter) {
            var sticky = document.getElementById('sw-subscribe-cta');
            if (sticky) sticky.remove();
            try { window.localStorage.setItem('sw-subscribe-cta-dismissed', 'yes'); } catch (e) {}
          }
        } else {
          return res.json().then(function (data) {
            var msg = (data && data.error) || (data && data.errors && data.errors.map(function (x) { return x.message; }).join(', ')) || 'Something went wrong. Please try again.';
            if (err) err.textContent = msg;
            if (btn) { btn.disabled = false; btn.textContent = label; }
          }).catch(function () {
            if (err) err.textContent = 'Something went wrong. Please try again.';
            if (btn) { btn.disabled = false; btn.textContent = label; }
          });
        }
      }).catch(function () {
        if (err) err.textContent = 'Network error. Please try again.';
        if (btn) { btn.disabled = false; btn.textContent = label; }
      });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-newsletter-form]'), function (form) {
    wireForm(form, {
      defaultLabel: 'Subscribe',
      pendingLabel: 'Sending...',
      successText: 'Thank you, you are on the list. Look out for the next studio note.',
      json: true,
      newsletter: true
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-contact-form]'), function (form) {
    wireForm(form, {
      defaultLabel: 'Send message',
      pendingLabel: 'Sending...',
      successText: 'Thank you. Your message has been sent to the studio.'
    });
  });

  mountStickyCta();
})();
