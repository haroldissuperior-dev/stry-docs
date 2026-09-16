/**
 * stry docs — WebGL layer
 *  1. #gl-bg  : full-page domain-warped noise shader, theme-aware, mouse-reactive
 *  2. #gl-hero: interactive 3D devices (phones + laptop) — the mini screens are
 *               live: hover highlights, press states, and clicks that navigate
 *               the real documentation page.
 *
 * Progressive: if WebGL or the CDN fails, the CSS phones stay.
 * Honors the site motion toggle (data-motion) and theme (data-theme).
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const root = document.documentElement;
const motionOn = () => root.dataset.motion !== "off";
const isDark = () => root.dataset.theme === "dark";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const scenes = [];

/* ======================================================================
   1. background flow shader
   ====================================================================== */

const BG_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uDark;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 1.6;
  float t = uTime * 0.045;

  vec2 q = vec2(
    fbm(p + vec2(0.0, t) + uMouse * 0.30),
    fbm(p + vec2(5.2, t * 1.25) - uMouse * 0.35)
  );
  float n = fbm(p * 1.75 + q * 1.75 + uMouse * 0.18);

  vec3 lightBase = vec3(0.976, 0.976, 0.980);
  vec3 lightFlow = vec3(0.851, 0.851, 0.878);
  vec3 darkBase  = vec3(0.037, 0.037, 0.045);
  vec3 darkFlow  = vec3(0.104, 0.104, 0.122);

  vec3 base = mix(lightBase, darkBase, uDark);
  vec3 flow = mix(lightFlow, darkFlow, uDark);

  vec3 col = mix(base, flow, smoothstep(0.22, 0.88, n));
  col += (1.0 - uDark) * 0.035 * smoothstep(0.70, 0.96, n);
  col += uDark * 0.045 * smoothstep(0.76, 0.98, n);

  float vig = smoothstep(1.35, 0.30, length(uv - 0.5 - uMouse * 0.05));
  col *= mix(0.982, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function initBackground() {
  const canvas = document.getElementById("gl-bg");
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 10 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uDark: { value: isDark() ? 1 : 0 },
  };
  scene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: "void main() { gl_Position = vec4(position, 1.0); }",
        fragmentShader: BG_FRAG,
      })
    )
  );

  const setSize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  };
  setSize();
  addEventListener("resize", setSize);

  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener(
    "mousemove",
    (e) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = -(e.clientY / innerHeight) * 2 + 1;
    },
    { passive: true }
  );

  const clock = new THREE.Clock();
  let raf = 0;

  const renderOnce = () => renderer.render(scene, cam);
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    mx += (tx - mx) * 0.045;
    my += (ty - my) * 0.045;
    uniforms.uMouse.value.set(mx, my);
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uDark.value += ((isDark() ? 1 : 0) - uniforms.uDark.value) * 0.05;
    renderOnce();
  };

  return {
    start() {
      cancelAnimationFrame(raf);
      if (motionOn()) frame();
      else { uniforms.uTime.value = 14; renderOnce(); }
    },
    stop() { cancelAnimationFrame(raf); renderOnce(); },
  };
}

/* ======================================================================
   2. interactive screens — canvas textures with hit regions
   ====================================================================== */

const PHONE_REGIONS = [
  { id: "p-intro",  x: 26, y: 266, w: 204, h: 44, label: "Introduction",    scroll: "#introduction" },
  { id: "p-start",  x: 26, y: 318, w: 204, h: 44, label: "Getting started", scroll: "#getting-started" },
  { id: "p-faq",    x: 26, y: 370, w: 204, h: 44, label: "FAQ",             scroll: "#faq" },
  { id: "p-cta",    x: 26, y: 434, w: 100, h: 30, label: "Get started",     scroll: "#getting-started" },
];

const LAPTOP_REGIONS = [
  { id: "l-intro", x: 40,  y: 130, w: 104, h: 18, label: "Introduction", scroll: "#introduction" },
  { id: "l-start", x: 40,  y: 152, w: 104, h: 18, label: "Getting started", scroll: "#getting-started" },
  { id: "l-faq",   x: 40,  y: 174, w: 104, h: 18, label: "FAQ", scroll: "#faq" },
  { id: "l-terms", x: 40,  y: 196, w: 104, h: 18, label: "Terms of Service", scroll: "#terms" },
  { id: "l-cta",   x: 176, y: 264, w: 132, h: 32, label: "Get started", scroll: "#getting-started" },
];

function makeScreen(kind, dark) {
  const canvas = document.createElement("canvas");
  canvas.width = kind === "phone" ? 256 : 512;
  canvas.height = kind === "phone" ? 512 : 320;
  const g = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const regions = kind === "phone" ? PHONE_REGIONS : LAPTOP_REGIONS;
  const state = { dark, hover: null, press: null, cursor: null };

  const rr = (x, y, w, h, r) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fill();
  };

  function draw() {
    const d = state.dark;
    const grad = g.createLinearGradient(0, 0, 0, canvas.height);
    if (d) {
      grad.addColorStop(0, "#141418");
      grad.addColorStop(1, "#0a0a0c");
    } else {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, "#f1f1f4");
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, canvas.width, canvas.height);

    const bar = d ? "#2a2a30" : "#e6e6ea";
    const card = d ? "#1c1c21" : "#ececef";
    const ink = d ? "#f2f2f4" : "#111113";
    const faint = d ? "#3a3a41" : "#cfcfd6";
    const hoverBg = d ? "#2e2e36" : "#e0e0e6";

    /* ----- chrome: status bar / browser bar ----- */
    if (kind === "phone") {
      g.fillStyle = ink;
      g.font = "600 16px Inter, Arial, sans-serif";
      g.textAlign = "left";
      g.fillText("9:41", 26, 34);
      g.textAlign = "right";
      for (let i = 0; i < 3; i++) g.fillRect(canvas.width - 66 + i * 13, 24, 8, 8);
      g.textAlign = "left";
      g.fillStyle = d ? "#26262b" : "#e3e3e8";
      rr(canvas.width / 2 - 42, 18, 84, 18, 9);
      g.fillStyle = d ? "#55555e" : "#9a9aa2";
      g.beginPath();
      g.arc(canvas.width / 2 - 30, 27, 3.5, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = d ? "#1b1b1f" : "#e9e9ee";
      g.fillRect(0, 0, canvas.width, 36);
      g.fillStyle = d ? "#3a3a41" : "#c9c9cf";
      [24, 44, 64].forEach((x) => {
        g.beginPath();
        g.arc(x, 18, 5, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = d ? "#26262b" : "#f8f8fa";
      rr(84, 8, canvas.width - 200, 20, 10);
      g.fillStyle = faint;
      g.font = "500 12px Inter, Arial, sans-serif";
      g.textAlign = "left";
      g.fillText("docs.stry.app", 96, 22);
    }

    /* ----- wordmark / page title ----- */
    if (kind === "phone") {
      g.fillStyle = ink;
      g.font = "700 58px Inter, Arial, sans-serif";
      g.textAlign = "center";
      g.fillText("stry", canvas.width / 2, 158);
      g.fillStyle = faint;
      g.fillRect(canvas.width / 2 - 30, 176, 60, 5);
      g.textAlign = "left";
      g.fillStyle = ink;
      g.font = "600 22px Inter, Arial, sans-serif";
      g.fillText("Documentation", 26, 250);
    } else {
      g.fillStyle = ink;
      g.font = "700 30px Inter, Arial, sans-serif";
      g.fillText("stry docs", 28, 82);
      g.fillStyle = bar;
      g.fillRect(28, 96, 150, 7);
    }

    /* ----- interactive regions ----- */
    regions.forEach((r) => {
      const hovered = state.hover === r.id;
      const pressed = state.press === r.id;
      if (kind === "phone") {
        g.fillStyle = pressed ? (d ? "#0f0f13" : "#d6d6dc") : hovered ? hoverBg : card;
        rr(r.x, r.y, r.w, r.h, 10);
        g.fillStyle = hovered || pressed ? ink : bar;
        g.font = "600 16px Inter, Arial, sans-serif";
        g.fillText(r.label, r.x + 12, r.y + 27);
        g.fillStyle = faint;
        rr(r.x + r.w - 14, r.y + r.h / 2 - 3, 6, 6, 3);
      } else if (r.id.startsWith("l-cta")) {
        g.fillStyle = pressed ? (d ? "#c9c9d0" : "#3f3f46") : hovered ? (d ? "#ffffff" : "#2e2e34") : ink;
        rr(r.x, r.y, r.w, r.h, 8);
        g.fillStyle = hovered || pressed ? (d ? "#0c0c0e" : "#f2f2f4") : (d ? "#0c0c0e" : "#f2f2f4");
        g.font = "600 13px Inter, Arial, sans-serif";
        g.fillText(r.label, r.x + 16, r.y + 21);
      } else {
        if (hovered) {
          g.fillStyle = d ? "#26262b" : "#e0e0e6";
          rr(r.x - 6, r.y - 4, r.w + 12, r.h + 8, 6);
        }
        g.fillStyle = hovered ? ink : faint;
        g.font = "500 13px Inter, Arial, sans-serif";
        g.fillText(r.label, r.x, r.y + 12);
      }
    });

    /* ----- non-interactive filler bars ----- */
    if (kind === "phone") {
      g.fillStyle = faint;
      rr(canvas.width / 2 - 52, canvas.height - 18, 104, 6, 3);
    } else {
      g.fillStyle = bar;
      [122, 152, 182].forEach((y, i) => {
        g.fillRect(176, y, (canvas.width - 204) * [0.92, 0.78, 0.86][i], 10);
      });
      g.fillStyle = dark ? "#33333a" : "#dcdce1";
      g.fillRect(176, 214, canvas.width - 204, 8);
      g.fillRect(176, 228, (canvas.width - 204) * 0.7, 8);
    }

    /* ----- live cursor dot on the glass ----- */
    if (state.cursor) {
      const { x, y } = state.cursor;
      g.strokeStyle = d ? "#ffffff" : "#111113";
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = d ? "rgba(255,255,255,0.18)" : "rgba(17,17,19,0.12)";
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
    }

    texture.needsUpdate = true;
  }

  draw();
  return { canvas, texture, draw, regions, state, kind };
}

/* ======================================================================
   3. geometry + texture helpers
   ====================================================================== */

function roundedBoxGeo(w, h, d, r) {
  const shape = new THREE.Shape();
  const x = w / 2, y = h / 2;
  shape.moveTo(-x + r, -y);
  shape.lineTo(x - r, -y);
  shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r);
  shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r);
  shape.quadraticCurveTo(-x, -y, -x + r, -y);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, d - 0.06),
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 5,
    curveSegments: 24,
  });
  geo.center();
  return geo;
}

function wordmarkTexture(dark) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 512);
  if (dark) {
    grad.addColorStop(0, "#f4f4f6");
    grad.addColorStop(1, "#ffffff");
  } else {
    grad.addColorStop(0, "#17171b");
    grad.addColorStop(1, "#0a0a0c");
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = dark ? "#0a0a0c" : "#f2f2f4";
  g.font = "700 150px Inter, Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("stry", 256, 262);
  g.font = "500 26px Inter, Arial, sans-serif";
  g.fillText("documentation", 256, 340);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function keyTexture(dark) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 340;
  const g = c.getContext("2d");
  g.fillStyle = dark ? "#101014" : "#e8e8ec";
  g.fillRect(0, 0, c.width, c.height);
  const rows = [14, 12, 12, 10];
  const kw = 42, kh = 34, gap = 7;
  rows.forEach((count, r) => {
    const total = count * kw + (count - 1) * gap;
    const startX = (c.width - total) / 2;
    for (let i = 0; i < count; i++) {
      const x = startX + i * (kw + gap);
      const y = 26 + r * (kh + 14);
      g.fillStyle = dark ? "#1d1d23" : "#f6f6f8";
      g.beginPath();
      g.moveTo(x + 5, y);
      g.arcTo(x + kw, y, x + kw, y + kh, 5);
      g.arcTo(x + kw, y + kh, x, y + kh, 5);
      g.arcTo(x, y + kh, x, y, 5);
      g.arcTo(x, y, x + kw, y, 5);
      g.closePath();
      g.fill();
      g.fillStyle = dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)";
      g.fillRect(x + 4, y + 3, kw - 8, 2);
    }
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 64, 8, 128, 64, 120);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 128);
  return new THREE.CanvasTexture(c);
}

/* ======================================================================
   4. hero scene
   ====================================================================== */

function initHero() {
  const host = document.getElementById("gl-hero");
  const visual = document.querySelector(".hero__visual");
  if (!host || !visual) return null;

  const renderer = new THREE.WebGLRenderer({ canvas: host, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  cam.position.set(0, 0.35, 8.6);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, isDark() ? 2.4 : 1.7);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0xffffff, isDark() ? 26 : 10);
  rim.position.set(-4, 2.5, -3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, isDark() ? 0.45 : 0.8));
  scene.add(new THREE.HemisphereLight(0xdedee6, 0x0a0a0c, isDark() ? 0.55 : 0.7));

  const world = new THREE.Group();
  scene.add(world);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x33333b,
    metalness: 0.6,
    roughness: 0.42,
    envMapIntensity: 1.2,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x17171b,
    metalness: 0.55,
    roughness: 0.5,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: 0x9a9aa2,
    metalness: 0.9,
    roughness: 0.3,
  });

  /* --- interactive screens --- */
  const phoneScreen = makeScreen("phone", isDark());
  const laptopScreen = makeScreen("laptop", isDark());

  /* --- front phone (interactive) --- */
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(roundedBoxGeo(1.62, 3.3, 0.18, 0.3), bodyMat));
  const pScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.44, 3.06),
    new THREE.MeshBasicMaterial({ map: phoneScreen.texture, toneMapped: false })
  );
  pScreen.position.z = 0.105;
  pScreen.userData.screen = phoneScreen;
  phone.add(pScreen);
  const power = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.07), silverMat);
  power.position.set(0.825, 0.28, 0);
  phone.add(power);
  [-0.12, 0.14].forEach((dy) => {
    const vol = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.07), silverMat);
    vol.position.set(-0.825, dy + 0.1, 0);
    phone.add(vol);
  });
  phone.scale.setScalar(1.12);
  phone.position.set(-0.9, 0.05, 0.55);
  phone.rotation.set(0.05, 0.42, -0.05);
  world.add(phone);

  /* --- wordmark phone (upper-left) --- */
  const phone2 = new THREE.Group();
  phone2.add(new THREE.Mesh(roundedBoxGeo(1.5, 3.12, 0.17, 0.28), darkMat));
  const p2Mat = new THREE.MeshBasicMaterial({ map: wordmarkTexture(isDark()), toneMapped: false });
  const p2Screen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.9), p2Mat);
  p2Screen.position.z = 0.1;
  phone2.add(p2Screen);
  phone2.scale.setScalar(1.12);
  phone2.position.set(-1.72, 0.6, -1.0);
  phone2.rotation.set(0.04, 0.32, 0.1);
  world.add(phone2);

  /* --- laptop (interactive) --- */
  const laptop = new THREE.Group();
  laptop.add(new THREE.Mesh(roundedBoxGeo(2.4, 0.15, 1.7, 0.09), bodyMat));
  const kb = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.5),
    new THREE.MeshStandardMaterial({ map: keyTexture(isDark()), roughness: 0.55, metalness: 0.3 })
  );
  kb.rotation.x = -Math.PI / 2;
  kb.position.y = 0.08;
  laptop.add(kb);
  const trackpad = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.56),
    new THREE.MeshStandardMaterial({ color: 0x1c1c21, metalness: 0.45, roughness: 0.42 })
  );
  trackpad.rotation.x = -Math.PI / 2;
  trackpad.position.set(0, 0.082, 0.5);
  laptop.add(trackpad);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.42, 20), darkMat);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0.1, -0.83);
  laptop.add(hinge);
  const lid = new THREE.Group();
  const lidBody = new THREE.Mesh(roundedBoxGeo(2.4, 1.6, 0.09, 0.08), bodyMat);
  lidBody.position.set(0, 0.8, -0.045);
  lid.add(lidBody);
  const lScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.14, 1.32),
    new THREE.MeshBasicMaterial({ map: laptopScreen.texture, toneMapped: false })
  );
  lScreen.position.set(0, 0.8, 0.012);
  lScreen.userData.screen = laptopScreen;
  lid.add(lScreen);
  lid.position.set(0, 0.06, -0.82);
  lid.rotation.x = -0.22;
  laptop.add(lid);
  laptop.scale.setScalar(1.12);
  laptop.position.set(1.2, -0.9, -0.75);
  laptop.rotation.y = -0.52;
  world.add(laptop);

  /* --- soft ground shadow --- */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 2.5),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.5, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.05, -2.05, 0);
  world.add(shadow);

  /* --- sizing: camera auto-fits the whole scene --- */
  const HALF_FOV = THREE.MathUtils.degToRad(35 / 2);
  const SCENE_HALF_W = 2.85;
  const SCENE_HALF_H = 2.6;
  const SCENE_FRONT_Z = 0.8;

  let camDist = 9;
  const fitCamera = () => {
    const w = host.clientWidth || visual.clientWidth || 600;
    const h = host.clientHeight || visual.clientHeight || 620;
    const aspect = w / h;
    camDist =
      Math.max(
        SCENE_HALF_W / (Math.tan(HALF_FOV) * aspect),
        SCENE_HALF_H / Math.tan(HALF_FOV)
      ) + SCENE_FRONT_Z;
    renderer.setSize(w, h, false);
    cam.aspect = aspect;
    cam.position.z = camDist;
    cam.updateProjectionMatrix();
  };
  fitCamera();
  addEventListener("resize", fitCamera);

  /* --- screen interaction: raycast → hover, press, navigate --- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hover = { mesh: null, id: null };

  function pick(ev) {
    const r = host.getBoundingClientRect();
    ndc.set(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, cam);
    const hits = raycaster.intersectObjects([pScreen, lScreen], false);
    return hits.length ? hits[0] : null;
  }

  function applyHover(hit, ev) {
    if (!hit) {
      if (hover.mesh) {
        hover.mesh.userData.screen.state.hover = null;
        hover.mesh.userData.screen.state.cursor = null;
        hover.mesh.userData.screen.draw();
        hover.mesh = null; hover.id = null;
      }
      host.style.cursor = "";
      return;
    }
    const screen = hit.object.userData.screen;
    const x = Math.round(hit.uv.x * screen.canvas.width);
    const y = Math.round((1 - hit.uv.y) * screen.canvas.height);
    const region = screen.regions.find(
      (rg) => x >= rg.x && x <= rg.x + rg.w && y >= rg.y && y <= rg.y + rg.h
    );
    const id = region ? region.id : null;
    if (hover.mesh !== hit.object || hover.id !== id) {
      if (hover.mesh && hover.mesh !== hit.object) {
        hover.mesh.userData.screen.state.hover = null;
        hover.mesh.userData.screen.draw();
      }
      screen.state.hover = id;
      hover.mesh = hit.object;
      hover.id = id;
      screen.draw();
    }
    screen.state.cursor = { x, y };
    screen.draw();
    host.style.cursor = id ? "pointer" : "grab";
  }

  /* --- drag rotation + parallax --- */
  let dragging = false, lx = 0, ly = 0, moved = 0;
  let tRotY = 0, tRotX = 0, cRotY = 0, cRotX = 0;
  let parX = 0, parY = 0, tParX = 0, tParY = 0;

  host.style.touchAction = "pan-y";
  host.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = 0;
    lx = e.clientX; ly = e.clientY;
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
  });
  addEventListener("pointermove", (e) => {
    tParX = (e.clientX / innerWidth) * 2 - 1;
    tParY = (e.clientY / innerHeight) * 2 - 1;
    const hit = pick(e);
    applyHover(hit, e);
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    moved += Math.abs(dx) + Math.abs(dy);
    tRotY += dx * 0.006;
    tRotX = clamp(tRotX + dy * 0.003, -0.32, 0.32);
    lx = e.clientX; ly = e.clientY;
  }, { passive: true });
  addEventListener("pointerup", (e) => {
    const wasDrag = moved > 8;
    dragging = false;
    if (wasDrag) return;
    const hit = pick(e);
    if (!hit) return;
    const screen = hit.object.userData.screen;
    const x = Math.round(hit.uv.x * screen.canvas.width);
    const y = Math.round((1 - hit.uv.y) * screen.canvas.height);
    const region = screen.regions.find(
      (rg) => x >= rg.x && x <= rg.x + rg.w && y >= rg.y && y <= rg.y + rg.h
    );
    if (!region) return;
    screen.state.press = region.id;
    screen.draw();
    setTimeout(() => {
      screen.state.press = null;
      screen.draw();
      const target = document.querySelector(region.scroll);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 190);
  });

  const clock = new THREE.Clock();
  let raf = 0;

  const renderOnce = () => renderer.render(scene, cam);
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = clock.getElapsedTime();

    if (!dragging) tRotY += Math.sin(t * 0.4) * 0.0006;
    cRotY += (tRotY - cRotY) * 0.07;
    cRotX += (tRotX - cRotX) * 0.07;
    world.rotation.y = cRotY;
    world.rotation.x = cRotX;

    parX += (tParX - parX) * 0.05;
    parY += (tParY - parY) * 0.05;
    cam.position.x = parX * 0.45;
    cam.position.y = 0.3 - parY * 0.3;
    cam.lookAt(0, -0.2, 0);

    phone.position.y = 0.02 + Math.sin(t * 0.9) * 0.07;
    phone.rotation.z = -0.05 + Math.sin(t * 0.6) * 0.025;
    phone2.position.y = 0.6 + Math.sin(t * 0.75 + 1.4) * 0.06;
    laptop.position.y = -0.85 + Math.sin(t * 0.8 + 2.6) * 0.03;

    renderOnce();
  };

  visual.classList.add("gl-on");
  window.__stryHero = { pick, cam, world, pScreen, lScreen };
  return {
    start() {
      cancelAnimationFrame(raf);
      if (motionOn()) {
        frame();
        host.classList.add("ready");
      } else {
        renderOnce();
        host.classList.add("ready");
      }
    },
    stop() { cancelAnimationFrame(raf); renderOnce(); },
    retheme() {
      phoneScreen.state.dark = isDark();
      phoneScreen.draw();
      laptopScreen.state.dark = isDark();
      laptopScreen.draw();
      p2Mat.map = wordmarkTexture(isDark());
      kb.material.map = keyTexture(isDark());
      key.intensity = isDark() ? 2.4 : 1.7;
      rim.intensity = isDark() ? 26 : 10;
    },
  };
}

/* ======================================================================
   boot
   ====================================================================== */

try {
  const bg = initBackground();
  if (bg) scenes.push(bg);
} catch (err) {
  console.warn("stry webgl: background unavailable", err);
}

try {
  const hero = initHero();
  if (hero) scenes.push(hero);
} catch (err) {
  console.warn("stry webgl: hero scene unavailable", err);
}

if (scenes.length) {
  const observer = new MutationObserver(() => {
    scenes.forEach((s) => s.start());
    scenes.forEach((s) => s.retheme && s.retheme());
  });
  observer.observe(root, { attributes: true, attributeFilter: ["data-motion", "data-theme"] });
  scenes.forEach((s) => s.start());
}
