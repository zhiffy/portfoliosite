/* Studio-notes newsletter and contact forms. Newsletter signups and contact
   messages go through private same-origin site endpoints. */
(function () {
  // Cloudflare Turnstile guards the newsletter form. The site key is public;
  // the secret stays server-side in the Netlify env var TURNSTILE_SECRET.
  // The widget is invisible unless Cloudflare needs the visitor to tick a box.
  var TURNSTILE_SITE_KEY = '0x4AAAAAAFvmLe4vG-qg2pj8';
  // Cloudflare's always-pass test key, used only on local preview hosts.
  var TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
  var TURNSTILE_ACTION = 'subscribe'; // must match lib/brevo-subscribe.js
  var TURNSTILE_WAIT_MS = 20000;
  var turnstileLoadPromise = null;

  function isLocalPreviewHost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1';
  }

  function loadTurnstile() {
    if (turnstileLoadPromise) return turnstileLoadPromise;
    turnstileLoadPromise = new Promise(function (resolve) {
      if (window.turnstile && window.turnstile.render) {
        resolve(true);
        return;
      }
      window.__swTurnstileReady = function () { resolve(true); };
      var script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__swTurnstileReady';
      script.async = true;
      script.defer = true;
      script.onerror = function () {
        turnstileLoadPromise = null; // let a later attempt try again
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return turnstileLoadPromise;
  }

  // One widget per form, rendered just after it so an interactive check
  // never squeezes the input and button row.
  function turnstileState(form) {
    if (form._swTurnstile) return form._swTurnstile;
    var container = document.createElement('div');
    container.className = 'sw-turnstile';
    // Out of the layout (no flex gap, no shift) until Cloudflare actually
    // needs the visitor to see it.
    container.style.position = 'absolute';
    form.parentNode.insertBefore(container, form.nextSibling);
    form._swTurnstile = { container: container, widgetId: null, rendering: false, token: '', waiters: [] };
    return form._swTurnstile;
  }

  function showTurnstile(state, visible) {
    state.container.style.position = visible ? '' : 'absolute';
  }

  function settleTurnstile(state, token) {
    state.token = token || '';
    var waiters = state.waiters;
    state.waiters = [];
    waiters.forEach(function (resolve) { resolve(state.token); });
  }

  // Started as soon as the visitor reaches for the form, so the token is
  // usually ready by the time they press Subscribe.
  function prepareTurnstile(form) {
    var state = turnstileState(form);
    if (state.widgetId !== null || state.rendering) return;
    state.rendering = true;
    loadTurnstile().then(function (loaded) {
      state.rendering = false;
      if (!loaded || !window.turnstile) {
        settleTurnstile(state, '');
        return;
      }
      try {
        state.widgetId = window.turnstile.render(state.container, {
          sitekey: isLocalPreviewHost() ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY,
          action: TURNSTILE_ACTION,
          appearance: 'interaction-only',
          'response-field': false,
          callback: function (token) { settleTurnstile(state, token); },
          'expired-callback': function () { state.token = ''; },
          'before-interactive-callback': function () { showTurnstile(state, true); },
          'after-interactive-callback': function () { showTurnstile(state, false); },
          // Let the visitor see Cloudflare's message if the check cannot run.
          'error-callback': function () { state.token = ''; showTurnstile(state, true); },
          'unsupported-callback': function () { showTurnstile(state, true); }
        });
      } catch (e) {
        settleTurnstile(state, '');
      }
    });
  }

  function getTurnstileToken(form) {
    var state = turnstileState(form);
    if (state.token) return Promise.resolve(state.token);
    prepareTurnstile(form);
    return new Promise(function (resolve) {
      var settled = false;
      var finish = function (token) {
        if (settled) return;
        settled = true;
        resolve(token || '');
      };
      state.waiters.push(finish);
      window.setTimeout(function () { finish(state.token); }, TURNSTILE_WAIT_MS);
    });
  }

  // Tokens are single-use, so get a fresh one after every attempt.
  function resetTurnstile(form) {
    var state = form._swTurnstile;
    if (!state) return;
    state.token = '';
    if (state.widgetId !== null && window.turnstile) {
      try { window.turnstile.reset(state.widgetId); } catch (e) {}
    }
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
    if (options.newsletter) {
      addSpamTraps(form);
      var warmUp = function () { prepareTurnstile(form); };
      form.addEventListener('focusin', warmUp);
      form.addEventListener('pointerdown', warmUp);
    }
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
      var buildAndSend = function (turnstileToken) {
        if (options.json) {
          var payload = {};
          formData.forEach(function (value, key) {
            payload[key] = value;
          });
          payload.page = window.location.pathname || '/';
          if (turnstileToken) payload.turnstileToken = turnstileToken;
          request.headers['Content-Type'] = 'application/json';
          request.body = JSON.stringify(payload);
        } else {
          request.body = formData;
        }
        sendRequest();
      };
      var sendRequest = function () {
        fetch(form.action, request).then(handleResponse).catch(handleNetworkError).then(function () {
          if (options.newsletter) resetTurnstile(form);
        });
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
        getTurnstileToken(form).then(buildAndSend);
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
