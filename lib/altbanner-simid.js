// Geri sayımlı Alt Banner · SIMID 1.1 kreatifi (oynatıcının video üstünde açtığı şeffaf iframe).
// netlify/functions/geri-sayim-demo.mjs tarafından /demo/geri-sayim/simid.html adresinden sunulur.
export default String.raw`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Advance Alt Banner (SIMID)</title>
<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}#kok{position:fixed;inset:0}</style></head>
<body><div id="kok"></div>
<script>
// Advance · Geri sayımlı Alt Banner çekirdeği (SIMID ve VPAID kreatiflerinin ortak kısmı).
// P (VAST <AdParameters> JSON): {i: kod, b: bitiş (ISO, ör. "2026-12-15T23:59:59+03:00"), l: logo adresi, n: marka adı (logo yoksa),
//   m: metin, c: buton metni, a: bant rengi, v: vurgu rengi, s: süre bitince yazı}
// kok: bandın çizileceği kutu (video alanını kaplar). tikla(ev): banda tıklanınca çağrılır.
function AdvAltBanner(kok, P, tikla) {
  var d = kok.ownerDocument, bitis = Date.parse(P.b) || 0, zam = null, acik = false;
  function el(t, c, x) { var e = d.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  if (!d.getElementById('aab-stil')) {
    var st = el('style'); st.id = 'aab-stil';
    st.textContent =
      '.aab{position:absolute;inset:0;container-type:size;pointer-events:none;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.aab-bant{position:absolute;left:0;right:0;bottom:0;height:clamp(46px,19cqh,124px);display:flex;align-items:center;gap:2.2cqw;padding:0 2.4cqw;box-sizing:border-box;pointer-events:auto;cursor:pointer;color:#fff;transform:translateY(101%);transition:transform .55s cubic-bezier(.2,.8,.2,1)}' +
      '.aab-bant.gor{transform:none}' +
      '.aab-logo{flex:0 0 auto;max-height:58%;max-width:20cqw;object-fit:contain}' +
      '.aab-ad{flex:0 0 auto;font-weight:800;letter-spacing:.04em;font-size:clamp(11px,2.3cqw,24px);line-height:1.05;max-width:20cqw}' +
      '.aab-metin{flex:1 1 auto;min-width:0;font-weight:600;font-size:clamp(11px,1.9cqw,19px);line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
      '.aab-sayac{flex:0 0 auto;display:flex;gap:.9cqw;align-items:stretch}' +
      '.aab-kutu{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:clamp(30px,6.2cqw,62px);padding:.5cqw .4cqw;border-radius:6px;background:rgba(255,255,255,.14)}' +
      '.aab-kutu b{font-size:clamp(15px,3.5cqw,36px);line-height:1;font-weight:800;font-variant-numeric:tabular-nums}' +
      '.aab-kutu i{font-style:normal;font-size:clamp(7px,1.1cqw,11px);letter-spacing:.1em;opacity:.8;margin-top:3px}' +
      '.aab-bitti{font-weight:800;font-size:clamp(12px,2.4cqw,24px)}' +
      '.aab-btn{flex:0 0 auto;border-radius:999px;padding:.9cqw 2cqw;font-weight:800;font-size:clamp(10px,1.9cqw,19px);white-space:nowrap;color:#111}' +
      '@container (max-width:520px){.aab-metin{display:none}.aab-bant{justify-content:space-between}}' +
      '@container (max-width:360px){.aab-btn{display:none}}' +
      '@media (prefers-reduced-motion:reduce){.aab-bant{transition:none}}';
    (d.head || d.documentElement).appendChild(st);
  }
  var sar = el('div', 'aab'), bant = el('div', 'aab-bant');
  bant.style.background = P.a || '#0b2545';
  bant.setAttribute('role', 'link'); bant.setAttribute('aria-label', (P.n || 'Reklam') + ': ' + (P.m || ''));
  if (P.l) { var lg = el('img', 'aab-logo'); lg.src = P.l; lg.alt = P.n || ''; bant.appendChild(lg); }
  else if (P.n) bant.appendChild(el('div', 'aab-ad', P.n));
  if (P.m) bant.appendChild(el('div', 'aab-metin', P.m));
  var sayac = el('div', 'aab-sayac'), sayi = {};
  [['g', 'GÜN'], ['s', 'SAAT'], ['d', 'DK'], ['n', 'SN']].forEach(function (k) {
    var kutu = el('div', 'aab-kutu'); sayi[k[0]] = el('b', '', '00'); kutu.appendChild(sayi[k[0]]); kutu.appendChild(el('i', '', k[1])); sayac.appendChild(kutu);
  });
  bant.appendChild(sayac);
  if (P.c) { var btn = el('div', 'aab-btn', P.c); btn.style.background = P.v || '#ffd166'; bant.appendChild(btn); }
  bant.addEventListener('click', function (ev) { ev.stopPropagation(); tikla && tikla(ev); });
  sar.appendChild(bant); kok.appendChild(sar);
  function iki(n) { return (n < 10 ? '0' : '') + n; }
  // Kalan süre izleyicinin saatinden hesaplanır; bitiş anı saat dilimiyle verildiği için her yerde aynı ana sayar
  function tik() {
    var k = Math.floor((bitis - Date.now()) / 1000);
    if (k <= 0) { clearInterval(zam); sayac.textContent = ''; sayac.appendChild(el('div', 'aab-bitti', P.s || 'Kampanya sona erdi')); return; }
    sayi.g.textContent = iki(Math.floor(k / 86400)); sayi.s.textContent = iki(Math.floor(k % 86400 / 3600));
    sayi.d.textContent = iki(Math.floor(k % 3600 / 60)); sayi.n.textContent = iki(k % 60);
  }
  return {
    goster: function () { if (acik) return; acik = true; tik(); zam = setInterval(tik, 250); requestAnimationFrame(function () { requestAnimationFrame(function () { bant.classList.add('gor'); }); }); },
    kaldir: function () { clearInterval(zam); if (sar.parentNode) sar.parentNode.removeChild(sar); }
  };
}

// SIMID 1.1 kreatifi: oynatıcının video üstünde açtığı şeffaf iframe. Videoyu oynatıcı oynatır; bu dosya yalnız
// Alt Banner'ı ve sayacı çizer. Ayarlar VAST <AdParameters> içinden gelir. Bant dışındaki tıklama oynatıcıya bırakılır.
(function(){
  var P=null,oturum=String(Date.now())+Math.random().toString(36).slice(2),no=0,bekleyen={},bant=null;
  function gonder(tip,args){var id=++no;try{window.parent.postMessage(JSON.stringify({sessionId:oturum,messageId:id,timestamp:Date.now(),type:tip,args:args||{}}),'*')}catch(e){}
    return new Promise(function(ok,red){bekleyen[id]={ok:ok,red:red}})}
  function cevap(m,tip,deger){try{window.parent.postMessage(JSON.stringify({sessionId:oturum,messageId:++no,timestamp:Date.now(),type:tip,args:{messageId:m.messageId,value:deger}}),'*')}catch(e){}}
  function not(x){gonder('SIMID:Creative:log',{message:x}).then(function(){},function(){})}
  // Sayım pikseli (CDN kaydından sayılır): g gösterim, t tıklama
  function olay(e){if(!P||!P.p)return;var i=new Image();i.src=P.p+'?k='+encodeURIComponent(P.i)+'&e='+e+'&cb='+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function tikla(ev){
    olay('t');var acildi=null;try{acildi=window.open(P.u,'_blank')}catch(e){}
    gonder('SIMID:Creative:clickThru',{x:ev.clientX||0,y:ev.clientY||0,playerHandles:!acildi,url:P.u}).then(function(){},function(){});
  }
  // Bandın dışına (videoya) tıklama: markanın VAST ClickThrough'u için oynatıcıya bırakılır
  document.getElementById('kok').addEventListener('click',function(ev){gonder('SIMID:Creative:clickThru',{x:ev.clientX||0,y:ev.clientY||0,playerHandles:true}).then(function(){},function(){})});
  function al(e){
    var m=e.data;if(typeof m==='string'){try{m=JSON.parse(m)}catch(x){return}}
    if(!m||!m.type)return;
    if(m.type==='resolve'||m.type==='reject'){var b=bekleyen[m.args&&m.args.messageId];if(b){delete bekleyen[m.args.messageId];(m.type==='resolve'?b.ok:b.red)(m.args&&m.args.value)}return}
    if(m.sessionId&&m.sessionId!==oturum)return;
    switch(m.type){
      case 'SIMID:Player:init':
        try{P=JSON.parse((m.args&&m.args.creativeData&&m.args.creativeData.adParameters)||'{}')}catch(x){P=null}
        if(!P||!P.b){cevap(m,'reject',{errorCode:1101,reason:'AdParameters eksik'});return}
        bant=AdvAltBanner(document.getElementById('kok'),P,tikla);cevap(m,'resolve',{});break;
      case 'SIMID:Player:startCreative':
        cevap(m,'resolve',{});if(bant){bant.goster();olay('g');not('Alt Banner gösterildi')}break;
      case 'SIMID:Player:adStopped':case 'SIMID:Player:adSkipped':if(bant)bant.kaldir();cevap(m,'resolve',{});break;
      case 'SIMID:Player:resize':case 'SIMID:Player:log':case 'SIMID:Player:appBackgrounding':case 'SIMID:Player:appForegrounding':cevap(m,'resolve',{});break;
      case 'SIMID:Player:fatalError':if(bant)bant.kaldir();break;
    }
  }
  window.addEventListener('message',al,false);
  gonder('createSession',{});
})();
</script></body></html>
`;
