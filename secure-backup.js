/* Oktanote v11.4 — şifreli yedek (AES-GCM + PBKDF2, tamamen cihazda) */
(function () {
  'use strict';
  var ITER = 210000;
  function S() { return window.YakitSettings; }
  function toast(m) { if (window.OktanoteUI) OktanoteUI.toast(m); else if (window.showToast) window.showToast(m); }
  function b64(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(str) { var s = atob(str), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  async function keyFrom(password, salt, iter) {
    var enc = new TextEncoder();
    var base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter || ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptPayload(payload, password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await keyFrom(password, salt);
    var data = new TextEncoder().encode(JSON.stringify(payload));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data);
    return { format: 'oktanote-encrypted-backup', version: 1, kdf: 'PBKDF2-SHA256', iterations: ITER, salt: b64(salt), iv: b64(iv), ciphertext: b64(ct), createdAt: new Date().toISOString() };
  }
  async function decryptPayload(obj, password) {
    if (!obj || obj.format !== 'oktanote-encrypted-backup') throw new Error('Bu bir Oktanote şifreli yedeği değil.');
    var key = await keyFrom(password, unb64(obj.salt), obj.iterations || ITER);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, key, unb64(obj.ciphertext));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  function passwordModal(title, onSubmit, extra) {
    var html = '<div class="space-y-3">' + (extra || '') +
      '<label class="block text-xs font-semibold text-slate-600">Parola</label>' +
      '<input id="sb-pass" type="password" autocomplete="new-password" class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">' +
      '<p class="text-[10px] text-slate-400">Parola kaydedilmez. Kaybederseniz yedek çözülemez.</p>' +
      '<button type="button" id="sb-go" class="w-full bg-slate-800 text-white py-2 rounded-xl text-sm font-semibold">Devam</button>' +
      '<div id="sb-status" class="text-xs text-slate-500"></div></div>';
    OktanoteUI.open('secure-backup-modal', title, html);
    document.getElementById('sb-go').addEventListener('click', function () {
      var p = document.getElementById('sb-pass').value;
      if (!p || p.length < 6) { document.getElementById('sb-status').textContent = 'En az 6 karakter parola girin.'; return; }
      onSubmit(p);
    });
  }
  function exportPrompt() {
    if (!crypto || !crypto.subtle) { toast('Şifreli yedek için güvenli bağlam (HTTPS) gerekir'); return; }
    passwordModal('Şifreli yedek al', async function (pass) {
      var status = document.getElementById('sb-status'); status.textContent = 'Şifreleniyor…';
      try {
        var payload = await S().buildBackup({ photos: true });
        var enc = await encryptPayload(payload, pass);
        var blob = new Blob([JSON.stringify(enc)], { type: 'application/json' });
        var a = document.createElement('a');
        var d = new Date(); function p(n) { return String(n).padStart(2, '0'); }
        a.href = URL.createObjectURL(blob);
        a.download = 'oktanote-sifreli-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        S().set('lastBackupAt', payload.createdAt);
        OktanoteUI.close('secure-backup-modal'); toast('Şifreli yedek indirildi');
      } catch (e) { status.textContent = 'Hata: ' + e.message; }
    }, '<p class="text-xs text-slate-500">Tüm kayıtlar ve fotoğraflar parola ile şifrelenir.</p>');
  }
  function importPrompt() {
    var html = '<div class="space-y-3"><p class="text-xs text-slate-500">Şifreli yedek dosyasını seçin, ardından parolayı girin.</p>' +
      '<input id="sb-file" type="file" accept=".json,application/json" class="w-full text-xs"></div>';
    OktanoteUI.open('secure-backup-modal', 'Şifreli yedekten geri yükle', html);
    document.getElementById('sb-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var obj; try { obj = JSON.parse(r.result); } catch (err) { toast('Dosya geçerli JSON değil'); return; }
        passwordModal('Parolayı girin', async function (pass) {
          var status = document.getElementById('sb-status'); status.textContent = 'Çözülüyor…';
          try {
            var payload = await decryptPayload(obj, pass);
            var err = S().validateBackup(payload);
            if (err) { status.textContent = err; return; }
            if (!confirm('Şifreli yedek geri yüklenecek. Mevcut veriler değiştirilecek. Devam edilsin mi?')) return;
            await S().restoreBackup(payload, { photos: true });
            OktanoteUI.close('secure-backup-modal'); toast('Şifreli yedek geri yüklendi');
            if (window.renderAll) renderAll();
          } catch (err2) { status.textContent = 'Parola yanlış veya dosya bozuk.'; }
        });
      };
      r.readAsText(f);
    });
  }
  window.YakitSecureBackup = { exportPrompt: exportPrompt, importPrompt: importPrompt, encryptPayload: encryptPayload, decryptPayload: decryptPayload };
})();
