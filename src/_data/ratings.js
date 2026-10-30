// Derleme sırasında tarif puanlarını canlı siteden çeker (Google'daki yıldızlar için aggregateRating).
// Ulaşılamazsa GitHub işleminin her gün kaydettiği puan-ozet.json kullanılır; o da yoksa boş döner.
import { readFileSync } from 'node:fs';
const kayit = () => { try { return JSON.parse(readFileSync(new URL('./puan-ozet.json', import.meta.url), 'utf8')); } catch { return {}; } };
export default async function () {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch('https://mesaimutfak.com/.netlify/functions/puan', { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return kayit();
    return await res.json();
  } catch {
    return kayit();
  }
}
