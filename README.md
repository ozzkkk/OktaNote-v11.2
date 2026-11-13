# Yakıt Takip v6 — Gerçek Fiş Okuma (OCR)

Bu sürümde **fiş tarama artık gerçek**: fotoğraf çekiyorsunuz, uygulama yazıyı telefonun
kendi işlemcisinde okuyor ve **litre, birim fiyat, toplam tutar, tarih** alanlarını dolum
formuna aktarıyor. Önceki sürümlerdeki demo/sahte okuma tamamen kaldırıldı.

**Fotoğraflar hiçbir sunucuya gönderilmez.** OCR motoru (Tesseract.js + Türkçe dil modeli)
sitenizin kendi dosyaları arasındadır; ilk indirmeden sonra **internet olmadan** çalışır.

---

## Android'de GitHub'a yükleme (klasör gerekmez)

Bu paket **tek klasördür**, alt klasör yoktur. Android tarayıcısından doğrudan yükleyebilirsiniz.

1. ZIP'i telefonda açın, içindeki **28 dosyanın tamamını** bir klasöre çıkarın.
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

## Doğruluk: dürüst beklenti

Bu bir **yardımcı**dır, otomatik muhasebe değil. Sonuçları her zaman kontrol edin.

İyi sonuç veren koşullar:
- Fiş **düz** ve kadraja tam giriyor, köşelerden kesilmemiş
- **İyi ışık**, gölge yok, flaş parlaması yok
- Yazılar net; buruşuk/ısıl yazısı solmuş fişlerde hata artar
- Fiş kadrajı dik; hafif eğrilik tolere edilir, 15°+ eğrilik hatayı artırır

Zorlanan durumlar: silik termal fişler, çok küçük punto, el yazısı, kırışık yüzey,
alacakaranlık, fişin bir kısmının görünmesi. Böyle durumlarda alanlar boş gelir veya
yanlış okunur — kutulardan elle düzeltin.

**Kapsam bu turda 4 alanla sınırlı:** litre, birim fiyat, toplam tutar, tarih.
İstasyon adı, yakıt türü, kilometre ve fiş numarası okunmuyor (bilinçli tercih).

## Teknik notlar

- **Motor:** Tesseract.js 7.0.0, OEM 1 (LSTM), PSM 6, Türkçe `tessdata_fast` modeli.
- **Görüntü ön işleme:** gri tonlama + koşullu kontrast germe, 1000–2200 px yeniden
  boyutlama, PNG'ye çevirme. Başarısız olursa orijinal dosyayla devam eder.
- **Sayı ayrıştırma:** Türkçe biçim (`3.468,00`, `42,50`), binlik ayraçları, rakam
  karışıklıkları (O→0, l→1, S→5 vb.), KDV satırlarının dışlanması.
- **Çapraz doğrulama:** litre × birim fiyat ≈ toplam (±%3). Tutarsızlıkta tek alanlı
  düzeltme denenir; olmazsa toplam ÷ litre ile birim fiyat hesaplanır.
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

## Dosyalar (28 adet, hepsi kökte)

```text
index.html          manifest.webmanifest   sw.js
pwa.js              pwa.css                ocr.js
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
