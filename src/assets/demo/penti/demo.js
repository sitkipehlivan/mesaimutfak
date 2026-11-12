/* Penti × Advance rich media demoları (yalnız ?reklam-demo=penti-... ile açılır; gerçek reklam çağrılmaz, gösterim sayılmaz)
   penti-masthead · penti-interactive-masthead · penti-skyscraper */
(function () {
  const tip = (new URLSearchParams(location.search).get('reklam-demo') || '').replace(/^penti-/, '');
  const B = '/assets/demo/penti/';
  const etiket = () => { const s = document.createElement('span'); s.textContent = 'REKLAM'; s.style.cssText = 'font:500 10px/1 ui-monospace,monospace;letter-spacing:.18em;opacity:.55'; return s; };
  const cerceve = (dosya, w, h) => { const f = document.createElement('iframe'); f.src = B + dosya; f.width = w; f.height = h; f.title = 'Penti reklam demosu'; f.setAttribute('scrolling', 'no'); f.style.cssText = 'border:0;display:block;background:transparent;width:' + w + 'px;height:' + h + 'px;transform-origin:0 0'; f.allowTransparency = true; return f; };
  function masthead(dosya) {
    const yer = document.querySelector('.ad-masthead'); const hedef = yer && (yer.closest('.ad-row') || yer);
    const kutu = document.createElement('div'); kutu.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 0 6px';
    const ic = document.createElement('div'); const f = cerceve(dosya, 970, 250); ic.appendChild(f); kutu.appendChild(etiket()); kutu.appendChild(ic);
    const olcek = () => { const k = Math.min(1, (window.innerWidth - 24) / 970); f.style.transform = 'scale(' + k + ')'; ic.style.cssText = 'width:' + 970 * k + 'px;height:' + 250 * k + 'px;overflow:hidden'; };
    olcek(); window.addEventListener('resize', olcek);
    if (hedef) hedef.parentNode.insertBefore(kutu, hedef); else { const h = document.querySelector('header'); (h ? h.parentNode : document.body).insertBefore(kutu, h ? h.nextSibling : document.body.firstChild); }
  }
  function skyscraper() {
    const kutu = document.createElement('div'); kutu.style.cssText = 'position:fixed;top:140px;z-index:5;display:flex;flex-direction:column;align-items:center;gap:6px';
    kutu.appendChild(etiket()); kutu.appendChild(cerceve('skyscraper.html', 300, 600)); document.body.appendChild(kutu);
    const yerles = () => {
      const w = window.innerWidth; kutu.style.display = w < 1000 ? 'none' : 'flex';
      if (w >= 1240 + 2 * 324) { kutu.style.left = 'calc(50% + 620px + 12px)'; kutu.style.right = 'auto'; document.body.style.paddingRight = ''; }
      else { kutu.style.left = 'auto'; kutu.style.right = '12px'; document.body.style.paddingRight = w >= 1000 ? '324px' : ''; }
    };
    yerles(); window.addEventListener('resize', yerles);
  }
  const calis = () => { if (tip === 'masthead') masthead('masthead.html'); else if (tip === 'interactive-masthead') masthead('interactive-masthead.html'); else if (tip === 'skyscraper') skyscraper(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', calis); else calis();
})();
