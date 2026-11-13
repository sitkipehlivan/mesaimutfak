/* Tru Niagen (Cronos Pharma) × Advance rich media demosu (yalnız ?reklam-demo=truniagen-masthead ile açılır; gerçek reklam çağrılmaz, gösterim sayılmaz) */
(function () {
  const tip = (window.__mmDemo || new URLSearchParams(location.search).get('reklam-demo') || '').replace(/^truniagen-/, '');
  if (tip !== 'masthead') return;
  const B = '/assets/demo/truniagen/';
  function masthead() {
    const yer = document.querySelector('.ad-masthead'); const hedef = yer && (yer.closest('.ad-row') || yer);
    const kutu = document.createElement('div'); kutu.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 0 6px';
    const et = document.createElement('span'); et.textContent = 'REKLAM'; et.style.cssText = 'font:500 10px/1 ui-monospace,monospace;letter-spacing:.18em;opacity:.55';
    const ic = document.createElement('div'); const f = document.createElement('iframe');
    f.src = B + 'masthead.html'; f.width = 970; f.height = 250; f.title = 'Tru Niagen reklam demosu'; f.setAttribute('scrolling', 'no'); f.allowTransparency = true;
    f.style.cssText = 'border:0;display:block;background:transparent;width:970px;height:250px;transform-origin:0 0;color-scheme:light'; /* koyu temada iframe zemini şeffaf kalır */
    ic.appendChild(f); kutu.appendChild(et); kutu.appendChild(ic);
    const olcek = () => { const k = Math.min(1, (window.innerWidth - 24) / 970); f.style.transform = 'scale(' + k + ')'; ic.style.cssText = 'width:' + 970 * k + 'px;height:' + 250 * k + 'px;overflow:hidden'; };
    olcek(); window.addEventListener('resize', olcek);
    if (hedef) hedef.parentNode.insertBefore(kutu, hedef); else { const h = document.querySelector('header'); (h ? h.parentNode : document.body).insertBefore(kutu, h ? h.nextSibling : document.body.firstChild); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', masthead); else masthead();
})();
