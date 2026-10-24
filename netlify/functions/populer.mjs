// Son N günün en çok görüntülenen tarifleri: /.netlify/functions/populer?gun=7
import { getStore } from '@netlify/blobs';
export default async (req) => {
  const n = Math.min(31, Math.max(1, Number(new URL(req.url).searchParams.get('gun')) || 7));
  const store = getStore('sayac'), tot = {};
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() + 3 * 3600e3 - i * 864e5).toISOString().slice(0, 10);
    const day = (await store.get('gun/' + d, { type: 'json' })) || {};
    for (const [s, c] of Object.entries(day)) tot[s] = (tot[s] || 0) + c;
  }
  const list = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([s, c]) => ({ s, c }));
  return new Response(JSON.stringify({ gun: n, list }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } });
};
