import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createVeil, transition, auditTransitions } from './transitions.js';
import { splitWords } from './split-text.js';
import { createPlayhead } from './playhead.js';
import { bindMorph } from './morph.js';
import { createScreens } from './screens.js';
import { createShadow, createResults, createRing } from './props.js';
import { createLoader, createTrailProgress } from './ui/recre-ui.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = matchMedia('(max-width: 768px)').matches;
const canvas = document.getElementById('stage');

function fallback() {
  document.documentElement.classList.add('no-webgl', 'is-ready');
}

// ------------------------------------------------------------------ renderer
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  fallback();
  throw new Error('WebGL unavailable — showing static fallback');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#F7F1E6');
scene.fog = new THREE.Fog('#F7F1E6', 14, 34);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

// The timeline moves camRig (the shot); the camera's own position is left
// free for the load-in dolly.
const camRig = new THREE.Group();
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
camRig.add(camera);
scene.add(camRig);

const key = new THREE.DirectionalLight('#ffffff', 1.6);
key.position.set(3, 5, 4);
scene.add(key);

const veil = createVeil();

// ------------------------------------------------------------------ hero
// rig    ← the timeline moves this (shot position, turn, scale)
//  holder ← idle life + pointer parallax (frame())
//   model ← the glTF; its clip is scrubbed by pose.morph
const rig = new THREE.Group();
const holder = new THREE.Group();
rig.add(holder);
scene.add(rig);

// Plain numbers the timeline tweens; frame() applies them.
const pose = {
  morph: 0,      // 0 phone … 1 laptop
  phone: 0,      // phone screen: 0 QR, 1 menu, 2 contact QR
  laptop: 0,     // laptop screen: 0 site, 1 search, 2 about
  menu: 0,       // menu scroll 0…1
  idle: 0,       // float + parallax amount
  seo: 0, seoA: 0,
  turn: 0, worksA: 0,
};

let model, morph = { set() {} }, screenMat, screens;

async function loadHero() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync('./models/hero.glb', (e) => setLoader(e.total ? 0.1 + 0.6 * e.loaded / e.total : 0.4));
  model = gltf.scene;
  morph = bindMorph(model, THREE.AnimationClip.findByName(gltf.animations, 'PhoneToLaptop'));
  model.traverse((o) => {
    if (o.isMesh && o.name.startsWith('Hero_Screen')) {
      screenMat = new THREE.MeshBasicMaterial({ toneMapped: false });
      o.material = screenMat;
    }
  });
  holder.add(model);
}

// ------------------------------------------------------------------ props
const shadow = new THREE.Group();
const shadowMesh = createShadow();
shadow.add(shadowMesh);
scene.add(shadow);
let results, ring;

// ------------------------------------------------------------------ layout
// Desktop places the device beside the copy; phones stack copy over device.
const P = (x, y, z = 0) => (isSmall ? { x: 0, y: y - 1.05, z } : { x, y, z });
const S = (s) => (isSmall ? s * 0.62 : s);
const s3 = (s) => ({ x: S(s), y: S(s), z: S(s) });
// soft contact shadow under the device: position, footprint, yaw, opacity
function shadowTo(tl, at, d, { x, y, z = 0, w, depth, yaw = 0, o = 0.4 }) {
  const p = P(x, y, z);
  tl.to(shadow.position, { x: p.x, y: p.y, z: p.z, duration: d }, at)
    .to(shadow.scale, { x: S(w), z: S(depth), duration: d }, at)
    .to(shadow.rotation, { y: yaw, duration: d }, at)
    .to(shadowMesh.material, { opacity: o, duration: d }, at);
}
const PHONE_FOOT = { w: 1.05, depth: 0.42 };      // standing phone
const LAPTOP_FOOT = { w: 3.1, depth: 2.3 };

// ------------------------------------------------------------------ worlds
const TONE = 'cinematic';
// Brand palette (kurumsal kimlik): krem grounds, gece text, kiremit accent;
// the works room turns gece, where the accent switches to kiremit-açık.
const LIGHT = { fg: '#16213A', muted: '#5B6478', accent: '#D9482B', dolgu: '#2B3B63' };
const WORLDS = {
  intro:   { bg: '#F7F1E6', ...LIGHT },
  qr:      { bg: '#F1E7D6', ...LIGHT },   // krem, a shade warmer
  web:     { bg: '#E6EBF1', ...LIGHT },   // sis, lifted toward krem
  seo:     { bg: '#F7F1E6', ...LIGHT },
  works:   { bg: '#16213A', fg: '#F7F1E6', muted: '#8A8F9C', accent: '#E98B72', dolgu: '#FFFFFF' },
  about:   { bg: '#F1E7D6', ...LIGHT },
  contact: { bg: '#F7F1E6', ...LIGHT },
};
function world(tl, w, at, d = 0) {
  const c = new THREE.Color(w.bg);
  tl.to(scene.background, { r: c.r, g: c.g, b: c.b, duration: d }, at)
    .to(scene.fog.color, { r: c.r, g: c.g, b: c.b, duration: d }, at)
    // CSS colours snap mid-blend (tweening root variables restyles the page every frame)
    .to(document.documentElement, { '--bg': w.bg, '--fg': w.fg, '--muted': w.muted, '--accent': w.accent, '--dolgu': w.dolgu, duration: 0 }, at + d / 2);
}
const rigTo = (tl, at, d, { pos, rot, scale, ease }) => {
  const p = P(...pos);
  tl.to(rig.position, { ...p, duration: d, ease }, at)
    .to(rig.rotation, { x: rot[0], y: rot[1], z: rot[2] ?? 0, duration: d, ease }, at)
    .to(rig.scale, { ...s3(scale), duration: d, ease }, at);
};
const camTo = (tl, at, d, { pos, tilt = 0, ease }) => {
  const [x, y, z] = pos;
  tl.to(camRig.position, { x: isSmall ? 0 : x, y, z: isSmall ? z * 1.12 : z, duration: d, ease }, at)
    .to(camRig.rotation, { x: tilt, duration: d, ease }, at);
};

// ------------------------------------------------------------------ scenes
// One timeline; 1 unit = one viewport of scroll. enter → setup(at, d) →
// build(tl, a, end). Copy lands at a + copyAt and leaves before the next
// transition. `zone` marks extra ranges the playhead must not rush through.
const SCENES = [
  {
    id: 'intro', label: 'Açılış', nav: 'intro', length: 2,
    build(tl, a, end) {
      // the phone lies on the table under the headline; the camera eases in
      camTo(tl, a, end - a, { pos: [0, 1.85, 6.0], tilt: -0.36 });
      tl.to(rig.rotation, { z: 0.22, duration: end - a }, a)
        .to(shadow.rotation, { y: 0.22, duration: end - a }, a);
    },
  },
  {
    // same table, new mood: the phone stands up and turns to show the menu
    id: 'qr', label: 'QR Menü', nav: 'qr', length: 2,
    enter: { mode: 'oneshot', duration: 0.8 },
    setup(tl, at, d) {
      world(tl, WORLDS.qr, at, d);
      rigTo(tl, at, d, { pos: [1.35, -0.05], rot: [0, -0.5, 0], scale: 1.05, ease: 'power2.inOut' });
      camTo(tl, at, d, { pos: [0, -0.1, 5.3], tilt: 0.02, ease: 'power2.inOut' });
      shadowTo(tl, at, d, { x: 1.35, y: -0.05 - 0.86 * 1.05, ...PHONE_FOOT, yaw: -0.5, o: 0.35 });
      tl.to(pose, { idle: 1, duration: d }, at)
        .to(pose, { phone: 1, duration: 0 }, at + d * 0.45);
    },
    build(tl, a, end) {
      tl.to(rig.rotation, { y: -0.18, duration: end - a }, a)
        .to(shadow.rotation, { y: -0.18, duration: end - a }, a)
        .to(pose, { menu: 1, duration: end - a - 0.3, ease: 'power1.inOut' }, a)
        .to(camRig.position, { z: isSmall ? 5.5 : 4.9, duration: end - a }, a);
    },
  },
  {
    // the signature moment: the phone mechanically becomes a laptop (no veil)
    id: 'web', label: 'Web Sitesi', nav: 'qr', length: 2.6,
    enter: { mode: 'oneshot', duration: 1.4 },
    setup(tl, at, d) {
      world(tl, WORLDS.web, at, d);
      tl.to(pose, { morph: 1, duration: d, ease: 'power1.inOut' }, at);
      // two-phase camera: stay close at three-quarters while the deck slides
      // out and swings, then pull back to the laptop's shot
      const a1 = d * 0.55;
      rigTo(tl, at, a1, { pos: [0.45, 0.25], rot: [0.12, 0.62, 0], scale: 0.9, ease: 'power2.inOut' });
      camTo(tl, at, a1, { pos: [0, -0.2, 6.2], tilt: 0, ease: 'power2.inOut' });
      rigTo(tl, at + a1, d - a1, { pos: [1.0, -0.3], rot: [0.16, -0.3, 0], scale: 0.9, ease: 'power2.inOut' });
      camTo(tl, at + a1, d - a1, { pos: [0, 0.55, 6.7], tilt: -0.07, ease: 'power2.inOut' });
      tl.to(shadowMesh.material, { opacity: 0, duration: a1 * 0.5 }, at);
      shadowTo(tl, at + a1, d - a1, { x: 1.0, y: -0.3 - 0.86 * 0.9, ...LAPTOP_FOOT, yaw: -0.3, o: 0.4 });
    },
    build(tl, a, end) {
      tl.to(rig.rotation, { y: -0.06, duration: end - a }, a)
        .to(shadow.rotation, { y: -0.06, duration: end - a }, a)
        .to(camRig.position, { z: isSmall ? 7.2 : 6.3, duration: end - a }, a);
    },
  },
  {
    // no veil: the laptop slides aside while the search results line up
    id: 'seo', label: 'SEO', nav: 'qr', length: 2,
    enter: { mode: 'oneshot', duration: 0.55 },
    setup(tl, at, d) {
      world(tl, WORLDS.seo, at, d);
      rigTo(tl, at, d, { pos: [-1.8, -0.4], rot: [0.2, 0.5, 0], scale: 0.62, ease: 'power2.inOut' });
      camTo(tl, at, d, { pos: [0, 0, 6.6], tilt: 0, ease: 'power2.inOut' });
      shadowTo(tl, at, d, { x: -1.8, y: -0.4 - 0.86 * 0.62, ...LAPTOP_FOOT, yaw: 0.5, o: 0.35 });
      tl.to(pose, { laptop: 1, duration: 0 }, at + d * 0.5)
        .to(pose, { seoA: 1, duration: d * 0.6 }, at + d * 0.4);
    },
    build(tl, a, end) {
      tl.to(pose, { seo: 1, duration: end - a - 0.45, ease: 'power1.inOut' }, a)
        .to(camRig.position, { y: 0.3, duration: end - a }, a)
        .to(camRig.rotation, { x: 0.03, duration: end - a }, a)
        .to(rig.rotation, { y: 0.34, duration: end - a }, a);
    },
  },
  {
    // no veil: the room darkens around the laptop as the cards come in
    id: 'works', label: 'İşler', nav: 'works', length: 2.2,
    enter: { mode: 'oneshot', duration: 0.6 },
    setup(tl, at, d) {
      world(tl, WORLDS.works, at, d);
      rigTo(tl, at, d, { pos: [0, 0.55], rot: [0.28, 0, 0], scale: 0.5, ease: 'power2.inOut' });
      camTo(tl, at, d, { pos: [0, 1.0, 7.8], tilt: -0.1, ease: 'power2.inOut' });
      shadowTo(tl, at, d, { x: 0, y: 0.55 - 0.86 * 0.5, ...LAPTOP_FOOT, o: 0.2 });
      // one cast leaves before the next arrives, never both at once
      tl.to(pose, { seoA: 0, duration: d * 0.4 }, at)
        .to(pose, { laptop: 0, duration: 0 }, at + d * 0.4)
        .to(pose, { worksA: 1, turn: 0.5, duration: d * 0.6 }, at + d * 0.4);
    },
    build(tl, a, end) {
      // half a turn (four cards past the front), not a full lap: a calm sweep
      tl.to(pose, { turn: 0.5 + Math.min((ring?.n ?? 8) - 1, 4), duration: end - a - 0.3, ease: 'power1.inOut' }, a)
        .to(rig.rotation, { y: 0.5, duration: end - a }, a);
    },
  },
  {
    // no veil: the lights come back up, the founder on screen
    id: 'about', label: 'Hakkımızda', nav: 'about', length: 1.8,
    enter: { mode: 'oneshot', duration: 0.55 },
    setup(tl, at, d) {
      world(tl, WORLDS.about, at, d);
      rigTo(tl, at, d, { pos: [-1.3, -0.12], rot: [0.14, 0.5, 0], scale: 0.86, ease: 'power2.inOut' });
      camTo(tl, at, d, { pos: [0, 0.35, 6.4], tilt: -0.04, ease: 'power2.inOut' });
      shadowTo(tl, at, d, { x: -1.3, y: -0.12 - 0.86 * 0.86, ...LAPTOP_FOOT, yaw: 0.5, o: 0.35 });
      tl.to(pose, { worksA: 0, duration: d * 0.45 }, at)
        .to(pose, { laptop: 2, duration: 0 }, at + d * 0.45);
    },
    build(tl, a, end) {
      tl.to(rig.rotation, { y: 0.26, duration: end - a }, a)
        .to(shadow.rotation, { y: 0.26, duration: end - a }, a)
        .to(camRig.position, { x: isSmall ? 0 : 0.15, duration: end - a }, a);
    },
  },
  {
    // no veil: the reverse transformation IS the transition — the laptop
    // folds back into the phone while it glides across and the room brightens
    id: 'contact', label: 'İletişim', nav: 'contact', length: 2.2, copyAt: 0.55, zone: [-0.45, 0.45],
    enter: { mode: 'oneshot', duration: 0.45 },
    setup(tl, at, d) {
      const m = 0.9;
      world(tl, WORLDS.contact, at, d);
      tl.to(pose, { morph: 0, duration: m, ease: 'power1.inOut' }, at)
        .to(pose, { phone: 2, duration: 0 }, at);
      rigTo(tl, at, m, { pos: [1.5, 0], rot: [0, -0.3, 0], scale: 1.1, ease: 'power2.inOut' });
      camTo(tl, at, m, { pos: [0, 0, 5.3], tilt: 0, ease: 'power2.inOut' });
      tl.to(shadowMesh.material, { opacity: 0, duration: m * 0.3 }, at);
      shadowTo(tl, at + m * 0.5, m * 0.5, { x: 1.5, y: -0.86 * 1.1, ...PHONE_FOOT, yaw: -0.3, o: 0.35 });
    },
    build(tl, a, end) {
      tl.to(rig.rotation, { y: -0.12, duration: end - a - 0.45 }, a + 0.45)
        .to(shadow.rotation, { y: -0.12, duration: end - a - 0.45 }, a + 0.45);
    },
  },
];

// Starting pose = the intro shot (the timeline tweens away from these).
function initialPose() {
  const p = P(0, -1.15, 0);
  rig.position.set(p.x, p.y, p.z);
  rig.rotation.set(-Math.PI / 2, 0, 0.5);
  rig.scale.setScalar(S(1));
  camRig.position.set(0, 2.1, isSmall ? 7.4 : 6.6);
  camRig.rotation.x = -0.4;
  shadow.position.set(p.x, p.y - 0.05, p.z);
  shadow.scale.set(S(1.0), 1, S(1.9));
  shadow.rotation.y = 0.5;
  shadowMesh.material.opacity = 0.45;
}

// ------------------------------------------------------------------ copy
// the pieces of a scene's copy that fade/slide (the headline's words mask separately)
const REST = ':scope > .eyebrow, :scope > .lede, :scope > .contact, :scope > .r-btn';
function copyIn(tl, id, at) {
  const el = document.querySelector(`.copy[data-scene="${id}"]`);
  if (!el) return;
  const words = el.querySelectorAll('.w > *');
  const rest = el.querySelectorAll(REST);
  // start hidden: the section turns visible at `at` but the rest only starts
  // fading at `at + 0.1`, so without this the lede and label flash in first
  gsap.set(words, { yPercent: 110 });
  if (rest.length) gsap.set(rest, { autoAlpha: 0, y: 16 });
  tl.set(el, { visibility: 'visible' }, at)
    .fromTo(words, { yPercent: 110 },
      { yPercent: 0, stagger: 0.02, duration: 0.3, ease: 'power3.out', immediateRender: false }, at);
  if (rest.length) {
    tl.fromTo(rest, { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, stagger: 0.04, duration: 0.25, immediateRender: false }, at + 0.1);
  }
}
function copyOut(tl, id, at) {
  const el = document.querySelector(`.copy[data-scene="${id}"]`);
  if (!el) return;
  tl.to(el.querySelectorAll('.w > *'), { yPercent: -110, stagger: 0.01, duration: 0.25, ease: 'power2.in' }, at)
    .to(el.querySelectorAll(REST), { autoAlpha: 0, duration: 0.2 }, at)
    .set(el, { visibility: 'hidden' }, at + 0.3);
}

// ------------------------------------------------------------------ director
let total = 0;
const settled = {};      // scene id → timeline time where it reads best (nav jumps)

function buildStory() {
  total = SCENES.reduce((s, sc) => s + sc.length, 0);
  document.getElementById('story').style.height = `${(total + 1) * 100}lvh`;

  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  const starts = [];
  const zones = [];
  let t = 0;
  SCENES.forEach((sc, i) => {
    starts.push(t);
    const end = t + sc.length;
    const a = sc.enter ? transition(tl, veil, sc.enter, t, (at, d) => sc.setup(tl, at, d)) : t;
    if (sc.enter && sc.enter.mode !== 'cut') zones.push([t - 0.05, a + 0.05]);
    if (sc.zone) zones.push([a + sc.zone[0], a + sc.zone[1]]);
    sc.build?.(tl, a, end);
    const copyAt = a + (sc.copyAt ?? 0.1);
    if (i > 0) copyIn(tl, sc.id, copyAt);
    if (i < SCENES.length - 1) copyOut(tl, sc.id, end - 0.35);
    settled[sc.id] = i === 0 ? 0 : copyAt + 0.4;
    t = end;
  });
  auditTransitions(TONE, SCENES.filter((sc) => sc.enter).map((sc) => sc.enter.mode));
  tl.to({}, { duration: 0.001 }, total);

  const trail = createTrailProgress(document.querySelector('[data-hud-trail]'));
  const idx = document.querySelector('[data-hud-index]');
  const label = document.querySelector('[data-hud-label]');
  const links = [...document.querySelectorAll('.nav__menu a')];
  let current = -1;

  const playhead = createPlayhead(tl, { zones, reduced: reducedMotion });
  window.playhead = playhead;
  gsap.ticker.add((_, dt) => playhead.update(Math.min(dt, 100) / 1000));
  ScrollTrigger.create({
    trigger: '#story', start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => playhead.seek(self.progress * total),
  });
  tl.eventCallback('onUpdate', () => {
    const time = tl.time();
    trail.set(time / total);
    const i = Math.max(0, starts.findLastIndex((s) => s <= time + 1e-4));
    if (i !== current) {
      current = i;
      idx.textContent = String(i + 1).padStart(2, '0');
      label.textContent = SCENES[i].label;
      links.forEach((l) => l.setAttribute('aria-current', String(l.dataset.go === SCENES[i].nav)));
    }
  });
  currentScene = () => SCENES[Math.max(current, 0)].id;
}
let currentScene = () => 'intro';

// nav: jump the scroll to a scene; the playhead rushes (transitions still play, faster)
function wireNav() {
  document.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.dataset.go;
    if (!(id in settled)) return;
    e.preventDefault();
    const y = (document.documentElement.scrollHeight - innerHeight) * (settled[id] / total);
    if (window.lenis) window.lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
    window.playhead?.rush(6);
  }));
}

// ------------------------------------------------------------------ loop
const timer = new THREE.Timer();
const pointer = new THREE.Vector2();
addEventListener('pointermove', (e) => pointer.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5));

const heroScreen = new THREE.Vector3();
const fadeEl = document.querySelector('.fade');
let fadeBg = '';
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function frame() {
  timer.update();
  const time = timer.getElapsed();
  const m = pose.morph;
  morph.set(m);
  if (model) model.position.z = -0.65 * m;           // pivot the laptop about its middle

  if (!reducedMotion) {
    const k = pose.idle;
    holder.rotation.y += ((pointer.x * 0.22 + Math.sin(time * 0.35) * 0.05) * k - holder.rotation.y) * 0.05;
    holder.rotation.x += (pointer.y * 0.1 * k - holder.rotation.x) * 0.05;
    holder.position.y = Math.sin(time * 0.8) * 0.03 * k;
  }

  if (screenMat && screens) {
    // the screen switches content while it's dark mid-transformation
    const map = m < 0.5 ? screens.phone[Math.round(pose.phone)] : screens.laptop[Math.round(pose.laptop)];
    if (screenMat.map !== map) screenMat.map = map;
    screens.phone[1].offset.y = 0.5 * pose.menu;
    const dim = 1 - smooth(0.36, 0.5, m) * (1 - smooth(0.5, 0.68, m));
    screenMat.color.setScalar(Math.max(0.03, dim));
  }
  results?.update(pose.seo, pose.seoA);
  ring?.update(pose.turn, pose.worksA);

  // the top/bottom fade matches the 3D background as it blends (only this
  // element restyles; the page's --bg still snaps once per world)
  const bg = scene.background.getHexString();
  if (bg !== fadeBg) { fadeBg = bg; fadeEl.style.setProperty('--fade', `#${bg}`); }

  rig.getWorldPosition(heroScreen).project(camera);
  veil.uniforms.uCenter.value.set(
    THREE.MathUtils.clamp(heroScreen.x * 0.5 + 0.5, 0.1, 0.9),
    THREE.MathUtils.clamp(heroScreen.y * 0.5 + 0.5, 0.1, 0.9),
  );
  renderer.render(scene, camera);
  veil.render(renderer, time);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  veil.resize(innerWidth, innerHeight);
});

// works: a card with a link opens it
const ray = new THREE.Raycaster();
addEventListener('click', (e) => {
  if (!ring || currentScene() !== 'works') return;
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = ray.intersectObjects(ring.cards)[0];
  if (hit?.object.userData.url) window.open(hit.object.userData.url, '_blank', 'noopener');
});

// ------------------------------------------------------------------ loader
// the Kalkış loader (ui/recre-ui.js): the trail draws, the plane waits for the
// page, then takes off and the curtain lifts — the page enters as it lifts
const kalkis = createLoader(document.querySelector('[data-loader]'), {
  onReveal() {
    document.documentElement.classList.add('is-ready');
    gsap.set('.copy[data-scene="intro"]', { visibility: 'visible' });
    if (!reducedMotion) gsap.from(camera.position, { z: 1.2, y: 0.4, duration: 2.4, ease: 'power3.out' });
  },
});
function setLoader(p) { kalkis.progress(p); }

// ------------------------------------------------------------------ boot
async function boot() {
  splitWords();
  const projects = await fetch('./data/projects.json').then((r) => r.json()).catch(() => []);
  const [, scr, rng] = await Promise.all([loadHero(), createScreens(), createRing(projects)]);
  screens = scr;
  screenMat.map = screens.phone[0];
  ring = rng;
  results = createResults();
  const rp = isSmall ? { x: 0, y: -0.15, z: -0.4 } : { x: 1.95, y: 0.1, z: 0 };
  results.group.position.set(rp.x, rp.y, rp.z);
  results.group.scale.setScalar(isSmall ? 0.42 : 0.84);
  // the ring runs below the laptop, so a card at the front never covers it
  ring.group.position.set(0, isSmall ? -1.3 : -0.42, 0);
  if (isSmall) ring.group.scale.setScalar(0.62);
  scene.add(results.group, ring.group);
  initialPose();
  setLoader(0.85);

  // warm up behind the loader: first-time shader compiles and texture
  // uploads mid-scroll are visible freezes
  results.update(0.5, 1);
  ring.update(0, 1);
  renderer.compile(scene, camera);
  [...screens.phone, ...screens.laptop].forEach((t) => renderer.initTexture(t));
  scene.traverse((o) => [o.material].flat().forEach((mt) => mt?.map && renderer.initTexture(mt.map)));
  results.update(0, 0);
  ring.update(0, 0);
  veil.uniforms.uProgress.value = 0.5; veil.render(renderer, 0);
  veil.uniforms.uProgress.value = 0;

  if (!reducedMotion) {
    const lenis = new Lenis({ lerp: 0.08 });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  gsap.ticker.add(frame);
  buildStory();
  wireNav();

  setLoader(1);
  await kalkis.finish();
}

boot().catch((err) => {
  console.error(err);
  fallback();
});
