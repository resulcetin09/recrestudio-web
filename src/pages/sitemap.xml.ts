// Hand-written sitemap: five public pages plus the notice. 404 and /api are left out on purpose.
import type { APIRoute } from 'astro';
import { SITE_URL } from '../data/site';

const SAYFALAR = ['/', '/hizmetler', '/isler', '/hakkimizda', '/iletisim', '/kvkk'];

export const GET: APIRoute = () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SAYFALAR.map((p) => `  <url><loc>${SITE_URL}${p === '/' ? '/' : p}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
