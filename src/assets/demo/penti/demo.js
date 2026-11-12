/* Penti × Advance rich media demoları (yalnız ?reklam-demo=penti-... ile açılır; gerçek reklam çağrılmaz, gösterim sayılmaz)
   penti-masthead · penti-interactive-masthead (300x600 skyscraper demosu EV Türkiye'de) */
(function () {
  const tip = (window.__mmDemo || new URLSearchParams(location.search).get('reklam-demo') || '').replace(/^penti-/, '');
  const B = '/assets/demo/penti/';
  const etiket = () => { const s = document.createElement('span'); s.textContent = 'REKLAM'; s.style.cssText = 'font:500 10px/1 ui-monospace,monospace;letter-spacing:.18em;opacity:.55'; return s; };
  const cerceve = (dosya, w, h) => { const f = document.createElement('iframe'); f.src = B + dosya; f.width = w; f.height = h; f.title = 'Penti reklam demosu'; f.setAttribute('scrolling', 'no'); f.style.cssText = 'border:0;display:block;background:transparent;width:' + w + 'px;height:' + h + 'px;transform-origin:0 0'; f.allowTransparency = true; f.style.colorScheme = 'light'; /* koyu temada iframe zemini beyaza dönmesin: şeffaf kalır */ return f; };
  function masthead(dosya) {
    const yer = document.querySelector('.ad-masthead'); const hedef = yer && (yer.closest('.ad-row') || yer);
    const kutu = document.createElement('div'); kutu.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 0 6px';
    const ic = document.createElement('div'); const f = cerceve(dosya, 970, 250); ic.appendChild(f); kutu.appendChild(etiket()); kutu.appendChild(ic);
    const olcek = () => { const k = Math.min(1, (window.innerWidth - 24) / 970); f.style.transform = 'scale(' + k + ')'; ic.style.cssText = 'width:' + 970 * k + 'px;height:' + 250 * k + 'px;overflow:hidden'; };
    olcek(); window.addEventListener('resize', olcek);
    if (hedef) hedef.parentNode.insertBefore(kutu, hedef); else { const h = document.querySelector('header'); (h ? h.parentNode : document.body).insertBefore(kutu, h ? h.nextSibling : document.body.firstChild); }
  }
  const calis = () => { if (tip === 'masthead') masthead('masthead.html'); else if (tip === 'interactive-masthead') masthead('interactive-masthead.html'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', calis); else calis();
})();
