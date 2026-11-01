// Sesle sorma hatalarını teşhis için: yalnızca hata kodu ve tarayıcı ailesi kaydedilir (kişisel veri yok).
// POST /api/ses-log { k, ios, and, saf, sam }  →  Netlify fonksiyon günlüğüne tek satır yazar.
export default async (req) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  try {
    const d = JSON.parse((await req.text()).slice(0, 300));
    const tur = d.ios ? (d.saf ? 'iOS-Safari' : 'iOS-diger') : d.and ? (d.sam ? 'Android-Samsung' : 'Android') : (d.saf ? 'Mac-Safari' : 'masaustu');
    console.log('ses-hata', String(d.k || '?').slice(0, 40), tur);
  } catch (e) { /* yok say */ }
  return new Response(null, { status: 204 });
};
export const config = { path: '/api/ses-log', rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
