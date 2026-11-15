/* Oktanote v11.4 — Leaflet'i yalnızca harita açılınca yükle */
(function () {
  'use strict';
  var pending = null;
  function load() {
    if (window.L) return Promise.resolve(window.L);
    if (pending) return pending;
    pending = new Promise(function (resolve, reject) {
      try {
        if (!document.querySelector('link[data-oktanote-leaflet]')) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = './leaflet.css';
          link.setAttribute('data-oktanote-leaflet', '1');
          document.head.appendChild(link);
        }
        var s = document.createElement('script');
        s.src = './leaflet.js';
        s.onload = function () { window.L ? resolve(window.L) : reject(new Error('Leaflet yüklenemedi')); };
        s.onerror = function () { pending = null; reject(new Error('Leaflet yüklenemedi')); };
        document.head.appendChild(s);
      } catch (e) { pending = null; reject(e); }
    });
    return pending;
  }
  window.YakitMapLoader = { load: load };
})();
