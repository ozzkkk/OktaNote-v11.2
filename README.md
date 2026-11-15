# Yakıt Takip v10.9 — Hava durumu şehri, İletişim ve Çıkış

Bu sürüm **üç yeni özellik** getirir. OCR motoru, fiş ayrıştırıcı, yedekleme motoru ve
veri girişi uyarıları **aynen korunur** (`OCR_VERSION 6.0.0`, ölçülen doğruluk **61/72** değişmedi).
Fotoğraflar cihazdan çıkmaz; kayıtlar yalnızca sizin cihazınızda durur.

---

## 1) Hava durumu şehri (Ayarlar → Hava durumu)

Artık hava durumu **sizin seçtiğiniz şehre** göre gelir.

- **Ayarlar → Hava durumu → Hava durumu şehri**: açılan listede **81 il** plaka sırasıyla
  durur (Adana 01 … Düzce 81). Liste **internet gerektirmez**; koordinatlar uygulamanın içindedir.
- Arama kutusu Türkçe harfe duyarsızdır: `istanbul`, `sanliurfa`, `IGDIR` yazsanız da bulur.
- Listede olmayan bir yer için **İnternette ara** düğmesi vardır (Photon/OpenStreetMap).
  Böylece yurt dışındaki bir şehir de seçilebilir.
- **Seçimi kaldır** ile şehri temizleyebilirsiniz.
- **Otomatik güncelle** anahtarı (varsayılan: açık): uygulama açılışında ve **Dolum** formu
  her açıldığında seçili şehrin havası getirilir. Kapatırsanız hiçbir istek atılmaz.

**Dolum ekranında** hava kartında artık:
- sağ üstte **Şehir seç** düğmesi (doğrudan şehir listesini açar),
- durum satırında şehir adı + durum + sıcaklık + saat (örn. `Edirne · Bulutlu, 11°C · 05:51`),
- altta küçük **şehir etiketi** ve **Konumdan Güncelle** düğmesi var.

**Önbellek:** aynı şehir için 30 dakika boyunca tekrar istek atılmaz. İnternet yoksa son
bilinen değer `(önbellek, çevrimdışı)` notuyla gösterilir; hiçbir durumda form kilitlenmez,
değerleri elle yazabilirsiniz.

**Konumdan Güncelle** artık seçili şehri **değiştirmez**; yalnızca o kayıt için bulunduğunuz
yerin havasını yazar ve `seçili şehir değişmedi` diye belirtir.

**Gizlilik:** hava durumu için yalnızca **seçilen şehrin enlem/boylamı** Open-Meteo'ya gider.
İnternet aramasında yalnızca **arama kutusuna yazdığınız metin** Photon'a gider.
Kimlik, kayıt, not veya fotoğraf hiçbir şekilde gönderilmez. Konum izni yalnızca siz
"Konumdan Güncelle"ye basarsanız istenir.

---

## 2) İletişim (Menü → İletişim)

Menüde Ayarlar'ın altında **İletişim** satırı var. Form alanları:

| Alan | Zorunlu | Kural |
|---|---|---|
| Ad | evet | en az 2 karakter |
| Soyad | evet | en az 2 karakter |
| Telefon | hayır | 7–20 karakter, rakam ve `+ ( ) -` boşluk |
| E-posta | evet | geçerli e-posta biçimi |
| Mesaj | evet | 10–4000 karakter (sayaç görünür) |
| Kuralları ve şartları okudum | **evet** | işaretlenmeden **Gönder açılmaz** |

**Nasıl gönderilir?** Formun **sunucusu yoktur**. "Gönder" düğmesi, yazdıklarınızı içeren
**hazır bir e-posta** penceresini açar (`mailto:`), alıcı **o.elver@gmail.com** olarak doludur.
Mesajı kendi e-posta uygulamanız gönderir; böylece ne yazdığınızı göndermeden önce görürsünüz.

Mail uygulaması açılmazsa **Metni kopyala** düğmesi aynı metni panoya kopyalar; kendi mail
uygulamanızda yapıştırıp gönderebilirsiniz. Kopyalama, şartlar onaylanmadan da çalışır.

**Kurallar ve Şartlar** metni uygulamanın içinde yazılıdır (14 madde, TR + EN, sürüm 1.0,
yürürlük 13.11.2026). "Metni oku" ile açılır; **Okudum, kabul ediyorum** düğmesi onay kutusunu
işaretler. Metin; uygulamanın niteliğini, verilerin nerede durduğunu, hangi özelliklerin
internet istediğini, formun nasıl çalıştığını, sorumluluk sınırını ve lisansları anlatır.

Form verisi **cihazda saklanmaz** (localStorage'a yazılmaz), pencere kapanınca kaybolur.

---

## 3) Uygulamadan çıkış (Menünün en altı)

Menünün en altında, "Varsayılan Verilere Sıfırla"nın altında kırmızı **Uygulamadan çıkış**.

Sırasıyla:
1. **Onay sorar** ("Kayıtlarınız cihazınıza kaydedilecek").
2. Tüm kayıtları ve ayarları **cihaza yazar**.
3. Çalışıyorsa **OCR motorunu durdurur** (bellek boşalır).
4. Sekmeyi **kapatmayı dener**.
5. Tarayıcı izin vermezse **veda ekranı** gösterir: "Çıkış yapıldı — verileriniz kaydedildi,
   bu sekmeyi elle kapatabilirsiniz." Ekranda **Uygulamaya geri dön** düğmesi vardır.

> Not: Tarayıcılar, kullanıcının kendi açtığı sekmeyi kodla kapatmaya güvenlik nedeniyle izin
> vermez. Bu yüzden 5. adım normaldir; veri kaybı olmaz.

---

## Bu sürümde değişen dosyalar (12)

| Dosya | Ne değişti |
|---|---|
| `weather.js` | **YENİ** — 81 il + koordinat, önbellek, Open-Meteo, Photon araması |
| `contact.js` | **YENİ** — iletişim formu, doğrulama, mailto, TR/EN şartlar metni |
| `index.html` | Menü satırları, hava kartı, 3 yeni pencere, çıkış akışı, otomatik hava |
| `settings.js` | Sürüm 10.9.0, 5 hava ayarı, `setMany()`, koordinat doğrulaması |
| `settings-ui.js` | "Hava durumu" grubu, şehir seçici, sürüm rozeti v10.9 |
| `i18n.js` | Yeni metinlerin EN karşılıkları; textarea placeholder çevirisi düzeltildi |
| `icons.css` | 12 yeni ikon (zarf, güç, şehir, kağıt uçak, sözleşme…) |
| `fa-solid-subset.woff2` | Yeni ikonların glifleri (84 → 96 glif) |
| `tailwind.css` | Yeni bölümlerin sınıfları yeniden derlendi (34 sınıf eklendi, hiçbiri kaybolmadı) |
| `LICENSES.txt` | Open-Meteo (CC BY 4.0), Photon (Apache-2.0), OSM (ODbL) bildirimleri |
| `ocr.js` | **yalnızca sürüm başlığı** — fiş okuma mantığı v10.7 ile aynı |
| `sw.js` | `CACHE_VERSION 10.9.0`, kabuk listesi 24 → 26 dosya (**en son yükleyin**) |

`OCR_VERSION 6.0.0` korundu: **5,6 MB'lık OCR motoru ve Türkçe model yeniden inmez.**

---

## Test sonuçları

- **1331 / 1331** test geçti — **31 paket**, 0 hata.
  - Yeni: `test_v109_yeni_ozellikler.js` **138/138** (81 il, önbellek, mailto, şartlar, doğrulama)
  - Yeni: `test_v109_tarayici.js` **64/64** (gerçek tarayıcıda şehir seçme, otomatik hava,
    önbellek, form onayı, çıkış akışı, İngilizce arayüz)
- **OCR doğruluğu: 61/72** — v10.7/v10.8 ile birebir aynı (12 fiş × 6 alan).
- Görsel denetim: 390×844 telefon ve 1280×900 masaüstünde **0 taşma**, yatay kaydırma yok,
  tüm yeni giriş alanları **16px**, **0 sayfa hatası**.
- İngilizce taraması: yeni ekranlarda (iletişim, şartlar, şehir seçici, çıkış) çevrilmemiş
  metin yok. İl adları özel ad olduğu için her iki dilde aynı yazılır.

## Kurulum

`KURULUM.txt` dosyasına bakın. Kısaca: güncelleme ZIP'indeki **12 dosyayı** GitHub'a yükleyin,
**`sw.js` en son** olsun. Verileriniz, dil seçiminiz ve OCR önbelleği silinmez.
