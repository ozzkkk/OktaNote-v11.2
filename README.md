# Yakıt Takip v11.1 — Cila ve kullanım kolaylığı

Bu sürüm yeni bir "modül" değil, **var olan uygulamanın eksik kalan 6 tarafını** tamamlar:

1. **Erişilebilirlik**: Esc, odak yönetimi, ekran okuyucu adları, "İçeriğe geç"
2. **Dolumlar ve Gezi kaydı'nda arama / filtre / sıralama**
3. **Sayfalama** (ilk 50 + "Daha fazla yükle") — binlerce kayıtta hızlı açılış
4. **Çevrimdışı grafikler**: tüketim eğrisi, yakıt fiyatı eğrisi, aylık maliyet
5. **Bilgi → "Nasıl kullanılır?"** kılavuzu (15 bölüm, TR + EN)
6. **PWA cilası**: ana ekran kısayolları, kurulum ekran görüntüleri, "Paylaş → Yakıt Takip"

OCR motoru, yedekleme motoru, veri giriş uyarıları ve veri yapısı **aynen korundu**
(`OCR_VERSION 6.0.0`, ölçülen doğruluk **62/72**). Fotoğraflar cihazdan çıkmaz.

---

## 1) Erişilebilirlik (yeni `a11y.js`)

| Ölçüm | v11.0 | v11.1 |
|---|---|---|
| Erişilebilir adı olmayan form alanı | 24 | **0** |
| Adı olmayan ikon buton | 18 | **0** |
| `role="dialog"` + `aria-modal` taşıyan pencere | 0 | **17/17** |
| Esc ile kapanan pencere | yalnızca EULA | **hepsi** |
| Pencere açılınca odak | BODY'de kalıyordu | **pencereye geçiyor**, kapanınca geri dönüyor |
| Tab odağı | dışarı kaçabiliyordu | **pencere içinde döngü** |
| Bildirim (toast) | sessiz | `role="status"` + `aria-live="polite"` |
| "İçeriğe geç" bağlantısı | yok | **var** (klavyeyle ilk Tab) |

Odak, metin alanına değil pencere kabına verilir; böylece telefonda klavye kendiliğinden açılmaz.
Ayarlar'daki anahtarlara da ad verildi (`aria-label` = satır başlığı), İngilizceye çevrilir.

## 2) Arama, filtre, sıralama (yeni `browse.js`)

Dolumlar ve Gezi kaydı ekranlarının üstünde bir arama çubuğu var:

- **Arama**: istasyon, adres, not, yakıt türü, tarih, tutar, litre, km (gezilerde başlık, yer, kategori, not).
  Türkçe harfe duyarsız: `sise`, `SİŞE`, `sise` aynı sonucu verir. Birden çok kelime AND ile aranır.
- **Filtre paneli** (yanındaki düğme): başlangıç/bitiş tarihi, yakıt türü veya gezi kategorisi.
- **Sıralama**: tarih, kilometre, tutar, litre, birim fiyat (gezilerde tarih ve mesafe).
- **Filtreleri temizle** ile hepsi sıfırlanır; sayaç `68 / 137 kayıt` biçimini alır.
- Filtre sırasında **sıra numarası (#137) ve km farkı bozulmaz**: gerçek komşu kayıttan hesaplanır.
- Arama kutusuna yazarken odak ve imleç konumu korunur (220 ms gecikmeli arama).

## 3) Sayfalama

Liste ilk **50** kaydı çizer; altta **"Daha fazla yükle (N kayıt kaldı)"** düğmesi çıkar.

| 5.000 dolum | v11.0 | v11.1 |
|---|---|---|
| Liste çizimi | 853 ms | **70 ms** |
| DOM düğümü | 101.215 | **2.469** |
| İstatistik ekranı | 1.088 ms | **108 ms** |

İstatistikler ve ana sayfa tüm veriyi kullanmaya devam eder; sayfalama yalnızca listeyi etkiler.

## 4) Grafikler (yeni `charts.js`, kütüphane yok)

İstatistikler ekranına üç kart eklendi:

- **Tüketim eğrisi** — tam depo aralıkları, son 30 nokta, ortalama çizgisi kesikli.
- **Yakıt fiyatı eğrisi** — son 30 dolum, birim fiyat.
- **Aylık maliyet** — son 12 ay, yakıt + diğer gider yığılmış sütunlar.

Özellikler: tamamen **SVG** (canvas yok, kütüphane yok, ~9 KB), birim ayarlarına uyar
(L/100km, km/L, MPG; L/galon; para birimi), noktaya dokununca değer + tarih altta yazar,
klavyeyle ← → Home End gezilir, her grafikte ekran okuyucu için özet `aria-label` vardır.
Veri yoksa açıklayıcı boş durum gösterilir.

## 5) Bilgi → "Nasıl kullanılır?"

Bilgi bölümü artık **6 satır**. Kılavuz 15 bölüm: başlarken, araç, dolum, fiş okutma,
diğer okumalar, giderler, gezi, bakım hatırlatıcıları, arama/filtre, grafikler, yedekleme,
birimler/dil, internet isteyen özellikler, sorun giderme, iletişim.
Türkçe ve İngilizce, **internet gerektirmez**, "Metni kopyala" ile kopyalanabilir.

## 6) PWA cilası

- **Ana ekran kısayolları** (uygulama simgesine uzun basınca): **Dolum ekle**, **Fiş okut**, **Gezi ekle**
  (`?action=refuel|ocr|trip` — açılışta ilgili ekran gelir, adres temizlenir).
- **Kurulum ekran görüntüleri**: `screenshot-phone.png` (390×844), `screenshot-desktop.png` (1280×900).
- **"Paylaş → Yakıt Takip"**: galeriden bir fiş fotoğrafını paylaşınca uygulama doğrudan fiş okumayı açar.
  Teknik: `share_target` POST → service worker fotoğrafı **cihazdaki geçici önbelleğe** koyar → uygulama
  okur ve **hemen siler**. Fotoğraf hiçbir sunucuya gitmez.
- `meta description` + Open Graph etiketleri; manifest açıklaması güncel adlarla düzeltildi.

---

## Bu sürümde değişen dosyalar (17 + 2 belge)

| Dosya | Ne değişti |
|---|---|
| `a11y.js` | **YENİ** — erişilebilirlik katmanı (rol, ad, odak, Esc, Tab, toast, atlama bağlantısı) |
| `browse.js` | **YENİ** — arama/filtre/sıralama/sayfalama |
| `charts.js` | **YENİ** — SVG grafikler |
| `screenshot-phone.png` | **YENİ** — kurulum ekran görüntüsü |
| `screenshot-desktop.png` | **YENİ** — kurulum ekran görüntüsü |
| `index.html` | Yeni bölümler ve betikler, meta etiketleri, kısayol/paylaşım açılışı, alan adları |
| `sw.js` | `CACHE_VERSION 11.1.0`, kabuk 28 → **33 dosya**, paylaşım hedefi (**en son yükleyin**) |
| `manifest.webmanifest` | Kısayollar, ekran görüntüleri, `share_target`, açıklama |
| `legal.js` | "Nasıl kullanılır?" (TR/EN, 15 bölüm) + 11.1.0 günlüğü |
| `settings-ui.js` | Bilgi'ye kılavuz satırı, anahtarlara `aria-label`, sürüm rozeti v11.1 |
| `settings.js` | `APP_VERSION 11.1.0` |
| `i18n.js` | v11.1 EN karşılıkları + 7 yeni desen |
| `ocr.js` | `consumeShared()` — paylaşılan fişi okur ve geçici kopyayı siler (tanıma mantığı aynı) |
| `pwa.js` | Bildirim düğmesine ad/aria-hidden |
| `tailwind.css` | 340 → **347 sınıf** (7 yeni, hiçbiri kaybolmadı) |
| `contact.js`, `weather.js` | Yalnızca sürüm başlığı |
| `README.md`, `KURULUM.txt` | Bu belgeler |

`icons.css` ve `fa-solid-subset.woff2` **değişmedi**: gereken ikonlar zaten alt kümede vardı.
`OCR_VERSION 6.0.0` korundu → **5,6 MB motor yeniden inmez.**

---

## Test sonuçları

- **1523 / 1523** test geçti — **35 paket**, 0 hata.
  - Yeni: `test_v111_cila.js` **64/64** (erişilebilirlik, Esc/odak/Tab, arama-filtre-sıralama-sayfalama,
    grafikler + birim değişimi + boş durum, kılavuz, İngilizce, manifest/meta)
  - Yeni: `test_v111_pwa_paylas.js` **21/21** (önbellek, 3 kısayol, POST → geçici önbellek → OCR → silme,
    çevrimdışı açılış)
- **OCR doğruluğu: 62/72 (%86)** — değişmedi.
- İngilizce taraması: yeni ekranlarda çevrilmemiş metin ve öznitelik **yok**.
- Görsel denetim: 390×844 ve 1280×900, taşma yok, sayfa hatası yok.

## Eski depolar için yönlendirme (ayrı paket)

`yakit-eski-depo-yonlendirme.zip` içindeki `index.html` + `sw.js`, `ozzkkk/yakit` ve
`ozzkkk/yakit-takip` depolarına yüklenir. Eski adres artık "Bu uygulama taşındı" sayfası gösterir ve
güncel adrese yönlendirir; kapatma service worker'ı eski önbelleği temizler. **Verileri silmez.**

## Kurulum

`KURULUM.txt` dosyasına bakın. Kısaca: güncelleme ZIP'indeki dosyaları GitHub'a yükleyin,
**`sw.js` en son** olsun. Verileriniz, dil seçiminiz ve OCR önbelleği silinmez.
