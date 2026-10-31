// Mesai Mutfak · Siri kestirmesi (iPhone + Apple Watch)
// POST { soru: "..." }  ya da  GET ?q=...   →  { metin, tarifler: [{ baslik, dk, url }], link }
// "metin" Siri'nin sesli okuyacağı tek parça cevaptır. Öneriyi sitedeki asistan (asistan.mjs) yapar; aynı günlük sınırlar geçerlidir.
import asistan from './asistan.mjs';

const SITE = process.env.URL || 'https://mesaimutfak.com';
const UTM = 'utm_source=siri&utm_medium=kestirme&utm_campaign=mesaimutfak_siri';
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });

export default async (req, context) => {
  let soru = '';
  if (req.method === 'POST') {
    try { const b = await req.json(); soru = String(b.soru || b.q || b.text || ''); } catch (e) { /* boş */ }
  } else if (req.method === 'GET') {
    soru = new URL(req.url).searchParams.get('q') || '';
  } else return new Response('', { status: 405 });
  soru = soru.trim().slice(0, 600);
  if (!soru) return json({ metin: 'Ne pişirmek istediğini duyamadım. Örneğin "evde tavuk var, yarım saatim var" diyebilirsin.', tarifler: [], link: SITE + '/?' + UTM });

  const ic = new Request(SITE + '/.netlify/functions/asistan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-nf-client-connection-ip': req.headers.get('x-nf-client-connection-ip') || '' },
    body: JSON.stringify({ mesajlar: [{ rol: 'kullanici', metin: soru + ' (Sesli asistandan soruluyor: cevap kısa ve sesli okumaya uygun olsun.)' }] })
  });
  let d = {};
  try { d = await (await asistan(ic, context)).json(); } catch (e) { d = {}; }

  const tarifler = (d.tarifler || []).map(t => ({ baslik: t.baslik, dk: t.dk, url: SITE + t.url + '?' + UTM }));
  let metin = String(d.cevap || 'Şu an cevap veremedim, birazdan tekrar dener misin?').trim();
  if (tarifler.length) {
    metin += (/[.!?…]$/.test(metin) ? ' ' : '. ') + 'Önerilerim: ' + tarifler.map(t => `${t.baslik}, ${t.dk} dakika`).join('; ') + '. Tarifler Mesai Mutfak sitesinde.';
  }
  return json({ metin, tarifler, link: tarifler[0] ? tarifler[0].url : SITE + '/?' + UTM });
};

export const config = { path: '/api/siri' };
