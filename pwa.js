/* Oktanote v11.3 — PWA / çevrimdışı durum katmanı
 * Service worker kaydı, güncelleme bildirimi, çevrimdışı rozeti ve kurulum istemi.
 * Uygulama verilerine dokunmaz; yalnızca kabuk önbelleği ve ağ durumuyla ilgilenir.
 */
(function () {
  'use strict';

  const state = {
    registration: null,
    waitingWorker: null,
    deferredPrompt: null,
    refreshing: false,
    dismissedOffline: false,
    installed: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
  };

  const $ = (id) => document.getElementById(id);

  function appShell() {
    return document.querySelector('.app-shell') || document.body;
  }

  function ensureBanner() {
    let el = $('pwa-banner');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'pwa-banner';
    el.className = 'hidden absolute left-3 right-3 bottom-[86px] z-[45] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-3 py-2.5 shadow-lg flex items-center gap-2.5';
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <i id="pwa-banner-icon" class="fa-solid fa-circle-check text-emerald-600 text-sm shrink-0"></i>
      <span id="pwa-banner-text" class="flex-1 text-[11px] font-semibold text-slate-700 leading-snug"></span>
      <button type="button" id="pwa-banner-action" aria-hidden="true" class="hidden shrink-0 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl"></button>
      <button type="button" id="pwa-banner-dismiss" aria-label="Kapat" class="shrink-0 w-6 h-6 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>`;
    appShell().appendChild(el);
    $('pwa-banner-dismiss').addEventListener('click', () => {
      el.classList.add('hidden');
      if (!navigator.onLine) state.dismissedOffline = true;
    });
    return el;
  }

  function showBanner({ icon, iconClass, text, actionLabel, onAction }) {
    const el = ensureBanner();
    const iconEl = $('pwa-banner-icon');
    iconEl.className = `fa-solid ${icon} ${iconClass} text-sm shrink-0`;
    $('pwa-banner-text').textContent = text;
    const action = $('pwa-banner-action');
    if (actionLabel && onAction) {
      action.textContent = actionLabel;
      action.setAttribute('aria-label', actionLabel);
      action.removeAttribute('aria-hidden');
      action.classList.remove('hidden');
      action.onclick = onAction;
    } else {
      action.setAttribute('aria-hidden', 'true');
      action.classList.add('hidden');
      action.onclick = null;
    }
    el.classList.remove('hidden');
  }

  function hideBanner() {
    const el = $('pwa-banner');
    if (el) el.classList.add('hidden');
  }

  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
  }

  function refreshStatus() {
    const online = navigator.onLine !== false;
    const swStatus = $('pwa-sw-status');
    const cacheStatus = $('pwa-cache-status');
    const installBtn = $('pwa-install-btn');
    const updateBtn = $('pwa-update-btn');

    if (swStatus) {
      if (location.protocol === 'file:') swStatus.textContent = 'HTTPS veya localhost gerekli (file:// desteklenmez)';
      else if (!('serviceWorker' in navigator)) swStatus.textContent = 'Bu tarayıcı service worker desteklemiyor';
      else if (state.registration) swStatus.textContent = state.waitingWorker ? 'Yeni sürüm hazır' : 'Etkin';
      else swStatus.textContent = 'Kaydediliyor…';
    }
    if (installBtn) installBtn.classList.toggle('hidden', !state.deferredPrompt || state.installed);
    if (updateBtn) updateBtn.classList.toggle('hidden', !state.waitingWorker);

    if (cacheStatus && typeof caches !== 'undefined') {
      caches.keys().then((keys) => {
        const ready = keys.some((k) => k.startsWith('yakit-takip-shell-'));
        cacheStatus.textContent = ready ? 'Çevrimdışı kabuk hazır' : 'Henüz önbelleğe alınmadı';
      }).catch(() => { cacheStatus.textContent = 'Önbellek durumu okunamadı'; });
    } else if (cacheStatus) {
      cacheStatus.textContent = 'Önbellek API yok';
    }

    // Bildirim önceliği: güncelleme > kurulum > çevrimdışı
    if (state.waitingWorker) {
      showBanner({
        icon: 'fa-arrow-up-right-from-square', iconClass: 'text-blue-600',
        text: 'Yeni sürüm hazır. Kayıtlarınız korunur.',
        actionLabel: 'Yenile', onAction: applyUpdate
      });
    } else if (state.deferredPrompt && !state.installed) {
      showBanner({
        icon: 'fa-circle-play', iconClass: 'text-slate-700',
        text: 'Uygulamayı ana ekrana ekleyebilirsiniz.',
        actionLabel: 'Yükle', onAction: promptInstall
      });
    } else if (!online && !state.dismissedOffline) {
      showBanner({
        icon: 'fa-database', iconClass: 'text-amber-600',
        text: 'Çevrimdışı: kayıtlar ve fotoğraflar çalışır; harita/arama internet ister.',
        actionLabel: null, onAction: null
      });
    } else {
      hideBanner();
    }
  }

  function trackInstalling(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          state.waitingWorker = worker;
          refreshStatus();
        } else {
          toast('Çevrimdışı kullanım hazır ✓');
          refreshStatus();
        }
      }
    });
  }

  async function registerSW() {
    if (location.protocol === 'file:') { refreshStatus(); return; }
    if (!('serviceWorker' in navigator)) { refreshStatus(); return; }
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      refreshStatus(); return;
    }
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      state.registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) {
        state.waitingWorker = reg.waiting;
      }
      trackInstalling(reg.installing);
      reg.addEventListener('updatefound', () => trackInstalling(reg.installing));
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (state.refreshing) return;
        state.refreshing = true;
        window.location.reload();
      });
      refreshStatus();
    } catch (err) {
      console.warn('Service worker kaydedilemedi:', err);
      const swStatus = $('pwa-sw-status');
      // v10.8: ham JS hata metni kullanıcıya gösterilmez; ayrıntı konsola yazılır.
      if (swStatus) swStatus.textContent = 'Service worker kaydı başarısız';
    }
  }

  async function checkForUpdates() {
    if (!state.registration) { toast('Service worker henüz hazır değil'); return; }
    try {
      await state.registration.update();
      toast(state.waitingWorker ? 'Yeni sürüm hazır' : 'Güncelleme kontrol edildi');
      refreshStatus();
    } catch (err) {
      toast('Güncelleme kontrol edilemedi');
    }
  }

  function applyUpdate() {
    if (state.waitingWorker) {
      state.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if (state.registration) {
      state.registration.update();
    }
  }

  async function promptInstall() {
    if (!state.deferredPrompt) { toast('Kurulum istemi şu anda kullanılamıyor'); return; }
    const promptEvent = state.deferredPrompt;
    promptEvent.prompt();
    try {
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') toast('Uygulama yükleniyor…');
    } catch (e) {}
    state.deferredPrompt = null;
    refreshStatus();
  }

  // ---- OCR çevrimdışı hazırlığı ----
  function swMessage(payload) {
    return new Promise((resolve, reject) => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        reject(new Error('Service worker henüz etkin değil. Sayfayı bir kez yenileyin.'));
        return;
      }
      const ch = new MessageChannel();
      const timer = setTimeout(() => reject(new Error('Zaman aşımı')), 180000);
      ch.port1.onmessage = (ev) => { clearTimeout(timer); resolve(ev.data); };
      navigator.serviceWorker.controller.postMessage(payload, [ch.port2]);
    });
  }

  async function refreshOcrStatus() {
    const el = $('ocr-cache-status');
    const btn = $('ocr-precache-btn');
    try {
      const st = await swMessage({ type: 'OCR_STATUS' });
      if (!el) return st;
      if (st.ready) {
        el.textContent = 'Hazır — çevrimdışı çalışır';
        el.className = 'text-[10px] font-semibold text-emerald-700';
        if (btn) btn.classList.add('hidden');
      } else {
        el.textContent = `${st.cached}/${st.total} dosya`;
        el.className = 'text-[10px] font-semibold text-amber-600';
        if (btn) btn.classList.remove('hidden');
      }
      return st;
    } catch (e) {
      if (el) {
        el.textContent = 'Henüz indirilmedi';
        el.className = 'text-[10px] font-semibold text-slate-400';
      }
      if (btn) btn.classList.remove('hidden');
      return { ready: false, count: 0, cached: 0, total: 5, error: String(e && e.message || e) };
    }
  }

  async function precacheOcr() {
    const btn = $('ocr-precache-btn');
    const el = $('ocr-cache-status');
    if (btn) { btn.disabled = true; btn.textContent = 'İndiriliyor… lütfen bekleyin'; btn.classList.add('opacity-60'); }
    try {
      const res = await swMessage({ type: 'PRECACHE_OCR' });
      if (res && res.ok) { toast('OCR dosyaları indirildi ✓'); }
      else throw new Error((res && res.error) || 'İndirme başarısız');
    } catch (err) {
      toast('OCR indirilemedi: ' + (err && err.message ? err.message : err));
      if (el) { el.textContent = 'İndirme başarısız'; el.className = 'text-[10px] font-semibold text-rose-600'; }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'OCR dosyalarını indir (~5,6 MB)'; btn.classList.remove('opacity-60'); }
      refreshOcrStatus();
    }
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    refreshStatus();
  });
  window.addEventListener('appinstalled', () => {
    state.installed = true;
    state.deferredPrompt = null;
    toast('Uygulama ana ekrana eklendi ✓');
    refreshStatus();
  });
  window.addEventListener('online', () => { state.dismissedOffline = false; refreshStatus(); });
  window.addEventListener('offline', () => { state.dismissedOffline = false; refreshStatus(); });

  document.addEventListener('DOMContentLoaded', () => {
    ensureBanner();
    const installBtn = $('pwa-install-btn');
    const updateBtn = $('pwa-update-btn');
    const checkBtn = $('pwa-check-btn');
    if (installBtn) installBtn.addEventListener('click', promptInstall);
    if (updateBtn) updateBtn.addEventListener('click', applyUpdate);
    if (checkBtn) checkBtn.addEventListener('click', checkForUpdates);
    const ocrBtn = $('ocr-precache-btn');
    if (ocrBtn) ocrBtn.addEventListener('click', precacheOcr);
    refreshStatus();
    registerSW();
    setTimeout(refreshOcrStatus, 1200);
  });

  window.YakitPWA = { state, registerSW, checkForUpdates, applyUpdate, promptInstall, refreshStatus, refreshOcrStatus, precacheOcr };
})();
