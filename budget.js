/* Oktanote v11.4 — aylık yakıt bütçesi + tekrarlayan giderler */
(function () {
  'use strict';
  function app() { return window.YakitApp; }
  function st() { return app() && app().getState ? app().getState() : null; }
  function save() { if (window.saveState) return window.saveState(); return false; }
  function repaint() { if (window.renderAll) window.renderAll(); renderHome(); }
  function S() { return window.YakitSettings; }
  function money(n) { return S() ? S().money(n) : String(n); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function monthKey(d) { return String(d || today()).slice(0, 7); }
  function active() { var s = st(); return s ? (s.vehicles.find(function (v) { return v.id === s.activeVehicleId; }) || s.vehicles[0]) : null; }
  function esc(s) { return window.OktanoteUI ? OktanoteUI.esc(s) : String(s); }
  function addMonths(key, m) {
    var p = String(key).split('-').map(Number); var d = new Date(p[0], p[1] - 1, p[2] || 1);
    var day = d.getDate(); d.setMonth(d.getMonth() + Number(m || 1));
    if (d.getDate() < day) d.setDate(0);
    return d.toISOString().slice(0, 10);
  }
  function ensure() {
    var s = st(); if (!s) return;
    if (!s.budgets || typeof s.budgets !== 'object') s.budgets = {};
    if (!Array.isArray(s.recurring)) s.recurring = [];
  }
  function status(vehicleId) {
    var s = st(); if (!s) return null;
    ensure();
    var id = vehicleId || s.activeVehicleId;
    var budget = Number(s.budgets[id]) || 0;
    var mk = monthKey();
    var spent = s.refuels.filter(function (r) { return r.vehicleId === id && String(r.date || '').slice(0, 7) === mk; })
      .reduce(function (a, r) { return a + (Number(r.totalCost) || 0); }, 0);
    return { budget: budget, spent: spent, pct: budget > 0 ? Math.min(999, Math.round(spent / budget * 100)) : 0, month: mk };
  }
  function renderHome() {
    var host = document.getElementById('budget-home'); if (!host) return;
    var v = active(); if (!v) { host.innerHTML = ''; return; }
    var b = status(v.id);
    if (!b || b.budget <= 0) {
      host.innerHTML = '<button type="button" onclick="YakitBudget.openSettings()" class="no-print w-full text-left bg-white rounded-2xl p-3 border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-2"><i class="fa-solid fa-coins text-slate-400"></i> Aylık yakıt bütçesi belirle</button>';
      return;
    }
    var over = b.spent > b.budget;
    var color = over ? 'bg-rose-500' : b.pct >= 90 ? 'bg-amber-500' : 'bg-emerald-500';
    host.innerHTML = '<div class="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">' +
      '<div class="flex items-center justify-between mb-1.5"><div class="text-xs font-bold text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-coins text-slate-400"></i> Aylık yakıt bütçesi</div>' +
      '<button type="button" onclick="YakitBudget.openSettings()" class="no-print text-[11px] text-blue-600 font-semibold">Düzenle</button></div>' +
      '<div class="flex items-end justify-between text-sm"><span class="font-bold ' + (over ? 'text-rose-600' : 'text-slate-800') + '">' + money(b.spent) + '</span>' +
      '<span class="text-[11px] text-slate-500">/ ' + money(b.budget) + ' · %' + b.pct + '</span></div>' +
      '<div class="oktanote-progress mt-2 h-2 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full ' + color + '" style="width:' + Math.min(100, b.pct) + '%"></div></div>' +
      (over ? '<div class="mt-1.5 text-[11px] text-rose-600 font-semibold">Bütçe aşıldı</div>' : '') + '</div>';
  }
  function openSettings() {
    var v = active(); if (!v) return; ensure();
    var s = st(); var cur = Number(s.budgets[v.id]) || '';
    var html = '<div class="space-y-3">' +
      '<p class="text-xs text-slate-500">Bu araç için aylık yakıt bütçesi. Ana sayfada ilerleme gösterilir.</p>' +
      '<label class="block text-xs font-semibold text-slate-600">Aylık bütçe</label>' +
      '<input id="budget-input" type="number" min="0" step="0.01" value="' + esc(cur) + '" class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">' +
      '<div class="flex gap-2"><button type="button" id="budget-save" class="flex-1 bg-slate-800 text-white py-2 rounded-xl text-sm font-semibold">Kaydet</button>' +
      '<button type="button" id="budget-clear" class="px-3 bg-slate-100 text-slate-600 py-2 rounded-xl text-sm">Kaldır</button></div></div>';
    OktanoteUI.open('budget-modal', 'Aylık bütçe', html);
    document.getElementById('budget-save').addEventListener('click', function () {
      var val = Number(document.getElementById('budget-input').value) || 0;
      s.budgets[v.id] = val > 0 ? val : 0; save(); repaint(); OktanoteUI.close('budget-modal'); OktanoteUI.toast('Bütçe güncellendi');
      if (window.YakitNotify) YakitNotify.checkAll();
    });
    document.getElementById('budget-clear').addEventListener('click', function () {
      s.budgets[v.id] = 0; save(); repaint(); OktanoteUI.close('budget-modal');
    });
  }
  // ---------- tekrarlayan giderler ----------
  function listFor(vehicleId) { ensure(); var s = st(); return s.recurring.filter(function (r) { return r.vehicleId === vehicleId; }); }
  function openRecurring() {
    var v = active(); if (!v) return; ensure();
    var rows = listFor(v.id);
    var html = '<div class="space-y-3">' +
      '<p class="text-xs text-slate-500">Sigorta, bakım gibi giderler zamanı gelince otomatik eklenir.</p>' +
      '<div class="space-y-2">' + (rows.length ? rows.map(function (r) {
        return '<div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">' +
          '<div><div class="text-sm font-semibold text-slate-800">' + esc(r.category) + ' · ' + money(r.amount) + '</div>' +
          '<div class="text-[11px] text-slate-500">Her ' + r.intervalMonths + ' ayda bir · sonraki: ' + esc(r.nextDate) + '</div></div>' +
          '<button type="button" data-rec-del="' + esc(r.id) + '" class="no-print text-rose-500 text-xs font-semibold">Sil</button></div>';
      }).join('') : '<div class="text-xs text-slate-400">Tekrarlayan gider yok.</div>') + '</div>' +
      '<div class="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">' +
      '<div class="text-xs font-bold text-slate-700">Yeni tekrarlayan gider</div>' +
      '<input id="rec-category" placeholder="Kategori (Sigorta, Bakım…)" class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">' +
      '<div class="flex gap-2"><input id="rec-amount" type="number" min="0" step="0.01" placeholder="Tutar" class="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm">' +
      '<input id="rec-interval" type="number" min="1" step="1" value="12" placeholder="Ay" class="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm"></div>' +
      '<input id="rec-next" type="date" value="' + today() + '" class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">' +
      '<button type="button" id="rec-add" class="w-full bg-slate-800 text-white py-2 rounded-xl text-sm font-semibold">Ekle</button></div></div>';
    OktanoteUI.open('recurring-modal', 'Tekrarlayan giderler', html);
    document.getElementById('rec-add').addEventListener('click', function () {
      var cat = document.getElementById('rec-category').value.trim();
      var amount = Number(document.getElementById('rec-amount').value);
      var interval = Math.max(1, Number(document.getElementById('rec-interval').value) || 1);
      var next = document.getElementById('rec-next').value || today();
      if (!cat || !(amount > 0)) { OktanoteUI.toast('Kategori ve tutar girin'); return; }
      st().recurring.push({ id: 'rec' + Date.now(), vehicleId: v.id, category: cat, amount: amount, intervalMonths: interval, nextDate: next, note: '', active: true });
      save(); openRecurring(); OktanoteUI.toast('Tekrarlayan gider eklendi');
    });
    OktanoteUI.body('recurring-modal').querySelectorAll('[data-rec-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = st(); s.recurring = s.recurring.filter(function (r) { return r.id !== b.getAttribute('data-rec-del'); });
        save(); openRecurring();
      });
    });
  }
  function processDue() {
    var s = st(); if (!s) return 0; ensure();
    var t = today(); var added = 0;
    s.recurring.forEach(function (r) {
      if (r.active === false) return;
      var guard = 0;
      while (r.nextDate && r.nextDate <= t && guard < 120) {
        s.expenses.push({ id: 'e' + Date.now() + '-' + added, vehicleId: r.vehicleId, category: r.category, amount: Number(r.amount) || 0, date: r.nextDate, note: 'Tekrarlayan gider' });
        r.lastAdded = r.nextDate;
        r.nextDate = addMonths(r.nextDate, Math.max(1, Number(r.intervalMonths) || 1));
        added++; guard++;
      }
    });
    if (added) {
      save(); repaint();
      OktanoteUI.toast(added + ' tekrarlayan gider eklendi');
      if (window.YakitNotify) YakitNotify.once('recurring-' + t, 'Tekrarlayan gider', added + ' gider otomatik eklendi.');
    }
    return added;
  }
  document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { ensure(); processDue(); renderHome(); }, 800); });
  window.YakitBudget = { status: status, renderHome: renderHome, openSettings: openSettings, openRecurring: openRecurring, processDue: processDue, listFor: listFor };
})();
