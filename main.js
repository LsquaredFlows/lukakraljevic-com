/* yinger-style — clock + dim + FPS + 3D Sierpinski tetrahedron */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/* ── clock + am/pm + dims ────────────────────────────────── */
const bigClock = document.getElementById("bigClock");
const amDot    = document.getElementById("amDot");
const pmDot    = document.getElementById("pmDot");
const pxDim    = document.getElementById("pxDim");
const fpsEl    = document.getElementById("fps");

function nowParts() {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zagreb", hour12: false, hour: "2-digit", minute: "2-digit" });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  return { hh: parts.hour, mm: parts.minute };
}

function clockTick() {
  const { hh, mm } = nowParts();
  const h = parseInt(hh, 10);
  const disp = ((h + 11) % 12) + 1;
  bigClock.textContent = String(disp).padStart(2, "0") + ":" + mm;
  if (h >= 12) { pmDot.classList.add("is-on"); amDot.classList.remove("is-on"); }
  else         { amDot.classList.add("is-on"); pmDot.classList.remove("is-on"); }
}
clockTick(); setInterval(clockTick, 5000);

function dims() {
  pxDim.textContent = String(window.innerWidth).padStart(4,"0") + " × " + String(window.innerHeight).padStart(4,"0");
}
dims(); addEventListener("resize", dims);

/* ── FPS counter ─────────────────────────────────────────── */
let fpsLast = performance.now(), fpsFrames = 0;
function fpsTick(now) {
  fpsFrames++;
  if (now - fpsLast >= 1000) {
    const v = Math.round((fpsFrames * 1000) / (now - fpsLast));
    fpsEl.textContent = String(v).padStart(3, "0") + " FPS";
    fpsFrames = 0; fpsLast = now;
  }
  requestAnimationFrame(fpsTick);
}
requestAnimationFrame(fpsTick);

/* ── 3D Sierpinski tetrahedron ───────────────────────────── */
const canvas = document.getElementById("cubes");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduced) initScene();

function initScene() {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const pmrem = new THREE.PMREMGenerator(r);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  cam.position.set(0, 0, 8);

  /* coral rim lighting */
  const coral1 = new THREE.PointLight(0xf0a896, 14, 30);
  coral1.position.set(5, 4, 4);
  scene.add(coral1);
  const coral2 = new THREE.PointLight(0xff7a5a, 6, 22);
  coral2.position.set(-3, -4, 3);
  scene.add(coral2);
  const fill = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(fill);

  /* cream pearl material */
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xede7d7,
    metalness: 0.18,
    roughness: 0.28,
    clearcoat: 0.95,
    clearcoatRoughness: 0.12,
    sheen: 0.9,
    sheenColor: new THREE.Color(0xf2a394),
    sheenRoughness: 0.28,
    iridescence: 0.20,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [200, 520],
  });

  /* ── Fibonacci sphere · phi-distributed points ──────────
     N points placed on a unit sphere using the golden angle
     ψ = π · (3 − √5) ≈ 137.50776° — guarantees no two points
     ever cluster. The visual emergent pattern is the same one
     you see in sunflower seed heads and pinecones. φ = (1+√5)/2.
  ─────────────────────────────────────────────────────── */
  const group = new THREE.Group();
  scene.add(group);

  const PHI = (1 + Math.sqrt(5)) / 2;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const N = 256;
  const SPHERE_R = 2.05;

  // small cream sphere geometry, reused
  const dotGeo = new THREE.SphereGeometry(1, 18, 18);

  for (let i = 0; i < N; i++) {
    // y from +1 to -1 evenly
    const y = 1 - (i / (N - 1)) * 2;
    // radius at this latitude
    const r = Math.sqrt(1 - y * y);
    // longitude advances by the golden angle
    const theta = GOLDEN_ANGLE * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    const pos = new THREE.Vector3(x, y, z).multiplyScalar(SPHERE_R);

    // size varies subtly toward equator for visual rhythm
    const sizeFactor = 0.045 + Math.pow(r, 0.6) * 0.045;

    const m = new THREE.Mesh(dotGeo, mat);
    m.position.copy(pos);
    m.scale.setScalar(sizeFactor);
    m.userData.phase = (i / N) * Math.PI * 2;
    group.add(m);
  }

  /* faint coral wireframe of the golden spiral path through the sphere */
  const spiralPts = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * i;
    spiralPts.push(new THREE.Vector3(
      Math.cos(theta) * r * SPHERE_R,
      y * SPHERE_R,
      Math.sin(theta) * r * SPHERE_R
    ));
  }
  const spiralGeo = new THREE.BufferGeometry().setFromPoints(spiralPts);
  const spiralMat = new THREE.LineBasicMaterial({
    color: 0xf0a896,
    transparent: true,
    opacity: 0.22,
  });
  const spiralLine = new THREE.Line(spiralGeo, spiralMat);
  group.add(spiralLine);

  // centroid of all positions is (0,0,0) by construction — center it visually
  group.position.set(0, 0, 0);

  /* sizing — center-right on wide desktop; on mobile the canvas is a
     contained top-right box, so size to the canvas element's own box and
     seat the sphere in the upper-right of that box */
  function resize() {
    // mobile: match the CSS breakpoint and size to the canvas box, not the window
    if (window.innerWidth <= 980) {
      const cw = canvas.clientWidth  || 1;
      const ch = canvas.clientHeight || 1;
      r.setSize(cw, ch, false);
      cam.aspect = cw / ch;
      // big cropped orb like the laptop — bleeds past top, bottom and right
      group.position.x = 1.0;
      group.position.y = 0.0;
      const base = 1.7;
      group.userData.baseScale = base;
      group.scale.setScalar(base);
      cam.updateProjectionMatrix();
      return;
    }
    const w = window.innerWidth, h = window.innerHeight;
    r.setSize(w, h, false);
    cam.aspect = w / h;
    const wide = w / h > 1.1;
    group.position.x = wide ? 1.6 : 0;
    group.position.y = wide ? 0.4 : 1.6;
    const base = wide ? 1.0 : 0.62;
    group.userData.baseScale = base;
    group.scale.setScalar(base);
    cam.updateProjectionMatrix();
  }
  resize(); addEventListener("resize", resize);

  /* pointer parallax */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", e => {
    ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });

  /* animation loop · multi-axis tumble + breathing + per-leaf shimmer */
  let t0 = performance.now();
  function loop(now) {
    const t = (now - t0) / 1000;
    ptr.x += (ptr.tx - ptr.x) * 0.05;
    ptr.y += (ptr.ty - ptr.y) * 0.05;

    // slow multi-axis tumble — three different frequencies to avoid repetition
    group.rotation.y = -0.35 + t * 0.12 + ptr.x * 0.35;
    group.rotation.x = -0.15 + Math.sin(t * 0.27) * 0.20 + ptr.y * 0.22;
    group.rotation.z = Math.sin(t * 0.18) * 0.10;

    // 4-second breathing scale (subtle — 2.5% amplitude)
    const baseScale = group.userData.baseScale || 1;
    const breath = 1 + Math.sin(t * (Math.PI * 2 / 4)) * 0.025;
    group.scale.setScalar(baseScale * breath);

    r.render(scene, cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  requestAnimationFrame(() => requestAnimationFrame(() => canvas.classList.add("ready")));
}

/* ── scroll-driven hero collapse + archive reveal ─────────── */
const sceneWrap = document.querySelector(".scene-wrap");
const metaStack = document.querySelector(".meta-stack");
const pillNav   = document.querySelector(".pill-nav");
let scrolled = false;
function onScroll() {
  const vh = window.innerHeight, y = window.scrollY;
  const sh = y > vh * 0.5;
  if (sh !== scrolled) { scrolled = sh; document.body.classList.toggle("scrolled", sh); }

  // desktop: smooth, scroll-linked zoom-out + fade. The sphere sits ON TOP
  // (z-index 7) and shrinks away gracefully while the archive rises beneath
  // it — so the animation is never abruptly covered, and the hero text fades
  // out before the archive reaches it (no overlap).
  if (window.innerWidth > 980) {
    const p = Math.min(1, y / (vh * 0.92));            // 0 at top → 1 after ~one screen
    if (sceneWrap) {
      sceneWrap.style.transition = "none";
      sceneWrap.style.opacity = String(1 - p);
      sceneWrap.style.transform = `scale(${1 - p * 0.82}) translate(${p * 24}vw, ${-p * 16}vh)`;
    }
    const tf = Math.max(0, 1 - p * 1.6);               // text fades a touch faster
    if (metaStack) { metaStack.style.transition = "none"; metaStack.style.opacity = String(tf); metaStack.style.transform = `translateY(${-p * 22}px)`; }
    if (pillNav)   { pillNav.style.transition = "none";   pillNav.style.opacity = String(tf);   pillNav.style.transform = `translateY(${-p * 22}px)`; }
  } else {
    // mobile: clear any desktop inline styles so the CSS-driven band behaviour wins
    [sceneWrap, metaStack, pillNav].forEach(el => { if (el) { el.style.transition = ""; el.style.opacity = ""; el.style.transform = ""; } });
  }
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* reveal-in for archive sections */
const sectIO = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("in"); });
}, { threshold: 0.15 });
document.querySelectorAll(".ar-sect").forEach(el => sectIO.observe(el));

/* progress-strip active state */
const progLinks = [...document.querySelectorAll(".prog-link")];
const progIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    const id = e.target.id;
    const link = progLinks.find(l => l.dataset.id === id);
    if (!link) return;
    if (e.isIntersecting) {
      progLinks.forEach(l => l.classList.remove("is-on"));
      link.classList.add("is-on");
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll(".ar-sect").forEach(el => progIO.observe(el));

