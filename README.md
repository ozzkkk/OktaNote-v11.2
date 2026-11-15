# Yakıt Takip v11.2 — Kameradan fiş çekme

Bu sürüm tek bir isteğe odaklanır: **fiş taramada galeriden seçmenin yanına
doğrudan kameradan çekme** eklemek.

1. **Fiş tarama**: "Fotoğraf Seç / Çek" tek düğmesi ikiye ayrıldı —
   **Kameradan çek** (arka kamerayı doğrudan açar) ve **Galeriden seç**.
2. **Dolum formu → Resimler**: galeri ("Ekle") düğmesinin yanına **Kamera** düğmesi eklendi.
3. **Masaüstünde sade görünüm**: dokunmatik olmayan cihazlarda kamera düğmesi gizlenir,
   galeri tek ana düğme olarak kalır.
4. **İzin ipucu**: kamera açılmazsa tarayıcı izinlerini kontrol etmeniz için kısa açıklama.

v11.1'in tamamı (arama/filtre/sıralama, sayfalama, grafikler, kılavuz, erişilebilirlik,
PWA kısayolları ve "Paylaş → Yakıt Takip") aynen korunur.
OCR motoru, yedekleme motoru ve veri yapısı **değişmedi**
(`OCR_VERSION 6.0.0`, ölçülen doğruluk **62/72**). Fotoğraflar cihazdan çıkmaz.

---

## Nasıl çalışır?

- Kamera düğmesi gizli bir `<input type="file" accept="image/*" capture="environment">`
  açar. `capture="environment"` Android ve iOS'ta **arka kamerayı** doğrudan başlatır;
  çekilen fotoğraf eskisiyle **aynı OCR akışına** girer (`handleFile`).
- Galeri düğmesi eski `#ocr-file-input`'tir; davranışı değişmedi.
- "Başka fotoğraf" düğmesi artık **her iki girişi de** sıfırlar.
- Dolum formundaki kamera girişi de aynı `handleRefuelPhotos` işleyicisini kullanır;
  galeri tarafında çoklu seçim korunur.
- Kamera varlığı `navigator.maxTouchPoints`, `pointer: coarse` ve userAgent ile
  anlaşılır (`YakitOCR.cameraLikely()`); masaüstünde kamera düğmesi ve ipucu gizlenir.
- Yeni ağ isteği, CDN veya izin istemi **yok**: her şey cihazda, çevrimdışı çalışır.
  Kamera izini tarayıcı ilk çekimde bir kez sorar.

## Değişen dosyalar (12 + 2 belge)

| Dosya | Değişiklik |
|---|---|
| `index.html` | Fiş tarama: kamera + galeri düğmeleri, izin ipucu; dolum: Kamera düğmesi |
| `ocr.js` | Kamera girişi bağlandı, `cameraLikely()`/`setupPickButtons()`, retry iki girişi sıfırlar |
| `i18n.js` | 5 yeni TR→EN anahtar (Kameradan çek, Galeriden seç, Kamera, Galeri, ipucu) |
| `legal.js` | CHANGELOG 11.2.0; kılavuz "Fiş okutma" TR+EN güncellendi |
| `settings.js` | `APP_VERSION 11.2.0` |
| `sw.js` | `CACHE_VERSION 11.2.0` (APP_SHELL listesi aynı, `OCR_VERSION 6.0.0` korundu) |
| `a11y.js`, `browse.js`, `charts.js`, `contact.js`, `settings-ui.js`, `weather.js` | Yalnızca sürüm başlığı (v11.2) |
| `README.md`, `KURULUM.txt` | Bu belgeler |

Yeni dosya yok; PNG'ler ve manifest değişmedi. **sw.js her zaman EN SON yüklenir.**

## Testler

- Tam regresyon: **1559/1559 kontrol, 36 paket, 0 hata** (v11.1'in 35 paketi + yeni kamera paketi).
- Yeni `test_v112_kamera.js`: **36 kontrol** — capture özniteliği, telefon/masaüstü
  görünürlüğü, kamera dosyasının OCR'dan geçmesi (352,29 ₺ okundu), retry sıfırlama,
  dolum fotoğrafı ekleme, TR/EN, taşma ve dokunma hedefi (≥44 px), sürümler.
- OCR test kümesi: **62/72 alan (%86)** — değişmedi.
- Veri, dil ve OCR önbelleği güncellemede korunur (`yakit_takip_data_v1` aynen).

## Güncelleme

`KURULUM.txt`'e bakın. Kısaca: ZIP'teki 12 dosyayı depoya yükleyin (sw.js en son),
ardından uygulamada Rapor oluştur → "Güncellemeleri denetle" ile yeni sürümü alın.
