/* Oktanote v11.4 — Ayarlar, birimler, dosya yedekleme + uygulama içi otomatik yedek
 * Bağımsız modül: window.YakitSettings
 * Veri modeli: state.settings (localStorage içinde, ana state ile birlikte)
 */
(function () {
  'use strict';

  var SETTINGS_KEY = 'yakitTakipSettings';
  // v10.9: tek kaynak — sürüm her yerde buradan okunur
  var APP_VERSION = '11.4.0';

  var DEFAULTS = {
    distanceUnit: 'km',        // 'km' | 'mi'
    volumeUnit: 'L',           // 'L' | 'galUS' | 'galUK'
    consumptionUnit: 'L/100km', // 'L/100km' | 'km/L' | 'MPG-US' | 'MPG-UK'
    currency: 'TRY',
    dateFormat: 'YYYY-MM-DD',
    defaultView: 'home',
    weekStart: 1,              // 1=Pazartesi, 0=Pazar
    autoBackupReminder: true,
    lastBackupAt: null,
    autoLocalBackup: true,     // uygulama açılışında günde 1 otomatik yedek
    localBackupKeep: 7,        // saklanacak yedek sayısı: 7 | 14 | 30
    dataGuards: true,          // v10.2: veri giriş uyarıları (mükerrer/sayaç/tüketim)
    language: 'tr',            // v10.5: arayüz dili — 'tr' | 'en'
    theme: 'system',           // v11.4: 'system' | 'light' | 'dark'
    notifications: false,      // v11.4: yerel bildirimler
    // v10.9: hava durumu şehri (koordinatlar cihazda; konum izni istenmez)
    weatherCityId: '',         // 81 il için plaka kodu; özel yerde ''
    weatherCityName: '',
    weatherLat: null,
    weatherLon: null,
    weatherAuto: true          // açılışta ve dolum formunda otomatik güncelle
  };

  var CURRENCIES = {
    TRY: { symbol: '₺', name: 'Türk Lirası', locale: 'tr-TR' },
    USD: { symbol: '$', name: 'ABD Doları', locale: 'en-US' },
    EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
    GBP: { symbol: '£', name: 'İngiliz Sterlini', locale: 'en-GB' },
    RUB: { symbol: '₽', name: 'Ruble', locale: 'ru-RU' },
    AZN: { symbol: '₼', name: 'Azerbaycan Manatı', locale: 'az-AZ' }
  };

  var DATE_FORMATS = ['YYYY-MM-DD', 'DD.MM.YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'D MMM YYYY'];
  var TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  var EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var VEHICLE_ICONS = [
    { id: 'car', label: 'Otomobil' },
    { id: 'car-side', label: 'Sedan' },
    { id: 'truck-pickup', label: 'Pickup' },
    { id: 'truck', label: 'Kamyon' },
    { id: 'truck-monster', label: 'Arazi' },
    { id: 'van-shuttle', label: 'Minibüs' },
    { id: 'bus', label: 'Otobüs' },
    { id: 'motorcycle', label: 'Motosiklet' },
    { id: 'bicycle', label: 'Bisiklet' },
    { id: 'tractor', label: 'Traktör' },
    { id: 'caravan', label: 'Karavan' },
    { id: 'taxi', label: 'Taksi' },
    { id: 'ship', label: 'Tekne' },
    { id: 'plane', label: 'Uçak' },
    { id: 'helicopter', label: 'Helikopter' },
    { id: 'train', label: 'Tren' }
  ];

  var VEHICLE_COLORS = [
    { id: 'slate', bg: '#1e293b', label: 'Koyu gri' },
    { id: 'blue', bg: '#2563eb', label: 'Mavi' },
    { id: 'emerald', bg: '#059669', label: 'Yeşil' },
    { id: 'rose', bg: '#e11d48', label: 'Kırmızı' },
    { id: 'amber', bg: '#d97706', label: 'Turuncu' },
    { id: 'violet', bg: '#7c3aed', label: 'Mor' },
    { id: 'cyan', bg: '#0891b2', label: 'Turkuaz' },
    { id: 'stone', bg: '#57534e', label: 'Kahve' }
  ];

  var settings = Object.assign({}, DEFAULTS);

  // ---------- kalıcılık ----------
  function load() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          Object.keys(DEFAULTS).forEach(function (k) {
            if (p[k] !== undefined && p[k] !== null) settings[k] = p[k];
          });
        }
      }
    } catch (e) { console.warn('Ayarlar okunamadı:', e); }
    return validate();
  }

  function validate() {
    if (['km', 'mi'].indexOf(settings.distanceUnit) < 0) settings.distanceUnit = 'km';
    if (['L', 'galUS', 'galUK'].indexOf(settings.volumeUnit) < 0) settings.volumeUnit = 'L';
    if (['L/100km', 'km/L', 'MPG-US', 'MPG-UK'].indexOf(settings.consumptionUnit) < 0) settings.consumptionUnit = 'L/100km';
    if (!CURRENCIES[settings.currency]) settings.currency = 'TRY';
    if (DATE_FORMATS.indexOf(settings.dateFormat) < 0) settings.dateFormat = 'YYYY-MM-DD';
    settings.weekStart = Number(settings.weekStart) === 0 ? 0 : 1;
    settings.autoLocalBackup = settings.autoLocalBackup !== false;
    if ([7, 14, 30].indexOf(Number(settings.localBackupKeep)) < 0) settings.localBackupKeep = 7;
    settings.localBackupKeep = Number(settings.localBackupKeep);
    settings.dataGuards = settings.dataGuards !== false;
    settings.language = settings.language === 'en' ? 'en' : 'tr';
    // v10.9: hava durumu şehri doğrulaması
    settings.weatherAuto = settings.weatherAuto !== false;
    settings.weatherCityId = String(settings.weatherCityId == null ? '' : settings.weatherCityId).slice(0, 8);
    settings.weatherCityName = String(settings.weatherCityName == null ? '' : settings.weatherCityName).slice(0, 80);
    var wlat = Number(settings.weatherLat), wlon = Number(settings.weatherLon);
    var okCoord = settings.weatherLat !== null && settings.weatherLon !== null &&
      isFinite(wlat) && isFinite(wlon) && wlat >= -90 && wlat <= 90 && wlon >= -180 && wlon <= 180;
    if (!okCoord) { settings.weatherLat = null; settings.weatherLon = null; settings.weatherCityId = ''; settings.weatherCityName = ''; }
    else { settings.weatherLat = wlat; settings.weatherLon = wlon; }
    return settings;
  }

  function save() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return true; }
    catch (e) { console.error('Ayarlar kaydedilemedi:', e); return false; }
  }

  function get() { return Object.assign({}, settings); }

  function set(key, value) {
    if (!(key in DEFAULTS)) return false;
    settings[key] = value;
    validate();
    save();
    return true;
  }

  // v10.9: birbiriyle ilişkili alanları TEK doğrulamada yaz.
  // (Örn. şehir adı + enlem + boylam: tek tek yazılırsa validate() ara durumda
  //  eksik koordinat görüp adı temizler ve seçim kaybolur.)
  function setMany(obj) {
    if (!obj || typeof obj !== 'object') return false;
    var changed = false;
    Object.keys(obj).forEach(function (k) {
      if (k in DEFAULTS) { settings[k] = obj[k]; changed = true; }
    });
    if (!changed) return false;
    validate();
    save();
    return true;
  }

  // ---------- birim dönüşümleri ----------
  var MI_PER_KM = 0.621371192;
  var L_PER_GALUS = 3.785411784;
  var L_PER_GALUK = 4.54609;

  function kmToDisplay(km) {
    return settings.distanceUnit === 'mi' ? Number(km || 0) * MI_PER_KM : Number(km || 0);
  }
  function displayToKm(v) {
    return settings.distanceUnit === 'mi' ? Number(v || 0) / MI_PER_KM : Number(v || 0);
  }
  function litersToDisplay(l) {
    var n = Number(l || 0);
    if (settings.volumeUnit === 'galUS') return n / L_PER_GALUS;
    if (settings.volumeUnit === 'galUK') return n / L_PER_GALUK;
    return n;
  }
  function displayToLiters(v) {
    var n = Number(v || 0);
    if (settings.volumeUnit === 'galUS') return n * L_PER_GALUS;
    if (settings.volumeUnit === 'galUK') return n * L_PER_GALUK;
    return n;
  }
  // v10.8: EN arayüzde mil kısaltması uluslararası 'mi' olur (TR'de 'mil' kalır).
  function distanceLabel() {
    if (settings.distanceUnit !== 'mi') return 'km';
    var en = window.YakitI18n && window.YakitI18n.getLang && window.YakitI18n.getLang() === 'en';
    return en ? 'mi' : 'mil';
  }
  function volumeLabel() {
    return settings.volumeUnit === 'galUS' ? 'gal (US)' : settings.volumeUnit === 'galUK' ? 'gal (UK)' : 'L';
  }

  // Tüketim: içeride her zaman L/100km saklanır
  function consumptionFromL100(l100) {
    var v = Number(l100 || 0);
    if (!v || !isFinite(v)) return 0;
    switch (settings.consumptionUnit) {
      case 'km/L': return 100 / v;
      case 'MPG-US': return (100 / v) * MI_PER_KM * L_PER_GALUS;
      case 'MPG-UK': return (100 / v) * MI_PER_KM * L_PER_GALUK;
      default: return v;
    }
  }
  function consumptionToL100(val) {
    var v = Number(val || 0);
    if (!v || !isFinite(v)) return 0;
    switch (settings.consumptionUnit) {
      case 'km/L': return 100 / v;
      case 'MPG-US': return 100 / ((v / L_PER_GALUS) / MI_PER_KM);
      case 'MPG-UK': return 100 / ((v / L_PER_GALUK) / MI_PER_KM);
      default: return v;
    }
  }
  function consumptionLabel() {
    return settings.consumptionUnit === 'L/100km' ? 'L/100km' : settings.consumptionUnit;
  }


  // ---------- hafta yardımcıları ----------
  function weekStartLabel(v) {
    var w = v === undefined ? settings.weekStart : Number(v);
    return w === 0 ? 'Pazar' : 'Pazartesi';
  }
  function dateKeyLocal(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Seçilen haftanın ilk gününe göre [başlangıç, bitiş] (yerel tarih, DST güvenli)
  function weekRange(date, firstDay) {
    var d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    var fd = Number(firstDay === undefined ? settings.weekStart : firstDay) === 0 ? 0 : 1;
    var diff = (d.getDay() - fd + 7) % 7;
    var start = new Date(d); start.setDate(d.getDate() - diff);
    var end = new Date(start); end.setDate(start.getDate() + 6);
    return { start: start, end: end, startKey: dateKeyLocal(start), endKey: dateKeyLocal(end), firstDay: fd };
  }
  function inWeekRange(dateStr, range) {
    var k = String(dateStr || '').slice(0, 10);
    return !!k && k >= range.startKey && k <= range.endKey;
  }

  // ---------- biçimlendirme ----------
  function num(v, dec) {
    var d = dec === undefined ? 2 : dec;
    return Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function money(v) {
    var c = CURRENCIES[settings.currency] || CURRENCIES.TRY;
    return c.symbol + num(v, 2);
  }
  function currencySymbol() { return (CURRENCIES[settings.currency] || CURRENCIES.TRY).symbol; }
  function distance(km, dec) {
    return num(kmToDisplay(km), dec === undefined ? 0 : dec) + ' ' + distanceLabel();
  }
  function volume(l, dec) {
    return num(litersToDisplay(l), dec === undefined ? 2 : dec) + ' ' + volumeLabel();
  }
  function consumption(l100, dec) {
    return num(consumptionFromL100(l100), dec === undefined ? 1 : dec) + ' ' + consumptionLabel();
  }
  function pricePerVolume(pricePerLiter) {
    // L başına fiyatı seçilen hacim birimine çevir
    var v = Number(pricePerLiter || 0);
    if (settings.volumeUnit === 'galUS') v *= L_PER_GALUS;
    if (settings.volumeUnit === 'galUK') v *= L_PER_GALUK;
    return money(v);
  }

  function formatDate(iso) {
    var s = String(iso || '');
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    var y = m[1], mo = m[2], d = m[3];
    switch (settings.dateFormat) {
      case 'DD.MM.YYYY': return d + '.' + mo + '.' + y;
      case 'DD/MM/YYYY': return d + '/' + mo + '/' + y;
      case 'MM/DD/YYYY': return mo + '/' + d + '/' + y;
      case 'D MMM YYYY': return parseInt(d, 10) + ' ' + (settings.language === 'en' ? EN_MONTHS : TR_MONTHS)[parseInt(mo, 10) - 1] + ' ' + y;
      default: return y + '-' + mo + '-' + d;
    }
  }

  // ---------- araç simgesi ----------
  function vehicleIcon(v) {
    var id = v && v.icon;
    if (!id || !VEHICLE_ICONS.some(function (i) { return i.id === id; })) {
      // yakıt türüne göre makul varsayılan
      var ft = v && v.fuelType;
      if (ft === 'Elektrik') id = 'car-side';
      else id = 'car';
    }
    return id;
  }
  function vehicleColor(v) {
    var id = v && v.color;
    var c = VEHICLE_COLORS.filter(function (x) { return x.id === id; })[0];
    return c || VEHICLE_COLORS[0];
  }
  function vehicleAvatarHtml(v, sizeClass) {
    var icon = vehicleIcon(v), col = vehicleColor(v);
    var cls = sizeClass || 'w-9 h-9 text-sm';
    return '<div class="' + cls + ' rounded-full text-white flex items-center justify-center shrink-0" ' +
      'style="background:' + col.bg + '"><i class="fa-solid fa-' + icon + '"></i></div>';
  }

  // ---------- YEDEKLEME ----------
  // Tüm veriyi (state + ayarlar + IndexedDB fotoğrafları) tek JSON'da toplar.
  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('Fotoğraf okunamadı')); };
      fr.readAsDataURL(blob);
    });
  }
  function dataUrlToBlob(dataUrl) {
    var parts = String(dataUrl).split(',');
    var meta = parts[0] || '';
    var mime = (meta.match(/data:([^;]+)/) || [, 'image/jpeg'])[1];
    var bin = atob(parts[1] || '');
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function buildBackup(opts) {
    var o = opts || {};
    var includePhotos = o.photos !== false;
    var st = window.YakitApp && window.YakitApp.getState ? window.YakitApp.getState() : null;
    if (!st) throw new Error('Uygulama verisi okunamadı');

    var payload = {
      format: 'yakit-takip-backup',
      version: 7,
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      settings: get(),
      state: JSON.parse(JSON.stringify(st)),
      photos: {},
      photoCount: 0
    };

    if (includePhotos && window.YakitApp && window.YakitApp.getAllPhotos) {
      try {
        var all = await window.YakitApp.getAllPhotos();
        for (var i = 0; i < all.length; i++) {
          var rec = all[i];
          if (rec && rec.id && rec.blob) {
            payload.photos[rec.id] = await blobToDataUrl(rec.blob);
          }
        }
        payload.photoCount = Object.keys(payload.photos).length;
      } catch (e) {
        console.warn('Fotoğraflar yedeğe eklenemedi:', e);
        payload.photoWarning = 'Fotoğraflar okunamadı; yalnızca kayıtlar yedeklendi.';
      }
    }
    return payload;
  }

  function backupFileName() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return 'oktanote-yedek-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
  }

  async function downloadBackup(opts) {
    var payload = await buildBackup(opts);
    var json = JSON.stringify(payload);
    var blob = new Blob([json], { type: 'application/json' });
    var name = backupFileName();
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    set('lastBackupAt', payload.createdAt);
    return { name: name, bytes: blob.size, photoCount: payload.photoCount, warning: payload.photoWarning };
  }

  async function shareBackup(opts) {
    var payload = await buildBackup(opts);
    var json = JSON.stringify(payload);
    var blob = new Blob([json], { type: 'application/json' });
    var name = backupFileName();
    var file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'Oktanote yedeği', text: 'Oktanote veri yedeği' });
      set('lastBackupAt', payload.createdAt);
      return { shared: true, name: name, bytes: blob.size, photoCount: payload.photoCount };
    }
    // Paylaşım desteklenmiyorsa indirmeye düş
    var r = await downloadBackup(opts);
    r.shared = false;
    return r;
  }

  function validateBackup(obj) {
    if (!obj || typeof obj !== 'object') return 'Dosya okunamadı (geçersiz JSON).';
    if (obj.format !== 'yakit-takip-backup') return 'Bu bir Oktanote yedeği değil.';
    if (!obj.state || typeof obj.state !== 'object') return 'Yedekte kayıt verisi yok.';
    if (!Array.isArray(obj.state.vehicles) || !obj.state.vehicles.length) return 'Yedekte araç bilgisi yok.';
    if (!Array.isArray(obj.state.refuels)) return 'Yedekte dolum listesi bozuk.';
    return null;
  }

  function summarizeBackup(obj) {
    var st = obj.state || {};
    return {
      createdAt: obj.createdAt || null,
      vehicles: (st.vehicles || []).length,
      refuels: (st.refuels || []).length,
      expenses: (st.expenses || []).length,
      trips: (st.trips || []).length,
      photos: obj.photoCount || Object.keys(obj.photos || {}).length,
      version: obj.version || null
    };
  }

  async function restoreBackup(obj, opts) {
    var o = opts || {};
    var err = validateBackup(obj);
    if (err) throw new Error(err);

    // v10.1: geri yüklemeden önce mevcut durumun güvenlik yedeğini al.
    // Alınamazsa geri yükleme hiç başlamaz.
    var safety = null;
    if (o.safety !== false) {
      try { safety = await createLocalBackup('safety'); }
      catch (e) {
        throw new Error('Geri yükleme öncesi güvenlik yedeği alınamadı: ' + (e && e.message ? e.message : e));
      }
    }

    // Fotoğrafları IndexedDB'ye yaz
    var restored = 0;
    if (o.photos !== false && obj.photos && window.YakitApp && window.YakitApp.putPhoto) {
      var ids = Object.keys(obj.photos);
      for (var i = 0; i < ids.length; i++) {
        try {
          await window.YakitApp.putPhoto(ids[i], dataUrlToBlob(obj.photos[ids[i]]));
          restored++;
        } catch (e) { console.warn('Fotoğraf geri yüklenemedi:', ids[i], e); }
      }
    }

    if (obj.settings && typeof obj.settings === 'object') {
      Object.keys(DEFAULTS).forEach(function (k) {
        if (obj.settings[k] !== undefined && obj.settings[k] !== null) settings[k] = obj.settings[k];
      });
      validate(); save();
    }

    if (window.YakitApp && window.YakitApp.replaceState) {
      window.YakitApp.replaceState(obj.state);
    } else {
      throw new Error('Uygulama geri yükleme arayüzü bulunamadı');
    }
    return { photoCount: restored, summary: summarizeBackup(obj), safetyBackupId: safety ? safety.id : null };
  }

  async function readBackupFile(file) {
    var text = await file.text();
    var obj;
    try { obj = JSON.parse(text); }
    catch (e) { throw new Error('Dosya geçerli bir JSON değil.'); }
    var err = validateBackup(obj);
    if (err) throw new Error(err);
    return obj;
  }


  // ---------- UYGULAMA İÇİ YEDEK (v10) ----------
  // Ayrı bir IndexedDB veritabanı: ana veri sıfırlansa bile yedekler kalır.
  // İnternet/Drive yoktur; her şey cihazda saklanır.
  var LOCAL_BACKUP_DB = 'yakitTakipBackups';
  var LOCAL_BACKUP_VERSION = 1;
  var localDbPromise = null;

  function openLocalBackupDb() {
    if (localDbPromise) return localDbPromise;
    localDbPromise = new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') { reject(new Error('Bu tarayıcıda IndexedDB yok')); return; }
      var req = indexedDB.open(LOCAL_BACKUP_DB, LOCAL_BACKUP_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Yedek veritabanı açılamadı')); };
    });
    return localDbPromise;
  }

  function localReq(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Yedek işlemi başarısız')); };
    });
  }

  function localTxDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('Yedek yazılamadı')); };
      tx.onabort = function () { reject(tx.error || new Error('Yedek işlemi yarıda kesildi')); };
    });
  }

  async function pruneLocalBackups(keep) {
    var n = Number(keep);
    if ([7, 14, 30].indexOf(n) < 0) n = settings.localBackupKeep || 7;
    var all = await listLocalBackups();
    // v10.1: en yeni güvenlik yedeği normal budamadan korunur
    var safety = null;
    for (var i = 0; i < all.length; i++) { if (all[i].kind === 'safety') { safety = all[i]; break; } }
    var pool = safety ? all.filter(function (m) { return m.id !== safety.id; }) : all;
    var old = pool.slice(n);
    if (!old.length) return 0;
    var db = await openLocalBackupDb();
    var tx = db.transaction('snapshots', 'readwrite');
    var st = tx.objectStore('snapshots');
    old.forEach(function (m) { st.delete(m.id); });
    await localTxDone(tx);
    return old.length;
  }

  // kind: 'auto' | 'manual' | 'safety'. payload = buildBackup çıktısı (fotoğraflar dahil).
  async function createLocalBackup(kind) {
    var payload = await buildBackup({ photos: true });
    var json = JSON.stringify(payload);
    var k = (kind === 'manual' || kind === 'safety') ? kind : 'auto';
    var rec = {
      id: 'lb' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      createdAt: payload.createdAt,
      kind: k,
      bytes: json.length,
      appVersion: payload.appVersion,
      summary: summarizeBackup(payload),
      payload: payload
    };
    var db = await openLocalBackupDb();
    var tx = db.transaction('snapshots', 'readwrite');
    tx.objectStore('snapshots').put(rec);
    await localTxDone(tx);
    set('lastBackupAt', payload.createdAt);
    try { await pruneLocalBackups(settings.localBackupKeep); }
    catch (e) { console.warn('Eski yedekler budanamadı:', e); }
    return { id: rec.id, createdAt: rec.createdAt, kind: rec.kind, bytes: rec.bytes, summary: rec.summary, photoCount: payload.photoCount, warning: payload.photoWarning };
  }

  async function listLocalBackups() {
    var db = await openLocalBackupDb();
    var tx = db.transaction('snapshots', 'readonly');
    var all = await localReq(tx.objectStore('snapshots').getAll());
    return (all || []).map(function (r) {
      return { id: r.id, createdAt: r.createdAt, kind: r.kind, bytes: r.bytes, appVersion: r.appVersion, summary: r.summary };
    }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  }

  async function getLocalBackup(id) {
    var db = await openLocalBackupDb();
    var tx = db.transaction('snapshots', 'readonly');
    var rec = await localReq(tx.objectStore('snapshots').get(id));
    return rec ? rec.payload : null;
  }

  async function deleteLocalBackup(id) {
    var db = await openLocalBackupDb();
    var tx = db.transaction('snapshots', 'readwrite');
    tx.objectStore('snapshots').delete(id);
    await localTxDone(tx);
  }

  async function restoreLocalBackup(id) {
    var payload = await getLocalBackup(id);
    if (!payload) throw new Error('Yedek bulunamadı');
    return restoreBackup(payload, { photos: true });
  }

  // v10.1: otomatik yedek durumu (hata görünür uyarı için) — ayarlardan ayrı tutulur
  var AUTO_STATUS_KEY = 'yakitTakipAutoBackupStatus';
  function getAutoBackupStatus() {
    try {
      var raw = localStorage.getItem(AUTO_STATUS_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      return p && typeof p === 'object' ? p : null;
    } catch (e) { return null; }
  }
  function setAutoBackupStatus(st) {
    try { localStorage.setItem(AUTO_STATUS_KEY, JSON.stringify(st)); } catch (e) {}
  }

  // Açılışta çağrılır: açıksa ve son yedeğin üzerinden 24 saat geçtiyse alır.
  // force=true (tekrar dene) 24 saat kuralını atlar.
  async function maybeAutoBackup(force) {
    if (!settings.autoLocalBackup && !force) return null;
    try {
      if (!force) {
        var all = await listLocalBackups();
        if (all.length) {
          var age = Date.now() - new Date(all[0].createdAt).getTime();
          if (isFinite(age) && age < 24 * 3600 * 1000) {
            setAutoBackupStatus({ ok: true, at: all[0].createdAt, skipped: true });
            return null;
          }
        }
      }
      var r = await createLocalBackup('auto');
      setAutoBackupStatus({ ok: true, at: r.createdAt, error: null });
      return r;
    } catch (e) {
      console.warn('Otomatik yedek alınamadı:', e);
      setAutoBackupStatus({ ok: false, at: new Date().toISOString(), error: String(e && e.message ? e.message : e) });
      return null;
    }
  }

  async function retryAutoBackup() { return maybeAutoBackup(true); }

  // ---------- dışa aktarım ----------
  window.YakitSettings = {
    APP_VERSION: APP_VERSION,
    DEFAULTS: DEFAULTS,
    CURRENCIES: CURRENCIES,
    DATE_FORMATS: DATE_FORMATS,
    VEHICLE_ICONS: VEHICLE_ICONS,
    VEHICLE_COLORS: VEHICLE_COLORS,
    load: load, save: save, get: get, set: set, setMany: setMany,
    kmToDisplay: kmToDisplay, displayToKm: displayToKm,
    litersToDisplay: litersToDisplay, displayToLiters: displayToLiters,
    distanceLabel: distanceLabel, volumeLabel: volumeLabel,
    consumptionFromL100: consumptionFromL100, consumptionToL100: consumptionToL100,
    consumptionLabel: consumptionLabel,
    weekStartLabel: weekStartLabel, weekRange: weekRange, inWeekRange: inWeekRange,
    num: num, money: money, currencySymbol: currencySymbol,
    distance: distance, volume: volume, consumption: consumption,
    pricePerVolume: pricePerVolume, formatDate: formatDate,
    vehicleIcon: vehicleIcon, vehicleColor: vehicleColor, vehicleAvatarHtml: vehicleAvatarHtml,
    buildBackup: buildBackup, downloadBackup: downloadBackup, shareBackup: shareBackup,
    restoreBackup: restoreBackup, readBackupFile: readBackupFile,
    validateBackup: validateBackup, summarizeBackup: summarizeBackup,
    backupFileName: backupFileName,
    dataUrlToBlob: dataUrlToBlob, blobToDataUrl: blobToDataUrl,
    createLocalBackup: createLocalBackup, listLocalBackups: listLocalBackups,
    getLocalBackup: getLocalBackup, deleteLocalBackup: deleteLocalBackup,
    restoreLocalBackup: restoreLocalBackup, maybeAutoBackup: maybeAutoBackup,
    pruneLocalBackups: pruneLocalBackups,
    getAutoBackupStatus: getAutoBackupStatus, retryAutoBackup: retryAutoBackup
  };

  load();
})();
