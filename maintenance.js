/* Yakıt Takip v10.3 — Bakım hatırlatıcıları
 * Bağımsız modül: window.YakitMaintenance
 * Veri: state.reminders (localStorage, ana state ile birlikte).
 * İnternet/push yoktur; uygulama içi uyarı. Tarih veya km — hangisi önce gelirse.
 */
(function () {
  'use strict';

  var SOON_DAYS = 14;
  var SOON_KM = 500;

  var TYPES = {
    oil:        { label: 'Yağ / Servis',     icon: 'gears' },
    inspection: { label: 'Muayene',          icon: 'calendar-days' },
    insurance:  { label: 'Sigorta / Kasko',  icon: 'shield-halved' },
    tires:      { label: 'Lastik',           icon: 'car' },
    custom:     { label: 'Diğer',            icon: 'gear' }
  };

  function app() { return window.YakitApp; }
  function state() { return app() && app().getState ? app().getState() : null; }
  function persist() {
    if (typeof window.saveState === 'function') return window.saveState();
    return false;
  }
  function repaint() {
    if (typeof window.renderAll === 'function') window.renderAll();
    renderHome();
    renderView();
  }
  function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function S() { return window.YakitSettings; }
  function fmtKm(km, dec) { return S() ? S().distance(km, dec) : Math.round(km) + ' km'; }
  function fmtDate(key) { return S() ? S().formatDate(key) : key; }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseKey(key) {
    var p = String(key || '').split('-').map(Number);
    if (!p[0] || !p[1] || !p[2]) return null;
    return new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
  }
  function daysBetween(aKey, bKey) {
    var a = parseKey(aKey), b = parseKey(bKey);
    if (!a || !b) return NaN;
    return Math.round((b - a) / 86400000);
  }
  function addMonths(key, months) {
    var d = parseKey(key);
    if (!d) return '';
    var day = d.getDate();
    d.setMonth(d.getMonth() + Number(months || 0));
    if (d.getDate() < day) d.setDate(0); // ay sonu taşması
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function num(v) { if (v === '' || v == null) return null; var x = Number(v); return isFinite(x) ? x : null; }
  function activeVehicle() {
    var st = state(); if (!st) return null;
    return st.vehicles.find(function (v) { return v.id === st.activeVehicleId; }) || st.vehicles[0] || null;
  }
  function reminders() {
    var st = state();
    return st && Array.isArray(st.reminders) ? st.reminders : [];
  }
  function typeOf(r) { return TYPES[r.type] || TYPES.custom; }

  // ---------- durum hesabı ----------
  function status(r, vehicle, today) {
    today = today || todayKey();
    var odo = vehicle ? Number(vehicle.odometer) || 0 : 0;
    var daysLeft = r.dueDate ? daysBetween(today, r.dueDate) : null;
    var kmLeft = r.dueKm != null && r.dueKm !== '' ? Number(r.dueKm) - odo : null;
    if (r.done) return { level: 'done', daysLeft: daysLeft, kmLeft: kmLeft, score: 9e9 };

    var overdue = (daysLeft != null && daysLeft < 0) || (kmLeft != null && kmLeft <= 0);
    var soon = !overdue && ((daysLeft != null && daysLeft <= SOON_DAYS) || (kmLeft != null && kmLeft <= SOON_KM));
    var level = overdue ? 'overdue' : (soon ? 'soon' : 'ok');

    // Aciliyet skoru: gecikmişler önce, sonra en yakın kalan (gün veya km)
    var score;
    if (overdue) {
      score = -100000 + Math.min(daysLeft != null ? daysLeft : 0, kmLeft != null ? kmLeft : 0);
    } else {
      var dNorm = daysLeft != null ? daysLeft / SOON_DAYS : Infinity;
      var kNorm = kmLeft != null ? kmLeft / SOON_KM : Infinity;
      score = Math.min(dNorm, kNorm);
    }
    return { level: level, daysLeft: daysLeft, kmLeft: kmLeft, score: score };
  }

  function statusLabel(st) {
    if (st.level === 'done') return 'Tamamlandı';
    if (st.level === 'overdue') return 'Gecikti';
    if (st.level === 'soon') return 'Yaklaşıyor';
    return 'Planlandı';
  }
  function statusClasses(level) {
    if (level === 'overdue') return 'bg-rose-100 text-rose-700';
    if (level === 'soon') return 'bg-amber-100 text-amber-700';
    if (level === 'done') return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-600';
  }
  function remainingText(st) {
    var parts = [];
    if (st.daysLeft != null && isFinite(st.daysLeft)) {
      parts.push(st.daysLeft < 0 ? Math.abs(st.daysLeft) + ' gün gecikti' : st.daysLeft + ' gün kaldı');
    }
    if (st.kmLeft != null && isFinite(st.kmLeft)) {
      parts.push(st.kmLeft <= 0 ? fmtKm(Math.abs(st.kmLeft), 0) + ' aşıldı' : fmtKm(st.kmLeft, 0) + ' kaldı');
    }
    return parts.join(' · ');
  }
  function dueText(r) {
    var parts = [];
    if (r.dueDate) parts.push(fmtDate(r.dueDate));
    if (r.dueKm != null && r.dueKm !== '') parts.push(fmtKm(r.dueKm, 0));
    return parts.join(' / ') || 'Hedef yok';
  }

  function sortedForVehicle(vehicleId, includeDone) {
    var v = activeVehicle();
    var list = reminders().filter(function (r) { return r.vehicleId === vehicleId; });
    var withSt = list.map(function (r) { return { r: r, st: status(r, v) }; });
    withSt.sort(function (a, b) {
      var ad = a.r.done ? 1 : 0, bd = b.r.done ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return a.st.score - b.st.score;
    });
    if (!includeDone) withSt = withSt.filter(function (x) { return !x.r.done; });
    return withSt;
  }

  // ---------- ana ekran kartı ----------
  function renderHome() {
    var box = document.getElementById('maintenance-home');
    if (!box) return;
    var v = activeVehicle();
    if (!v) { box.innerHTML = ''; return; }
    var due = sortedForVehicle(v.id, false).filter(function (x) { return x.st.level === 'overdue' || x.st.level === 'soon'; });
    if (!due.length) { box.innerHTML = ''; return; }
    var worst = due[0].st.level;
    var border = worst === 'overdue' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50';
    var icon = worst === 'overdue' ? 'text-rose-500' : 'text-amber-500';
    var title = worst === 'overdue' ? 'Bakım gecikti' : 'Bakım yaklaşıyor';
    box.innerHTML = '<div class="' + border + ' border rounded-2xl p-3 space-y-2">' +
      '<div class="flex items-center gap-2.5">' +
      '<i class="fa-solid fa-triangle-exclamation ' + icon + '"></i>' +
      '<div class="flex-1 min-w-0"><div class="text-[12px] font-bold text-slate-800">' + title + '</div>' +
      '<div class="text-[10px] text-slate-500">' + due.length + ' hatırlatıcı · ' + esc(v.name) + '</div></div>' +
      '<button type="button" onclick="switchView(\'maintenance\')" class="shrink-0 bg-slate-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg">Bakım</button>' +
      '</div>' +
      due.slice(0, 3).map(function (x) {
        return '<div class="flex items-center justify-between gap-2 bg-white/70 rounded-xl px-2.5 py-1.5">' +
          '<span class="text-[11px] font-semibold text-slate-700 truncate">' + esc(x.r.title || typeOf(x.r).label) + '</span>' +
          '<span class="text-[10px] text-slate-500 shrink-0">' + esc(remainingText(x.st)) + '</span></div>';
      }).join('') +
      '</div>';
  }

  // ---------- bakım ekranı ----------
  function renderView() {
    var body = document.getElementById('maintenance-body');
    if (!body) return;
    var v = activeVehicle();
    if (!v) { body.innerHTML = '<div class="text-xs text-slate-500">Araç bulunamadı.</div>'; return; }
    var list = sortedForVehicle(v.id, true);
    var head = '<div class="flex items-center justify-between px-1">' +
      '<div class="text-[11px] text-slate-500">' + esc(v.name) + ' · ' + fmtKm(v.odometer, 0) + '</div>' +
      '<button type="button" id="maintenance-add-btn" class="bg-slate-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg"><i class="fa-solid fa-plus mr-1"></i>Yeni</button>' +
      '</div>';
    if (!list.length) {
      body.innerHTML = head + '<div class="bg-white rounded-2xl border border-slate-100 p-4 text-center space-y-2">' +
        '<i class="fa-solid fa-gears text-2xl text-slate-300"></i>' +
        '<div class="text-xs font-semibold text-slate-600">Henüz bakım hatırlatıcısı yok</div>' +
        '<div class="text-[11px] text-slate-400">Yağ, muayene, sigorta veya lastik için tarih / km hedefi ekleyin.</div></div>';
    } else {
      body.innerHTML = head + list.map(function (x) { return itemHtml(x.r, x.st); }).join('');
    }
    var addBtn = document.getElementById('maintenance-add-btn');
    if (addBtn) addBtn.onclick = function () { openEditor(); };
    body.querySelectorAll('[data-maint-complete]').forEach(function (b) { b.onclick = function () { complete(b.dataset.maintComplete); }; });
    body.querySelectorAll('[data-maint-edit]').forEach(function (b) { b.onclick = function () { openEditor(b.dataset.maintEdit); }; });
    body.querySelectorAll('[data-maint-delete]').forEach(function (b) { b.onclick = function () { remove(b.dataset.maintDelete); }; });
  }

  function itemHtml(r, st) {
    var t = typeOf(r);
    var dis = r.done ? ' opacity-60' : '';
    var completeBtn = r.done ? '' :
      '<button type="button" data-maint-complete="' + esc(r.id) + '" title="Tamamlandı" class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><i class="fa-solid fa-check text-[11px]"></i></button>';
    return '<div class="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm space-y-2' + dis + '">' +
      '<div class="flex items-start gap-2.5">' +
      '<span class="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><i class="fa-solid fa-' + t.icon + ' text-sm"></i></span>' +
      '<div class="flex-1 min-w-0">' +
      '<div class="flex items-center gap-2 flex-wrap"><span class="text-[13px] font-bold text-slate-800">' + esc(r.title || t.label) + '</span>' +
      '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded ' + statusClasses(st.level) + '">' + statusLabel(st) + '</span></div>' +
      '<div class="text-[11px] text-slate-500 mt-0.5">' + esc(t.label) + ' · ' + esc(dueText(r)) + '</div>' +
      (r.done ? '<div class="text-[10px] text-emerald-600 mt-0.5">Tamamlandı' + (r.lastDoneDate ? ': ' + esc(fmtDate(r.lastDoneDate)) : '') + '</div>'
              : '<div class="text-[10px] text-slate-400 mt-0.5">' + esc(remainingText(st)) + '</div>') +
      (r.note ? '<div class="text-[10px] text-slate-400 mt-0.5">' + esc(r.note) + '</div>' : '') +
      '</div>' +
      '<div class="flex gap-1.5 shrink-0">' + completeBtn +
      '<button type="button" data-maint-edit="' + esc(r.id) + '" title="Düzenle" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center"><i class="fa-solid fa-pen text-[11px]"></i></button>' +
      '<button type="button" data-maint-delete="' + esc(r.id) + '" title="Sil" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center"><i class="fa-solid fa-trash text-[11px]"></i></button>' +
      '</div></div></div>';
  }

  // ---------- düzenleyici ----------
  function openEditor(id) {
    var modal = document.getElementById('maintenance-modal');
    if (!modal) return;
    var r = id ? reminders().find(function (x) { return x.id === id; }) : null;
    document.getElementById('maint-edit-id').value = r ? r.id : '';
    document.getElementById('maint-title').textContent = r ? 'Hatırlatıcıyı düzenle' : 'Yeni hatırlatıcı';
    document.getElementById('maint-type').value = r ? r.type : 'oil';
    document.getElementById('maint-name').value = r ? (r.title || '') : '';
    document.getElementById('maint-due-date').value = r && r.dueDate ? r.dueDate : '';
    var v = activeVehicle();
    document.getElementById('maint-due-km').value = r && r.dueKm != null ? r.dueKm : '';
    document.getElementById('maint-interval-km').value = r && r.intervalKm != null ? r.intervalKm : '';
    document.getElementById('maint-interval-months').value = r && r.intervalMonths != null ? r.intervalMonths : '';
    document.getElementById('maint-note').value = r && r.note ? r.note : '';
    var hint = document.getElementById('maint-odo-hint');
    if (hint && v) hint.textContent = 'Şu an: ' + fmtKm(v.odometer, 0);
    modal.classList.remove('hidden');
  }
  function closeEditor() {
    var modal = document.getElementById('maintenance-modal');
    if (modal) modal.classList.add('hidden');
  }
  function saveEditor() {
    var st = state(); if (!st) return;
    var v = activeVehicle(); if (!v) return;
    var id = document.getElementById('maint-edit-id').value;
    var type = document.getElementById('maint-type').value;
    if (!TYPES[type]) type = 'custom';
    var title = document.getElementById('maint-name').value.trim();
    var dueDate = document.getElementById('maint-due-date').value || '';
    var dueKm = num(document.getElementById('maint-due-km').value);
    var intervalKm = num(document.getElementById('maint-interval-km').value);
    var intervalMonths = num(document.getElementById('maint-interval-months').value);
    var note = document.getElementById('maint-note').value.trim();
    if (!dueDate && dueKm == null) { toast('Tarih veya km hedefinden en az biri gerekli'); return; }
    if (dueKm != null && dueKm <= 0) { toast('Km hedefi pozitif olmalı'); return; }
    if (intervalKm != null && intervalKm <= 0) intervalKm = null;
    if (intervalMonths != null && intervalMonths <= 0) intervalMonths = null;
    if (!Array.isArray(st.reminders)) st.reminders = [];
    if (id) {
      var r = st.reminders.find(function (x) { return x.id === id; });
      if (r) Object.assign(r, { type: type, title: title || TYPES[type].label, dueDate: dueDate, dueKm: dueKm, intervalKm: intervalKm, intervalMonths: intervalMonths, note: note, done: false });
    } else {
      st.reminders.push({
        id: 'm' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        vehicleId: v.id, type: type, title: title || TYPES[type].label,
        dueDate: dueDate, dueKm: dueKm, intervalKm: intervalKm, intervalMonths: intervalMonths,
        note: note, done: false, createdAt: new Date().toISOString(), lastDoneDate: '', lastDoneKm: null
      });
    }
    if (!persist()) { toast('Kaydedilemedi'); return; }
    closeEditor();
    repaint();
    toast(id ? 'Hatırlatıcı güncellendi' : 'Hatırlatıcı eklendi');
  }

  function complete(id, opts) {
    var st = state(); if (!st) return;
    var r = st.reminders.find(function (x) { return x.id === id; });
    if (!r || r.done) return;
    var v = st.vehicles.find(function (x) { return x.id === r.vehicleId; }) || activeVehicle();
    var date = (opts && opts.date) || todayKey();
    r.lastDoneDate = date;
    r.lastDoneKm = v ? Number(v.odometer) || 0 : null;
    if (r.intervalKm || r.intervalMonths) {
      r.dueKm = r.intervalKm ? (r.lastDoneKm || 0) + r.intervalKm : null;
      r.dueDate = r.intervalMonths ? addMonths(date, r.intervalMonths) : '';
      r.done = false;
      toast('Tamamlandı · sonraki hedef belirlendi');
    } else {
      r.done = true;
      r.completedAt = new Date().toISOString();
      toast('Tamamlandı olarak işaretlendi');
    }
    persist();
    repaint();
  }

  function remove(id) {
    if (!window.confirm('Bu hatırlatıcı silinsin mi?')) return;
    var st = state(); if (!st) return;
    st.reminders = st.reminders.filter(function (x) { return x.id !== id; });
    persist();
    repaint();
    toast('Hatırlatıcı silindi');
  }

  // ---------- gider kaydıyla ilişkilendirme ----------
  var CATEGORY_TYPE = { 'Bakım / Servis': 'oil', 'Sigorta / Kasko': 'insurance', 'Lastik': 'tires' };
  function onExpenseSaved(expense) {
    if (!expense) return;
    var type = CATEGORY_TYPE[expense.category];
    if (!type) return;
    var r = reminders().find(function (x) { return x.vehicleId === expense.vehicleId && x.type === type && !x.done; });
    if (!r) return;
    var ok = window.confirm('"' + (r.title || TYPES[type].label) + '" hatırlatıcısını tamamlandı olarak işaretleyeyim mi?');
    if (ok) complete(r.id, { date: expense.date || todayKey() });
  }

  function init() {
    var saveBtn = document.getElementById('maint-save-btn');
    var cancelBtn = document.getElementById('maint-cancel-btn');
    if (saveBtn) saveBtn.onclick = saveEditor;
    if (cancelBtn) cancelBtn.onclick = closeEditor;
    renderHome();
    renderView();
  }

  window.YakitMaintenance = {
    TYPES: TYPES, SOON_DAYS: SOON_DAYS, SOON_KM: SOON_KM,
    status: status, statusLabel: statusLabel, remainingText: remainingText, dueText: dueText,
    addMonths: addMonths, daysBetween: daysBetween, sortedForVehicle: sortedForVehicle,
    renderHome: renderHome, renderView: renderView, openEditor: openEditor, closeEditor: closeEditor,
    saveEditor: saveEditor, complete: complete, remove: remove, onExpenseSaved: onExpenseSaved, init: init
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();