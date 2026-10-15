(function () {
  const $ = id => document.getElementById(id);

  /* ---------- tema (açık / koyu) ---------- */
  const root = document.documentElement, darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : darkMQ.matches;
  const themeBtn = $('themeBtn');
  const syncTheme = () => themeBtn && themeBtn.setAttribute('aria-label', isDark() ? 'Açık temaya geç' : 'Koyu temaya geç');
  if (themeBtn) themeBtn.onclick = () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next; syncTheme();
    try { localStorage.setItem('mm-theme', next); } catch (e) {}
  };
  darkMQ.addEventListener && darkMQ.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- bülten formu ---------- */
  const nf = $('newsForm');
  if (nf) nf.addEventListener('submit', e => {
    e.preventDefault();
    const v = $('email').value.trim();
    $('newsMsg').textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? 'Teşekkürler! Bülten yakında başlıyor.'
      : 'Geçerli bir e-posta adresi yaz (ör. ad@ornek.com).';
  });

  /* ---------- porsiyon ayarı ---------- */
  const ing = document.querySelector('.ingredients[data-base]');
  if (ing) {
    const base = +ing.dataset.base; let n = base;
    const FR = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.33: '⅓', 0.67: '⅔' };
    const fmt = x => {
      const w = Math.floor(x), r = Math.round((x - w) * 100) / 100, f = FR[r];
      if (f) return (w ? w + ' ' : '') + f;
      if (r > 0.9) return String(w + 1);
      return String(Math.round(x * 10) / 10).replace('.', ',');
    };
    const render = () => {
      $('srvOut').textContent = n + ' kişilik';
      ing.querySelectorAll('.amt').forEach(el => {
        const a = parseFloat(el.dataset.a);
        if (!isNaN(a)) el.textContent = fmt(Math.round(a * n / base * 4) / 4 || a * n / base);
      });
    };
    ing.querySelectorAll('.srv-btn').forEach(b => b.onclick = () => { n = Math.min(24, Math.max(1, n + +b.dataset.d)); render(); });
  }

  /* ---------- bugün ne pişirsem? ---------- */
  const form = $('pkForm');
  if (form) {
    const TYPES = { ana: ['ana'], aperatif: ['arasicak', 'salata'], corba: ['corba'], yanina: ['pilav', 'zeytinyagli', 'salata'], kahvalti: ['kahvalti'], tatli: ['tatli'] };
    const moods = JSON.parse($('pkMoods').textContent);
    const pool = [...$('pkPool').children].map(el => ({
      el, cats: el.dataset.cats.split(' '), lvl: el.dataset.lvl, min: +el.dataset.min, moods: el.dataset.moods.split(' ')
    }));
    let ranked = [], pos = 0;

    const read = () => {
      const fd = new FormData(form);
      return { mood: fd.get('mood') || '', type: fd.get('type') || '', lvl: fd.get('lvl') || '', time: +(fd.get('time') || 0), vegan: !!fd.get('vegan'), gf: !!fd.get('glutensiz') };
    };
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    function suggest() {
      const q = read();
      let cand = pool.filter(r =>
        (!q.type || TYPES[q.type].some(c => r.cats.includes(c))) &&
        (!q.vegan || r.cats.includes('vegan')) &&
        (!q.gf || r.cats.includes('glutensiz')));
      const exactOf = r => (!q.lvl || r.lvl === q.lvl) && (!q.time || r.min <= q.time) && (!q.mood || r.moods.includes(q.mood));
      const score = r => (q.mood && r.moods.includes(q.mood) ? 4 : 0) + (q.lvl && r.lvl === q.lvl ? 3 : 0) + (q.time && r.min <= q.time ? 2 : 0);
      ranked = shuffle(cand).sort((a, b) => score(b) - score(a));
      pos = 0;
      const m = moods.find(x => x.k === q.mood);
      const exact = ranked.filter(exactOf).length;
      let msg = m ? m.msg : 'İşte bugünün önerisi:';
      if (!ranked.length) msg = 'Bu seçimlerle eşleşen tarif yok. Beslenme ya da tür seçimini gevşetmeyi dene.';
      else if (!exact && (q.mood || q.lvl || q.time)) msg += ' Tam eşleşen yok, en yakınları getirdik.';
      $('pkMsg').textContent = msg;
      $('pkCount').textContent = ranked.length ? `${exact || ranked.length} uygun tarif` : '';
      show();
    }
    function show() {
      const main = $('pkMain'), alts = $('pkAlts');
      main.innerHTML = ''; alts.innerHTML = '';
      $('pkNext').disabled = ranked.length < 2;
      if (!ranked.length) return;
      const pick = i => ranked[(pos + i) % ranked.length].el.cloneNode(true);
      const big = pick(0); big.classList.add('big'); main.appendChild(big);
      for (let i = 1; i <= Math.min(3, ranked.length - 1); i++) alts.appendChild(pick(i));
    }
    form.addEventListener('submit', e => { e.preventDefault(); suggest(); $('pkMain').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); });
    form.addEventListener('change', suggest);
    form.addEventListener('reset', () => setTimeout(suggest, 0));
    $('pkNext').onclick = () => { pos = (pos + 1) % ranked.length; show(); };

    const h = location.hash.slice(1), mi = $('mood-' + h);
    if (mi) mi.checked = true;
    suggest();
  }
})();
