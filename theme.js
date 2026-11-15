/* Oktanote v11.4 — Tema (açık / koyu / sistem)
 * Erken uygulanır; tercih settings içinde saklanır.
 */
(function () {
  'use strict';
  var KEY = 'yakitTakipSettings';
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function pref() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return s.theme === 'dark' || s.theme === 'light' ? s.theme : 'system';
    } catch (e) { return 'system'; }
  }
  function resolve(p) {
    if (p === 'dark') return 'dark';
    if (p === 'light') return 'light';
    return mql && mql.matches ? 'dark' : 'light';
  }
  function apply(p) {
    var t = resolve(p || pref());
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0f172a' : '#ffffff');
    try { window.dispatchEvent(new CustomEvent('oktanote-theme', { detail: { theme: t } })); } catch (e) {}
    return t;
  }
  function set(p) {
    if (window.YakitSettings && window.YakitSettings.set) window.YakitSettings.set('theme', p);
    else {
      try { var s = JSON.parse(localStorage.getItem(KEY) || '{}'); s.theme = p; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    }
    apply(p);
    if (window.YakitSettingsUI && window.YakitSettingsUI.render) window.YakitSettingsUI.render();
  }
  function label(p) {
    p = p || pref();
    return p === 'dark' ? 'Koyu' : p === 'light' ? 'Açık' : 'Sistem';
  }
  function openPicker() {
    var cur = pref();
    var opts = [
      { id: 'system', label: 'Sistem', desc: 'Cihazın açık/koyu ayarını izle' },
      { id: 'light', label: 'Açık', desc: 'Her zaman açık tema' },
      { id: 'dark', label: 'Koyu', desc: 'Her zaman koyu tema' }
    ];
    var html = '<div class="space-y-2">' + opts.map(function (o) {
      return '<button type="button" data-theme-opt="' + o.id + '" class="w-full text-left px-3 py-2.5 rounded-xl border ' +
        (o.id === cur ? 'border-slate-800 bg-slate-100' : 'border-slate-200 bg-white') + '">' +
        '<div class="text-sm font-semibold text-slate-800">' + o.label + (o.id === cur ? ' ✓' : '') + '</div>' +
        '<div class="text-[11px] text-slate-500">' + o.desc + '</div></button>';
    }).join('') + '</div>';
    if (window.YakitA11y && window.YakitA11y.openSheet) {
      window.YakitA11y.openSheet({ title: 'Tema', html: html, onMount: function (root) {
        root.querySelectorAll('[data-theme-opt]').forEach(function (b) {
          b.addEventListener('click', function () { set(b.getAttribute('data-theme-opt')); window.YakitA11y.closeSheet(); });
        });
      }});
      return;
    }
    // Basit yedek modal
    var m = document.getElementById('theme-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'theme-modal';
      m.className = 'hidden absolute inset-0 z-[60] bg-slate-900/40 flex items-end justify-center';
      m.innerHTML = '<div class="bg-white w-full max-w-md rounded-t-2xl p-4 space-y-3"><div class="flex items-center justify-between"><h3 class="font-bold text-slate-800">Tema</h3><button type="button" id="theme-close" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500">×</button></div><div id="theme-body"></div></div>';
      document.getElementById('app').appendChild(m);
      m.addEventListener('click', function (e) { if (e.target === m) { m.classList.add('hidden'); if (window.YakitA11y && window.YakitA11y.refresh) window.YakitA11y.refresh(); } });
      document.getElementById('theme-close').addEventListener('click', function () { m.classList.add('hidden'); if (window.YakitA11y && window.YakitA11y.refresh) window.YakitA11y.refresh(); });
    }
    document.getElementById('theme-body').innerHTML = html;
    m.classList.remove('hidden');
    if (window.YakitA11y && window.YakitA11y.refresh) window.YakitA11y.refresh();
    m.querySelectorAll('[data-theme-opt]').forEach(function (b) {
      b.addEventListener('click', function () { set(b.getAttribute('data-theme-opt')); m.classList.add('hidden'); if (window.YakitA11y && window.YakitA11y.refresh) window.YakitA11y.refresh(); });
    });
  }
  if (mql) {
    var fn = function () { if (pref() === 'system') apply('system'); };
    if (mql.addEventListener) mql.addEventListener('change', fn); else if (mql.addListener) mql.addListener(fn);
  }
  apply();
  document.addEventListener('DOMContentLoaded', function () { apply(); });
  window.YakitTheme = { pref: pref, apply: apply, set: set, label: label, openPicker: openPicker };
})();
