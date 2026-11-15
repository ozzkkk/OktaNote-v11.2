/* Yakıt Takip v11.1 — Çevrimdışı SVG grafikler (kütüphane yok)
 * 1) Tüketim eğrisi (tam depo aralıkları)   2) Yakıt fiyatı eğrisi
 * 3) Son 12 ayın maliyet sütunları (yakıt + diğer)
 * Değerler kullanıcının birim ayarlarına göre çizilir; veri dışarı çıkmaz.
 */
(function () {
  'use strict';

  var W = 320, H = 130, PAD_L = 6, PAD_R = 6, PAD_T = 14, PAD_B = 22;

  function S() { return window.YakitSettings || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nf(v, dec) {
    var s = window.YakitSettings;
    if (s && s.num) return s.num(v, dec);
    return Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function money(v) { var s = S(); return s && s.money ? s.money(v) : '₺' + nf(v, 2); }
  function shortDate(iso) {
    var s = S();
    if (s && s.formatDate) return s.formatDate(iso);
    return String(iso || '');
  }
  function monthLabel(key) {
    var months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    var m = Number(String(key || '').slice(5, 7));
    return months[m - 1] || String(key || '');
  }

  function extent(vals) {
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (min === max) { min = min - Math.abs(min || 1) * 0.1; max = max + Math.abs(max || 1) * 0.1; }
    var pad = (max - min) * 0.12;
    return { min: min - pad, max: max + pad, rawMin: Math.min.apply(null, vals), rawMax: Math.max.apply(null, vals) };
  }

  function isEn() { return !!(window.YakitI18n && window.YakitI18n.getLang && window.YakitI18n.getLang() === 'en'); }

  function empty(msg) {
    return '<div class="text-center text-[11px] text-slate-400 py-6">' + esc(msg) + '</div>';
  }

  // ---------- çizgi grafik ----------
  function lineChart(opts) {
    var pts = opts.points || [];
    if (pts.length < 2) return empty(opts.emptyText || 'Grafik için en az 2 kayıt gerekir.');
    var vals = pts.map(function (p) { return p.value; });
    var ex = extent(vals);
    var innerW = W - PAD_L - PAD_R, innerH = H - PAD_T - PAD_B;
    var x = function (i) { return PAD_L + (pts.length === 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW); };
    var y = function (v) { return PAD_T + innerH - ((v - ex.min) / (ex.max - ex.min)) * innerH; };
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;

    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1); }).join(' ');
    var area = line + ' L' + x(pts.length - 1).toFixed(1) + ' ' + (PAD_T + innerH) + ' L' + x(0).toFixed(1) + ' ' + (PAD_T + innerH) + ' Z';
    var id = opts.id;
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="3.2" fill="' + opts.color + '" ' +
        'stroke="#fff" stroke-width="1.2" data-i="' + i + '" class="yt-dot" style="cursor:pointer">' +
        '<title>' + esc(shortDate(p.date) + ': ' + opts.fmt(p.value)) + '</title></circle>';
    }).join('');

    var title = isEn() ? (opts.titleEn || opts.title) : opts.title;
    var aria = isEn()
      ? title + ': ' + pts.length + ' records, lowest ' + opts.fmt(ex.rawMin) + ', highest ' + opts.fmt(ex.rawMax) +
        ', average ' + opts.fmt(avg) + ', latest ' + opts.fmt(vals[vals.length - 1])
      : title + ': ' + pts.length + ' kayıt, en düşük ' + opts.fmt(ex.rawMin) +
        ', en yüksek ' + opts.fmt(ex.rawMax) + ', ortalama ' + opts.fmt(avg) + ', son ' + opts.fmt(vals[vals.length - 1]);

    return '<div class="space-y-1">' +
      '<div class="flex items-center justify-between text-[11px]">' +
        '<span class="font-semibold text-slate-500">' + esc(opts.unit) + '</span>' +
        '<span class="text-slate-400">ort. <b class="text-slate-600">' + esc(opts.fmt(avg)) + '</b></span>' +
      '</div>' +
      '<svg id="' + id + '" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="auto" role="img" ' +
        'aria-label="' + esc(aria) + '" tabindex="0" style="display:block;touch-action:pan-y">' +
        '<defs><linearGradient id="' + id + '-g" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="' + opts.color + '" stop-opacity="0.22"/>' +
          '<stop offset="100%" stop-color="' + opts.color + '" stop-opacity="0.02"/>' +
        '</linearGradient></defs>' +
        '<line x1="' + PAD_L + '" y1="' + (PAD_T + innerH) + '" x2="' + (W - PAD_R) + '" y2="' + (PAD_T + innerH) + '" stroke="#e2e8f0" stroke-width="1"/>' +
        '<line x1="' + PAD_L + '" y1="' + y(avg).toFixed(1) + '" x2="' + (W - PAD_R) + '" y2="' + y(avg).toFixed(1) + '" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3"/>' +
        '<path d="' + area + '" fill="url(#' + id + '-g)"/>' +
        '<path d="' + line + '" fill="none" stroke="' + opts.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
        dots +
        '<text x="' + PAD_L + '" y="10" font-size="8" fill="#94a3b8">' + esc(opts.fmt(ex.rawMax)) + '</text>' +
        '<text x="' + (W - PAD_R) + '" y="10" font-size="8" fill="#94a3b8" text-anchor="end">' + esc(opts.fmt(ex.rawMin)) + '</text>' +
        '<text x="' + PAD_L + '" y="' + (H - 6) + '" font-size="8" fill="#94a3b8">' + esc(shortDate(pts[0].date)) + '</text>' +
        '<text x="' + (W - PAD_R) + '" y="' + (H - 6) + '" font-size="8" fill="#94a3b8" text-anchor="end">' + esc(shortDate(pts[pts.length - 1].date)) + '</text>' +
      '</svg>' +
      '<div id="' + id + '-read" class="text-[11px] text-slate-500 min-h-[16px]" aria-live="polite">' +
        'Son: <b class="text-slate-700">' + esc(opts.fmt(vals[vals.length - 1])) + '</b> · ' + esc(shortDate(pts[pts.length - 1].date)) +
      '</div>' +
    '</div>';
  }

  // ---------- sütun grafik ----------
  function barChart(opts) {
    var bars = opts.bars || [];
    if (!bars.length || bars.every(function (b) { return !b.fuel && !b.other; })) {
      return empty(opts.emptyText || 'Grafik için kayıt gerekir.');
    }
    var totals = bars.map(function (b) { return b.fuel + b.other; });
    var max = Math.max.apply(null, totals) || 1;
    var innerW = W - PAD_L - PAD_R, innerH = H - PAD_T - PAD_B;
    var slot = innerW / bars.length;
    var bw = Math.max(6, Math.min(18, slot * 0.62));
    var rects = '', labels = '';
    bars.forEach(function (b, i) {
      var cx = PAD_L + slot * i + slot / 2;
      var hF = (b.fuel / max) * innerH, hO = (b.other / max) * innerH;
      var yF = PAD_T + innerH - hF, yO = yF - hO;
      if (hF > 0) rects += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yF.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.8, hF).toFixed(1) + '" rx="2" fill="#0f172a"><title>' + esc(b.key + ' yakıt: ' + money(b.fuel)) + '</title></rect>';
      if (hO > 0) rects += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yO.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.8, hO).toFixed(1) + '" rx="2" fill="#f59e0b"><title>' + esc(b.key + ' diğer: ' + money(b.other)) + '</title></rect>';
      labels += '<text x="' + cx.toFixed(1) + '" y="' + (H - 6) + '" font-size="7.5" fill="#94a3b8" text-anchor="middle">' + esc(monthLabel(b.key)) + '</text>';
    });
    var sum = totals.reduce(function (a, b) { return a + b; }, 0);
    var titleB = isEn() ? (opts.titleEn || opts.title) : opts.title;
    var aria = isEn()
      ? titleB + ': last ' + bars.length + ' months, total ' + money(sum) + ', highest month ' + money(max)
      : titleB + ': son ' + bars.length + ' ay, toplam ' + money(sum) + ', en yüksek ay ' + money(max);
    return '<div class="space-y-1">' +
      '<div class="flex items-center justify-between text-[11px]">' +
        '<span class="font-semibold text-slate-500">En yüksek ay: ' + esc(money(max)) + '</span>' +
        '<span class="flex items-center gap-2 text-slate-400">' +
          '<span class="flex items-center gap-1"><span style="width:8px;height:8px;border-radius:2px;background:#0f172a;display:inline-block"></span>Yakıt</span>' +
          '<span class="flex items-center gap-1"><span style="width:8px;height:8px;border-radius:2px;background:#f59e0b;display:inline-block"></span>Diğer</span>' +
        '</span>' +
      '</div>' +
      '<svg id="' + opts.id + '" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="auto" role="img" aria-label="' + esc(aria) + '" style="display:block">' +
        '<line x1="' + PAD_L + '" y1="' + (PAD_T + innerH) + '" x2="' + (W - PAD_R) + '" y2="' + (PAD_T + innerH) + '" stroke="#e2e8f0" stroke-width="1"/>' +
        rects + labels +
      '</svg>' +
    '</div>';
  }

  // ---------- veri hazırlama ----------
  function buildData(input) {
    var s = S();
    var refuels = (input.refuels || []).slice().sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
    var expenses = input.expenses || [];
    var intervals = input.intervals || [];
    var byId = new Map(refuels.map(function (r) { return [r.id, r]; }));

    var consPts = [];
    intervals.forEach(function (iv) {
      var r = byId.get(iv.endId);
      if (!r || !isFinite(iv.l100)) return;
      consPts.push({ date: r.date, value: s && s.consumptionFromL100 ? s.consumptionFromL100(iv.l100) : iv.l100 });
    });
    consPts.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    if (consPts.length > 30) consPts = consPts.slice(consPts.length - 30);

    var pricePts = refuels.filter(function (r) { return Number(r.pricePerLiter) > 0; })
      .map(function (r) { return { date: r.date, value: s && s.litersToDisplay ? Number(r.pricePerLiter) / (s.litersToDisplay(1) || 1) : Number(r.pricePerLiter) }; });
    if (pricePts.length > 30) pricePts = pricePts.slice(pricePts.length - 30);

    // Son 12 ay
    var keys = [];
    var now = new Date();
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    var map = new Map(keys.map(function (k) { return [k, { key: k, fuel: 0, other: 0 }]; }));
    refuels.forEach(function (r) {
      var k = String(r.date || '').slice(0, 7);
      if (map.has(k)) map.get(k).fuel += Number(r.totalCost || 0);
    });
    expenses.forEach(function (e) {
      var k = String(e.date || '').slice(0, 7);
      if (map.has(k)) map.get(k).other += Number(e.amount || 0);
    });

    return { consPts: consPts, pricePts: pricePts, bars: keys.map(function (k) { return map.get(k); }) };
  }

  function consFmt(v) { var s = S(); return nf(v, 1) + ' ' + (s && s.consumptionLabel ? s.consumptionLabel() : 'L/100km'); }
  function priceFmt(v) { var s = S(); return nf(v, 2) + ' ' + (s && s.currencySymbol ? s.currencySymbol() : '₺') + '/' + (s && s.volumeLabel ? s.volumeLabel() : 'L'); }

  function wire(id, points, fmt) {
    var svg = document.getElementById(id);
    if (!svg) return;
    var read = document.getElementById(id + '-read');
    var idx = points.length - 1;
    function show(i) {
      if (i < 0) i = 0;
      if (i > points.length - 1) i = points.length - 1;
      idx = i;
      var p = points[i];
      if (read) read.innerHTML = esc(shortDate(p.date)) + ': <b class="text-slate-700">' + esc(fmt(p.value)) + '</b> (' + (i + 1) + '/' + points.length + ')';
      var dots = svg.querySelectorAll('.yt-dot');
      for (var k = 0; k < dots.length; k++) dots[k].setAttribute('r', k === i ? '4.6' : '3.2');
    }
    svg.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t && t.dataset && t.dataset.i != null) show(Number(t.dataset.i));
    });
    svg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); show(idx - 1); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); show(idx + 1); }
      else if (ev.key === 'Home') { ev.preventDefault(); show(0); }
      else if (ev.key === 'End') { ev.preventDefault(); show(points.length - 1); }
    });
  }

  function render(input) {
    var data = buildData(input || {});
    var c = document.getElementById('chart-consumption');
    var p = document.getElementById('chart-price');
    var m = document.getElementById('chart-monthly');
    if (c) {
      c.innerHTML = lineChart({
        id: 'svg-consumption', points: data.consPts, color: '#059669', unit: (S() && S().consumptionLabel) ? S().consumptionLabel() : 'L/100km',
        title: 'Yakıt tüketimi', titleEn: 'Fuel consumption', fmt: consFmt, emptyText: 'Tüketim grafiği için arka arkaya iki tam depo dolumu gerekir.'
      });
      wire('svg-consumption', data.consPts, consFmt);
    }
    if (p) {
      p.innerHTML = lineChart({
        id: 'svg-price', points: data.pricePts, color: '#2563eb', unit: ((S() && S().currencySymbol) ? S().currencySymbol() : '₺') + '/' + ((S() && S().volumeLabel) ? S().volumeLabel() : 'L'),
        title: 'Yakıt fiyatı', titleEn: 'Fuel price', fmt: priceFmt, emptyText: 'Fiyat grafiği için en az 2 dolum gerekir.'
      });
      wire('svg-price', data.pricePts, priceFmt);
    }
    if (m) {
      m.innerHTML = barChart({ id: 'svg-monthly', bars: data.bars, title: 'Aylık maliyet', titleEn: 'Monthly cost', emptyText: 'Son 12 ayda kayıt yok.' });
    }
    return data;
  }

  window.YakitCharts = {
    render: render,
    buildData: buildData,
    lineChart: lineChart,
    barChart: barChart,
    consFmt: consFmt,
    priceFmt: priceFmt
  };
})();
