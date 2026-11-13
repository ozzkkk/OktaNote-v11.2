# Yakıt Takip v5 — Tek Klasör (Android dostu)

Bu paket, **alt klasör olmadan** tüm dosyaları tek bir klasörde toplar. Android telefonda GitHub’a klasör yüklemek mümkün olmadığı için, bu sürümde yüklemeniz gereken her şey düz dosyalardır.

## Android’de GitHub’a yükleme (klasör gerekmez)

1. Bu ZIP’i telefonda açın ve içindeki **22 dosyanın tamamını** bir klasöre çıkarın.
2. Tarayıcıda GitHub deposunu açın (GitHub uygulaması değil, **tarayıcı**).
3. **Add file → Upload files** seçeneğine dokunun.
4. Dosya seçicide bu klasöre girin ve **tüm dosyaları seçin** (çoklu seçim).
5. **Commit changes** deyin.
6. **Settings → Pages → Deploy from a branch → main / (root) → Save**.
7. `https://KULLANICI.github.io/DEPO/` adresini açın.

> Alt klasör yok: `assets/` diye bir şey aramayın. `tailwind.css`, `leaflet.js`, `icon-192.png` vb. hepsi kökte.

## Dosyalar

```text
index.html
sw.js
manifest.webmanifest
tailwind.css
fonts.css
icons.css
leaflet.css
leaflet.js
pwa.css
pwa.js
inter-latin.woff2
inter-latin-ext.woff2
fa-solid-subset.woff2
fa-brands-subset.woff2
favicon.svg
icon-192.png
icon-512.png
icon-maskable-512.png
apple-touch-icon.png
LICENSES.txt
netlify.toml
serve.py
```

## Alternatif: Netlify Drop (GitHub’sız)

GitHub ile uğraşmak istemezseniz:
1. ZIP’i açın, içindeki dosyaları seçip **yeniden ZIP** yapın (dosyalar ZIP’in kökünde olmalı, klasör içinde değil).
2. `https://app.netlify.com/drop` adresine gidin.
3. ZIP’i yükleyin. Netlify HTTPS adresi verir.

## Çevrimdışı davranış

- İlk ziyaret çevrimiçi olmalı; service worker kabuğu önbelleğe alır.
- Sonrasında çevrimdışı: kayıtlar, fotoğraflar, istatistikler, CSV, manuel istasyon çalışır.
- İnternet ister: OSM karoları, Photon arama, Google Haritalar, Open-Meteo.

## Güncelleme

Dosya değiştirdiğinizde `sw.js` içindeki `CACHE_VERSION` değerini artırın ve aynı adrese yeniden yükleyin.
