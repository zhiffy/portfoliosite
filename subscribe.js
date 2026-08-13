/* Studio-notes newsletter and contact forms. Newsletter signups and contact
   messages go through private same-origin site endpoints. */
(function () {
  // Public reCAPTCHA v3 site key (safe to expose client side; the secret key
  // stays server-side only, in the Netlify env var RECAPTCHA_SECRET_KEY).
  var RECAPTCHA_SITE_KEY = '6LcI-0ctAAAAACXTH_jVj2abUMKzod48s2MJWqVI';
  var recaptchaLoadPromise = null;

  function isLocalPreviewHost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1';
  }

  function loadRecaptcha() {
    if (recaptchaLoadPromise) return recaptchaLoadPromise;
    if (!RECAPTCHA_SITE_KEY || RECAPTCHA_SITE_KEY.indexOf('PASTE_') === 0) return Promise.resolve(false);
    recaptchaLoadPromise = new Promise(function (resolve) {
      if (window.grecaptcha && window.grecaptcha.execute) {
        resolve(true);
        return;
      }
      var script = document.createElement('script');
      var settled = false;
      var done = function (ok) {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      script.src = 'https://www.google.com/recaptcha/api.js?render=' + RECAPTCHA_SITE_KEY;
      script.async = true;
      script.onload = function () { done(true); };
      script.onerror = function () { done(false); };
      document.head.appendChild(script);
      window.setTimeout(function () { done(Boolean(window.grecaptcha && window.grecaptcha.execute)); }, 3000);
    });
    return recaptchaLoadPromise;
  }

  function getRecaptchaToken() {
    if (isLocalPreviewHost() || !RECAPTCHA_SITE_KEY || RECAPTCHA_SITE_KEY.indexOf('PASTE_') === 0) {
      return Promise.resolve('');
    }
    return loadRecaptcha().then(function () {
      return new Promise(function (resolve) {
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        resolve('');
        return;
      }
      window.grecaptcha.ready(function () {
        window.grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action: 'subscribe' })
          .then(resolve)
          .catch(function () { resolve(''); });
      });
    });
    });
  }

  // Honeypot + time-trap: bots that fill hidden fields or submit within a
  // couple seconds of the form appearing get quietly rejected server side.
  function addSpamTraps(form) {
    if (form.querySelector('[data-hp-field]')) return;

    var wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;';

    var hp = document.createElement('input');
    hp.type = 'text';
    hp.name = 'website';
    hp.setAttribute('data-hp-field', '');
    hp.setAttribute('tabindex', '-1');
    hp.setAttribute('autocomplete', 'off');
    wrap.appendChild(hp);
    form.appendChild(wrap);

    var ts = document.createElement('input');
    ts.type = 'hidden';
    ts.name = 'ts';
    ts.setAttribute('data-ts-field', '');
    ts.value = String(Date.now());
    form.appendChild(ts);

  }

  function wireForm(form, options) {
    var scope = form.parentElement || document;
    var btn = form.querySelector('[type="submit"]');
    var ok = scope.querySelector('[data-fs-success]');
    var err = scope.querySelector('[data-fs-error]');
    var label = btn ? btn.textContent : options.defaultLabel;
    if (options.newsletter) addSpamTraps(form);
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
      var buildAndSend = function (recaptchaToken) {
        if (options.json) {
          var payload = {};
          formData.forEach(function (value, key) {
            payload[key] = value;
          });
          payload.page = window.location.pathname || '/';
          if (recaptchaToken) payload.recaptchaToken = recaptchaToken;
          request.headers['Content-Type'] = 'application/json';
          request.body = JSON.stringify(payload);
        } else {
          request.body = formData;
        }
        sendRequest();
      };
      var sendRequest = function () {
        fetch(form.action, request).then(handleResponse).catch(handleNetworkError);
      };
      function handleResponse(res) {
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
      }
      function handleNetworkError() {
        if (err) err.textContent = 'Network error. Please try again.';
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }
      if (options.newsletter) {
        getRecaptchaToken().then(buildAndSend);
      } else {
        buildAndSend();
      }
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
      successText: 'Thank you. Your message has been sent to the studio.',
      json: true
    });
  });
})();
