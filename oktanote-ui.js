/* Oktanote v11.4 — ortak modal yardımcıları */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ensure(id, title) {
    var m = document.getElementById(id);
    if (m) return m;
    m = document.createElement('div');
    m.id = id;
    m.className = 'hidden absolute inset-0 z-[56] bg-white flex flex-col';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', title);
    m.setAttribute('tabindex', '-1');
    m.innerHTML =
      '<div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">' +
      '<h3 class="font-bold text-slate-800 text-sm" data-modal-title>' + esc(title) + '</h3>' +
      '<button type="button" data-modal-close aria-label="Kapat" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">×</button>' +
      '</div><div class="flex-1 overflow-y-auto px-4 py-3" data-modal-body></div>';
    (document.getElementById('app') || document.body).appendChild(m);
    m.querySelector('[data-modal-close]').addEventListener('click', function () { close(id); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(id); } });
    return m;
  }
  function open(id, title, html) {
    var m = ensure(id, title);
    m.querySelector('[data-modal-title]').textContent = title;
    m.setAttribute('aria-label', title);
    m.querySelector('[data-modal-body]').innerHTML = html;
    m.classList.remove('hidden');
    if (window.YakitI18n && window.YakitI18n.getLang() === 'en' && window.YakitI18n.apply) window.YakitI18n.apply(m);
    if (window.YakitA11y && window.YakitA11y.refresh) window.YakitA11y.refresh();
    else { try { m.focus(); } catch (e) {} }
    return m;
  }
  function close(id) {
    var m = document.getElementById(id);
    if (m) m.classList.add('hidden');
    if (window.YakitA11y && window.YakitA11y.refresh) window.YakitA11y.refresh();
  }
  function body(id) { var m = document.getElementById(id); return m ? m.querySelector('[data-modal-body]') : null; }
  function toast(msg) { if (window.showToast) window.showToast(msg); }
  window.OktanoteUI = { esc: esc, open: open, close: close, body: body, toast: toast };
})();
