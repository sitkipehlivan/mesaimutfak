/* Mesai Mutfak · reklam alanları (Google Ad Manager / GPT) ve preroll player
   - Panel → Site ayarları → Reklam: "Reklamlar açık" + ağ kodu girilince gerçek reklamlar çağrılır.
   - ?reklam=onizleme : reklamlar kapalıyken bile alanları etiketli kutular olarak gösterir (oturum boyunca hatırlanır).
   - ?reklam=kapat    : önizlemeyi kapatır. */
(function () {
  const html = document.documentElement;
  let cfg = {}; try { cfg = JSON.parse(html.dataset.ads || '{}'); } catch (e) {}
  const q = new URLSearchParams(location.search).get('reklam');
  try {
    if (q === 'onizleme') sessionStorage.setItem('mm-ad-preview', '1');
    if (q === 'kapat') sessionStorage.removeItem('mm-ad-preview');
  } catch (e) {}
  let preview = q === 'onizleme';
  try { preview = preview || sessionStorage.getItem('mm-ad-preview') === '1'; } catch (e) {}
  const live = !!(cfg.enabled && cfg.network);
  const SAMPLE_VAST = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';
  const SAMPLE_MP4 = 'https://storage.googleapis.com/gvabox/media/samples/stock.mp4';

  initPlayer();
  if (!live && !preview) return;
  html.classList.add('ads-on');
  if (preview && !live) html.classList.add('ads-preview');

  const W = () => window.innerWidth;
  const tier = () => (W() >= 1000 ? 'desktop' : W() >= 768 ? 'tablet' : 'mobile');
  const sizesFor = el => {
    if (el.dataset.minw && W() < +el.dataset.minw) return [];
    try { return JSON.parse(el.dataset[tier()] || '[]'); } catch (e) { return []; }
  };
  const slots = [...document.querySelectorAll('.ad[data-ad]')];
  slots.forEach(el => {
    const sz = sizesFor(el);
    if (!sz.length) { el.classList.add('ad-off'); return; }
    // yer ayır: en büyük yükseklik kadar (CLS olmasın)
    el.style.setProperty('--ad-h', Math.max(...sz.map(s => s[1])) + 'px');
    el.style.setProperty('--ad-w', Math.max(...sz.map(s => s[0])) + 'px');
  });
  const anchor = document.querySelector('.ad-anchor');
  if (anchor) {
    const x = anchor.querySelector('.ad-x');
    if (x) x.onclick = () => { anchor.classList.add('ad-off'); html.classList.remove('has-anchor'); };
    if (!anchor.classList.contains('ad-off')) html.classList.add('has-anchor');
  }

  if (!live) return previewMode();

  /* ---------- gerçek reklamlar: GPT ---------- */
  const consent = () => { try { return localStorage.getItem('mm-consent') === 'yes'; } catch (e) { return false; } };
  const s = document.createElement('script');
  s.async = true; s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js'; s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
  window.googletag = window.googletag || { cmd: [] };
  const root = '/' + cfg.network + '/' + (cfg.prefix || 'mesaimutfak') + '/';
  googletag.cmd.push(() => {
    const pa = googletag.pubads();
    slots.forEach(el => {
      if (el.classList.contains('ad-off')) return;
      const slot = googletag.defineSlot(root + el.dataset.unit, sizesFor(el), 'ad-' + el.dataset.ad);
      if (slot) slot.addService(pa);
    });
    if (cfg.interstitial) {
      const it = googletag.defineOutOfPageSlot(root + 'interstitial', googletag.enums.OutOfPageFormat.INTERSTITIAL);
      if (it) it.addService(pa);
    }
    pa.setTargeting('sayfa', html.dataset.pageType || 'diger');
    if (html.dataset.cat) pa.setTargeting('kategori', html.dataset.cat);
    if (html.dataset.slug) pa.setTargeting('tarif', html.dataset.slug);
    pa.setTargeting('cihaz', tier());
    pa.setPrivacySettings({ nonPersonalizedAds: !consent() });
    pa.enableSingleRequest();
    pa.enableLazyLoad({ fetchMarginPercent: 150, renderMarginPercent: 50, mobileScaling: 2 });
    pa.addEventListener('slotRenderEnded', ev => {
      const el = document.getElementById(ev.slot.getSlotElementId());
      if (el && el.parentElement) el.parentElement.classList.toggle('ad-empty', ev.isEmpty);
    });
    googletag.enableServices();
    slots.forEach(el => { if (!el.classList.contains('ad-off')) googletag.display('ad-' + el.dataset.ad); });
  });
  document.addEventListener('mm-consent', e => {
    googletag.cmd.push(() => { googletag.pubads().setPrivacySettings({ nonPersonalizedAds: e.detail !== 'yes' }); });
  });

  /* ---------- önizleme: etiketli kutular ---------- */
  function previewMode() {
    slots.forEach(el => {
      if (el.classList.contains('ad-off')) return;
      const sz = sizesFor(el), [w, h] = sz[0];
      const box = el.querySelector('.ad-slot');
      box.innerHTML = '<div class="ad-ph" style="width:' + w + 'px;height:' + h + 'px"><b>' + w + '×' + h + '</b><span>' + el.dataset.unit + '</span></div>';
    });
    const bar = document.createElement('div');
    bar.className = 'ad-previewbar';
    bar.innerHTML = 'Reklam önizlemesi · ' + tier() + ' <a href="?reklam=kapat">kapat</a>';
    document.body.appendChild(bar);
    if (cfg.interstitial === false) return;
    // ilk iç link tıklamasında interstitial örneği
    let shown = false; try { shown = sessionStorage.getItem('mm-ad-int') === '1'; } catch (e) {}
    if (shown) return;
    document.addEventListener('click', ev => {
      const a = ev.target.closest('a[href]');
      if (!a || shown || a.target === '_blank' || a.origin !== location.origin || a.getAttribute('href').startsWith('#')) return;
      ev.preventDefault(); shown = true;
      try { sessionStorage.setItem('mm-ad-int', '1'); } catch (e) {}
      const m = W() < 768, w = m ? 320 : 800, h = m ? 480 : 600;
      const ov = document.createElement('div');
      ov.className = 'ad-int';
      ov.innerHTML = '<div class="ad-int-box"><span class="ad-label">Reklam</span><div class="ad-ph" style="width:' + w + 'px;height:' + h + 'px;max-width:92vw;max-height:78vh"><b>Interstitial ' + w + '×' + h + '</b><span>sayfa geçişi</span></div><button type="button" class="btn">Kapat ve devam et</button></div>';
      document.body.appendChild(ov);
      ov.querySelector('button').onclick = () => { location.href = a.href; };
    }, true);
  }

  /* ---------- video player + preroll (video.js + Google IMA) ---------- */
  function initPlayer() {
    let el = document.getElementById('mmPlayer');
    const ph = document.querySelector('.video-band .yt:not(.yt-live)');
    if (!el && preview && ph) {
      // önizleme: video yoksa örnek video + örnek preroll ile player'ı göster
      ph.classList.add('yt-live', 'player-wrap');
      ph.innerHTML = '<video-js id="mmPlayer" class="video-js vjs-fill vjs-big-play-centered" controls preload="none" playsinline data-src="' + SAMPLE_MP4 + '"></video-js>';
      el = document.getElementById('mmPlayer');
    }
    if (!el) return;
    const vast = (cfg.enabled && cfg.vastTag) ? cfg.vastTag : (preview ? SAMPLE_VAST : '');
    const V = 'https://cdn.jsdelivr.net/npm/';
    const css = [V + 'video.js@8.24.1/dist/video-js.min.css'];
    const js = [V + 'video.js@8.24.1/dist/video.min.js'];
    if (vast) {
      css.push(V + 'videojs-contrib-ads@7.5.2/dist/videojs-contrib-ads.css', V + 'videojs-ima@2.6.0/dist/videojs.ima.css');
      js.push('https://imasdk.googleapis.com/js/sdkloader/ima3.js', V + 'videojs-contrib-ads@7.5.2/dist/videojs-contrib-ads.min.js', V + 'videojs-ima@2.6.0/dist/videojs.ima.min.js');
    }
    css.forEach(h => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); });
    const next = i => {
      if (i >= js.length) return start();
      const s = document.createElement('script'); s.src = js[i];
      s.onload = () => next(i + 1);
      s.onerror = () => (i === 0 ? null : start(true)); // IMA engellenirse (reklam engelleyici) video yine oynar
      document.head.appendChild(s);
    };
    // sayfa yüklenince değil, video alanı görünür olunca yükle
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); next(0); } }, { rootMargin: '600px' });
    io.observe(el);

    function start(noAds) {
      if (!window.videojs) return;
      const src = el.dataset.src;
      const p = videojs(el, { fluid: false, language: 'tr', playbackRates: [1, 1.25, 1.5] });
      p.src({ src, type: /\.m3u8(\?|$)/.test(src) ? 'application/x-mpegURL' : 'video/mp4' });
      p.one('play', () => { if (window.mmTrack) mmTrack('video_play', { slug: html.dataset.slug || '' }); });
      if (!vast || noAds || !p.ima) return;
      const tag = vast
        .replace(/\[timestamp\]|\[correlator\]/gi, Date.now())
        .replace(/\[description_url\]/gi, encodeURIComponent(location.href.split('?')[0]))
        .replace(/\[referrer_url\]/gi, encodeURIComponent(location.href.split('?')[0]))
        .replace(/correlator=(&|$)/, 'correlator=' + Date.now() + '$1');
      p.ima({ adTagUrl: tag, showCountdown: true, locale: 'tr', debug: false });
      let inited = false;
      const initAd = () => { if (inited) return; inited = true; try { p.ima.initializeAdDisplayContainer(); } catch (e) {} };
      p.on('touchend', initAd); p.on('click', initAd); p.on('play', initAd);
      p.on('ads-ad-started', () => { if (window.mmTrack) mmTrack('preroll_start', { slug: html.dataset.slug || '' }); });
    }
  }
})();
