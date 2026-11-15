/* Yakıt Takip v11.0 — Yasal metinler ve bilgi ekranları
 * Kullanım Koşulları (EULA), Gizlilik Politikası (KVKK + GDPR),
 * Değişiklik Günlüğü, Hakkında ve Açık Kaynak Lisansları.
 *
 * Geliştirici adı kullanıcı tercihiyle isimsizdir: "Yakıt Takip geliştiricisi".
 * Metinler tek kaynaktan (bölüm dizileri) hem HTML hem düz metin üretir.
 * Bu metinler bilgilendirme amaçlıdır; hukuki danışmanlık değildir.
 */
(function () {
  'use strict';

  var DOC_VERSION = '1.0';
  var EFFECTIVE = '2026-11-15';
  var DEVELOPER_TR = 'Yakıt Takip geliştiricisi';
  var DEVELOPER_EN = 'the Fuel Tracker developer';
  var EMAIL = 'o.elver@gmail.com';
  var REPO = 'https://github.com/ozzkkk/yakittakipv.10.3';

  function lang(l) {
    if (l === 'tr' || l === 'en') return l;
    return (window.YakitI18n && window.YakitI18n.getLang && window.YakitI18n.getLang() === 'en') ? 'en' : 'tr';
  }
  function trDate(iso) { var p = String(iso).split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
  function enDate(iso) {
    var M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var p = String(iso).split('-'); return M[Number(p[1]) - 1] + ' ' + Number(p[2]) + ', ' + p[0];
  }
  function appVersion() {
    return (window.YakitSettings && window.YakitSettings.APP_VERSION) || '11.0.0';
  }

  // ==================================================================
  // KULLANIM KOŞULLARI (EULA)
  // ==================================================================
  var EULA_TR = [
    { h: 'Taraflar ve kapsam', p: [
      'Bu Kullanım Koşulları ("Koşullar"), Yakıt Takip adlı web uygulamasını ("Uygulama") kullanan siz ("Kullanıcı") ile ' + DEVELOPER_TR + ' ("Geliştirici") arasında kurulur. Uygulamayı açarak, kurarak veya kullanarak bu Koşulları kabul etmiş olursunuz.',
      'Koşulları kabul etmiyorsanız Uygulamayı kullanmayınız ve ana ekrana eklediğiniz kısayolu kaldırınız.'
    ] },
    { h: 'Uygulamanın niteliği', p: [
      'Uygulama; araç yakıt dolumlarını, giderlerini, gezilerini ve bakımını kişisel olarak takip etmenizi sağlayan ücretsiz bir araçtır. Hesap açma, abonelik veya ödeme gerektirmez.',
      'Uygulama bir ticari hizmet, muhasebe programı veya resmî kayıt sistemi değildir. Sunulan hesaplamalar (tüketim, maliyet, menzil, tahmin) yaklaşık değerlerdir; fatura, vergi belgesi, sigorta veya yargı mercii nezdinde delil yerine geçmez.'
    ] },
    { h: 'Lisans', p: [
      'Geliştirici size; Uygulamayı kişisel ve ticari olmayan kullanımınız için, münhasır olmayan, devredilemez, alt lisanslanamaz ve ücretsiz bir kullanım lisansı verir.',
      'Bu lisans mülkiyet devri değildir. Uygulamanın kaynak kodu, tasarımı ve marka öğeleri üzerindeki haklar saklıdır. Üçüncü taraf açık kaynak bileşenleri kendi lisanslarına tabidir (bkz. Açık Kaynak Lisansları).'
    ] },
    { h: 'Kullanıcının yükümlülükleri', p: [
      'Girdiğiniz verilerin doğruluğundan ve güncelliğinden siz sorumlusunuz. Uygulama, girdiğiniz değerleri kabul eder; bunların gerçekliği denetlenmez.',
      'Verileriniz yalnızca kendi cihazınızda saklandığı için YEDEK ALMAK SİZİN SORUMLULUĞUNUZDADIR. Ayarlar → Yedekleme bölümünden düzenli yedek almanız önerilir.',
      'Uygulamayı yürürlükteki mevzuata aykırı biçimde kullanamazsınız.'
    ] },
    { h: 'Yasaklı kullanım', p: [
      'Uygulamayı tersine mühendislikle kaynak koda dönüştürüp kendi ürününüz olarak dağıtmak, üçüncü taraf servislerine aşırı veya otomatik istek göndermek, güvenlik önlemlerini aşmaya çalışmak, başkasının kişisel verilerini izinsiz girmek veya Uygulamayı yanıltıcı biçimde kendi markanızla sunmak yasaktır.',
      'Açık kaynak bileşenlerinin kendi lisanslarının verdiği haklar bu maddeden etkilenmez.'
    ] },
    { h: 'Verilerin saklanması ve kayıp riski', p: [
      'Kayıtlarınız tarayıcınızın localStorage ve IndexedDB alanında, kendi cihazınızda durur. Geliştiricinin bir sunucusu, veritabanı veya kullanıcı hesabı sistemi yoktur.',
      'Tarayıcı verilerini temizlemeniz, cihazı sıfırlamanız, tarayıcıyı kaldırmanız, gizli sekme kullanmanız veya depolama kotasının dolması VERİ KAYBINA yol açabilir. Geliştirici bu kayıplardan sorumlu tutulamaz.'
    ] },
    { h: 'İnternet gerektiren özellikler', p: [
      'Uygulama çevrimdışı çalışır. Yalnızca şu özellikler internet ister: hava durumu (Open-Meteo), şehir/istasyon arama (Photon/OpenStreetMap), harita görüntüleri (OpenStreetMap veya Google Haritalar).',
      'Bu servisler üçüncü taraflarca işletilir; kullanılabilirlikleri, doğrulukları ve kendi kullanım koşulları Geliştiricinin kontrolünde değildir. Servislerin kesilmesi veya değiştirmesi Uygulamanın ilgili özelliğini etkileyebilir.'
    ] },
    { h: 'Fiş tarama (OCR)', p: [
      'Fiş fotoğrafları cihazınızda, çevrimdışı bir optik karakter tanıma motoruyla işlenir; görüntüler hiçbir sunucuya gönderilmez.',
      'OCR sonucu TAHMİNDİR. Rakamlar, tarih ve saat hatalı okunabilir. Kaydetmeden önce gösterilen değerleri kontrol etmek ve gerekirse düzeltmek sizin yükümlülüğünüzdedir. Uygulama hiçbir sonucu onayınız olmadan kaydetmez.'
    ] },
    { h: 'İletişim formu', p: [
      'Menüdeki İletişim formu sunucuya veri göndermez. "Gönder" düğmesi, yazdıklarınızı içeren hazır bir e-posta penceresi açar; mesajı kendi e-posta uygulamanız gönderir.',
      'Formu göndermeden önce kuralları onaylamanız istenir. Gönderdiğiniz e-posta, talebinizi yanıtlayabilmek için e-posta hesabınızda ve Geliştiricinin gelen kutusunda kalır.'
    ] },
    { h: 'Fikrî mülkiyet', p: [
      'Uygulamanın adı, logosu, arayüz tasarımı ve özgün kodu Geliştiriciye aittir. Bu Koşullar size bu öğeler üzerinde herhangi bir marka veya telif hakkı devretmez.',
      'Girdiğiniz veriler ve yüklediğiniz fotoğraflar üzerindeki tüm haklar size aittir; Geliştirici bunlara erişmez ve bunlar üzerinde hak iddia etmez.'
    ] },
    { h: 'Açık kaynak bileşenleri', p: [
      'Uygulama; Tesseract.js, tesseract.js-core, tessdata_fast, Leaflet, Tailwind CSS, Inter yazı tipi ve Font Awesome gibi açık kaynak bileşenler kullanır. Bu bileşenlerin lisansları LICENSES.txt dosyasında ve Ayarlar → Bilgi → Açık kaynak lisansları ekranında listelenir.',
      'Hava durumu verisi Open-Meteo (CC BY 4.0), arama ve harita verisi OpenStreetMap katkıcıları (ODbL) kaynaklıdır.'
    ] },
    { h: 'Garanti reddi', p: [
      'Uygulama "OLDUĞU GİBİ" ve "MEVCUT HALİYLE" sunulur. Kesintisizlik, hatasızlık, belirli bir amaca uygunluk, veri kaybı yaşanmaması veya hesaplamaların doğruluğu konusunda açık veya zımni hiçbir garanti verilmez.',
      'Geliştirici, Uygulamayı herhangi bir zamanda değiştirme, özellik ekleme/çıkarma veya yayından kaldırma hakkını saklı tutar.'
    ] },
    { h: 'Sorumluluğun sınırı', p: [
      'Yürürlükteki emredici mevzuatın izin verdiği en geniş ölçüde Geliştirici; veri kaybı, kâr kaybı, yanlış hesaplama, araç arızası, yakıt tasarrufu kaybı veya dolaylı/arızi zararlardan sorumlu değildir.',
      'Uygulama ücretsiz sunulduğundan, Geliştiricinin toplam sorumluluğu — hukuken geçerli olduğu ölçüde — sıfır Türk Lirası ile sınırlıdır. Tüketici mevzuatından doğan ve sözleşmeyle kaldırılamayan haklarınız saklıdır.'
    ] },
    { h: 'Kişisel veriler', p: [
      'Kişisel verilerin işlenmesine ilişkin ayrıntılar Gizlilik Politikası\'nda yer alır. Bu politika 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve Avrupa Birliği Genel Veri Koruma Tüzüğü ("GDPR") çerçevesinde hazırlanmıştır.',
      'Uygulamanın tasarımı gereği kayıtlarınız cihazınızdan çıkmaz; bu nedenle Geliştirici veri sorumlusu sıfatıyla kayıtlarınıza erişmez, işlemez ve aktarmaz. İletişim formuyla kendiniz gönderdiğiniz bilgiler bu kapsamın dışındadır.'
    ] },
    { h: 'Değişiklikler', p: [
      'Bu Koşullar güncellenebilir. Güncel metin her zaman Uygulamanın Bilgi ekranında yayımlanır ve sürüm numarası ile yürürlük tarihi taşır.',
      'Esaslı değişikliklerden sonra Uygulamayı kullanmaya devam etmeniz, güncel Koşulları kabul ettiğiniz anlamına gelir. Kabul etmiyorsanız kullanmayı bırakınız.'
    ] },
    { h: 'Fesih', p: [
      'Uygulamayı dilediğiniz zaman kullanmayı bırakabilir, kısayolunu kaldırabilir ve Ayarlar → Veri bölümünden tüm kayıtları silebilirsiniz. Bu, lisansınızı kendiliğinden sona erdirir.',
      'Koşulları ihlal etmeniz hâlinde Geliştirici lisansınızı sona erdirebilir. Niteliği gereği sona ermeden önce yapılmış kullanımlar için sorumluluk sınırları geçerliliğini korur.'
    ] },
    { h: 'Uygulanacak hukuk', p: [
      'Bu Koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda Türkiye mahkemeleri ve icra daireleri yetkilidir; tüketici sıfatını haiz Kullanıcılar için tüketici hakem heyetleri ve tüketici mahkemelerine başvuru hakkı saklıdır.',
      'Avrupa Birliği\'nde yerleşik Kullanıcıların, kendi ülkesinin emredici tüketici ve veri koruma hükümlerinden doğan hakları bu maddeyle ortadan kaldırılmaz.'
    ] },
    { h: 'İletişim', p: [
      'Bu Koşullara ilişkin sorularınız için: ' + EMAIL + ' veya Menü → İletişim.',
      'Bu metin bilgilendirme amaçlı hazırlanmıştır; hukuki danışmanlık yerine geçmez.'
    ] }
  ];

  var EULA_EN = [
    { h: 'Parties and scope', p: [
      'These Terms of Use ("Terms") are between you ("User") and ' + DEVELOPER_EN + ' ("Developer") and govern the web application named Fuel Tracker ("App"). By opening, installing or using the App you accept these Terms.',
      'If you do not accept them, do not use the App and remove any home-screen shortcut.'
    ] },
    { h: 'Nature of the App', p: [
      'The App is a free tool for personally tracking vehicle fill-ups, expenses, trips and maintenance. It requires no account, subscription or payment.',
      'The App is not a commercial service, an accounting package or an official record system. Its calculations (consumption, cost, range, estimates) are approximate and do not replace an invoice, tax document or evidence before an authority.'
    ] },
    { h: 'Licence', p: [
      'The Developer grants you a non-exclusive, non-transferable, non-sublicensable, free licence to use the App for personal, non-commercial purposes.',
      'This is not a transfer of ownership. Rights in the source code, design and brand elements are reserved. Third-party open-source components remain under their own licences (see Open-source licences).'
    ] },
    { h: 'Your responsibilities', p: [
      'You are responsible for the accuracy and currency of the data you enter. The App accepts your input; it does not verify it against reality.',
      'Because your records live only on your own device, TAKING BACKUPS IS YOUR RESPONSIBILITY. Regular backups via Settings → Backup are recommended.',
      'You may not use the App in breach of applicable law.'
    ] },
    { h: 'Prohibited use', p: [
      'You may not reverse-engineer the App and redistribute it as your own product, send excessive or automated requests to third-party services, attempt to defeat security measures, enter another person\'s personal data without permission, or present the App misleadingly under your own brand.',
      'Rights granted by the licences of open-source components are unaffected by this clause.'
    ] },
    { h: 'Storage and risk of loss', p: [
      'Your records are stored in your browser\'s localStorage and IndexedDB on your own device. The Developer operates no server, database or account system.',
      'Clearing browser data, resetting the device, uninstalling the browser, using private tabs or exceeding the storage quota MAY CAUSE DATA LOSS. The Developer cannot be held liable for such loss.'
    ] },
    { h: 'Features that need internet', p: [
      'The App works offline. Only these features require internet: weather (Open-Meteo), city/station search (Photon/OpenStreetMap) and map tiles (OpenStreetMap or Google Maps).',
      'These services are operated by third parties; their availability, accuracy and terms are outside the Developer\'s control. Their outage or change may affect the related feature.'
    ] },
    { h: 'Receipt scanning (OCR)', p: [
      'Receipt photos are processed on your device by an offline optical character recognition engine; images are never sent to any server.',
      'OCR output is an ESTIMATE. Figures, dates and times may be misread. Checking and, where needed, correcting the values before saving is your responsibility. Nothing is saved without your approval.'
    ] },
    { h: 'Contact form', p: [
      'The Contact form in the menu sends no data to a server. The "Send" button opens a pre-filled email window; your own email app sends the message.',
      'You are asked to accept the terms before sending. The email you send remains in your mailbox and in the Developer\'s inbox so that your request can be answered.'
    ] },
    { h: 'Intellectual property', p: [
      'The App\'s name, logo, interface design and original code belong to the Developer. These Terms transfer no trademark or copyright to you.',
      'All rights in the data you enter and the photos you upload remain yours; the Developer does not access them and claims no rights over them.'
    ] },
    { h: 'Open-source components', p: [
      'The App uses open-source components including Tesseract.js, tesseract.js-core, tessdata_fast, Leaflet, Tailwind CSS, the Inter typeface and Font Awesome. Their licences are listed in LICENSES.txt and under Settings → Info → Open-source licences.',
      'Weather data comes from Open-Meteo (CC BY 4.0); search and map data from OpenStreetMap contributors (ODbL).'
    ] },
    { h: 'Disclaimer of warranty', p: [
      'The App is provided "AS IS" and "AS AVAILABLE". No express or implied warranty is given as to uninterrupted operation, absence of defects, fitness for a particular purpose, freedom from data loss or accuracy of calculations.',
      'The Developer reserves the right to change the App, add or remove features, or withdraw it at any time.'
    ] },
    { h: 'Limitation of liability', p: [
      'To the fullest extent permitted by mandatory law, the Developer is not liable for data loss, loss of profit, miscalculation, vehicle damage, lost fuel savings or any indirect or incidental damage.',
      'As the App is provided free of charge, the Developer\'s total liability — where legally enforceable — is limited to zero. Your statutory consumer rights that cannot be waived by contract remain unaffected.'
    ] },
    { h: 'Personal data', p: [
      'Details on the processing of personal data are set out in the Privacy Policy, prepared with reference to Turkish Law No. 6698 on the Protection of Personal Data ("KVKK") and the EU General Data Protection Regulation ("GDPR").',
      'By design your records never leave your device, so the Developer does not access, process or transfer them as a data controller. Information you send yourself via the Contact form is outside that scope.'
    ] },
    { h: 'Changes', p: [
      'These Terms may be updated. The current text is always published in the App\'s Info screen and carries a version number and effective date.',
      'Continuing to use the App after a material change means you accept the updated Terms. If you do not accept them, stop using the App.'
    ] },
    { h: 'Termination', p: [
      'You may stop using the App at any time, remove its shortcut and delete all records under Settings → Data. That automatically ends your licence.',
      'The Developer may terminate your licence if you breach these Terms. Limitations of liability survive for use that occurred before termination.'
    ] },
    { h: 'Governing law', p: [
      'These Terms are governed by the law of the Republic of Türkiye. The courts and enforcement offices of Türkiye have jurisdiction; Users acting as consumers retain the right to apply to consumer arbitration committees and consumer courts.',
      'For Users resident in the European Union, mandatory consumer and data-protection rights under the law of their own country are not removed by this clause.'
    ] },
    { h: 'Contact', p: [
      'Questions about these Terms: ' + EMAIL + ' or Menu → Contact.',
      'This text is provided for information and is not legal advice.'
    ] }
  ];

  // ==================================================================
  // GİZLİLİK POLİTİKASI (KVKK + GDPR)
  // ==================================================================
  var PRIVACY_TR = [
    { h: 'Veri sorumlusu ve amaç', p: [
      'Bu politika, 6698 sayılı KVKK maddesi 10 kapsamındaki aydınlatma yükümlülüğü ve GDPR maddeleri 13–14 kapsamındaki bilgilendirme yükümlülüğü gözetilerek hazırlanmıştır.',
      'Veri sorumlusu: ' + DEVELOPER_TR + '. İletişim: ' + EMAIL + '. Uygulamanın bir tüzel kişiliği, çağrı merkezi veya veri koruma görevlisi atanmasını gerektiren bir örgütü yoktur.'
    ] },
    { h: 'Özet: verileriniz cihazınızda', p: [
      'Yakıt Takip, kayıtlarınızı SUNUCUYA GÖNDERMEZ. Dolum, gider, gezi, araç, bakım kayıtlarınız, ayarlarınız ve fiş fotoğraflarınız yalnızca kendi cihazınızda, tarayıcının localStorage ve IndexedDB alanında saklanır.',
      'Geliştirici bu kayıtlara erişemez, göremez, kopyalayamaz, analiz edemez veya üçüncü kişilerle paylaşamaz. Uygulamada kullanıcı hesabı, oturum açma, analitik, reklam veya izleme kodu yoktur.'
    ] },
    { h: 'Cihazınızda tutulan veri kategorileri', p: [
      'Araç bilgileri: ad, tür, simge, plaka benzeri etiket (girerseniz), sayaç değeri, depo kapasitesi, yakıt türü.',
      'İşlem kayıtları: dolum (tarih, saat, litre, birim fiyat, toplam, sayaç, istasyon, hava durumu, not), gider, gezi, bakım; fiş fotoğrafları.',
      'Tercihler: dil, birimler, para birimi, tarih biçimi, hafta başlangıcı, varsayılan sayfa, seçilen hava durumu şehri ve koordinatı.',
      'Bu veriler kimlik bilgilerinizi içermez; isterseniz not veya etiket alanlarına kendi isteğinizle kişisel bilgi yazabilirsiniz. Yazdıklarınız da yalnızca cihazınızda kalır.'
    ] },
    { h: 'Hukuki sebep', p: [
      'Cihazınızda tutulan kayıtlar bakımından veri işleme, uygulamanın çalışması için zorunludur ve tamamen sizin kontrolünüzdedir (KVKK m.5/2-c: bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olma; GDPR m.6/1-b).',
      'İnternet gerektiren özellikler ve konum izni yalnızca sizin talebinizle çalışır; bu işlemler bakımından hukuki sebep açık rızanızdır (KVKK m.5/1; GDPR m.6/1-a). Rızayı, ilgili düğmeye basmayarak veya ayarı kapatarak her zaman geri alabilirsiniz.',
      'İletişim formuyla gönderdiğiniz e-posta bakımından hukuki sebep, talebinizin yanıtlanması için gerekliliktir (GDPR m.6/1-b ve f).'
    ] },
    { h: 'Fiş fotoğrafları ve OCR', p: [
      'Fiş tarama tamamen cihazınızda çalışır. Tesseract motoru ve Türkçe dil modeli uygulama klasöründen yüklenir; görüntü işleme tarayıcı içinde bir WebWorker\'da yapılır.',
      'Fotoğraflarınız hiçbir sunucuya, bulut servisine veya yapay zekâ hizmetine GÖNDERİLMEZ. İnternet bağlantısı kesikken de fiş tarayabilirsiniz.'
    ] },
    { h: 'Konum bilgisi', p: [
      'Konum izni yalnızca "Konumum" veya "Konumdan Güncelle" düğmesine bastığınızda istenir. Alınan koordinat yalnızca o işlem için kullanılır, kayıtlarınıza yazılmaz ve Geliştiriciye gönderilmez.',
      'Ayarlar\'dan seçtiğiniz hava durumu şehri ve koordinatı cihazınızda saklanır ve hava durumu isteğinde kullanılır.'
    ] },
    { h: 'İnternete giden istekler', p: [
      'Hava durumu — Open-Meteo (api.open-meteo.com): yalnızca seçilen şehrin enlem ve boylamı gönderilir. Sonuç 30 dakika cihazda önbelleğe alınır.',
      'Şehir / istasyon arama — Photon (photon.komoot.io, OpenStreetMap verisi): yalnızca arama kutusuna yazdığınız metin gönderilir.',
      'Harita — OpenStreetMap karoları veya Google Haritalar: yalnızca harita ekranını açtığınızda, görüntülenen bölgenin karoları istenir. Bu isteklerde teknik olarak IP adresiniz servis sağlayıcıya görünür.',
      'Uygulama dosyaları — barındırma sağlayıcısı (GitHub Pages): uygulama ilk açılışında dosyaları indirir; bu, her web sitesinde olduğu gibi standart sunucu günlüğü doğurur.',
      'Bu isteklerde kimliğiniz, kayıtlarınız, notlarınız veya fotoğraflarınız yer almaz.'
    ] },
    { h: 'Çerezler, analitik ve reklam', p: [
      'Uygulama çerez (cookie) kullanmaz, reklam göstermez, üçüncü taraf analitik veya izleme betiği çalıştırmaz. Yalnızca çalışmak için gereken yerel depolama kullanılır.',
      'Bu nedenle bir çerez onay bandı gösterilmez.'
    ] },
    { h: 'Yurt dışına aktarım', p: [
      'Yukarıdaki isteğe bağlı servisler yurt dışında bulunabilir. İlgili özelliği kullandığınızda, gönderilen sınırlı teknik veri (koordinat, arama metni veya karo isteği) o servisin sunucusuna gider.',
      'Bu aktarım KVKK m.9 ve GDPR Bölüm V kapsamında değerlendirilmelidir. Aktarım, yalnızca siz ilgili düğmeye bastığınızda ve açık rızanızla gerçekleşir; istemezseniz bu özellikleri kullanmayarak aktarımı tamamen önleyebilirsiniz. Uygulamanın geri kalanı çevrimdışı çalışmaya devam eder.'
    ] },
    { h: 'Saklama süresi', p: [
      'Cihazınızdaki kayıtlar siz silene kadar kalır. Tek bir kaydı silebilir, Ayarlar → Veri bölümünden tümünü sıfırlayabilir veya tarayıcı verilerini temizleyebilirsiniz.',
      'Hava durumu önbelleği 30 dakika sonra geçersiz sayılır. Uygulama içi otomatik yedekler, ayarlarda belirlediğiniz sayıda tutulur.',
      'İletişim formuyla gönderdiğiniz e-posta, talebiniz sonuçlandıktan sonra en fazla 2 yıl süreyle gelen kutusunda tutulabilir; daha erken silinmesini isteyebilirsiniz.'
    ] },
    { h: 'Veri güvenliği', p: [
      'Veriler cihazınızın ve tarayıcınızın güvenlik sınırları içinde korunur. Uygulama dışarıya veri göndermediği için merkezî bir veri ihlali riski taşımaz.',
      'Cihazınıza erişen kişiler kayıtlarınızı görebilir. Cihaz kilidi kullanmanız ve paylaşımlı cihazlarda tarayıcı profilinizi korumanız önerilir. Ortak kullanılan bir cihazda verilerinizi silmeniz yeterlidir.'
    ] },
    { h: 'KVKK kapsamındaki haklarınız', p: [
      'KVKK maddesi 11 uyarınca; kişisel verinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, kanunda öngörülen şartlarla silinmesini veya yok edilmesini isteme, bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde giderilmesini talep etme haklarına sahipsiniz.',
      'Cihazınızda tutulan veriler için bu hakların çoğunu doğrudan kendiniz, uygulama içinde kullanabilirsiniz: görüntüleme, düzeltme ve silme işlemleri arayüzde mevcuttur.'
    ] },
    { h: 'GDPR kapsamındaki haklarınız', p: [
      'AB\'de yerleşikyseniz GDPR maddeleri 15–22 uyarınca erişim, düzeltme, silme ("unutulma hakkı"), işlemeyi kısıtlama, veri taşınabilirliği, itiraz ve otomatik karar vermeye tabi olmama haklarına sahipsiniz.',
      'Veri taşınabilirliği uygulama içinde karşılanır: Ayarlar → Yedekleme ile tüm kayıtlarınızı tek bir JSON dosyası olarak indirebilir, dolumları CSV olarak dışa aktarabilirsiniz.',
      'Ayrıca yerleşik olduğunuz ülkedeki veri koruma denetim otoritesine şikâyet hakkınız vardır (GDPR m.77).'
    ] },
    { h: 'Başvuru yolu', p: [
      'Taleplerinizi ' + EMAIL + ' adresine iletebilirsiniz. KVKK m.13 uyarınca başvurular en geç 30 gün içinde sonuçlandırılır.',
      'Yanıtımız yetersiz gelirse, KVKK m.14 uyarınca Kişisel Verileri Koruma Kurulu\'na; AB\'de yerleşikseniz ilgili denetim otoritesine şikâyette bulunabilirsiniz.'
    ] },
    { h: 'Çocukların verileri', p: [
      'Uygulama çocuklara yönelik tasarlanmamıştır ve bilerek çocuklardan veri toplamaz. Uygulamanın sunucusu olmadığı için zaten hiçbir kullanıcı verisi toplanmaz.'
    ] },
    { h: 'İletişim formunda paylaştığınız bilgiler', p: [
      'Formda ad, soyad, isteğe bağlı telefon, e-posta ve mesaj istenir. Bu bilgiler uygulama tarafından hiçbir sunucuya iletilmez ve cihazda saklanmaz; pencere kapanınca kaybolur.',
      '"Gönder" düğmesi kendi e-posta uygulamanızı açar. Gönderdiğinizde bilgiler, kendi e-posta sağlayıcınız üzerinden Geliştiricinin gelen kutusuna ulaşır ve yalnızca talebinizi yanıtlamak için kullanılır; pazarlama amacıyla kullanılmaz veya üçüncü kişilere satılmaz.'
    ] },
    { h: 'Değişiklikler', p: [
      'Bu politika güncellenebilir. Güncel metin Uygulamanın Bilgi ekranında yayımlanır; sürüm numarası ve yürürlük tarihi metnin başında yer alır.'
    ] },
    { h: 'İletişim', p: [
      'Veri sorumlusuna ulaşmak için: ' + EMAIL + ' veya Menü → İletişim.',
      'Bu metin bilgilendirme amaçlı hazırlanmıştır; hukuki danışmanlık yerine geçmez.'
    ] }
  ];

  var PRIVACY_EN = [
    { h: 'Controller and purpose', p: [
      'This policy is prepared with regard to the disclosure duty under Article 10 of Turkish Law No. 6698 (KVKK) and the information duties under Articles 13–14 of the GDPR.',
      'Data controller: ' + DEVELOPER_EN + '. Contact: ' + EMAIL + '. The App has no legal entity, call centre or organisation requiring a data protection officer.'
    ] },
    { h: 'Summary: your data stays on your device', p: [
      'Fuel Tracker DOES NOT SEND your records to a server. Fill-ups, expenses, trips, vehicles, maintenance, settings and receipt photos are stored only on your own device, in the browser\'s localStorage and IndexedDB.',
      'The Developer cannot access, view, copy, analyse or share those records. There is no user account, sign-in, analytics, advertising or tracking code in the App.'
    ] },
    { h: 'Categories of data kept on your device', p: [
      'Vehicle data: name, type, icon, a plate-like label if you enter one, odometer, tank capacity, fuel type.',
      'Transaction records: fill-ups (date, time, litres, unit price, total, odometer, station, weather, note), expenses, trips, maintenance; receipt photos.',
      'Preferences: language, units, currency, date format, first day of week, default page, selected weather city and its coordinates.',
      'These do not include identity data. You may voluntarily type personal information into note or label fields; that too stays only on your device.'
    ] },
    { h: 'Legal basis', p: [
      'For records kept on your device, processing is necessary for the App to work and is entirely under your control (KVKK Art. 5/2-c: directly related to performing a contract; GDPR Art. 6(1)(b)).',
      'Internet-dependent features and location permission work only on your request; the legal basis for those is your explicit consent (KVKK Art. 5/1; GDPR Art. 6(1)(a)). You can withdraw consent at any time by not pressing the button or by turning the setting off.',
      'For email you send via the Contact form, the basis is necessity to answer your request (GDPR Art. 6(1)(b) and (f)).'
    ] },
    { h: 'Receipt photos and OCR', p: [
      'Receipt scanning runs entirely on your device. The Tesseract engine and Turkish language model load from the app folder; image processing happens in a WebWorker inside your browser.',
      'Your photos are NEVER SENT to any server, cloud service or AI service. You can scan receipts with the internet disconnected.'
    ] },
    { h: 'Location', p: [
      'Location permission is requested only when you press "My location" or "Update from location". The coordinates are used for that action only, are not written into your records and are not sent to the Developer.',
      'The weather city and coordinates you pick in Settings are stored on your device and used in the weather request.'
    ] },
    { h: 'Requests that leave the device', p: [
      'Weather — Open-Meteo (api.open-meteo.com): only the selected city\'s latitude and longitude are sent. The result is cached on the device for 30 minutes.',
      'City / station search — Photon (photon.komoot.io, OpenStreetMap data): only the text you type in the search box is sent.',
      'Maps — OpenStreetMap tiles or Google Maps: tiles for the area you view are requested only when you open the map screen. Technically your IP address is visible to the provider in such requests.',
      'App files — hosting provider (GitHub Pages): the app downloads its files on first load, which produces standard server logs as with any website.',
      'None of these requests contain your identity, records, notes or photos.'
    ] },
    { h: 'Cookies, analytics and advertising', p: [
      'The App uses no cookies, shows no advertising and runs no third-party analytics or tracking scripts. Only the local storage needed to function is used.',
      'For that reason no cookie consent banner is shown.'
    ] },
    { h: 'International transfers', p: [
      'The optional services above may be located abroad. When you use the related feature, the limited technical data sent (coordinates, search text or tile request) goes to that service\'s server.',
      'Such transfer must be assessed under KVKK Art. 9 and GDPR Chapter V. It happens only when you press the related button, with your explicit consent. If you prefer, simply do not use those features and no transfer occurs; the rest of the App keeps working offline.'
    ] },
    { h: 'Retention', p: [
      'Records on your device remain until you delete them. You can delete a single record, reset everything under Settings → Data, or clear your browser data.',
      'The weather cache expires after 30 minutes. In-app automatic backups are kept in the number you configure.',
      'Email you send via the Contact form may be kept in the inbox for up to 2 years after your request is resolved; you may ask for earlier deletion.'
    ] },
    { h: 'Security', p: [
      'Your data is protected within the security boundaries of your device and browser. Because the App sends no data out, it carries no centralised breach risk.',
      'Anyone with access to your device can see your records. Using a device lock and protecting your browser profile on shared devices is recommended. On a shared device, deleting your data is sufficient.'
    ] },
    { h: 'Your rights under KVKK', p: [
      'Under Article 11 of KVKK you may learn whether your personal data is processed, request information, learn the purpose and whether it is used accordingly, know the third parties it is transferred to at home or abroad, request correction of incomplete or inaccurate data, request deletion or destruction under the conditions in the law, request that these actions be notified to transferees, object to an adverse result produced by automated analysis, and claim compensation for damage caused by unlawful processing.',
      'For data kept on your device you can exercise most of these rights yourself inside the App: viewing, correcting and deleting are available in the interface.'
    ] },
    { h: 'Your rights under the GDPR', p: [
      'If you are resident in the EU, Articles 15–22 GDPR give you rights of access, rectification, erasure ("right to be forgotten"), restriction of processing, data portability, objection, and not to be subject to automated decision-making.',
      'Portability is met inside the App: Settings → Backup lets you download all records as a single JSON file and export fill-ups as CSV.',
      'You also have the right to complain to the supervisory authority in your country of residence (Art. 77 GDPR).'
    ] },
    { h: 'How to apply', p: [
      'Send your requests to ' + EMAIL + '. Under Article 13 KVKK, applications are concluded within 30 days at the latest.',
      'If our reply is insufficient you may complain to the Turkish Personal Data Protection Board under Article 14 KVKK, or, if resident in the EU, to the competent supervisory authority.'
    ] },
    { h: 'Children', p: [
      'The App is not designed for children and does not knowingly collect data from them. As the App has no server, no user data is collected in any case.'
    ] },
    { h: 'Information you share via the Contact form', p: [
      'The form asks for first name, last name, optional phone, email and message. The App transmits this to no server and does not store it on the device; it disappears when the window closes.',
      '"Send" opens your own email app. When you send, the information reaches the Developer\'s inbox through your own email provider and is used only to answer your request; it is not used for marketing or sold to third parties.'
    ] },
    { h: 'Changes', p: [
      'This policy may be updated. The current text is published in the App\'s Info screen, with its version number and effective date at the top.'
    ] },
    { h: 'Contact', p: [
      'To reach the controller: ' + EMAIL + ' or Menu → Contact.',
      'This text is provided for information and is not legal advice.'
    ] }
  ];

  // ==================================================================
  // DEĞİŞİKLİK GÜNLÜĞÜ
  // ==================================================================
  var CHANGELOG = [
    { v: '11.0.0', date: '2026-11-15', tr: [
      'Bilgi bölümü eklendi: Değişiklik Günlüğü, Hakkında, Kullanım Koşulları (EULA), Gizlilik Politikası ve Açık Kaynak Lisansları artık uygulama içinde okunabiliyor.',
      'Kullanım Koşulları ve Gizlilik Politikası KVKK + GDPR çerçevesinde yazıldı (Türkçe ve İngilizce).',
      '"Kilometre günlüğü" adı "Dolumlar", "Yolculuk kaydı" adı "Gezi kaydı" oldu.',
      'Fiş taramada "Diğer okumalar" eklendi: motor aynı alan için birden fazla değer okuduysa, doğru olanı tek dokunuşla seçebilirsiniz.',
      'Fiş okumada satır sonu gürültüsü (—, \", nokta) tolere edilerek miktar × fiyat satırındaki tutar da aday sayılıyor; yalnızca çarpımla %3 içinde uyuşan değer kabul ediliyor.',
      'Ölçülen doğruluk 61/72 alandan 62/72 alana (%86) çıktı; 12 fişlik test kümesinde hiçbir alan gerilemedi.'
    ], en: [
      'Info section added: Changelog, About, Terms of Use (EULA), Privacy Policy and Open-source licences can now be read inside the app.',
      'Terms of Use and Privacy Policy written for KVKK + GDPR (Turkish and English).',
      '"Odometer log" renamed to "Fill-ups"; "Trip record" renamed to "Trip log".',
      'Receipt scanning now shows "Other readings": when the engine reads several values for a field you can pick the right one with one tap.',
      'Receipt reading now tolerates trailing OCR noise (dashes, quotes, dots) so the amount on the quantity × price line is also a candidate, accepted only when it matches the product within 3%.',
      'Measured accuracy improved from 61/72 to 62/72 fields (86%); no field regressed on the 12-receipt test set.'
    ] },
    { v: '10.9.0', date: '2026-11-15', tr: [
      'Ayarlar\'dan hava durumu şehri seçilir; uygulama açılınca ve Dolum formunda o şehrin havası otomatik gelir. 81 il internetsiz, "İnternette ara" ile dünyadan şehir.',
      'Menüye İletişim formu eklendi (ad, soyad, telefon, e-posta, mesaj + şartlar onayı).',
      'Menünün en altına Uygulamadan çıkış eklendi.'
    ], en: [
      'Weather city can be picked in Settings; weather loads on app open and in the fill-up form. 81 provinces offline, plus online search worldwide.',
      'Contact form added to the menu (name, surname, phone, email, message + terms consent).',
      'Exit app added at the bottom of the menu.'
    ] },
    { v: '10.8.0', date: '2026-11-15', tr: [
      'Kod denetiminde bulunan 18 eksik kapatıldı: İngilizce arayüzde kalan Türkçe metinler, yarım çevrilen bildirimler, EN\'de mil kısaltması.',
      'Yakınlaştırma kilidi kaldırıldı, giriş alanları 16px yapıldı, menü ve + butonlarına ekran okuyucu adı eklendi.',
      'Bozuk kayıt listeyi çökertemez; service worker hatası anlaşılır metin gösterir.'
    ], en: [
      '18 audit findings closed: leftover Turkish strings in the English UI, half-translated notifications, mile abbreviation in EN.',
      'Zoom lock removed, inputs set to 16px, accessible names added to the menu and + buttons.',
      'A corrupt record can no longer crash the list; service worker errors show a readable message.'
    ] },
    { v: '10.7.0', date: '2026-11-14', tr: [
      'Fiş okuma iyileştirmeleri: POS/kart slipi desteği, binlik ayraçlı tutarlar, tarih onarımı.',
      'Ölçülen doğruluk 61/72 alan (%85).'
    ], en: [
      'Receipt reading improvements: POS/card slip support, thousands separators, date repair.',
      'Measured accuracy 61/72 fields (85%).'
    ] },
    { v: '10.6.0', date: '2026-11-14', tr: [
      'Fiş okumada çok geçişli doğrulama, hedefli kırpma ile sayısal alan kontrolü, litre × fiyat = toplam tutarlılık denetimi.'
    ], en: [
      'Multi-pass verification, targeted crops for numeric fields, litres × price = total consistency check.'
    ] },
    { v: '10.5.0', date: '2026-11-14', tr: [
      'İki dilli arayüz: Türkçe ve İngilizce. Dil seçimi ayarlardan yapılır ve korunur.'
    ], en: [
      'Bilingual interface: Turkish and English. The choice is made in Settings and persists.'
    ] },
    { v: '10.4.0', date: '2026-11-14', tr: [
      'Gerçek fiş tarama (OCR) eklendi. Motor ve Türkçe model uygulama klasöründen yüklenir; fotoğraflar cihazdan çıkmaz.',
      'Okunan değerler kaydedilmeden önce düzenlenebilir biçimde gösterilir.'
    ], en: [
      'Real receipt scanning (OCR) added. Engine and Turkish model load from the app folder; photos never leave the device.',
      'Recognised values are shown for editing before anything is saved.'
    ] },
    { v: '10.3.0', date: '2026-11-14', tr: [
      'Uygulama içi otomatik yedekler, depolama yönetimi ve bakım iyileştirmeleri.'
    ], en: [
      'In-app automatic backups, storage management and maintenance improvements.'
    ] },
    { v: '10.0–10.2', date: '2026-11-13', tr: [
      'Ayarlar ekranı, birim dönüşümleri (km/mil, L/galon, L/100km–km/L–MPG), veri girişi uyarıları, harita ve istasyon seçimi, gezi hesaplama.'
    ], en: [
      'Settings screen, unit conversions (km/mile, L/gallon, L/100km–km/L–MPG), data-entry warnings, maps and station picker, trip calculator.'
    ] },
    { v: 'v5–v9', date: '2026-11-13', tr: [
      'PWA olarak kurulabilir hâle geldi, çevrimdışı çalışır; fotoğraflar IndexedDB\'ye taşındı; zaman çizelgesi, istatistikler, raporlar, gider ve bakım takibi eklendi.'
    ], en: [
      'Became an installable, offline-capable PWA; photos moved to IndexedDB; timeline, statistics, reports, expense and maintenance tracking added.'
    ] }
  ];

  // ==================================================================
  // Üretim: HTML ve düz metin
  // ==================================================================
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sections(l) { return l === 'en' ? EULA_EN : EULA_TR; }
  function privacySections(l) { return l === 'en' ? PRIVACY_EN : PRIVACY_TR; }

  function docHtml(list, l) {
    var head = l === 'en'
      ? 'Version ' + DOC_VERSION + ' · Effective ' + enDate(EFFECTIVE)
      : 'Sürüm ' + DOC_VERSION + ' · Yürürlük tarihi ' + trDate(EFFECTIVE);
    var out = '<p class="text-[10px] font-semibold text-slate-400 mb-3">' + esc(head) + '</p>';
    list.forEach(function (s, i) {
      out += '<h3 class="font-bold text-slate-800 text-[12px] mt-3 mb-1">' + (i + 1) + '. ' + esc(s.h) + '</h3>';
      s.p.forEach(function (p) { out += '<p class="mb-1.5">' + esc(p) + '</p>'; });
    });
    return out;
  }
  function docPlain(list, l) {
    var head = l === 'en'
      ? 'Version ' + DOC_VERSION + ' · Effective ' + EFFECTIVE
      : 'Sürüm ' + DOC_VERSION + ' · Yürürlük tarihi ' + trDate(EFFECTIVE);
    var out = [head, ''];
    list.forEach(function (s, i) {
      out.push((i + 1) + '. ' + s.h);
      s.p.forEach(function (p) { out.push(p); });
      out.push('');
    });
    return out.join('\n');
  }

  function changelogHtml(l) {
    var out = '';
    CHANGELOG.forEach(function (c) {
      out += '<div class="mb-3">' +
        '<div class="flex items-center gap-2 mb-1">' +
        '<span class="text-[11px] font-bold text-white bg-slate-800 rounded-lg px-2 py-0.5">' + esc(c.v) + '</span>' +
        '<span class="text-[10px] text-slate-400">' + esc(l === 'en' ? enDate(c.date) : trDate(c.date)) + '</span></div><ul class="list-disc pl-4 space-y-1">';
      (l === 'en' ? c.en : c.tr).forEach(function (t) { out += '<li>' + esc(t) + '</li>'; });
      out += '</ul></div>';
    });
    return out;
  }
  function changelogPlain(l) {
    var out = [];
    CHANGELOG.forEach(function (c) {
      out.push(c.v + ' — ' + c.date);
      (l === 'en' ? c.en : c.tr).forEach(function (t) { out.push('  • ' + t); });
      out.push('');
    });
    return out.join('\n');
  }

  function aboutHtml(l) {
    var v = appVersion();
    var rows = l === 'en'
      ? [['App', 'Fuel Tracker'], ['Version', v], ['Developer', DEVELOPER_EN], ['Contact', EMAIL],
         ['Receipt engine', 'Tesseract.js — runs on your device, offline'], ['Measured OCR accuracy', '62/72 fields (86%) on a 12-receipt test set'],
         ['Your data', 'Only on this device (localStorage + IndexedDB)'], ['Server', 'None'],
         ['Terms version', DOC_VERSION + ' · ' + enDate(EFFECTIVE)], ['Source', REPO]]
      : [['Uygulama', 'Yakıt Takip'], ['Sürüm', v], ['Geliştirici', DEVELOPER_TR], ['İletişim', EMAIL],
         ['Fiş motoru', 'Tesseract.js — cihazınızda, çevrimdışı çalışır'], ['Ölçülen OCR doğruluğu', '12 fişlik test kümesinde 62/72 alan (%86)'],
         ['Verileriniz', 'Yalnızca bu cihazda (localStorage + IndexedDB)'], ['Sunucu', 'Yok'],
         ['Koşullar sürümü', DOC_VERSION + ' · ' + trDate(EFFECTIVE)], ['Kaynak', REPO]];
    var out = '<div class="flex items-center gap-3 mb-3">' +
      '<div class="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0"><i class="fa-solid fa-gauge-high text-xl"></i></div>' +
      '<div><div class="font-bold text-slate-800 text-sm">' + (l === 'en' ? 'Fuel Tracker' : 'Yakıt Takip') + '</div>' +
      '<div class="text-[10px] text-slate-400">' + (l === 'en' ? 'Personal vehicle assistant' : 'Kişisel araç asistanı') + '</div></div></div>';
    out += '<div class="divide-y divide-slate-100">';
    rows.forEach(function (r) {
      var val = /^https?:/.test(r[1])
        ? '<a class="text-blue-600 underline break-all" href="' + esc(r[1]) + '" target="_blank" rel="noopener">' + esc(r[1]) + '</a>'
        : (r[1] === EMAIL ? '<a class="text-blue-600 underline" href="mailto:' + esc(EMAIL) + '">' + esc(EMAIL) + '</a>' : esc(r[1]));
      out += '<div class="flex items-start justify-between gap-3 py-1.5">' +
        '<span class="text-[11px] text-slate-500 shrink-0">' + esc(r[0]) + '</span>' +
        '<span class="text-[11px] font-semibold text-slate-800 text-right">' + val + '</span></div>';
    });
    out += '</div>';
    out += '<p class="mt-3 text-[10px] text-slate-400 leading-relaxed">' +
      (l === 'en'
        ? 'This app is free and has no account system. The legal texts are informational and are not legal advice.'
        : 'Bu uygulama ücretsizdir ve hesap sistemi yoktur. Yasal metinler bilgilendirme amaçlıdır; hukuki danışmanlık değildir.') + '</p>';
    return out;
  }
  function aboutPlain(l) {
    var v = appVersion();
    return (l === 'en' ? 'Fuel Tracker\nVersion ' : 'Yakıt Takip\nSürüm ') + v +
      '\n' + (l === 'en' ? 'Developer: ' : 'Geliştirici: ') + (l === 'en' ? DEVELOPER_EN : DEVELOPER_TR) +
      '\n' + (l === 'en' ? 'Contact: ' : 'İletişim: ') + EMAIL + '\n' + REPO;
  }

  // ==================================================================
  // Okuyucu pencere
  // ==================================================================
  var current = null;
  function $(id) { return document.getElementById(id); }

  function meta(kind, l) {
    var T = {
      changelog: { tr: ['Değişiklik Günlüğü', 'Sürümlerde neler değişti'], en: ['Changelog', 'What changed in each version'], icon: 'clock-rotate-left' },
      about: { tr: ['Hakkında', 'Sürüm ve geliştirici bilgisi'], en: ['About', 'Version and developer information'], icon: 'circle-info' },
      eula: { tr: ['Kullanım Koşulları (EULA)', 'Son kullanıcı lisans sözleşmesi'], en: ['Terms of Use (EULA)', 'End-user licence agreement'], icon: 'gavel' },
      privacy: { tr: ['Gizlilik Politikası', 'KVKK ve GDPR kapsamında aydınlatma'], en: ['Privacy Policy', 'KVKK and GDPR disclosure'], icon: 'shield-halved' },
      licenses: { tr: ['Açık Kaynak Lisansları', 'Üçüncü taraf bileşen bildirimleri'], en: ['Open-source licences', 'Third-party component notices'], icon: 'file-lines' }
    };
    var m = T[kind] || T.about;
    return { title: m[l][0], desc: m[l][1], icon: m.icon };
  }

  function bodyHtml(kind, l) {
    if (kind === 'eula') return docHtml(sections(l), l);
    if (kind === 'privacy') return docHtml(privacySections(l), l);
    if (kind === 'changelog') return changelogHtml(l);
    if (kind === 'about') return aboutHtml(l);
    return '<p class="text-[11px] text-slate-400">' + (l === 'en' ? 'Loading…' : 'Yükleniyor…') + '</p>';
  }
  function bodyPlain(kind, l) {
    if (kind === 'eula') return docPlain(sections(l), l);
    if (kind === 'privacy') return docPlain(privacySections(l), l);
    if (kind === 'changelog') return changelogPlain(l);
    if (kind === 'about') return aboutPlain(l);
    return licensesCache || '';
  }

  var licensesCache = null;
  async function loadLicenses() {
    if (licensesCache != null) return licensesCache;
    try {
      var res = await fetch('./LICENSES.txt', { cache: 'force-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      licensesCache = await res.text();
    } catch (e) {
      licensesCache = null;
    }
    return licensesCache;
  }

  async function open(kind) {
    var l = lang();
    current = kind;
    var m = meta(kind, l);
    var modal = $('legal-modal'), body = $('legal-body');
    if (!modal || !body) return;
    $('legal-title').textContent = m.title;
    $('legal-desc').textContent = m.desc;
    var ic = $('legal-icon');
    if (ic) ic.className = 'fa-solid fa-' + m.icon;
    body.innerHTML = bodyHtml(kind, l);
    body.scrollTop = 0;
    modal.classList.remove('hidden');
    if (kind === 'licenses') {
      var txt = await loadLicenses();
      if (current !== 'licenses') return;
      body.innerHTML = txt
        ? '<pre class="whitespace-pre-wrap text-[10px] leading-relaxed text-slate-600 font-mono">' + esc(txt) + '</pre>'
        : '<p class="text-[11px] text-rose-600">' + (l === 'en'
            ? 'LICENSES.txt could not be loaded. Open it from the app folder.'
            : 'LICENSES.txt yüklenemedi. Uygulama klasöründen açabilirsiniz.') + '</p>';
    }
  }
  function close() {
    var m = $('legal-modal');
    if (m) m.classList.add('hidden');
    current = null;
  }
  async function copy() {
    var l = lang();
    var kind = current || 'about';
    var m = meta(kind, l);
    var text = m.title + '\n\n' + bodyPlain(kind, l);
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
    if (typeof window.showToast === 'function') {
      window.showToast(ok ? (l === 'en' ? 'Copied' : 'Kopyalandı') : (l === 'en' ? 'Could not copy' : 'Kopyalanamadı'));
    }
    return ok;
  }

  function bind() {
    var m = $('legal-modal');
    if (m) m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current) close();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  window.YakitLegal = {
    DOC_VERSION: DOC_VERSION, EFFECTIVE: EFFECTIVE, EMAIL: EMAIL, REPO: REPO,
    EULA_TR: EULA_TR, EULA_EN: EULA_EN, PRIVACY_TR: PRIVACY_TR, PRIVACY_EN: PRIVACY_EN,
    CHANGELOG: CHANGELOG,
    eulaHtml: function (l) { return docHtml(sections(lang(l)), lang(l)); },
    privacyHtml: function (l) { return docHtml(privacySections(lang(l)), lang(l)); },
    changelogHtml: function (l) { return changelogHtml(lang(l)); },
    aboutHtml: function (l) { return aboutHtml(lang(l)); },
    eulaPlain: function (l) { return docPlain(sections(lang(l)), lang(l)); },
    privacyPlain: function (l) { return docPlain(privacySections(lang(l)), lang(l)); },
    changelogPlain: function (l) { return changelogPlain(lang(l)); },
    aboutPlain: function (l) { return aboutPlain(lang(l)); },
    open: open, close: close, copy: copy, loadLicenses: loadLicenses,
    get current() { return current; }
  };
})();
