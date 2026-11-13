// Mesai Mutfak · Geri sayımlı Alt Banner (SIMID) reklam demosu
//   /demo/geri-sayim/vast.xml    VAST 4.2: örnek marka videosu + SIMID Alt Banner (kampanya bitişine canlı sayaç)
//   /demo/geri-sayim/simid.html  SIMID kreatifi (lib/altbanner-simid.js)
// Sitede deneme: /tarif/kirmizi-mercimek-corbasi/?reklam=onizleme&vast=https://mesaimutfak.com/demo/geri-sayim/vast.xml
// Fonksiyondan sunulur, çünkü site geneli X-Frame-Options kuralı statik dosyada kreatifin oynatıcı iframe'inde açılmasını
// engeller; VAST'ın da başka alan adlarındaki oynatıcılardan (Google IMA, VAST Inspector) okunabilmesi için CORS gerekir.
import simid from '../../lib/altbanner-simid.js';

const SITE = 'https://mesaimutfak.com';
const KOK = SITE + '/demo/geri-sayim';
const DOSYA = SITE + '/assets/demo/geri-sayim';
const TIK = 'https://advancedigital.media/';
// Kreatif ayarları (AdParameters): b bitiş anı, n marka adı, m metin, c buton, a bant rengi, v vurgu, s süre bitince, u click adresi
const P = { i: 'altbanner-demo', b: '2026-12-15T23:59:59+03:00', n: 'ÖRNEK MARKA', m: 'Kış Kampanyası bitimine kalan süre', c: 'Fırsatı yakala', a: '#0b2545', v: '#ffd166', s: 'Kampanya sona erdi', u: TIK, p: DOSYA + '/p.gif' };
const c = (s) => `<![CDATA[${s}]]>`;

const vast = () => `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="4.2" xmlns="http://www.iab.com/VAST"><Ad id="altbanner-demo"><InLine>
<AdSystem version="1.0">Advance Adserver</AdSystem>
<Impression id="advance">${c(DOSYA + '/p.gif?k=altbanner-demo&e=imp')}</Impression>
<AdServingId>altbanner-demo-1</AdServingId><AdTitle>Örnek Marka · Geri sayımlı Alt Banner</AdTitle>
<Creatives><Creative id="altbanner-demo" adId="altbanner-demo"><UniversalAdId idRegistry="unknown">altbanner-demo</UniversalAdId>
<Linear skipoffset="00:00:05"><Duration>00:00:15.000</Duration>
<AdParameters>${c(JSON.stringify(P))}</AdParameters>
<MediaFiles>
<MediaFile id="mp4" delivery="progressive" type="video/mp4" width="1280" height="720" bitrate="330" scalable="true" maintainAspectRatio="true">${c(DOSYA + '/reklam.mp4')}</MediaFile>
<InteractiveCreativeFile type="text/html" apiFramework="SIMID">${c(KOK + '/simid.html')}</InteractiveCreativeFile>
</MediaFiles>
<VideoClicks><ClickThrough id="marka">${c(TIK)}</ClickThrough></VideoClicks>
</Linear></Creative></Creatives></InLine></Ad></VAST>
`;

export default async (req) => {
  const yol = new URL(req.url).pathname;
  const kaynak = req.headers.get('origin');
  // IMA, VAST'ı çerezli (credentials) istekle okur: yıldız yerine isteyen alan adı yankılanır
  const cors = kaynak
    ? { 'access-control-allow-origin': kaynak, 'access-control-allow-credentials': 'true', vary: 'Origin' }
    : { 'access-control-allow-origin': '*' };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': req.headers.get('access-control-request-headers') || '*' } });
  if (yol.endsWith('/vast.xml')) return new Response(vast(), { headers: { ...cors, 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  if (yol.endsWith('/simid.html')) return new Response(simid, { headers: { ...cors, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-robots-tag': 'noindex' } });
  return new Response('Bulunamadı', { status: 404 });
};

export const config = { path: ['/demo/geri-sayim/vast.xml', '/demo/geri-sayim/simid.html'] };
