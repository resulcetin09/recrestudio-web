import * as THREE from 'three';

// Supporting cast around the hero: a soft contact shadow, the search-result
// column (SEO scene) and the project ring (Works scene). All driven by plain
// numbers from `pose` in main.js' frame(), so the timeline stays scrub-safe.

const SERIF = '"Fraunces", Georgia, serif';   // always with an explicit weight (default is 900)
const SANS = 'Inter, system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const ease = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const window01 = (x, a, b) => ease(clamp01((x - a) / (b - a)));

// --------------------------------------------------------------- shadow

export function createShadow() {
  const tex = canvasTexture(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,0.55)');
    r.addColorStop(0.45, 'rgba(0,0,0,0.22)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}

// --------------------------------------------------------------- SEO column

function resultCard(ours) {
  return canvasTexture(900, 172, (g, w, h) => {
    g.fillStyle = ours ? '#16213A' : '#FBF7F0';
    g.beginPath();
    g.roundRect(2, 2, w - 4, h - 4, 26);
    g.fill();
    if (!ours) {
      g.strokeStyle = '#DCE2EA';
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#DCE2EA';
      g.beginPath(); g.roundRect(48, 42, 220, 16, 8); g.fill();
      g.fillStyle = '#C9D3E0';
      g.beginPath(); g.roundRect(48, 76, 520, 28, 12); g.fill();
      g.fillStyle = '#E3E8EF';
      g.beginPath(); g.roundRect(48, 122, 700, 14, 7); g.fill();
      return;
    }
    g.fillStyle = '#8A8F9C';
    g.font = `500 22px ${MONO}`;
    g.fillText('1 · instagram.com › recre_studio', 48, 60);
    g.fillStyle = '#F7F1E6';
    g.font = `500 48px ${SERIF}`;
    g.fillText('ReCre Studio — QR Menü, Web, SEO', 48, 126);
  });
}

export function createResults(count = 6) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(2.4, 0.46);
  const others = new THREE.InstancedMesh(geo,
    new THREE.MeshBasicMaterial({ map: resultCard(false), transparent: true, toneMapped: false }), count);
  const ours = new THREE.Mesh(geo,
    new THREE.MeshBasicMaterial({ map: resultCard(true), transparent: true, toneMapped: false }));
  ours.position.z = 0.02;
  group.add(others, ours);
  const m = new THREE.Matrix4();
  const gap = 0.56;
  return {
    group,
    // p: 0 = ours at the bottom of the page, 1 = ours ranked first
    update(p, alpha) {
      group.visible = alpha > 0.001;
      if (!group.visible) return;
      others.material.opacity = ours.material.opacity = alpha;
      const rise = window01(p, 0.05, 0.8);
      const make = window01(p, 0.5, 0.85);          // the others step down to make room
      for (let i = 0; i < count; i++) {
        m.makeTranslation(0, 1.15 - i * gap - make * gap, 0);
        others.setMatrixAt(i, m);
      }
      others.instanceMatrix.needsUpdate = true;
      ours.position.y = THREE.MathUtils.lerp(-2.6, 1.15, rise);
      ours.position.x = Math.sin(rise * Math.PI) * 0.35;   // steps out of the column while climbing
      ours.scale.setScalar(1 + Math.sin(rise * Math.PI) * 0.06);
    },
  };
}

// --------------------------------------------------------------- works ring

// Placeholder cards until real projects arrive (data/projects.json).
const PLACEHOLDERS = [
  { title: 'Yakında', category: 'Dijital QR Menü' },
  { title: 'Yakında', category: 'Web Sitesi' },
  { title: 'Yakında', category: 'SEO & Optimizasyon' },
  { title: 'Yakında', category: 'Sosyal Medya' },
  { title: 'Yakında', category: 'Web Sitesi' },
];

// Largest size (92 → 52 px) at which the title wraps into at most `maxLines` lines of `maxW`.
function fitTitle(g, text, style, maxW, maxLines) {
  const words = text.split(' ');
  let size = 92, lines;
  for (; size >= 52; size -= 4) {
    g.font = `${style}500 ${size}px ${SERIF}`;
    lines = [];
    for (const word of words) {
      const next = lines.length ? `${lines.at(-1)} ${word}` : word;
      if (lines.length && g.measureText(next).width <= maxW) lines[lines.length - 1] = next;
      else lines.push(word);
    }
    if (lines.length <= maxLines && lines.every((l) => g.measureText(l).width <= maxW)) break;
  }
  return { size: Math.max(size, 52), lines };
}

async function workCard(p, i) {
  let img = null;
  if (p.image) {
    img = new Image();
    img.src = p.image;
    await img.decode().catch(() => { img = null; });
  }
  return canvasTexture(1000, 640, (g, w, h) => {
    g.beginPath();
    g.roundRect(0, 0, w, h, 34);
    g.clip();
    g.fillStyle = '#22304F';          // gece, lifted so the cards read on the gece room
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(247,241,230,0.07)';
    g.lineWidth = 2;
    for (let x = 40; x < w; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }

    // portrait work (a phone menu, a post) stands on the right and the text takes
    // the left; a website runs below its title like a window off the card's edge
    const portrait = img && img.naturalHeight > img.naturalWidth;
    const site = img && !portrait;
    let textW = w - 112;
    if (portrait) {
      const pad = 48, ih = h - pad * 2, iw = img.naturalWidth * (ih / img.naturalHeight), ix = w - pad - iw;
      g.save();
      g.beginPath();
      g.roundRect(ix, pad, iw, ih, 22);
      g.clip();
      g.drawImage(img, ix, pad, iw, ih);
      g.restore();
      textW = ix - 56 - 40;
    }

    g.fillStyle = '#8A8F9C';
    g.font = `500 24px ${MONO}`;
    const label = `${String(i + 1).padStart(2, '0')} — ${p.category.toLocaleUpperCase('tr')}`;
    if (g.measureText(label).width > textW) {   // narrow column: the label breaks after the number
      const [num, rest] = label.split(' — ');
      g.fillText(`${num} —`, 56, 80);
      g.fillText(rest, 56, 116, textW);
    } else {
      g.fillText(label, 56, 80);
    }

    const style = img ? '' : 'italic ';
    const { size, lines } = fitTitle(g, p.title, style, textW, site ? 1 : portrait ? 3 : 2);
    g.fillStyle = img ? '#F7F1E6' : '#E98B72';   // placeholders: italic kiremit-açık
    g.font = `${style}500 ${size}px ${SERIF}`;
    if (site) {
      const base = 114 + size * 0.8;
      g.fillText(lines[0], 56, base);
      const y = base + 44, iw = w - 112, ih = img.naturalHeight * (iw / img.naturalWidth);
      g.save();
      g.beginPath();
      g.roundRect(56, y, iw, ih, 18);
      g.clip();
      g.drawImage(img, 56, y, iw, ih);
      g.restore();
      g.strokeStyle = 'rgba(247,241,230,0.18)';
      g.beginPath();
      g.roundRect(56, y, iw, ih, 18);
      g.stroke();
    } else {
      lines.forEach((line, k) => g.fillText(line, 56, h - 70 - (lines.length - 1 - k) * size * 1.05));
    }
  });
}

export async function createRing(projects) {
  const list = projects.length ? projects : PLACEHOLDERS;
  const n = Math.max(list.length, 8);      // enough cards that neighbours sit close
  const items = Array.from({ length: n }, (_, i) => list[i % list.length]);
  // repeats fill the ring; they keep the number of the work they repeat
  const textures = await Promise.all(items.map((p, i) => workCard(p, i % list.length)));
  const group = new THREE.Group();
  const radius = 2.3;                      // tight ring: small gaps, slower sweep past the camera
  const step = (Math.PI * 2) / n;
  const geo = new THREE.PlaneGeometry(1.5, 0.96);
  const cards = items.map((p, i) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: textures[i], transparent: true, toneMapped: false, depthWrite: false,
    }));
    const a = i * step;
    mesh.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
    mesh.rotation.y = a;
    mesh.userData.url = p.url;
    group.add(mesh);
    return mesh;
  });
  return {
    group, n, cards,
    update(turn, alpha) {
      group.visible = alpha > 0.001;
      if (!group.visible) return;
      group.rotation.y = -turn * step;
      cards.forEach((card, i) => {
        let d = Math.abs(i - turn) % n;
        d = Math.min(d, n - d);
        const front = Math.max(0, 1 - d);
        card.material.opacity = alpha * (0.3 + 0.7 * front);
        card.scale.setScalar(0.85 + 0.2 * front);
      });
    },
  };
}
