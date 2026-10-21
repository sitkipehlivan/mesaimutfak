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
  eleventyConfig.addFilter('related', (list, cur) => list
    .filter(r => r.fileSlug !== cur.fileSlug && r.data.cats.some(c => cur.data.cats.includes(c)))
    .slice(0, 4));
  eleventyConfig.addFilter('catLabel', (k, cats) => ([...cats.types, ...cats.diets].find(c => c.k === k) || {}).l || k);
  eleventyConfig.addFilter('catLabels', (ks, cats) => (ks || []).map(k => ([...cats.types, ...cats.diets].find(c => c.k === k) || {}).l || k).join(', '));
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
  eleventyConfig.addGlobalData('allcats', [...cats.types, ...cats.diets]);
  eleventyConfig.addWatchTarget('src/_data/');

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
}
