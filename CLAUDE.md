# mesaimutfak

## Yayın kuralı (Netlify kredisi)

- `main`'e yapılan push'lar canlıya **otomatik çıkmaz**. Netlify yalnızca son commit mesajında `[deploy]` geçiyorsa derler (netlify.toml → `[context.production] ignore`).
- Her gün 12:53'te (Türkiye) `Toplu yayın (Netlify)` iş akışı, bekleyen değişiklik varsa hepsini tek yayında canlıya alır.
- Kullanıcıyla canlı çalışırken kullanıcının hemen görmesi gereken bir değişiklikte, oturumdaki **son** commit mesajının sonuna `[deploy]` ekle (bekleyen her şey birlikte çıkar). Ara commit'lere ekleme; her `[deploy]` bir yayın = 15 kredi.
- Zamanlanmış görevler, haber/görsel botları ve GitHub iş akışları `[deploy]` **eklemez**; değişiklikleri bir sonraki toplu yayında çıkar. Raporda "canlıda" yerine "bir sonraki toplu yayında (12:53) canlıya çıkacak" de.
- Hemen yayın gerekirse: `git commit --allow-empty -m "Yayın [deploy]" && git push`.
