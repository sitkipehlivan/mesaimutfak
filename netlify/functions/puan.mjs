// Tarif puanlama: POST {s: slug, r: 1-5} oyu kaydeder; GET ?s=slug tek tarifin, GET (parametresiz) tüm tariflerin özetini döndürür.
// Kişisel veri saklanmaz: aynı kişinin aynı tarife aynı gün tekrar oy vermesini önlemek için IP, günlük değişen gizli bir tuzla
// tek yönlü özetlenir (hash) ve yalnızca bu özet 2 gün tutulur; ham IP hiçbir yere yazılmaz.
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const SLUG = /^[a-z0-9-]{2,80}$/;
const json = (o, st = 200, cache = 'no-store') =>
  new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json', 'cache-control': cache } });
const day = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

export default async (req, context) => {
  const store = getStore('puan');
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const s = url.searchParams.get('s');
    const all = (await store.get('ozet', { type: 'json' })) || {};
    if (s) {
      if (!SLUG.test(s)) return json({ error: 'slug' }, 400);
      const x = all[s] || { sum: 0, count: 0 };
      return json({ s, count: x.count, avg: x.count ? Math.round((x.sum / x.count) * 10) / 10 : 0 }, 200, 'public, max-age=60');
    }
    const out = {};
    for (const [k, x] of Object.entries(all)) if (x.count) out[k] = { count: x.count, avg: Math.round((x.sum / x.count) * 10) / 10 };
    return json(out, 200, 'public, max-age=300');
  }

  if (req.method !== 'POST') return new Response('', { status: 405 });
  let body;
  try { body = await req.json(); } catch { return json({ error: 'body' }, 400); }
  const s = String(body.s || ''), r = Number(body.r);
  if (!SLUG.test(s) || !Number.isInteger(r) || r < 1 || r > 5) return json({ error: 'input' }, 400);

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || '';
  const salt = (process.env.PUAN_TUZ || 'mesaimutfak') + day();
  const voter = createHash('sha256').update(salt + '|' + ip + '|' + s).digest('hex').slice(0, 32);
  const vKey = `oy/${day()}/${voter}`;
  if (ip && (await store.get(vKey))) return json({ error: 'tekrar' }, 429);

  const all = (await store.get('ozet', { type: 'json' })) || {};
  const x = all[s] || { sum: 0, count: 0 };
  x.sum += r; x.count += 1; all[s] = x;
  await store.setJSON('ozet', all);
  if (ip) await store.set(vKey, '1');

  // Eski günlerin tekrar-oy kayıtlarını temizle (2 günden eski)
  try {
    const keep = new Set([day(), new Date(Date.now() + 3 * 3600e3 - 864e5).toISOString().slice(0, 10)]);
    const { blobs } = await store.list({ prefix: 'oy/' });
    await Promise.all(blobs.filter((b) => !keep.has(b.key.split('/')[1])).slice(0, 200).map((b) => store.delete(b.key)));
  } catch {}

  return json({ s, count: x.count, avg: Math.round((x.sum / x.count) * 10) / 10 });
};
