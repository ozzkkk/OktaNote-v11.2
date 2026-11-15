/* Yakıt Takip v11.1 — Liste arama / filtre / sıralama / sayfalama
 * Dolumlar (timeline) ve Gezi kaydı (trips) görünümlerinde çalışır.
 * Veriyi değiştirmez; yalnızca gösterilecek alt listeyi üretir.
 */
(function () {
  'use strict';

  var PAGE = 50;

  var st = {
    timeline: { q: '', from: '', to: '', fuel: '', sort: 'date-desc', limit: PAGE, open: false },
    trips: { q: '', from: '', to: '', cat: '', sort: 'date-desc', limit: PAGE, open: false }
  };

  function norm(s) {
    return String(s == null ? '' : s).toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/İ/g, 'i').trim();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function inRange(date, from, to) {
    var d = String(date || '');
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  // ---------- sıralama ----------
  var REFUEL_SORTS = {
    'date-desc': function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) || num(b.odometer) - num(a.odometer); },
    'date-asc': function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')) || num(a.odometer) - num(b.odometer); },
    'odo-desc': function (a, b) { return num(b.odometer) - num(a.odometer); },
    'odo-asc': function (a, b) { return num(a.odometer) - num(b.odometer); },
    'cost-desc': function (a, b) { return num(b.totalCost) - num(a.totalCost); },
    'cost-asc': function (a, b) { return num(a.totalCost) - num(b.totalCost); },
    'liters-desc': function (a, b) { return num(b.liters) - num(a.liters); },
    'price-asc': function (a, b) { return num(a.pricePerLiter) - num(b.pricePerLiter); },
    'price-desc': function (a, b) { return num(b.pricePerLiter) - num(a.pricePerLiter); }
  };

  var TRIP_SORTS = {
    'date-desc': function (a, b) { return String(b.startDate || b.date || '').localeCompare(String(a.startDate || a.date || '')); },
    'date-asc': function (a, b) { return String(a.startDate || a.date || '').localeCompare(String(b.startDate || b.date || '')); },
    'dist-desc': function (a, b) { return num(b.distance) - num(a.distance); },
    'dist-asc': function (a, b) { return num(a.distance) - num(b.distance); }
  };

  function matchRefuel(r, q) {
    if (!q) return true;
    var hay = [r.station, r.stationAddress, r.note, r.fuelType, r.date, r.time,
      r.liters, r.pricePerLiter, r.totalCost, r.odometer].map(norm).join(' ');
    return q.split(/\s+/).every(function (part) { return hay.indexOf(part) !== -1; });
  }

  function matchTrip(t, q) {
    if (!q) return true;
    var hay = [t.title, t.start, t.end, t.note, t.category, t.startDate, t.endDate, t.distance]
      .map(norm).join(' ');
    return q.split(/\s+/).every(function (part) { return hay.indexOf(part) !== -1; });
  }

  function applyRefuels(list) {
    var s = st.timeline;
    var q = norm(s.q);
    var all = (list || []).slice();
    var filtered = all.filter(function (r) {
      if (s.fuel && String(r.fuelType || '') !== s.fuel) return false;
      if (!inRange(r.date, s.from, s.to)) return false;
      return matchRefuel(r, q);
    });
    filtered.sort(REFUEL_SORTS[s.sort] || REFUEL_SORTS['date-desc']);
    return {
      items: filtered.slice(0, s.limit),
      shown: Math.min(s.limit, filtered.length),
      filtered: filtered.length,
      total: all.length,
      hasMore: filtered.length > s.limit,
      active: !!(s.q || s.from || s.to || s.fuel || s.sort !== 'date-desc')
    };
  }

  function applyTrips(list) {
    var s = st.trips;
    var q = norm(s.q);
    var all = (list || []).slice();
    var filtered = all.filter(function (t) {
      if (s.cat && String(t.category || '') !== s.cat) return false;
      if (!inRange(t.startDate || t.date, s.from, s.to)) return false;
      return matchTrip(t, q);
    });
    filtered.sort(TRIP_SORTS[s.sort] || TRIP_SORTS['date-desc']);
    return {
      items: filtered.slice(0, s.limit),
      shown: Math.min(s.limit, filtered.length),
      filtered: filtered.length,
      total: all.length,
      hasMore: filtered.length > s.limit,
      active: !!(s.q || s.from || s.to || s.cat || s.sort !== 'date-desc')
    };
  }

  // ---------- arayüz ----------
  function options(pairs, current) {
    return pairs.map(function (p) {
      return '<option value="' + esc(p[0]) + '"' + (p[0] === current ? ' selected' : '') + '>' + esc(p[1]) + '</option>';
    }).join('');
  }

  function barHtml(view, fuels, cats) {
    var s = st[view];
    var isTrip = view === 'trips';
    var sortPairs = isTrip
      ? [['date-desc', 'Tarih (yeni → eski)'], ['date-asc', 'Tarih (eski → yeni)'], ['dist-desc', 'Mesafe (çok → az)'], ['dist-asc', 'Mesafe (az → çok)']]
      : [['date-desc', 'Tarih (yeni → eski)'], ['date-asc', 'Tarih (eski → yeni)'], ['odo-desc', 'Kilometre (çok → az)'], ['odo-asc', 'Kilometre (az → çok)'],
        ['cost-desc', 'Tutar (çok → az)'], ['cost-asc', 'Tutar (az → çok)'], ['liters-desc', 'Litre (çok → az)'],
        ['price-asc', 'Birim fiyat (ucuz → pahalı)'], ['price-desc', 'Birim fiyat (pahalı → ucuz)']];
    var thirdSel = isTrip
      ? '<select id="browse-cat-' + view + '" aria-label="Kategori" onchange="YakitBrowse.set(\'' + view + '\',\'cat\',this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold">' +
        options([['', 'Tüm kategoriler']].concat((cats || []).map(function (c) { return [c, c]; })), s.cat) + '</select>'
      : '<select id="browse-fuel-' + view + '" aria-label="Yakıt türü" onchange="YakitBrowse.set(\'' + view + '\',\'fuel\',this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold">' +
        options([['', 'Tüm yakıtlar']].concat((fuels || []).map(function (f) { return [f, f]; })), s.fuel) + '</select>';

    return '<div class="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 space-y-2">' +
      '<div class="flex gap-2">' +
        '<div class="relative flex-1 min-w-0">' +
          '<i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true"></i>' +
          '<input type="search" id="browse-q-' + view + '" value="' + esc(s.q) + '" ' +
            'aria-label="' + (isTrip ? 'Gezilerde ara' : 'Dolumlarda ara') + '" ' +
            'placeholder="' + (isTrip ? 'Başlık, yer, not ara…' : 'İstasyon, not, tarih ara…') + '" ' +
            'oninput="YakitBrowse.set(\'' + view + '\',\'q\',this.value,true)" ' +
            'class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-slate-800">' +
        '</div>' +
        '<button type="button" id="browse-toggle-' + view + '" aria-expanded="' + (s.open ? 'true' : 'false') + '" ' +
          'aria-controls="browse-filters-' + view + '" aria-label="Filtreler ve sıralama" ' +
          'onclick="YakitBrowse.toggle(\'' + view + '\')" ' +
          'class="shrink-0 w-10 rounded-xl border flex items-center justify-center ' +
          (s.open || st[view].from || st[view].to || (isTrip ? s.cat : s.fuel) || s.sort !== 'date-desc'
            ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200') + '">' +
          '<i class="fa-solid fa-sliders text-xs" aria-hidden="true"></i>' +
        '</button>' +
      '</div>' +
      '<div id="browse-filters-' + view + '" class="' + (s.open ? '' : 'hidden ') + 'space-y-2 pt-1">' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
          '<label class="block"><span class="block text-[11px] font-medium text-slate-500 mb-1">Başlangıç tarihi</span>' +
            '<input type="date" id="browse-from-' + view + '" value="' + esc(s.from) + '" ' +
            'onchange="YakitBrowse.set(\'' + view + '\',\'from\',this.value)" ' +
            'class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold"></label>' +
          '<label class="block"><span class="block text-[11px] font-medium text-slate-500 mb-1">Bitiş tarihi</span>' +
            '<input type="date" id="browse-to-' + view + '" value="' + esc(s.to) + '" ' +
            'onchange="YakitBrowse.set(\'' + view + '\',\'to\',this.value)" ' +
            'class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold"></label>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' + thirdSel +
          '<select id="browse-sort-' + view + '" aria-label="Sıralama" onchange="YakitBrowse.set(\'' + view + '\',\'sort\',this.value)" ' +
            'class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold">' +
            options(sortPairs, s.sort) + '</select>' +
        '</div>' +
        '<button type="button" onclick="YakitBrowse.reset(\'' + view + '\')" ' +
          'class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-xl">Filtreleri temizle</button>' +
      '</div>' +
      '<div id="browse-summary-' + view + '" class="text-[11px] text-slate-500"></div>' +
    '</div>';
  }

  function summaryText(res) {
    if (!res.total) return '';
    if (res.filtered === res.total && !res.hasMore) return res.total + ' kayıt';
    if (res.active) return res.filtered + ' / ' + res.total + ' kayıt eşleşti · ' + res.shown + ' tanesi gösteriliyor';
    return res.total + ' kayıttan ' + res.shown + ' tanesi gösteriliyor';
  }

  function moreHtml(view, res) {
    if (!res.hasMore) return '';
    var left = res.filtered - res.shown;
    return '<button type="button" onclick="YakitBrowse.more(\'' + view + '\')" ' +
      'class="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold py-3 rounded-2xl shadow-sm">' +
      'Daha fazla yükle (' + left + ' kayıt kaldı)</button>';
  }

  var timer = null;
  function rerender() {
    if (typeof window.renderAll === 'function') window.renderAll();
  }

  function set(view, key, value, debounce) {
    if (!st[view]) return;
    st[view][key] = value;
    if (key !== 'open') st[view].limit = PAGE;
    if (debounce) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        rerender();
        var input = document.getElementById('browse-q-' + view);
        if (input && document.activeElement !== input) { /* odak korunuyor */ }
      }, 220);
      return;
    }
    rerender();
  }

  function toggle(view) {
    if (!st[view]) return;
    st[view].open = !st[view].open;
    rerender();
  }

  function reset(view) {
    if (!st[view]) return;
    var open = st[view].open;
    st[view] = view === 'trips'
      ? { q: '', from: '', to: '', cat: '', sort: 'date-desc', limit: PAGE, open: open }
      : { q: '', from: '', to: '', fuel: '', sort: 'date-desc', limit: PAGE, open: open };
    rerender();
  }

  function more(view) {
    if (!st[view]) return;
    st[view].limit += PAGE;
    rerender();
  }

  // Arama kutusundaki odağı ve imleç konumunu yeniden çizimden sonra koru
  function preserveFocus(view) {
    var active = document.activeElement;
    if (!active || !active.id || active.id.indexOf('browse-') !== 0) return null;
    return { id: active.id, start: active.selectionStart, end: active.selectionEnd };
  }

  function restoreFocus(info) {
    if (!info) return;
    var node = document.getElementById(info.id);
    if (!node) return;
    try {
      node.focus({ preventScroll: true });
      if (info.start != null && node.setSelectionRange && node.type !== 'date') {
        node.setSelectionRange(info.start, info.end);
      }
    } catch (e) {}
  }

  function render(view, res, fuels, cats) {
    var bar = document.getElementById(view === 'trips' ? 'trips-browse' : 'timeline-browse');
    var moreBox = document.getElementById(view === 'trips' ? 'trips-more' : 'timeline-more');
    var focusInfo = preserveFocus(view);
    if (bar) {
      // Arama kutusu zaten varsa ve odaklıysa yalnızca özet/filtre durumu güncellenir
      var existing = document.getElementById('browse-q-' + view);
      if (!existing) {
        bar.innerHTML = barHtml(view, fuels, cats);
      } else {
        var sum = document.getElementById('browse-summary-' + view);
        if (sum) sum.textContent = summaryText(res);
        var filters = document.getElementById('browse-filters-' + view);
        if (filters) filters.classList.toggle('hidden', !st[view].open);
        var btn = document.getElementById('browse-toggle-' + view);
        if (btn) btn.setAttribute('aria-expanded', st[view].open ? 'true' : 'false');
        var selSort = document.getElementById('browse-sort-' + view);
        if (selSort && selSort.value !== st[view].sort) selSort.value = st[view].sort;
        var selThird = document.getElementById((view === 'trips' ? 'browse-cat-' : 'browse-fuel-') + view);
        var want = view === 'trips' ? st.trips.cat : st.timeline.fuel;
        if (selThird && selThird.value !== want) selThird.value = want;
        var f = document.getElementById('browse-from-' + view);
        if (f && f.value !== st[view].from) f.value = st[view].from;
        var t = document.getElementById('browse-to-' + view);
        if (t && t.value !== st[view].to) t.value = st[view].to;
        var qi = document.getElementById('browse-q-' + view);
        if (qi && qi.value !== st[view].q) qi.value = st[view].q;
      }
      var sum2 = document.getElementById('browse-summary-' + view);
      if (sum2) sum2.textContent = summaryText(res);
    }
    if (moreBox) moreBox.innerHTML = moreHtml(view, res);
    restoreFocus(focusInfo);
    if (window.YakitA11y) window.YakitA11y.nameControls(bar || document);
    if (bar && window.YakitI18n && window.YakitI18n.getLang() === 'en' && window.YakitI18n.apply) { try { window.YakitI18n.apply(bar); } catch (e) {} }
  }

  window.YakitBrowse = {
    PAGE: PAGE,
    state: st,
    applyRefuels: applyRefuels,
    applyTrips: applyTrips,
    render: render,
    set: set,
    toggle: toggle,
    reset: reset,
    more: more,
    summaryText: summaryText,
    moreHtml: moreHtml,
    barHtml: barHtml,
    norm: norm
  };
})();
