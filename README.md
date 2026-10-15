# mesaimutfak.com

Pratik yemek tarifleri sitesi. Statik HTML, Netlify üzerinde yayınlanır.

## Yapı

- `index.html` — ana sayfa (stiller ve script dosyanın içinde)
- `favicon.svg` — site ikonu
- `netlify.toml` — Netlify ayarları (www → mesaimutfak.com yönlendirmesi, güvenlik başlıkları)

## Yayın

`main` dalına yapılan her push Netlify'da otomatik yayına çıkar.

## YouTube videoları

Video alanları şimdilik yer tutucu. Kanal açılıp video yüklenince `index.html` içindeki `VIDS` listesine her videonun YouTube ID'si eklenecek ve yer tutucu yerine şu embed kullanılacak:

```html
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="Video başlığı" loading="lazy" allowfullscreen></iframe>
```
