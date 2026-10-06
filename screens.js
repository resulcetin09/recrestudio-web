import * as THREE from 'three';
import qrcode from 'qrcode-generator';

// Everything the hero's one screen shows, drawn once at boot into canvases.
// The screen mesh has UVs 0..1 in both states (phone and laptop), so each
// canvas is drawn at the aspect of the state it is shown in:
//   phone  0.47 (portrait)      laptop 1.65 (landscape)
// The page swaps textures (cheap once uploaded); nothing is redrawn while
// scrolling.

export const INSTAGRAM = 'https://www.instagram.com/recre_studio/';
export const EMAIL = 'recrestudio0@gmail.com';
// the opening phone's QR ("Masa 07") opens Kuytu's menu at table 7, a ReCre work
const KUYTU_MENU = 'https://kuytu-menu.vercel.app/m/kuytu?masa=7';

// brand palette (kurumsal kimlik)
const INK = '#16213A';       // gece: all text
const GREY = '#5B6478';      // secondary text on light
const LINE = '#E2DACB';
const KREM = '#F7F1E6';
const KIREMIT = '#D9482B';
const CHIP = '#ECE2D0';      // krem, a step deeper: chips and cards
const SIS = '#C9D3E0';
const SERIF = '"Fraunces", Georgia, serif';   // always with an explicit weight (default is 900)
const SANS = 'Inter, system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

const PHONE = [600, 1276];
const LAPTOP = [1650, 1000];

function canvas(w, h, bg = KREM) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.textBaseline = 'alphabetic';
  return [c, g];
}

function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.flipY = false;               // glTF UVs: v = 0 is the top of the image
  return t;
}

function text(g, str, x, y, { font, color = INK, align = 'left' }) {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = align;
  g.fillText(str, x, y);
  return g.measureText(str).width;
}

// "Markanı *ekrana* taşıyoruz." — italic kiremit for the *word*, like the page copy
function rich(g, str, x, y, size, align = 'center') {
  const parts = str.split(/(\*[^*]+\*)/).filter(Boolean).map((p) => {
    const em = p.startsWith('*');
    const s = em ? p.slice(1, -1) : p;
    g.font = `${em ? 'italic ' : ''}500 ${size}px ${SERIF}`;
    return { s, em, w: g.measureText(s).width };
  });
  const total = parts.reduce((a, p) => a + p.w, 0);
  let cx = align === 'center' ? x - total / 2 : x;
  g.textAlign = 'left';
  for (const p of parts) {
    g.font = `${p.em ? 'italic ' : ''}500 ${size}px ${SERIF}`;
    g.fillStyle = p.em ? KIREMIT : INK;
    g.fillText(p.s, cx, y);
    cx += p.w;
  }
}

function pill(g, x, y, w, h, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, h / 2);
  g.fill();
}

function box(g, x, y, w, h, r, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

// the brand badge (assets/brand/rozet-kiremit.svg), loaded once in createScreens()
let rozet = null;
function drawRozet(g, cx, cy, d) {
  if (!rozet) return;
  const w = d * rozet.naturalWidth / rozet.naturalHeight;   // viewBox is a touch wider than the circle
  g.drawImage(rozet, cx - d / 2, cy - d / 2, w, d);
}

function drawQR(g, url, x, y, size, color = INK) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const cell = Math.floor(size / (n + 2));     // whole pixels: no hairline seams
  const ox = Math.round(x + (size - cell * n) / 2), oy = Math.round(y + (size - cell * n) / 2);
  g.fillStyle = KREM;
  g.fillRect(x, y, size, size);
  g.fillStyle = color;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) g.fillRect(ox + c * cell, oy + r * cell, cell, cell);
    }
  }
}

function statusBar(g, w, color = INK) {
  text(g, '9:41', 48, 58, { font: `600 26px ${SANS}`, color });
  box(g, w - 96, 38, 48, 22, 6, color);
}

// --------------------------------------------------------------- phone

function phoneQR() {
  const [c, g] = canvas(...PHONE);
  const w = PHONE[0];
  statusBar(g, w);
  drawRozet(g, w / 2, 160, 96);
  text(g, 'ReCre', w / 2, 300, { font: `500 88px ${SERIF}`, align: 'center' });
  text(g, 'DİJİTAL MENÜ', w / 2, 350, { font: `500 20px ${MONO}`, color: GREY, align: 'center' });
  drawQR(g, KUYTU_MENU, (w - 400) / 2, 420, 400);
  text(g, 'Menüyü görmek için', w / 2, 910, { font: `400 30px ${SANS}`, color: GREY, align: 'center' });
  text(g, 'kameranla okut', w / 2, 952, { font: `400 30px ${SANS}`, color: GREY, align: 'center' });
  pill(g, w / 2 - 110, 1040, 220, 64, INK);
  text(g, 'Masa 07', w / 2, 1082, { font: `500 26px ${SANS}`, color: KREM, align: 'center' });
  return texture(c);
}

// Twice the screen's height; the page scrolls it with texture.offset.
// Kuytu's QR menu (a ReCre work), captured by tools/isler-yakala.mjs.
async function phoneMenu() {
  const [w, h] = [PHONE[0], PHONE[1] * 2];
  const [c, g] = canvas(w, h, '#1C1714');
  const img = new Image();
  img.src = './assets/isler/kuytu-telefon.jpg';
  await img.decode().catch(() => {});
  if (img.naturalWidth) g.drawImage(img, 0, 0, w, img.naturalHeight * (w / img.naturalWidth));
  const t = texture(c);
  t.repeat.set(1, 0.5);            // show half; the page scrolls offset.y 0 → 0.5
  return t;
}

function phoneContact() {
  const [c, g] = canvas(...PHONE);
  const w = PHONE[0];
  statusBar(g, w);
  text(g, 'INSTAGRAM', w / 2, 210, { font: `500 22px ${MONO}`, color: GREY, align: 'center' });
  text(g, '@recre_studio', w / 2, 290, { font: `500 60px ${SERIF}`, align: 'center' });
  drawQR(g, INSTAGRAM, (w - 440) / 2, 360, 440);
  text(g, 'Okut, profile git', w / 2, 880, { font: `400 30px ${SANS}`, color: GREY, align: 'center' });
  g.fillStyle = LINE;
  g.fillRect(60, 960, w - 120, 2);
  text(g, EMAIL, w / 2, 1040, { font: `500 28px ${SANS}`, align: 'center' });
  return texture(c);
}

// --------------------------------------------------------------- laptop

function chrome(g, w, url) {
  g.fillStyle = '#E6EBF1';
  g.fillRect(0, 0, w, 64);
  [SIS, SIS, SIS].forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(34 + i * 26, 32, 8, 0, Math.PI * 2);
    g.fill();
  });
  pill(g, w / 2 - 300, 16, 600, 34, KREM);
  text(g, url, w / 2, 40, { font: `400 18px ${SANS}`, color: GREY, align: 'center' });
}

function laptopSite() {
  const [c, g] = canvas(...LAPTOP);
  const w = LAPTOP[0];
  chrome(g, w, 'recre studio');
  drawRozet(g, 96, 138, 52);
  text(g, 'ReCre', 134, 154, { font: `500 40px ${SERIF}` });
  const nav = ['Ana Sayfa', 'Hizmetler', 'İşler', 'Hakkımızda', 'İletişim'];
  let x = 820;
  nav.forEach((s, i) => { x += text(g, s, x, 145, { font: `400 20px ${SANS}`, color: i ? GREY : INK }) + 38; });
  pill(g, w - 230, 115, 160, 48, INK);
  text(g, 'Teklif Al', w - 150, 146, { font: `500 19px ${SANS}`, color: KREM, align: 'center' });
  rich(g, 'Markanı *ekrana*', w / 2, 400, 116);
  rich(g, 'taşıyoruz.', w / 2, 520, 116);
  text(g, 'Restoranlar, kafeler ve yerel markalar için dijital QR menü, hızlı web siteleri', w / 2, 610,
    { font: `400 24px ${SANS}`, color: GREY, align: 'center' });
  text(g, 've bulunmayı sağlayan SEO. Tasarımdan yayına tek elden.', w / 2, 646,
    { font: `400 24px ${SANS}`, color: GREY, align: 'center' });
  pill(g, w / 2 - 170, 700, 340, 76, INK);
  text(g, 'Projeni Konuşalım', w / 2, 747, { font: `500 24px ${SANS}`, color: KREM, align: 'center' });
  ['Dijital QR Menü', 'Web Sitesi', 'SEO & Optimizasyon'].forEach((s, i) => {
    const bx = 150 + i * 460;
    box(g, bx, 850, 420, 150, 18, CHIP);
    text(g, `0${i + 1}`, bx + 30, 900, { font: `500 18px ${MONO}`, color: GREY });
    text(g, s, bx + 30, 960, { font: `500 36px ${SERIF}` });
  });
  return texture(c);
}

function laptopSearch() {
  const [c, g] = canvas(...LAPTOP);
  const w = LAPTOP[0];
  chrome(g, w, 'arama');
  text(g, 'Ara', 70, 168, { font: `500 46px ${SERIF}` });
  g.strokeStyle = SIS;
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(180, 120, 760, 64, 32);
  g.stroke();
  text(g, 'kafe için qr menü', 216, 162, { font: `400 24px ${SANS}` });
  text(g, 'Yaklaşık 1.240.000 sonuç', 180, 240, { font: `400 18px ${SANS}`, color: GREY });
  // result 1: us
  box(g, 150, 270, 1000, 190, 18, CHIP);
  text(g, '1', 185, 330, { font: `500 20px ${MONO}`, color: GREY });
  text(g, 'instagram.com › recre_studio', 230, 322, { font: `400 20px ${SANS}`, color: GREY });
  text(g, 'ReCre Studio — Dijital QR Menü, Web Sitesi, SEO', 230, 376, { font: `500 36px ${SERIF}` });
  text(g, 'Menünü QR ile masaya taşı; siteni hızlandır, aramada öne çık.', 230, 424,
    { font: `400 22px ${SANS}`, color: GREY });
  for (let i = 0; i < 4; i++) {
    const y = 510 + i * 118;
    text(g, String(i + 2), 185, y + 24, { font: `500 20px ${MONO}`, color: '#A9B3C2' });
    box(g, 230, y, 260, 16, 8, '#DCE2EA');
    box(g, 230, y + 34, 620 - i * 40, 26, 10, SIS);
    box(g, 230, y + 76, 860 - i * 60, 14, 7, '#E3E8EF');
  }
  box(g, 1230, 270, 350, 420, 18, '#FBF7F0');
  drawRozet(g, 1530, 316, 56);
  text(g, 'ReCre Studio', 1260, 330, { font: `500 32px ${SERIF}` });
  text(g, 'Sosyal medya ajansı', 1260, 366, { font: `400 20px ${SANS}`, color: GREY });
  ['QR Menü', 'Web Sitesi', 'SEO'].forEach((s, i) => pill(g, 1260, 410 + i * 60, 180 + i * 20, 40, CHIP));
  return texture(c);
}

async function laptopAbout() {
  const [c, g] = canvas(...LAPTOP);
  const w = LAPTOP[0];
  chrome(g, w, 'recre studio / hakkımızda');
  const img = new Image();
  img.src = './assets/avatar.png';
  await img.decode().catch(() => {});
  box(g, 110, 150, 620, 760, 28, '#3A2418');
  if (img.naturalWidth) {
    g.save();
    g.beginPath();
    g.roundRect(110, 150, 620, 760, 28);
    g.clip();
    const s = Math.max(620 / img.naturalWidth, 760 / img.naturalHeight);
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    g.drawImage(img, 110 + (620 - iw) / 2, 150 + (760 - ih) / 2, iw, ih);
    g.restore();
  }
  text(g, 'HAKKIMIZDA', 820, 250, { font: `500 20px ${MONO}`, color: GREY });
  rich(g, 'Tasarımdan yayına', 820, 360, 80, 'left');
  rich(g, '*tek* elden.', 820, 450, 80, 'left');
  const lines = [
    'Restoranlar, kafeler ve yerel markalar için',
    'dijital QR menü, web sitesi ve SEO. Fikirden',
    'yayına kadar her adımı aynı ekip yürütür.',
  ];
  lines.forEach((l, i) => text(g, l, 820, 540 + i * 40, { font: `400 25px ${SANS}`, color: GREY }));
  let x = 820;
  ['Tasarım', 'Yazılım', 'SEO'].forEach((s) => {
    g.font = `500 22px ${SANS}`;
    const cw = g.measureText(s).width + 48;
    pill(g, x, 700, cw, 56, CHIP);
    text(g, s, x + 24, 736, { font: `500 22px ${SANS}` });
    x += cw + 14;
  });
  return texture(c);
}

// --------------------------------------------------------------- api

export async function createScreens() {
  const badge = new Image();
  badge.src = './assets/brand/rozet-kiremit.svg';
  await Promise.all([
    badge.decode().then(() => { rozet = badge; }).catch(() => {}),
    document.fonts.load(`500 64px ${SERIF}`), document.fonts.load(`italic 500 64px ${SERIF}`),
    document.fonts.load(`400 24px ${SANS}`), document.fonts.load(`600 24px ${SANS}`),
    document.fonts.load(`500 20px ${MONO}`),
  ]).catch(() => {});
  return {
    phone: [phoneQR(), await phoneMenu(), phoneContact()], // pose.phoneScreen
    laptop: [laptopSite(), laptopSearch(), await laptopAbout()], // pose.laptopScreen
  };
}
