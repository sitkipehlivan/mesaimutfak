/* Mesai Mutfak · Haftalık menü: sitedeki tariflerden akşam planı + birleşik alışveriş listesi. Tamamen tarayıcıda çalışır. */
(function () {
  var kok = document.getElementById('hm'); if (!kok) return;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('hmForm'), sonuc = $('hmSonuc');
  var KEY = 'mm-menu', veri = null, durum = null;
  var GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  var TUR = { et: 'Kırmızı et', tavuk: 'Tavuk', balik: 'Balık', bakliyat: 'Bakliyat', sebze: 'Sebze' };
  var low = function (s) { return String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var oku = function () { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  var yaz = function () { try { localStorage.setItem(KEY, JSON.stringify(durum)); } catch (e) {} };
  var izle = function (ad, p) { try { window.mmTrack && mmTrack(ad, p || {}); } catch (e) {} };

  /* ---------- ayarlar ---------- */
  var kisi = 2;
  form.addEventListener('click', function (e) { var b = e.target.closest('[data-kisi]'); if (!b) return; kisi = Math.max(1, Math.min(10, kisi + Number(b.dataset.kisi))); $('hmKisi').textContent = kisi; });
  function ayarAl() {
    var v = function (n) { var x = form.querySelector('input[name="' + n + '"]:checked'); return x ? x.value : ''; };
    return { kisi: kisi, gun: Number(v('gun')) || 5, sure: Number(v('sure')) || 0, diyet: v('diyet'), sevme: $('hmSevme').value.trim(), yan: $('hmYan').checked };
  }
  function ayarKoy(a) {
    kisi = a.kisi || 2; $('hmKisi').textContent = kisi;
    [['gun', a.gun], ['sure', a.sure], ['diyet', a.diyet]].forEach(function (p) { var x = form.querySelector('input[name="' + p[0] + '"][value="' + p[1] + '"]'); if (x) x.checked = true; });
    $('hmSevme').value = a.sevme || ''; $('hmYan').checked = !!a.yan;
  }

  /* ---------- seçim ---------- */
  function rastgele() { return Math.random(); }
  var TEMEL = /^(su|tuz|karabiber|pul biber|kırmızı toz biber|toz biber|kimyon|kekik|kuru nane|nane, kuru|sumak|tarçın|yenibahar|defne|zerdeçal|köri|paprika|baharat|sıvı yağ|zeytinyağı|ayçiçek yağı|yağ|tereyağı|toz şeker|şeker|un|domates salçası|biber salçası|salça|sirke|nişasta|kabartma tozu|karbonat|maya|kuru maya|bal|limon suyu|et suyu|tavuk suyu|sebze suyu|bulyon)(?![a-zçğıöşü])/;
  var SIFAT = /^(olgun|eritilmiş|ılık|soğuk|sıcak|oda sıcaklığında|orta boy|büyük boy|küçük boy|orta|büyük|küçük|iri|minik|rendelenmiş|doğranmış|ince doğranmış|dilimlenmiş|kıyılmış|taze çekilmiş|dövülmüş) /;
  function ad(n) { var s = low(n).replace(/\(.*?\)/g, '').split(',')[0].replace(/\s+/g, ' ').trim(), o; do { o = s; s = s.replace(SIFAT, ''); } while (s !== o); return s; }
  var BAHARAT = /(kimyon|masala|köri|zerdeçal|toz biber|pul biber|isot|kuru acı biber|tarçın|yenibahar|karanfil|muskat|çörek otu|kekik|sumak|baharat|kırmızı biber tozu|toz kırmızı biber|vanilya|vanilin|maya|kabartma tozu|karbonat|sirke)/;
  function sevmeListesi(a) { return low(a.sevme).split(/[,;\n]+| ve /).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 2; }); }
  function uygun(r, a, rol) {
    if (r.r !== rol) return false;
    if (a.sure && r.m > a.sure) return false;
    if (a.diyet === 'etsiz' && !r.e) return false;
    if (a.diyet && a.diyet !== 'etsiz' && r.c.indexOf(a.diyet) < 0) return false;
    var sv = sevmeListesi(a); if (!sv.length) return true;
    var metin = low(r.t + ' ' + r.g.map(function (x) { return x[2]; }).join(' '));
    return !sv.some(function (w) { return metin.indexOf(w.slice(0, Math.max(4, w.length - 2))) >= 0; });
  }
  var mevsim = function () { var m = new Date().getMonth(); return m >= 4 && m <= 8 ? 'yaz-yemekleri' : 'kis-yemekleri'; };
  var tazeAdlar = function (r) { return r.g.map(function (x) { return ad(x[2]); }).filter(function (n) { return n && !TEMEL.test(n); }); };
  function puan(r, secilen, i) {
    var p = rastgele() * 3, ms = mevsim(), ters = ms === 'yaz-yemekleri' ? 'kis-yemekleri' : 'yaz-yemekleri';
    if (r.c.indexOf(ms) >= 0) p += 0.8; if (r.c.indexOf(ters) >= 0) p -= 0.8;
    var onc = secilen[i - 1], son = secilen[i + 1];
    if (onc && onc.k === r.k) p -= 3; if (son && son.k === r.k) p -= 3;
    var ayni = secilen.filter(function (x, j) { return x && j !== i && x.k === r.k; }).length; p -= Math.max(0, ayni - 1) * 1.5;
    // ortak taze malzeme: aynı hafta içinde kalan malzeme boşa gitmesin
    var bizim = tazeAdlar(r), ortak = 0;
    secilen.forEach(function (x, j) { if (x && j !== i) tazeAdlar(x).forEach(function (n) { if (bizim.indexOf(n) >= 0) ortak++; }); });
    p += Math.min(1.2, ortak * 0.2);
    return p;
  }
  function sec(havuz, secilen, i, haric) {
    var en = null, ep = -1e9;
    havuz.forEach(function (r) { if (haric[r.s]) return; var p = puan(r, secilen, i); if (p > ep) { ep = p; en = r; } });
    return en;
  }
  function yanSec(a, plan, i, haric) {
    var istenen = mevsim() === 'kis-yemekleri' ? (i % 2 ? 'salata' : 'corba') : (i % 2 ? 'corba' : 'salata');
    var havuz = veri.filter(function (r) { return uygun(r, a, 'yan') && !haric[r.s]; });
    var tur = havuz.filter(function (r) { return r.c.indexOf(istenen) >= 0; }); if (!tur.length) tur = havuz;
    if (!tur.length) return null;
    return tur[Math.floor(rastgele() * tur.length)];
  }
  function bul(s) { for (var i = 0; i < veri.length; i++) if (veri[i].s === s) return veri[i]; return null; }
  function planla(a) {
    var havuz = veri.filter(function (r) { return uygun(r, a, 'ana'); });
    var secilen = [], haric = {}, yanH = {}, plan = [];
    for (var i = 0; i < a.gun; i++) { var r = sec(havuz, secilen, i, haric); if (!r) break; secilen[i] = r; haric[r.s] = 1; }
    secilen.forEach(function (r, i) { var y = a.yan ? yanSec(a, secilen, i, yanH) : null; if (y) yanH[y.s] = 1; plan.push({ s: r.s, y: y ? y.s : '' }); });
    return { plan: plan, havuzSayi: havuz.length };
  }

  /* ---------- alışveriş listesi ---------- */
  var REYON = [
    ['Dolap', TEMEL],
    ['Konserve ve soslar', /(konserve|sos|ketçap|mayonez|hardal|soya|nar ekşisi|tahin|zeytin\b|zeytin |turşu|hindistan cevizi sütü|krem şanti)/],
    ['Et, tavuk ve balık', /(tavuk|hindi|kıyma|kuzu|dana|kuşbaşı|biftek|antrikot|incik|sucuk|pastırma|ciğer|işkembe|kavurma|balık|levrek|somon|hamsi|palamut|çipura|karides|kalamar|midye|uskumru|^et\b|^et |eti\b)/],
    ['Süt, yumurta ve peynir', /(süt|yoğurt|peynir|kaşar|krema|yumurta|labne|lor|parmesan|mozzarella|kaymak|ayran|tulum|hellim)/],
    ['Bakliyat, tahıl ve hamur', /(pirinç|bulgur|makarna|spagetti|penne|şehriye|erişte|nohut|mercimek|kuru fasulye|barbunya|kuskus|yufka|lavaş|ekmek|galeta|irmik|yulaf|noodle|tortilla|firik|tarhana|arpa|milföy|hamur|pide|gnocchi|lazanya|fettuccine|tagliatelle)/],
    ['Sebze ve meyve', /(soğan|sarımsak|domates|biber|patates|havuç|kabak|patlıcan|ıspanak|maydanoz|dereotu|nane|limon|mantar|marul|salatalık|lahana|pırasa|kereviz|brokoli|karnabahar|bezelye|fasulye|bamya|enginar|roka|zencefil|elma|avokado|mısır|fesleğen|kişniş|semizotu|tere|turp|pancar|nar|portakal|kabağı|muz|yeşillik|taze|bakla|börülce|pazı|kuşkonmaz|kestane)/]
  ];
  function reyon(n) { if (BAHARAT.test(n)) return 'Dolap'; for (var i = 0; i < REYON.length; i++) if (REYON[i][1].test(n)) return REYON[i][0]; return 'Diğer'; }
  var BIRIM = { kg: ['g', 1000], g: ['g', 1], gr: ['g', 1], lt: ['ml', 1000], litre: ['ml', 1000], l: ['ml', 1000], ml: ['ml', 1] };
  var TAM = { demet: 1, paket: 1, kutu: 1, diş: 1, dal: 1, dilim: 1, yaprak: 1, sap: 1 };
  function yuvarla(m, b) {
    if (b === 'g' || b === 'ml') { if (m >= 1000) return Math.ceil(m / 100) * 100; if (m > 100) return Math.ceil(m / 50) * 50; return Math.ceil(m / 10) * 10; }
    if (TAM[b] || ((b === 'adet' || !b) && m >= 3)) return Math.ceil(m - 0.05);
    return Math.ceil(m * 2 - 0.1) / 2;
  }
  function sayi(m) { var t = Math.floor(m), k = m - t; var s = k ? (t ? t : '') + '½' : String(t); return s || '½'; }
  function miktar(m, b) {
    if (b === 'g' && m >= 1000) return (m / 1000).toLocaleString('tr', { maximumFractionDigits: 1 }) + ' kg';
    if (b === 'ml' && m >= 1000) return (m / 1000).toLocaleString('tr', { maximumFractionDigits: 1 }) + ' lt';
    if (b === 'g' || b === 'ml') return m + ' ' + b;
    return sayi(m) + (b && b !== 'adet' ? ' ' + b : '');
  }
  var ESANLAM = { 'kuru soğan': 'soğan', 'soğan, kuru': 'soğan', 'sarımsak dişi': 'sarımsak', 'yumurta sarısı': 'yumurta', 'yumurta akı': 'yumurta', 'taze soğan': 'taze soğan', 'limonun suyu': 'limon', 'yeşil soğan': 'taze soğan', 'kaşar rendesi': 'kaşar', 'rendelenmiş kaşar': 'kaşar' };
  function liste(a) {
    var top = {}, dolap = {};
    var tarifler = [];
    durum.plan.forEach(function (p) { [p.s, p.y].forEach(function (s) { var r = s && bul(s); if (r) tarifler.push(r); }); });
    tarifler.forEach(function (r) {
      var k = a.kisi / (r.p || 4);
      r.g.forEach(function (x) {
        var n = ad(x[2]); if (!n) return; n = ESANLAM[n] || n;
        if (/^(su|sıcak su|soğuk su|ılık su|kaynar su|buzlu su)$/.test(n)) return;
        if (/(^| )su$|suyu ya da su|^sıcak su|et suyu|tavuk suyu|sebze suyu/.test(n)) { dolap[n.replace(/^sıcak /, '')] = 1; return; }
        if (reyon(n) === 'Dolap') { dolap[n] = 1; return; }
        var b = low(x[1]), m = Number(x[0]) || 0, cv = BIRIM[b];
        if (cv) { b = cv[0]; m *= cv[1]; }
        var key = n + '|' + b;
        if (!top[key]) top[key] = { n: n, b: b, m: 0, yok: !m };
        top[key].m += m * k; if (!m) top[key].yok = true;
      });
    });
    // aynı malzeme farklı birimlerde: tek satırda birleştir
    var satir = {};
    Object.keys(top).forEach(function (key) { var t = top[key]; (satir[t.n] = satir[t.n] || []).push(t); });
    return {
      satirlar: Object.keys(satir).map(function (n) {
        var parca = satir[n].filter(function (t) { return t.m > 0; }).map(function (t) { return miktar(yuvarla(t.m, t.b), t.b); });
        return { n: n, r: reyon(n), mk: parca.join(' + ') };
      }),
      dolap: Object.keys(dolap).sort(function (x, y) { return x.localeCompare(y, 'tr'); }),
      tarifSayi: tarifler.length
    };
  }

  /* ---------- çizim ---------- */
  var SIRA = ['Sebze ve meyve', 'Et, tavuk ve balık', 'Süt, yumurta ve peynir', 'Bakliyat, tahıl ve hamur', 'Konserve ve soslar', 'Diğer'];
  var sonListe = null;
  function ciz() {
    var a = durum.ayar, bugun = new Date().getDay();
    $('hmOzet').textContent = durum.plan.length + ' akşam · ' + a.kisi + ' kişi';
    $('hmPlan').innerHTML = durum.plan.map(function (p, i) {
      var r = bul(p.s), y = p.y && bul(p.y); if (!r) return '';
      var gun = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : GUNLER[(bugun + i) % 7];
      return '<li class="hm-gun"><span class="hm-gad">' + gun + '</span>' +
        '<a class="hm-kart" href="/tarif/' + esc(r.s) + '/">' + (r.i ? '<img src="' + esc(r.i) + '" alt="" loading="lazy" width="96" height="96">' : '<span class="hm-noimg"></span>') +
        '<span><b>' + esc(r.t) + '</b><em class="mono">' + r.m + ' dk · ' + TUR[r.k] + '</em>' + (y ? '<small>Yanına: ' + esc(y.t) + '</small>' : '') + '</span></a>' +
        '<button type="button" class="hm-degis" data-i="' + i + '" aria-label="' + esc(r.t) + ' yerine başka bir yemek">Değiştir</button></li>';
    }).join('');
    var L = liste(a); sonListe = L;
    var tik = durum.tik || {};
    var gruplar = {}; L.satirlar.forEach(function (s) { (gruplar[s.r] = gruplar[s.r] || []).push(s); });
    $('hmGruplar').innerHTML = SIRA.filter(function (g) { return gruplar[g]; }).map(function (g) {
      return '<div class="hm-grup"><h3>' + g + '</h3><ul>' + gruplar[g].sort(function (x, y) { return x.n.localeCompare(y.n, 'tr'); }).map(function (s) {
        return '<li><label><input type="checkbox" data-n="' + esc(s.n) + '"' + (tik[s.n] ? ' checked' : '') + '><span><b>' + esc(s.n) + '</b>' + (s.mk ? ' <em>' + esc(s.mk) + '</em>' : '') + '</span></label></li>';
      }).join('') + '</ul></div>';
    }).join('');
    $('hmDolap').textContent = L.dolap.join(', ');
    $('hmKisi2').textContent = a.kisi;
    sayac();
    sonuc.hidden = false;
  }
  function eksikler() { var tik = durum.tik || {}; return sonListe.satirlar.filter(function (s) { return !tik[s.n]; }); }
  function metin() {
    var e = eksikler(), g = {}; e.forEach(function (s) { (g[s.r] = g[s.r] || []).push(s); });
    var yemek = durum.plan.map(function (p) { var r = bul(p.s); return r ? '• ' + r.t : ''; }).filter(Boolean).join('\n');
    return 'Mesai Mutfak haftalık menüm (' + durum.ayar.kisi + ' kişi):\n' + yemek + '\n\nAlışveriş listesi:' +
      SIRA.filter(function (x) { return g[x]; }).map(function (x) { return '\n\n' + x + '\n' + g[x].map(function (s) { return '• ' + s.n + (s.mk ? ' (' + s.mk + ')' : ''); }).join('\n'); }).join('') +
      '\n\nmesaimutfak.com/haftalik-menu';
  }
  function sayac() {
    var e = eksikler().length, t = sonListe.satirlar.length;
    $('hmSay').textContent = e === t ? t + ' ürün' : e + ' / ' + t + ' ürün alınacak';
    $('hmWa').href = 'https://wa.me/?text=' + encodeURIComponent(metin());
  }
  function mesaj(t) { $('hmMsg').textContent = t; clearTimeout(mesaj._t); mesaj._t = setTimeout(function () { $('hmMsg').textContent = ''; }, 4000); }
  async function kopyala(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (_) {} ta.remove(); return ok;
    }
  }

  /* ---------- olaylar ---------- */
  function yukle(cb) {
    if (veri) return cb();
    fetch('/haftalik-menu/veri.json').then(function (r) { return r.json(); }).then(function (d) { veri = d; cb(); })
      .catch(function () { mesaj('Tarifler yüklenemedi, sayfayı yenileyip tekrar dener misin?'); });
  }
  function hazirla(a) {
    var s = planla(a);
    if (!s.plan.length) { sonuc.hidden = true; alert0('Bu ayarlara uyan tarif bulamadım. Süreyi artırmayı ya da sevmediklerin listesini kısaltmayı dene.'); return; }
    durum = { ayar: a, plan: s.plan, tik: {}, at: Date.now() }; yaz(); ciz();
    if (s.plan.length < a.gun) mesaj('Bu ayarlara uyan ' + s.plan.length + ' farklı yemek bulabildim.');
    izle('haftalik_menu', { gun: a.gun, kisi: a.kisi, diyet: a.diyet || 'hepsi', yan: a.yan ? 1 : 0 });
  }
  function alert0(t) { var p = document.getElementById('hmUyari'); if (!p) { p = document.createElement('p'); p.id = 'hmUyari'; p.className = 'hm-uyari'; p.setAttribute('role', 'status'); form.appendChild(p); } p.textContent = t; }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); var u = document.getElementById('hmUyari'); if (u) u.textContent = '';
    var a = ayarAl(); yukle(function () { hazirla(a); sonuc.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  });
  $('hmYeni').addEventListener('click', function () { yukle(function () { hazirla(durum.ayar); }); });
  $('hmPlan').addEventListener('click', function (e) {
    var b = e.target.closest('.hm-degis'); if (!b) return;
    var i = Number(b.dataset.i), a = durum.ayar;
    var havuz = veri.filter(function (r) { return uygun(r, a, 'ana'); });
    var secilen = durum.plan.map(function (p) { return bul(p.s); }), haric = {};
    durum.plan.forEach(function (p) { haric[p.s] = 1; });
    (durum.gecmis = durum.gecmis || []).push(durum.plan[i].s); durum.gecmis.forEach(function (s) { haric[s] = 1; });
    var r = sec(havuz, secilen, i, haric);
    if (!r) { durum.gecmis = []; mesaj('Bu ayarlara uyan başka yemek kalmadı; baştan döndüm.'); return; }
    durum.plan[i].s = r.s;
    if (a.yan) { var yh = {}; durum.plan.forEach(function (p, j) { if (j !== i && p.y) yh[p.y] = 1; }); var y = yanSec(a, secilen, i, yh); durum.plan[i].y = y ? y.s : ''; }
    yaz(); ciz(); izle('haftalik_menu_degistir', {});
  });
  $('hmGruplar').addEventListener('change', function (e) {
    var c = e.target.closest('input[data-n]'); if (!c) return;
    durum.tik = durum.tik || {}; if (c.checked) durum.tik[c.dataset.n] = 1; else delete durum.tik[c.dataset.n]; yaz(); sayac();
  });
  $('hmKopyala').addEventListener('click', function () { kopyala(metin()).then(function (ok) { mesaj(ok ? 'Liste kopyalandı.' : 'Kopyalanamadı.'); }); izle('shopping_list_copy', { recipe: 'haftalik-menu', items: eksikler().length }); });
  $('hmWa').addEventListener('click', function () { izle('shopping_list_share', { recipe: 'haftalik-menu', method: 'whatsapp' }); });
  $('hmYazdir').addEventListener('click', function () { window.print(); });
  $('hmEkle').addEventListener('click', function () {
    var l = {}; try { l = JSON.parse(localStorage.getItem('mm-list') || '{}'); } catch (e) {}
    l['haftalik-menu'] = { title: 'Haftalık menü (' + durum.ayar.kisi + ' kişi)', url: '/haftalik-menu/', items: eksikler().map(function (s) { return s.n + (s.mk ? ' (' + s.mk + ')' : ''); }), at: Date.now() };
    try { localStorage.setItem('mm-list', JSON.stringify(l)); mesaj('Alışveriş listene eklendi: mesaimutfak.com/listem'); } catch (e) { mesaj('Bu tarayıcı listeyi saklamaya izin vermiyor.'); }
    izle('shopping_list_add', { recipe: 'haftalik-menu', items: eksikler().length });
  });
  kok.querySelectorAll('.partner').forEach(function (a) { a.addEventListener('click', function () { kopyala(metin()); izle('partner_click', { partner: a.dataset.partner, recipe: 'haftalik-menu', items: eksikler().length }); }); });

  // daha önce hazırlanan menü varsa göster
  var eski = oku();
  if (eski && eski.plan && eski.plan.length && Date.now() - (eski.at || 0) < 14 * 864e5) {
    ayarKoy(eski.ayar || {}); yukle(function () { durum = eski; if (durum.plan.every(function (p) { return bul(p.s); })) ciz(); else durum = null; });
  }
})();
