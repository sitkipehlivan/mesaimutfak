// Mesai Mutfak · sesli soru: tarayıcıda kaydedilen kısa ses → Türkçe metin
// GET  /api/ses            → { hazir: true|false }   (OPENAI_API_KEY tanımlı mı)
// POST /api/ses  (gövde: ses dosyası, audio/webm | audio/mp4 | audio/ogg | audio/wav)  → { metin }
// Ses kaydı saklanmaz; yalnızca yazıya çevirme servisine (OpenAI) iletilir. Günlük sınır kişi başı ve toplam.
// Ortam değişkenleri: OPENAI_API_KEY (zorunlu), SES_MODEL (varsayılan gpt-4o-mini-transcribe), SES_KISI_LIMIT (40), SES_GUN_LIMIT (4000)
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const MODEL = process.env.SES_MODEL || 'gpt-4o-mini-transcribe';
const KISI = Number(process.env.SES_KISI_LIMIT) || 40;
const GUN = Number(process.env.SES_GUN_LIMIT) || 4000;
const MAKS = 3 * 1024 * 1024; // ~3 MB (15 sn ses bunun çok altında)
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const day = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const UZANTI = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3' };
const IPUCU = 'Yemek tarifi isteği. Örnek kelimeler: mercimek, kıyma, nohut, bulgur, airfryer, fırın, pilav, çorba, tatlı, vegan, glutensiz, dakika, kişilik, misafir.';

export default async (req, context) => {
  const key = process.env.OPENAI_API_KEY;
  if (req.method === 'GET') return json({ hazir: !!key });
  if (req.method !== 'POST') return new Response('', { status: 405 });
  if (!key) return json({ error: 'kurulmadi' }, 503);

  const tur = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const uz = UZANTI[tur];
  if (!uz) return json({ error: 'tur', tur }, 415);
  const ses = await req.arrayBuffer();
  if (!ses.byteLength || ses.byteLength < 800) return json({ metin: '' });
  if (ses.byteLength > MAKS) return json({ error: 'buyuk' }, 413);

  // günlük sınır
  const store = getStore('ses');
  const d = day();
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || '0';
  const kim = createHash('sha256').update(ip + '|' + d + '|' + key.slice(-12)).digest('hex').slice(0, 24);
  const sayac = (await store.get('gun/' + d, { type: 'json' })) || { toplam: 0, kisi: {} };
  if (sayac.toplam >= GUN || (sayac.kisi[kim] || 0) >= KISI) return json({ error: 'limit' }, 429);
  sayac.toplam++; sayac.kisi[kim] = (sayac.kisi[kim] || 0) + 1;
  await store.setJSON('gun/' + d, sayac);

  const fd = new FormData();
  fd.append('file', new Blob([ses], { type: tur }), 'soru.' + uz);
  fd.append('model', MODEL);
  fd.append('language', 'tr');
  fd.append('prompt', IPUCU);
  fd.append('response_format', 'json');
  const t0 = Date.now();
  try {
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: 'Bearer ' + key }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.log('ses hata', r.status, JSON.stringify(j).slice(0, 300)); return json({ error: 'servis', kod: String((j.error && (j.error.code || j.error.type)) || r.status).slice(0, 40) }, 502); }
    const metin = String(j.text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    console.log('ses ok', Date.now() - t0, 'ms', tur, ses.byteLength, 'B');
    return json({ metin });
  } catch (e) {
    console.log('ses hata', e.message);
    return json({ error: 'servis' }, 502);
  }
};

export const config = { path: '/api/ses', rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
