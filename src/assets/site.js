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
        if (isNaN(a)) return;
        const v = a * n / base;
        const unit = (el.parentNode.querySelector('.unit') || {}).textContent || '';
        const whole = /^(adet|diş|dal|yaprak|dilim|paket|kutu|demet)$/.test(unit.trim());
        el.textContent = v >= 50 ? String(Math.round(v / 5) * 5) : v >= 10 ? String(Math.round(v)) : whole ? fmt(Math.max(0.5, Math.round(v * 2) / 2)) : fmt(Math.round(v * 4) / 4 || v);
      });
    };
    ing.querySelectorAll('.srv-btn').forEach(b => b.onclick = () => { n = Math.min(24, Math.max(1, n + +b.dataset.d)); render(); });
  }


  /* ---------- ölçüm (GA4, yalnızca onay verilirse) ---------- */
  window.mmTrack = function (name, params) {
    try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {}
  };

  /* ---------- market seçimi: son kullanılan öne ---------- */
  const PKEY = 'mm-partner';
  let lastP = null; try { lastP = localStorage.getItem(PKEY); } catch (e) {}
  document.querySelectorAll('.shop-partners').forEach(box => {
    const a = lastP && box.querySelector(`.partner[data-partner="${lastP}"]`);
    if (a) { a.classList.add('last'); box.insertBefore(a, box.querySelector('.partner')); }
    box.addEventListener('click', e => { const p = e.target.closest('.partner'); if (p) try { localStorage.setItem(PKEY, p.dataset.partner); } catch (_) {} });
  });

  /* ---------- eksik malzemeler / alışveriş listesi ---------- */
  const shop = $('shop');
  const LKEY = 'mm-list';
  const readList = () => { try { return JSON.parse(localStorage.getItem(LKEY) || '{}'); } catch (e) { return {}; } };
  const writeList = v => { try { localStorage.setItem(LKEY, JSON.stringify(v)); return true; } catch (e) { return false; } };
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove(); return ok;
    }
  }
  if (shop && ing) {
    const msg = t => { $('shopMsg').textContent = t; clearTimeout(msg._t); msg._t = setTimeout(() => $('shopMsg').textContent = '', 4000); };
    const missing = () => [...ing.querySelectorAll('.ing-list li')]
      .filter(li => !li.dataset.pantry && !li.querySelector('.have').checked)
      .map(li => [li.querySelector('.amt').textContent, li.querySelector('.unit').textContent, li.querySelector('.nm').textContent].join(' ').replace(/\s+/g, ' ').trim());
    const listText = items => `${shop.dataset.title} için alışveriş listem:\n` + items.map(i => '• ' + i).join('\n') + `\n\nTarif: ${shop.dataset.url}`;
    const update = () => {
      const items = missing();
      $('shopCount').textContent = items.length ? items.length + ' ürün' : 'hepsi evde';
      $('shopList').innerHTML = items.map(i => `<li>${i.replace(/</g, '&lt;')}</li>`).join('');
      $('shopWa').href = 'https://wa.me/?text=' + encodeURIComponent(listText(items));
      shop.classList.toggle('done', !items.length);
    };
    ing.addEventListener('change', update);
    ing.addEventListener('click', e => { if (e.target.closest('.srv-btn')) setTimeout(update, 0); });
    update();
    $('shopCopy').onclick = async () => { const ok = await copyText(listText(missing())); msg(ok ? 'Liste kopyalandı.' : 'Kopyalanamadı, listeyi seçip kopyalayabilirsin.'); mmTrack('shopping_list_copy', { recipe: shop.dataset.slug, items: missing().length }); };
    $('shopWa').addEventListener('click', () => mmTrack('shopping_list_share', { recipe: shop.dataset.slug, method: 'whatsapp' }));
    $('shopAdd').onclick = () => {
      const l = readList(); l[shop.dataset.slug] = { title: shop.dataset.title, url: shop.dataset.url, items: missing(), at: Date.now() };
      msg(writeList(l) ? 'Listene eklendi. Tüm listen: mesaimutfak.com/listem' : 'Bu tarayıcı listeyi saklamaya izin vermiyor.');
      mmTrack('shopping_list_add', { recipe: shop.dataset.slug, items: missing().length });
    };
    shop.querySelectorAll('.partner').forEach(a => a.addEventListener('click', () => {
      copyText(listText(missing()));
      mmTrack('partner_click', { partner: a.dataset.partner, recipe: shop.dataset.slug, items: missing().length });
    }));
  }

  /* ---------- listem sayfası ---------- */
  const lp = $('listPage');
  if (lp) {
    const render = () => {
      const l = readList(), keys = Object.keys(l).sort((a, b) => l[b].at - l[a].at);
      $('listEmpty').hidden = !!keys.length; $('listFull').hidden = !keys.length;
      $('listRecipes').innerHTML = keys.map(k => `<li><div><a href="${l[k].url}">${l[k].title}</a><span>${l[k].items.length} ürün</span></div><ul>${l[k].items.map(i => `<li>${i}</li>`).join('')}</ul><button type="button" class="btn ghost" data-rm="${k}">Çıkar</button></li>`).join('');
      $('listRecipes').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const l2 = readList(); delete l2[b.dataset.rm]; writeList(l2); render(); });
      const all = keys.flatMap(k => l[k].items);
      const text = 'Mesai Mutfak alışveriş listem:\n' + keys.map(k => `\n${l[k].title}\n` + l[k].items.map(i => '• ' + i).join('\n')).join('\n');
      $('listCount').textContent = `${keys.length} tarif · ${all.length} ürün`;
      $('listWa').href = 'https://wa.me/?text=' + encodeURIComponent(text);
      $('listCopy').onclick = async () => { const ok = await copyText(text); $('listMsg').textContent = ok ? 'Liste kopyalandı.' : 'Kopyalanamadı.'; mmTrack('shopping_list_copy', { recipe: 'listem', items: all.length }); };
      $('listClear').onclick = () => { writeList({}); render(); };
      lp.querySelectorAll('.partner').forEach(a => a.onclick = () => { copyText(text); mmTrack('partner_click', { partner: a.dataset.partner, recipe: 'listem', items: all.length }); });
    };
    render();
  }

  /* ---------- çerez onayı ve GA4 ---------- */
  const ga = document.documentElement.dataset.ga4;
  if (ga) {
    const CKEY = 'mm-consent';
    let c = null; try { c = localStorage.getItem(CKEY); } catch (e) {}
    const load = () => {
      const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', ga, { anonymize_ip: true });
    };
    if (c === 'yes') load();
    else if (c !== 'no') {
      const b = $('consent'); if (b) {
        b.hidden = false;
        $('consentYes').onclick = () => { try { localStorage.setItem(CKEY, 'yes'); } catch (e) {} b.hidden = true; load(); };
        $('consentNo').onclick = () => { try { localStorage.setItem(CKEY, 'no'); } catch (e) {} b.hidden = true; };
      }
    }
  }


  /* ---------- arama ---------- */
  const sp = $('searchPage');
  if (sp) {
    const norm = t => String(t || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, ch => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' })[ch]).replace(/[^a-z0-9 ]/g, ' ');
    const params = new URLSearchParams(location.search); const qi = $('q'); qi.value = params.get('q') || '';
    const root = document.querySelector('.logo').getAttribute('href').replace(/index\.html$/, '');
    let data = null;
    const card = r => `<a class="rc" href="${root.replace(/\/$/, '')}${r.u}"><div class="art${r.i ? ' has-photo' : ''}">${r.i ? `<img class="photo-img" src="${r.i}" alt="" loading="lazy">` : `<span class="ph-letter">${r.t[0]}</span>`}</div><div class="body"><span class="cat-name">${r.c.split(', ')[0]}</span><h3>${r.t}</h3><p>${r.d}</p><dl class="facts"><div><dt>Süre</dt><dd>${r.m} dk</dd></div><div><dt>Zorluk</dt><dd>${r.l}</dd></div><div><dt>Kategori</dt><dd>${r.c.split(', ').length > 1 ? r.c.split(', ')[1] : r.c}</dd></div></dl></div></a>`;
    const run = () => {
      const q = qi.value.trim(), words = norm(q).split(/\s+/).filter(w => w.length > 1);
      history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname);
      if (!words.length) { $('searchSum').textContent = `${data.length} tarif var. Bir tarif adı ya da malzeme yaz.`; $('searchResults').innerHTML = ''; return; }
      const scored = data.map(r => {
        const T = norm(r.t), C = norm(r.c), G = norm(r.g), D = norm(r.d); let s = 0;
        for (const w of words) { if (T.includes(w)) s += 10; else if (C.includes(w)) s += 6; else if (G.includes(w)) s += 4; else if (D.includes(w)) s += 2; else return null; }
        return { r, s: s + (T.startsWith(words[0]) ? 5 : 0) };
      }).filter(Boolean).sort((a, b) => b.s - a.s);
      $('searchSum').textContent = scored.length ? `“${q}” için ${scored.length} tarif bulundu.` : `“${q}” için tarif bulunamadı. Daha kısa bir kelime ya da bir malzeme dene.`;
      $('searchResults').innerHTML = scored.map(x => card(x.r)).join('');
      mmTrack('search', { search_term: q, results: scored.length });
    };
    let t; qi.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 180); });
    $('searchForm').addEventListener('submit', e => { e.preventDefault(); run(); });
    fetch(root.replace(/\/$/, '') + '/arama-dizini.json').then(r => r.json()).then(d => { data = d; run(); })
      .catch(() => { $('searchSum').textContent = 'Arama şu an yüklenemedi. Sayfayı yenilemeyi dene.'; });
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
