// Web push: abone toplama, gönderim ve rapor.
// POST /api/push         { a: 'abone', sub: PushSubscription.toJSON() }   → 204   (tarayıcı bildirim izni verince)
// POST /api/push         { a: 'iptal', endpoint }                         → 204
// POST /api/push         { a: 'olay', e: 'g'|'c', id }                    → 204   (service worker: g gösterim, c click)
// POST /api/push/gonder  { baslik, metin, url, gorsel?, ikon?, bas?, id?, test? }   Authorization: Bearer PUSH_ANAHTAR
//      Süre sınırına gelince durur ve { sonraki } döndürür; panel aynı id ve bas=sonraki ile devam eder.
//      test: tek bir abone adresi (endpoint) verilirse yalnızca ona gönderir.
// GET  /api/push?rapor=1   abone sayıları (tarayıcı, cihaz, gün) ve son gönderimler     Authorization: Bearer PUSH_ANAHTAR
// GET  /api/push?liste=1   abone adresleri (merkezi panele aktarım için)                Authorization: Bearer PUSH_ANAHTAR
// Kişisel veri saklanmaz: yalnızca tarayıcının ürettiği bildirim adresi ve şifreleme anahtarı, kayıt günü,
// tarayıcı ailesi ve cihaz türü tutulur. IP, çerez, tam tarayıcı bilgisi ya da ziyaret geçmişi yazılmaz.
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
import webpush from 'web-push';

export const VAPID_PUBLIC = 'BKC3jurnzW4V0F2LWVF5pUrcXXu1MbrR0xHN-ORitkaJ9NhI58GJC4AuhMEKRrkn4_nHdC9lQ_c8zca_SAOLkGs';
const SITE = 'https://mesaimutfak.com';
const ILETISIM = 'mailto:hello@mesaimutfak.com';

// Yalnızca bilinen tarayıcı bildirim servislerine istek atılır
const SERVIS = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|notify\.windows\.com|push\.apple\.com)$/i;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|axios/i;
const gun = (offset = 0) => new Date(Date.now() + 3 * 3600e3 - offset * 864e5).toISOString().slice(0, 10);
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const bos = () => new Response(null, { status: 204 });
const kimlik = (endpoint) => createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
const kisa = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const idTemiz = (v) => (typeof v === 'string' ? v.replace(/[^a-z0-9-]/gi, '').slice(0, 40) : '');

function gecerliAdres(endpoint) {
  try { const u = new URL(endpoint); return u.protocol === 'https:' && SERVIS.test(u.hostname) && endpoint.length < 1000; } catch { return false; }
}
function tarayici(ua) {
  if (/edg\//i.test(ua)) return 'edge';
  if (/opr\/|opera/i.test(ua)) return 'opera';
  if (/samsungbrowser/i.test(ua)) return 'samsung';
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  if (/chrome|crios/i.test(ua)) return 'chrome';
  if (/safari/i.test(ua)) return 'safari';
  return 'diger';
}
function yetkili(req) {
  const anahtar = process.env.PUSH_ANAHTAR || '';
  const gelen = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!anahtar || anahtar.length < 16 || gelen.length !== anahtar.length) return false;
  return timingSafeEqual(Buffer.from(gelen), Buffer.from(anahtar));
}
async function hepsi(store, prefix) {
  const { blobs } = await store.list({ prefix });
  return blobs.map((b) => b.key).sort();
}
async function parcali(liste, n, is) {
  const out = [];
  for (let i = 0; i < liste.length; i += n) out.push(...(await Promise.all(liste.slice(i, i + n).map(is))));
  return out;
}

export default async (req) => {
  const store = getStore('push');
  const url = new URL(req.url);
  const ua = req.headers.get('user-agent') || '';
  const gonderYolu = url.pathname.replace(/\/$/, '').endsWith('/gonder');

  if (req.method === 'POST' && !gonderYolu) {
    let d = {};
    try { d = JSON.parse(await req.text()); } catch { return bos(); }
    if (d.a === 'abone') {
      const s = d.sub || {};
      const k = s.keys || {};
      if (BOT.test(ua) || !gecerliAdres(s.endpoint) || !kisa(k.p256dh, 200) || !kisa(k.auth, 100)) return bos();
      const anahtar = `a/${kimlik(s.endpoint)}`;
      const eski = await store.get(anahtar, { type: 'json' }).catch(() => null);
      await store.setJSON(anahtar, {
        e: s.endpoint, k: { p256dh: kisa(k.p256dh, 200), auth: kisa(k.auth, 100) },
        t: eski?.t || gun(), b: tarayici(ua), c: /android|iphone|ipad|ipod|mobile/i.test(ua) ? 'mobil' : 'masaustu',
      });
      return bos();
    }
    if (d.a === 'iptal') {
      if (gecerliAdres(d.endpoint)) await store.delete(`a/${kimlik(d.endpoint)}`).catch(() => {});
      return bos();
    }
    if (d.a === 'olay') {
      const id = idTemiz(d.id);
      const e = d.e === 'g' || d.e === 'c' ? d.e : '';
      if (id && e) await store.setJSON(`o/${id}/${e}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, 1);
      return bos();
    }
    return bos();
  }

  if (!yetkili(req)) return json({ error: 'yetki' }, 401);

  if (req.method === 'POST' && gonderYolu) {
    const ozel = process.env.VAPID_PRIVATE;
    if (!ozel) return json({ error: 'VAPID_PRIVATE tanımlı değil' }, 500);
    let d = {};
    try { d = JSON.parse(await req.text()); } catch { return json({ error: 'gövde' }, 400); }
    const baslik = kisa(d.baslik, 80), metin = kisa(d.metin, 200);
    let hedef = kisa(d.url, 500) || SITE + '/';
    try { if (new URL(hedef, SITE).protocol !== 'https:') throw 0; hedef = new URL(hedef, SITE).toString(); } catch { return json({ error: 'url https olmalı' }, 400); }
    if (!baslik) return json({ error: 'baslik gerekli' }, 400);
    const httpsMi = (v) => { try { return new URL(v).protocol === 'https:' ? v : ''; } catch { return ''; } };
    const id = idTemiz(d.id) || `${gun()}-${Date.now().toString(36)}`;
    const yuk = JSON.stringify({ t: baslik, b: metin, u: hedef, g: httpsMi(kisa(d.gorsel, 500)), i: httpsMi(kisa(d.ikon, 500)), id });
    webpush.setVapidDetails(ILETISIM, VAPID_PUBLIC, ozel);

    const test = typeof d.test === 'string' && gecerliAdres(d.test) ? `a/${kimlik(d.test)}` : '';
    const anahtarlar = test ? [test] : await hepsi(store, 'a/');
    const bas = test ? 0 : Math.max(0, Number(d.bas) || 0);
    const bitis = Date.now() + 7000; // eşzamanlı işlev süresi dolmadan dur, panel devam ettirir
    let i = bas, basarili = 0, hata = 0, silinen = 0;
    while (i < anahtarlar.length && Date.now() < bitis) {
      const dilim = anahtarlar.slice(i, i + 40);
      await Promise.all(dilim.map(async (key) => {
        const a = await store.get(key, { type: 'json' }).catch(() => null);
        if (!a?.e) { hata++; return; }
        try {
          await webpush.sendNotification({ endpoint: a.e, keys: a.k }, yuk, { TTL: 86400, urgency: 'normal', timeout: 5000 });
          basarili++;
        } catch (err) {
          // 404/410: abonelik iptal edilmiş, listeden çıkar
          if (err?.statusCode === 404 || err?.statusCode === 410) { await store.delete(key).catch(() => {}); silinen++; } else hata++;
        }
      }));
      i += dilim.length;
    }
    const sonraki = i < anahtarlar.length ? i - silinen : null; // silinenler sıralı listeden düştüğü için başlangıç geri kayar
    if (!test) {
      const kayit = (await store.get(`g/${id}`, { type: 'json' }).catch(() => null)) || { t: new Date().toISOString(), baslik, metin, url: hedef, basarili: 0, hata: 0, silinen: 0 };
      kayit.basarili += basarili; kayit.hata += hata; kayit.silinen += silinen; kayit.bitti = sonraki === null;
      await store.setJSON(`g/${id}`, kayit);
    }
    return json({ id, toplam: anahtarlar.length, basarili, hata, silinen, sonraki });
  }

  if (req.method === 'GET' && url.searchParams.has('liste')) {
    const anahtarlar = await hepsi(store, 'a/');
    const aboneler = (await parcali(anahtarlar, 50, (k) => store.get(k, { type: 'json' }).catch(() => null))).filter(Boolean);
    return json({ site: SITE, vapid: VAPID_PUBLIC, aboneler });
  }

  if (req.method === 'GET' && url.searchParams.has('rapor')) {
    const anahtarlar = await hepsi(store, 'a/');
    const aboneler = (await parcali(anahtarlar, 50, (k) => store.get(k, { type: 'json' }).catch(() => null))).filter(Boolean);
    const say = (o, k) => { o[k] = (o[k] || 0) + 1; };
    const tarayicilar = {}, cihazlar = {}, gunler = {};
    for (const a of aboneler) { say(tarayicilar, a.b || 'diger'); say(cihazlar, a.c || '-'); say(gunler, a.t || '-'); }
    const gKeys = (await hepsi(store, 'g/')).slice(-30).reverse();
    const gonderimler = await parcali(gKeys, 10, async (k) => {
      const id = k.slice(2);
      const [v, g, c] = await Promise.all([store.get(k, { type: 'json' }).catch(() => null), store.list({ prefix: `o/${id}/g/` }), store.list({ prefix: `o/${id}/c/` })]);
      return { id, ...(v || {}), gosterim: g.blobs.length, click: c.blobs.length };
    });
    return json({ site: SITE, abone: aboneler.length, tarayici: tarayicilar, cihaz: cihazlar, gunler: Object.entries(gunler).sort().slice(-60).map(([gun, yeni]) => ({ gun, yeni })), gonderimler });
  }

  return json({ error: 'gecersiz' }, 400);
};

export const config = {
  path: ['/api/push', '/api/push/gonder'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
