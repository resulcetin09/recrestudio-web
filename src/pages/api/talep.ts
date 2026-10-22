// Contact form endpoint (Vercel function). Validates the request, drops obvious spam
// (honeypot, too-fast submits, per-IP burst limit) and forwards it by e-mail through Resend.
// Env: RESEND_API_KEY (required in production), TALEP_ALICI, TALEP_GONDEREN.
import type { APIRoute } from 'astro';
import { TALEP_HIZMETLERI } from '../../data/paketler';
import { CONTACT } from '../../data/site';

export const prerender = false;

const ALICI = import.meta.env.TALEP_ALICI || CONTACT.email;
const GONDEREN = import.meta.env.TALEP_GONDEREN || 'ReCre Site <site@recrestudio.dev>';
const EN_AZ_SURE_MS = 3000;
const PENCERE_MS = 10 * 60 * 1000;
const PENCERE_SINIRI = 5;

// Best effort: a warm function instance remembers recent senders; cold starts reset it.
const sonGonderimler = new Map<string, number[]>();

function sinirAsildi(ip: string, simdi: number): boolean {
  const kayit = (sonGonderimler.get(ip) ?? []).filter((t) => simdi - t < PENCERE_MS);
  kayit.push(simdi);
  sonGonderimler.set(ip, kayit);
  return kayit.length > PENCERE_SINIRI;
}

const kacis = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const metin = (form: FormData, ad: string, sinir: number) => String(form.get(ad) ?? '').trim().slice(0, sinir);

function yanit(istek: Request, durum: number, govde: Record<string, unknown>): Response {
  if ((istek.headers.get('accept') ?? '').includes('application/json')) {
    return new Response(JSON.stringify(govde), { status: durum, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
  // Form posted without JavaScript: send the visitor back to the page with a status flag.
  const hedef = durum < 400 ? '/iletisim?gonderildi=1' : '/iletisim?hata=1';
  return new Response(null, { status: 303, headers: { location: hedef } });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return yanit(request, 400, { hata: 'Form okunamadı' });
  }

  // Spam traps: silently accept so bots do not learn which check caught them.
  const baslangic = Number(form.get('baslangic'));
  const cokHizli = Number.isFinite(baslangic) && baslangic > 0 && Date.now() - baslangic < EN_AZ_SURE_MS;
  if (metin(form, 'web', 200) !== '' || cokHizli) return yanit(request, 200, { tamam: true });

  if (sinirAsildi(clientAddress || 'bilinmiyor', Date.now())) {
    return yanit(request, 429, { hata: 'Kısa sürede çok fazla talep geldi, biraz sonra tekrar dene' });
  }

  const tur = form.get('tur') === 'karne' ? 'karne' : 'teklif';
  const ad = metin(form, 'ad', 80);
  const isletme = metin(form, 'isletme', 120);
  const iletisim = metin(form, 'iletisim', 120);
  const mesaj = metin(form, 'mesaj', 2000);
  const harita = metin(form, 'harita', 300);
  const gecerliKodlar = new Set<string>(TALEP_HIZMETLERI.map((h) => h.kod));
  const hizmetler = form.getAll('hizmet').map(String).filter((k) => gecerliKodlar.has(k));
  const hizmetAdlari = TALEP_HIZMETLERI.filter((h) => hizmetler.includes(h.kod)).map((h) => h.ad);

  if (!ad || !isletme || !iletisim) return yanit(request, 400, { hata: 'Ad, işletme ve iletişim bilgisi gerekli' });
  if (form.get('kvkk') !== 'evet') return yanit(request, 400, { hata: 'Aydınlatma metnini onaylaman gerekiyor' });

  const anahtar = import.meta.env.RESEND_API_KEY;
  const satirlar: [string, string][] = [
    ['Tür', tur === 'karne' ? 'Ücretsiz dijital karne' : 'Teklif'],
    ['Ad', ad],
    ['İşletme', isletme],
    ['İletişim', iletisim],
    ...(tur === 'karne'
      ? ([['Harita / Instagram', harita || '-']] as [string, string][])
      : ([['Hizmetler', hizmetAdlari.join(', ') || '-'], ['Mesaj', mesaj || '-']] as [string, string][])),
    ['KVKK onayı', 'Evet'],
  ];
  const konu = `${tur === 'karne' ? 'Dijital karne talebi' : 'Teklif talebi'}: ${isletme}`;
  const html = `<table cellpadding="6" style="font-family:system-ui,sans-serif;font-size:15px;border-collapse:collapse">${satirlar
    .map(([k, v]) => `<tr><td style="color:#666;vertical-align:top;white-space:nowrap">${kacis(k)}</td><td style="white-space:pre-wrap">${kacis(v)}</td></tr>`)
    .join('')}</table>`;
  const duzMetin = satirlar.map(([k, v]) => `${k}: ${v}`).join('\n');

  if (!anahtar) {
    if (import.meta.env.DEV) {
      console.info('[talep] RESEND_API_KEY yok, e-posta gönderilmedi:\n' + duzMetin);
      return yanit(request, 200, { tamam: true, deneme: true });
    }
    console.error('[talep] RESEND_API_KEY tanımlı değil');
    return yanit(request, 503, { hata: 'Form şu an çalışmıyor' });
  }

  const eposta = iletisim.includes('@') ? iletisim : undefined;
  const gonderim = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${anahtar}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: GONDEREN, to: [ALICI], subject: konu, html, text: duzMetin, ...(eposta && { reply_to: eposta }) }),
  }).catch((e: unknown) => {
    console.error('[talep] Resend isteği başarısız', e);
    return null;
  });

  if (!gonderim || !gonderim.ok) {
    console.error('[talep] Resend hata', gonderim?.status, await gonderim?.text().catch(() => ''));
    return yanit(request, 502, { hata: 'Talep gönderilemedi' });
  }
  return yanit(request, 200, { tamam: true });
};
