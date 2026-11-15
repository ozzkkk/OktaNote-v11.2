/* Yakıt Takip v11.2 — Erişilebilirlik katmanı
 * - Pencerelere role="dialog" + aria-modal + ad; açılınca odak, kapanınca geri verme
 * - Esc ile en üstteki pencereyi kapatma; Tab odağını pencere içinde tutma
 * - Adsız form alanlarına komşu etiketten aria-labelledby; adsız ikon butonlara ad
 * - Toast'a role="status" + aria-live; "İçeriğe geç" bağlantısı
 * Görünümü değiştirmez; yalnızca öznitelik ve odak yönetimi yapar.
 */
(function () {
  'use strict';

  // Katman sırası: büyük olan üstte (uygulamadaki z-index düzeni)
  var LAYERS = [
    { id: 'exit-screen', z: 95, ownEsc: true, label: 'Çıkış yapıldı' },
    { id: 'legal-modal', z: 88, close: 'YakitLegal.close', ownEsc: true, label: 'Bilgi' },
    { id: 'contact-terms-modal', z: 85, close: 'YakitContact.closeTerms', label: 'Kurallar ve şartlar' },
    { id: 'contact-modal', z: 80, close: 'YakitContact.close', label: 'İletişim' },
    { id: 'guard-modal', z: 70, close: 'closeGuardModal', label: 'Veri giriş uyarıları' },
    { id: 'settings-restore-modal', z: 62, click: 'settings-restore-cancel', label: 'Yedekten geri yükle' },
    { id: 'vehicle-icon-modal', z: 61, click: 'vehicle-icon-close', label: 'Araç simgesi seç' },
    { id: 'settings-picker', z: 60, close: 'YakitSettingsUI.closePicker', label: 'Seçim' },
    { id: 'receipt-modal', z: 55, close: 'YakitOCR.closeReceiptModal', label: 'Fiş oku' },
    { id: 'station-modal', z: 54, close: 'closeStationPicker', label: 'İstasyon veya konum seç' },
    { id: 'trip-map-modal', z: 53, close: 'closeTripMapPicker', label: 'Haritadan konum seç' },
    { id: 'maintenance-modal', z: 52, close: 'YakitMaintenance.closeEditor', label: 'Bakım hatırlatıcısı' },
    { id: 'edit-vehicle-modal', z: 51, hide: true, label: 'Aracı düzenle' },
    { id: 'expense-modal', z: 51, hide: true, label: 'Gider ekle' },
    { id: 'trip-modal', z: 51, hide: true, label: 'Gezi kaydı' },
    { id: 'refuel-modal', z: 50, close: 'closeRefuelModal', label: 'Dolum ekle' },
    { id: 'nav-drawer', z: 45, close: 'toggleDrawer', arg: false, openClass: '-translate-x-full', inverted: true, label: 'Menü' },
    { id: 'action-sheet', z: 44, close: 'toggleActionSheet', arg: false, openClass: 'translate-y-full', inverted: true, label: 'Yeni kayıt' }
  ];

  var ICON_LABELS = [
    ['fa-xmark', 'Kapat'],
    ['fa-check', 'Kaydet'],
    ['fa-ellipsis-vertical', 'Kayıt menüsü'],
    ['fa-ellipsis', 'Menü'],
    ['fa-bars', 'Menü'],
    ['fa-plus', 'Ekle'],
    ['fa-chevron-left', 'Geri'],
    ['fa-arrow-left', 'Geri'],
    ['fa-trash', 'Sil'],
    ['fa-pen', 'Düzenle'],
    ['fa-camera', 'Fotoğraf ekle'],
    ['fa-map-location-dot', 'Haritadan seç'],
    ['fa-location-crosshairs', 'Konumumu kullan']
  ];

  var seq = 0;
  var lastFocus = new Map();
  var openStack = [];

  function el(id) { return document.getElementById(id); }

  function resolve(path) {
    if (!path) return null;
    var parts = path.split('.');
    var fn = window;
    for (var i = 0; i < parts.length; i++) {
      fn = fn && fn[parts[i]];
      if (!fn) return null;
    }
    return typeof fn === 'function' ? fn : null;
  }

  function isVisible(layer) {
    var node = el(layer.id);
    if (!node) return false;
    if (layer.inverted) return !node.classList.contains(layer.openClass);
    if (node.classList.contains('hidden')) return false;
    var st = window.getComputedStyle(node);
    return st.display !== 'none' && st.visibility !== 'hidden';
  }

  function topLayer() {
    for (var i = 0; i < LAYERS.length; i++) if (isVisible(LAYERS[i])) return LAYERS[i];
    return null;
  }

  function closeLayer(layer) {
    if (!layer) return false;
    var node = el(layer.id);
    if (layer.close) {
      var fn = resolve(layer.close);
      if (fn) {
        try { fn(layer.arg); } catch (e) { /* yoksay */ }
        return true;
      }
    }
    if (layer.click) {
      var btn = el(layer.click);
      if (btn) { btn.click(); return true; }
    }
    if (layer.hide && node) { node.classList.add('hidden'); return true; }
    return false;
  }

  // ---------- adlandırma ----------
  function neighbourLabelId(node) {
    var p = node.previousElementSibling;
    while (p && !/^(LABEL|SPAN|DIV|P)$/.test(p.tagName)) p = p.previousElementSibling;
    if (!p) {
      var par = node.parentElement;
      p = par ? par.previousElementSibling : null;
    }
    if (!p) return null;
    var txt = (p.textContent || '').trim();
    if (!txt || txt.length > 60 || p.querySelector('input,select,textarea,button')) return null;
    if (!p.id) p.id = 'a11y-lbl-' + (++seq);
    return p.id;
  }

  function nameControls(root) {
    var scope = root || document;
    var controls = scope.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea');
    for (var i = 0; i < controls.length; i++) {
      var c = controls[i];
      if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) continue;
      if (c.id && document.querySelector('label[for="' + c.id + '"]')) continue;
      if (c.closest('label')) continue;
      var lid = neighbourLabelId(c);
      if (lid) c.setAttribute('aria-labelledby', lid);
    }
    var btns = scope.querySelectorAll('button');
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      if ((b.textContent || '').trim() || b.getAttribute('aria-label') || b.getAttribute('aria-labelledby') || b.title) continue;
      var icon = b.querySelector('i[class*="fa-"]');
      var name = null;
      if (icon) {
        for (var k = 0; k < ICON_LABELS.length; k++) {
          if (icon.classList.contains(ICON_LABELS[k][0])) { name = ICON_LABELS[k][1]; break; }
        }
      }
      if (!name && b.getAttribute('role') === 'switch') name = 'Anahtar';
      if (name) b.setAttribute('aria-label', name);
    }
  }

  function nameLayers() {
    LAYERS.forEach(function (layer) {
      var node = el(layer.id);
      if (!node) return;
      if (!node.getAttribute('role')) node.setAttribute('role', layer.id === 'nav-drawer' ? 'navigation' : 'dialog');
      if (layer.id !== 'nav-drawer' && !node.hasAttribute('aria-modal')) node.setAttribute('aria-modal', 'true');
      if (!node.getAttribute('aria-label') && !node.getAttribute('aria-labelledby')) {
        var head = node.querySelector('h1,h2,h3,[id$="-title"]');
        var txt = head ? (head.textContent || '').trim() : '';
        node.setAttribute('aria-label', txt && txt.length < 60 ? txt : layer.label);
      }
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
    });
  }

  // ---------- odak ----------
  function focusables(node) {
    return [].slice.call(node.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )).filter(function (n) {
      if (n.offsetParent === null && n !== document.activeElement) return false;
      var st = window.getComputedStyle(n);
      return st.visibility !== 'hidden' && st.display !== 'none';
    });
  }

  function onOpened(layer) {
    var node = el(layer.id);
    if (!node) return;
    if (!lastFocus.has(layer.id)) lastFocus.set(layer.id, document.activeElement);
    nameControls(node);
    var active = document.activeElement;
    if (!active || active === document.body || !node.contains(active)) {
      // Metin alanına odaklanmıyoruz: telefonda klavye açılmasın.
      try { node.focus({ preventScroll: true }); } catch (e) { try { node.focus(); } catch (e2) {} }
    }
  }

  function onClosed(layer) {
    var prev = lastFocus.get(layer.id);
    lastFocus.delete(layer.id);
    if (prev && document.contains(prev) && typeof prev.focus === 'function') {
      var top = topLayer();
      if (!top) { try { prev.focus({ preventScroll: true }); } catch (e) {} }
    }
  }

  function sync() {
    var nowOpen = [];
    LAYERS.forEach(function (layer) {
      if (!isVisible(layer)) {
        if (openStack.indexOf(layer.id) !== -1) onClosed(layer);
        return;
      }
      nowOpen.push(layer.id);
      if (openStack.indexOf(layer.id) === -1) onOpened(layer);
    });
    openStack = nowOpen;
  }

  // ---------- klavye ----------
  function onKeydown(e) {
    if (e.defaultPrevented) return;
    var top = topLayer();
    if (!top) return;
    if (e.key === 'Escape' && !top.ownEsc) {
      e.preventDefault();
      closeLayer(top);
      setTimeout(sync, 60);
      return;
    }
    if (e.key === 'Tab') {
      var node = el(top.id);
      if (!node) return;
      var list = focusables(node);
      if (!list.length) { e.preventDefault(); return; }
      var first = list[0], last = list[list.length - 1];
      var active = document.activeElement;
      if (!node.contains(active) || active === node) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
  }

  // ---------- atlama bağlantısı ----------
  function addSkipLink() {
    if (el('a11y-skip')) return;
    var a = document.createElement('a');
    a.id = 'a11y-skip';
    a.href = '#app';
    a.textContent = 'İçeriğe geç';
    a.setAttribute('style', 'position:absolute;left:8px;top:-60px;z-index:120;background:#0f172a;color:#fff;' +
      'padding:10px 14px;border-radius:12px;font-size:13px;font-weight:600;transition:top .15s');
    a.addEventListener('focus', function () { a.style.top = '8px'; });
    a.addEventListener('blur', function () { a.style.top = '-60px'; });
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      var app = el('app');
      if (app) {
        if (!app.hasAttribute('tabindex')) app.setAttribute('tabindex', '-1');
        try { app.focus({ preventScroll: true }); } catch (e) {}
        app.scrollTop = 0;
      }
    });
    document.body.insertBefore(a, document.body.firstChild);
  }

  function enhanceToast() {
    var box = el('toast-box');
    if (!box) return;
    if (!box.getAttribute('role')) box.setAttribute('role', 'status');
    if (!box.getAttribute('aria-live')) box.setAttribute('aria-live', 'polite');
    if (!box.hasAttribute('aria-atomic')) box.setAttribute('aria-atomic', 'true');
  }

  function init() {
    nameLayers();
    nameControls(document);
    enhanceToast();
    addSkipLink();
    document.addEventListener('keydown', onKeydown, true);

    var targets = LAYERS.map(function (l) { return el(l.id); }).filter(Boolean);
    if (window.MutationObserver) {
      var mo = new MutationObserver(function (muts) {
        var relevant = muts.some(function (m) {
          return m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style');
        });
        if (relevant) sync();
        else {
          // Yeni eklenen düğümleri adlandır (liste satırları, ayar satırları…)
          muts.forEach(function (m) {
            for (var i = 0; i < m.addedNodes.length; i++) {
              var n = m.addedNodes[i];
              if (n.nodeType === 1) nameControls(n);
            }
          });
        }
      });
      targets.forEach(function (t) { mo.observe(t, { attributes: true, attributeFilter: ['class', 'style'] }); });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.YakitA11y = {
    init: init,
    refresh: function () { nameLayers(); nameControls(document); enhanceToast(); sync(); },
    closeTop: function () { var t = topLayer(); return t ? closeLayer(t) : false; },
    topLayer: function () { var t = topLayer(); return t ? t.id : null; },
    nameControls: nameControls,
    LAYERS: LAYERS
  };
})();
