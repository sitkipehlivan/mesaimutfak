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

- `cats`: ilki ana kategori olur. Ek olarak `hizli`, `vegan`, `glutensiz` eklenebilir.
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
