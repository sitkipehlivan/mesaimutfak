// Instagram takvimindeki tariflerin carousel görsellerini üretir: src/img/ig/<tarif>/01.jpg …
// Kullanım: node scripts/ig/render.mjs [--all]   (GitHub Action çalıştırır; yerelde de çalışır)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import { chromium } from 'playwright';
import { slides } from './lib.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const HERE = path.join(ROOT, 'scripts/ig');
const OUT = path.join(ROOT, 'src/img/ig');
const fm = file => yaml.load(fs.readFileSync(file, 'utf8').split(/^---\s*$/m)[1]);
const all = process.argv.includes('--all');

const plan = fs.existsSync(path.join(ROOT, 'src/instagram'))
  ? fs.readdirSync(path.join(ROOT, 'src/instagram')).filter(f => f.endsWith('.md')).map(f => fm(path.join(ROOT, 'src/instagram', f)))
  : [];
const wanted = [...new Set(plan.map(p => p.recipe).filter(Boolean))];
const css = fs.readFileSync(path.join(HERE, 'style.css'), 'utf8');
const styleHash = crypto.createHash('sha1').update(css + fs.readFileSync(path.join(HERE, 'lib.mjs'), 'utf8')).digest('hex');

const jobs = [];
for (const slug of wanted) {
  const mdPath = path.join(ROOT, 'src/tarifler', slug + '.md');
  if (!fs.existsSync(mdPath)) { console.warn('⚠ tarif yok:', slug); continue; }
  const r = fm(mdPath);
  if (!r.image) { console.warn('⚠ fotoğrafı yok, atlandı:', slug); continue; }
  const img = path.join(ROOT, 'src', r.image.replace(/^\//, ''));
  if (!fs.existsSync(img)) { console.warn('⚠ fotoğraf dosyası bulunamadı:', img); continue; }
  const hash = crypto.createHash('sha1').update(fs.readFileSync(mdPath)).update(fs.readFileSync(img)).update(styleHash).digest('hex');
  const dir = path.join(OUT, slug), stamp = path.join(dir, '.hash');
  if (!all && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === hash) continue;
  jobs.push({ slug, r, img, dir, stamp, hash });
}
if (!jobs.length) { console.log('Yeni görsel gerekmiyor.'); process.exit(0); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ viewport: { width: 1080, height: 1350 } })).newPage();
for (const j of jobs) {
  const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><style>${css}</style><body>${slides(j.r, j.img).map(s => `<div class="wrap">${s}</div>`).join('')}</body></html>`;
  const tmp = path.join(HERE, '_render.html');
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  fs.rmSync(j.dir, { recursive: true, force: true }); fs.mkdirSync(j.dir, { recursive: true });
  const wraps = await page.$$('.wrap');
  for (let k = 0; k < wraps.length; k++) await wraps[k].screenshot({ path: path.join(j.dir, String(k + 1).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 90 });
  fs.writeFileSync(j.stamp, j.hash);
  console.log('✓', j.slug, wraps.length, 'kare');
  fs.rmSync(tmp, { force: true });
}
await browser.close();
