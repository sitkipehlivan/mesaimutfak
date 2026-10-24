// Her pazartesi: haftanın tariflerini (mevsime göre) ve en çok bakılanları seçip src/_data/weekly.json'a yazar.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = process.env.SITE_URL || 'https://mesaimutfak.com';
const cats = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/_data/categories.json'), 'utf8'));
const label = Object.fromEntries([...cats.types, ...cats.diets].map(c => [c.k, c.l]));
const recipes = fs.readdirSync(path.join(ROOT, 'src/tarifler')).filter(f => f.endsWith('.md')).map(f => {
  const d = yaml.load(fs.readFileSync(path.join(ROOT, 'src/tarifler', f), 'utf8').split(/^---\s*$/m)[1]);
  return { s: f.slice(0, -3), cats: d.cats || [], img: !!d.image, draft: !!d.draft };
}).filter(r => r.img && !r.draft);

// İstanbul saatine göre ISO hafta
const now = new Date(Date.now() + 3 * 3600e3);
const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
const week = `${t.getUTCFullYear()}-H${String(Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7)).padStart(2, '0')}`;
let seed = [...week].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Mevsim: Ekim–Mart kış, Nisan–Eylül yaz
const m = now.getUTCMonth() + 1, winter = m >= 10 || m <= 3;
const fit = r => winter ? !r.cats.includes('yaz-yemekleri') : !r.cats.includes('kis-yemekleri');
const boost = r => r.cats.includes(winter ? 'kis-yemekleri' : 'yaz-yemekleri');

// 1) En çok bakılanlar (son 7 gün); veri azsa mevsimlik tariflerle tamamla
let views = [];
try { const j = await (await fetch(SITE + '/.netlify/functions/populer?gun=7')).json(); views = j.list || []; } catch (e) { console.warn('Görüntülenme verisi alınamadı:', e.message); }
const have = new Set(recipes.map(r => r.s));
const popular = views.filter(v => have.has(v.s) && v.c >= 3).map(v => v.s).slice(0, 4);

// 2) Haftanın tarifleri: 1 öne çıkan + 8 tarif, farklı türlerden, mevsimlik olanlar önde
const pool = shuffle(recipes.filter(r => fit(r) && !popular.includes(r.s)));
pool.sort((a, b) => boost(b) - boost(a));
const picks = [], used = new Set();
for (const r of pool) { const k = r.cats[0]; if (used.has(k)) continue; picks.push(r.s); used.add(k); if (picks.length === 9) break; }
for (const r of pool) { if (picks.length === 9) break; if (!picks.includes(r.s)) picks.push(r.s); }
const heroR = recipes.find(r => r.s === picks.find(s => ['ana', 'zeytinyagli', 'corba', 'pilav', 'hamurisi'].includes(recipes.find(x => x.s === s).cats[0])) ) || recipes.find(r => r.s === picks[0]);
const rest = picks.filter(s => s !== heroR.s);
for (const r of shuffle(recipes)) { if (popular.length >= 4) break; if (!popular.includes(r.s) && !picks.includes(r.s) && fit(r)) popular.push(r.s); }

const out = { week, hero: heroR.s, heroEyebrow: `Haftanın tarifi · ${label[heroR.cats[0]] || ''}`, picks: rest.slice(0, 8), popular, popularSource: views.length ? 'goruntulenme' : 'secki', updated: now.toISOString().slice(0, 10) };
fs.writeFileSync(path.join(ROOT, 'src/_data/weekly.json'), JSON.stringify(out, null, 2) + '\n');
console.log(out);
