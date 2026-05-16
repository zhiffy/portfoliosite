(function () {
  'use strict';

  const canvas = document.querySelector('[data-fluid-renderer]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  if (!canvas || reduceMotion || coarsePointer) {
    if (canvas) canvas.style.display = 'none';
    return;
  }

  if (window.__snFluidRenderer && typeof window.__snFluidRenderer.destroy === 'function') {
    window.__snFluidRenderer.destroy();
  }

  const refractLayer = document.createElement('div');
  refractLayer.className = 'sn-refract-layer';
  refractLayer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(refractLayer);

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  });

  if (!gl) {
    canvas.style.display = 'none';
    if (refractLayer.parentNode) refractLayer.parentNode.removeChild(refractLayer);
    return;
  }

  const SPLAT_COUNT = 16;
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

    #define SPLAT_COUNT 16

    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec4 u_splats[SPLAT_COUNT];
    uniform vec2 u_velocities[SPLAT_COUNT];

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;

      for (int i = 0; i < 4; i++) {
        v += noise(p) * a;
        p = p * 2.03 + 7.17;
        a *= 0.5;
      }

      return v;
    }

    void main() {
      vec2 uv = v_uv;
      float aspect = u_resolution.x / max(u_resolution.y, 1.0);
      vec2 flow = vec2(0.0);
      float body = 0.0;
      float rings = 0.0;
      float edge = 0.0;

      for (int i = 0; i < SPLAT_COUNT; i++) {
        vec4 splat = u_splats[i];
        vec2 velocity = u_velocities[i];
        float age = splat.z;
        float strength = splat.w;
        float life = smoothstep(1.0, 0.0, age) * strength;

        vec2 p = uv - splat.xy;
        p.x *= aspect;

        float d = length(p);
        vec2 dir = d > 0.0001 ? p / d : vec2(0.0);
        vec2 tangent = vec2(-dir.y, dir.x);
        vec2 vel = velocity;
        vel.x *= aspect;

        float speed = clamp(length(velocity) * 9.0, 0.0, 1.0);
        float radius = 0.045 + age * 0.25 + strength * 0.024;
        float core = smoothstep(radius, 0.0, d) * life;
        float wake = exp(-d * (12.0 - speed * 4.0)) * life;
        float wave = sin(d * 84.0 - age * 17.0 + u_time * 1.35) * exp(-d * 8.5) * life;

        flow += dir * wave * 0.013;
        flow += tangent * core * (0.014 + speed * 0.007);
        flow += vel * wake * 0.026;
        body += core * (0.44 + speed * 0.32);
        rings += abs(wave) * (0.26 + speed * 0.24);
        edge += smoothstep(radius * 1.10, radius * 0.70, d) * life * 0.26;
      }

      vec2 warped = uv + flow;
      float grain = fbm(warped * 9.0 + vec2(u_time * 0.045, -u_time * 0.035));
      float caustic = sin((warped.x + flow.x * 9.0) * 43.0 + u_time * 1.5);
      caustic *= sin((warped.y - flow.y * 8.0) * 31.0 - u_time * 1.2);
      caustic = smoothstep(0.30, 1.0, caustic * 0.5 + 0.5) * clamp(body + rings, 0.0, 1.0);

      float alpha = clamp(body * 0.05 + rings * 0.24 + caustic * 0.18 + edge * 0.22, 0.0, 0.52);
      vec3 color = mix(vec3(0.90, 0.92, 1.0), vec3(1.0), grain * 0.30 + caustic * 0.70);
      color += pow(clamp(rings + caustic, 0.0, 1.0), 1.65) * vec3(0.11);

      gl_FragColor = vec4(color, alpha);
    }
  `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Fluid shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  function createProgram() {
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Fluid program link failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  const program = createProgram();

  if (!program) {
    canvas.style.display = 'none';
    if (refractLayer.parentNode) refractLayer.parentNode.removeChild(refractLayer);
    return;
  }

  const vertices = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1
  ]);
  const buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.useProgram(program);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const splatsLocation = gl.getUniformLocation(program, 'u_splats[0]');
  const velocitiesLocation = gl.getUniformLocation(program, 'u_velocities[0]');

  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);

  const splats = Array.from({ length: SPLAT_COUNT }, () => ({
    x: 0.5,
    y: 0.5,
    age: 2,
    strength: 0,
    vx: 0,
    vy: 0
  }));
  const splatData = new Float32Array(SPLAT_COUNT * 4);
  const velocityData = new Float32Array(SPLAT_COUNT * 2);

  let width = 1;
  let height = 1;
  let rafId = 0;
  let lastFrame = performance.now();
  let lastMove = 0;
  let lastSplat = 0;
  let lastPointer = null;
  let activePointer = false;
  let running = false;
  let currentPoint = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  let targetPoint = { x: currentPoint.x, y: currentPoint.y };
  let lensVelocity = { x: 0, y: 0 };
  let lensStrength = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    width = Math.max(1, Math.floor(window.innerWidth * dpr));
    height = Math.max(1, Math.floor(window.innerHeight * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function requestFrame() {
    if (running) return;
    running = true;
    lastFrame = performance.now();
    rafId = window.requestAnimationFrame(render);
  }

  function oldestSlot() {
    let index = 0;
    let maxAge = -1;

    for (let i = 0; i < SPLAT_COUNT; i++) {
      if (splats[i].age > maxAge) {
        maxAge = splats[i].age;
        index = i;
      }
    }

    return index;
  }

  function addSplat(x, y, vx, vy, strength) {
    const slot = splats[oldestSlot()];
    slot.x = x;
    slot.y = y;
    slot.vx = Math.max(-0.18, Math.min(0.18, vx));
    slot.vy = Math.max(-0.18, Math.min(0.18, vy));
    slot.age = 0;
    slot.strength = strength;
  }

  function normalizedPointer(event) {
    const px = Math.max(0, Math.min(window.innerWidth, event.clientX));
    const py = Math.max(0, Math.min(window.innerHeight, event.clientY));

    return {
      x: Math.max(0, Math.min(1, px / Math.max(window.innerWidth, 1))),
      y: 1 - Math.max(0, Math.min(1, py / Math.max(window.innerHeight, 1))),
      px,
      py
    };
  }

  function onPointerMove(event) {
    const now = performance.now();
    const point = normalizedPointer(event);
    targetPoint = { x: point.px, y: point.py };

    if (!lastPointer) {
      currentPoint = { x: point.px, y: point.py };
      lastPointer = { x: point.x, y: point.y, px: point.px, py: point.py, time: now };
      addSplat(point.x, point.y, 0, 0, 0.7);
      lensStrength = Math.max(lensStrength, 0.62);
      lastMove = now;
      activePointer = true;
      requestFrame();
      return;
    }

    const elapsed = Math.max(16, now - lastPointer.time);
    const vx = ((point.x - lastPointer.x) / elapsed) * 16.67;
    const vy = ((point.y - lastPointer.y) / elapsed) * 16.67;
    const dx = point.x - lastPointer.x;
    const dy = point.y - lastPointer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const pxVelocityX = ((point.px - lastPointer.px) / elapsed) * 16.67;
    const pxVelocityY = ((point.py - lastPointer.py) / elapsed) * 16.67;
    lensVelocity.x = lensVelocity.x * 0.48 + pxVelocityX * 0.52;
    lensVelocity.y = lensVelocity.y * 0.48 + pxVelocityY * 0.52;
    lensStrength = Math.min(1, Math.max(lensStrength, 0.24 + distance * 74));

    if (distance > 0.003 || now - lastSplat > 80) {
      const speed = Math.min(1, distance * 55);
      addSplat(point.x, point.y, vx, vy, 0.58 + speed * 0.52);
      lastSplat = now;
    }

    lastPointer = { x: point.x, y: point.y, px: point.px, py: point.py, time: now };
    lastMove = now;
    activePointer = true;
    requestFrame();
  }

  function onPointerDown(event) {
    const point = normalizedPointer(event);
    const vx = lastPointer ? point.x - lastPointer.x : 0;
    const vy = lastPointer ? point.y - lastPointer.y : 0;

    addSplat(point.x, point.y, vx * 4, vy * 4, 1.45);
    targetPoint = { x: point.px, y: point.py };
    lensStrength = 1;
    lastMove = performance.now();
    activePointer = true;
    window.setTimeout(() => addSplat(point.x, point.y, -vy * 2, vx * 2, 0.85), 80);
    requestFrame();
  }

  function onPointerLeave() {
    activePointer = false;
    lastPointer = null;
  }

  function uploadSplats(dt) {
    for (let i = 0; i < SPLAT_COUNT; i++) {
      const splat = splats[i];
      splat.age += dt * (activePointer ? 0.52 : 0.66);
      if (splat.age > 1.2) splat.strength *= 0.94;
      if (splat.strength < 0.003 || splat.age > 1.85) {
        splat.age = 2;
        splat.strength = 0;
        splat.vx = 0;
        splat.vy = 0;
      }

      const splatOffset = i * 4;
      splatData[splatOffset] = splat.x;
      splatData[splatOffset + 1] = splat.y;
      splatData[splatOffset + 2] = splat.age;
      splatData[splatOffset + 3] = splat.strength;

      const velocityOffset = i * 2;
      velocityData[velocityOffset] = splat.vx;
      velocityData[velocityOffset + 1] = splat.vy;
    }
  }

  function clampPx(value, limit) {
    return Math.max(-limit, Math.min(limit, value));
  }

  function updateRefractiveLens(dt, now) {
    if (!refractLayer) return;

    const follow = 1 - Math.pow(0.0008, dt);
    currentPoint.x += (targetPoint.x - currentPoint.x) * follow;
    currentPoint.y += (targetPoint.y - currentPoint.y) * follow;
    lensVelocity.x *= Math.pow(0.02, dt);
    lensVelocity.y *= Math.pow(0.02, dt);
    lensStrength *= activePointer ? Math.pow(0.56, dt) : Math.pow(0.18, dt);

    const speed = Math.min(1, Math.hypot(lensVelocity.x, lensVelocity.y) / 30);
    const visible = lensStrength > 0.035 || activePointer;
    const radius = visible ? 90 + speed * 42 + lensStrength * 20 : 0;
    const dx = clampPx(lensVelocity.x * -0.12, 10);
    const dy = clampPx(lensVelocity.y * -0.12, 10);
    const scale = 1 + speed * 0.009 + lensStrength * 0.003;
    const blur = Math.min(3.8, 1.15 + speed * 1.75 + lensStrength * 0.75);

    refractLayer.classList.toggle('is-visible', visible);
    refractLayer.style.setProperty('--sn-refract-x', `${currentPoint.x.toFixed(2)}px`);
    refractLayer.style.setProperty('--sn-refract-y', `${currentPoint.y.toFixed(2)}px`);
    refractLayer.style.setProperty('--sn-refract-radius', `${radius.toFixed(2)}px`);
    refractLayer.style.setProperty('--sn-refract-dx', `${dx.toFixed(2)}px`);
    refractLayer.style.setProperty('--sn-refract-dy', `${dy.toFixed(2)}px`);
    refractLayer.style.setProperty('--sn-refract-scale', scale.toFixed(4));
    refractLayer.style.setProperty('--sn-refract-blur', `${blur.toFixed(2)}px`);
  }

  function render(now) {
    const dt = Math.min(0.04, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;

    if (activePointer && now - lastMove > 1600) activePointer = false;

    resize();
    uploadSplats(dt);
    updateRefractiveLens(dt, now);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(resolutionLocation, width, height);
    gl.uniform1f(timeLocation, now * 0.001);
    gl.uniform4fv(splatsLocation, splatData);
    gl.uniform2fv(velocitiesLocation, velocityData);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const hasSplats = splats.some((splat) => splat.strength > 0.003 && splat.age < 1.85);
    const hasLens = activePointer || lensStrength > 0.012;

    if (hasSplats || hasLens) {
      rafId = window.requestAnimationFrame(render);
    } else {
      running = false;
      rafId = 0;
    }
  }

  function destroy() {
    window.cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerleave', onPointerLeave);
    if (refractLayer.parentNode) refractLayer.parentNode.removeChild(refractLayer);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  }

  function onResize() {
    resize();
    requestFrame();
  }

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });

  resize();
  requestFrame();
  window.__snFluidRenderer = { destroy };
})();
