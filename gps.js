/* Oktanote v11.4 — GPS ile gezi takibi (ekran açıkken) */
(function () {
  'use strict';
  var watchId = null, points = [], distance = 0, startedAt = null, timer = null;
  function st() { return window.YakitApp && YakitApp.getState(); }
  function save() { return window.saveState && window.saveState(); }
  function toast(m) { if (window.OktanoteUI) OktanoteUI.toast(m); else if (window.showToast) window.showToast(m); }
  function S() { return window.YakitSettings; }
  function distLabel() { return S() && S().get().distanceUnit === 'mi' ? 'mi' : 'km'; }
  function toDisplay(km) { return S() && S().get().distanceUnit === 'mi' ? km * 0.621371 : km; }
  function haversine(a, b) {
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function supported() { return 'geolocation' in navigator; }
  function renderPanel() {
    var host = document.getElementById('gps-panel'); if (!host) return;
    if (watchId == null) {
      host.innerHTML = '<button type="button" id="gps-start" class="no-print w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"><i class="fa-solid fa-location-crosshairs"></i> GPS ile gezi başlat</button>' +
        '<p class="no-print text-[10px] text-slate-400 mt-1">Konum izni ister; ekran açıkken ölçer. Arka planda çalışmaz.</p>';
      var b = document.getElementById('gps-start'); if (b) b.addEventListener('click', start);
      return;
    }
    var sec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    var mm = String(Math.floor(sec / 60)).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
    host.innerHTML = '<div class="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2">' +
      '<div class="flex items-center justify-between"><span class="text-xs font-bold text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-location-crosshairs text-emerald-500"></i> GPS gezisi sürüyor</span>' +
      '<span class="text-[11px] text-slate-500">' + mm + ':' + ss + '</span></div>' +
      '<div class="text-2xl font-bold text-slate-800">' + (S() ? S().num(toDisplay(distance), 2) : distance.toFixed(2)) + ' <span class="text-sm text-slate-500">' + distLabel() + '</span></div>' +
      '<div class="text-[11px] text-slate-500">' + points.length + ' nokta</div>' +
      '<div class="flex gap-2"><button type="button" id="gps-stop" class="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-semibold">Bitir ve kaydet</button>' +
      '<button type="button" id="gps-cancel" class="px-3 bg-slate-100 text-slate-600 py-2 rounded-xl text-sm">İptal</button></div></div>';
    document.getElementById('gps-stop').addEventListener('click', stop);
    document.getElementById('gps-cancel').addEventListener('click', cancel);
  }
  function onPos(pos) {
    var c = pos.coords;
    if (c.accuracy != null && c.accuracy > 100) return;
    var p = { lat: c.latitude, lon: c.longitude, t: Date.now(), acc: c.accuracy };
    if (points.length) {
      var d = haversine(points[points.length - 1], p);
      if (d > 0.005) distance += d; // 5 m altı gürültüyü at
    }
    points.push(p); renderPanel();
  }
  function onErr(err) { toast('Konum alınamadı: ' + (err && err.message ? err.message : 'izin gerekli')); }
  function start() {
    if (!supported()) { toast('Tarayıcı konum desteklemiyor'); return; }
    points = []; distance = 0; startedAt = Date.now();
    try {
      watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
    } catch (e) { watchId = null; toast('GPS başlatılamadı'); return; }
    timer = setInterval(renderPanel, 1000);
    renderPanel();
  }
  function cleanup() {
    if (watchId != null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} }
    watchId = null; if (timer) clearInterval(timer); timer = null;
  }
  function cancel() { cleanup(); points = []; distance = 0; startedAt = null; renderPanel(); }
  function stop() {
    var s = st(); if (!s) return;
    var v = s.vehicles.find(function (x) { return x.id === s.activeVehicleId; }) || s.vehicles[0];
    var km = Math.round(distance * 100) / 100;
    var sdisp = S() && S().get().distanceUnit === 'mi' ? km * 0.621371 : km;
    var start = points[0], end = points[points.length - 1];
    var now = new Date();
    s.trips.push({
      id: 'gps' + Date.now(), vehicleId: v.id, title: 'GPS gezisi',
      start: start ? ('GPS ' + start.lat.toFixed(4) + ',' + start.lon.toFixed(4)) : 'GPS başlangıç',
      end: end ? ('GPS ' + end.lat.toFixed(4) + ',' + end.lon.toFixed(4)) : 'GPS bitiş',
      startDate: now.toISOString().slice(0, 10), startTime: startedAt ? new Date(startedAt).toTimeString().slice(0, 5) : now.toTimeString().slice(0, 5),
      endDate: now.toISOString().slice(0, 10), endTime: now.toTimeString().slice(0, 5),
      startOdo: v.odometer, endOdo: v.odometer + Math.round(sdisp), distance: Math.round(sdisp * 100) / 100,
      category: 'Diğer', note: 'GPS ile ölçüldü · ' + points.length + ' nokta'
    });
    save(); cleanup(); points = []; distance = 0; startedAt = null;
    if (window.renderAll) renderAll(); renderPanel();
    toast('GPS gezisi kaydedildi');
  }
  document.addEventListener('DOMContentLoaded', renderPanel);
  window.YakitGPS = { supported: supported, start: start, stop: stop, cancel: cancel, renderPanel: renderPanel, haversine: haversine, state: function () { return { active: watchId != null, distance: distance, points: points.length }; } };
})();
