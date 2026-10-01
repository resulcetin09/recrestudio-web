// ReCre Studio — web kimliği: ortak arayüz davranışları (site + kılavuz).
// Görünüm ve süreler recre-ui.css içinde; burası yalnızca sırayı yönetir.

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.classList.contains('r-az-hareket');   // the guide's preview switch
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SEEN = 'recre-yuklendi';

function seenThisSession() {
  try { return sessionStorage.getItem(SEEN) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN, '1'); } catch { /* private mode: play in full next time */ }
}

// ------------------------------------------------------------------ loader
// The trail draws (1.3s) and the plane fades in (from 1.1s) in CSS as soon as
// the page paints. finish() waits until that intro has played (the page may be
// ready sooner), then: text/trail/count fade, the plane takes off, and 300ms
// later the krem curtain lifts — onReveal fires as it starts to lift.
//
//   const loader = createLoader(el, { onReveal });
//   loader.progress(0.4);
//   await loader.finish();
//
// Options:
//   onReveal()  called when the curtain starts lifting (start the page entry here)
//   repeat      force the short repeat-visit version (default: seen this session)
//   remove      remove the element when done (default true; demos pass false)
//   start       performance.now() the intro started (default 0 = page load)
export function createLoader(el, { onReveal, repeat, remove = true, start = 0 } = {}) {
  const count = el.querySelector('[data-loader-count]');
  const isRepeat = () => repeat ?? (document.documentElement.classList.contains('r-tekrar') || seenThisSession());
  const INTRO = 1900;             // trail 1.3s + plane in from 1.1s for 0.5s ≈ 1.6s, plus a breath
  let t0 = start;

  const api = {
    progress(p) {
      if (count) count.textContent = String(Math.round(Math.min(1, Math.max(0, p)) * 100));
    },
    async finish() {
      const quick = isRepeat();
      el.classList.toggle('r-loader--tekrar', quick);
      await wait(quick || reduced() ? 0 : Math.max(0, t0 + INTRO - performance.now()));
      api.progress(1);
      if (reduced()) {
        el.classList.add('is-revealing');
        onReveal?.();
        await wait(400);
      } else {
        const lift = quick ? 200 : 300;
        const curtain = quick ? 600 : 1000;
        el.classList.add('is-leaving');
        await wait(lift);
        el.classList.add('is-revealing');
        onReveal?.();
        await wait(curtain);
      }
      markSeen();
      if (remove) el.remove();
    },
    // demos: play the intro again from the top
    reset({ repeat: r } = {}) {
      if (r !== undefined) repeat = r;
      el.classList.remove('is-playing', 'is-leaving', 'is-revealing');
      el.classList.toggle('r-loader--tekrar', !!repeat);
      api.progress(0);
      void el.offsetWidth;          // restart the CSS animations
      el.classList.add('is-playing');
      t0 = performance.now();
    },
  };
  el.classList.add('is-playing');
  return api;
}

// ------------------------------------------------------------------ flight trail
// A gently waving dashed trail; the travelled part turns --accent and a small
// Kalkış plane rides its tip, turned along the path. Points are sampled once,
// so set(p) only moves the plane and widens the clip.
const TRAIL_D = 'M2 13 C30 17 55 5 86 9 C116 13 136 8 158 4';
const PLANE = '<polygon fill="#D9482B" points="60,0 -36,2 -8,6"/><polygon fill="#EF8A68" points="60,0 -40,-24 -8,6"/>'
  + '<polygon fill="#A8321C" points="60,0 -8,6 -20,26"/><polygon fill="#7A2413" points="-8,6 -20,26 -13,9"/>';
let trailId = 0;

export function createTrailProgress(el, { samples = 200 } = {}) {
  const id = `r-trail-clip-${++trailId}`;
  el.innerHTML = `<svg class="r-trail" viewBox="0 0 170 18" aria-hidden="true">
    <defs><clipPath id="${id}"><rect x="-4" y="-6" width="0" height="30"/></clipPath></defs>
    <path class="r-trail__base" d="${TRAIL_D}"/>
    <path class="r-trail__done" d="${TRAIL_D}" clip-path="url(#${id})"/>
    <g class="r-trail__ucak"><g transform="scale(.1)">${PLANE}</g></g>
  </svg>`;
  const path = el.querySelector('.r-trail__base');
  const rect = el.querySelector(`#${id} rect`);
  const plane = el.querySelector('.r-trail__ucak');
  const len = path.getTotalLength();
  const pts = Array.from({ length: samples + 1 }, (_, i) => {
    const p = path.getPointAtLength(len * i / samples);
    const q = path.getPointAtLength(Math.min(len, len * i / samples + 0.5));
    const r = path.getPointAtLength(Math.max(0, len * i / samples - 0.5));
    return { x: p.x, y: p.y, a: Math.atan2(q.y - r.y, q.x - r.x) * 180 / Math.PI };
  });
  let last = -1;
  const api = {
    set(p) {
      const i = Math.round(Math.min(1, Math.max(0, p)) * samples);
      if (i === last) return;
      last = i;
      const { x, y, a } = pts[i];
      plane.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${a.toFixed(1)})`);
      rect.setAttribute('width', (x + 4).toFixed(2));
    },
  };
  api.set(0);
  return api;
}
