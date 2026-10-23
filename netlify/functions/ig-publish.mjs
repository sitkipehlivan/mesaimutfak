// Mesai Mutfak · Instagram otomatik paylaşım (her 15 dakikada bir çalışır)
// /instagram-takvim.json'daki saati gelmiş postu Instagram'ın resmi yayın API'siyle carousel olarak paylaşır.
// Gerekli ortam değişkenleri (Netlify → Site configuration → Environment variables):
//   IG_USER_ID       Instagram profesyonel hesap kimliği
//   IG_ACCESS_TOKEN  uzun ömürlü erişim anahtarı (gizli)
//   IG_API_HOST      graph.instagram.com (Instagram ile giriş, varsayılan) ya da graph.facebook.com (Facebook sayfası üzerinden)
//   IG_API_VERSION   varsayılan v23.0
//   IG_PAUSED        "1" ise hiçbir şey paylaşmaz
import { getStore } from '@netlify/blobs';

export const config = { schedule: '*/15 * * * *' };

const HOST = process.env.IG_API_HOST || 'graph.instagram.com';
const VER = process.env.IG_API_VERSION || 'v23.0';
const SITE = process.env.URL || 'https://mesaimutfak.com';
const WINDOW_H = 12;            // saati 12 saatten fazla geçmiş postlar atlanır (toplu paylaşım olmasın)
const BUDGET_MS = 22000;        // fonksiyon süre sınırına takılmamak için
const MAX_TRIES = 4;

const api = (p) => `https://${HOST}/${VER}/${p}`;
async function call(method, p, params, token) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === 'GET' ? api(p) + '?' + body : api(p);
  const res = await fetch(url, method === 'GET' ? {} : { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error((json.error && (json.error.message || json.error.type)) || 'HTTP ' + res.status);
  return json;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

export default async () => {
  const t0 = Date.now(), left = () => BUDGET_MS - (Date.now() - t0);
  const store = getStore('instagram');
  const log = [];
  try {
    if (process.env.IG_PAUSED === '1') return done('duraklatıldı');
    const userId = process.env.IG_USER_ID;
    let token = (await store.get('token')) || process.env.IG_ACCESS_TOKEN;
    if (!userId || !token) return done('IG_USER_ID / IG_ACCESS_TOKEN tanımlı değil');

    // Instagram ile giriş anahtarları 60 gün geçerli: haftada bir tazele
    if (HOST === 'graph.instagram.com') {
      const last = Number(await store.get('token_refreshed_at')) || 0;
      if (Date.now() - last > 7 * 864e5) {
        try {
          const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`).then(r => r.json());
          if (r.access_token) { token = r.access_token; await store.set('token', token); await store.set('token_refreshed_at', String(Date.now())); log.push('anahtar tazelendi'); }
        } catch (e) { log.push('anahtar tazelenemedi: ' + e.message); }
      }
    }

    const feed = await fetch(SITE + '/instagram-takvim.json?t=' + Date.now()).then(r => r.json());
    const state = (await store.get('state', { type: 'json' })) || {};
    const now = Date.now();
    const due = (feed.posts || [])
      .filter(p => p.active && p.time && Date.parse(p.time) <= now && (!state[p.id] || !state[p.id].mediaId))
      .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

    for (const p of due) {
      const st = state[p.id] = state[p.id] || { children: [], tries: 0 };
      if (st.skipped) continue;
      if (!st.children.length && now - Date.parse(p.time) > WINDOW_H * 3600e3) { st.skipped = 'saati çok geçti'; log.push(p.id + ': atlandı (saati geçti)'); continue; }
      if (st.tries >= MAX_TRIES) continue;
      try {
        // 1) her kare için taşıyıcı
        while (st.children.length < p.images.length && p.images.length > 1) {
          if (left() < 4000) { await save(); return done('devam edecek', log); }
          const c = await call('POST', `${userId}/media`, { image_url: p.images[st.children.length], is_carousel_item: 'true' }, token);
          st.children.push(c.id);
        }
        // 2) carousel taşıyıcısı
        if (!st.container) {
          if (left() < 4000) { await save(); return done('devam edecek', log); }
          const params = p.images.length > 1
            ? { media_type: 'CAROUSEL', children: st.children.join(','), caption: p.caption }
            : { image_url: p.images[0], caption: p.caption };
          st.container = (await call('POST', `${userId}/media`, params, token)).id;
        }
        // 3) hazır olmasını bekle
        let ready = false;
        while (left() > 3000) {
          const s = await call('GET', st.container, { fields: 'status_code' }, token);
          if (s.status_code === 'FINISHED') { ready = true; break; }
          if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('taşıyıcı ' + s.status_code);
          await sleep(2000);
        }
        if (!ready) { await save(); return done('işleniyor, sonraki çalışmada yayınlanacak', log); }
        // 4) yayınla
        const pub = await call('POST', `${userId}/media_publish`, { creation_id: st.container }, token);
        st.mediaId = pub.id; st.publishedAt = new Date().toISOString(); delete st.error;
        log.push(p.id + ': yayınlandı ' + pub.id);
        await save();
        break; // bir çalışmada bir post
      } catch (e) {
        st.tries++; st.error = e.message; st.lastTry = new Date().toISOString();
        if (/expired|session|token/i.test(e.message)) { st.children = []; delete st.container; }
        log.push(p.id + ': hata ' + e.message);
        await save();
        break;
      }
    }
    await save();
    return done(due.length ? 'tamam' : 'zamanı gelen post yok', log);

    async function save() { await store.setJSON('state', state); }
  } catch (e) {
    return done('genel hata: ' + e.message, log);
  }
  function done(msg, l = log) {
    const out = { ok: true, msg, log: l, at: new Date().toISOString() };
    console.log(JSON.stringify(out));
    store.setJSON('last_run', out).catch(() => {});
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
  }
};
