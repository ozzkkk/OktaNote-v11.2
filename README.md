# Oktanote v11.4.1 — araç silme ve tam sıfırlama düzeltmesi

v11.4’ün üzerine gelen bakım sürümüdür. Araç silme artık son aracı da destekler;
araçla ilişkili kayıtlar temizlenir. “Tüm verileri sıfırla” demo verileri yüklemek
yerine kullanıcı verilerini gerçekten temizler.

## v11.4.1 değişiklikleri

- **Araç silme:** araç, dolum, gider, gezi, bakım hatırlatıcıları, tekrarlayan
giderleri, bütçesi ve fotoğraflarıyla birlikte silinir. Son araç silinirse
uygulamanın çalışır kalması için boş bir “Aracım” başlangıç kaydı oluşturulur.
- **Tüm verileri sıfırla:** tüm araçları, yakıt dolumlarını, giderleri, gezileri,
bakım verilerini, fotoğrafları, tercihleri ve uygulama içi yedekleri siler;
demo verileri geri yüklemez. Boş başlangıç aracı bırakır.
- Arkadaşlar GitHub Pages bağlantısını ayrı cihaz/profilde açarsa kayıtları
birbirinden ayrıdır. Uygulamanın sunucusu ya da bulut eşitlemesi yoktur.

## v11.4 özellikleri

1. **Karanlık mod** — Açık / Koyu / Sistem.
2. **CSV içe aktarma** — dolum ve gider için önizleme ve sütun eşleştirme.
3. **Bütçe + tekrarlayan giderler** — araç başına aylık yakıt bütçesi.
4. **PDF/yazdırma raporu** ve istasyon fiyat karşılaştırması.
5. **GPS’li gezi takibi** ve yerel bildirimler.
6. **Şifreli yedek** (AES-GCM + PBKDF2), Leaflet tembel yükleme, GitHub Actions CI.
7. **Hukuk/marka ön araştırması** — `MARKA-VE-HUKUK.md`.

## Korunanlar

- Veri anahtarı `yakit_takip_data_v1`, fotoğraf DB `yakit_takip_photos`.
- Yedek formatı `yakit-takip-backup`; eski yedekler içe aktarılabilir.
- OCR önbelleği `OCR_VERSION 6.0.0` (5,6 MB yeniden indirilmez).
- Manifest kimliği, `start_url/scope`, ikonlar, kısayollar ve OCR akışı.
- Güncelleme mevcut kişisel kayıtları ve tercihleri korur; yalnızca kullanıcı
  “Tüm verileri sıfırla”yı onaylarsa veriler silinir.

## GitHub’a yükleme

Depo: `ozzkkk/OktaNote-v11.2` (main). Güncelleme ZIP’indeki dosyaları aynı
klasör yapısıyla yükleyin ve `sw.js` dosyasını **en son, ayrı commit’te** yayınlayın.
Adımlar için `KURULUM.txt` dosyasına bakın.

## Testler

- Tam regresyon: **1668/1668 kontrol, 0 hata**.
- Ek tarayıcı doğrulaması: araç/bağlı kayıt silme, son araç silme, tüm veri ve
  yerel yedeklerin sıfırlanması, yeniden açılışta temiz durum.
- OCR test kümesi: **62/72 alan (%86)** — değişmedi.
