/* Studio-notes newsletter and contact forms. Newsletter signups and contact
   messages go through private same-origin site endpoints. */
(function () {
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
      successText: 'Thank you. Your message has been sent to the studio.',
      json: true
    });
  });
})();
