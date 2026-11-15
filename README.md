# Oktanote v11.4 — yedi başlık tek pakette

Bu sürüm kullanıcının istediği 7 kalan başlığı tek pakette toplar:

1. **Karanlık mod** — Açık / Koyu / Sistem; Ayarlar → Ana tercihler → Tema.
2. **CSV içe aktarma** — Ayarlar → Veri → CSV içe aktar. Dolum veya gider;
   sütun eşleştirme ve önizleme vardır. TR sayı/tarih biçimleri desteklenir.
3. **Bütçe + tekrarlayan giderler** — araç başına aylık yakıt bütçesi ana sayfada
   ilerleme çubuğuyla gösterilir; tekrarlayan giderler zamanı gelince otomatik eklenir.
4. **PDF/yazdırma raporu** — Rapor oluştur → “Yazdır / PDF kaydet”.
   **İstasyon fiyat karşılaştırması** kendi dolumlarınızdan hesaplanır.
5. **GPS’li gezi takibi** — Gezi kayıtları → “GPS ile gezi başlat” (ekran açıkken).
   **Bildirimler** — bakım, bütçe ve yedek hatırlatmaları; push sunucusu yoktur.
6. **Teknik** — şifreli yedek (AES-GCM + PBKDF2), Leaflet tembel yükleme,
   GitHub Actions CI (`.github/workflows/ci.yml` + `ci/check.mjs`).
7. **Hukuk/marka** — `MARKA-VE-HUKUK.md` ön araştırma raporu ve kontrol listesi.
   **Resmî tescil ve avukat incelemesi bu pakette yapılmaz**; benzer markalar
   (OKTANE, OktoNote, Okunote…) nedeniyle profesyonel araştırma önerilir.

## Korunanlar

- Veri anahtarı `yakit_takip_data_v1`, fotoğraf DB `yakit_takip_photos`
- Yedek formatı `yakit-takip-backup`; eski yedekler aynen içe aktarılır
- OCR önbelleği `OCR_VERSION 6.0.0` (5,6 MB yeniden inmez)
- Manifest `id/start_url/scope`, simgeler, kısayollar, kamera+galeri OCR akışı
- `state.budgets` ve `state.recurring` yedeklere dahildir

## Yeni dosyalar

`theme.js`, `theme.css`, `print.css`, `oktanote-ui.js`, `map-loader.js`,
`notify.js`, `budget.js`, `csv-import.js`, `stations.js`, `gps.js`,
`secure-backup.js`, `ci/check.mjs`, `.github/workflows/ci.yml`, `MARKA-VE-HUKUK.md`

## Değişen dosyalar

`index.html`, `settings.js`, `settings-ui.js`, `i18n.js`, `legal.js`,
`contact.js`, `a11y.js`, `sw.js`, `README.md`, `KURULUM.txt`

**sw.js her zaman EN SON yüklenir.**

## Testler

- Tam regresyon: **1666/1666 kontrol, 38 paket, 0 hata**
  (v11.3’ün 37 paketi + yeni özellik paketi).
- Yeni özellik testi: 61 kontrol (tema, CSV, bütçe, tekrarlayan, istasyon,
  yazdırma, GPS mock, şifreli yedek, lazy Leaflet, modal erişilebilirliği, CI, hukuk docs).
- OCR test kümesi: **62/72 alan (%86)** — değişmedi.

## Kurulum

`KURULUM.txt`’e bakın. Yeni dosyalar GitHub’da “Add file > Upload files” ile
eklenir; `.github/workflows/ci.yml` klasör yolıyla birlikte yüklenmelidir.
