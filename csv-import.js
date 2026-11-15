/* Oktanote v11.4 — CSV içe aktarma (dolum / gider) */
(function () {
  'use strict';
  function st() { return window.YakitApp && YakitApp.getState(); }
  function save() { return window.saveState && window.saveState(); }
  function toast(m) { if (window.OktanoteUI) OktanoteUI.toast(m); else if (window.showToast) window.showToast(m); }
  function esc(s) { return window.OktanoteUI ? OktanoteUI.esc(s) : String(s); }
  function num(v) {
    if (v == null || v === '') return NaN;
    var s = String(v).trim().replace(/\s/g, '').replace(/[₺$€]/g, '');
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else s = s.replace(',', '.');
    var n = Number(s); return isFinite(n) ? n : NaN;
  }
  function dateKey(v) {
    var s = String(v || '').trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/); if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return m[3] + '-' + String(m[1]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0');
    var d = new Date(s); if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return '';
  }
  function detectDelim(line) {
    var c = (line.match(/,/g) || []).length, s = (line.match(/;/g) || []).length, t = (line.match(/\t/g) || []).length;
    return s > c && s >= t ? ';' : t > c ? '\t' : ',';
  }
  function parseCSV(text) {
    text = String(text || '').replace(/^\uFEFF/, '');
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return { headers: [], rows: [] };
    var delim = detectDelim(lines[0]);
    function split(line) {
      var out = [], cur = '', q = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (q) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') q = false;
          else cur += ch;
        } else {
          if (ch === '"') q = true;
          else if (ch === delim) { out.push(cur); cur = ''; }
          else cur += ch;
        }
      }
      out.push(cur); return out.map(function (x) { return x.trim(); });
    }
    var headers = split(lines[0]);
    var rows = lines.slice(1).map(split);
    return { headers: headers, rows: rows, delim: delim };
  }
  function guess(headers, names) {
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].toLowerCase();
      for (var j = 0; j < names.length; j++) if (h.indexOf(names[j]) > -1) return i;
    }
    return -1;
  }
  var MAPS = {
    refuel: {
      date: ['date', 'tarih', 'datum'], odo: ['odometer', 'km', 'sayaç', 'sayac', 'mileage'],
      liters: ['liters', 'litre', 'volume', 'l'], price: ['price', 'fiyat', 'birim'],
      total: ['total', 'tutar', 'cost', 'toplam'], station: ['station', 'istasyon', 'brand'],
      fuel: ['fuel', 'yakıt', 'yakit'], note: ['note', 'not', 'comment'], time: ['time', 'saat']
    },
    expense: { date: ['date', 'tarih'], category: ['category', 'kategori', 'type'], amount: ['amount', 'tutar', 'cost'], note: ['note', 'not'] }
  };
  var parsed = null, kind = 'refuel';
  function open() {
    var s = st(); if (!s) return;
    var vopts = s.vehicles.map(function (v) { return '<option value="' + esc(v.id) + '"' + (v.id === s.activeVehicleId ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('');
    var html = '<div class="space-y-3">' +
      '<p class="text-xs text-slate-500">Başka uygulamaların CSV dosyalarını içe aktarın. Sütunlar otomatik eşleştirilir; önizlemeden önce kaydedilmez.</p>' +
      '<div class="flex gap-2"><select id="csv-kind" class="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"><option value="refuel">Dolum</option><option value="expense">Gider</option></select>' +
      '<select id="csv-vehicle" class="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm">' + vopts + '</select></div>' +
      '<input id="csv-file" type="file" accept=".csv,text/csv,text/plain" class="w-full text-xs">' +
      '<div id="csv-preview" class="text-xs text-slate-500"></div>' +
      '<button type="button" id="csv-import" disabled class="w-full bg-slate-800 text-white py-2 rounded-xl text-sm font-semibold opacity-40">İçe aktar</button></div>';
    OktanoteUI.open('csv-modal', 'CSV içe aktar', html);
    document.getElementById('csv-kind').addEventListener('change', function () { kind = this.value; if (parsed) preview(); });
    document.getElementById('csv-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { parsed = parseCSV(r.result); preview(); };
      r.readAsText(f);
    });
    document.getElementById('csv-import').addEventListener('click', doImport);
  }
  function mapping() {
    var m = MAPS[kind], out = {};
    Object.keys(m).forEach(function (k) { out[k] = guess(parsed.headers, m[k]); });
    return out;
  }
  function preview() {
    var box = document.getElementById('csv-preview'); if (!box || !parsed) return;
    var m = mapping();
    var ok = 0, bad = 0;
    parsed.rows.forEach(function (row) { if (validateRow(row, m).ok) ok++; else bad++; });
    var cols = Object.keys(m).filter(function (k) { return m[k] > -1; }).map(function (k) { return k + '→' + parsed.headers[m[k]]; }).join(', ');
    box.innerHTML = '<div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">' +
      '<div><b>' + parsed.rows.length + '</b> satır · <b class="text-emerald-600">' + ok + '</b> geçerli · <b class="text-rose-500">' + bad + '</b> hatalı</div>' +
      '<div class="text-[10px] text-slate-400">Eşleşme: ' + esc(cols || 'yok') + '</div></div>';
    var btn = document.getElementById('csv-import');
    btn.disabled = ok === 0; btn.classList.toggle('opacity-40', ok === 0);
  }
  function validateRow(row, m) {
    function cell(k) { return m[k] > -1 ? row[m[k]] : ''; }
    var date = dateKey(cell('date'));
    if (!date) return { ok: false, err: 'tarih' };
    if (kind === 'expense') {
      var amount = num(cell('amount'));
      if (!(amount > 0)) return { ok: false, err: 'tutar' };
      return { ok: true, rec: { date: date, category: cell('category') || 'Diğer', amount: amount, note: cell('note') || 'CSV içe aktarma' } };
    }
    var liters = num(cell('liters')), price = num(cell('price')), total = num(cell('total')), odo = num(cell('odo'));
    if (!(liters > 0)) return { ok: false, err: 'litre' };
    if (!(total >= 0) && !(price >= 0)) return { ok: false, err: 'tutar/fiyat' };
    if (!(total >= 0)) total = liters * price;
    if (!(price >= 0)) price = liters > 0 ? total / liters : 0;
    return { ok: true, rec: { date: date, time: cell('time') || '', odometer: isFinite(odo) ? odo : 0, liters: liters, pricePerLiter: price, totalCost: total, station: cell('station') || '', fuelType: cell('fuel') || '', note: cell('note') || 'CSV içe aktarma', fullTank: true, photos: [] } };
  }
  function doImport() {
    var s = st(); if (!s || !parsed) return;
    var vid = document.getElementById('csv-vehicle').value;
    var m = mapping(); var added = 0, skipped = 0;
    parsed.rows.forEach(function (row, i) {
      var v = validateRow(row, m); if (!v.ok) { skipped++; return; }
      var r = v.rec;
      if (kind === 'refuel') {
        var dup = s.refuels.some(function (x) { return x.vehicleId === vid && x.date === r.date && Number(x.odometer) === Number(r.odometer) && Math.abs(Number(x.liters) - r.liters) < 0.001; });
        if (dup) { skipped++; return; }
        s.refuels.push(Object.assign({ id: 'csv' + Date.now() + '-' + i, vehicleId: vid }, r));
      } else {
        s.expenses.push(Object.assign({ id: 'csvE' + Date.now() + '-' + i, vehicleId: vid }, r));
      }
      added++;
    });
    save(); if (window.renderAll) renderAll();
    OktanoteUI.close('csv-modal');
    toast(added + ' kayıt içe aktarıldı' + (skipped ? ', ' + skipped + ' atlandı' : ''));
  }
  window.YakitCSV = { open: open, parseCSV: parseCSV, num: num, dateKey: dateKey };
})();
