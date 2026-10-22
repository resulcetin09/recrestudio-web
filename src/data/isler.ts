// Works shown on /isler. Only clients the owner cleared on 22 Oct 2026 (Vyora is not shown).
import type { ImageMetadata } from 'astro';
import bugdoctor from '../assets/isler/bugdoctor.jpg';
import karaelmas from '../assets/isler/karaelmas.png';
import vortika from '../assets/isler/vortika.png';
import deepreo from '../assets/isler/deepreo.jpg';
import bozsKaranlik from '../assets/isler/bozs-karanlik.png';
import kuytu from '../assets/isler/kuytu.jpg';
import portfolyo from '../assets/isler/portfolyo-3d.jpg';
import parity from '../assets/isler/parity.png';

export type Kategori = 'qr-menu' | 'web' | 'sosyal' | 'kimlik';

export const KATEGORILER: { kod: Kategori; ad: string }[] = [
  { kod: 'qr-menu', ad: 'QR menü' },
  { kod: 'web', ad: 'Web sitesi' },
  { kod: 'sosyal', ad: 'Sosyal medya' },
  { kod: 'kimlik', ad: 'Marka kimliği' },
];

export type Is = {
  ad: string;
  aciklama: string;
  kategoriler: Kategori[];
  gorsel: ImageMetadata;
  alt: string;
  url?: string;
  /** grid span on desktop (12 columns) and card height */
  genislik: 4 | 6 | 8 | 12;
  yukseklik: number;
  /** how the image sits in the card */
  sunum?: 'kapla' | 'telefon' | 'tam';
  konum?: string;
};

export const ISLER: Is[] = [
  {
    ad: 'Bug Doctor', aciklama: 'İlaçlama firması için Reels ve bilgilendirme videosu', kategoriler: ['sosyal'],
    gorsel: bugdoctor, alt: 'Bug Doctor tanıtım videosundan bir kare', url: 'https://www.instagram.com/bugdoctor67/',
    genislik: 4, yukseklik: 560, konum: 'center 40%',
  },
  {
    ad: 'Karaelmas Yazılım Topluluğu', aciklama: 'Kimlik, afiş, broşür ve Instagram serisi', kategoriler: ['kimlik', 'sosyal'],
    gorsel: karaelmas, alt: 'Karaelmas Yazılım Topluluğu kimlik panosu',
    genislik: 8, yukseklik: 560,
  },
  {
    ad: 'Vortika', aciklama: 'Web güvenliği markası için 9 gönderilik tanıtım serisi', kategoriler: ['sosyal'],
    gorsel: vortika, alt: 'Vortika Instagram serisi', genislik: 6, yukseklik: 480, konum: 'top',
  },
  {
    ad: 'Deepreo', aciklama: 'Siber güvenlik şirketi için 18 gönderi ve Reels', kategoriler: ['sosyal'],
    gorsel: deepreo, alt: 'Deepreo Instagram serisi', url: 'https://www.instagram.com/deepreoinc/',
    genislik: 6, yukseklik: 480, konum: 'top',
  },
  {
    ad: 'Bozs Cafe & Bistro', aciklama: 'İki dilli, videolu QR menü', kategoriler: ['qr-menu'],
    gorsel: bozsKaranlik, alt: 'Bozs Cafe & Bistro QR menüsü', url: 'https://bozs-dijital-menu.vercel.app',
    genislik: 4, yukseklik: 440, sunum: 'telefon',
  },
  {
    ad: 'Kuytu', aciklama: 'Menü ve yönetim paneli, örnek çalışma', kategoriler: ['qr-menu'],
    gorsel: kuytu, alt: 'Kuytu QR menüsü', url: 'https://kuytu-menu.vercel.app/m/kuytu?masa=7',
    genislik: 4, yukseklik: 440, konum: 'top',
  },
  {
    ad: 'Sinematik 3D portfolyo', aciklama: 'Kaydırdıkça oynayan, 3D kahraman nesneli site', kategoriler: ['web'],
    gorsel: portfolyo, alt: 'Sinematik 3D portfolyo sitesi', url: 'https://my-portfolio-main-drab.vercel.app',
    genislik: 4, yukseklik: 440,
  },
  {
    ad: 'Parity', aciklama: 'Ücret eşitliği raporu için ürün sitesi', kategoriler: ['web'],
    gorsel: parity, alt: 'Parity web sitesi ana sayfası', url: 'https://parity-roan.vercel.app',
    genislik: 12, yukseklik: 0, sunum: 'tam',
  },
];
