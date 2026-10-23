// Mesai Mutfak · Instagram carousel ortak mantığı (görsel üretimi + açıklama metni)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CATS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/_data/categories.json'), 'utf8'));
export const CAT_LABEL = Object.fromEntries([...CATS.types, ...CATS.diets].map(c => [c.k, c.l]));

const FR = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.33: '⅓', 0.66: '⅔' };
export function amt(a) {
  if (a === null || a === undefined || a === '') return '';
  a = Number(a); const w = Math.trunc(a); const f = Math.round((a - w) * 100) / 100;
  const frac = FR[f] ? FR[f] : (f ? ',' + String(f).split('.')[1] : '');
  return ((w ? String(w) : '') + (FR[f] && w ? ' ' : '') + frac).trim();
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TAGS = { corba: '#çorba #çorbatarifi', pilav: '#pilav #pilavtarifi', zeytinyagli: '#zeytinyağlı #zeytinyağlıtarifler', ana: '#akşamyemeği #anayemek', tatli: '#tatlı #tatlıtarifleri', kahvalti: '#kahvaltı #kahvaltılık', salata: '#salata #meze', hamurisi: '#hamurişi #evyapımı', firin: '#fırınyemekleri', hizli: '#pratiktarifler #hızlıtarifler', vegan: '#vegan', glutensiz: '#glutensiz', dunya: '#dünyamutfağı', arasicak: '#arasıcak', saglikli: '#sağlıklıtatlılar' };

export function caption(r, override) {
  if (override && override.trim()) return override.trim();
  const tot = (r.prep || 0) + (r.cook || 0);
  const ing = (r.ingredients || []).map(g => (g.group ? '\n' + g.group + ':' : '') + (g.items || []).map(i => '\n· ' + [amt(i.a), i.u || ''].join(' ').trim() + ' ' + i.n).join('')).join('\n').trim();
  const tags = [...new Set((r.cats || []).flatMap(c => (TAGS[c] || '').split(' ')).filter(Boolean))];
  const own = '#' + r.title.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]/g, '');
  const all = [own, '#mesaimutfak', '#yemektarifleri', '#evyemekleri', ...tags, '#kolaytarifler'];
  return `${r.title}\n${r.desc}\n\n${tot} dk · ${r.serv} kişilik · ${r.lvl}\n\nMalzemeler:\n${ing}\n\nYapılışı adım adım kaydırmalı görsellerde. Kaydet, akşam lazım olur.\nTarifin tamamı ve püf noktaları: mesaimutfak.com (profildeki linkte)\n\n${[...new Set(all)].slice(0, 25).join(' ')}`;
}

// Bir tarif için carousel kareleri (HTML). img: tarif fotoğrafının yerel dosya yolu
export function slides(r, img) {
  const icon = '<svg viewBox="0 0 40 40" class="ic"><rect x="5" y="15" width="30" height="19" rx="5" fill="#F2B12E" stroke="#18201C" stroke-width="2.5"/><rect x="10" y="9" width="20" height="5" rx="2.5" fill="#18201C"/><rect x="18" y="5" width="4" height="5" rx="2" fill="#18201C"/></svg>';
  const logo = `<div class="logo">${icon}<span>mesai·mutfak</span></div>`;
  const t = esc(r.title), out = [];
  const bg = `background-image:url('file://${img}')`;
  out.push(`<div class="s cover"><div class="ph" style="${bg}"></div><div class="top">${logo}</div>
<div class="pan"><div class="eb">${esc(CAT_LABEL[(r.cats || [])[0]] || '')}</div><h1>${t}</h1><div class="meta"><span>${r.prep} dk hazırlık</span><span>${r.cook} dk pişirme</span><span>${r.serv} kişilik</span><span>${esc(r.lvl)}</span></div></div><div class="swipe">Tarif için kaydır →</div></div>`);
  const n = (r.ingredients || []).reduce((a, g) => a + (g.items || []).length, 0);
  let body = '';
  for (const g of r.ingredients || []) {
    if (g.group) body += `<li class="g">${esc(g.group)}</li>`;
    for (const i of g.items || []) body += `<li><b>${esc([amt(i.a), i.u || ''].join(' ').trim())}</b><span>${esc(i.n)}</span></li>`;
  }
  out.push(`<div class="s ing"><div class="hd"><div class="eb">Malzemeler · ${r.serv} kişilik</div><h2>${t}</h2></div><ul class="${n > 9 ? 'two' : ''} ${n > 15 ? 'dense' : ''}">${body}</ul><div class="foot">${logo}<span class="pg">2</span></div></div>`);
  const chunks = []; let cur = [], L = 0;
  (r.steps || []).forEach((x, k) => { const l = String(x.d || '').length + 60; if (cur.length && (L + l > 560 || cur.length >= 3)) { chunks.push(cur); cur = []; L = 0; } cur.push([k + 1, x]); L += l; });
  if (cur.length) chunks.push(cur);
  chunks.forEach((ch, k) => {
    const lis = ch.map(([i, x]) => `<li><div class="no">${i}</div><div><h3>${esc(x.t)}${x.time ? ' <em>' + esc(x.time) + '</em>' : ''}</h3><p>${esc(x.d)}</p></div></li>`).join('');
    out.push(`<div class="s steps"><div class="hd"><div class="eb">Yapılışı · ${k + 1}/${chunks.length}</div><h2>${t}</h2></div><ol>${lis}</ol><div class="foot">${logo}<span class="pg">${3 + k}</span></div></div>`);
  });
  const tip = (r.tips || [])[0] || 'Tarifin tüm püf noktaları sitede.';
  out.push(`<div class="s end"><div class="ph full" style="${bg}"></div><div class="card"><div class="eb">Püf noktası</div><p class="tip">${esc(tip)}</p><div class="cta"><b>Kaydet, sonra pişir.</b><span>Tarifin tamamı ve daha fazlası: mesaimutfak.com</span></div>${logo}</div></div>`);
  return out.slice(0, 10); // Instagram carousel sınırı içinde kal
}
