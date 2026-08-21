/* ===========================================================
   Snapping Turtle Media — perfume bottle 3D experience
   Real three.js (module build) + GLTFLoader + studio HDRI.

   Two mounts:
   1. Fixed full-viewport overlay ("scroll experience") — the bottle
      drifts left -> right across the page as you scroll, floats,
      spins, and can be dragged. Matches the reference build.
   2. Inline showcase viewer (#viewer-canvas) — drag to rotate.
   =========================================================== */

import * as THREE from "https://esm.sh/three@0.170.0";
import { GLTFLoader } from "https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "https://esm.sh/three@0.170.0/examples/jsm/loaders/RGBELoader.js";

const MODEL_URL =
  "/__l5e/assets-v1/91d9e5ed-1bf1-4a34-b990-b029654ee365/perfume_bottle.glb";
const HDRI_URL =
  "https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/studio_small_03_1k.hdr";

const damp = (current, target, lambda, dt) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

/* ---------- shared model load (one fetch, cloned per mount) ---------- */
let modelPromise = null;
function loadModel() {
  if (!modelPromise) {
    modelPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(MODEL_URL, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
  return modelPromise;
}

/* Normalise: fit into ~1.75 units, recentre, boost env reflections. */
function prepare(source) {
  const model = source.clone(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = 1.75 / (Math.max(size.x, size.y, size.z) || 1);
  model.scale.setScalar(scale);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  model.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m) return;
      if ("envMapIntensity" in m) m.envMapIntensity = 1.35;
      m.needsUpdate = true;
    });
  });
  return model;
}

function studioLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 4.6);
  key.position.set(5.5, 7, 6.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 2.6);
  fill.position.set(-6.5, 1.5, 3.5);
  scene.add(fill);
  const bounce = new THREE.PointLight(0xffffff, 3, 40);
  bounce.position.set(0, -3.5, 5.5);
  scene.add(bounce);
  const top = new THREE.SpotLight(0xffffff, 2.9, 0, 0.48, 0.9);
  top.position.set(0, 6, 5.5);
  scene.add(top);
}

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function applyEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load(
    HDRI_URL,
    (hdr) => {
      const env = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = env;
      scene.environmentIntensity = 0.9;
      hdr.dispose();
      pmrem.dispose();
    },
    undefined,
    () => pmrem.dispose(),
  );
}

/* ===========================================================
   1. Fixed scroll experience
   =========================================================== */
function mountOverlay() {
  const host = document.querySelector("[data-bottle-overlay]");
  if (!host || !window.WebGLRenderingContext) return;

  const canvas = document.createElement("canvas");
  host.appendChild(canvas);

  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.2, 6.6);
  studioLights(scene);
  applyEnvironment(renderer, scene);

  const group = new THREE.Group();
  group.rotation.set(0.08, -0.48, 0);
  scene.add(group);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  /* scroll progress 0..1 over the whole document */
  let progress = 0;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* drag: overlay is click-through, so a drag only starts when the
     pointer goes down near the bottle and not on a link/button. */
  const drag = { active: false, lastX: 0, lastY: 0, targetY: 0, targetZ: 0 };
  const autoSpin = { y: group.rotation.y, speed: 0.5 }; // continuous 360° rotation on Y
  const projected = new THREE.Vector3();
  const nearBottle = (x, y) => {
    projected.set(group.position.x, group.position.y, group.position.z).project(camera);
    const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    return Math.hypot(x - sx, y - sy) < Math.min(220, window.innerWidth * 0.32);
  };
  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button, input, textarea, select, .faq-q")) return;
    if (!nearBottle(e.clientX, e.clientY)) return;
    drag.active = true;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    document.body.classList.add("is-grabbing");
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag.active) return;
    drag.targetY += (e.clientX - drag.lastX) * 0.015;
    drag.targetZ += (e.clientY - drag.lastY) * 0.013;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
  });
  const release = () => {
    drag.active = false;
    document.body.classList.remove("is-grabbing");
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  loadModel().then((source) => {
    group.add(prepare(source));
    host.classList.add("ready");
  });

  const clock = new THREE.Clock();
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;

    // Right -> left drift: starts at +1.6, ends at -1.6 as scroll progresses
    const targetX = 1.6 - progress * 3.2;
    const floatY = Math.sin(t * 1.3 + progress * Math.PI) * 0.18;
    const floatZ = Math.cos(t * 0.8 + progress * Math.PI * 0.5) * 0.12;

    group.position.x = damp(group.position.x, targetX, 3.8, dt);
    group.position.y = damp(group.position.y, floatY, 3.8, dt);
    group.position.z = damp(group.position.z, floatZ - 0.2, 3.8, dt);

    autoSpin.y += dt * autoSpin.speed; // full 360° turn around the Y-axis
    const targetRotY = autoSpin.y + drag.targetY + progress * 1.8;
    group.rotation.y = damp(group.rotation.y, targetRotY, 4.2, dt);
    group.rotation.z = damp(
      group.rotation.z,
      drag.targetZ + Math.sin(t * 0.5) * 0.15,
      4.2,
      dt,
    );

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ===========================================================
   2. Inline showcase viewer
   =========================================================== */
function mountInline() {
  const canvas = document.getElementById("viewer-canvas");
  if (!canvas || !window.WebGLRenderingContext) return;
  const wrap = canvas.parentElement;
  const loadingEl = document.getElementById("viewerLoading");

  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.1, 6.5);
  studioLights(scene);
  applyEnvironment(renderer, scene);

  const group = new THREE.Group();
  group.rotation.set(0.08, -0.48, 0);
  scene.add(group);

  const resize = () => {
    const w = wrap.clientWidth || 600;
    const h = wrap.clientHeight || 460;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let rotY = -0.48;
  let rotX = 0.08;
  let spin = 0.0045;
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  const stop = () => {
    dragging = false;
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointerleave", stop);
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX = Math.max(-0.6, Math.min(0.6, rotX + (e.clientY - lastY) * 0.006));
    lastX = e.clientX;
    lastY = e.clientY;
  });

  loadModel()
    .then((source) => {
      group.add(prepare(source));
      if (loadingEl) {
        loadingEl.style.opacity = "0";
        setTimeout(() => (loadingEl.style.display = "none"), 500);
      }
    })
    .catch(() => {
      if (loadingEl) loadingEl.textContent = "Preview unavailable";
    });

  const clock = new THREE.Clock();
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!dragging) rotY += spin * 60 * dt;
    group.rotation.y = damp(group.rotation.y, rotY, 6, dt);
    group.rotation.x = damp(group.rotation.x, rotX, 6, dt);
    group.position.y = Math.sin(clock.elapsedTime * 1.1) * 0.06;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

mountOverlay();
mountInline();
