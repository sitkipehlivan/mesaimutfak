// Instagram otomasyonunun durumu: /.netlify/functions/ig-status
// Hangi post ne zaman yayınlandı, sıradakiler, son çalışma ve hatalar (anahtar bilgisi göstermez).
import { getStore } from '@netlify/blobs';
export default async () => {
  const store = getStore('instagram');
  const state = (await store.get('state', { type: 'json' })) || {};
  const last = (await store.get('last_run', { type: 'json' })) || null;
  let feed = { posts: [] };
  try { feed = await fetch((process.env.URL || 'https://mesaimutfak.com') + '/instagram-takvim.json?t=' + Date.now()).then(r => r.json()); } catch (e) {}
  const posts = (feed.posts || []).map(p => {
    const s = state[p.id] || {};
    return { id: p.id, recipe: p.recipe, time: p.time, active: p.active, slides: p.images.length,
      status: s.mediaId ? 'yayınlandı' : s.skipped ? 'atlandı: ' + s.skipped : s.error ? 'hata: ' + s.error : (Date.parse(p.time) > Date.now() ? 'bekliyor' : 'sırada'),
      publishedAt: s.publishedAt || null };
  });
  const token = (await store.get('token')) || process.env.IG_ACCESS_TOKEN;
  const configured = !!(process.env.IG_USER_ID && token);
  let account = null;
  if (configured) { // bağlantı testi: sadece hesap adını okur, hiçbir şey paylaşmaz
    try {
      const host = process.env.IG_API_HOST || 'graph.instagram.com', ver = process.env.IG_API_VERSION || 'v23.0';
      const r = await fetch(`https://${host}/${ver}/${process.env.IG_USER_ID}?fields=username&access_token=${encodeURIComponent(token)}`).then(r => r.json());
      account = r.username ? '@' + r.username : 'hata: ' + ((r.error && r.error.message) || 'bilinmiyor');
    } catch (e) { account = 'hata: ' + e.message; }
  }
  return new Response(JSON.stringify({ configured, account, paused: process.env.IG_PAUSED === '1', lastRun: last, posts }, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
};
