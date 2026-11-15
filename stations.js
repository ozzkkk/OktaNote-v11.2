/* Oktanote v11.4 — istasyon fiyat karşılaştırması (kendi dolumlarından) */
(function () {
  'use strict';
  function st() { return window.YakitApp && YakitApp.getState(); }
  function S() { return window.YakitSettings; }
  function money(n) { return S() ? S().money(n) : String(n); }
  function esc(s) { return window.OktanoteUI ? OktanoteUI.esc(s) : String(s); }
  function active() { var s = st(); return s ? (s.vehicles.find(function (v) { return v.id === s.activeVehicleId; }) || s.vehicles[0]) : null; }
  function compare(vehicleId) {
    var s = st(); if (!s) return [];
    var id = vehicleId || s.activeVehicleId;
    var map = {};
    s.refuels.forEach(function (r) {
      if (r.vehicleId !== id) return;
      var name = String(r.station || '').trim(); if (!name) return;
      var price = Number(r.pricePerLiter) || (r.liters > 0 ? r.totalCost / r.liters : 0);
      if (!(price > 0)) return;
      var key = name.toLowerCase();
      if (!map[key]) map[key] = { name: name, count: 0, sum: 0, min: Infinity, max: 0, latest: 0, latestDate: '', fuel: r.fuelType || '' };
      var g = map[key];
      g.count++; g.sum += price; g.min = Math.min(g.min, price); g.max = Math.max(g.max, price);
      var d = String(r.date || '') + ' ' + String(r.time || '');
      if (d >= g.latestDate) { g.latestDate = d; g.latest = price; g.fuel = r.fuelType || g.fuel; }
    });
    return Object.keys(map).map(function (k) {
      var g = map[k]; g.avg = g.sum / g.count; return g;
    }).sort(function (a, b) { return a.avg - b.avg; });
  }
  function table(rows) {
    if (!rows.length) return '<div class="text-xs text-slate-400">Karşılaştırma için istasyon adı ve fiyat içeren dolum kaydı gerekli.</div>';
    var best = rows[0];
    return '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="text-left text-slate-500 border-b border-slate-200">' +
      '<th class="py-1.5 pr-2">İstasyon</th><th class="py-1.5 pr-2">Ort.</th><th class="py-1.5 pr-2">Son</th><th class="py-1.5 pr-2">Min–Max</th><th class="py-1.5">#</th></tr></thead><tbody>' +
      rows.map(function (g) {
        return '<tr class="border-b border-slate-100 ' + (g === best ? 'bg-emerald-50' : '') + '">' +
          '<td class="py-1.5 pr-2 font-semibold text-slate-800">' + esc(g.name) + (g === best ? ' <span class="text-emerald-600 text-[10px]">en ucuz ort.</span>' : '') + '</td>' +
          '<td class="py-1.5 pr-2">' + money(g.avg) + '</td><td class="py-1.5 pr-2">' + money(g.latest) + '</td>' +
          '<td class="py-1.5 pr-2 text-slate-500">' + money(g.min) + '–' + money(g.max) + '</td><td class="py-1.5">' + g.count + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function open() {
    var v = active(); if (!v) return;
    var rows = compare(v.id);
    OktanoteUI.open('stations-modal', 'İstasyon fiyat karşılaştırması',
      '<div class="space-y-3"><p class="text-xs text-slate-500">Yalnızca sizin dolum kayıtlarınızdan hesaplanır; canlı fiyat servisi yoktur. Birim fiyat litre başınadır.</p>' +
      table(rows) + '</div>');
  }
  function renderReport() {
    var host = document.getElementById('station-compare-box'); if (!host) return;
    var v = active(); if (!v) { host.innerHTML = ''; return; }
    var rows = compare(v.id).slice(0, 3);
    host.innerHTML = '<div class="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-2">' +
      '<div class="flex items-center justify-between"><span class="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5"><i class="fa-solid fa-scale-balanced text-slate-400"></i> İstasyon fiyat karşılaştırması</span>' +
      '<button type="button" onclick="YakitStations.open()" class="no-print text-[11px] text-blue-600 font-semibold">Tümü</button></div>' +
      (rows.length ? rows.map(function (g, i) { return '<div class="flex items-center justify-between text-[11px]"><span class="text-slate-700">' + (i + 1) + '. ' + esc(g.name) + '</span><span class="font-semibold text-slate-800">' + money(g.avg) + '/L</span></div>'; }).join('') : '<div class="text-[11px] text-slate-400">Henüz yeterli kayıt yok.</div>') + '</div>';
  }
  window.YakitStations = { compare: compare, open: open, renderReport: renderReport };
})();
