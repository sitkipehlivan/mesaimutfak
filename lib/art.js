// Fotoğraf yokken kullanılan illüstrasyonlar (SVG). Renkler CSS değişkenlerinden gelir, açık/koyu temaya uyar.
const COLORS = {
  rice: 'var(--rice)', sun: 'var(--sun)', leaf: 'var(--leaf)', pom: 'var(--pom)', tomato: 'var(--tomato)',
  onion: 'var(--onion)', card: 'var(--card)', water: 'var(--water)', pis: 'var(--pis)'
};
export const TINTS = [
  'var(--water)',
  'color-mix(in srgb,var(--sun) 40%,var(--card))',
  'color-mix(in srgb,var(--pis) 35%,var(--card))',
  'color-mix(in srgb,var(--pom) 22%,var(--card))'
];

function seeded(n) {
  let s = n;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}
function hash(str) {
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.codePointAt(0)) % 9973;
  return h;
}
export function tint(key) { return TINTS[hash(key) % TINTS.length]; }

// Tabak: üstten bakış, 3 renkli
export function plate(art = ['rice', 'sun', 'leaf'], key = 'x') {
  const rn = seeded((hash(key) + 3) * 97);
  const [base, a, b] = art;
  let o = `<circle cx="100" cy="100" r="92" fill="var(--plate)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="100" cy="100" r="76" fill="var(--plate-ring)"/>`;
  o += `<circle cx="100" cy="100" r="62" fill="${COLORS[base]}" stroke="var(--ink)" stroke-width="2"/>`;
  for (let k = 0; k < 16; k++) {
    const ang = rn() * Math.PI * 2, rad = Math.sqrt(rn()) * 50;
    const x = (100 + Math.cos(ang) * rad).toFixed(1), y = (100 + Math.sin(ang) * rad).toFixed(1);
    const c = COLORS[k % 3 ? a : b];
    o += k % 2
      ? `<circle cx="${x}" cy="${y}" r="${(5 + rn() * 5).toFixed(1)}" fill="${c}" stroke="var(--ink)" stroke-width="1.4"/>`
      : `<rect x="${(x - 7).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="14" height="6" rx="3" fill="${c}" stroke="var(--ink)" stroke-width="1.2" transform="rotate(${Math.round(rn() * 180)} ${x} ${y})"/>`;
  }
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${o}</svg>`;
}

// Büyük masa sahnesi: tabak + peçete + çatal + yoğurt kasesi; içerik tarifin renklerinden
export function tabletop(art = ['leaf', 'pom', 'leaf'], key = 'x', w = 800, h = 600) {
  const rn = seeded(hash(key) + 11);
  const [base, a, b] = art;
  let o = `<rect width="800" height="600" fill="var(--table)"/>`;
  for (let y = 0; y < 600; y += 24) o += `<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="var(--ink)" stroke-opacity=".05"/>`;
  o += `<g transform="rotate(8 665 170)"><rect x="560" y="40" width="210" height="260" rx="6" fill="var(--card)" stroke="var(--ink)" stroke-opacity=".25"/>`;
  for (let i = 0; i < 6; i++) o += `<line x1="${578 + i * 34}" y1="40" x2="${560 + i * 34}" y2="300" stroke="var(--pom)" stroke-opacity=".35" stroke-width="5"/>`;
  o += `</g><g transform="rotate(8 680 200)" opacity=".75"><rect x="672" y="70" width="10" height="240" rx="5" fill="var(--ink)"/><rect x="662" y="60" width="30" height="50" rx="6" fill="var(--ink)"/></g>`;
  o += `<circle cx="350" cy="310" r="250" fill="var(--plate)" stroke="var(--ink)" stroke-width="3"/><circle cx="350" cy="310" r="210" fill="var(--plate-ring)"/>`;
  if (base === 'leaf') {
    // sarma dizisi
    [[0, 1], [62, 7], [124, 13], [184, 19]].forEach(([r, n]) => {
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2 + r / 50, x = 350 + Math.cos(ang) * r, y = 310 + Math.sin(ang) * r, d = Math.round(ang * 180 / Math.PI + 90);
        if (r > 170 && rn() < .1) continue;
        const sh = rn() < .5 ? 'var(--leaf)' : 'color-mix(in srgb,var(--leaf) 80%,var(--ink))';
        o += `<g transform="rotate(${d} ${x.toFixed(1)} ${y.toFixed(1)})"><rect x="${(x - 17).toFixed(1)}" y="${(y - 28).toFixed(1)}" width="34" height="56" rx="16" fill="${sh}" stroke="var(--ink)" stroke-width="2"/></g>`;
      }
    });
  } else {
    o += `<circle cx="350" cy="310" r="170" fill="${COLORS[base]}" stroke="var(--ink)" stroke-width="2"/>`;
    for (let i = 0; i < 160; i++) {
      const ang = rn() * Math.PI * 2, r = Math.sqrt(rn()) * 158, x = (350 + Math.cos(ang) * r).toFixed(1), y = (310 + Math.sin(ang) * r).toFixed(1);
      const c = COLORS[i % 3 ? a : b];
      o += i % 2
        ? `<circle cx="${x}" cy="${y}" r="${(6 + rn() * 8).toFixed(1)}" fill="${c}" stroke="var(--ink)" stroke-width="1.2"/>`
        : `<ellipse cx="${x}" cy="${y}" rx="9" ry="4" fill="${c}" stroke="var(--ink)" stroke-opacity=".5" stroke-width="1" transform="rotate(${Math.round(rn() * 180)} ${x} ${y})"/>`;
    }
  }
  [[200, 170], [520, 440]].forEach(([x, y]) => {
    o += `<circle cx="${x}" cy="${y}" r="30" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/><circle cx="${x}" cy="${y}" r="22" fill="color-mix(in srgb,var(--sun) 60%,var(--card))"/>`;
  });
  for (let i = 0; i < 30; i++) {
    const ang = rn() * Math.PI * 2, r = 60 + rn() * 170, x = (350 + Math.cos(ang) * r).toFixed(1), y = (310 + Math.sin(ang) * r).toFixed(1);
    o += `<ellipse cx="${x}" cy="${y}" rx="5" ry="7" fill="${COLORS[a]}" stroke="var(--ink)" stroke-width="1" transform="rotate(${Math.round(rn() * 180)} ${x} ${y})"/>`;
  }
  o += `<circle cx="680" cy="470" r="86" fill="var(--card)" stroke="var(--ink)" stroke-width="3"/><circle cx="680" cy="470" r="66" fill="color-mix(in srgb,var(--card) 70%,var(--water))"/><path d="M640 460 q20 -18 40 0 t40 0" fill="none" stroke="var(--pom)" stroke-width="5" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${o}</svg>`;
}
