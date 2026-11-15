/* Yakıt Takip v11.2 — Hava durumu ve şehir seçimi
 * Bağımsız modül: window.YakitWeather
 *
 * Tasarım:
 *  - 81 il merkez koordinatı uygulamanın içinde gömülüdür (internet gerekmez).
 *  - Ek yerler için Photon/OpenStreetMap araması (internet gerekir, kullanıcı isterse).
 *  - Hava durumu Open-Meteo'dan alınır; API anahtarı yoktur, kayıt gerekmez.
 *  - Sonuç localStorage'da önbelleklenir; çevrimdışıyken son bilinen değer gösterilir.
 *  - Konum izni İSTENMEZ. Yalnızca seçilen şehrin koordinatı gönderilir.
 */
(function () {
  'use strict';

  var CACHE_KEY = 'yakitTakipWeatherCache';
  var MAX_AGE_MS = 30 * 60 * 1000;   // 30 dakika: aynı şehir için tekrar tekrar istek atılmaz
  var TIMEOUT_MS = 8000;

  // 81 il merkezi (plaka kodu sırasıyla). Koordinatlar il merkezidir.
  var CITIES = [
    { id: '01', name: 'Adana', lat: 37.0000, lon: 35.3213 },
    { id: '02', name: 'Adıyaman', lat: 37.7648, lon: 38.2786 },
    { id: '03', name: 'Afyonkarahisar', lat: 38.7507, lon: 30.5567 },
    { id: '04', name: 'Ağrı', lat: 39.7191, lon: 43.0503 },
    { id: '05', name: 'Amasya', lat: 40.6499, lon: 35.8353 },
    { id: '06', name: 'Ankara', lat: 39.9334, lon: 32.8597 },
    { id: '07', name: 'Antalya', lat: 36.8969, lon: 30.7133 },
    { id: '08', name: 'Artvin', lat: 41.1828, lon: 41.8183 },
    { id: '09', name: 'Aydın', lat: 37.8560, lon: 27.8416 },
    { id: '10', name: 'Balıkesir', lat: 39.6484, lon: 27.8826 },
    { id: '11', name: 'Bilecik', lat: 40.1451, lon: 29.9798 },
    { id: '12', name: 'Bingöl', lat: 38.8854, lon: 40.4966 },
    { id: '13', name: 'Bitlis', lat: 38.4006, lon: 42.1095 },
    { id: '14', name: 'Bolu', lat: 40.7392, lon: 31.6089 },
    { id: '15', name: 'Burdur', lat: 37.7203, lon: 30.2908 },
    { id: '16', name: 'Bursa', lat: 40.1826, lon: 29.0665 },
    { id: '17', name: 'Çanakkale', lat: 40.1553, lon: 26.4142 },
    { id: '18', name: 'Çankırı', lat: 40.6013, lon: 33.6134 },
    { id: '19', name: 'Çorum', lat: 40.5506, lon: 34.9556 },
    { id: '20', name: 'Denizli', lat: 37.7765, lon: 29.0864 },
    { id: '21', name: 'Diyarbakır', lat: 37.9144, lon: 40.2306 },
    { id: '22', name: 'Edirne', lat: 41.6818, lon: 26.5623 },
    { id: '23', name: 'Elazığ', lat: 38.6810, lon: 39.2264 },
    { id: '24', name: 'Erzincan', lat: 39.7500, lon: 39.5000 },
    { id: '25', name: 'Erzurum', lat: 39.9000, lon: 41.2700 },
    { id: '26', name: 'Eskişehir', lat: 39.7767, lon: 30.5206 },
    { id: '27', name: 'Gaziantep', lat: 37.0662, lon: 37.3833 },
    { id: '28', name: 'Giresun', lat: 40.9128, lon: 38.3895 },
    { id: '29', name: 'Gümüşhane', lat: 40.4386, lon: 39.5086 },
    { id: '30', name: 'Hakkâri', lat: 37.5833, lon: 43.7333 },
    { id: '31', name: 'Hatay', lat: 36.4018, lon: 36.3498 },
    { id: '32', name: 'Isparta', lat: 37.7648, lon: 30.5566 },
    { id: '33', name: 'Mersin', lat: 36.8000, lon: 34.6333 },
    { id: '34', name: 'İstanbul', lat: 41.0082, lon: 28.9784 },
    { id: '35', name: 'İzmir', lat: 38.4237, lon: 27.1428 },
    { id: '36', name: 'Kars', lat: 40.6013, lon: 43.0975 },
    { id: '37', name: 'Kastamonu', lat: 41.3887, lon: 33.7827 },
    { id: '38', name: 'Kayseri', lat: 38.7312, lon: 35.4787 },
    { id: '39', name: 'Kırklareli', lat: 41.7333, lon: 27.2167 },
    { id: '40', name: 'Kırşehir', lat: 39.1425, lon: 34.1709 },
    { id: '41', name: 'Kocaeli', lat: 40.8533, lon: 29.8815 },
    { id: '42', name: 'Konya', lat: 37.8746, lon: 32.4932 },
    { id: '43', name: 'Kütahya', lat: 39.4167, lon: 29.9833 },
    { id: '44', name: 'Malatya', lat: 38.3552, lon: 38.3095 },
    { id: '45', name: 'Manisa', lat: 38.6191, lon: 27.4289 },
    { id: '46', name: 'Kahramanmaraş', lat: 37.5858, lon: 36.9371 },
    { id: '47', name: 'Mardin', lat: 37.3212, lon: 40.7245 },
    { id: '48', name: 'Muğla', lat: 37.2153, lon: 28.3636 },
    { id: '49', name: 'Muş', lat: 38.9462, lon: 41.7539 },
    { id: '50', name: 'Nevşehir', lat: 38.6939, lon: 34.6857 },
    { id: '51', name: 'Niğde', lat: 37.9667, lon: 34.6833 },
    { id: '52', name: 'Ordu', lat: 40.9839, lon: 37.8764 },
    { id: '53', name: 'Rize', lat: 41.0201, lon: 40.5234 },
    { id: '54', name: 'Sakarya', lat: 40.7569, lon: 30.3783 },
    { id: '55', name: 'Samsun', lat: 41.2867, lon: 36.3300 },
    { id: '56', name: 'Siirt', lat: 37.9333, lon: 41.9500 },
    { id: '57', name: 'Sinop', lat: 42.0231, lon: 35.1531 },
    { id: '58', name: 'Sivas', lat: 39.7477, lon: 37.0179 },
    { id: '59', name: 'Tekirdağ', lat: 40.9833, lon: 27.5167 },
    { id: '60', name: 'Tokat', lat: 40.3167, lon: 36.5500 },
    { id: '61', name: 'Trabzon', lat: 41.0015, lon: 39.7178 },
    { id: '62', name: 'Tunceli', lat: 39.1079, lon: 39.5401 },
    { id: '63', name: 'Şanlıurfa', lat: 37.1591, lon: 38.7969 },
    { id: '64', name: 'Uşak', lat: 38.6823, lon: 29.4082 },
    { id: '65', name: 'Van', lat: 38.4891, lon: 43.4089 },
    { id: '66', name: 'Yozgat', lat: 39.8181, lon: 34.8147 },
    { id: '67', name: 'Zonguldak', lat: 41.4564, lon: 31.7987 },
    { id: '68', name: 'Aksaray', lat: 38.3687, lon: 34.0370 },
    { id: '69', name: 'Bayburt', lat: 40.2552, lon: 40.2249 },
    { id: '70', name: 'Karaman', lat: 37.1759, lon: 33.2287 },
    { id: '71', name: 'Kırıkkale', lat: 39.8468, lon: 33.5153 },
    { id: '72', name: 'Batman', lat: 37.8812, lon: 41.1351 },
    { id: '73', name: 'Şırnak', lat: 37.5164, lon: 42.4611 },
    { id: '74', name: 'Bartın', lat: 41.6344, lon: 32.3375 },
    { id: '75', name: 'Ardahan', lat: 41.1105, lon: 42.7022 },
    { id: '76', name: 'Iğdır', lat: 39.9167, lon: 44.0333 },
    { id: '77', name: 'Yalova', lat: 40.6500, lon: 29.2667 },
    { id: '78', name: 'Karabük', lat: 41.2061, lon: 32.6204 },
    { id: '79', name: 'Kilis', lat: 36.7184, lon: 37.1212 },
    { id: '80', name: 'Osmaniye', lat: 37.0742, lon: 36.2478 },
    { id: '81', name: 'Düzce', lat: 40.8438, lon: 31.1565 }
  ];

  // Türkçe büyük/küçük harf duyarlı arama için sadeleştirme
  function fold(s) {
    return String(s == null ? '' : s)
      .replace(/İ/g, 'i').replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
      .trim();
  }

  function list() { return CITIES.slice(); }
  function byId(id) {
    var k = String(id == null ? '' : id);
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i].id === k) return CITIES[i];
    return null;
  }
  function byName(name) {
    var f = fold(name);
    if (!f) return null;
    for (var i = 0; i < CITIES.length; i++) if (fold(CITIES[i].name) === f) return CITIES[i];
    return null;
  }
  // Liste içi arama (internet gerekmez)
  function filter(query) {
    var f = fold(query);
    if (!f) return list();
    return CITIES.filter(function (c) { return fold(c.name).indexOf(f) >= 0 || c.id === f; });
  }

  function validCoord(lat, lon) {
    // DİKKAT: Number(null) === 0 olduğundan null/'' önce açıkça reddedilir.
    if (lat === null || lat === undefined || lat === '' || lon === null || lon === undefined || lon === '') return false;
    var a = Number(lat), b = Number(lon);
    return isFinite(a) && isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
  }

  // Ayarlarda seçili şehir (yoksa null)
  function selected() {
    var S = window.YakitSettings;
    if (!S || !S.get) return null;
    var s = S.get();
    if (!validCoord(s.weatherLat, s.weatherLon)) return null;
    return { id: s.weatherCityId || '', name: s.weatherCityName || '', lat: Number(s.weatherLat), lon: Number(s.weatherLon) };
  }

  function select(city) {
    var S = window.YakitSettings;
    if (!S || !S.set || !city || !validCoord(city.lat, city.lon)) return false;
    var ok = S.setMany
      ? S.setMany({ weatherCityId: String(city.id || ''), weatherCityName: String(city.name || ''), weatherLat: Number(city.lat), weatherLon: Number(city.lon) })
      : false;
    if (!ok) return false;
    clearCache();
    return true;
  }

  function clearSelection() {
    var S = window.YakitSettings;
    if (!S || !S.set) return false;
    var ok = S.setMany
      ? S.setMany({ weatherCityId: '', weatherCityName: '', weatherLat: null, weatherLon: null })
      : false;
    if (!ok) return false;
    clearCache();
    return true;
  }

  // ---------- Open-Meteo hava kodu → uygulamanın 5 durumu ----------
  function codeToCond(code) {
    var c = Number(code);
    if (!isFinite(c)) return 'Güneşli';
    if (c === 0) return 'Güneşli';
    if (c === 1 || c === 2) return 'Parçalı Bulutlu';
    if (c === 3 || (c >= 45 && c <= 48)) return 'Bulutlu';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'Karlı';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'Yağmurlu';
    return 'Parçalı Bulutlu';
  }

  function iconFor(cond) {
    if (cond === 'Güneşli') return 'fa-sun';
    if (cond === 'Parçalı Bulutlu') return 'fa-cloud-sun';
    if (cond === 'Bulutlu') return 'fa-cloud';
    if (cond === 'Yağmurlu') return 'fa-cloud-rain';
    if (cond === 'Karlı') return 'fa-snowflake';
    return 'fa-cloud-sun';
  }

  // ---------- önbellek ----------
  function cacheKey(lat, lon) { return Number(lat).toFixed(3) + ',' + Number(lon).toFixed(3); }
  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object' || !isFinite(Number(o.temp))) return null;
      return o;
    } catch (e) { return null; }
  }
  function writeCache(o) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(o)); } catch (e) { /* kota: önemsiz */ }
  }
  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) { }
  }
  function freshFor(lat, lon, maxAge) {
    var c = readCache();
    if (!c || c.key !== cacheKey(lat, lon)) return null;
    var age = Date.now() - Number(c.at || 0);
    if (!(age >= 0) || age >= (maxAge == null ? MAX_AGE_MS : maxAge)) return null;
    return c;
  }

  function fetchJson(url) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(function () { clearTimeout(timer); });
  }

  // ---------- seçili şehir için güncel hava ----------
  // opts: { force: bool, maxAge: ms }
  // Dönen: { ok, temp, cond, code, at, cached, city, reason }
  async function current(opts) {
    var o = opts || {};
    var city = o.city || selected();
    if (!city) return { ok: false, reason: 'no-city' };

    if (!o.force) {
      var hit = freshFor(city.lat, city.lon, o.maxAge);
      if (hit) return { ok: true, temp: hit.temp, cond: hit.cond, code: hit.code, at: hit.at, cached: true, city: city };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      var stale = readCache();
      if (stale && stale.key === cacheKey(city.lat, city.lon)) {
        return { ok: true, temp: stale.temp, cond: stale.cond, code: stale.code, at: stale.at, cached: true, stale: true, city: city, reason: 'offline' };
      }
      return { ok: false, reason: 'offline', city: city };
    }
    try {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + Number(city.lat).toFixed(4) +
        '&longitude=' + Number(city.lon).toFixed(4) + '&current_weather=true&timezone=auto';
      var data = await fetchJson(url);
      var cw = data && data.current_weather;
      if (!cw || !isFinite(Number(cw.temperature))) return { ok: false, reason: 'bad-data', city: city };
      var rec = {
        key: cacheKey(city.lat, city.lon),
        temp: Math.round(Number(cw.temperature)),
        cond: codeToCond(cw.weathercode),
        code: Number(cw.weathercode),
        at: Date.now(),
        cityName: city.name || ''
      };
      writeCache(rec);
      return { ok: true, temp: rec.temp, cond: rec.cond, code: rec.code, at: rec.at, cached: false, city: city };
    } catch (e) {
      var old = readCache();
      if (old && old.key === cacheKey(city.lat, city.lon)) {
        return { ok: true, temp: old.temp, cond: old.cond, code: old.code, at: old.at, cached: true, stale: true, city: city, reason: 'fetch-failed' };
      }
      return { ok: false, reason: 'fetch-failed', city: city };
    }
  }

  // ---------- Photon ile yer arama (kullanıcı isterse) ----------
  async function searchRemote(query, limit) {
    var q = String(query == null ? '' : query).trim();
    if (q.length < 2) return { ok: false, reason: 'too-short', results: [] };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline', results: [] };
    var base = 'https://photon.komoot.io';
    try {
      // İstasyon aramasıyla aynı özel Photon sunucusu kullanılır (localStorage).
      var custom = String(localStorage.getItem('yakit_takip_photon_base') || '').trim();
      if (/^https?:\/\//i.test(custom)) base = custom.replace(/\/+$/, '');
    } catch (e) { }
    try {
      // DİKKAT: Photon yalnızca default/de/en/fr destekler; 'tr' HATA döndürür.
      // Türkçe arayüzde lang parametresi hiç gönderilmez (yerel adlar gelir).
      var en = !!(window.YakitI18n && window.YakitI18n.getLang && window.YakitI18n.getLang() === 'en');
      var url = base + '/api/?q=' + encodeURIComponent(q) + '&limit=' + (Number(limit) || 8) + (en ? '&lang=en' : '');
      var data = await fetchJson(url);
      var feats = (data && data.features) || [];
      var out = [];
      for (var i = 0; i < feats.length; i++) {
        var f = feats[i], g = f.geometry, p = f.properties || {};
        if (!g || !Array.isArray(g.coordinates)) continue;
        var lon = Number(g.coordinates[0]), lat = Number(g.coordinates[1]);
        if (!validCoord(lat, lon)) continue;
        var name = p.name || p.city || p.town || p.village || q;
        var desc = [p.city || p.town || p.county, p.state, p.country].filter(function (x) { return x && x !== name; }).join(', ');
        out.push({ id: '', name: name, lat: lat, lon: lon, desc: desc });
      }
      return { ok: true, results: out };
    } catch (e) {
      return { ok: false, reason: 'fetch-failed', results: [] };
    }
  }

  window.YakitWeather = {
    CITIES: CITIES,
    MAX_AGE_MS: MAX_AGE_MS,
    list: list, byId: byId, byName: byName, filter: filter, fold: fold,
    selected: selected, select: select, clearSelection: clearSelection,
    codeToCond: codeToCond, iconFor: iconFor,
    current: current, searchRemote: searchRemote,
    readCache: readCache, clearCache: clearCache, freshFor: freshFor, validCoord: validCoord
  };
})();
