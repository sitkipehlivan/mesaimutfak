// Tarif sayfası görüntülenme sayacı: kişisel veri ya da çerez yok, sadece günlük toplam.
import { getStore } from '@netlify/blobs';
const SLUG = /^[a-z0-9-]{2,80}$/;
export default async (req) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  const s = (await req.text()).trim();
  if (!SLUG.test(s)) return new Response('', { status: 400 });
  const store = getStore('sayac');
  const key = 'gun/' + new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  const day = (await store.get(key, { type: 'json' })) || {};
  day[s] = (day[s] || 0) + 1;
  await store.setJSON(key, day);
  return new Response('', { status: 204 });
};
