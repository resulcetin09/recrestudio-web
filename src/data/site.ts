// Shared site facts: navigation, contact channels, canonical origin.

export const SITE_URL = 'https://recrestudio.dev';

export const NAV = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/hizmetler', label: 'Hizmetler' },
  { href: '/isler', label: 'İşler' },
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/iletisim', label: 'İletişim' },
] as const;

export const CONTACT = {
  email: 'recrestudio0@gmail.com',
  phoneDisplay: '+90 546 461 67 30',
  whatsapp: 'https://wa.me/905464616730',
  instagram: 'https://www.instagram.com/recre_studio/',
  instagramHandle: '@recre_studio',
  linkedin: 'https://www.linkedin.com/in/resulcetin/',
} as const;
