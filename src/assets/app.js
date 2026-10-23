/* Mesai Mutfak · uygulama katmanı: service worker, kaydettiklerim, pişirme modu, yükleme */
(function () {
  const $ = id => document.getElementById(id);
  const track = (n, p) => { try { window.mmTrack && window.mmTrack(n, p || {}); } catch (e) {} };
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('is-app');

  /* ---------- service worker ---------- */
  const swReady = ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost'))
    ? navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).catch(() => null)
    : Promise.resolve(null);
  const swSend = msg => swReady.then(r => r && r.active && r.active.postMessage(msg));

  /* ---------- kaydettiklerim ---------- */
  const FKEY = 'mm-fav';
  const favs = () => store.get(FKEY, []);
  const setCount = () => { const c = $('favCount'), n = favs().length; if (c) { c.hidden = !n; c.textContent = n > 99 ? '99+' : n; } };
  setCount();

  const fb = $('favBtn');
  if (fb) {
    const d = fb.dataset;
    const isSaved = () => favs().some(f => f.slug === d.slug);
    const paint = () => { const on = isSaved(); fb.classList.toggle('on', on); fb.setAttribute('aria-pressed', on); fb.querySelector('span').textContent = on ? 'Kaydedildi' : 'Kaydet'; };
    paint();
    fb.addEventListener('click', () => {
      let list = favs();
      const urls = [d.url].concat(d.img ? [d.img] : []);
      if (isSaved()) { list = list.filter(f => f.slug !== d.slug); swSend({ type: 'unsave', urls }); track('recipe_unsave', { slug: d.slug }); }
      else { list.unshift({ slug: d.slug, title: d.title, url: d.url, img: d.img, meta: d.meta, at: Date.now() }); swSend({ type: 'save', urls }); track('recipe_save', { slug: d.slug }); }
      store.set(FKEY, list); paint(); setCount();
    });
  }

  const fp = $('favPage');
  if (fp) {
    const render = () => {
      const list = favs();
      $('favEmpty').hidden = list.length > 0;
      $('favSum').textContent = list.length ? list.length + ' tarif' : '';
      $('favGrid').innerHTML = list.map(f => `<div class="fav-item"><a href="${esc(f.url)}">
        <span class="fav-img"${f.img ? ` style="background-image:url('${esc(f.img)}')"` : ''}></span>
        <span class="fav-body"><b>${esc(f.title)}</b><em class="mono">${esc(f.meta)}</em></span></a>
        <button type="button" class="fav-x" data-slug="${esc(f.slug)}" aria-label="${esc(f.title)} kaydını kaldır">×</button></div>`).join('');
    };
    render();
    $('favGrid').addEventListener('click', e => {
      const b = e.target.closest('.fav-x'); if (!b) return;
      const f = favs().find(x => x.slug === b.dataset.slug);
      store.set(FKEY, favs().filter(x => x.slug !== b.dataset.slug));
      if (f) swSend({ type: 'unsave', urls: [f.url].concat(f.img ? [f.img] : []) });
      render(); setCount();
    });
    // eski kayıtlar internetsiz açılsın diye önbelleği tazele
    swSend({ type: 'save', urls: favs().flatMap(f => [f.url].concat(f.img ? [f.img] : [])) });
  }

  /* ---------- pişirme modu ---------- */
  const cb = $('cookBtn');
  if (cb) {
    const steps = [...document.querySelectorAll('ol.steps > li')].map(li => {
      const h = li.querySelector('h3'), t = li.querySelector('.st-time');
      return { title: h ? h.childNodes[0].textContent.trim() : '', time: t ? t.textContent.trim() : '', text: (li.querySelector('p') || {}).textContent || '' };
    });
    const title = (document.querySelector('.r-info h1') || {}).textContent || '';
    const toSec = s => { // "5 dk", "2-3 dk / adet", "1 saat", "3,5 saat", "30 sn"
      const m = /(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*(sa|dk|dak|sn|san)/i.exec(s || ''); if (!m) return 0;
      const n = parseFloat((m[2] || m[1]).replace(',', '.')), u = m[3].toLowerCase();
      return Math.round(u.startsWith('sa') ? n * 3600 : u.startsWith('sn') || u.startsWith('san') ? n : n * 60);
    };
    let i = 0, lock = null, timer = null, left = 0, tStep = -1, ov = null;
    const fmt = s => (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    const beep = () => {
      try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .35, .7].forEach(d => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.25, a.currentTime + d); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + d + .3); o.start(a.currentTime + d); o.stop(a.currentTime + d + .3); }); } catch (e) {}
      try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {}
    };
    const wake = async () => { try { lock = await navigator.wakeLock.request('screen'); } catch (e) { lock = null; } };
    const draw = () => {
      const s = steps[i], sec = toSec(s.time);
      ov.querySelector('.ck-no').textContent = `Adım ${i + 1} / ${steps.length}`;
      ov.querySelector('.ck-t').textContent = s.title;
      ov.querySelector('.ck-d').textContent = s.text;
      ov.querySelector('.ck-bar i').style.width = ((i + 1) / steps.length * 100) + '%';
      const tb = ov.querySelector('.ck-timer');
      tb.hidden = !sec;
      if (sec) tb.textContent = (timer && tStep === i) ? `${fmt(left)} · durdur` : `Zamanlayıcı · ${s.time}`;
      ov.querySelector('.ck-prev').disabled = i === 0;
      ov.querySelector('.ck-next').textContent = i === steps.length - 1 ? 'Afiyet olsun' : 'Sonraki adım';
      const run = ov.querySelector('.ck-run');
      run.hidden = !(timer && tStep !== i);
      if (timer && tStep !== i) run.textContent = `Adım ${tStep + 1} · ${fmt(left)}`;
    };
    const stopTimer = () => { clearInterval(timer); timer = null; tStep = -1; };
    const close = () => { ov.hidden = true; document.body.classList.remove('ck-open'); try { lock && lock.release(); } catch (e) {} lock = null; };
    const build = () => {
      ov = document.createElement('div');
      ov.className = 'cook'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Pişirme modu');
      ov.innerHTML = `<div class="ck-top"><span class="ck-title"></span><button type="button" class="ck-close" aria-label="Pişirme modunu kapat">×</button></div>
        <div class="ck-bar"><i></i></div>
        <div class="ck-main"><div class="ck-no mono"></div><h2 class="ck-t"></h2><p class="ck-d"></p>
        <button type="button" class="btn ck-timer"></button><button type="button" class="ck-run mono" hidden></button></div>
        <div class="ck-nav"><button type="button" class="btn ghost ck-prev">Önceki</button><button type="button" class="btn ck-next">Sonraki adım</button></div>`;
      ov.querySelector('.ck-title').textContent = title;
      document.body.appendChild(ov);
      ov.querySelector('.ck-close').onclick = close;
      ov.querySelector('.ck-prev').onclick = () => { if (i > 0) { i--; draw(); } };
      ov.querySelector('.ck-next').onclick = () => { if (i < steps.length - 1) { i++; draw(); } else { close(); track('cook_finish', { slug: (fb && fb.dataset.slug) || '' }); } };
      ov.querySelector('.ck-run').onclick = () => { i = tStep; draw(); };
      ov.querySelector('.ck-timer').onclick = () => {
        if (timer && tStep === i) { stopTimer(); draw(); return; }
        stopTimer(); tStep = i; left = toSec(steps[i].time);
        timer = setInterval(() => { left--; if (left <= 0) { stopTimer(); beep(); ov.querySelector('.ck-timer').textContent = 'Süre doldu'; } else draw(); }, 1000);
        draw();
      };
      document.addEventListener('keydown', e => { if (ov.hidden) return; if (e.key === 'ArrowRight') ov.querySelector('.ck-next').click(); if (e.key === 'ArrowLeft') ov.querySelector('.ck-prev').click(); if (e.key === 'Escape') close(); });
      let x0 = null; // kaydırarak adım değiştir
      ov.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      ov.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 70) (dx < 0 ? ov.querySelector('.ck-next') : ov.querySelector('.ck-prev')).click(); x0 = null; });
      document.addEventListener('visibilitychange', () => { if (!ov.hidden && document.visibilityState === 'visible') wake(); });
    };
    cb.addEventListener('click', () => {
      if (!steps.length) return;
      if (!ov) build();
      ov.hidden = false; document.body.classList.add('ck-open'); draw(); wake();
      track('cook_mode', { slug: (fb && fb.dataset.slug) || '' });
    });
  }

  /* ---------- uygulamayı yükle ---------- */
  let deferred = null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const btns = [$('installBtn'), $('installBtn2')].filter(Boolean);
  const card = $('installCard');
  const showInstall = () => { if (standalone) return; btns.forEach(b => b.hidden = false); if (card) card.hidden = false; };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; showInstall(); });
  if (ios && !standalone) { showInstall(); const t = $('installText'); if (t) t.textContent = 'Safari’de alttaki Paylaş butonuna, sonra “Ana Ekrana Ekle”ye dokun.'; }
  btns.forEach(b => b.addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice; track('app_install_prompt', { outcome: r.outcome }); deferred = null; if (r.outcome === 'accepted') btns.forEach(x => x.hidden = true); }
    else if (ios) { alertBox(); }
  }));
  function alertBox() {
    let m = $('iosHint');
    if (!m) { m = document.createElement('div'); m.id = 'iosHint'; m.className = 'ios-hint'; m.innerHTML = '<b>Ana ekrana ekle</b><p>Safari’de alttaki <b>Paylaş</b> simgesine dokun, ardından <b>Ana Ekrana Ekle</b>’yi seç.</p><button type="button" class="btn">Tamam</button>'; document.body.appendChild(m); m.querySelector('button').onclick = () => m.hidden = true; }
    m.hidden = false;
  }
  window.addEventListener('appinstalled', () => { btns.forEach(b => b.hidden = true); if (card) card.hidden = true; track('app_installed'); });
  if (standalone) track('app_open');
})();
