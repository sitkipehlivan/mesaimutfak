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
  const configured = !!(process.env.IG_USER_ID && (process.env.IG_ACCESS_TOKEN || (await store.get('token'))));
  return new Response(JSON.stringify({ configured, paused: process.env.IG_PAUSED === '1', lastRun: last, posts }, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
};
