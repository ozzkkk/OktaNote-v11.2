/* Oktanote v11.4 — yerel bildirimler (push sunucusu yok) */
(function () {
  'use strict';
  var LOG_KEY = 'oktanoteNotifyLog';
  function S() { return window.YakitSettings; }
  function enabled() { return !!(S() && S().get().notifications); }
  function supported() { return 'Notification' in window; }
  function permission() { return supported() ? Notification.permission : 'unsupported'; }
  function log() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '{}'); } catch (e) { return {}; } }
  function saveLog(l) { try { localStorage.setItem(LOG_KEY, JSON.stringify(l)); } catch (e) {} }
  function today() { return new Date().toISOString().slice(0, 10); }
  function once(key, title, body) {
    var l = log();
    if (l[key] === today()) return false;
    l[key] = today(); saveLog(l);
    return notify(title, body, key);
  }
  function notify(title, body, tag) {
    if (!enabled()) return false;
    if (!supported() || Notification.permission !== 'granted') return false;
    try {
      var n = new Notification(title, { body: body || '', tag: tag || title, icon: './icon-192.png' });
      setTimeout(function () { try { n.close(); } catch (e) {} }, 8000);
      return true;
    } catch (e) { return false; }
  }
  async function requestPermission() {
    if (!supported()) { if (window.OktanoteUI) OktanoteUI.toast('Bu tarayıcı bildirimi desteklemiyor'); return 'unsupported'; }
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') { if (window.OktanoteUI) OktanoteUI.toast('Bildirim izni reddedilmiş; tarayıcı ayarlarından açın'); return 'denied'; }
    try { return await Notification.requestPermission(); } catch (e) { return Notification.permission; }
  }
  async function toggle() {
    var s = S().get();
    if (!s.notifications) {
      var p = await requestPermission();
      if (p !== 'granted') { S().set('notifications', false); if (window.YakitSettingsUI) YakitSettingsUI.render(); return false; }
      S().set('notifications', true);
      if (window.OktanoteUI) OktanoteUI.toast('Bildirimler açık');
      notify('Oktanote', 'Bildirimler etkinleştirildi.');
    } else {
      S().set('notifications', false);
      if (window.OktanoteUI) OktanoteUI.toast('Bildirimler kapalı');
    }
    if (window.YakitSettingsUI) YakitSettingsUI.render();
    return enabled();
  }
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function checkAll() {
    if (!enabled() || !window.YakitApp) return;
    var st = YakitApp.getState(); if (!st) return;
    var v = st.vehicles.find(function (x) { return x.id === st.activeVehicleId; }) || st.vehicles[0];
    var t = today();
    // bakım
    var due = (st.reminders || []).filter(function (r) {
      if (r.done) return false;
      var d = r.dueDate ? daysBetween(t, r.dueDate) : null;
      var km = r.dueKm != null ? Number(r.dueKm) - (v ? v.odometer : 0) : null;
      return (d != null && d <= 14) || (km != null && km <= 500);
    });
    if (due.length) once('maintenance-' + t, 'Bakım hatırlatması', due.length + ' bakım kaydı yaklaşıyor veya gecikti.');
    // bütçe
    if (window.YakitBudget && v) {
      var b = YakitBudget.status(v.id);
      if (b && b.budget > 0 && b.spent >= b.budget) once('budget-' + v.id + '-' + t.slice(0, 7), 'Bütçe aşıldı', 'Bu ayki yakıt harcaması bütçeyi aştı.');
      else if (b && b.budget > 0 && b.spent >= b.budget * 0.9) once('budget90-' + v.id + '-' + t.slice(0, 7), 'Bütçe uyarısı', 'Yakıt bütçesinin %90’ına ulaşıldı.');
    }
    // yedek
    var last = S().get().lastBackupAt;
    if (S().get().autoBackupReminder && (!last || daysBetween(last, new Date().toISOString()) > 30)) {
      once('backup-' + t, 'Yedek hatırlatması', '30 günden uzun süredir yedek alınmadı.');
    }
  }
  document.addEventListener('DOMContentLoaded', function () { setTimeout(checkAll, 1500); });
  window.YakitNotify = { enabled: enabled, supported: supported, permission: permission, notify: notify, once: once, toggle: toggle, checkAll: checkAll, requestPermission: requestPermission };
})();
