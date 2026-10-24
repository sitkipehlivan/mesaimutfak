import { caption as igCaption } from './scripts/ig/lib.mjs';
import fsIg from 'node:fs';
import path from 'node:path';
import fs from 'node:fs';
import { plate, tabletop, tint } from './lib/art.js';

const PREVIEW = !!process.env.PREVIEW; // önizleme derlemesi: göreli linkler, index.html ile

function relLink(from, to) {
  if (!to || !PREVIEW || !to.startsWith('/')) return to;
  const [p, hash = ''] = to.split('#');
  const fromDir = from.endsWith('/') ? from : path.posix.dirname(from) + '/';
  let rel = path.posix.relative(fromDir, p) || '.';
  if (p.endsWith('/')) rel = (rel === '.' ? '' : rel + '/') + 'index.html';
  return rel + (hash ? '#' + hash : '');
}

const FRAC = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.33: '⅓', 0.67: '⅔' };
export function fmtAmount(n) {
  if (n === null || n === undefined || n === '') return '';
  const whole = Math.floor(n), rest = Math.round((n - whole) * 100) / 100;
  const f = FRAC[rest];
  if (f) return (whole ? whole + ' ' : '') + f;
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets', 'src/img': 'img', 'src/favicon.svg': 'favicon.svg', 'src/robots.txt': 'robots.txt', 'src/admin': 'admin' });
  eleventyConfig.addCollection('photos', api => api.getFilteredByGlob('src/tarifler/*.md').filter(r => r.data.image && r.data.imageCredit).sort((a, b) => a.data.title.localeCompare(b.data.title, 'tr')));
  eleventyConfig.ignores.add('src/admin/**');

  eleventyConfig.addCollection('tarifler', api =>
    api.getFilteredByGlob('src/tarifler/*.md').sort((a, b) => b.date - a.date));

  eleventyConfig.addFilter('link', function (to) { return relLink(this.page?.url || '/', to); });
  eleventyConfig.addFilter('inCat', (list, k) => list.filter(r => (r.data.cats || []).includes(k)));
  eleventyConfig.addFilter('bySlug', (list, slug) => list.find(r => r.fileSlug === slug));
  eleventyConfig.addFilter('bySlugs', (list, slugs) => (slugs || []).map(s => list.find(r => r.fileSlug === s)).filter(Boolean));
  eleventyConfig.addFilter('byAuthor', (list, slug) => (list || []).filter(r => r.data.author === slug || r.data.editor === slug));
  eleventyConfig.addFilter('person', (slug, authors) => ((authors && authors.list) || []).find(a => a.slug === slug));
  // kategori küçük görseli: panelde seçilen tarif, yoksa kategorideki ilk fotoğraflı tarif
  eleventyConfig.addFilter('catByKey', (k, list) => (list || []).find(c => c.k === k) || {});
  eleventyConfig.addFilter('photoFirst', list => (list || []).slice().sort((x, y) => (y.data.image ? 1 : 0) - (x.data.image ? 1 : 0)));
  eleventyConfig.addFilter('catImg', (k, thumbs, list) => {
    const inCat = (list || []).filter(r => (r.data.cats || []).includes(k) && r.data.image);
    const pick = inCat.find(r => r.page.fileSlug === (thumbs || {})[k]) || inCat[0];
    if (!pick) return null;
    const src = pick.data.image;
    const u = w => PREVIEW ? src : `/.netlify/images?url=${encodeURIComponent(src)}&w=${w}&h=${w}&fit=cover&q=72`;
    return { src: u(160), src2: u(320), alt: pick.data.title };
  });
  // Instagram takvimi
  eleventyConfig.addFilter('igImages', slug => { try { return fsIg.readdirSync('src/img/ig/' + slug).filter(f => f.endsWith('.jpg')).sort().map(f => `/img/ig/${slug}/${f}`); } catch (e) { return []; } });
  eleventyConfig.addFilter('igFeed', (posts, recipes, base, gen) => {
    const T = z => { if (z instanceof Date) { const p = n => String(n).padStart(2, '0'); return `${z.getUTCFullYear()}-${p(z.getUTCMonth() + 1)}-${p(z.getUTCDate())}T${p(z.getUTCHours())}:${p(z.getUTCMinutes())}:00+03:00`; } const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(String(z || '')); return m ? `${m[1]}T${m[2]}:00+03:00` : ''; };
    const imgs = slug => { try { return fsIg.readdirSync('src/img/ig/' + slug).filter(f => f.endsWith('.jpg')).sort().map(f => `${base}/img/ig/${slug}/${f}`); } catch (e) { return []; } };
    const out = [];
    for (const p of [...(posts || [])].sort((a, b) => T(a.data.zaman).localeCompare(T(b.data.zaman)))) {
      const r = (recipes || []).find(x => x.page.fileSlug === p.data.recipe); const im = imgs(p.data.recipe);
      if (!r || !im.length || !T(p.data.zaman)) continue;
      out.push({ id: p.page.inputPath.split('/').pop().replace(/\.md$/, ''), recipe: p.data.recipe, title: r.data.title, time: T(p.data.zaman), active: p.data.yayinla !== false, images: im, caption: igCaption(r.data, p.data.aciklama) });
    }
    return JSON.stringify({ generated: gen, posts: out }, null, 1);
  });
  eleventyConfig.addFilter('igSort', list => [...(list || [])].sort((a, b) => String(a.data.zaman).localeCompare(String(b.data.zaman))));
  eleventyConfig.addFilter('igAbs', (list, base) => (list || []).map(u => base + u));
  eleventyConfig.addFilter('igCaption', (r, override) => igCaption(r, override));
  eleventyConfig.addFilter('igTime', z => { if (z instanceof Date) { const p = n => String(n).padStart(2, '0'); return `${z.getUTCFullYear()}-${p(z.getUTCMonth() + 1)}-${p(z.getUTCDate())}T${p(z.getUTCHours())}:${p(z.getUTCMinutes())}:00+03:00`; } const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(String(z || '')); return m ? `${m[1]}T${m[2]}:00+03:00` : ''; });
  eleventyConfig.addFilter('related', (list, cur) => list
    .filter(r => r.fileSlug !== cur.fileSlug && r.data.cats.some(c => cur.data.cats.includes(c)))
    .slice(0, 4));
  eleventyConfig.addFilter('catLabel', (k, cats) => ([...cats.types, ...cats.diets].find(c => c.k === k) || {}).l || k);
  eleventyConfig.addFilter('catLabels', (ks, cats) => (ks || []).map(k => ([...cats.types, ...cats.diets].find(c => c.k === k) || {}).l || k).join(', '));
  const PANTRY = /^(su|sıcak su|soğuk su|ılık su|kaynar su|buzlu su|tuz|karabiber)\b/i;
  eleventyConfig.addFilter('isPantry', n => PANTRY.test(String(n || '').trim()) && !/suyu|sulu/.test(String(n)));
  eleventyConfig.addFilter('ingNames', groups => [...new Set((groups || []).flatMap(g => (g.items || []).map(it => String(it.n || '').replace(/\(.*?\)|,.*$/g, '').trim().toLocaleLowerCase('tr'))))].filter(Boolean).join(' '));
  eleventyConfig.addFilter('amt', fmtAmount);
  eleventyConfig.addFilter('tint', k => tint(k));
  eleventyConfig.addFilter('sortByMin', list => [...list].sort((a, b) => (a.data.prep + a.data.cook) - (b.data.prep + b.data.cook)));
  eleventyConfig.addFilter('take', (list, n) => list.slice(0, n));

  // Netlify Image CDN: fotoğrafı boyutlandırıp WebP/AVIF olarak sunar (uzak adresler netlify.toml'da izinli)
  const cdn = (src, w) => PREVIEW ? src : `/.netlify/images?url=${encodeURIComponent(src)}&w=${w}&q=72`;
  eleventyConfig.addFilter('imgUrl', (src, w = 1200) => src ? cdn(src, w) : '');

  // Görsel: fotoğraf varsa fotoğraf, yoksa illüstrasyon
  eleventyConfig.addShortcode('visual', function (data, kind = 'plate', key = '', eager = false) {
    const from = this.page?.url || '/';
    const img = kind === 'scene' ? (data.heroImage || data.image) : data.image;
    if (img) {
      const src = img.startsWith('/') ? relLink(from, img) : img;
      const widths = kind === 'scene' ? [800, 1200, 1800] : [400, 700, 1000];
      const sizes = kind === 'scene' ? '(max-width: 900px) 100vw, 1200px' : '(max-width: 600px) 100vw, 400px';
      const alt = (data.imageAlt || data.title || '').replace(/"/g, '&quot;');
      const lazy = kind === 'scene' && eager ? 'eager" fetchpriority="high' : 'lazy';
      return `<img class="photo-img" src="${cdn(src, widths[1])}" srcset="${widths.map(w => cdn(src, w) + ' ' + w + 'w').join(', ')}" sizes="${sizes}" alt="${alt}" loading="${lazy}" decoding="async">`;
    }
    return kind === 'scene' ? tabletop(data.art, key || data.title) : plate(data.art, key || data.title);
  });
  eleventyConfig.addShortcode('plateArt', (art, key) => plate(art, key));

  eleventyConfig.addGlobalData('preview', PREVIEW);
  const cats = JSON.parse(fs.readFileSync('src/_data/categories.json', 'utf8'));
  // Ana sayfa "Sana göre": mevsime göre kış/yaz + 3 sabit öneri (site her pazartesi yeniden derlenir)
  { const m = new Date(Date.now() + 3 * 3600e3).getUTCMonth() + 1; eleventyConfig.addGlobalData('homeDiets', [(m >= 10 || m <= 3) ? 'kis-yemekleri' : 'yaz-yemekleri', 'hizli', 'airfryer', 'vegan']); }
  eleventyConfig.addGlobalData('allcats', [...cats.types, ...cats.diets]);
  eleventyConfig.addWatchTarget('src/_data/');

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
}
