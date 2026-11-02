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
    return `${slug} | ${r.t} | ${(r.c || '')} | ${r.m} dk | ${r.l} | ${(Array.isArray(r.g) ? r.g.join(', ') : String(r.g || '')).slice(0, 110)}`;
  });
  const basliklar = list.map(r => ({ slug: r.u.replace(/^\/tarif\//, '').replace(/\/$/, ''), n: norm(r.t) })).filter(x => x.n.length >= 4).sort((a, b) => b.n.length - a.n.length);
  katalog = { bySlug, metin: satirlar.join('\n'), basliklar };
  katalogZaman = Date.now();
  return katalog;
}

// Türkçe karakterleri sadeleştirip karşılaştırma için normalleştirir
function norm(t) { return String(t || '').toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/[^a-z0-9]+/g, ' ').trim(); }
// Model hatalı slug verdiyse başlıktan doğru tarifi bul
function slugBul(kat, slug) {
  if (kat.bySlug[slug]) return slug;
  const n = norm(String(slug || '').replace(/^.*\/tarif\//, '').replace(/-/g, ' '));
  if (!n) return null;
  const x = kat.basliklar.find(b => b.slug === n.replace(/ /g, '-') || b.n === n);
  return x ? x.slug : null;
}
// Cevap metninde adı geçen ama karta konmamış tarifleri bul (en uzun başlık önce, çakışmasız)
function metindekiTarifler(kat, metin) {
  let m = ' ' + norm(metin) + ' '; const bulunan = [];
  for (const b of kat.basliklar) { const k = ' ' + b.n + ' '; if (m.includes(k)) { bulunan.push(b.slug); m = m.split(k).join(' | '); } }
  return bulunan;
}

// Kullanıcı "40 dakikam var", "yarım saat", "bir saat" gibi bir süre verdiyse en son verileni dakika olarak döndürür
function sureSiniri(metinler) {
  let dk = 0;
  for (const t of metinler) {
    const x = t.toLocaleLowerCase('tr');
    const m = [...x.matchAll(/(\d{1,3})\s*(dk|dakika|dakka)/g)].pop();
    if (m) dk = Number(m[1]);
    else if (/yarım saat/.test(x)) dk = 30;
    else if (/(bir|1) saat(?! buçuk)/.test(x)) dk = 60;
    else if (/(bir|1) buçuk saat|saat buçuk/.test(x)) dk = 90;
    else if (/çeyrek saat/.test(x)) dk = 15;
  }
  return dk;
}

const TALIMAT = `Sen Mesai Mutfak'ın tarif asistanısın. Mesai Mutfak, çalışan insanlar için pratik Türkçe yemek tarifleri yayınlayan bir sitedir.
Görevin: kullanıcının anlattığı duruma (evdeki malzemeler, vakit, kaç kişi, ruh hali, diyet, kim yiyecek) göre AŞAĞIDAKİ TARİF LİSTESİNDEN en uygun tarifleri seçmek.

Cevabını her zaman "oner" aracıyla ver. Kurallar:
- Yalnızca listedeki tarifleri öner; slug'ı listede yazdığı gibi aynen kullan. Listede olmayan tarif uydurma; ölçü, malzeme listesi ya da yapılış adımı yazma.
- Önerdiğin ya da cevapta adını andığın HER tarifi "tarifler" alanına da koy. Sitede bu tarifler, fotoğraflı ve tıklanabilir tarif kartı olarak cevabının hemen altında otomatik gösterilir; link tarif kartındadır.
- Cevap metnine asla link, adres, URL ya da slug yazma; "linkleri aşağıdaki kartlarda bulabilirsin" demen yeterli. Kendi teknik sınırlarından, listeden ya da sistemden söz etme.
- Normalde 1-3 tarif öner. Kullanıcı birden çok öğün ya da menü isterse (ör. ana yemek ve tatlı) her biri için 1-2 tarif, toplam en fazla 5 tarif öner.
- Kullanıcı önceki önerileri tekrar isterse (link, tarif, "onları ver" gibi) önceki cevaplardaki aynı tarifleri yeniden "tarifler" alanına koy.
- Kullanıcının kısıtlarına kesinlikle uy: süre sınırı verdiyse toplam süresi bu sınırı aşan tarifi ASLA önerme; vegan/glutensiz dediyse kategorisinde o etiket olanları seç; evde olmayan malzemeyi gerektiren tarifi önceliklendirme; tatlı isterse tatlılar kategorisinden seç.
- Bilgi çok azsa yine 2-3 makul öneri yap ve tek bir kısa soruyla daraltmayı teklif et.
- Kullanıcı yemekle ilgisiz bir şey isterse kibarca yalnızca tarif konusunda yardımcı olabileceğini söyle, tarifleri boş bırak.
- Tıbbi ya da alerji kesinliği isteyen sorularda tarif sayfasındaki malzeme listesini kontrol etmelerini hatırlat.
- Türkçe, samimi ve kısa yaz: cevap en fazla 2-3 kısa cümle, düz metin (yıldız, madde işareti, başlık, emoji yok). Tarifleri metinde tek tek anlatma; kartlar zaten gösteriliyor. Her tarifin "neden" açıklaması en fazla 1 kısa cümle.`;

const ARAC = {
  name: 'oner',
  description: 'Kullanıcıya kısa cevabı ve önerilen Mesai Mutfak tariflerini gönderir. Tarifler sitede tıklanabilir kart olarak gösterilir.',
  input_schema: {
    type: 'object',
    properties: {
      cevap: { type: 'string', description: 'Kullanıcıya 2-3 kısa cümlelik düz metin cevap. Link, URL ya da slug içermez.' },
      tarifler: { type: 'array', maxItems: 5, items: { type: 'object', properties: {
        slug: { type: 'string', description: 'Listedeki slug, aynen' },
        neden: { type: 'string', description: 'Bu tarifin neden uygun olduğu, tek kısa cümle' }
      }, required: ['slug', 'neden'] } }
    },
    required: ['cevap', 'tarifler']
  }
};

// Model metinde link/markdown yazarsa temizle
function temizle(t) {
  return String(t || '')
    .replace(/\*\*|__|`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\/?tarif\/[a-z0-9-]+\/?/gi, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s*:\s*(?=[,.;\n]|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function kisalt(t, n) { if (t.length <= n) return t; const k = t.slice(0, n); const i = Math.max(k.lastIndexOf('. '), k.lastIndexOf('? '), k.lastIndexOf('! ')); return i > n * 0.4 ? k.slice(0, i + 1) : k.replace(/\s+\S*$/, '') + '…'; }

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'kurulmadi', cevap: 'Asistan henüz kuruluyor, kısa süre sonra burada olacak.' }, 503);

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'istek' }, 400); }
  const gelen = Array.isArray(body && body.mesajlar) ? body.mesajlar.slice(-8) : [];
  const messages = gelen
    .filter(m => m && typeof m.metin === 'string' && m.metin.trim())
    .map(m => ({ role: m.rol === 'asistan' ? 'assistant' : 'user', content: m.metin.trim().slice(0, m.rol === 'asistan' ? 900 : 600) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'mesaj' }, 400);
  // Süre sınırı sunucuda da uygulanır; modele de açıkça hatırlatılır (metinde sınırı aşan tarif anılmasın)
  const sinir = sureSiniri(messages.filter(m => m.role === 'user').map(m => m.content));
  if (sinir) messages[messages.length - 1] = { role: 'user', content: messages[messages.length - 1].content + `\n\n[Not: kullanıcının süre sınırı ${sinir} dakika. Yalnızca listedeki toplam süresi ${sinir} dakika ya da daha az olan tarifleri öner ve metinde de yalnızca onları an.]` };

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
  const istek = (ek, cc = { type: 'ephemeral', ttl: '1h' }) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: [
        { type: 'text', text: TALIMAT },
        { type: 'text', text: 'TARİF LİSTESİ (slug | başlık | kategoriler | toplam süre | zorluk | malzemeler):\n' + kat.metin, cache_control: cc }
      ],
      tools: [ARAC],
      tool_choice: { type: 'tool', name: 'oner' },
      messages,
      ...ek
    })
  }).then(async r => ({ r, j: await r.json().catch(() => ({})) }));
  try {
    // Hızlı ve kısa cevap için "düşünme" kapalı; model bu ayarı desteklemiyorsa ayarsız tekrar dene
    const t0 = Date.now();
    let x = await istek({ thinking: { type: 'disabled' } });
    if (!x.r.ok && x.r.status === 400) { console.log('asistan 400', JSON.stringify(x.j).slice(0, 300)); x = await istek({ max_tokens: 4000, tool_choice: { type: 'auto' } }, { type: 'ephemeral' }); }
    res = x.r; out = x.j;
    const u = (out && out.usage) || {};
    console.log('asistan sure', Date.now() - t0, 'ms', 'onbellek_okuma', u.cache_read_input_tokens || 0, 'onbellek_yazma', u.cache_creation_input_tokens || 0, 'girdi', u.input_tokens || 0, 'cikti', u.output_tokens || 0);
  } catch (e) {
    return json({ error: 'servis', cevap: 'Şu an cevap veremedim, birazdan tekrar dener misin?' }, 502);
  }
  if (!res.ok) { console.log('asistan hata', res.status, JSON.stringify(out).slice(0, 300)); return json({ error: 'servis', cevap: 'Şu an cevap veremedim, birazdan tekrar dener misin?' }, 502); }

  const blok = (out.content || []).find(c => c.type === 'tool_use' && c.name === 'oner');
  let veri = blok && blok.input && typeof blok.input === 'object' ? blok.input : null;
  if (!veri) {
    const metin = (out.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    try { veri = JSON.parse(metin); } catch (e) { const m = metin.match(/\{[\s\S]*\}/); if (m) { try { veri = JSON.parse(m[0]); } catch (e2) {} } }
    if (!veri) return json({ cevap: kisalt(temizle(metin), 500) || 'Bir tarif bulamadım, biraz daha anlatır mısın?', tarifler: [] });
  }

  const ham = (Array.isArray(veri.tarifler) ? veri.tarifler : [])
    .map(t => t && { slug: slugBul(kat, t.slug), neden: t.neden })
    .filter(t => t && t.slug);
  // Metinde adı geçip karta konmayan tarifleri de ekle (kart hep olsun, link uydurulmasın)
  for (const sl of metindekiTarifler(kat, veri.cevap)) if (!ham.some(t => t.slug === sl)) ham.push({ slug: sl, neden: '' });
  const tarifler = ham
    .filter(t => !sinir || kat.bySlug[t.slug].m <= sinir)
    .filter((t, i, a) => a.findIndex(x => x.slug === t.slug) === i)
    .slice(0, 5)
    .map(t => { const r = kat.bySlug[t.slug]; return { slug: t.slug, baslik: r.t, url: r.u, gorsel: r.i, dk: r.m, zorluk: r.l, neden: String(t.neden || '').slice(0, 200) }; });
  let cevap = kisalt(temizle(veri.cevap), 600);
  // Süre sınırı yüzünden elenen bir tarif metinde anılıyorsa ya da hiç kart kalmadıysa: sınıra uyan tariflerle tamamla, metni sadeleştir
  const elenen = ham.filter(t => sinir && kat.bySlug[t.slug].m > sinir);
  if (sinir && elenen.length) {
    if (tarifler.length < 2) {
      const sozler = new Set(norm(messages.filter(m => m.role === 'user').map(m => m.content.replace(/\[Not:[\s\S]*\]/, '')).join(' ')).split(' ').filter(w => w.length > 3));
      const aday = Object.entries(kat.bySlug)
        .filter(([sl, r]) => r.m <= sinir && !tarifler.some(t => t.slug === sl))
        .map(([sl, r]) => { const metin = norm(r.t + ' ' + (Array.isArray(r.g) ? r.g.join(' ') : r.g || '')); let p = 0; sozler.forEach(w => { if (metin.includes(w.slice(0, Math.max(4, w.length - 2)))) p++; }); return { sl, r, p }; })
        .filter(x => x.p > 0).sort((a, b) => b.p - a.p || a.r.m - b.r.m).slice(0, 3 - tarifler.length);
      for (const a of aday) tarifler.push({ slug: a.sl, baslik: a.r.t, url: a.r.u, gorsel: a.r.i, dk: a.r.m, zorluk: a.r.l, neden: `${a.r.m} dakikada hazır.` });
    }
    const metinN = norm(cevap);
    if (!tarifler.length || elenen.some(t => metinN.includes(norm(kat.bySlug[t.slug].t)))) {
      cevap = tarifler.length ? `${sinir} dakikayı geçmeyen önerilerim aşağıda.` : `${sinir} dakikaya sığan uygun bir tarif bulamadım; biraz daha süre ya da başka bir malzeme söyler misin?`;
    }
  }
  if (!cevap) cevap = tarifler.length ? 'Sana uygun tarifler şunlar:' : 'Bir tarif bulamadım, biraz daha anlatır mısın?';
  return json({ cevap, tarifler });
};
