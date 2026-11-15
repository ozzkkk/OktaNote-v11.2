/* Oktanote v11.4 — İletişim formu, kurallar ve şartlar
 * Bağımsız modül: window.YakitContact
 *
 * Tasarım (sunucusuz):
 *  - Form verisi HİÇBİR sunucuya gönderilmez. "Gönder" düğmesi mailto: bağlantısı
 *    açar; mesajı kullanıcının kendi e-posta uygulaması gönderir.
 *  - Yedek olarak "Metni kopyala" vardır (mail uygulaması yoksa elle yapıştırılır).
 *  - Göndermeden önce kuralların okunduğunu belirten onay kutusu zorunludur.
 *  - Form içeriği localStorage'a YAZILMAZ; sayfa kapanınca kaybolur.
 */
(function () {
  'use strict';

  var EMAIL = 'o.elver@gmail.com';
  var TERMS_VERSION = '1.1';
  var TERMS_DATE = '2026-11-15';

  function lang() {
    return (window.YakitI18n && window.YakitI18n.getLang && window.YakitI18n.getLang() === 'en') ? 'en' : 'tr';
  }
  function $(id) { return document.getElementById(id); }
  function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }

  // ------------------------------------------------------------------
  // Kurallar ve şartlar
  // ------------------------------------------------------------------
  var TERMS_TR = [
    ['Kapsam', 'Bu metin, Oktanote uygulamasını ve uygulama içindeki iletişim formunu kullanımınız için geçerli koşulları açıklar. Uygulamayı veya iletişim formunu kullanarak bu koşulları kabul etmiş olursunuz.'],
    ['Uygulamanın niteliği', 'Oktanote, araç yakıt dolumlarını, giderleri, yolculukları ve bakımı kişisel olarak takip etmenizi sağlayan bir araçtır. Uygulama ücretsizdir, hesap açmayı gerektirmez ve bir ticari hizmet taahhüdü içermez. Sunulan hesaplamalar (tüketim, maliyet, tahmin) yaklaşık değerlerdir; resmî kayıt, fatura veya vergi belgesi yerine geçmez.'],
    ['Verileriniz nerede durur', 'Dolum, gider, yolculuk, araç ve bakım kayıtlarınız ile fotoğraflarınız yalnızca kendi cihazınızda (tarayıcının localStorage ve IndexedDB alanında) saklanır. Uygulamanın bir sunucusu yoktur; kayıtlarınız geliştiriciye veya üçüncü kişilere gönderilmez. Tarayıcı verilerini temizlemeniz hâlinde kayıtlar silinir; bu nedenle düzenli yedek almanız önerilir.'],
    ['İnternet gerektiren özellikler', 'Uygulama çevrimdışı çalışır. Yalnızca şu özellikler internet ister ve ilgili sağlayıcıya istek gönderir: (a) Hava durumu — seçtiğiniz şehrin koordinatı Open-Meteo servisine gönderilir. (b) İstasyon/şehir araması — yazdığınız arama metni Photon/OpenStreetMap servisine gönderilir. (c) Harita görüntüleri — OpenStreetMap karoları veya Google Haritalar yüklenir. Bu isteklerde kimliğiniz, kayıtlarınız veya fotoğraflarınız yer almaz. Konum izni yalnızca siz "Konumum" veya "GPS ile gezi başlat" düğmesine basarsanız istenir.'],
    ['İletişim formu nasıl çalışır', 'Formda yazdığınız ad, soyad, telefon, e-posta ve mesaj uygulama tarafından hiçbir sunucuya iletilmez ve cihazda saklanmaz. "Gönder" düğmesi, bu bilgileri içeren hazır bir e-posta penceresi (mailto bağlantısı) açar. Mesajı gönderen taraf sizin kendi e-posta uygulamanız ve e-posta sağlayıcınızdır. Gönderme işlemini e-posta uygulamanızda siz onaylarsınız. E-posta uygulamanız yapılandırılmamışsa "Metni kopyala" ile metni panoya alıp elle gönderebilirsiniz.'],
    ['İletişim formunda istenen bilgiler', 'Ad, soyad, e-posta ve mesaj alanları zorunludur; telefon isteğe bağlıdır. Bu bilgiler yalnızca size yanıt verebilmek için kullanılır. Zorunlu alanlar boş bırakıldığında veya kurallar onaylanmadığında gönderme düğmesi çalışmaz. Lütfen T.C. kimlik numarası, kart numarası, şifre gibi hassas bilgilerinizi mesajınıza yazmayın.'],
    ['Onay kutusu', '"Kuralları ve şartları okudum, kabul ediyorum" kutusunu işaretlemeden mesaj gönderemezsiniz. Bu onay, yukarıdaki veri işleyişini anladığınızı ve bilgilerinizi kendi e-postanızla göndermeyi kabul ettiğinizi gösterir.'],
    ['Yanıt', 'Mesajlar en kısa sürede yanıtlanmaya çalışılır; ancak belirli bir süre içinde yanıt verme, sorunu çözme veya destek sağlama yükümlülüğü yoktur. Uygulama tek kişi tarafından gönüllü olarak geliştirilmektedir.'],
    ['Uygun kullanım', 'Formu; spam, reklam, hakaret, tehdit, nefret söylemi, yasa dışı içerik veya başkasının kişisel verilerini izinsiz paylaşmak için kullanamazsınız. Bu tür mesajlar yanıtsız bırakılabilir ve gerekirse ilgili makamlara bildirilebilir.'],
    ['Sorumluluğun sınırı', 'Uygulama "olduğu gibi" sunulur. Veri kaybı, hatalı hesaplama, fiş okuma (OCR) hatası, harita/hava durumu verisinin yanlışlığı veya kullanımından doğan doğrudan ya da dolaylı zararlardan geliştirici sorumlu tutulamaz. Kaydettiğiniz bilgilerin doğruluğunu kontrol etmek sizin sorumluluğunuzdadır; fiş okuma sonuçları kaydedilmeden önce size gösterilir ve onayınız alınır.'],
    ['Üçüncü taraf bileşenleri', 'Uygulama; Tesseract.js (Apache-2.0), Leaflet (BSD-2), Tailwind CSS (MIT), Inter yazı tipi (OFL) ve Font Awesome Free (CC BY 4.0 / OFL / MIT) gibi açık kaynak bileşenlerden yararlanır. Ayrıntılı lisans metinleri uygulamanın LICENSES.txt dosyasındadır. Harita verileri © OpenStreetMap katkıda bulunanlar (ODbL) kaynaklıdır.'],
    ['Fikrî mülkiyet', 'Uygulamanın kaynak kodu ve tasarımı geliştiriciye aittir. Üçüncü taraf bileşenlerin hakları kendi lisanslarına tabidir.'],
    ['Değişiklikler', 'Bu metin güncellenebilir. Güncel sürüm uygulama içindeki "Kurallar ve Şartlar" bölümünde yayımlanır ve sürüm numarası ile tarihi belirtilir. Değişiklikten sonra formu kullanmaya devam etmeniz güncel metni kabul ettiğiniz anlamına gelir.'],
    ['İletişim', 'Her türlü soru, öneri ve hata bildirimi için: ' + EMAIL]
  ];

  var TERMS_EN = [
    ['Scope', 'This text explains the conditions that apply to your use of the Oktanote app and its in-app contact form. By using the app or the contact form you accept these conditions.'],
    ['Nature of the app', 'Oktanote is a personal tool for recording fuel fill-ups, expenses, trips and maintenance. It is free, requires no account and carries no commercial service commitment. Its calculations (consumption, cost, estimates) are approximate and do not replace official records, invoices or tax documents.'],
    ['Where your data lives', 'Your fill-up, expense, trip, vehicle and maintenance records and your photos are stored only on your own device (in the browser’s localStorage and IndexedDB). The app has no server; your records are not sent to the developer or to third parties. If you clear your browser data the records are deleted, so taking regular backups is recommended.'],
    ['Features that need internet', 'The app works offline. Only these features require internet and send a request to the relevant provider: (a) Weather — the coordinates of the city you selected are sent to Open-Meteo. (b) Station/city search — the search text you type is sent to Photon/OpenStreetMap. (c) Map imagery — OpenStreetMap tiles or Google Maps are loaded. These requests do not include your identity, your records or your photos. Location permission is requested only if you tap the "My location" or "Start a GPS trip" button.'],
    ['How the contact form works', 'The name, surname, phone, email and message you type are not transmitted to any server by the app and are not stored on the device. The "Send" button opens a pre-filled email window (a mailto link) containing this information. The message is sent by your own email app and email provider. You confirm the sending inside your email app. If no email app is configured, use "Copy text" to copy the message and send it manually.'],
    ['Information requested in the form', 'First name, last name, email and message are required; phone is optional. This information is used only to reply to you. The send button does not work while required fields are empty or these terms are not accepted. Please do not include sensitive data such as national ID numbers, card numbers or passwords in your message.'],
    ['Acceptance checkbox', 'You cannot send a message without ticking "I have read and accept the terms and conditions". This confirms that you understand the data flow above and agree to send your information through your own email.'],
    ['Replies', 'Messages are answered as soon as reasonably possible, but there is no obligation to reply within a specific time, to resolve an issue or to provide support. The app is developed voluntarily by a single person.'],
    ['Acceptable use', 'You may not use the form for spam, advertising, insults, threats, hate speech, unlawful content or for sharing someone else’s personal data without permission. Such messages may be left unanswered and, if necessary, reported to the relevant authorities.'],
    ['Limitation of liability', 'The app is provided "as is". The developer cannot be held liable for data loss, miscalculation, receipt scanning (OCR) errors, inaccuracy of map or weather data, or any direct or indirect damage arising from its use. Checking the accuracy of the information you save is your responsibility; receipt scanning results are shown to you for approval before anything is saved.'],
    ['Third-party components', 'The app uses open-source components such as Tesseract.js (Apache-2.0), Leaflet (BSD-2), Tailwind CSS (MIT), the Inter font (OFL) and Font Awesome Free (CC BY 4.0 / OFL / MIT). Full licence texts are in the app’s LICENSES.txt file. Map data is © OpenStreetMap contributors (ODbL).'],
    ['Intellectual property', 'The source code and design of the app belong to the developer. Rights in third-party components remain subject to their own licences.'],
    ['Changes', 'This text may be updated. The current version is published in the "Terms and Conditions" section inside the app, with its version number and date. Continuing to use the form after a change means you accept the updated text.'],
    ['Contact', 'For any question, suggestion or bug report: ' + EMAIL]
  ];

  function termsHtml(which) {
    var l = which || lang();
    var rows = l === 'en' ? TERMS_EN : TERMS_TR;
    var head = l === 'en'
      ? '<p class="text-[11px] text-slate-500 mb-3">Version ' + TERMS_VERSION + ' · Effective ' + TERMS_DATE + '</p>'
      : '<p class="text-[11px] text-slate-500 mb-3">Sürüm ' + TERMS_VERSION + ' · Yürürlük tarihi ' + TERMS_DATE.split('-').reverse().join('.') + '</p>';
    var body = rows.map(function (r, i) {
      return '<div class="mb-3"><div class="text-[12px] font-bold text-slate-800 mb-0.5">' + (i + 1) + '. ' + esc(r[0]) + '</div>' +
        '<div class="text-[11px] text-slate-600 leading-relaxed">' + esc(r[1]) + '</div></div>';
    }).join('');
    // v11.0: ayrıntılı yasal metinlere bağlantı (Bilgi bölümünde tam metin var)
    var links = '<div class="mt-1 pt-2 border-t border-slate-100 flex flex-wrap gap-2">' +
      '<button type="button" onclick="YakitLegal.open(\'eula\')" class="text-[11px] font-semibold text-blue-600 underline">' +
      (l === 'en' ? 'Full Terms of Use (EULA)' : 'Kullanım Koşulları’nın tamamı (EULA)') + '</button>' +
      '<button type="button" onclick="YakitLegal.open(\'privacy\')" class="text-[11px] font-semibold text-blue-600 underline">' +
      (l === 'en' ? 'Privacy Policy' : 'Gizlilik Politikası') + '</button></div>';
    return head + body + links;
  }

  function termsPlain(which) {
    var l = which || lang();
    var rows = l === 'en' ? TERMS_EN : TERMS_TR;
    var title = l === 'en' ? 'OKTANOTE — TERMS AND CONDITIONS' : 'OKTANOTE — KURALLAR VE ŞARTLAR';
    var ver = l === 'en' ? ('Version ' + TERMS_VERSION + ' · Effective ' + TERMS_DATE) : ('Sürüm ' + TERMS_VERSION + ' · Yürürlük tarihi ' + TERMS_DATE.split('-').reverse().join('.'));
    return title + '\n' + ver + '\n\n' + rows.map(function (r, i) { return (i + 1) + '. ' + r[0] + '\n' + r[1]; }).join('\n\n') + '\n';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ------------------------------------------------------------------
  // Doğrulama
  // ------------------------------------------------------------------
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  var PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

  function readForm() {
    return {
      first: String(($('contact-first') || {}).value || '').trim(),
      last: String(($('contact-last') || {}).value || '').trim(),
      phone: String(($('contact-phone') || {}).value || '').trim(),
      email: String(($('contact-email') || {}).value || '').trim(),
      message: String(($('contact-message') || {}).value || '').trim(),
      accepted: !!(($('contact-accept') || {}).checked)
    };
  }

  function validate(d) {
    var l = lang(), en = l === 'en';
    var errors = [];
    if (!d.first || d.first.length < 2) errors.push({ field: 'contact-first', msg: en ? 'Enter your first name.' : 'Adınızı girin.' });
    if (!d.last || d.last.length < 2) errors.push({ field: 'contact-last', msg: en ? 'Enter your last name.' : 'Soyadınızı girin.' });
    if (!d.email) errors.push({ field: 'contact-email', msg: en ? 'Enter your email address.' : 'E-posta adresinizi girin.' });
    else if (!EMAIL_RE.test(d.email)) errors.push({ field: 'contact-email', msg: en ? 'Enter a valid email address.' : 'Geçerli bir e-posta adresi girin.' });
    if (d.phone && !PHONE_RE.test(d.phone)) errors.push({ field: 'contact-phone', msg: en ? 'Enter a valid phone number or leave it empty.' : 'Geçerli bir telefon girin veya boş bırakın.' });
    if (!d.message || d.message.length < 10) errors.push({ field: 'contact-message', msg: en ? 'Write a message of at least 10 characters.' : 'En az 10 karakterlik bir mesaj yazın.' });
    if (d.message.length > 4000) errors.push({ field: 'contact-message', msg: en ? 'Message is too long (max 4000 characters).' : 'Mesaj çok uzun (en fazla 4000 karakter).' });
    if (!d.accepted) errors.push({ field: 'contact-accept', msg: en ? 'You must accept the terms and conditions.' : 'Kuralları ve şartları onaylamanız gerekir.' });
    return { ok: errors.length === 0, errors: errors };
  }

  function buildBody(d, which) {
    var en = (which || lang()) === 'en';
    var app = (window.YakitSettings && window.YakitSettings.APP_VERSION) || '';
    var lines = en ? [
      'OKTANOTE — CONTACT FORM',
      '',
      'First name: ' + d.first,
      'Last name: ' + d.last,
      'Phone: ' + (d.phone || '-'),
      'Email: ' + d.email,
      '',
      'MESSAGE',
      d.message,
      '',
      '---',
      'Terms accepted: yes (v' + TERMS_VERSION + ')',
      'App version: ' + app,
      'Language: ' + (en ? 'en' : 'tr'),
      'Date: ' + new Date().toISOString()
    ] : [
      'OKTANOTE — İLETİŞİM FORMU',
      '',
      'Ad: ' + d.first,
      'Soyad: ' + d.last,
      'Telefon: ' + (d.phone || '-'),
      'E-posta: ' + d.email,
      '',
      'MESAJ',
      d.message,
      '',
      '---',
      'Kurallar onayı: evet (sürüm ' + TERMS_VERSION + ')',
      'Uygulama sürümü: ' + app,
      'Dil: ' + lang(),
      'Tarih: ' + new Date().toISOString()
    ];
    return lines.join('\n');
  }

  function buildSubject(d, which) {
    var en = (which || lang()) === 'en';
    var name = (d.first + ' ' + d.last).trim();
    return (en ? 'Oktanote contact — ' : 'Oktanote iletişim — ') + name;
  }

  function buildMailto(d, which) {
    return 'mailto:' + EMAIL +
      '?subject=' + encodeURIComponent(buildSubject(d, which)) +
      '&body=' + encodeURIComponent(buildBody(d, which));
  }

  // ------------------------------------------------------------------
  // Arayüz
  // ------------------------------------------------------------------
  function setStatus(msg, kind) {
    var el = $('contact-status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'text-[11px] leading-relaxed ' +
      (kind === 'error' ? 'text-rose-600' : kind === 'ok' ? 'text-emerald-700' : 'text-slate-500');
  }

  function markField(id, bad) {
    var el = $(id);
    if (!el) return;
    if (bad) el.classList.add('border-rose-400');
    else el.classList.remove('border-rose-400');
  }

  function refreshSendState() {
    var d = readForm();
    var btn = $('contact-send');
    var copy = $('contact-copy');
    var ready = validate(d).ok;
    if (btn) {
      btn.disabled = !ready;
      btn.classList.toggle('opacity-40', !ready);
      btn.classList.toggle('cursor-not-allowed', !ready);
    }
    if (copy) {
      // Kopyala, onay istemeden de çalışır (mail uygulaması olmayanlar için)
      var hasText = !!(d.message && d.first && d.email);
      copy.disabled = !hasText;
      copy.classList.toggle('opacity-40', !hasText);
    }
    var counter = $('contact-count');
    if (counter) counter.textContent = String(d.message.length) + '/4000';
    return ready;
  }

  function open() {
    var m = $('contact-modal');
    if (!m) return;
    m.classList.remove('hidden');
    // Alt bilgi notu zaten sabit; burada tekrarlamak yerine yol gösteren ipucu ver.
    setStatus(lang() === 'en'
      ? 'Fill in the fields and accept the terms to enable "Send".'
      : 'Gönder’i açmak için alanları doldurun ve kuralları onaylayın.');
    ['contact-first', 'contact-last', 'contact-phone', 'contact-email', 'contact-message'].forEach(function (id) { markField(id, false); });
    refreshSendState();
    setTimeout(function () { var f = $('contact-first'); if (f) f.focus(); }, 120);
  }

  function close() {
    var m = $('contact-modal');
    if (m) m.classList.add('hidden');
    closeTerms();
  }

  function openTerms() {
    var m = $('contact-terms-modal'), b = $('contact-terms-body');
    if (b) b.innerHTML = termsHtml();
    if (m) m.classList.remove('hidden');
  }
  function closeTerms() {
    var m = $('contact-terms-modal');
    if (m) m.classList.add('hidden');
  }

  function acceptFromTerms() {
    var cb = $('contact-accept');
    if (cb) cb.checked = true;
    closeTerms();
    refreshSendState();
    toast(lang() === 'en' ? 'Terms accepted' : 'Kurallar onaylandı');
  }

  function submit() {
    var d = readForm();
    var v = validate(d);
    ['contact-first', 'contact-last', 'contact-phone', 'contact-email', 'contact-message'].forEach(function (id) { markField(id, false); });
    if (!v.ok) {
      v.errors.forEach(function (e) { markField(e.field, true); });
      setStatus(v.errors[0].msg, 'error');
      var first = $(v.errors[0].field);
      if (first && first.focus) first.focus();
      return false;
    }
    var url = buildMailto(d);
    setStatus(lang() === 'en'
      ? 'Your email app is opening. If nothing happens, use "Copy text" and send it to ' + EMAIL + '.'
      : 'E-posta uygulamanız açılıyor. Açılmazsa "Metni kopyala" ile kopyalayıp ' + EMAIL + ' adresine gönderin.', 'ok');
    try { window.location.href = url; } catch (e) {
      setStatus((lang() === 'en' ? 'Could not open the email app: ' : 'E-posta uygulaması açılamadı: ') + (e && e.message ? e.message : e), 'error');
      return false;
    }
    return true;
  }

  async function copy() {
    var d = readForm();
    var text = (lang() === 'en' ? 'To: ' : 'Kime: ') + EMAIL + '\n' +
      (lang() === 'en' ? 'Subject: ' : 'Konu: ') + buildSubject(d) + '\n\n' + buildBody(d);
    var ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; }
    } catch (e) { ok = false; }
    if (!ok) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) { ok = false; }
    }
    setStatus(ok
      ? (lang() === 'en' ? 'Copied. Paste it into an email to ' + EMAIL + '.' : 'Kopyalandı. ' + EMAIL + ' adresine e-posta olarak yapıştırabilirsiniz.')
      : (lang() === 'en' ? 'Could not copy; select the text manually.' : 'Kopyalanamadı; metni elle seçebilirsiniz.'), ok ? 'ok' : 'error');
    return ok;
  }

  function bind() {
    ['contact-first', 'contact-last', 'contact-phone', 'contact-email', 'contact-message'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () { markField(id, false); refreshSendState(); });
    });
    var cb = $('contact-accept');
    if (cb) cb.addEventListener('change', refreshSendState);
    var m = $('contact-modal');
    if (m) m.addEventListener('click', function (e) { if (e.target === m) close(); });
    var t = $('contact-terms-modal');
    if (t) t.addEventListener('click', function (e) { if (e.target === t) closeTerms(); });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  }

  window.YakitContact = {
    EMAIL: EMAIL, TERMS_VERSION: TERMS_VERSION, TERMS_DATE: TERMS_DATE,
    termsHtml: termsHtml, termsPlain: termsPlain,
    readForm: readForm, validate: validate, buildBody: buildBody, buildSubject: buildSubject, buildMailto: buildMailto,
    open: open, close: close, openTerms: openTerms, closeTerms: closeTerms, acceptFromTerms: acceptFromTerms,
    submit: submit, copy: copy, refreshSendState: refreshSendState, bind: bind
  };
})();
