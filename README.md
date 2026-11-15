# Yakıt Takip v11.0 — Bilgi bölümü, yasal metinler ve fiş okuma iyileştirmesi

Bu sürüm **dört iş** getirir:

1. **Bilgi** bölümü (Değişiklik Günlüğü, Hakkında, EULA, Gizlilik politikası, Açık kaynak lisansları)
2. **Kullanım Koşulları (EULA)** ve **Gizlilik Politikası** — KVKK + GDPR çerçevesinde, TR + EN
3. **Fiş okuma**: "Diğer okumalar" + satır sonu gürültü toleransı → doğruluk **61/72 → 62/72 (%86)**
4. **Ad değişiklikleri**: "Kilometre günlüğü" → **Dolumlar**, "Yolculuk kaydı" → **Gezi kaydı**

Fotoğraflar cihazdan çıkmaz; kayıtlar yalnızca sizin cihazınızda durur. Sunucu, hesap, abonelik yoktur.

---

## 1) Bilgi bölümü (Ayarlar → en altta "Bilgi")

Eski "Hakkında" grubu yerine **Bilgi** grubu geldi. Beş satır:

| Satır | İçerik |
|---|---|
| **Değişiklik Günlüğü** | 11.0.0'dan v5–v9'a kadar sürüm sürüm ne değişti (TR/EN) |
| **Yakıt Takip** · `v11.0` | Sürüm 11.0.0, geliştirici, iletişim, ölçülen OCR doğruluğu, veri yeri |
| **Kullanım koşulları (EULA)** | 18 maddelik son kullanıcı lisans sözleşmesi |
| **Gizlilik politikası** | 18 maddelik KVKK + GDPR aydınlatma metni |
| **Açık kaynak lisansları** | `LICENSES.txt` uygulama içinde okunur (Tesseract, Leaflet, Inter, Font Awesome, Open-Meteo, Photon…) |

Her metin penceresinde **Metni kopyala** ve **Kapat** düğmesi var; `Esc` ve dışına dokunma da kapatır.
Metinler uygulamanın içindedir, **internet gerekmez** (yalnızca lisans dosyası ilk açılışta
yerelden okunur ve önbelleğe alınır).

**Bilgi bölümünde puanlama/oylama satırı yoktur** (istek üzerine eklenmedi).

### Yasal metinlerin çerçevesi

- Sorumlu taraf: **"Yakıt Takip geliştiricisi"** (tüzel kişilik adı uydurulmadı), iletişim **o.elver@gmail.com**
- **KVKK**: m.10 aydınlatma, m.11 ilgili kişi hakları, hukuki sebepler, 30 gün yanıt süresi
- **GDPR**: m.6 hukuki temel, m.15–22 haklar, m.77 denetim makamına şikâyet, yurt dışı aktarım
- Açıkça yazılı olanlar: veriler **cihazda** durur, **fotoğraf dışarı çıkmaz**, çerez yok,
  hesap yok, hangi özellik hangi servise hangi veriyi gönderir (Open-Meteo: şehir koordinatı;
  Photon: arama metni; harita: karo görselleri)
- EULA'da: OCR sonuçlarının **tahmin** olduğu, tüketici haklarının saklı olduğu, yedek
  sorumluluğunun kullanıcıda olduğu, metnin **hukuki danışmanlık olmadığı**
- Sürüm **1.0**, yürürlük **15.11.2026**. İletişim formundaki "Kurallar ve Şartlar" metni
  **1.1 / 15.11.2026** oldu ve artık EULA + Gizlilik Politikası'na bağlantı veriyor.

> Bu metinler bilgilendirme amaçlıdır, hukuki danışmanlık değildir. Uygulamayı ticari bir
> tüzel kişilik adına yayımlayacaksanız bir hukukçuya gözden geçirtin.

---

## 2) Fiş okuma (OCR)

### a) "Diğer okumalar" — doğruluğu kullanıcının lehine çeviren yenilik

Motor aynı alan için birden fazla değer okuduğunda artık sessizce birini seçip diğerlerini
atmıyor. Alan satırının altında **Diğer okumalar:** çipleri çıkıyor; doğru değere **tek
dokunuşla** geçiliyor (alan anında güncellenir, bildirim gösterilir).

- Litre, birim fiyat, toplam, tarih ve saat için çalışır; en fazla **3** alternatif gösterilir.
- Alternatifler kaç okuma geçişinde görüldüğüne göre sıralanır.
- Tek geçişte okunan fişlerde de seçilmeyen ham adaylar gösterilir.
- Seçilen değer hiçbir zaman alternatif listesinde tekrarlamaz.

### b) Satır sonu gürültü toleransı (ölçülebilir doğruluk artışı)

Türk fişlerinin en güvenilir satırı `miktar LT X birim fiyat  toplam` satırıdır. OCR satırın
sonuna `—`, `"`, `...` gibi gürültü eklediğinde bu tutar eskiden **hiç aday olmuyordu**.

Artık satır sonundaki gürültü tolere ediliyor, **ama** bulunan tutar aynı satırdaki
`miktar × birim fiyat` çarpımıyla **%3 içinde** uyuşmak zorunda. Böylece `20 TL` (KDV oranı)
gibi ilgisiz sayılar toplam adayı olamaz. Miktar ya da fiyat okunamadıysa gürültülü satırdan
tutar alınmaz (eski katı davranış korunur).

**Sonuç:** W5 fişinde toplam `357,20` yerine doğru olan **352,29** okunuyor.

### c) Denenip reddedilen yaklaşımlar (bilgi için)

- Tam ayrıştırmalı 6. geçiş (PSM 4): temiz POS fişlerinde tutar uydurdu → 60/72.
- Başlık kırpma + tarih doğrulama: temiz fişlerin tarihini bozdu → 60/72.

İkisi de geri alındı. **Ölçülen doğruluk 62/72 alan (%86)** — 12 fiş × 6 alan, hiçbir alan
gerilemedi. Kalan hatalar okunaksız fotoğraflarda (W1 yalnızca toplam, U1 tarih/saat).

`OCR_VERSION 6.0.0` korundu: **5,6 MB'lık OCR motoru ve Türkçe modeli yeniden inmez.**

---

## 3) Ad değişiklikleri

| Eski ad | Yeni ad | İngilizce |
|---|---|---|
| Kilometre günlüğü | **Dolumlar** | Fill-ups |
| Yolculuk kaydı | **Gezi kaydı** | Trip log |

Menüde, sayfa başlığında, zaman çizelgesinde ve tüm metinlerde değişti. Eski Türkçe
anahtarlar çeviri sözlüğünde **takma ad** olarak duruyor; eski kayıtlarda görünen metinler
bozulmaz. Veri yapısı, kimlikler ve URL'ler değişmedi.

---

## Bu sürümde değişen dosyalar (12 + 2 belge)

| Dosya | Ne değişti |
|---|---|
| `legal.js` | **YENİ** — EULA/Gizlilik (TR+EN, 18'er madde), değişiklik günlüğü, hakkında, lisans okuyucu |
| `index.html` | `#legal-modal` (z88), `legal.js` bağlantısı, Dolumlar/Gezi kaydı adları |
| `settings-ui.js` | "Hakkında" → **Bilgi** grubu, 5 satır, sürüm rozeti v11.0 |
| `settings.js` | `APP_VERSION 11.0.0` |
| `ocr.js` | "Diğer okumalar" + satır sonu gürültü toleransı (çarpım kapılı) |
| `contact.js` | Şartlar 1.1 / 15.11.2026, EULA + Gizlilik bağlantıları |
| `i18n.js` | v11.0 EN karşılıkları (Bilgi, EULA, Gizlilik, Diğer okumalar, Dolumlar, Gezi kaydı) |
| `icons.css` | 4 yeni ikon (tokmak, terazi, kullanıcı-kalkan, dosya-kalkan) → 101 sınıf |
| `fa-solid-subset.woff2` | Yeni glifler (96 → 100 glif, 10.024 B) |
| `tailwind.css` | Yeniden derlendi: 332 → **340 sınıf**, hiçbiri kaybolmadı |
| `weather.js` | Yalnızca sürüm başlığı |
| `sw.js` | `CACHE_VERSION 11.0.0`, kabuk listesi 26 → **28 dosya** (**en son yükleyin**) |
| `README.md`, `KURULUM.txt` | Bu belgeler |

---

## Test sonuçları

- **1438 / 1438** test geçti — **33 paket**, 0 hata.
  - Yeni: `test_v110_bilgi_yasal.js` **76/76** (adlar, Bilgi grubu, 5 pencere, 18'er madde,
    KVKK/GDPR atıfları, kopyalama, z-sırası, İngilizce metinler, OCR alternatifleri)
  - Yeni: `test_v110_ocr_aday.js` **31/31** (gürültü toleransı, çarpım kapısı, alternatifler)
- **OCR doğruluğu: 62/72 (%86)** — v10.9'da 61/72 idi; gerileyen alan yok.
- Görsel denetim: 390×844 telefon ve 1280×900 masaüstünde **0 taşma**, yatay kaydırma yok,
  **0 sayfa hatası**.
- İngilizce taraması: yasal metinlerde Türkçe karakter yok (özel ad `Türkiye` hariç).

## Kurulum

`KURULUM.txt` dosyasına bakın. Kısaca: güncelleme ZIP'indeki dosyaları GitHub'a yükleyin,
**`sw.js` en son** olsun. Verileriniz, dil seçiminiz ve OCR önbelleği silinmez.
