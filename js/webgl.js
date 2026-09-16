/**
 * stry docs — WebGL layer
 *  1. #gl-bg  : full-page domain-warped noise shader, theme-aware, mouse-reactive
 *  2. #gl-hero: 3D devices (two phones + a laptop) with drag rotation and parallax
 *
 * Everything is progressive: if WebGL or the CDN fails, the CSS phones stay.
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
   2. hero 3D devices
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

function screenTexture(kind, dark) {
  const c = document.createElement("canvas");
  c.width = kind === "phone" ? 256 : 512;
  c.height = kind === "phone" ? 512 : 320;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  if (dark) {
    grad.addColorStop(0, "#141418");
    grad.addColorStop(1, "#0a0a0c");
  } else {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#f1f1f4");
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);

  const bar = dark ? "#2a2a30" : "#e6e6ea";
  const ink = dark ? "#f2f2f4" : "#111113";
  const faint = dark ? "#3a3a41" : "#cfcfd6";

  if (kind === "phone") {
    g.fillStyle = dark ? "#26262b" : "#e3e3e8";
    g.fillRect(c.width / 2 - 42, 14, 84, 17);
    g.fillStyle = ink;
    g.font = "700 58px Inter, Arial, sans-serif";
    g.textAlign = "center";
    g.fillText("stry", c.width / 2, 170);
    g.fillStyle = bar;
    const rows = [0.62, 0.84, 0.72, 0.9, 0.5];
    rows.forEach((w, i) => {
      g.fillRect(36, 240 + i * 34, (c.width - 72) * w, 12);
    });
    g.fillStyle = dark ? "#f2f2f4" : "#111113";
    g.fillRect(36, c.height - 46, (c.width - 72) * 0.34, 12);
  } else {
    g.fillStyle = dark ? "#1b1b1f" : "#e9e9ee";
    g.fillRect(0, 0, c.width, 34);
    g.fillStyle = ink;
    g.font = "700 26px Inter, Arial, sans-serif";
    g.fillText("stry docs", 28, 74);
    g.fillStyle = faint;
    g.fillRect(28, 100, c.width - 56, 10);
    g.fillStyle = bar;
    const rows = [0.9, 0.72, 0.82, 0.6];
    rows.forEach((w, i) => {
      g.fillRect(28, 136 + i * 30, (c.width - 56) * w, 12);
    });
    g.fillStyle = dark ? "#0c0c0e" : "#111113";
    g.fillRect(28, c.height - 52, 150, 30);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
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

  /* --- front phone --- */
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(roundedBoxGeo(1.62, 3.3, 0.18, 0.3), bodyMat));
  const pScreenMat = new THREE.MeshBasicMaterial({ map: screenTexture("phone", isDark()), toneMapped: false });
  const pScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 3.06), pScreenMat);
  pScreen.position.z = 0.105;
  phone.add(pScreen);
  phone.position.set(-0.9, 0.1, 0.45);
  phone.rotation.set(0.05, 0.42, -0.05);
  world.add(phone);

  /* --- back phone with wordmark --- */
  const phone2 = new THREE.Group();
  phone2.add(new THREE.Mesh(roundedBoxGeo(1.5, 3.12, 0.17, 0.28), darkMat));
  const p2Mat = new THREE.MeshBasicMaterial({ map: wordmarkTexture(isDark()), toneMapped: false });
  const p2Screen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.9), p2Mat);
  p2Screen.position.z = 0.1;
  phone2.add(p2Screen);
  phone2.position.set(-1.8, -0.15, -0.55);
  phone2.rotation.set(0.04, 0.28, -0.06);
  world.add(phone2);

  /* --- laptop --- */
  const laptop = new THREE.Group();
  laptop.add(new THREE.Mesh(roundedBoxGeo(2.4, 0.15, 1.7, 0.09), bodyMat));
  const kb = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x121215, metalness: 0.35, roughness: 0.6 })
  );
  kb.rotation.x = -Math.PI / 2;
  kb.position.y = 0.08;
  laptop.add(kb);
  const lid = new THREE.Group();
  const lidBody = new THREE.Mesh(roundedBoxGeo(2.4, 1.6, 0.09, 0.08), bodyMat);
  lidBody.position.set(0, 0.8, -0.045);
  lid.add(lidBody);
  const lScreenMat = new THREE.MeshBasicMaterial({ map: screenTexture("laptop", isDark()), toneMapped: false });
  const lScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 1.32), lScreenMat);
  lScreen.position.set(0, 0.8, 0.012);
  lid.add(lScreen);
  lid.position.set(0, 0.06, -0.82);
  lid.rotation.x = -0.22;
  laptop.add(lid);
  laptop.position.set(0.85, -0.92, -0.35);
  laptop.rotation.y = -0.42;
  world.add(laptop);

  /* --- soft ground shadow --- */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 2.3),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.5, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.1, -1.9, 0);
  world.add(shadow);

  /* --- sizing --- */
  const setSize = () => {
    const w = host.clientWidth || visual.clientWidth || 600;
    const h = host.clientHeight || visual.clientHeight || 620;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  };
  setSize();
  addEventListener("resize", setSize);

  /* --- drag rotation + parallax --- */
  let dragging = false, lx = 0, ly = 0;
  let tRotY = 0, tRotX = 0, cRotY = 0, cRotX = 0;
  let parX = 0, parY = 0, tParX = 0, tParY = 0;

  host.style.touchAction = "pan-y";
  host.addEventListener("pointerdown", (e) => {
    dragging = true;
    lx = e.clientX; ly = e.clientY;
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
  });
  addEventListener("pointermove", (e) => {
    tParX = (e.clientX / innerWidth) * 2 - 1;
    tParY = (e.clientY / innerHeight) * 2 - 1;
    if (!dragging) return;
    tRotY += (e.clientX - lx) * 0.006;
    tRotX = clamp(tRotX + (e.clientY - ly) * 0.003, -0.32, 0.32);
    lx = e.clientX; ly = e.clientY;
  }, { passive: true });
  addEventListener("pointerup", () => { dragging = false; });

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
    cam.lookAt(0, -0.25, 0);

    phone.position.y = 0.15 + Math.sin(t * 0.9) * 0.07;
    phone.rotation.z = -0.05 + Math.sin(t * 0.6) * 0.025;
    phone2.position.y = -0.12 + Math.sin(t * 0.75 + 1.4) * 0.06;
    laptop.position.y = -1.02 + Math.sin(t * 0.8 + 2.6) * 0.03;

    renderOnce();
  };

  visual.classList.add("gl-on");
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
      pScreenMat.map = screenTexture("phone", isDark());
      p2Mat.map = wordmarkTexture(isDark());
      lScreenMat.map = screenTexture("laptop", isDark());
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
