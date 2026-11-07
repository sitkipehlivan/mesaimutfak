// Derleme sonrası: sayfalardaki görsel ve video adreslerini Bunny CDN'e çevirir.
// Kullanım: CDN_URL=https://x.b-cdn.net node scripts/cdn.mjs <çıktı-klasörü>
// CDN_URL yoksa (yerel derleme, önizleme) hiçbir şey yapmaz.
// Yalnızca kök-göreli (/...) src, srcset, poster ve CSS url(...) adresleri çevrilir; og:image, JSON-LD,
// site haritası gibi tam adresler sitenin kendi alan adında kalır. Her adrese dosya içeriğinin özeti
// (?v=...) eklenir: dosya değişince adres de değişir, CDN önbelleği kendiliğinden yenilenir.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIR = process.argv[2] || 'dist';
const CDN = (process.env.CDN_URL || '').replace(/\/+$/, '');
if (!CDN) { console.log('cdn: CDN_URL tanımlı değil, atlandı'); process.exit(0); }

const EXT = /\.(jpe?g|png|webp|avif|gif|mp4|webm)$/i;
const ozetler = new Map();
function ozet(yol) {
  let p;
  try { p = path.join(DIR, decodeURIComponent(yol)); } catch { return null; }
  if (!ozetler.has(p)) {
    let v = null;
    try { v = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 10); } catch {}
    ozetler.set(p, v);
  }
  return ozetler.get(p);
}

let sayi = 0;
function cevir(u) {
  if (!u.startsWith('/') || u.startsWith('//')) return u;
  const amp = u.includes('&amp;') ? '&amp;' : '&';
  const ham = u.replace(/&amp;/g, '&');
  const [yol, sorgu = ''] = ham.split('#')[0].split('?');
  if (yol === '/.netlify/images') {
    const kaynak = new URLSearchParams(sorgu).get('url') || '';
    if (!kaynak.startsWith('/')) { sayi++; return CDN + u; }
    const v = ozet(kaynak.split('?')[0]);
    if (!v) return u;
    sayi++;
    return CDN + u + amp + 'v=' + v;
  }
  if (!EXT.test(yol)) return u;
  const v = ozet(yol);
  if (!v) return u; // çıktıda olmayan dosya (fonksiyon vb.): dokunma
  sayi++;
  return CDN + u + (u.includes('?') ? amp : '?') + 'v=' + v;
}

const cssUrl = s => s.replace(/url\((['"]?)(\/[^'")]+)\1\)/g, (m, q, u) => `url(${q}${cevir(u)}${q})`);

function html(s) {
  s = s.replace(/(\s(?:src|poster)=)(["'])(\/[^"']*)\2/g, (m, a, q, u) => a + q + cevir(u) + q);
  s = s.replace(/(\ssrcset=)(["'])([^"']*)\2/g, (m, a, q, v) =>
    a + q + v.split(/,\s+/).map(p => { const [u, ...d] = p.trim().split(/\s+/); return [cevir(u), ...d].join(' '); }).join(', ') + q);
  s = s.replace(/<link\b[^>]*\brel=["']preload["'][^>]*>/g, tag =>
    /\bas=["']image["']/.test(tag) ? tag.replace(/(\shref=)(["'])(\/[^"']*)\2/, (m, a, q, u) => a + q + cevir(u) + q) : tag);
  return cssUrl(s);
}

function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) gez(p);
    else if (e.name.endsWith('.html')) fs.writeFileSync(p, html(fs.readFileSync(p, 'utf8')));
    else if (e.name.endsWith('.css')) fs.writeFileSync(p, cssUrl(fs.readFileSync(p, 'utf8')));
  }
}
gez(DIR);
console.log(`cdn: ${sayi} adres ${CDN} üzerine çevrildi`);
