# Oktanote v11.3 — marka değişikliği

Bu sürüm uygulamanın adını **Oktanote** yapar ve kod içindeki üçüncü taraf ürün
atıflarını temizler. Özellik tarafında v11.2 (kameradan fiş çekme) aynen korunur.

## Neler değişti?

1. **Görünen ad**: sekme başlığı, üst bar, yan menü, Hakkında/Bilgi satırı,
   yasal metinler, iletişim formu ve yedek paylaşımı artık **Oktanote**.
2. **PWA / manifest**: `name`, `short_name`, `application-name`,
   `apple-mobile-web-app-title`, Open Graph başlığı ve manifest açıklaması Oktanote.
   Ana ekrana eklenen uygulamanın adı güncellemeden sonra Oktanote olur.
3. **Yedekler**: yeni yedek dosyası adı `oktanote-yedek-…json`.
   Yedek **formatı değişmedi**; eski `yakit-takip-backup` dosyaları aynen içe aktarılır.
4. **Temizlik**: `settings-ui.js` ve diğer kod yorumlarındaki üçüncü taraf ürün atıfları kaldırıldı.
5. **Sürüm**: `APP_VERSION 11.3.0`, `CACHE_VERSION 11.3.0`.
   `OCR_VERSION 6.0.0` korundu; 5,6 MB motor yeniden inmez.

## Korunanlar (önemli)

- Veri anahtarı: `yakit_takip_data_v1`
- Fotoğraf veritabanı: `yakit_takip_photos`
- Yedek format kimliği: `yakit-takip-backup`
- Service Worker önbellek adları: `yakit-takip-shell-*`, `yakit-takip-ocr-*`,
  `yakit-takip-share` (OCR ve paylaşım önbelleği bozulmaz)
- JS API adları: `window.YakitSettings`, `YakitOCR`, `YakitPWA` vb.
- Simgeler, kısayollar, `share_target`, `id: "./"`, `start_url`, `scope`
- Kamera + galeri fiş tarama, çevrimdışı OCR, grafikler, arama/filtre, kılavuz

> Not: Teknik anahtarların eski adla kalması bilinçlidir; değiştirilirse mevcut
> kullanıcı verisi, yedek uyumluluğu veya indirilmiş OCR dosyaları kaybolabilirdi.

## Değişen dosyalar (17 + 2 belge = 19)

`index.html`, `manifest.webmanifest`, `i18n.js`, `legal.js`, `contact.js`,
`settings.js`, `settings-ui.js`, `ocr.js`, `pwa.js`, `a11y.js`, `browse.js`,
`charts.js`, `guards.js`, `maintenance.js`, `weather.js`, `pwa.css`, `sw.js`
ve belgeler `README.md`, `KURULUM.txt`.

Yeni dosya yok; PNG/manifest görselleri değişmedi. **sw.js her zaman EN SON yüklenir.**

## Testler

- Tam regresyon: **1605/1605 kontrol, 37 paket, 0 hata** (v11.2'nin 36 paketi + yeni marka paketi).
- OCR test kümesi: **62/72 alan (%86)** — değişmedi.
- Veri, dil ve OCR önbelleği güncellemede korunur.

## Kurulum

`KURULUM.txt`'e bakın. Mevcut site adresi/depo değişmez. Güncellemeden sonra
ana ekran kısayolunun adı hâlâ eski görünürse kısayolu kaldırıp yeniden ekleyin
(aynı tarayıcı/site profilinde veriler silinmez).

> Oktanote adı için marka tescili bu paketin kapsamında değildir; ticari kullanım
> öncesi TÜRKPATENT / WIPO / EUIPO / USPTO araştırması önerilir.
