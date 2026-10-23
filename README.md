# mesaimutfak.com

Pratik yemek tarifleri sitesi. [Eleventy](https://www.11ty.dev) ile derlenir, Netlify'da yayınlanır. `main` dalına yapılan her push otomatik olarak yayına çıkar.

## Editör paneli

Editörler **https://mesaimutfak.com/admin** adresinden GitHub hesaplarıyla giriş yapar.

- **Tarifler:** yeni tarif ekleme, fotoğraf yükleme, malzemeler, adımlar, püf noktaları, YouTube videosu ve bölümleri.
- **Site ayarları → Ana sayfa vitrini:** haftanın tarifi, ana sayfaya özel görsel, en çok bakılan 4 tarif.
- **Site ayarları → Genel bilgiler:** site açıklaması, YouTube kanal adresi.

Kaydet'e basıldıktan sonra site 1-2 dakika içinde otomatik güncellenir.

### Yeni editör eklemek

1. Editör ücretsiz bir GitHub hesabı açar.
2. Repo sahibi GitHub'da **Settings → Collaborators → Add people** ile editörü davet eder.
3. Editör daveti kabul eder ve /admin adresinden giriş yapar.

## Arama, alışveriş listesi ve sipariş butonları

- **Arama** (`/ara/`): başlık, kategori ve malzemelerde arar, Türkçe karakter duyarsızdır. Dizin her derlemede `/arama-dizini.json` olarak üretilir.
- **Eksik malzemeler**: tarif sayfasında evde olanlar işaretlenir, kalanlar kopyalanabilir, WhatsApp'ta paylaşılabilir ya da **Alışveriş listem** (`/listem/`) sayfasında toplanır (yalnızca kullanıcının tarayıcısında).
- **Sipariş butonları**: Panel → Site ayarları → Genel bilgiler → *Sipariş butonları*. Anlaşma yapılınca partnerin verdiği takip linki buraya yazılır; kapatmak için "Görünsün" işaretini kaldır.
- **Ölçüm**: Panelde *Google Analytics ölçüm kimliği* doldurulunca çerez onayı veren ziyaretçiler ölçülür. Olaylar: `search`, `shopping_list_copy`, `shopping_list_share`, `shopping_list_add`, `partner_click` (partner, tarif ve ürün sayısıyla).

## Yapı

```
src/
  tarifler/*.md          her tarif bir dosya (malzemeler, adımlar, video, görsel)
  _data/home.json        ana sayfa vitrini: haftanın tarifi ve en çok bakılanlar
  _data/categories.json  kategoriler
  _data/moods.json       "Bugün ne pişirsem?" aracındaki ruh halleri
  img/tarifler/          tarif fotoğrafları
  assets/                stil ve script
```

Sayfalar: ana sayfa, `/yeni-tarifler/`, `/tarif/<dosya-adı>/`, `/kategori/<anahtar>/`, `/tarifler/`, `/bugun-ne-pisirsem/`.

## Yeni tarif eklemek

`src/tarifler/` içindeki bir dosyayı kopyala, adını değiştir (ör. `firinda-levrek.md`, adres `/tarif/firinda-levrek/` olur) ve alanları doldur:

- `cats`: ilki ana kategori olur. Ek olarak `hizli`, `vegan`, `glutensiz`, `saglikli` (Sağlıklı Tatlılar) eklenebilir.
- `lvl`: `Kolay`, `Orta` ya da `Zor`
- `moods`: `yorgun`, `soguk`, `hafif`, `tatli`, `misafir`, `keyif` (öneri aracı bunları kullanır)
- `ingredients`: `[miktar, birim, malzeme]`. Miktar sayı olmalı (porsiyon ayarı bunu çarpar), miktarsız malzemeler için `null`.

## Görsel değiştirmek

1. Fotoğrafı `src/img/tarifler/` klasörüne koy (ör. `firinda-karniyarik.jpg`, 1600 px genişlik yeterli).
2. Tarif dosyasında `image: /img/tarifler/firinda-karniyarik.jpg` ve `imageAlt: ...` satırlarını doldur.

Görsel yoksa sitede illüstrasyon görünür. Ana sayfanın büyük görseli için `src/_data/home.json` içinde `hero.heroImage` alanına yol yazılır; boşsa haftanın tarifinin kendi görseli kullanılır.

## Video eklemek

YouTube'a yüklenen videonun ID'sini (`youtube.com/watch?v=` sonrasındaki kısım) tarif dosyasındaki `youtube:` alanına yaz. Detay sayfasındaki video alanı otomatik olarak gerçek videoya döner. `chapters` alanı YouTube bölüm listesiyle aynı tutulabilir. Videolar ana sayfada değil, tarif detay sayfalarında gösterilir.

## Yerelde çalıştırmak

```
npm install
npm start      # http://localhost:8080
```

## Reklam (Google Ad Manager)

Panel → Site ayarları → Genel bilgiler → **Reklam**: ağ kodunu gir, "Reklamlar açık"ı işaretle. Kapalıyken sitede reklam alanı görünmez.
Yerleşimi görmek için herhangi bir sayfaya `?reklam=onizleme` ekle (oturum boyunca açık kalır, `?reklam=kapat` ile kapanır).

Ad Manager'da `mesaimutfak` klasörü altında açılacak reklam birimleri:

| Birim | Masaüstü (≥1000px) | Tablet | Mobil (<768px) | Nerede |
|---|---|---|---|---|
| `masthead` | 970x250, 970x90, 728x90 | 728x90 | 320x100 | Tüm sayfalar, menünün altı |
| `mpu_atf` | 300x250 | 300x250 | 300x250 | Ana sayfa: haftanın tarifi yanı/altı · Tarif: malzemelerin altı (mobilde üstü) |
| `mpu_incontent` | 300x250 | 300x250 | 300x250 | Tarif: adımlardan sonra · Kategori: 6. karttan sonra |
| `rail_left`, `rail_right` | 160x600 | – | – | Tüm sayfalar, ekran ≥1600px |
| `anchor_mobile` | – | – | 320x50 | Mobil, ekranın altında sabit (kapatılabilir) |
| `interstitial` | Web interstitial | | 320x480 | Sayfa geçişleri (Google'ın kendi formatı) |

Hedefleme anahtarları: `sayfa` (home/tarif/kategori/diger), `kategori`, `tarif`, `cihaz`.
Çerez onayı yoksa kişiselleştirilmemiş reklam istenir. ads.txt satırları panelden girilir, `/ads.txt` otomatik oluşur.

### Video ve preroll
Tarife **Video dosyası linki** (MP4 ya da HLS .m3u8) girilirse YouTube yerine kendi player'ımız (video.js + Google IMA) açılır; **Preroll VAST etiketi** doluysa video başında reklam oynar. Reklam engelleyicide video yine oynar. YouTube ID'si olan tarifler eskisi gibi YouTube'dan oynar.

## Instagram otomatik paylaşım

1. **Panel → Instagram takvimi**: tarif + Türkiye saatiyle yayın zamanı seç (ör. `2026-10-26 18:30`). Sadece fotoğrafı olan tarifler paylaşılabilir.
2. Kayıt edilince GitHub Action (`.github/workflows/instagram-gorselleri.yml`) carousel görsellerini üretip `src/img/ig/<tarif>/` altına ekler (birkaç dakika).
3. Netlify zamanlanmış fonksiyonu `ig-publish` her 15 dakikada `/instagram-takvim.json`'u okur, saati gelen postu Instagram'a carousel olarak atar. Saati 12 saatten fazla geçmiş postlar atlanır; aynı post iki kez atılmaz.
4. Durum: `/.netlify/functions/ig-status` (yayınlananlar, sıradakiler, hatalar).

Netlify ortam değişkenleri: `IG_USER_ID`, `IG_ACCESS_TOKEN` (gizli), isteğe bağlı `IG_API_HOST` (`graph.instagram.com` varsayılan; Facebook sayfası üzerinden bağlanırsa `graph.facebook.com`), `IG_API_VERSION` (varsayılan `v23.0`), `IG_PAUSED=1` (duraklat). Instagram ile giriş anahtarı haftada bir otomatik tazelenir.

Yerelde görsel üretmek: `npm i --no-save playwright js-yaml && npx playwright install chromium && node scripts/ig/render.mjs`.
