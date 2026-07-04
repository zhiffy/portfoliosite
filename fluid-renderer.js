/* ============================================================
   Shavonne Wong - WebGL ripple displacement
   WebGL renders an invisible displacement map. An SVG
   feDisplacementMap uses that map to bend the actual page content.
   ============================================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  if (reduceMotion.matches || !finePointer.matches) return;

  const rippleTargetSelector = '[data-stage], .ab-main, .abv-main, .bp2-main, .wk-main, .wk2-panels, .wr-main, .sp-main, .av-main, .ct-main, .nl-letter, .sp-screen-main';
  const rippleTarget = document.querySelector(rippleTargetSelector);
  if (!rippleTarget) return;
  if (rippleTarget.hasAttribute('data-no-ripple')) return;
  const isHomeTarget = rippleTarget.matches('[data-stage]');
  // Dense text pages (About bio + ledger, studio notes) get a gentler warp so
  // body text stays readable; media-led pages keep the stronger one.
  const isDenseTarget = !isHomeTarget && rippleTarget.matches('.abv-main, .nl-letter');
  const initialTargetRect = rippleTarget.getBoundingClientRect();
  const targetWidth = Math.max(window.innerWidth, initialTargetRect.width || 0);
  const targetHeight = Math.max(window.innerHeight, initialTargetRect.height || 0, rippleTarget.scrollHeight || 0);
  // Very tall pages re-rasterise a huge layer per frame; halve their tick rate.
  const isTallTarget = !isHomeTarget && targetHeight > window.innerHeight * 2.5;
  const clamp = (min, value, max) => Math.max(min, Math.min(max, value));

  const MAX_RIPPLES = 28;
  // Keep the map small: it is PNG-encoded every frame, so its pixel count is
  // the main per-frame cost on long pages like About.
  const MAP_W = 420;
  const MAP_H = isHomeTarget ? 260 : 300;
  const FILTER_ID = 'snWebglRippleDisplace';
  const HEADER_FILTER_ID = 'snWebglRippleDisplaceExtra';
  const MAP_ID = 'snWebglRippleMap';
  const DISPLACE_ID = 'snWebglRippleDisplaceNode';
  // Extra ripple target outside the main filtered element. On the works page
  // the big "Works." headline lives outside .wk2-panels (which is scoped to
  // protect the sticky tabbar), so it gets its own filter instance whose map
  // is repositioned each frame to stay in sync with the page.
  const headerEl = document.querySelector('.wk2-cat-head');
  const mouseEffectKey = 'sw-mouse-effect';
  const readMouseEffectEnabled = () => {
    try { return window.localStorage.getItem(mouseEffectKey) !== 'off'; } catch (error) { return true; }
  };
  let rippleEnabled = readMouseEffectEnabled() && !document.documentElement.classList.contains('sn-mouse-effect-off');

  const neutralPixel =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="rgb(128,128,128)"/></svg>');

  const svgNS = 'http://www.w3.org/2000/svg';
  const defsSvg = document.createElementNS(svgNS, 'svg');
  defsSvg.classList.add('sn-ripple-defs');
  defsSvg.setAttribute('aria-hidden', 'true');
  defsSvg.setAttribute('focusable', 'false');
  defsSvg.setAttribute('width', '0');
  defsSvg.setAttribute('height', '0');

  const defs = document.createElementNS(svgNS, 'defs');
  const filter = document.createElementNS(svgNS, 'filter');
  filter.setAttribute('id', FILTER_ID);
  // Same geometry as the homepage on every page: the filter region is exactly
  // the element's own box. An expanded region (the old -6%/112%) leaves a
  // margin the displacement map never covers, which painted a ghost strip of
  // duplicated edge pixels outside the content on works/press/writing.
  filter.setAttribute('x', '0');
  filter.setAttribute('y', '0');
  filter.setAttribute('width', '100%');
  filter.setAttribute('height', '100%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  if (!isHomeTarget) filter.setAttribute('primitiveUnits', 'userSpaceOnUse');

  const feImage = document.createElementNS(svgNS, 'feImage');
  feImage.setAttribute('id', MAP_ID);
  feImage.setAttribute('href', neutralPixel);
  feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', neutralPixel);
  feImage.setAttribute('result', 'rippleMap');
  feImage.setAttribute('preserveAspectRatio', 'none');
  // No explicit width/height: the map defaults to the filter region, exactly
  // as on the homepage, so it always spans the element edge-to-edge.

  const feDisplace = document.createElementNS(svgNS, 'feDisplacementMap');
  feDisplace.setAttribute('id', DISPLACE_ID);
  feDisplace.setAttribute('in', 'SourceGraphic');
  feDisplace.setAttribute('in2', 'rippleMap');
  feDisplace.setAttribute('scale', '0');
  feDisplace.setAttribute('xChannelSelector', 'R');
  feDisplace.setAttribute('yChannelSelector', 'G');

  filter.append(feImage, feDisplace);
  defs.appendChild(filter);

  let headerFeImage = null;
  let headerFeDisplace = null;
  if (headerEl) {
    const headerFilter = document.createElementNS(svgNS, 'filter');
    headerFilter.setAttribute('id', HEADER_FILTER_ID);
    headerFilter.setAttribute('x', '0');
    headerFilter.setAttribute('y', '0');
    headerFilter.setAttribute('width', '100%');
    headerFilter.setAttribute('height', '100%');
    headerFilter.setAttribute('color-interpolation-filters', 'sRGB');
    headerFilter.setAttribute('primitiveUnits', 'userSpaceOnUse');
    headerFeImage = document.createElementNS(svgNS, 'feImage');
    headerFeImage.setAttribute('href', neutralPixel);
    headerFeImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', neutralPixel);
    headerFeImage.setAttribute('result', 'rippleMap');
    headerFeImage.setAttribute('preserveAspectRatio', 'none');
    headerFeDisplace = document.createElementNS(svgNS, 'feDisplacementMap');
    headerFeDisplace.setAttribute('in', 'SourceGraphic');
    headerFeDisplace.setAttribute('in2', 'rippleMap');
    headerFeDisplace.setAttribute('scale', '0');
    headerFeDisplace.setAttribute('xChannelSelector', 'R');
    headerFeDisplace.setAttribute('yChannelSelector', 'G');
    headerFilter.append(headerFeImage, headerFeDisplace);
    defs.appendChild(headerFilter);
  }

  defsSvg.appendChild(defs);
  document.body.prepend(defsSvg);

  const canvas = document.createElement('canvas');
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  });

  if (!gl) {
    defsSvg.remove();
    return;
  }

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;

    #define MAX_RIPPLES 28

    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec4 u_ripples[MAX_RIPPLES];
    uniform vec3 u_pointer;
    const float EFFECT_WIDTH = 1.2;

    void main() {
      vec2 flow = vec2(0.0);

      for (int i = 0; i < MAX_RIPPLES; i++) {
        vec4 r = u_ripples[i];
        float age = u_time - r.z;
        float active = step(0.0, age) * (1.0 - smoothstep(0.78, 1.35, age));
        vec2 delta = (v_uv - r.xy) * u_resolution;
        float d = max(length(delta), 0.0001);
        vec2 dir = normalize(delta);

        float radius = age * 92.0 * EFFECT_WIDTH;
        float width = mix(4.0, 12.0, clamp(age / 1.35, 0.0, 1.0)) * EFFECT_WIDTH;
        float ring = exp(-pow((d - radius) / width, 2.0));
        float wave = sin((d - radius) * (0.10 / EFFECT_WIDTH) - age * 8.0);
        float decay = exp(-age * 2.35);
        flow += dir * ring * wave * decay * r.w * active * 0.82;
      }

      vec2 pointerDelta = (v_uv - u_pointer.xy) * u_resolution;
      float pd = max(length(pointerDelta), 0.0001);
      vec2 pdir = normalize(pointerDelta);
      float lens = exp(-pd * pd * (0.0028 / (EFFECT_WIDTH * EFFECT_WIDTH))) * u_pointer.z;
      float wake = sin(pd * (0.075 / EFFECT_WIDTH) - u_time * 7.0) * 0.18 + 0.68;
      flow += pdir * lens * wake * 0.079;

      flow = clamp(flow, vec2(-0.38), vec2(0.38));
      vec2 encoded = 0.5 + flow;
      gl_FragColor = vec4(encoded, 0.5, 1.0);
    }
  `;

  function makeShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Ripple shader failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = makeShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = makeShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    defsSvg.remove();
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Ripple program failed:', gl.getProgramInfoLog(program));
    defsSvg.remove();
    return;
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1
  ]), gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, 'u_resolution');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uRipples = gl.getUniformLocation(program, 'u_ripples[0]');
  const uPointer = gl.getUniformLocation(program, 'u_pointer');

  gl.viewport(0, 0, MAP_W, MAP_H);

  let start = performance.now();
  let raf = 0;
  let lastDraw = 0;
  let rippleIndex = 0;
  let lastX = window.innerWidth * 0.5;
  let lastY = window.innerHeight * 0.5;
  let lastSpawnX = lastX;
  let lastSpawnY = lastY;
  let lastMove = 0;
  let pointerActive = 0;
  let currentScale = 0;
  const ripples = new Float32Array(MAX_RIPPLES * 4);
  for (let i = 0; i < MAX_RIPPLES; i++) {
    ripples[i * 4] = -10;
    ripples[i * 4 + 1] = -10;
    ripples[i * 4 + 2] = -100;
    ripples[i * 4 + 3] = 0;
  }

  function rippleTargetRect() {
    const rect = rippleTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  function pointerUv(x, y, rect = rippleTargetRect()) {
    if (!isHomeTarget) {
      // Subpages work in viewport space: the map covers exactly the visible
      // screen (like the homepage stage), so ripple detail never dilutes on
      // long documents.
      return [
        Math.max(0, Math.min(1, x / Math.max(1, window.innerWidth))),
        Math.max(0, Math.min(1, 1 - (y / Math.max(1, window.innerHeight))))
      ];
    }
    return [
      Math.max(0, Math.min(1, (x - rect.left) / Math.max(1, rect.width))),
      Math.max(0, Math.min(1, 1 - ((y - rect.top) / Math.max(1, rect.height))))
    ];
  }

  function requestRender() {
    if (rippleEnabled && !raf) raf = window.requestAnimationFrame(render);
  }

  function clearRipple() {
    document.documentElement.classList.remove('sn-ripple-filter-on');
    feDisplace.setAttribute('scale', '0');
    feImage.setAttribute('href', neutralPixel);
    feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', neutralPixel);
    if (headerFeDisplace) headerFeDisplace.setAttribute('scale', '0');
    if (headerFeImage) {
      headerFeImage.setAttribute('href', neutralPixel);
      headerFeImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', neutralPixel);
    }
    currentScale = 0;
    pointerActive = 0;
  }

  function setRippleEnabled(enabled) {
    rippleEnabled = !!enabled;
    document.documentElement.classList.toggle('sn-mouse-effect-off', !rippleEnabled);
    if (rippleEnabled) {
      requestRender();
    } else {
      clearRipple();
    }
  }

  function spawnRipple(x, y, strength) {
    if (!rippleEnabled) return;
    const uv = pointerUv(x, y);
    const i = rippleIndex * 4;
    ripples[i] = uv[0];
    ripples[i + 1] = uv[1];
    ripples[i + 2] = (performance.now() - start) / 1000;
    ripples[i + 3] = strength;
    rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
    requestRender();
  }

  function render(now) {
    raf = 0;
    if (!rippleEnabled) {
      clearRipple();
      return;
    }
    if (isTallTarget && now - lastDraw < 30) {
      requestRender();
      return;
    }
    lastDraw = now;
    const time = (now - start) / 1000;
    const wantsPointer = (now - lastMove) < 520 ? 1 : 0;

    let hasLiveRipple = false;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (time - ripples[i * 4 + 2] < 1.35) {
        hasLiveRipple = true;
        break;
      }
    }

    const scaleKick = isHomeTarget ? 11.52 : 9.2;
    const scaleTarget = isHomeTarget ? 25.92 : 18.4;
    const scaleEase = 0.20;

    pointerActive += (wantsPointer - pointerActive) * 0.11;
    if (wantsPointer) currentScale = Math.max(currentScale, scaleKick);
    currentScale += (((wantsPointer || hasLiveRipple) ? scaleTarget : 0) - currentScale) * scaleEase;

    const rect = rippleTargetRect();
    const uv = pointerUv(lastX, lastY, rect);
    const resW = isHomeTarget ? Math.max(1, rect.width) : window.innerWidth;
    const resH = isHomeTarget ? Math.max(1, rect.height) : window.innerHeight;
    gl.useProgram(program);
    gl.viewport(0, 0, MAP_W, MAP_H);
    gl.uniform2f(uResolution, resW, resH);
    gl.uniform1f(uTime, time);
    gl.uniform4fv(uRipples, ripples);
    gl.uniform3f(uPointer, uv[0], uv[1], pointerActive);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const mapUrl = canvas.toDataURL('image/png');
    if (!isHomeTarget) {
      // Pin the map to the viewport, expressed in the element's local coords.
      feImage.setAttribute('x', (-rect.left).toFixed(1));
      feImage.setAttribute('y', (-rect.top).toFixed(1));
      feImage.setAttribute('width', window.innerWidth);
      feImage.setAttribute('height', window.innerHeight);
    }
    feImage.setAttribute('href', mapUrl);
    feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', mapUrl);
    feDisplace.setAttribute('scale', currentScale.toFixed(2));
    if (headerFeImage && headerFeDisplace) {
      const headerRect = headerEl.getBoundingClientRect();
      headerFeImage.setAttribute('x', (-headerRect.left).toFixed(1));
      headerFeImage.setAttribute('y', (-headerRect.top).toFixed(1));
      headerFeImage.setAttribute('width', window.innerWidth);
      headerFeImage.setAttribute('height', window.innerHeight);
      headerFeImage.setAttribute('href', mapUrl);
      headerFeImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', mapUrl);
      headerFeDisplace.setAttribute('scale', currentScale.toFixed(2));
    }
    document.documentElement.classList.toggle('sn-ripple-filter-on', currentScale > 0.35);

    if (hasLiveRipple || pointerActive > 0.01 || currentScale > 0.35) requestRender();
    else {
      clearRipple();
    }
  }

  function handlePointerMove(event) {
    if (!rippleEnabled) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    const speed = Math.hypot(dx, dy);
    lastX = event.clientX;
    lastY = event.clientY;
    lastMove = performance.now();

    const spawnDistance = Math.hypot(lastX - lastSpawnX, lastY - lastSpawnY);
    if (spawnDistance > 26 || speed > 36) {
      const strengthCap = 0.94;
      const strengthBase = 0.29;
      const strengthDivisor = 150;
      spawnRipple(lastX, lastY, Math.min(strengthCap, strengthBase + speed / strengthDivisor));
      lastSpawnX = lastX;
      lastSpawnY = lastY;
    } else {
      requestRender();
    }
  }

  function handlePointerDown(event) {
    if (!rippleEnabled) return;
    lastX = event.clientX;
    lastY = event.clientY;
    lastMove = performance.now();
    spawnRipple(lastX, lastY, 1.08);
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('pointerenter', handlePointerMove, { passive: true });
  window.addEventListener('mousemove', handlePointerMove, { passive: true });
  window.addEventListener('mousedown', handlePointerDown, { passive: true });
  window.addEventListener('sw:ripple-toggle', (event) => {
    setRippleEnabled(!!(event.detail && event.detail.enabled));
  });
  window.addEventListener('storage', (event) => {
    if (event.key === mouseEffectKey) setRippleEnabled(event.newValue !== 'off');
  });
  window.addEventListener('blur', () => {
    clearRipple();
  });
  if (!rippleEnabled) clearRipple();
})();
