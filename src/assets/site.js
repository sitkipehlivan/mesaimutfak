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
  let adsOn = false; try { adsOn = JSON.parse(document.documentElement.dataset.ads || '{}').enabled; } catch (e) {}
  if (ga || adsOn) {
    const CKEY = 'mm-consent';
    let c = null; try { c = localStorage.getItem(CKEY); } catch (e) {}
    const load = () => {
      if (!ga || !window.gtag) return;
      gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
      gtag('set', 'ads_data_redaction', false);
    };
    const decide = v => { try { localStorage.setItem(CKEY, v); } catch (e) {} document.dispatchEvent(new CustomEvent('mm-consent', { detail: v })); };
    const b = $('consent');
    if (b) {
      $('consentYes').addEventListener('click', () => { b.hidden = true; decide('yes'); load(); });
      $('consentNo').addEventListener('click', () => { b.hidden = true; decide('no'); if (window.gtag) gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); });
      b.hidden = (c === 'yes' || c === 'no');
    }
    // alt bilgideki "Çerez tercihleri" linki banner'ı yeniden açar
    document.querySelectorAll('[data-consent-open]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); if (b) b.hidden = false; }));
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

    const LVL = { Kolay: 1, Orta: 2, Zor: 3 };
    const TL = { 30: '30 dk ve altı', 60: '1 saat ve altı' };
    const typeOk = (r, t) => !t || TYPES[t].some(c => r.cats.includes(c));
    // kesin filtreler: tür, zorluk, süre, beslenme. Uymayan tarif asla gösterilmez.
    const hard = (q, r) => typeOk(r, q.type) && (!q.lvl || (q.lvl === 'Emek' ? r.lvl !== 'Kolay' : r.lvl === q.lvl)) && (!q.time || r.min <= q.time) &&
      (!q.vegan || r.cats.includes('vegan')) && (!q.gf || r.cats.includes('glutensiz'));
    const count = q => pool.filter(r => hard(q, r)).length;
    const setVal = (name, v) => { const el = form.querySelector(`input[name="${name}"][value="${v}"]`); if (el) el.checked = true; };

    function relaxOptions(q) {
      // sonuç verecek en küçük gevşetmeleri öner
      const out = [];
      if (q.time === 30 && count({ ...q, time: 60 })) out.push(['Süreyi 1 saate çıkar', () => setVal('time', '60')]);
      if (q.time && count({ ...q, time: 0 })) out.push(['Süre fark etmez', () => setVal('time', '')]);
      if (q.lvl && count({ ...q, lvl: '' })) out.push(['Zorluk fark etmez', () => setVal('lvl', '')]);
      if (q.vegan && count({ ...q, vegan: false })) out.push(['Vegan şartını kaldır', () => { form.querySelector('input[name="vegan"]').checked = false; }]);
      if (q.gf && count({ ...q, gf: false })) out.push(['Glutensiz şartını kaldır', () => { form.querySelector('input[name="glutensiz"]').checked = false; }]);
      if (q.type && count({ ...q, type: '' })) out.push(['Tür fark etmez', () => setVal('type', '')]);
      if (!out.length) {
        // tek adımda sonuç yoksa: sadece türü koruyup diğer şartları kaldır, o da olmazsa her şeyi sıfırla
        if (q.type && count({ type: q.type })) out.push(['Sadece türü koru', () => { const t = q.type; form.reset(); setTimeout(() => { setVal('type', t); suggest(); }, 0); }]);
        out.push(['Seçimleri sıfırla', () => { form.reset(); }]);
      }
      return out.slice(0, 3);
    }

    function updateCounts(q) {
      // her seçeneğin yanında, diğer seçimlerle kaç tarif kaldığını göster; 0 olanları soluklaştır
      form.querySelectorAll('input[name="type"],input[name="lvl"],input[name="time"]').forEach(el => {
        const key = el.name, v = el.value;
        const nq = { ...q, [key]: key === 'time' ? +(v || 0) : v };
        const n = count(nq), lab = el.closest('label');
        lab.classList.toggle('zero', n === 0 && !el.checked);
        let sp = lab.querySelector('.n'); if (!sp) { sp = document.createElement('small'); sp.className = 'n'; lab.querySelector('span').appendChild(sp); }
        sp.textContent = ' ' + n;
      });
      ['vegan', 'glutensiz'].forEach(k => {
        const el = form.querySelector(`input[name="${k}"]`); if (!el) return;
        const n = count({ ...q, [k === 'vegan' ? 'vegan' : 'gf']: true }), lab = el.closest('label');
        lab.classList.toggle('zero', n === 0 && !el.checked);
        let sp = lab.querySelector('.n'); if (!sp) { sp = document.createElement('small'); sp.className = 'n'; lab.querySelector('span').appendChild(sp); }
        sp.textContent = ' ' + n;
      });
    }

    function suggest() {
      const q = read();
      const cand = pool.filter(r => hard(q, r));
      const moodHit = r => q.mood && r.moods.includes(q.mood);
      const lvlScore = r => -(LVL[r.lvl] || 2) * 0.1; // eşitlikte kolay olan öne
      ranked = shuffle(cand).sort((a, b) => ((moodHit(b) ? 4 : 0) + lvlScore(b)) - ((moodHit(a) ? 4 : 0) + lvlScore(a)));
      pos = 0;
      const m = moods.find(x => x.k === q.mood);
      const hits = q.mood ? cand.filter(moodHit).length : cand.length;
      let msg = m ? m.msg : 'İşte bugünün önerisi:';
      const relax = $('pkRelax'); relax.innerHTML = '';
      if (!ranked.length) {
        msg = 'Bu seçimlere uyan tarif henüz yok.';
        const opts = relaxOptions(q);
        if (opts.length) msg += ' Şunlardan birini dene:';
        opts.forEach(([label, fn]) => { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn ghost'; bt.textContent = label; bt.onclick = () => { fn(); setTimeout(suggest, 0); }; relax.appendChild(bt); });
      } else if (q.mood && !hits) msg += ' Bu ruh haline birebir uyan yok; seçimlerine uyan diğer tarifleri getirdik.';
      $('pkMsg').textContent = msg;
      $('pkCount').textContent = ranked.length ? `${ranked.length} uygun tarif` : '';
      updateCounts(q);
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
