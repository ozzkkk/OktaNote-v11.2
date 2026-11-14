/* Yakıt Takip v10 — Service Worker
 * App shell: sürümlü, kurulumda önceden önbelleğe alınır.
 * Gezinme: network-first, çevrimdışıyken önbellekteki index.html.
 * Aynı origin statik dosyalar: cache-first.
 * Üçüncü taraf API/harita/Google istekleri önbelleğe ALINMAZ (gizlilik + tazelik).
 * Kullanıcı verileri localStorage/IndexedDB'dedir; SW bunlara dokunmaz.
 */
const CACHE_VERSION = '10.0.0';
const SHELL_CACHE = `yakit-takip-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `yakit-takip-runtime-${CACHE_VERSION}`;
// OCR motor dosyaları v6'dan beri değişmedi. Önbellek adı sürümden BAĞIMSIZ;
// böylece v6'dan güncelleyen kullanıcı 5,6 MB'ı yeniden indirmez.
const OCR_VERSION = '6.0.0';
const OCR_CACHE = `yakit-takip-ocr-${OCR_VERSION}`;
const CACHE_PREFIX = 'yakit-takip-';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './tailwind.css',
  './fonts.css',
  './icons.css',
  './leaflet.css',
  './pwa.css',
  './leaflet.js',
  './pwa.js',
  './ocr.js',
  './settings.js',
  './settings-ui.js',
  './inter-latin.woff2',
  './inter-latin-ext.woff2',
  './fa-solid-subset.woff2',
  './fa-brands-subset.woff2',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// OCR varlıkları büyük (~5,6 MB); kurulumda değil, kullanıcı istediğinde önbelleğe alınır.
// NOT: './ocr.js' burada YOK — küçük bir dosya ve APP_SHELL'de sürümlü olarak
// zaten güncelleniyor. Burada tutmak, motor hiç değişmese bile kullanıcıya
// 5,6 MB'ı yeniden indirtiyordu.
const OCR_ASSETS = [
  './tesseract.min.js',
  './tesseract-worker.min.js',
  './tesseract-core-simd-lstm.wasm.js',
  './tur.traineddata.gz'
];

async function precacheOcr() {
  const cache = await caches.open(OCR_CACHE);
  const results = [];
  for (const url of OCR_ASSETS) {
    const existing = await cache.match(url);
    if (existing) { results.push({ url, cached: true }); continue; }
    const res = await fetch(url);
    if (!res.ok) throw new Error('OCR dosyası indirilemedi: ' + url + ' (' + res.status + ')');
    await cache.put(url, res.clone());
    results.push({ url, cached: true });
  }
  return results;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(APP_SHELL);
    // Yeni sürüm hemen devreye girmez; kullanıcıya "yenile" seçeneği gösterilir.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE && key !== RUNTIME_CACHE && !key.startsWith('yakit-takip-ocr-'))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return request.destination === '' && accept.includes('text/html');
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      // Tek sayfa uygulaması: her başarılı gezinmeyi kabuk olarak sakla.
      await cache.put('./index.html', response.clone());
    }
    return response;
  } catch (err) {
    const cached =
      (await caches.match(request)) ||
      (await caches.match('./index.html')) ||
      (await caches.match('./'));
    if (cached) return cached;
    return new Response(
      '<!doctype html><html lang="tr"><meta charset="utf-8"><title>Çevrimdışı</title><body style="font-family:system-ui;padding:2rem"><h1>Çevrimdışı</h1><p>Uygulama henüz önbelleğe alınmadı. İnternet bağlantısıyla bir kez açın.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function handleStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Gateway Timeout (offline)' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.headers.has('range')) return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (isNavigationRequest(request)) {
    if (url.origin !== self.location.origin) return;
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(handleStatic(request));
    return;
  }

  // Üçüncü taraf istekler (Photon, OSM tiles, Google Maps, Open-Meteo) ağa bırakılır.
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'GET_VERSION') {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage({ version: CACHE_VERSION, shell: SHELL_CACHE, runtime: RUNTIME_CACHE });
  } else if (data.type === 'CLEAR_RUNTIME') {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  } else if (data.type === 'PRECACHE_OCR') {
    const port = event.ports && event.ports[0];
    event.waitUntil((async () => {
      try {
        const files = await precacheOcr();
        if (port) port.postMessage({ ok: true, files });
      } catch (err) {
        if (port) port.postMessage({ ok: false, error: String(err && err.message || err) });
      }
    })());
  } else if (data.type === 'OCR_STATUS') {
    const port = event.ports && event.ports[0];
    event.waitUntil((async () => {
      const cache = await caches.open(OCR_CACHE);
      let n = 0;
      for (const url of OCR_ASSETS) { if (await cache.match(url)) n++; }
      if (port) port.postMessage({ ready: n === OCR_ASSETS.length, cached: n, count: n, total: OCR_ASSETS.length });
    })());
  }
});
