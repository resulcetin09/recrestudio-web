// Packages shown on /hizmetler. Prices exclude VAT; menu and website packages are one-off
// (hosting and domain extra), social media is monthly. Decided by the owner on 22 Oct 2026.

export type Paket = {
  kod: string;
  grup: string;
  ad: string;
  fiyat: string;
  donem?: string;
  ozellikler: string[];
  onerilen?: boolean;
  ozel?: boolean;
};

export const PAKETLER: Paket[] = [
  {
    kod: 'menu', grup: 'QR menü', ad: 'Menü', fiyat: '5.000 ₺',
    ozellikler: ['Klasik düzen QR menü', 'Panelden fiyat ve ürün güncelleme', 'Açık ve koyu tema', 'Baskıya hazır QR kodları'],
  },
  {
    kod: 'profesyonel-menu', grup: 'QR menü', ad: 'Profesyonel menü', fiyat: '10.000 ₺', onerilen: true,
    ozellikler: ['Menü paketindeki her şey', 'Videolu kategori kartları', 'Türkçe ve İngilizce', 'Menü kartı düzeni ve şans çarkı', 'Markana özel renk ve yazı', 'Kendi alan adın'],
  },
  {
    kod: 'web-sitesi', grup: 'Web', ad: 'Web sitesi', fiyat: '10.000 ₺',
    ozellikler: ['Mobil öncelikli tanıtım sitesi', 'WhatsApp, arama, yol tarifi', "Google'a uygun sayfa yapısı", 'Google İşletme Profili bağlantısı'],
  },
  {
    kod: 'profesyonel-web', grup: 'Web', ad: 'Profesyonel web sitesi', fiyat: '20.000 ₺',
    ozellikler: ['Web sitesi paketindeki her şey', 'SEO kurulumu: sayfa başlıkları, yapılandırılmış veri, site haritası', 'Google İşletme Profili düzenlemesi', 'Türkçe ve İngilizce', 'Teklif ve iletişim formu', 'Sinematik animasyonlar'],
  },
  {
    kod: 'sosyal-medya', grup: 'Sosyal medya', ad: 'Sosyal medya yönetimi', fiyat: '25.000 ₺', donem: '/ ay',
    ozellikler: ['Aylık içerik planı', 'Gönderi, karusel, Reels ve hikâye', 'Paylaşım takvimi'],
  },
  {
    kod: 'business', grup: 'Hepsi bir arada', ad: 'Business', fiyat: 'Bütçene göre', ozel: true,
    ozellikler: ['Menü, web sitesi ve sosyal medya birlikte', 'Kapsamı ve fiyatı bütçene ve ihtiyacına göre birlikte belirliyoruz'],
  },
];

export const FIYAT_NOTU =
  'Fiyatlara KDV dahil değildir. Menü ve web sitesi paketleri tek seferliktir; barındırma ve alan adı ücreti ayrıdır. Sosyal medya yönetimi aylıktır.';

/** Service chips on the contact form; `kod` doubles as the ?paket= query value. */
export const TALEP_HIZMETLERI = [
  { kod: 'menu', ad: 'QR menü' },
  { kod: 'profesyonel-menu', ad: 'Profesyonel menü' },
  { kod: 'web-sitesi', ad: 'Web sitesi' },
  { kod: 'profesyonel-web', ad: 'Profesyonel web sitesi' },
  { kod: 'seo', ad: 'SEO' },
  { kod: 'sosyal-medya', ad: 'Sosyal medya' },
  { kod: 'business', ad: 'Business' },
] as const;
