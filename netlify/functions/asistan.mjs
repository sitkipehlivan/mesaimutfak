// Mesai Mutfak · "Bizimle konuş" tarif asistanı
// POST { mesajlar: [{ rol: 'kullanici'|'asistan', metin }] }  →  { cevap, tarifler: [{ slug, baslik, url, gorsel, dk, zorluk, neden }] }
// Claude (Anthropic API) yalnızca sitedeki tarifler arasından seçim yapar; listede olmayan tarif önerilemez.
// Ortam değişkenleri (Netlify → Site configuration → Environment variables):
//   ANTHROPIC_API_KEY   zorunlu, gizli
//   ASISTAN_MODEL       varsayılan claude-haiku-5-5
//   ASISTAN_KISI_LIMIT  kişi başı günlük soru sınırı (varsayılan 30)
//   ASISTAN_GUN_LIMIT   tüm site için günlük soru sınırı (varsayılan 3000)
// Gizlilik: ses tarayıcıda yazıya çevrilir, buraya yalnızca yazı gelir. Sınırlama için IP, günlük değişen tuzla tek yönlü
// özetlenir; ham IP ve konuşma metinleri saklanmaz.
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const SITE = process.env.URL || 'https://mesaimutfak.com';
const MODEL = process.env.ASISTAN_MODEL || 'claude-haiku-5-5';
const KISI = Number(process.env.ASISTAN_KISI_LIMIT) || 30;
const GUN = Number(process.env.ASISTAN_GUN_LIMIT) || 3000;
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const day = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

let katalog = null, katalogZaman = 0;
async function getKatalog() {
  if (katalog && Date.now() - katalogZaman < 30 * 60e3) return katalog;
  const list = await fetch(SITE + '/arama-dizini.json').then(r => r.json());
  const bySlug = {};
  const satirlar = list.map(r => {
    const slug = r.u.replace(/^\/tarif\//, '').replace(/\/$/, '');
    bySlug[slug] = r;
    return `${slug} | ${r.t} | ${(r.c || '')} | ${r.m} dk | ${r.l} | ${(Array.isArray(r.g) ? r.g.join(', ') : String(r.g || '')).slice(0, 160)}`;
  });
  katalog = { bySlug, metin: satirlar.join('\n') };
  katalogZaman = Date.now();
  return katalog;
}

const TALIMAT = `Sen Mesai Mutfak'ın tarif asistanısın. Mesai Mutfak, çalışan insanlar için pratik Türkçe yemek tarifleri yayınlayan bir sitedir.
Görevin: kullanıcının anlattığı duruma (evdeki malzemeler, vakit, kaç kişi, ruh hali, diyet, kim yiyecek) göre AŞAĞIDAKİ TARİF LİSTESİNDEN en uygun 1-3 tarifi seçmek.

Kurallar:
- Yalnızca listedeki tarifleri öner ve slug'ı listede yazdığı gibi aynen kullan. Listede olmayan bir tarif uydurma, tarifin kendisini (ölçü, adım) yazma.
- Kullanıcının söylediği kısıtlara uy: süre sınırı verdiyse listedeki dakikayı aşan tarifi önerme; vegan/glutensiz dediyse kategorisinde o etiket olanları seç; olmayan malzemeyi gerektiren tarifi önceliklendirme.
- Bilgi çok azsa yine 2-3 makul öneri yap ve cevabında tek bir kısa soru sorarak daraltmayı teklif et.
- Kullanıcı yemekle ilgisiz bir şey isterse kibarca sadece tarif konusunda yardımcı olabileceğini söyle ve tarifler listesini boş bırak.
- Tıbbi ya da alerji kesinliği isteyen sorularda malzeme listesini kontrol etmelerini hatırlat.
- Türkçe, samimi ama kısa yaz: cevap en fazla 2 cümle; her tarifin "neden" açıklaması en fazla 1 kısa cümle. Emoji kullanma.

Yanıtını YALNIZCA şu JSON biçiminde ver, başka hiçbir şey yazma:
{"cevap": "...", "tarifler": [{"slug": "...", "neden": "..."}]}`;

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'kurulmadi', cevap: 'Asistan henüz kuruluyor, kısa süre sonra burada olacak.' }, 503);

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'istek' }, 400); }
  const gelen = Array.isArray(body && body.mesajlar) ? body.mesajlar.slice(-8) : [];
  const messages = gelen
    .filter(m => m && typeof m.metin === 'string' && m.metin.trim())
    .map(m => ({ role: m.rol === 'asistan' ? 'assistant' : 'user', content: m.metin.trim().slice(0, 600) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'mesaj' }, 400);

  // günlük sınır (kişi başı ve toplam)
  const store = getStore('asistan');
  const d = day();
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || '0';
  const kim = createHash('sha256').update(ip + '|' + d + '|' + (process.env.ANTHROPIC_API_KEY || '').slice(-12)).digest('hex').slice(0, 24);
  const sayac = (await store.get('gun/' + d, { type: 'json' })) || { toplam: 0, kisi: {} };
  if (sayac.toplam >= GUN) return json({ error: 'limit', cevap: 'Bugün çok fazla soru geldi, yarın tekrar dener misin? Bu arada "Bugün ne pişirsem?" sayfası her zaman açık.' }, 429);
  if ((sayac.kisi[kim] || 0) >= KISI) return json({ error: 'limit', cevap: 'Bugünlük soru hakkın doldu. Yarın yine buradayız; bu arada "Bugün ne pişirsem?" sayfasını deneyebilirsin.' }, 429);
  sayac.toplam++; sayac.kisi[kim] = (sayac.kisi[kim] || 0) + 1;
  await store.setJSON('gun/' + d, sayac);

  let kat;
  try { kat = await getKatalog(); } catch (e) { return json({ error: 'katalog', cevap: 'Tarif listesine şu an ulaşamadım, birazdan tekrar dener misin?' }, 502); }

  let res, out;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: [
          { type: 'text', text: TALIMAT },
          { type: 'text', text: 'TARİF LİSTESİ (slug | başlık | kategoriler | toplam süre | zorluk | malzemeler):\n' + kat.metin, cache_control: { type: 'ephemeral' } }
        ],
        messages
      })
    });
    out = await res.json();
  } catch (e) {
    return json({ error: 'servis', cevap: 'Şu an cevap veremedim, birazdan tekrar dener misin?' }, 502);
  }
  if (!res.ok) { console.log('asistan hata', res.status, JSON.stringify(out).slice(0, 300)); const e = (out && out.error) || {}; return json({ error: 'servis', kod: res.status, tur: e.type || '', detay: String(e.message || '').slice(0, 160), cevap: 'Şu an cevap veremedim, birazdan tekrar dener misin?' }, 502); }

  const metin = (out.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  let veri = null;
  try { veri = JSON.parse(metin); } catch (e) { const m = metin.match(/\{[\s\S]*\}/); if (m) { try { veri = JSON.parse(m[0]); } catch (e2) {} } }
  if (!veri) return json({ cevap: metin.slice(0, 400) || 'Bir tarif bulamadım, biraz daha anlatır mısın?', tarifler: [] });

  const tarifler = (Array.isArray(veri.tarifler) ? veri.tarifler : [])
    .filter(t => t && kat.bySlug[t.slug])
    .slice(0, 3)
    .map(t => { const r = kat.bySlug[t.slug]; return { slug: t.slug, baslik: r.t, url: r.u, gorsel: r.i, dk: r.m, zorluk: r.l, neden: String(t.neden || '').slice(0, 200) }; });
  return json({ cevap: String(veri.cevap || '').slice(0, 500), tarifler });
};
