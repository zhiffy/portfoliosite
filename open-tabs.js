/* Open Tabs
   Builds the contour field from the entries already present in the DOM list.
   The list is the source of truth. If this script never runs, the page is still
   complete and readable.

   Motion: a slow turbulence warp on the field only, low amplitude, so the page
   reads as alive without anyone having to move a pointer to read it. Text is
   never rendered into canvas and never sits below normal contrast. */
(function () {
  'use strict';

  var root = document.querySelector('[data-open-tabs]');
  if (!root) return;

  var svg = root.querySelector('[data-ot-field]');
  var listWrap = root.querySelector('[data-ot-list]');
  var tabs = root.querySelectorAll('[data-ot-tab]');
  if (!svg || !listWrap) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var W = 1000, H = 620;

  /* ---------- read entries out of the DOM ---------- */
  var entries = Array.prototype.map.call(root.querySelectorAll('.ot-entry'), function (el) {
    return {
      id: el.id,
      title: el.getAttribute('data-short') || (el.querySelector('.ot-entry-title') || {}).textContent || '',
      regions: (el.getAttribute('data-regions') || '').split(/\s+/).filter(Boolean)
    };
  });
  if (!entries.length) return;

  var regionEls = Array.prototype.map.call(root.querySelectorAll('[data-region-def]'), function (el) {
    return { id: el.getAttribute('data-region-def'), name: el.getAttribute('data-region-name') || '' };
  });
  if (!regionEls.length) return;

  /* ---------- anchors, one per region, spread around the field ---------- */
  var cx = W / 2, cy = H / 2;
  var rx = W * 0.31, ry = H * 0.29;
  regionEls.forEach(function (r, i) {
    var a = (i / regionEls.length) * Math.PI * 2 - Math.PI / 2;
    r.x = cx + Math.cos(a) * rx;
    r.y = cy + Math.sin(a) * ry;
  });
  var byId = {};
  regionEls.forEach(function (r) { byId[r.id] = r; });

  /* ---------- place each entry near its region, or between its regions ---------- */
  function hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return Math.abs(h); }

  entries.forEach(function (e) {
    var mine = e.regions.map(function (id) { return byId[id]; }).filter(Boolean);
    if (!mine.length) mine = [regionEls[0]];
    var ax = 0, ay = 0;
    mine.forEach(function (r) { ax += r.x; ay += r.y; });
    ax /= mine.length; ay /= mine.length;
    var h = hash(e.id);
    var ang = (h % 360) * Math.PI / 180;
    var rad = 34 + (h % 52);
    e.x = Math.max(96, Math.min(W - 96, ax + Math.cos(ang) * rad));
    e.y = Math.max(60, Math.min(H - 44, ay + Math.sin(ang) * rad * 0.72));
    e.members = mine;
  });

  /* ---------- push labels apart so nothing overlaps ---------- */
  function relax(items, passes) {
    var i, j, a, b, k;
    for (k = 0; k < passes; k++) {
      for (i = 0; i < items.length; i++) {
        for (j = i + 1; j < items.length; j++) {
          a = items[i]; b = items[j];
          var wA = (a.title.length * 5.6) / 2 + 16, wB = (b.title.length * 5.6) / 2 + 16;
          var dx = b.x - a.x, dy = b.y - a.y;
          var needX = wA + wB, needY = 26;
          var ox = needX - Math.abs(dx), oy = needY - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            if (oy / needY < ox / needX) {
              var sy = (dy >= 0 ? 1 : -1) * oy / 2;
              a.y -= sy; b.y += sy;
            } else {
              var sx = (dx >= 0 ? 1 : -1) * ox / 2;
              a.x -= sx; b.x += sx;
            }
          }
        }
      }
      items.forEach(function (p) {
        p.x = Math.max(110, Math.min(W - 110, p.x));
        p.y = Math.max(64, Math.min(H - 48, p.y));
      });
    }
  }
  relax(entries, 60);

  /* ---------- a loose closed curve around a set of points ---------- */
  function hull(points) {
    if (points.length < 3) {
      var p = points[0] || { x: cx, y: cy };
      return [
        { x: p.x - 70, y: p.y - 40 }, { x: p.x + 70, y: p.y - 40 },
        { x: p.x + 70, y: p.y + 40 }, { x: p.x - 70, y: p.y + 40 }
      ];
    }
    var pts = points.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
    var lower = [], upper = [], i;
    for (i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
      lower.push(pts[i]);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
      upper.push(pts[i]);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  /* pad outward from the centre, and hold a minimum radius so a region with
     only two or three entries still reads as a region rather than a sliver */
  function inflate(pts, pad, minR) {
    var mx = 0, my = 0;
    pts.forEach(function (p) { mx += p.x; my += p.y; });
    mx /= pts.length; my /= pts.length;
    return pts.map(function (p) {
      var dx = p.x - mx, dy = p.y - my;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var target = Math.max(d + pad, minR || 0);
      return { x: mx + (dx / d) * target, y: my + (dy / d) * target * 0.82 };
    });
  }

  function smoothPath(pts) {
    if (pts.length < 3) return '';
    var d = '', i, n = pts.length;
    for (i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (i === 0) d += 'M' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1);
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) +
           ',' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d + 'Z';
  }

  /* ---------- draw ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

  var defs = el('defs', {});
  var filter = el('filter', { id: 'otWarp', x: '-8%', y: '-8%', width: '116%', height: '116%' });
  var turb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.009', numOctaves: '2', seed: '7', result: 'n' });
  var disp = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '5', xChannelSelector: 'R', yChannelSelector: 'G' });
  filter.append(turb, disp);
  defs.appendChild(filter);
  svg.appendChild(defs);

  var stage = el('g', {});
  if (!reduceMotion.matches) stage.setAttribute('filter', 'url(#otWarp)');
  svg.appendChild(stage);

  var regionLayer = el('g', {});
  var nodeLayer = el('g', {});
  stage.append(regionLayer, nodeLayer);

  regionEls.forEach(function (r) {
    var mine = entries.filter(function (e) { return e.members.indexOf(r) !== -1; });
    var g = el('g', { class: 'ot-region' });
    g.setAttribute('data-region', r.id);
    var path = el('path', { class: 'ot-region-path', d: smoothPath(inflate(hull(mine.map(function (e) { return { x: e.x, y: e.y }; })), 52, 92)) });
    var label = el('text', { class: 'ot-region-label', x: r.x.toFixed(0), y: (r.y - 96).toFixed(0), 'text-anchor': 'middle' });
    label.textContent = r.name;
    g.append(path, label);
    regionLayer.appendChild(g);
  });

  entries.forEach(function (e) {
    var a = el('a', { class: 'ot-node', href: '#' + e.id, tabindex: '0' });
    a.setAttribute('data-regions', e.regions.join(' '));
    var t = el('text', { class: 'ot-node-text', x: e.x.toFixed(0), y: e.y.toFixed(0), 'text-anchor': 'middle' });
    t.textContent = e.title;
    a.appendChild(t);
    nodeLayer.appendChild(a);
  });

  /* ---------- lighting a region on hover ---------- */
  function lit(id) {
    Array.prototype.forEach.call(regionLayer.children, function (g) {
      g.classList.toggle('is-lit', !!id && g.getAttribute('data-region') === id);
    });
  }
  Array.prototype.forEach.call(regionLayer.children, function (g) {
    var id = g.getAttribute('data-region');
    g.addEventListener('mouseenter', function () { lit(id); });
    g.addEventListener('mouseleave', function () { lit(null); });
  });
  Array.prototype.forEach.call(nodeLayer.children, function (a) {
    var first = (a.getAttribute('data-regions') || '').split(/\s+/)[0];
    a.addEventListener('mouseenter', function () { lit(first); });
    a.addEventListener('focus', function () { lit(first); });
    a.addEventListener('mouseleave', function () { lit(null); });
    a.addEventListener('blur', function () { lit(null); });
  });

  /* ---------- slow ambient warp ---------- */
  if (!reduceMotion.matches) {
    var t0 = null;
    var loop = function (ts) {
      if (t0 === null) t0 = ts;
      var s = (ts - t0) / 1000;
      turb.setAttribute('baseFrequency', (0.0085 + Math.sin(s / 9) * 0.0022).toFixed(5));
      disp.setAttribute('scale', (4.6 + Math.sin(s / 6.5) * 1.5).toFixed(2));
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);
  }

  /* ---------- region filtering ---------- */
  var legend = root.querySelector('.ot-regions');
  var entryEls = root.querySelectorAll('.ot-entry');
  var countEl = root.querySelector('[data-ot-count]');
  var active = null;

  function applyFilter() {
    var shown = 0;
    Array.prototype.forEach.call(entryEls, function (el) {
      var regions = (el.getAttribute('data-regions') || '').split(/\s+/);
      var on = !active || regions.indexOf(active) !== -1;
      el.hidden = !on;
      if (on) shown++;
    });
    if (countEl) countEl.textContent = shown + (shown === 1 ? ' entry' : ' entries');
    if (legend) {
      Array.prototype.forEach.call(legend.children, function (g) {
        g.classList.toggle('is-off', !!active && g.getAttribute('data-region-def') !== active);
        g.setAttribute('aria-pressed', String(g.getAttribute('data-region-def') === active));
      });
    }
    lit(active);
  }

  if (legend) {
    Array.prototype.forEach.call(legend.children, function (g) {
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-pressed', 'false');
      function toggle() {
        var id = g.getAttribute('data-region-def');
        active = (active === id) ? null : id;
        applyFilter();
      }
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); }
      });
      g.addEventListener('mouseenter', function () { if (!active) lit(g.getAttribute('data-region-def')); });
      g.addEventListener('mouseleave', function () { if (!active) lit(null); });
    });
  }

  /* clicking a node in the field filters to its region and jumps to the entry */
  Array.prototype.forEach.call(nodeLayer.children, function (a) {
    a.addEventListener('click', function () {
      active = (a.getAttribute('data-regions') || '').split(/\s+/)[0] || null;
      applyFilter();
    });
  });

  /* ---------- view toggle ---------- */
  Array.prototype.forEach.call(tabs, function (btn) {
    btn.addEventListener('click', function () {
      var view = btn.getAttribute('data-ot-tab');
      Array.prototype.forEach.call(tabs, function (b) {
        b.setAttribute('aria-selected', String(b === btn));
      });
      listWrap.setAttribute('data-view', view);
      if (legend) legend.hidden = (view !== 'regions');
      if (view !== 'regions') { active = null; applyFilter(); }
    });
  });

  /* ---------- withheld count, honest about what is not shown ---------- */
  var withheldEl = root.querySelector('[data-ot-withheld]');
  var withheld = parseInt(root.getAttribute('data-withheld') || '0', 10);
  if (withheldEl && withheld > 0) {
    withheldEl.textContent = withheld + ' more entries exist and are not public.';
  }

  applyFilter();
})();
