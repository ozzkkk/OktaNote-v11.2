# Yakıt Takip v10.3 — Bakım Hatırlatıcıları

Bu sürümde **fiş tarama artık gerçek**: fotoğraf çekiyorsunuz, uygulama yazıyı telefonun
kendi işlemcisinde okuyor ve **yakıt türü, litre, birim fiyat, toplam tutar, tarih, saat** alanlarını dolum
formuna aktarıyor. v9 ayrıca **yakıt türü** ve **saat** okur. Önceki sürümlerdeki demo/sahte okuma tamamen kaldırıldı.

**Fotoğraflar hiçbir sunucuya gönderilmez.** OCR motoru (Tesseract.js + Türkçe dil modeli)
sitenizin kendi dosyaları arasındadır; ilk indirmeden sonra **internet olmadan** çalışır.

## v10.3'te yeni olanlar

### Bakım hatırlatıcıları (`maintenance.js`)
- **Türler:** Yağ / Servis, Muayene, Sigorta / Kasko, Lastik, Diğer.
- **Hedef:** tarih veya km. İkisi birden girilirse **hangisi önce gelirse** uyarır.
- **Durumlar:** Planlandı · Yaklaşıyor (≤14 gün veya ≤500 km) · Gecikti · Tamamlandı.
- **Ana ekran kartı:** yaklaşan/geciken hatırlatıcıları gösterir, “Bakım” düğmesiyle ekrana gider.
- **Bakım ekranı:** menüde ve Ayarlar → Veri altında; ekle / düzenle / sil / tamamlandı.
- **Tekrar:** “her X km” ve/veya “her X ay” girilirse Tamamlandı sonrası yeni hedef otomatik kurulur;
  boşsa hatırlatıcı kapanır.
- **Gider ilişkilendirme:** Bakım/Servis, Sigorta/Kasko veya Lastik gideri kaydedilince ilgili
  hatırlatıcıyı tamamlandı olarak işaretlemek isteyip istemediğinizi sorar.
- Veriler `state.reminders` içinde tutulur; **yedeklere dahildir**, geri yüklemede korunur.
- İnternet / push bildirimi yoktur; uygulama içi uyarı, çevrimdışı çalışır.

Test paketi: **817/817** yeşil; üç gerçek fişte OCR hâlâ **18/18** alan.

### v10.3 kurulumu (ZIP)
- `yakit-takip-v10-3-guncelleme.zip` → değişen **5 dosya** + `maintenance.js` (yeni) + README + KURULUM.txt
- `yakit-takip-v10-3-tam-paket.zip` → uygulamanın **32 dosyasının tamamı** (OCR motoru dahil)

GitHub'da **Add file → Upload files** ile ZIP'ten çıkan dosyaları yükleyin; aynı adlı dosyalar
üzerine yazılır, `maintenance.js` yeni eklenir. Kayıtlarınız tarayıcıda kaldığı için **veri kaybı olmaz**.
OCR motor önbelleği korunur (`OCR_VERSION 6.0.0`), 5,6 MB yeniden inmez.

---

## v10.2'de yeni olanlar

### Veri giriş korumaları (`guards.js`)
Kayıt **engellenmez**; uygulama yalnızca uyarır, kararı siz verirsiniz.

| Kontrol | Ne zaman uyarır | Seviye |
|---|---|---|
| **Mükerrer dolum** | Aynı araç + aynı tarih + yakın litre/tutar (veya aynı sayaç + litre) | Uyarı |
| **Sayaç gerilemesi** | Yeni km, aracın en yüksek sayacından düşük | Uyarı |
| **Basamak hatası** | 7778 yerine 77780 gibi 10× / ÷10 giriş; tek dokunuşla düzeltme önerisi | Uyarı |
| **Büyük sıçrama** | Tek dolumda 2000 km üzeri artış | Bilgi |
| **Tüketim sapması** | Tam depolar arası tüketim, geçmiş medyanın 0,5×–1,8× dışında (en az 3 geçmiş aralık, ≥50 km) | Uyarı |
| **Depo aşımı** | Litre, depo kapasitesinin 1,5 katından fazla | Bilgi |

- Uyarı ekranında **“Düzelt”** (forma döner) ve **“Yine de kaydet”** vardır.
- Yalnızca bilgi seviyesinde nokta varsa düğme **“Kaydet”** olur; tek dokunuşla devam edilir.
- Basamak hatasında **“Sayaçı … yap”** düğmesi değeri otomatik düzeltir.
- Düzenlemede kaydın kendisi karşılaştırmaya katılmaz.
- **Ayarlar → Ana tercihler → Veri giriş uyarıları** ile kapatılabilir (varsayılan açık).
- Eşikler `guards.js` içinde `LIMITS` nesnesindedir.

Test paketi: **751/751** yeşil; üç gerçek fişte OCR hâlâ **18/18** alan.

### v10.2 kurulumu (ZIP)
Bu sürüm **ZIP** ile dağıtılır:
- `yakit-takip-v10-2-guncelleme.zip` → yalnızca değişen **6 dosya** + `guards.js` (yeni) + bu README + KURULUM.txt
- `yakit-takip-v10-2-tam-paket.zip` → uygulamanın **31 dosyasının tamamı** (OCR motoru dahil)

GitHub'da **Add file → Upload files** ile ZIP'ten çıkan dosyaları yükleyin; aynı adlı dosyalar
üzerine yazılır, `guards.js` yeni eklenir. Kayıtlarınız tarayıcıda kaldığı için **veri kaybı olmaz**.
OCR motor önbelleği korunur (`OCR_VERSION 6.0.0`), 5,6 MB yeniden inmez.

---

## v10.1'de yeni olanlar

- **Geri yükleme güvenlik yedeği:** Bir yedeği geri yüklemeden önce uygulama, mevcut
  durumun otomatik olarak bir **güvenlik** yedeğini alır. Geri yükleme yanlışsa listedeki
  “güvenlik” yedeğinden önceki duruma dönebilirsiniz. Güvenlik yedeği alınamazsa geri
  yükleme hiç başlamaz. En yeni güvenlik yedeği normal budamadan korunur.
- **Yedek hata uyarısı:** Otomatik yedek başarısız olursa ana ekranda ve Ayarlar →
  Uygulama içi yedekler altında görünür uyarı çıkar; **Tekrar dene** düğmesi vardır.
- **Saat düzeltmesi:** Saat girişlerinde `step=60` ile Android seçicinin saniye
  göstermesi engellenir; değer HH:MM kalır.

Test paketi: **658/658** yeşil; üç gerçek fişte OCR hâlâ **18/18** alan.

### v10.1 kurulumu
Değişen dosyalar: `settings.js`, `settings-ui.js`, `index.html`, `sw.js`.
OCR motor önbelleği korunur (`OCR_VERSION 6.0.0`). `v10-1-kopyala-yapistir.html`
sayfasından kopyala/yapıştır ile kurulur.

---

## v10'da yeni olanlar

### Uygulama içi otomatik yedekleme (Drive yok, internet yok)
Google Drive eşitlemesinden vazgeçildi; onun yerine uygulama **kendi içinde** yedekler:

- **Otomatik:** Uygulama açılışında, son yedeğin üzerinden 24 saat geçtiyse sessizce
  bir yedek alır. Tüm kayıtlar + fotoğraflar + ayarlar dahil.
- **Saklama:** Son **7 / 14 / 30** yedek tutulur (Ayarlar'dan seçilir), eskiler silinir.
- **Elle:** Ayarlar → Uygulama içi yedekler → **Şimdi yedek al**.
- **Geri yükleme:** Listedeki yedeğin yanındaki **Geri yükle** → önce özet gösterilir,
  onaylamadan hiçbir şey değişmez. Dosya yedekleriyle aynı onay akışı.
- **Ayrı veritabanı:** Yedekler ana veriden ayrı bir IndexedDB'de tutulur;
  "Tüm verileri sıfırla" yedekleri SİLMEZ. Sıfırlasanız bile yedekten dönebilirsiniz.
- Dosya yedekleme (indir/paylaş/geri yükle) aynen duruyor.

> Not: Uygulama içi yedekler cihazda kalır. Cihaz kaybolursa/silinerse yedekler de
> gider; ara sıra "Yedeği paylaş" ile cihaz dışına kopya almak yine önerilir.

### v10 kurulumu
Yalnızca **3 dosya** değişti: `settings.js`, `settings-ui.js`, `sw.js`.
OCR motor önbelleği korunur (`OCR_VERSION 6.0.0`). `v10-kopyala-yapistir.html`
sayfasından kopyala/yapıştır ile kurulur.

---

## v9'da yeni olanlar

### A) Ayarlar tamamlandı
- **Hacim birimi** artık seçilebilir: L / gal (US) / gal (UK).
- **Tüketim birimi** ayrı seçilebilir: L/100km, km/L, MPG-US, MPG-UK.
- **Haftanın ilk günü**: Pazartesi / Pazar. Raporlar ekranındaki "Bu hafta" özeti bu güne göre hesaplanır.
- Galon seçilince dolum formu, fiyat etiketi, tank kapasitesi, hesaplayıcı ve CSV doğru birime çevrilir.
- Düzenleme ekranı birim tur atmasını doğru yapar; kayıtlar içeride hep km/L/TL saklanır.

### B) OCR kapsamı genişletildi
Yeni okunan alanlar: **yakıt türü** ve **saat**. Tarih zaten okunuyordu, korundu.
İstasyon adı, plaka, fiş numarası **bilerek eklenmedi**.

- Yakıt türü fişteki ürün adından çıkarılır: MOTORİN / DİZEL / EURODI / EXCELLIUM → Motorin (Dizel);
  BENZİN / KURŞUNSUZ 95 → Kurşunsuz 95; 97/98 → Kurşunsuz 97/98; LPG / OTOGAZ → LPG.
- Saat için küçük bir **kırpma doğrulaması** yapılır: OCR `01:09` yerine `0:09` okursa,
  tarih/saat bölgesi kırpılıp rakam whitelist'i ile yeniden okunur.

### v9 doğruluk ölçümü (3 gerçek fiş, 6 alan)

| Fiş | Yakıt türü | Litre | Fiyat | Toplam | Tarih | Saat | Süre |
|---|---|---|---|---|---|---|---|
| Net küçük (225×505) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 2,5 s |
| Total (1200×1600) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 1,4 s |
| Merzifon (389×788) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 4,7 s |
| **TOPLAM** | | | | | | | **18/18 alan** |

Test paketi: **552/552** yeşil (ayarlar, birimler, yedek, PWA, harita, OCR, gerçek tarayıcı).

### v9 kurulumu (indirme gerektirmez)
Yalnızca **5 dosya** değişti: `index.html`, `settings.js`, `settings-ui.js`, `ocr.js`, `sw.js`.
OCR motor önbelleği (`OCR_VERSION 6.0.0`) korunur; 5,6 MB yeniden inmez.

`v9-kopyala-yapistir.html` sayfasını açın, her dosyanın metnini kopyalayıp GitHub web
editöründe ilgili dosyanın üzerine yapıştırın ve **Commit changes** deyin. Sonra siteyi
bir kez yenileyin. Ayrıntılı adımlar o sayfadadır.

---

## v7'de yeni olanlar

### 1. Araç simgesi ve rengi
Her araca kendi simgesini verebilirsiniz: **Taşıtlar** → aracın yanındaki **kalem** →
yuvarlak simgeye dokunun. 16 simge (otomobil, sedan, pickup, kamyon, arazi, minibüs,
otobüs, motosiklet, bisiklet, traktör, karavan, taksi, tekne, uçak, helikopter, tren)
ve 8 renk. Seçim araç listesinde ve üst başlıkta görünür. Yeni araç eklerken de seçilebilir.

### 2. Ayarlar menüsü
Menü (☰) → **Ayarlar**. Fuelio'daki gibi gruplanmış:

- **Ana tercihler** — Birimler, para birimi, tarih biçimi, varsayılan sayfa
- **Yedekleme** — yedek al, paylaş, geri yükle, hatırlatma
- **Fiş okuma (OCR)** — motor durumu, dosyaları indir
- **Veri** — CSV, depolama, sıfırlama
- **Hakkında** — sürüm, gizlilik, lisanslar

**Birimler:** km ↔ mil, L ↔ galon (US/UK), tüketim L/100km ↔ km/L ↔ MPG-US ↔ MPG-UK.
**Para birimi:** ₺ $ € £ ₽ ₼. **Tarih:** YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, MM/DD/YYYY, D MMM YYYY.

> **Önemli:** Kayıtlarınız her zaman km, litre ve TL olarak saklanır; birim değişimi
> yalnızca **gösterimi** etkiler. Birimi değiştirip geri almak verinizi bozmaz.
> Para birimi değişimi de **kur çevirisi yapmaz** — sadece sembolü değiştirir.

### 3. Yedekleme
**Ayarlar → Yedekleme**:

- **Yedek al (dosya indir)** — Tüm araçlar, dolumlar, giderler, yolculuklar, ayarlar ve
  fotoğraflar tek `.json` dosyasında. Dosya adı `yakit-yedek-YYYYAAGG-SSDD.json`.
- **Yedeği paylaş** — Android paylaş menüsü açılır: Google Drive, WhatsApp, e-posta,
  Telegram. Desteklenmeyen tarayıcılarda indirmeye düşer.
- **Yedekten geri yükle** — Dosyayı seçin; **önce özet gösterilir** (kaç araç, dolum,
  fotoğraf). Onaylamadan hiçbir şey değişmez. "Vazgeç" güvenlidir.
- **Otomatik hatırlatma** — 30 gün yedek alınmazsa ana ekranda uyarı çıkar.

> Geri yükleme mevcut verinin **üzerine yazar**. Önce mevcut verinizin yedeğini alın.

**Bulut eşitleme hakkında:** Bu uygulama sunucusuz çalıştığı için Google Drive'a
doğrudan eşitleme yok. "Yedeği paylaş" ile Drive'a gönderip oradan geri alabilirsiniz —
veri sizde kalır, hesap kurulumu gerekmez. Doğrudan Drive eşitlemesi sonraki turda eklenebilir.

---

## Android'de GitHub'a yükleme (klasör gerekmez)

Bu paket **tek klasördür**, alt klasör yoktur. Android tarayıcısından doğrudan yükleyebilirsiniz.

1. ZIP'i telefonda açın, içindeki **30 dosyanın tamamını** bir klasöre çıkarın.
2. GitHub'ı **uygulamada değil, tarayıcıda** açın.
3. **Add file → Upload files**'a dokunun.
4. Dosya seçicide klasöre girip **tüm dosyaları seçin**.
5. **Commit changes** deyin.
6. **Settings → Pages → Deploy from a branch → main / (root) → Save**.
7. `https://KULLANICI.github.io/DEPO/` adresini açın.

> **Yükleme ~6,4 MB.** Mobil veriyle yüklemeyin, Wi-Fi kullanın. En büyük iki dosya:
> `tesseract-core-simd-lstm.wasm.js` (3,9 MB) ve `tur.traineddata.gz` (1,9 MB).
> GitHub'ın dosya başına 25 MB sınırının çok altındasınız.

### Mevcut v5 sitenizi güncelliyorsanız

Eski dosyaların üzerine bu 28 dosyayı yükleyin. Eski `index.html`, `sw.js`, `pwa.js`,
`tailwind.css` değişecek; OCR dosyaları yeni eklenecek. `sw.js` içindeki sürüm zaten
`6.0.0`'a yükseltildi, bu yüzden ziyaretçilerin tarayıcısı güncellemeyi otomatik alacak.
Yine de ilk açılışta bir kez **yenileme** yapmanız iyi olur.

### Alternatif: Netlify Drop

ZIP'i doğrudan `https://app.netlify.com/drop` adresine yükleyebilirsiniz — bu ZIP'te
dosyalar zaten kökte, yeniden paketlemeniz gerekmez. `netlify.toml`, `.gz` modelinin
sunucu tarafından açılmamasını ve WASM çekirdeğinin doğru MIME ile gitmesini sağlar.

---

## İlk kullanımda: OCR dosyalarını indirin

1. Sol üstteki **menü (☰)** düğmesine dokunun → **Rapor oluştur**.
2. Aşağıdaki **"Çevrimdışı / PWA"** kutusunda **"OCR dosyalarını indir (~5,6 MB)"**
   düğmesine dokunun.
3. Yanındaki **"OCR motoru"** satırı **"Hazır"** olana kadar bekleyin (Wi-Fi'de birkaç saniye).

Bu adımı atlarsanız da ilk fiş taramasında dosyalar otomatik iner — ama o tarama uzun
sürer ve internet gerektirir. Düğmeye basmak, sonraki tüm taramaları **anında ve
çevrimdışı** yapar.

## Fiş tarama nasıl çalışıyor

1. Sağ alttaki **siyah "+" düğmesine** dokunun → **"Yakıt Fişi Taraması"**.
2. **"Fotoğraf Seç / Çek"** düğmesine dokunun. (İsterseniz önce **"OCR motorunu şimdiden
   hazırla"** bağlantısıyla motoru arka planda yükletebilirsiniz.)
3. İlerleme çubuğu: hazırlanıyor → yükleniyor → okunuyor → ayrıştırılıyor.
   İlk tarama 10–40 saniye sürebilir (telefona göre); sonrakiler belirgin şekilde hızlıdır.
4. Sonuç ekranında 4 alan kutucuklarda gelir. Her birinin altında fişten okunan ham satır
   ve yanında durum etiketi görünür:
   - **doğrulandı** — litre × fiyat ≈ toplam tutarlı (±%3)
   - **düzeltildi** — OCR bir rakamı yanlış okumuş, çapraz kontrolle düzeltildi
   - **hesaplandı** — alan okunamadı, diğerlerinden hesaplandı
   - **onarıldı** — yıl gibi tek hane hataları düzeltildi
   - **bulunamadı** — elle girmeniz gerekir
5. **Değerleri düzeltebilirsiniz.** Kutulara yazdığınız değer her zaman OCR'ın önüne geçer.
6. **"Dolum formuna aktar"** → form açılır, alanlar dolu gelir. **Kontrol edip Kaydet'e
   siz basarsınız.** OCR tek başına asla kayıt oluşturmaz.

Alt kısımdaki **"Okunan ham metni göster/gizle"** ile motorun gördüğü tüm yazıyı
görebilirsiniz; bir alan neden bulunamadı, oradan anlarsınız.

## Doğruluk: gerçek fişlerle ölçüldü

v8, üç gerçek Türk akaryakıt fişi üzerinde test edildi (OPET/Total/Merzifon düzenleri,
225×505 ile 1200×1600 arası çözünürlük, termal ve normal baskı):

| Fiş | v7 (önce) | v8 (şimdi) | Süre |
|---|---|---|---|
| Net, küçük (225×505) | 1/4 alan | **4/4** | 4,5 s |
| Total (1200×1600) | 1/4 alan | **4/4** | 2,0 s |
| Merzifon (389×788) | 2/4 alan | **4/4** | 5,2 s |
| **TOPLAM** | **2/12** | **12/12** | |

### Neyi düzelttik

1. **Büyütme sınırı kaldırıldı.** Tesseract büyük harf için ~20–30 piksel ister.
   225 px genişliğindeki fişte yazı 6–8 px kalıyordu. Eski kod en fazla 2,5× büyütüyordu;
   artık kısa kenar 1500 piksele çıkarılıyor. **En büyük kazanç bu oldu.**
2. **"84,15 LT X 51,22" satırı okunuyor.** Türk fişleri miktar ve birim fiyatı tek satırda
   yazar; ayrı "BİRİM FİYAT" etiketi yoktur. Eski ayrıştırıcı bu deseni hiç tanımıyordu.
3. **`TOPLAM *410,00` içindeki yıldız tolere ediliyor.** Fişlerde tutar `*`, `x`, `"` gibi
   bir önekle yazılır; bu işaret satırın hiç eşleşmemesine yol açıyordu.
4. **KDV satırları dışlanıyor.** `TOPKDV *108,38` artık toplam sanılmıyor.
5. **Yıl onarımı genişletildi.** `11-02-7024` → 2024 (ilk hane de bozulabiliyor).
6. **İki geçişli oylama.** İlk okuma 4 alanı da bulur ve tutarlar uyumluysa biter.
   Aksi hâlde farklı ön işlemeyle ikinci okuma yapılır, alan alan birleştirilir.

### Yine de kontrol edin

Bu bir yardımcıdır. Sonuçlar her zaman size gösterilir, onaylamadan kayıt oluşmaz.
Zorlanan durumlar: çok silik termal fiş, el yazısı, kırışık yüzey, 15°+ eğrilik,
fişin bir kısmının kadraj dışında kalması. Böyle durumlarda kutulardan elle düzeltin.

**İpucu:** Fişi düz, kadraja tam ve iyi ışıkta çekin. Mümkünse fişi telefona
yakın tutun — küçük görüntüler artık büyütülüyor ama olmayan detay üretilemiyor.

**Kapsam:** litre, birim fiyat, toplam tutar, tarih. İstasyon adı, yakıt türü,
kilometre ve fiş numarası okunmuyor.

## Teknik notlar

- **Motor:** Tesseract.js 7.0.0, OEM 1 (LSTM), PSM 6, Türkçe `tessdata_fast` modeli.
- **Görüntü ön işleme:** gri tonlama + kısa kenarı 1500 px'e büyütme (en fazla 8×,
  uzun kenar 4000 px sınırı). İkinci geçiş: 2000 px + %2–98 persentil kontrast germe.
  Kübik benzeri yumuşatma (`imageSmoothingQuality: high`). PNG'ye çevrilir.
- **Sayı ayrıştırma:** Türkçe biçim (`3.468,00`, `42,50`), binlik ayraçları, rakam
  karışıklıkları (O→0, l→1, S→5 vb.), KDV satırlarının dışlanması.
- **Çapraz doğrulama:** litre × birim fiyat ≈ toplam (±%3). Tutarsızlıkta tek alanlı
  düzeltme denenir; olmazsa toplam ÷ litre ile birim fiyat hesaplanır.
- **Çoklu geçiş oylaması:** en tutarlı (litre, fiyat, toplam) üçlüsü seçilir; tarih
  çoğunluk oyuyla belirlenir. İlk geçiş yeterliyse ikincisi hiç çalışmaz.
- **Sadece SIMD çekirdeği** paketlenmiştir (~4 MB tasarruf). SIMD desteklemeyen çok eski
  tarayıcılarda anlaşılır bir Türkçe hata çıkar. Böyle bir cihazla karşılaşırsanız
  `tesseract-core-lstm.wasm.js` dosyasını da ekleyip `ocr.js` içindeki `corePath`'i
  klasöre çevirmek gerekir.

## Çevrimdışı davranış

| Özellik | Çevrimdışı |
|---|---|
| Kayıtlar, istatistikler, grafikler, CSV | ✅ |
| Fotoğraflar (IndexedDB) | ✅ |
| **Fiş OCR** (dosyalar indirildiyse) | ✅ |
| Manuel istasyon ekleme | ✅ |
| Harita karoları (OSM) | ❌ internet gerekir |
| İstasyon arama (Photon) | ❌ internet gerekir |
| Google Haritalar ile yol tarifi | ❌ internet gerekir |
| Hava durumu (Open-Meteo) | ❌ internet gerekir |

## Dosyalar (30 adet, hepsi kökte)

```text
index.html          manifest.webmanifest   sw.js
pwa.js              pwa.css                ocr.js
settings.js         settings-ui.js
tailwind.css        fonts.css              icons.css
leaflet.js          leaflet.css
inter-latin.woff2   inter-latin-ext.woff2
fa-solid-subset.woff2   fa-brands-subset.woff2
favicon.svg         icon-192.png           icon-512.png
icon-maskable-512.png   apple-touch-icon.png
tesseract.min.js    tesseract-worker.min.js
tesseract-core-simd-lstm.wasm.js           tur.traineddata.gz
LICENSES.txt        netlify.toml           README.md
serve.py
```

## Bilgisayarda denemek isterseniz

```bash
python3 serve.py 8082
# http://localhost:8082
```

Service worker yalnızca **HTTPS** veya **localhost** üzerinde çalışır. Dosyayı
`file://` ile açarsanız uygulama çalışır ama çevrimdışı önbellek ve OCR indirmez.

## Lisanslar

Tesseract.js ve tesseract.js-core: Apache-2.0. Türkçe `traineddata` (tessdata_fast):
Apache-2.0. Leaflet: BSD-2-Clause. Inter: OFL-1.1. Font Awesome Free: CC BY 4.0 / OFL.
Ayrıntılar `LICENSES.txt` içinde.
