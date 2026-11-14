/* Yakıt Takip v9 — Ayarlar ekranı (Fuelio tarzı gruplu liste)
 * window.YakitSettingsUI
 */
(function () {
  'use strict';

  var S = window.YakitSettings;
  var pendingBackup = null;   // okunmuş ama henüz uygulanmamış yedek

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) { if (window.showToast) window.showToast(msg); }

  // ---------- yeniden kullanılabilir satırlar ----------
  function row(opts) {
    var iconBg = opts.iconBg || '#eef2ff';
    var iconFg = opts.iconFg || '#4f46e5';
    var right = '';
    if (opts.toggle) {
      right = '<button type="button" role="switch" aria-checked="' + (opts.value ? 'true' : 'false') + '" ' +
        'data-action="' + esc(opts.action) + '" class="st-toggle shrink-0 w-11 h-6 rounded-full transition relative ' +
        (opts.value ? 'bg-slate-800' : 'bg-slate-300') + '">' +
        '<span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style="left:' +
        (opts.value ? '22px' : '2px') + '"></span></button>';
    } else if (opts.badge !== undefined) {
      right = '<span class="shrink-0 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">' + esc(opts.badge) + '</span>';
    } else if (opts.arrow) {
      right = '<i class="fa-solid fa-chevron-right text-slate-300 text-xs shrink-0"></i>';
    }
    var tag = opts.action ? 'button' : 'div';
    var attrs = opts.action ? ' type="button" data-action="' + esc(opts.action) + '"' : '';
    return '<' + tag + attrs + ' class="w-full flex items-center gap-3 px-3.5 py-3 text-left ' +
      (opts.action ? 'hover:bg-slate-50 active:bg-slate-100 cursor-pointer' : '') + ' transition">' +
      '<span class="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style="background:' + iconBg + ';color:' + iconFg + '">' +
      '<i class="fa-solid fa-' + esc(opts.icon) + ' text-sm"></i></span>' +
      '<span class="flex-1 min-w-0"><span class="block text-[13px] font-semibold text-slate-800">' + esc(opts.title) + '</span>' +
      (opts.desc ? '<span class="block text-[11px] text-slate-400 leading-snug mt-0.5">' + esc(opts.desc) + '</span>' : '') +
      '</span>' + right + '</' + tag + '>';
  }

  function group(title, rows) {
    return '<div>' + (title ? '<div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1.5">' + esc(title) + '</div>' : '') +
      '<div class="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">' + rows + '</div></div>';
  }

  // ---------- ana ayarlar ekranı ----------
  function render() {
    var host = document.getElementById('settings-body');
    if (!host || !S) return;
    var s = S.get();
    var cur = S.CURRENCIES[s.currency] || S.CURRENCIES.TRY;

    var lastBackup = s.lastBackupAt
      ? new Date(s.lastBackupAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Henüz yedek alınmadı';

    var html = '';

    html += group('Ana tercihler', [
      row({ icon: 'ruler-combined', iconBg: '#dbeafe', iconFg: '#2563eb', title: 'Mesafe birimi',
            desc: 'Kilometre veya mil', badge: S.distanceLabel(), action: 'units', arrow: true }),
      row({ icon: 'fill-drip', iconBg: '#e0f2fe', iconFg: '#0284c7', title: 'Hacim birimi',
            desc: 'Litre, ABD galonu veya İngiliz galonu', badge: S.volumeLabel(), action: 'volume', arrow: true }),
      row({ icon: 'gauge-high', iconBg: '#ede9fe', iconFg: '#7c3aed', title: 'Tüketim birimi',
            desc: 'L/100km, km/L veya MPG', badge: S.consumptionLabel(), action: 'consumption', arrow: true }),
      row({ icon: 'calendar-days', iconBg: '#fce7f3', iconFg: '#db2777', title: 'Haftanın ilk günü',
            desc: 'Raporlardaki haftalık özet bu güne göre hesaplanır', badge: S.weekStartLabel(), action: 'weekstart', arrow: true }),
      row({ icon: 'coins', iconBg: '#dcfce7', iconFg: '#059669', title: 'Para birimi',
            desc: cur.name, badge: cur.symbol, action: 'currency' }),
      row({ icon: 'calendar-days', iconBg: '#e0e7ff', iconFg: '#4f46e5', title: 'Tarih biçimi',
            desc: S.formatDate('2026-04-18'), badge: s.dateFormat, action: 'dateformat' }),
      row({ icon: 'house', iconBg: '#fef3c7', iconFg: '#d97706', title: 'Varsayılan sayfa',
            desc: 'Uygulama açılınca gösterilecek ekran', badge: viewLabel(s.defaultView), action: 'defaultview' })
    ].join(''));

    html += group('Yedekleme', [
      row({ icon: 'clock-rotate-left', iconBg: '#f1f5f9', iconFg: '#64748b', title: 'Son yedek', desc: lastBackup }),
      row({ icon: 'download', iconBg: '#dbeafe', iconFg: '#2563eb', title: 'Yedek al (dosya indir)',
            desc: 'Tüm kayıtlar ve fotoğraflar tek JSON dosyasında', action: 'backup-download', arrow: true }),
      row({ icon: 'share-nodes', iconBg: '#dcfce7', iconFg: '#059669', title: 'Yedeği paylaş',
            desc: 'Google Drive, WhatsApp, e-posta — Android paylaş menüsü', action: 'backup-share', arrow: true }),
      row({ icon: 'upload', iconBg: '#fef3c7', iconFg: '#d97706', title: 'Yedekten geri yükle',
            desc: 'Bir yedek dosyası seçin; önce özeti gösterilir', action: 'backup-restore', arrow: true }),
      row({ icon: 'triangle-exclamation', iconBg: '#fee2e2', iconFg: '#dc2626', title: 'Otomatik yedek hatırlatması',
            desc: '30 gün geçtiyse ana ekranda uyarı göster', toggle: true, value: s.autoBackupReminder, action: 'toggle-reminder' })
    ].join(''));

    html += group('Fiş okuma (OCR)', [
      row({ icon: 'receipt', iconBg: '#f3e8ff', iconFg: '#7c3aed', title: 'OCR motoru durumu',
            desc: 'Çevrimdışı fiş okuma dosyaları', badge: '…', action: 'ocr-status' }),
      row({ icon: 'cloud-arrow-down', iconBg: '#dbeafe', iconFg: '#2563eb', title: 'OCR dosyalarını indir',
            desc: 'Yaklaşık 5,6 MB — sonra internet gerekmez', action: 'ocr-download', arrow: true })
    ].join(''));

    html += group('Veri', [
      row({ icon: 'file-csv', iconBg: '#dcfce7', iconFg: '#059669', title: 'CSV raporu indir',
            desc: 'Dolumları tablo olarak dışa aktar', action: 'csv', arrow: true }),
      row({ icon: 'database', iconBg: '#f1f5f9', iconFg: '#64748b', title: 'Depolama', desc: '…', action: 'storage' }),
      row({ icon: 'trash', iconBg: '#fee2e2', iconFg: '#dc2626', title: 'Tüm verileri sıfırla',
            desc: 'Kayıtlar silinir, demo veriler yüklenir', action: 'reset', arrow: true })
    ].join(''));

    html += group('Hakkında', [
      row({ icon: 'circle-info', iconBg: '#e0e7ff', iconFg: '#4f46e5', title: 'Yakıt Takip', desc: 'Sürüm 9.0.0', badge: 'v9' }),
      row({ icon: 'shield-halved', iconBg: '#dcfce7', iconFg: '#059669', title: 'Gizlilik',
            desc: 'Veriler cihazınızda kalır. Sunucuya hiçbir şey gönderilmez.' }),
      row({ icon: 'file-lines', iconBg: '#f1f5f9', iconFg: '#64748b', title: 'Açık kaynak lisansları',
            desc: 'LICENSES.txt — Tesseract, Leaflet, Inter, Font Awesome', action: 'licenses', arrow: true })
    ].join(''));

    host.innerHTML = html;
    refreshStorage();
    refreshOcr();
  }

  function viewLabel(v) {
    return { home: 'Ana sayfa', timeline: 'Kilometre günlüğü', stats: 'İstatistikler',
             vehicles: 'Taşıtlar', trips: 'Yolculuk kaydı', calculator: 'Hesaplayıcı',
             reports: 'Raporlar' }[v] || 'Ana sayfa';
  }

  async function refreshStorage() {
    var el = document.querySelector('[data-action="storage"] .block:last-child');
    if (!el || !window.YakitApp || !window.YakitApp.storageInfo) return;
    try {
      var info = await window.YakitApp.storageInfo();
      el.textContent = info.text;
    } catch (e) { el.textContent = 'Okunamadı'; }
  }

  async function refreshOcr() {
    var el = document.querySelector('[data-action="ocr-status"] span:last-child');
    if (!el || !window.YakitPWA || !window.YakitPWA.refreshOcrStatus) return;
    try {
      var st = await window.YakitPWA.refreshOcrStatus();
      el.textContent = st && st.ready ? 'Hazır' : (st && st.count ? st.count + '/' + (st.total || 4) : 'İndirilmedi');
    } catch (e) { el.textContent = 'Bilinmiyor'; }
  }

  // ---------- seçim sayfası (alt panel) ----------
  function openPicker(title, options, current, onPick) {
    var back = document.getElementById('settings-picker');
    var body = document.getElementById('settings-picker-body');
    document.getElementById('settings-picker-title').textContent = title;
    body.innerHTML = options.map(function (o) {
      var active = String(o.value) === String(current);
      return '<button type="button" data-val="' + esc(o.value) + '" class="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50 transition">' +
        '<span class="flex-1 min-w-0"><span class="block text-[13px] font-semibold text-slate-800">' + esc(o.label) + '</span>' +
        (o.desc ? '<span class="block text-[11px] text-slate-400 mt-0.5">' + esc(o.desc) + '</span>' : '') + '</span>' +
        (active ? '<i class="fa-solid fa-circle-check text-slate-800"></i>' : '<i class="fa-regular fa-circle text-slate-200"></i>') +
        '</button>';
    }).join('');
    back.classList.remove('hidden');
    body.onclick = function (e) {
      var btn = e.target.closest('button[data-val]');
      if (!btn) return;
      onPick(btn.dataset.val);
      closePicker();
      render();
    };
  }
  function closePicker() {
    document.getElementById('settings-picker').classList.add('hidden');
  }

  // ---------- eylemler ----------
  async function handle(action) {
    var s = S.get();
    switch (action) {
      case 'units':
        openPicker('Mesafe birimi', [
          { value: 'km', label: 'Kilometre (km)', desc: 'Tüketim: L/100km veya km/L' },
          { value: 'mi', label: 'Mil (mi)', desc: 'Tüketim: MPG-US veya MPG-UK' }
        ], s.distanceUnit, function (v) {
          S.set('distanceUnit', v);
          var c = S.get().consumptionUnit;
          if (v === 'mi' && c.indexOf('MPG') !== 0) S.set('consumptionUnit', S.get().volumeUnit === 'galUK' ? 'MPG-UK' : 'MPG-US');
          if (v === 'km' && c.indexOf('MPG') === 0) S.set('consumptionUnit', 'L/100km');
          applyUnits(); toast('Mesafe birimi güncellendi');
        });
        break;
      case 'volume':
        openPicker('Hacim birimi', [
          { value: 'L', label: 'Litre (L)', desc: 'Metrik hacim birimi' },
          { value: 'galUS', label: 'ABD galonu (gal US)', desc: '1 gal US = 3,78541 L' },
          { value: 'galUK', label: 'İngiliz galonu (gal UK)', desc: '1 gal UK = 4,54609 L' }
        ], s.volumeUnit, function (v) {
          S.set('volumeUnit', v); applyUnits(); toast('Hacim birimi güncellendi');
        });
        break;
      case 'consumption':
        var opts = s.distanceUnit === 'mi'
          ? [
              { value: 'MPG-US', label: 'MPG-US', desc: 'Mil / ABD galonu' },
              { value: 'MPG-UK', label: 'MPG-UK', desc: 'Mil / İngiliz galonu' }
            ]
          : [
              { value: 'L/100km', label: 'L/100km', desc: '100 km başına litre' },
              { value: 'km/L', label: 'km/L', desc: 'Litre başına kilometre' }
            ];
        openPicker('Tüketim birimi', opts, s.consumptionUnit, function (v) {
          S.set('consumptionUnit', v); applyUnits(); toast('Tüketim birimi güncellendi');
        });
        break;
      case 'weekstart':
        openPicker('Haftanın ilk günü', [
          { value: '1', label: 'Pazartesi', desc: 'Hafta pazartesi başlar' },
          { value: '0', label: 'Pazar', desc: 'Hafta pazar başlar' }
        ], String(s.weekStart), function (v) {
          S.set('weekStart', Number(v)); applyUnits(); toast('Haftanın ilk günü: ' + S.weekStartLabel());
        });
        break;
      case 'currency':
        openPicker('Para birimi', Object.keys(S.CURRENCIES).map(function (k) {
          return { value: k, label: S.CURRENCIES[k].symbol + '  ' + S.CURRENCIES[k].name, desc: k };
        }), s.currency, function (v) { S.set('currency', v); applyUnits(); toast('Para birimi güncellendi'); });
        break;
      case 'dateformat':
        openPicker('Tarih biçimi', S.DATE_FORMATS.map(function (f) {
          var save = S.get().dateFormat; S.set('dateFormat', f);
          var ex = S.formatDate('2026-04-18'); S.set('dateFormat', save);
          return { value: f, label: f, desc: 'Örnek: ' + ex };
        }), s.dateFormat, function (v) { S.set('dateFormat', v); applyUnits(); toast('Tarih biçimi güncellendi'); });
        break;
      case 'defaultview':
        openPicker('Varsayılan sayfa', ['home', 'timeline', 'stats', 'vehicles', 'trips', 'calculator', 'reports']
          .map(function (v) { return { value: v, label: viewLabel(v) }; }), s.defaultView,
          function (v) { S.set('defaultView', v); toast('Varsayılan sayfa: ' + viewLabel(v)); });
        break;
      case 'toggle-reminder':
        S.set('autoBackupReminder', !s.autoBackupReminder); render(); break;
      case 'backup-download': await doBackup('download'); break;
      case 'backup-share': await doBackup('share'); break;
      case 'backup-restore': pickRestoreFile(); break;
      case 'ocr-download':
        if (window.YakitPWA && window.YakitPWA.precacheOcr) {
          toast('OCR dosyaları indiriliyor…');
          try { await window.YakitPWA.precacheOcr(); toast('OCR hazır'); }
          catch (e) { toast('İndirilemedi: ' + e.message); }
          refreshOcr();
        }
        break;
      case 'ocr-status': refreshOcr(); toast('Durum yenilendi'); break;
      case 'csv': if (window.downloadCSVReport) window.downloadCSVReport(); break;
      case 'reset': if (window.resetDemoData) window.resetDemoData(); break;
      case 'licenses': window.open('./LICENSES.txt', '_blank'); break;
    }
  }

  function applyUnits() {
    if (window.renderAll) window.renderAll();
    render();
  }

  async function doBackup(mode) {
    var btn = document.querySelector('[data-action="backup-' + mode + '"]');
    if (btn) btn.style.opacity = '0.5';
    try {
      toast('Yedek hazırlanıyor…');
      var r = mode === 'share' ? await S.shareBackup({ photos: true }) : await S.downloadBackup({ photos: true });
      var mb = (r.bytes / 1048576).toFixed(2);
      if (r.warning) toast('⚠️ ' + r.warning);
      else toast('Yedek hazır: ' + mb + ' MB · ' + r.photoCount + ' fotoğraf');
      render();
    } catch (e) {
      if (e && e.name === 'AbortError') toast('Paylaşım iptal edildi');
      else toast('Yedek alınamadı: ' + (e.message || e));
    } finally {
      if (btn) btn.style.opacity = '';
    }
  }

  function pickRestoreFile() {
    var inp = document.getElementById('settings-restore-input');
    inp.value = '';
    inp.click();
  }

  async function onRestoreFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      var obj = await S.readBackupFile(file);
      pendingBackup = obj;
      var sum = S.summarizeBackup(obj);
      var when = sum.createdAt ? new Date(sum.createdAt).toLocaleString('tr-TR') : 'bilinmiyor';
      document.getElementById('settings-restore-summary').innerHTML =
        '<div class="text-[11px] text-slate-500 mb-2">Yedek tarihi: <b>' + esc(when) + '</b></div>' +
        '<div class="grid grid-cols-2 gap-2 text-[11px]">' +
        [['Araç', sum.vehicles], ['Dolum', sum.refuels], ['Gider', sum.expenses], ['Yolculuk', sum.trips], ['Fotoğraf', sum.photos]]
          .map(function (p) {
            return '<div class="bg-slate-50 rounded-lg px-2.5 py-1.5 flex justify-between"><span class="text-slate-500">' +
              p[0] + '</span><b class="text-slate-800">' + p[1] + '</b></div>';
          }).join('') + '</div>';
      document.getElementById('settings-restore-modal').classList.remove('hidden');
    } catch (err) {
      toast('⚠️ ' + err.message);
    }
  }

  async function confirmRestore() {
    if (!pendingBackup) return;
    var btn = document.getElementById('settings-restore-confirm');
    btn.disabled = true; btn.textContent = 'Geri yükleniyor…';
    try {
      var r = await S.restoreBackup(pendingBackup, { photos: true });
      document.getElementById('settings-restore-modal').classList.add('hidden');
      pendingBackup = null;
      toast('Geri yüklendi: ' + r.summary.refuels + ' dolum, ' + r.photoCount + ' fotoğraf');
      if (window.renderAll) window.renderAll();
      render();
    } catch (e) {
      toast('Geri yüklenemedi: ' + (e.message || e));
    } finally {
      btn.disabled = false; btn.textContent = 'Geri yükle';
    }
  }

  function cancelRestore() {
    pendingBackup = null;
    document.getElementById('settings-restore-modal').classList.add('hidden');
  }

  // ---------- ARAÇ SİMGESİ SEÇİCİ ----------
  var iconTarget = null;   // { get: fn, set: fn }

  function openIconPicker(currentIcon, currentColor, onDone) {
    iconTarget = { icon: currentIcon || 'car', color: currentColor || 'slate', done: onDone };
    renderIconPicker();
    document.getElementById('vehicle-icon-modal').classList.remove('hidden');
  }

  function renderIconPicker() {
    var t = iconTarget;
    document.getElementById('vehicle-icon-preview').innerHTML =
      '<div class="w-16 h-16 rounded-full text-white flex items-center justify-center text-2xl" style="background:' +
      S.vehicleColor({ color: t.color }).bg + '"><i class="fa-solid fa-' + esc(t.icon) + '"></i></div>';

    document.getElementById('vehicle-icon-grid').innerHTML = S.VEHICLE_ICONS.map(function (i) {
      var on = i.id === t.icon;
      return '<button type="button" data-icon="' + i.id + '" title="' + esc(i.label) + '" class="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition ' +
        (on ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50') + '">' +
        '<i class="fa-solid fa-' + i.id + ' text-base"></i>' +
        '<span class="text-[8px] font-medium leading-none">' + esc(i.label) + '</span></button>';
    }).join('');

    document.getElementById('vehicle-color-row').innerHTML = S.VEHICLE_COLORS.map(function (c) {
      var on = c.id === t.color;
      return '<button type="button" data-color="' + c.id + '" title="' + esc(c.label) + '" class="w-8 h-8 rounded-full border-2 transition ' +
        (on ? 'border-slate-800 scale-110' : 'border-white') + '" style="background:' + c.bg + '"></button>';
    }).join('');
  }

  function initIconPicker() {
    var grid = document.getElementById('vehicle-icon-grid');
    var colors = document.getElementById('vehicle-color-row');
    if (!grid) return;
    grid.onclick = function (e) {
      var b = e.target.closest('button[data-icon]');
      if (!b) return;
      iconTarget.icon = b.dataset.icon; renderIconPicker();
    };
    colors.onclick = function (e) {
      var b = e.target.closest('button[data-color]');
      if (!b) return;
      iconTarget.color = b.dataset.color; renderIconPicker();
    };
    document.getElementById('vehicle-icon-save').onclick = function () {
      if (iconTarget && iconTarget.done) iconTarget.done(iconTarget.icon, iconTarget.color);
      document.getElementById('vehicle-icon-modal').classList.add('hidden');
    };
    document.getElementById('vehicle-icon-close').onclick = function () {
      document.getElementById('vehicle-icon-modal').classList.add('hidden');
    };
  }

  // ---------- yedek hatırlatması ----------
  function backupReminderDue() {
    var s = S.get();
    if (!s.autoBackupReminder) return false;
    var st = window.YakitApp && window.YakitApp.getState ? window.YakitApp.getState() : null;
    if (!st || !st.refuels || st.refuels.length < 3) return false;
    if (!s.lastBackupAt) return true;
    var days = (Date.now() - new Date(s.lastBackupAt).getTime()) / 86400000;
    return days >= 30;
  }

  function renderReminder() {
    var box = document.getElementById('backup-reminder');
    if (!box) return;
    if (backupReminderDue()) {
      var s = S.get();
      box.innerHTML = '<div class="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">' +
        '<i class="fa-solid fa-triangle-exclamation text-amber-500"></i>' +
        '<div class="flex-1 min-w-0"><div class="text-[12px] font-semibold text-amber-900">Yedek almanız önerilir</div>' +
        '<div class="text-[10px] text-amber-700">' + (s.lastBackupAt ? 'Son yedek 30 günden eski.' : 'Henüz hiç yedek almadınız.') + '</div></div>' +
        '<button type="button" onclick="YakitSettingsUI.quickBackup()" class="shrink-0 bg-amber-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg">Yedek al</button>' +
        '</div>';
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }

  async function quickBackup() { await doBackup('download'); renderReminder(); }

  // ---------- kurulum ----------
  function init() {
    var host = document.getElementById('settings-body');
    if (!host) return;
    host.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (el) handle(el.dataset.action);
    });
    document.getElementById('settings-picker-close').onclick = closePicker;
    document.getElementById('settings-restore-input').addEventListener('change', onRestoreFile);
    document.getElementById('settings-restore-confirm').onclick = confirmRestore;
    document.getElementById('settings-restore-cancel').onclick = cancelRestore;
    initIconPicker();
    render();
  }

  window.YakitSettingsUI = {
    render: render, init: init, handle: handle,
    openIconPicker: openIconPicker,
    renderReminder: renderReminder, backupReminderDue: backupReminderDue,
    quickBackup: quickBackup, closePicker: closePicker
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
