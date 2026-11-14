/* Yakıt Takip v10.5 — İki dil desteği (Türkçe / English)
 * Bağımsız modül: window.YakitI18n
 *
 * Tasarım: kaynak kod ve veri değerleri Türkçe kalır (kanonik). Bu katman
 * yalnızca GÖRÜNEN arayüz metnini çevirir; input.value, option.value, veri
 * alanları (araç adı, istasyon, not, yakıt türü değeri) DEĞİŞMEZ.
 * Varsayılan dil 'tr' olduğunda katman tamamen pasiftir (DOM'a dokunmaz).
 */
(function () {
  'use strict';

  var LANG_KEY = 'yakitTakipLang';
  var lang = 'tr';
  var applying = false;
  var observer = null;
  var scheduled = null;

  // ------------------------------------------------------------------
  // Sözlük: tam eşleşen arayüz dizgeleri (TR -> EN)
  // ------------------------------------------------------------------
  var DICT = {
    // marka / genel
    'Yakıt Takip': 'Fuel Tracker', 'yakıt takip': 'fuel tracker',
    'Kişisel Araç Asistanı': 'Personal Vehicle Assistant',
    'Ana sayfa': 'Home', 'Ayarlar': 'Settings', 'Harita': 'Map', 'Raporlar': 'Reports',
    'İstatistikler': 'Statistics', 'Taşıtlar': 'Vehicles', 'Taşıtlarım': 'My Vehicles',
    'Bakım': 'Maintenance', 'Zaman çizelgesi': 'Timeline', 'Hesaplayıcı': 'Calculator',
    'Hesap Makinesi': 'Calculator', 'Yolculuk': 'Trips', 'Gezi': 'Trip',
    'Dolum': 'Fill-up', 'Dolumlar': 'Fill-ups', 'Gider': 'Expense', 'Fiş': 'Receipt',
    'Fotoğraf': 'Photo', 'Resimler': 'Photos', 'Kategori': 'Category', 'Tür': 'Type',
    'Not': 'Note', 'Not (İsteğe Bağlı)': 'Note (optional)', 'İsteğe bağlı': 'Optional',
    'Başlık': 'Title', 'Başlık (isteğe bağlı)': 'Title (optional)',
    'Tarih': 'Date', 'Saat': 'Time', 'Zaman': 'Time', 'Mesafe': 'Distance',
    'Tutar': 'Amount', 'Toplam Tutar': 'Total Amount', 'Toplam Harcama': 'Total Spend',
    'Yakıt': 'Fuel', 'Yakıt Türü': 'Fuel type', 'Yakıt türü': 'Fuel type', 'Yakıt tipi': 'Fuel type',
    'Yakıt İstasyonu': 'Fuel Station', 'İstasyon': 'Station', 'Adres': 'Address',
    'Kaydet': 'Save', 'Vazgeç': 'Cancel', 'Kapat': 'Close', 'Geri': 'Back', 'Geri dön': 'Go back',
    'Ekle': 'Add', 'Sil': 'Delete', 'Düzenle': 'Edit', 'Seç': 'Select', 'Seçin': 'Choose',
    'Ara': 'Search', 'Yenile': 'Refresh', 'Yükle': 'Upload', 'İndir': 'Download',
    'Geri yükle': 'Restore', 'Paylaş': 'Share', 'Kopyala': 'Copy',
    'Seçilmedi': 'Not selected', 'Seçilmedi / elle seçin': 'Not selected / choose manually',
    'Belirtilmedi': 'Not specified', 'Bilinmiyor': 'Unknown', 'Diğer': 'Other',
    'Ortalama': 'Average', 'Güncel': 'Current', 'Son': 'Last', 'İlk tam dolum': 'First full fill-up',
    'Depo dolu': 'Full tank', 'Tank': 'Tank',
    // yakıt türleri (görünen etiket; değer kanonik kalır)
    'Motorin (Dizel)': 'Diesel', 'Kurşunsuz 95': 'Unleaded 95', 'Kurşunsuz 97/98': 'Unleaded 97/98',
    'LPG': 'LPG', 'Benzin': 'Petrol', 'Dizel': 'Diesel', 'Elektrik': 'Electric',
    // gider türleri
    'Bakım / Servis': 'Maintenance / Service', 'Sigorta / Kasko': 'Insurance',
    'Lastik': 'Tires', 'Araç Yıkama': 'Car Wash', 'Otopark / HGS': 'Parking / Tolls',
    'Diğer Maliyet Ekle': 'Add Other Cost', 'Diğer maliyetler': 'Other costs',
    'Yakıt Dolumları': 'Fuel Fill-ups', 'Yolculuk Kayıtları': 'Trip Records',
    'Kilometre Günlüğü': 'Odometer Log', 'Kilometre günlüğü': 'Odometer log',
    'Yolculuk Hesaplayıcı': 'Trip Calculator', 'Yolculuk Maliyeti Hesapla': 'Calculate Trip Cost',
    'Yolculuk kaydı': 'Trip record', 'Gezi Ekle': 'Add Trip', 'Gezi ekle': 'Add trip',
    '+ Yeni Gezi': '+ New Trip', 'Dolum Ekle': 'Add Fill-up', 'Dolumu Düzenle': 'Edit Fill-up',
    'Yeni yakıt alımı kaydet': 'Record a new fuel purchase', 'Yeni yakıt dolumu eklendi': 'New fuel fill-up added',
    'Dolum kaydı güncellendi': 'Fill-up record updated', 'Maliyet eklendi': 'Cost added',
    'Gezi kaydedildi': 'Trip saved', 'Kayıt silindi': 'Record deleted',
    'Bakım, sigorta, yıkama vb. ekle': 'Add maintenance, insurance, wash, etc.',
    'Güzergah ve mesafe kaydı oluştur': 'Create a route and distance record',
    'Fişten litre, fiyat, tutar, tarih oku': 'Read liters, price, total, date from receipt',
    'Fiş Fotoğrafı Yükle': 'Upload Receipt Photo', 'Yakıt Fişi Taraması': 'Fuel Receipt Scan',
    'Fotoğraf Seç / Çek': 'Choose / Take Photo', 'Başka fotoğraf': 'Another photo',
    'Dolum formuna aktar': 'Transfer to fill-up form', 'Fiş önizleme': 'Receipt preview',
    'Okunan ham metni göster/gizle': 'Show/hide raw recognized text',
    'Kaydetmeden önce kontrol edin': 'Check before saving', 'Daha iyi sonuç için': 'For better results',
    'Fişi düz, kırışıksız ve tam kadraj çekin.': 'Capture the receipt flat, unwrinkled and fully in frame.',
    'Işık yeterli olsun, gölge ve parlama olmasın.': 'Use enough light; avoid shadows and glare.',
    'Termal fişlerde yazı silikse sonuç düşer; elle düzeltebilirsiniz.': 'If thermal print is faded, accuracy drops; you can correct it manually.',
    'Fişin fotoğrafını seçin; yakıt türü, litre, birim fiyat, toplam tutar, tarih ve saat okunup size gösterilir. Onaylamadan kayıt oluşmaz.': 'Choose a receipt photo; fuel type, liters, unit price, total, date and time are read and shown to you. Nothing is saved without your approval.',
    'Fotoğraf cihazınızdan dışarı gönderilmez; okuma tamamen tarayıcıda, çevrimdışı çalışabilen yerel OCR motoruyla yapılır.': 'The photo never leaves your device; reading is done entirely in the browser by a local OCR engine that can work offline.',
    'Alanlar bulundu ve tutarlar birbiriyle uyumlu. Yine de kontrol edip onaylayın.': 'Fields were found and the amounts are consistent. Still review and confirm.',
    'Alanları kontrol edin. Litre × birim fiyat, toplam tutarı tam karşılamıyor olabilir.': 'Check the fields. Liters × unit price may not exactly match the total.',
    'Fiş bilgileri aktarıldı — kontrol edip kaydedin': 'Receipt info transferred — review and save',
    'Fiş okunamadı. Lütfen tekrar deneyin veya elle girin.': 'Receipt could not be read. Try again or enter manually.',
    'Fişten bilgi çıkarılamadı. Fotoğrafı daha net ve düz çekmeyi deneyin ya da bilgileri elle girin.': 'No information could be extracted. Try a clearer, flatter photo or enter the details manually.',
    'Litre (fişteki birim)': 'Liters (as on receipt)', 'Birim fiyat (fişteki birim)': 'Unit price (as on receipt)',
    'Litre × birim fiyat ile hesaplandı': 'Computed as liters × unit price',
    'Toplam ÷ litre ile hesaplandı': 'Computed as total ÷ liters',
    'hesaplandı': 'computed', 'düzeltme': 'correction', 'alan çapraz hesapla düzeltildi': 'field corrected by cross-check',
    'doğrulandı': 'verified', 'kontrol edin': 'check', 'onarıldı': 'repaired', 'bulunamadı': 'not found',
    'Fiş okunuyor': 'Reading receipt', 'Fiş yeniden okunuyor': 'Re-reading receipt',
    'Görüntü iyileştiriliyor': 'Enhancing image', 'İkinci okuma (doğrulama)': 'Second read (verification)',
    'Zor görüntü için üçüncü okuma': 'Third read for difficult image', 'Sonuçlar birleştiriliyor': 'Merging results',
    'OCR motoru hazırlanıyor': 'Preparing OCR engine', 'OCR motoru hazırlanıyor…': 'Preparing OCR engine…',
    'OCR motoru yükleniyor': 'Loading OCR engine', 'Motor başlatılıyor': 'Starting engine',
    'Türkçe dil modeli yükleniyor': 'Loading Turkish language model', 'Başlatılıyor': 'Starting', 'Başlatılıyor…': 'Starting…',
    'İşleniyor': 'Processing', 'Hazırlanıyor': 'Preparing', 'Hazır': 'Ready', 'Okunamadı': 'Could not read',
    'Devam eden bir tarama var.': 'A scan is already in progress.',
    'Lütfen bir görsel dosyası seçin.': 'Please choose an image file.',
    'Görsel yüklenemedi': 'Image could not be loaded', 'Görsel açılamadı': 'Image could not be opened',
    'Görsel yükleme zaman aşımı': 'Image load timed out',
    'Bu cihazın tarayıcısı OCR için gereken WebAssembly SIMD desteğini sunmuyor. Lütfen güncel Chrome/Safari kullanın veya bilgileri elle girin.': 'This device’s browser does not provide the WebAssembly SIMD support required for OCR. Use an up-to-date Chrome/Safari or enter the details manually.',
    'Tesseract yüklenemedi.': 'Tesseract could not be loaded.',
    'OCR hatası:': 'OCR error:', 'OCR güveni:': 'OCR confidence:',
    // araçlar
    'Yeni Araç Ekle': 'Add New Vehicle', 'Araç Bilgilerini Düzenle': 'Edit Vehicle Details',
    'Araç Marka / Model': 'Vehicle Make / Model', 'Araç Marka/Model (Örn: Renault Clio)': 'Vehicle make/model (e.g. Renault Clio)',
    'Araç Simgesi': 'Vehicle Icon', 'Simge': 'Icon', 'Simge seç': 'Choose icon',
    'Simge ve renk seç': 'Choose icon and color', 'Simge ve renk değiştir': 'Change icon and color',
    'Renk': 'Color', 'Aracı Kaydet': 'Save Vehicle', 'Aracı Sil': 'Delete Vehicle',
    'Araç eklendi': 'Vehicle added', 'Araç silindi': 'Vehicle deleted', 'Araç bilgileri güncellendi': 'Vehicle details updated',
    'Aktif araç değiştirildi': 'Active vehicle changed', 'Son aracı silemezsiniz': 'You cannot delete the last vehicle',
    'Lütfen araç adı girin': 'Please enter a vehicle name', 'Araç': 'Vehicle', 'Araç:': 'Vehicle:',
    'Güncel Kilometre': 'Current Odometer', 'Güncel Kilometre:': 'Current odometer:',
    'Güncel Km': 'Current Km', 'Güncel Mil': 'Current Miles',
    'Son Sayaç Değeri': 'Last Odometer Value', 'Son değer:': 'Last value:',
    'Tank Kapasitesi (L)': 'Tank Capacity (L)', 'Tank kapasitesini ayarla (L)': 'Set tank capacity (L)',
    'Koyu gri': 'Dark gray', 'Kırmızı': 'Red', 'Mavi': 'Blue', 'Yeşil': 'Green', 'Mor': 'Purple',
    'Turkuaz': 'Teal', 'Turuncu': 'Orange',
    'Otomobil': 'Car', 'Sedan': 'Sedan', 'Pickup': 'Pickup', 'Kamyon': 'Truck', 'Arazi': 'SUV',
    'Minibüs': 'Van', 'Otobüs': 'Bus', 'Motosiklet': 'Motorcycle', 'Bisiklet': 'Bicycle',
    'Traktör': 'Tractor', 'Karavan': 'RV', 'Taksi': 'Taxi', 'Tekne': 'Boat', 'Uçak': 'Plane',
    'Helikopter': 'Helicopter', 'Tren': 'Train',
    // formlar / etiketler
    'Mesafe sayacı (km)': 'Odometer (km)', 'Başlangıç sayacı (km)': 'Start odometer (km)',
    'Bitiş sayacı (km)': 'End odometer (km)', 'Mesafe (km)': 'Distance (km)',
    'Yakıt (L)': 'Fuel (L)', 'Tank (L)': 'Tank (L)', 'Toplam maliyet (₺)': 'Total cost (₺)',
    'Yakıt Fiyatı (₺/L)': 'Fuel Price (₺/L)', 'BİRİM FİYAT': 'UNIT PRICE',
    'Başlangıç': 'Start', 'Bitiş': 'End', 'Başlangıç noktası': 'Start point', 'Bitiş noktası': 'End point',
    'Başlangıç Konumu Seç': 'Choose Start Location', 'Bitiş Konumu Seç': 'Choose End Location',
    'Hesaplanan Mesafe:': 'Calculated Distance:', 'Gerekli Yakıt': 'Required Fuel',
    'Tahmini Toplam Maliyet': 'Estimated Total Cost', 'Dolum maliyeti:': 'Fill-up cost:',
    'Dolum sayısı:': 'Fill-up count:', 'Toplam Dolum Sayısı:': 'Total Fill-ups:',
    'Toplam Maliyet:': 'Total Cost:', 'Toplam Yakıt:': 'Total Fuel:',
    'En az litre veya toplam tutar girilmeli.': 'Enter at least liters or a total amount.',
    'Lütfen geçerli litre ve tutar girin': 'Please enter valid liters and amount',
    'Lütfen geçerli tutar girin': 'Please enter a valid amount',
    'Lütfen bir istasyon adı girin': 'Please enter a station name',
    'En az 2 karakter yazın': 'Type at least 2 characters',
    'İstasyon / Konum Seç': 'Choose Station / Location', 'Haritadan Seç': 'Choose from Map',
    'Haritadan Konum Seç': 'Choose Location from Map', 'Adrese Göre Seç': 'Choose by Address',
    'Google Haritalar\'dan Seç': 'Choose from Google Maps', 'Google Maps\'te Aç': 'Open in Google Maps',
    'Google Haritalar çevrimdışı kullanılamaz': 'Google Maps is not available offline',
    'Mevcut Konumumu Kullan': 'Use My Current Location', 'Konumdan Güncelle': 'Update from Location',
    'Konumum ve yakınımdakiler': 'My location and nearby', 'Haritanın bu alanında ara': 'Search this map area',
    'Bu noktayı kullan': 'Use this point', 'Bu istasyonu seç': 'Choose this station',
    'Seçilen Konum': 'Selected Location', 'Seçilen Konum / Adres Etiketi': 'Selected Location / Address Label',
    'Seçili istasyon': 'Selected station', 'Seçilen nokta:': 'Selected point:',
    'Adresi bul': 'Find address', 'Adres bulundu': 'Address found', 'Adres bilgisi yok': 'No address info',
    'Yazdığım adı kullan': 'Use the name I typed', 'İsimsiz konum': 'Unnamed location',
    'Ara / Son Kullanılanlar': 'Search / Recent', 'Son kullanılanlar · çevrimdışı da seçilebilir': 'Recent · also selectable offline',
    'Henüz son kullanılan istasyon yok.': 'No recent stations yet.',
    'Aramak için yazıp Ara\'ya basın. İnternet yoksa son kullanılanlar veya manuel giriş kullanılabilir.': 'Type and press Search. Without internet, use recents or manual entry.',
    'Bağlantı yokken konum etiketini elle yazıp “Seç” ile devam edebilirsiniz.': 'While offline, type a location label and continue with “Select”.',
    'Konum almak için düğmeye basın veya haritayı kaydırıp bu alanda arayın.': 'Press the button to get a location, or pan the map and search this area.',
    'Konum otomatik alınmaz; isterseniz “Konumdan Güncelle”yi kullanın.': 'Location is not fetched automatically; use “Update from Location” if you wish.',
    'Sonuç bulunamadı.': 'No results found.',
    'Sonuç bulunamadı. Farklı bir ad deneyin veya manuel giriş yapın.': 'No results. Try a different name or enter manually.',
    'Bu yarıçapta istasyon bulunamadı. Yarıçapı artırın veya manuel giriş yapın.': 'No stations in this radius. Increase the radius or enter manually.',
    'Bu yarıçapta OSM kayıtlı istasyon bulunamadı. Yarıçapı artırın veya manuel giriş yapın.': 'No OSM-registered stations in this radius. Increase the radius or enter manually.',
    'OSM kayıtları eksik olabilir': 'OSM records may be incomplete',
    'İnternet bağlantısı yok. Son kullanılanları seçebilir veya manuel ad girebilirsiniz.': 'No internet connection. Pick a recent station or type a name manually.',
    'Konum alınamadı': 'Could not get location', 'Konum alınamadı. Haritadan alan seçebilirsiniz.': 'Could not get location. You can pick an area on the map.',
    'Konum izni verilmedi. Haritayı kaydırıp bu alanda arayabilir veya manuel giriş yapabilirsiniz.': 'Location permission denied. Pan the map and search this area, or enter manually.',
    'Konum isteği zaman aşımına uğradı. Tekrar deneyin veya haritadan alan seçin.': 'Location request timed out. Try again or pick an area on the map.',
    'Bu tarayıcı konum desteklemiyor. Haritayı kaydırıp bu alanda arayın.': 'This browser does not support location. Pan the map and search this area.',
    'Harita kütüphanesi yüklenemedi. Manuel giriş kullanabilirsiniz.': 'Map library could not load. You can use manual entry.',
    'Harita karoları yüklenemedi. İnterneti kontrol edin; manuel giriş kullanılabilir.': 'Map tiles could not load. Check your internet; manual entry is available.',
    'Harita/arama servisi geçici olarak yanıt vermiyor. Manuel giriş kullanabilirsiniz.': 'Map/search service is temporarily unresponsive. You can use manual entry.',
    'İstasyonlar yüklenemedi. Manuel giriş kullanabilirsiniz.': 'Stations could not load. You can use manual entry.',
    'Arama tamamlanamadı. Manuel giriş kullanabilirsiniz.': 'Search could not complete. You can use manual entry.',
    'İstasyon/adres bilgisi alınamadı. İnterneti kontrol edip tekrar deneyin veya manuel giriş yapın.': 'Could not get station/address info. Check your internet and retry, or enter manually.',
    'Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.': 'Too many requests. Please wait a moment and try again.',
    'İstek iptal edildi veya zaman aşımına uğradı.': 'Request was cancelled or timed out.',
    'Zaman aşımı': 'Timed out', 'Geçersiz konum': 'Invalid location', 'Bilinmeyen hata': 'Unknown error', 'bilinmeyen hata': 'unknown error',
    'İstasyon arama sunucusu (Photon)': 'Station search server (Photon)',
    'Boş bırakılırsa photon.komoot.io kullanılır. Kendi Photon sunucunuz için tam http(s) adresi girin.': 'Leave empty to use photon.komoot.io. Enter a full http(s) address for your own Photon server.',
    'Varsayılan Photon sunucusu kullanılacak': 'Default Photon server will be used',
    'Photon sunucusu kaydedildi': 'Photon server saved', 'Beklenmeyen Photon yanıtı': 'Unexpected Photon response',
    'Harita:': 'Map:', '© OpenStreetMap katkıda bulunanlar': '© OpenStreetMap contributors',
    '(ODbL).': '(ODbL).',
    'Konumunuz yalnızca “Konumum” veya “Bu alanda ara” dediğinizde istasyon bulmak için Photon\'a gönderilir. Adres araması arama sorgusunu gönderir.': 'Your location is sent to Photon only when you tap “My location” or “Search this area” to find stations. Address search sends the search query.',
    // raporlar / istatistik
    'Rapor Oluştur': 'Create Report', 'Rapor oluştur': 'Create report', 'Raporu İndir (CSV)': 'Download Report (CSV)',
    'CSV raporu indir': 'Download CSV report', 'CSV raporu indirildi': 'CSV report downloaded',
    'Dolumları tablo olarak dışa aktar': 'Export fill-ups as a table',
    'Aracınıza ait tüm yakıt dolumlarını, tüketim verilerini ve diğer harcamaları özet rapor olarak görüntüleyebilir veya CSV dosyası olarak indirebilirsiniz.': 'You can view all fuel fill-ups, consumption data and other expenses for your vehicle as a summary report, or download them as a CSV file.',
    'Bu Ay': 'This Month', 'Bu Yıl': 'This Year', 'Bu hafta': 'This week', 'Geçen Ay': 'Last Month', 'Geçen Yıl': 'Last Year',
    'BU AY': 'THIS MONTH', 'GEÇEN AY': 'LAST MONTH',
    'Aylık Ortalama': 'Monthly Average', 'Aylık Ortalama Maliyet': 'Average Monthly Cost',
    'Günlük Ortalama': 'Daily Average', 'Günlük Ortalama Maliyet': 'Average Daily Cost',
    'Km Başına Ortalama': 'Average per Km', 'Km Başına En İyi': 'Best per Km', 'Km Başına En Kötü': 'Worst per Km',
    'Km Başına & Periyodik Ortalamalar': 'Per-Km & Periodic Averages',
    'Ortalama Kilometre Kullanımı': 'Average Kilometer Usage', 'Uygulama İle Katedilen': 'Traveled with App',
    'Dönemsel Kilometre Grubu': 'Periodic Distance Group', 'Dönemsel Maliyetler': 'Periodic Costs',
    'Faturalar & Yakıt Fiyatları': 'Bills & Fuel Prices',
    'En Yüksek Fatura': 'Highest Bill', 'En Düşük Fatura': 'Lowest Bill',
    'En Yüksek Yakıt Fiyatı': 'Highest Fuel Price', 'En İyi Yakıt Fiyatı': 'Best Fuel Price',
    'En İyi': 'Best', 'En Kötü': 'Worst', 'Max. Dolum (En Yüksek)': 'Max Fill-up (Highest)', 'Min. Dolum (En Düşük)': 'Min Fill-up (Lowest)',
    'Yakıt Tüketim Analizi (L/100km)': 'Fuel Consumption Analysis (L/100km)',
    'Maliyetler': 'Costs', 'Şehir İçi': 'City', 'İş': 'Work', 'Kişisel': 'Personal', 'Tatil / Uzun Yol': 'Holiday / Long Trip',
    'Ev / İstanbul': 'Home / Istanbul', 'Ofis / Ankara': 'Office / Ankara',
    'Örn: Ev / İstanbul': 'e.g. Home / Istanbul', 'Örn: Ofis / Ankara': 'e.g. Office / Ankara',
    'Örn: Uzun yol öncesi tam dolum': 'e.g. Full fill-up before a long trip',
    'Örn: İş Seyahati / Hafta Sonu Gezisi': 'e.g. Business trip / Weekend getaway',
    'Örn: Yağ + filtre': 'e.g. Oil + filter',
    // hava durumu
    'Hava Durumu': 'Weather', 'Hava durumu alınamadı; manuel değerleri kullanabilirsiniz.': 'Weather could not be fetched; you can use manual values.',
    'Kayıtlı hava durumu:': 'Saved weather:', 'Güneşli': 'Sunny', 'Bulutlu': 'Cloudy', 'Parçalı Bulutlu': 'Partly Cloudy',
    'Yağmurlu': 'Rainy', 'Karlı': 'Snowy', '☀️ Güneşli': '☀️ Sunny', '☁️ Bulutlu': '☁️ Cloudy',
    '⛅ Parçalı Bulutlu': '⛅ Partly Cloudy', '🌧️ Yağmurlu': '🌧️ Rainy', '❄️ Karlı': '❄️ Snowy',
    'Şu an:': 'Now:',
    // aylar
    'Oca': 'Jan', 'Şub': 'Feb', 'Mar': 'Mar', 'Nis': 'Apr', 'May': 'May', 'Haz': 'Jun',
    'Tem': 'Jul', 'Ağu': 'Aug', 'Eyl': 'Sep', 'Eki': 'Oct', 'Kas': 'Nov',
    // bakım
    'Bakım Hatırlatıcıları': 'Maintenance Reminders', 'Bakım hatırlatıcıları': 'Maintenance reminders',
    'Yeni hatırlatıcı': 'New reminder', 'Hatırlatıcıyı düzenle': 'Edit reminder',
    'Hatırlatıcı eklendi': 'Reminder added', 'Hatırlatıcı güncellendi': 'Reminder updated', 'Hatırlatıcı silindi': 'Reminder deleted',
    'Bu hatırlatıcı silinsin mi?': 'Delete this reminder?',
    'Yağ / Servis': 'Oil / Service', 'Muayene': 'Inspection',
    'Tarih hedefi': 'Due date', 'Km hedefi': 'Due km', 'Hedef yok': 'No target',
    'Tarih veya km hedefinden en az biri gerekli': 'At least one of due date or due km is required',
    'Tarih veya km’den en az biri gerekli. İkisi birden girilirse hangisi önce gelirse uyarır.': 'At least one of date or km is required. If both are set, whichever comes first triggers the alert.',
    'Km hedefi pozitif olmalı': 'Due km must be positive',
    'Tekrar: her X km': 'Repeat: every X km', 'Tekrar: her X ay': 'Repeat: every X months',
    'Tekrar alanları doluysa “Tamamlandı” sonrası yeni hedef otomatik belirlenir; boşsa hatırlatıcı kapanır.': 'If repeat fields are set, a new target is scheduled after “Done”; if empty, the reminder closes.',
    'Planlandı': 'Planned', 'Yaklaşıyor': 'Due soon', 'Gecikti': 'Overdue', 'Tamamlandı': 'Done',
    'Tamamlandı olarak işaretlendi': 'Marked as done', 'Tamamlandı · sonraki hedef belirlendi': 'Done · next target scheduled',
    'Bakım gecikti': 'Maintenance overdue', 'Bakım yaklaşıyor': 'Maintenance due soon',
    'Yağ, muayene, sigorta, lastik — tarih veya km': 'Oil, inspection, insurance, tires — date or km',
    // korumalar
    'Bu dolum zaten kayıtlı olabilir': 'This fill-up may already be recorded',
    'Çok benzer bir dolum var': 'A very similar fill-up exists',
    'Sayaç gerilemiş görünüyor': 'Odometer appears to go backwards',
    'Sayaca fazla basamak girilmiş olabilir': 'Too many digits may have been entered',
    'Tek dolumda büyük mesafe': 'Large distance in a single fill-up',
    'Tüketim alışılmadık yüksek': 'Consumption unusually high', 'Tüketim alışılmadık düşük': 'Consumption unusually low',
    'Litre depo kapasitesini aşıyor': 'Liters exceed tank capacity',
    'Bilgilendirme — kaydı engellemez': 'Information — does not block saving',
    'Bu uyarılar kaydı engellemez. Değerler doğruysa “Yine de kaydet” ile devam edebilirsiniz.': 'These warnings do not block saving. If the values are correct, continue with “Save anyway”.',
    'Yine de kaydet': 'Save anyway', 'Düzelt': 'Fix', 'Değer düzeltildi, kontrol edip kaydedin': 'Value corrected; review and save',
    'Geçmiş bir dolumu kaydediyorsanız normaldir.': 'This is normal if you are recording a past fill-up.',
    'Bidon/ek yakıt aldıysanız normaldir.': 'This is normal if you bought extra fuel in a can.',
    'Litre veya sayaç değerini kontrol edin.': 'Check the liters or odometer value.',
    '. Aynı fişi iki kez okutmuş olabilirsiniz.': '. You may have scanned the same receipt twice.',
    '₺ değerinde bir kayıt bulundu': '₺ record found', '(aynı sayaç)': '(same odometer)',
    'Bu dolum kaydı silinecek. Emin misiniz?': 'This fill-up record will be deleted. Are you sure?',
    // ayarlar
    'Ana tercihler': 'General preferences', 'Mesafe birimi': 'Distance unit', 'Hacim birimi': 'Volume unit',
    'Tüketim birimi': 'Consumption unit', 'Para birimi': 'Currency', 'Tarih biçimi': 'Date format',
    'Haftanın ilk günü': 'First day of week', 'Varsayılan sayfa': 'Default page',
    'Kilometre veya mil': 'Kilometers or miles', 'Litre, ABD galonu veya İngiliz galonu': 'Liters, US gallons or UK gallons',
    'L/100km, km/L veya MPG': 'L/100km, km/L or MPG',
    'Raporlardaki haftalık özet bu güne göre hesaplanır': 'Weekly report summary is calculated from this day',
    'Uygulama açılınca gösterilecek ekran': 'Screen shown when the app opens',
    'Veri giriş uyarıları': 'Data entry warnings',
    'Mükerrer dolum, sayaç gerilemesi ve tüketim sapması uyarısı': 'Duplicate fill-up, odometer rollback and consumption deviation warnings',
    'Kilometre (km)': 'Kilometers (km)', 'Mil (mi)': 'Miles (mi)', 'Litre (L)': 'Liters (L)',
    'ABD galonu (gal US)': 'US gallon (gal US)', 'İngiliz galonu (gal UK)': 'UK gallon (gal UK)',
    'Metrik hacim birimi': 'Metric volume unit', '100 km başına litre': 'Liters per 100 km', 'Litre başına kilometre': 'Kilometers per liter',
    'Mil / ABD galonu': 'Miles / US gallon', 'Mil / İngiliz galonu': 'Miles / UK gallon',
    'Pazartesi': 'Monday', 'Pazar': 'Sunday', 'Hafta pazartesi başlar': 'Week starts on Monday', 'Hafta pazar başlar': 'Week starts on Sunday',
    'Türk Lirası': 'Turkish Lira', 'ABD Doları': 'US Dollar', 'Euro': 'Euro', 'İngiliz Sterlini': 'British Pound',
    'Ruble': 'Ruble', 'Azerbaycan Manatı': 'Azerbaijani Manat',
    'Mesafe birimi güncellendi': 'Distance unit updated', 'Hacim birimi güncellendi': 'Volume unit updated',
    'Tüketim birimi güncellendi': 'Consumption unit updated', 'Para birimi güncellendi': 'Currency updated',
    'Tarih biçimi güncellendi': 'Date format updated', 'Veri giriş uyarıları açık': 'Data entry warnings on',
    'Veri giriş uyarıları kapalı': 'Data entry warnings off',
    'Yedekleme': 'Backup', 'Son yedek': 'Last backup', 'Henüz yedek alınmadı': 'No backup yet',
    'Henüz hiç yedek almadınız.': 'You have never taken a backup.',
    'Yedek al (dosya indir)': 'Back up (download file)', 'Tüm kayıtlar ve fotoğraflar tek JSON dosyasında': 'All records and photos in a single JSON file',
    'Yedeği paylaş': 'Share backup', 'Google Drive, WhatsApp, e-posta — Android paylaş menüsü': 'Google Drive, WhatsApp, email — Android share menu',
    'Yedekten geri yükle': 'Restore from backup', 'Bir yedek dosyası seçin; önce özeti gösterilir': 'Choose a backup file; a summary is shown first',
    'Otomatik yedek hatırlatması': 'Automatic backup reminder', '30 gün geçtiyse ana ekranda uyarı göster': 'Show a home-screen warning after 30 days',
    'Son yedek 30 günden eski.': 'Last backup is older than 30 days.',
    'Uygulama içi yedekler': 'In-app backups', 'Otomatik yedek': 'Automatic backup',
    'Uygulama açılışında günde 1 kez, internet gerekmez': 'Once a day at app start, no internet needed',
    'Saklanacak yedek sayısı': 'Number of backups to keep', 'Eskiler otomatik silinir': 'Old ones are deleted automatically',
    '7 yedek': '7 backups', '14 yedek': '14 backups', '30 yedek': '30 backups',
    'Yaklaşık 1 hafta': 'About 1 week', 'Yaklaşık 2 hafta': 'About 2 weeks', 'Yaklaşık 1 ay': 'About 1 month',
    'Şimdi yedek al': 'Back up now', 'Tüm kayıtlar ve fotoğraflar cihaz içinde saklanır': 'All records and photos are stored on the device',
    'Henüz uygulama içi yedek yok. “Şimdi yedek al” ile ilk yedeği oluşturabilirsiniz.': 'No in-app backups yet. Use “Back up now” to create the first one.',
    'Yedek geri yüklenecek': 'Backup will be restored',
    'Mevcut tüm kayıtlarınız bu yedekle değiştirilecek. Bu işlem geri alınamaz. Devam etmeden önce mevcut verinizin yedeğini almanız önerilir.': 'All your current records will be replaced by this backup. This cannot be undone. Backing up your current data first is recommended.',
    'Bu bir Yakıt Takip yedeği değil.': 'This is not a Fuel Tracker backup.',
    'Dosya geçerli bir JSON değil.': 'File is not valid JSON.', 'Dosya okunamadı (geçersiz JSON).': 'File could not be read (invalid JSON).',
    'Yedekte araç bilgisi yok.': 'Backup has no vehicle info.', 'Yedekte dolum listesi bozuk.': 'Backup fill-up list is corrupt.',
    'Yedekte kayıt verisi yok.': 'Backup has no record data.', 'Yedek bulunamadı': 'Backup not found',
    'Bu yedek silinsin mi?': 'Delete this backup?', 'Yedek silindi': 'Backup deleted',
    'Yedek veritabanı açılamadı': 'Backup database could not be opened', 'Yedek yazılamadı': 'Backup could not be written',
    'Yedek işlemi başarısız': 'Backup operation failed', 'Yedek işlemi yarıda kesildi': 'Backup operation was interrupted',
    'Paylaşım iptal edildi': 'Sharing cancelled', 'İndirme başarısız': 'Download failed',
    'Geri yükleniyor…': 'Restoring…', 'Yedek hazırlanıyor…': 'Preparing backup…', 'Yedek alınıyor…': 'Backing up…',
    'Kaydediliyor…': 'Saving…', 'Kontrol ediliyor…': 'Checking…', 'kontrol ediliyor…': 'checking…',
    'İndiriliyor… lütfen bekleyin': 'Downloading… please wait', 'İndirilmedi': 'Not downloaded', 'Henüz indirilmedi': 'Not downloaded yet',
    'Fiş okuma (OCR)': 'Receipt reading (OCR)', 'OCR motoru durumu': 'OCR engine status',
    'Çevrimdışı fiş okuma dosyaları': 'Offline receipt reading files', 'OCR dosyalarını indir': 'Download OCR files',
    'OCR dosyalarını indir (~5,6 MB)': 'Download OCR files (~5.6 MB)',
    'Yaklaşık 5,6 MB — sonra internet gerekmez': 'About 5.6 MB — no internet needed afterwards',
    'OCR motoru (çevrimdışı fiş okuma)': 'OCR engine (offline receipt reading)',
    'OCR motorunu şimdiden hazırla': 'Prepare the OCR engine now',
    'İlk kullanımda motor ve dil modeli yüklenir; sonraki taramalar daha hızlıdır.': 'On first use the engine and language model load; later scans are faster.',
    'OCR hazır': 'OCR ready', 'OCR hazır. Artık internet olmadan da fiş okuyabilirsiniz.': 'OCR ready. You can now read receipts without internet.',
    'OCR motoru hazır ✓': 'OCR engine ready ✓', 'OCR dosyaları indirildi ✓': 'OCR files downloaded ✓',
    'OCR dosyaları indiriliyor…': 'Downloading OCR files…', 'OCR motoru hazırlanamadı.': 'OCR engine could not be prepared.',
    'OCR kütüphanesi zaman aşımına uğradı. Dosyaların sunucuda olduğunu kontrol edin.': 'OCR library timed out. Check that the files are on the server.',
    'Veri': 'Data', 'Depolama': 'Storage', 'Fotoğraf Deposu': 'Photo Storage',
    'Tüm verileri sıfırla': 'Reset all data', 'Kayıtlar silinir, demo veriler yüklenir': 'Records are deleted and demo data is loaded',
    'Varsayılan Verilere Sıfırla': 'Reset to Default Data', 'Varsayılan verilere sıfırlandı': 'Reset to default data',
    'Tüm kayıtlarınız silinip varsayılan demo verileri yüklenecek. Emin misiniz?': 'All your records will be deleted and default demo data loaded. Are you sure?',
    'Hakkında': 'About', 'Gizlilik': 'Privacy', 'Veriler cihazınızda kalır. Sunucuya hiçbir şey gönderilmez.': 'Data stays on your device. Nothing is sent to a server.',
    'Açık kaynak lisansları': 'Open-source licenses', 'LICENSES.txt — Tesseract, Leaflet, Inter, Font Awesome': 'LICENSES.txt — Tesseract, Leaflet, Inter, Font Awesome',
    'Çevrimdışı / PWA': 'Offline / PWA', 'Çevrimdışı kabuk hazır': 'Offline shell ready',
    'Çevrimdışı kullanım hazır ✓': 'Offline use ready ✓', 'Henüz önbelleğe alınmadı': 'Not cached yet',
    'Güncellemeleri denetle': 'Check for updates', 'Güncelleme kontrol edildi': 'Update checked',
    'Güncelleme kontrol edilemedi': 'Could not check for updates', 'Yeni sürüm hazır': 'New version ready',
    'Yeni sürüm hazır. Kayıtlarınız korunur.': 'New version ready. Your records are preserved.',
    'Yeni sürümü uygula': 'Apply new version', 'Ana ekrana ekle': 'Add to home screen',
    'Uygulamayı ana ekrana ekleyebilirsiniz.': 'You can add the app to your home screen.',
    'Uygulama ana ekrana eklendi ✓': 'App added to home screen ✓',
    'Kurulum istemi şu anda kullanılamıyor': 'Install prompt is not available right now',
    'Bu tarayıcı service worker desteklemiyor': 'This browser does not support service workers',
    'Service worker henüz etkin değil. Sayfayı bir kez yenileyin.': 'Service worker is not active yet. Refresh the page once.',
    'Service worker henüz hazır değil': 'Service worker is not ready yet',
    'HTTPS veya localhost gerekli (file:// desteklenmez)': 'HTTPS or localhost required (file:// not supported)',
    'Önbellek API yok': 'Cache API unavailable', 'Önbellek durumu okunamadı': 'Cache status could not be read',
    'Önbellek durumu okunuyor…': 'Reading cache status…', 'Durum yenilendi': 'Status refreshed',
    'Kayıtlarınız bu cihazda kalır. Çevrimdışıyken dolum, gider, yolculuk ve fotoğraflar çalışır; harita karoları, istasyon araması ve Google Haritalar internet ister.': 'Your records stay on this device. Offline, fill-ups, expenses, trips and photos work; map tiles, station search and Google Maps need internet.',
    'Çevrimdışı: kayıtlar ve fotoğraflar çalışır; harita/arama internet ister.': 'Offline: records and photos work; map/search need internet.',
    'Çevrimdışı: etiket kaydedildi, harita yüklenemedi': 'Offline: label saved, map could not load',
    'Konum desteklenmiyor · Varsayılan değer yüklendi': 'Location unsupported · default value loaded',
    'Konum izni verilmedi · Manuel seçebilirsiniz': 'Location permission denied · you can pick manually',
    'Konum etiketi alındı; harita çevrimdışı': 'Location label fetched; map is offline',
    'Uygulama yükleniyor…': 'Loading app…', 'Uygulama verisi okunamadı': 'App data could not be read',
    'Uygulama geri yükleme arayüzü bulunamadı': 'App restore interface not found',
    'İşlem başarılı!': 'Operation successful!', 'Kaydedilemedi': 'Could not save',
    '⚠️ Kayıt yerel depoya yazılamadı, işlem geri alındı': '⚠️ Record could not be written to local storage; operation rolled back',
    '⚠️ Veri kaydedilemedi! Depolama alanı dolu olabilir (fotoğraflar çok yer kaplar).': '⚠️ Data could not be saved! Storage may be full (photos take a lot of space).',
    '(metin bulunamadı)': '(text not found)',
    'Yakıt Takip yedeği': 'Fuel Tracker backup', 'Yakıt Takip veri yedeği': 'Fuel Tracker data backup',
    'Otomatik yedek açık': 'Automatic backup on', 'Otomatik yedek kapalı': 'Automatic backup off',
    'Otomatik yedek tekrar deneniyor…': 'Retrying automatic backup…',
    'Dil': 'Language', 'Dil / Language': 'Language', 'Türkçe': 'Turkish', 'İngilizce': 'English',
    'Uygulama dili': 'App language', 'Arayüz dili': 'Interface language',
    'Dil güncellendi': 'Language updated'
  };


  // v10.5 ek sözlük: bakım, PWA, ayarlar listesi, OCR durum, eksik etiketler
  Object.assign(DICT, {
    'Kahve': 'Brown', 'Etkin': 'Active', 'Mil': 'Miles', 'Kilometre': 'Kilometers',
    'Gider Türü': 'Expense Type', 'Yeni': 'New',
    'Araç bulunamadı.': 'Vehicle not found.',
    'Henüz bakım hatırlatıcısı yok': 'No maintenance reminders yet',
    'Yağ, muayene, sigorta veya lastik için tarih / km hedefi ekleyin.': 'Add a date / km target for oil, inspection, insurance or tires.',
    'güvenlik': 'safety', 'elle': 'manual', 'otomatik': 'automatic',
    'Tekrar dene': 'Try again', 'Otomatik yedek alınamadı': 'Automatic backup failed',
    'Yedekler yükleniyor…': 'Loading backups…',
    'Adres bulunamadı; koordinat kullanılacak': 'Address not found; coordinates will be used',
    'Bir fotoğraf işlenemedi': 'A photo could not be processed',
    'Fotoğraf okunamadı': 'Photo could not be read',
    'Fotoğraf yazma işlemi iptal edildi': 'Photo write was cancelled',
    'Fotoğraf yazılamadı': 'Photo could not be written',
    'Fotoğraflar okunamadı; yalnızca kayıtlar yedeklendi.': 'Photos could not be read; only records were backed up.',
    'Saat doğrulama başarısız:': 'Time verification failed:',
    'Sayısal alan doğrulama başarısız:': 'Numeric field verification failed:',
    'İkinci geçiş başarısız, ilk sonuç kullanılıyor:': 'Second pass failed; using first result:',
    'Üçüncü geçiş başarısız:': 'Third pass failed:',
    '· Arama/istasyon:': '· Search/station:',
    'YYYY-AA-GG': 'YYYY-MM-DD',
    'Tüketim: L/100km veya km/L': 'Consumption: L/100km or km/L',
    'Tüketim: MPG-US veya MPG-UK': 'Consumption: MPG-US or MPG-UK',
    'Dil': 'Language', 'Arayüz dili': 'Interface language', 'Arayüz dili / Interface language': 'Interface language',
    'Türkçe': 'Turkish', 'İngilizce': 'English', 'Uygulama dili': 'App language',
    'Aramak için yazıp Ara\'ya basın. İnternet yoksa "Yazdığım adı kullan" ile devam edebilirsiniz.': 'Type and press Search. Without internet, continue with "Use the name I typed".',
    'Dolum ·': 'Fill-up ·', 'Fiyat/': 'Price/',
    'tarihsiz': 'no date',
    'Son yedekler': 'Recent backups',
    'İstasyon bulundu · Photon/OpenStreetMap': 'stations found · Photon/OpenStreetMap',
    'Güncel Mil': 'Current Miles'
  });

  // ------------------------------------------------------------------
  // Birleşik (sayı içeren) metinler için desenler
  // ------------------------------------------------------------------
  var PATTERNS = [
    [/^(\d+(?:[.,]\d+)?) kayıt$/, '$1 records'],
    [/^1 kayıt$/, '1 record'],
    [/^(\d+(?:[.,]\d+)?) dolum$/, '$1 fill-ups'],
    [/^0 dolum$/, '0 fill-ups'],
    [/^(\d+(?:[.,]\d+)?) araç · $/, '$1 vehicles · '],
    [/^(\d+(?:[.,]\d+)?) dolum · $/, '$1 fill-ups · '],
    [/^(\d+(?:[.,]\d+)?) fotoğraf · $/, '$1 photos · '],
    [/^(\d+(?:[.,]\d+)?) hatırlatıcı · $/, '$1 reminders · '],
    [/^(\d+(?:[.,]\d+)?) fotoğraf$/, '$1 photos'],
    [/^(\d+(?:[.,]\d+)?) gün kaldı$/, '$1 days left'],
    [/^(\d+(?:[.,]\d+)?) gün gecikti$/, '$1 days overdue'],
    [/^(\d+(?:[.,]\d+)?) kaldı$/, '$1 left'],
    [/^(\d+(?:[.,]\d+)?) nokta bulundu$/, '$1 points found'],
    [/^(\d+(?:[.,]\d+)?) sonuç · Photon\/OpenStreetMap$/, '$1 results · Photon/OpenStreetMap'],
    [/^(\d+(?:[.,]\d+)?) istasyon bulundu · Photon\/OpenStreetMap$/, '$1 stations found · Photon/OpenStreetMap'],
    [/^(\d+(?:[.,]\d+)?) km içinde istasyonlar aranıyor\.\.\.$/, 'Searching stations within $1 km...'],
    [/^(\d+(?:[.,]\d+)?) fotoğraf IndexedDB'ye taşındı ✓$/, '$1 photos migrated to IndexedDB ✓'],
    [/^(\d+(?:[.,]\d+)?) fotoğraf taşınamadı, eski yerde kaldı$/, '$1 photos could not be migrated; kept in place'],
    [/^(\d+(?:[.,]\d+)?) yetim fotoğraf temizlendi$/, '$1 orphan photos cleaned'],
    [/^(\d+(?:[.,]\d+)?) fotoğraf · (.+) MB \(IndexedDB\)$/, '$1 photos · $2 MB (IndexedDB)'],
    [/^(\d+(?:[.,]\d+)?) fotoğraf · (.+) MB$/, '$1 photos · $2 MB'],
    [/^\/6 alan bulundu$/, '/6 fields found'],
    [/^(\d+)\/6 alan bulundu$/, '$1/6 fields found'],
    [/^OCR güveni: %(\d+)$/, 'OCR confidence: $1%'],
    [/^· tutarlar uyumlu$/, '· amounts consistent'],
    [/^· önceki durum güvenlik yedeğinde$/, '· previous state kept in a safety backup'],
    [/^Mesafe sayacı \((.+)\)$/, 'Odometer ($1)'],
    [/^Başlangıç sayacı \((.+)\)$/, 'Start odometer ($1)'],
    [/^Bitiş sayacı \((.+)\)$/, 'End odometer ($1)'],
    [/^Yakıt \((.+)\)$/, 'Fuel ($1)'],
    [/^Yakıt Fiyatı \((.+)\)$/, 'Fuel price ($1)'],
    [/^Tüketim \((.+)\)$/, 'Consumption ($1)'],
    [/^Yakıt Tüketim Analizi \((.+)\)$/, 'Fuel Consumption Analysis ($1)'],
    [/^Toplam maliyet \((.+)\)$/, 'Total cost ($1)'],
    [/^Tank \((.+)\)$/, 'Tank ($1)'],
    [/^Tank Kapasitesi \((.+)\)$/, 'Tank capacity ($1)'],
    [/^Tutar \((.+)\)$/, 'Amount ($1)'],
    [/^Mesafe \((.+)\)$/, 'Distance ($1)'],
    [/^Konum \((.+)\)$/, 'Location ($1)'],
    [/^Mevcut Konum \((.+)\)$/, 'Current location ($1)'],
    [/^Harita noktası \((.+)\)$/, 'Map point ($1)'],
    [/^Konumunuz \(±(.+)\)$/, 'Your location (±$1)'],
    [/^Güncel (Kilometre|Mil)$/, function (m, d) { return 'Current ' + (d === 'Mil' ? 'Miles' : 'Odometer'); }],
    [/^Son değer: (.+)$/, 'Last value: $1'],
    [/^Seçilen nokta: (.+)$/, 'Selected point: $1'],
    [/^Kayıtlı hava durumu: (.+)$/, 'Saved weather: $1'],
    [/^Haftanın ilk günü: (.+)$/, 'First day of week: $1'],
    [/^Varsayılan sayfa: (.+)$/, 'Default page: $1'],
    [/^Örnek: (.+)$/, 'Example: $1'],
    [/^Geri yüklendi: (.+)$/, 'Restored: $1'],
    [/^Geri yüklenemedi: (.+)$/, 'Could not restore: $1'],
    [/^Yedek alındı ✓ (.*)$/, 'Backup saved ✓ $1'],
    [/^Otomatik yedek alındı ✓ (.*)$/, 'Automatic backup saved ✓ $1'],
    [/^Yedek hazır: (.+)$/, 'Backup ready: $1'],
    [/^Yedek alınamadı: (.+)$/, 'Backup failed: $1'],
    [/^Yedek okunamadı: (.+)$/, 'Backup could not be read: $1'],
    [/^Yedek listesi okunamadı: (.+)$/, 'Backup list could not be read: $1'],
    [/^Otomatik yedek alınamadı: (.+)$/, 'Automatic backup failed: $1'],
    [/^Eski yedekler budanamadı: (.+)$/, 'Old backups could not be pruned: $1'],
    [/^Geri yükleme öncesi güvenlik yedeği alınamadı: (.+)$/, 'Safety backup before restore failed: $1'],
    [/^Kayıt başarısız: (.+)$/, 'Record failed: $1'],
    [/^Silinemedi: (.+)$/, 'Could not delete: $1'],
    [/^İndirilemedi: (.+)$/, 'Could not download: $1'],
    [/^OCR indirilemedi: (.+)$/, 'OCR download failed: $1'],
    [/^OCR kütüphanesi yüklenemedi: (.+)$/, 'OCR library could not load: $1'],
    [/^OCR hatası: (.+)$/, 'OCR error: $1'],
    [/^Ayarlar kaydedilemedi: (.+)$/, 'Settings could not be saved: $1'],
    [/^Ayarlar okunamadı: (.+)$/, 'Settings could not be read: $1'],
    [/^Veri kaydetme hatası: (.+)$/, 'Data save error: $1'],
    [/^Veri yükleme hatası: (.+)$/, 'Data load error: $1'],
    [/^Service worker kaydedilemedi: (.+)$/, 'Service worker could not be registered: $1'],
    [/^Fotoğraf işlenemedi: (.+)$/, 'Photo could not be processed: $1'],
    [/^Fotoğraf geri yüklenemedi: (.+)$/, 'Photo could not be restored: $1'],
    [/^Fotoğraf taşınamadı: (.+)$/, 'Photo could not be migrated: $1'],
    [/^Fotoğraf deposu temizlenemedi: (.+)$/, 'Photo storage could not be cleared: $1'],
    [/^Fotoğraflar silinemedi: (.+)$/, 'Photos could not be deleted: $1'],
    [/^Fotoğraflar yedeğe eklenemedi: (.+)$/, 'Photos could not be added to backup: $1'],
    [/^Kaldırılan fotoğraflar silinemedi: (.+)$/, 'Removed photos could not be deleted: $1'],
    [/^Yetim fotoğraf temizliği yapılamadı: (.+)$/, 'Orphan photo cleanup failed: $1'],
    [/^Son istasyonlar kaydedilemedi: (.+)$/, 'Recent stations could not be saved: $1'],
    [/^Yakın istasyon hatası: (.+)$/, 'Nearby station error: $1'],
    [/^İstasyon araması hatası: (.+)$/, 'Station search error: $1'],
    [/^Fotoğraf sıkıştırılamadı, orijinal saklanacak: (.+)$/, 'Photo could not be compressed; original will be kept: $1'],
    [/^Fotoğraf deposu başlatılamadı \(base64 yedek modu\): (.+)$/, 'Photo storage could not start (base64 fallback mode): $1'],
    [/^Sayaçı (.+) olarak düzelt$/, 'Set odometer to $1'],
    [/^Litreyi (.+) yap$/, 'Set liters to $1'],
    [/^En fazla (.+)$/, 'At most $1'],
    [/^Son sayaçtan (.+) km artış görünüyor\. Uzun yol yaptıysanız normaldir\.$/, 'An increase of $1 km since the last odometer. Normal after a long trip.'],
    [/^Girdiğiniz değer, bu aracın en yüksek sayacından \((.+)\) (.+) düşük\. $/, 'The value you entered is $2 lower than this vehicle’s highest odometer ($1). '],
    [/^Bu dolumda (.+) L\/100km görünüyor; araç ortalaması yaklaşık (.+) L\/100km\. $/, 'This fill-up shows $1 L/100km; the vehicle average is about $2 L/100km. '],
    [/^(.+) L girdiniz; bu aracın depo kapasitesi (.+) L\. $/, 'You entered $1 L; this vehicle’s tank capacity is $2 L. '],
    [/^(.+) ₺ değerinde bir kayıt bulundu$/, 'a record of $1 ₺ was found'],
    [/^"(.+)" ve tüm dolum\/gider\/gezi kayıtları silinecek\. Emin misiniz\?$/, '"$1" and all its fill-up/expense/trip records will be deleted. Are you sure?'],
    [/^"(.+)" hatırlatıcısını tamamlandı olarak işaretleyeyim mi\?$/, 'Mark the "$1" reminder as done?'],
    [/^Litre bölgesi yeniden okundu: (.+)$/, 'Liters region re-read: $1'],
    [/^Fiyat bölgesi yeniden okundu: (.+)$/, 'Price region re-read: $1'],
    [/^Tutar bölgesi yeniden okundu: (.+)$/, 'Total region re-read: $1'],
    [/^Tarih bölgesi yeniden okundu: (.+)$/, 'Date region re-read: $1'],
    [/^Saat bölgesi yeniden okundu: (.+)$/, 'Time region re-read: $1'],
    [/^Toplam ÷ litre ile düzeltildi \((.+)\)$/, 'Corrected via total ÷ liters ($1)'],
    [/^Toplam ÷ birim fiyat ile düzeltildi \((.+)\)$/, 'Corrected via total ÷ unit price ($1)'],
    [/^OCR "(.+)" okudu; yıl onarıldı$/, 'OCR read "$1"; year repaired'],
    [/^OCR "(.+)" okudu; toplam ÷ litre ile düzeltildi$/, 'OCR read "$1"; corrected via total ÷ liters'],
    [/^OCR "(.+)" okudu; toplam ÷ birim fiyat ile düzeltildi$/, 'OCR read "$1"; corrected via total ÷ unit price'],
    [/^(\d+(?:[.,]\d+)?) yedek saklanacak$/, '$1 backups will be kept'],
    [/^başlangıçlı · $/, 'starting · '],
    [/^dolum, $/, 'fill-up, '],
    [/^km · $/, 'km · '],
    [/^MB · $/, 'MB · ']
  ];

  // Ek desenler: bileşik metinler (koruma detayları, bakım, sayaç)
  PATTERNS.push(
    [/^(\d+(?:[.,]\d+)?) (km|mi) aşıldı$/, '$1 $2 exceeded'],
    [/^(\d+(?:[.,]\d+)?) (km|mi) kaldı$/, '$1 $2 left'],
    [/^(\d+)\/(\d+) dosya$/, '$1/$2 files'],
    [/^Son yedekler \((\d+)\)$/, 'Recent backups ($1)'],
    [/^Tamamlandı: (.+)$/, 'Done: $1'],
    [/^Şu an: (.+)$/, 'Now: $1'],
    [/^Girdiğiniz değer, bu aracın en yüksek sayacından \((.+)\) (.+) düşük\. Geçmiş bir dolumu kaydediyorsanız normaldir\.$/,
      'The value you entered is $2 lower than this vehicle’s highest odometer ($1). This is normal if you are recording a past fill-up.'],
    [/^Bu dolumda (.+) L\/100km görünüyor; araç ortalaması yaklaşık (.+) L\/100km\. Litre veya sayaç değerini kontrol edin\.$/,
      'This fill-up shows $1 L/100km; the vehicle average is about $2 L/100km. Check the liters or odometer value.'],
    [/^(.+) L girdiniz; bu aracın depo kapasitesi (.+) L\. Bidon\/ek yakıt aldıysanız normaldir\.$/,
      'You entered $1 L; this vehicle’s tank capacity is $2 L. This is normal if you bought extra fuel in a can.'],
    [/^(.*?) · (.*?) km · (.*?) L · (.*?) ₺ değerinde bir kayıt bulundu( \(aynı sayaç\))?\. Aynı fişi iki kez okutmuş olabilirsiniz\.$/,
      function (m, date, odo, lit, cost, same) {
        var d = (date === 'tarihsiz') ? 'no date' : date;
        return d + ' · ' + odo + ' km · ' + lit + ' L · a record of ' + cost + ' ₺ was found' +
          (same ? ' (same odometer)' : '') + '. You may have scanned the same receipt twice.';
      }],
    [/^(\d+(?:[.,]\d+)?) yedek saklanacak$/, '$1 backups will be kept']
  );


  // v10.5 ek sözlük 2: durum/placeholder/eksik etiketler
  Object.assign(DICT, {
    'Hazır — çevrimdışı çalışır': 'Ready — works offline',
    'Yakıt:': 'Fuel:', 'Aranıyor...': 'Searching...', 'Hesaplanıyor...': 'Calculating...',
    'Açıklama ekleyin...': 'Add a description...',
    'Konum adı veya koordinat...': 'Location name or coordinates...',
    'Konum alınıyor...': 'Getting location...',
    'Konum ve hava durumu alınıyor...': 'Getting location and weather...',
    'Fotoğraflar işleniyor...': 'Processing photos...',
    'İstasyon adı veya marka ara...': 'Search station name or brand...',
    'İstasyon, adres veya semt ara...': 'Search station, address or district...',
    'Bu tarayıcıda IndexedDB yok': 'IndexedDB is not available in this browser',
    'IndexedDB açılamadı': 'IndexedDB could not be opened',
    'IndexedDB kullanılamıyor': 'IndexedDB unavailable',
    'IndexedDB kullanılamıyor — fotoğraflar base64 yedek modunda': 'IndexedDB unavailable — photos in base64 fallback mode',
    'IndexedDB yazma hatası, base64 yedeği:': 'IndexedDB write error, base64 fallback:',
    'Sürüm': 'Version',
    'Henüz kaydedilmiş bir gezi yok.': 'No saved trips yet.',
    'Fiş bölgesi kırpılarak okunuyor': 'Reading cropped receipt region',
    'Dördüncü geçiş başarısız:': 'Fourth pass failed:',
    'Toplam ÷ birim fiyat ile hesaplandı': 'Computed as total ÷ unit price',
    'katkıda bulunanlar': 'contributors',
    '1 araç': '1 vehicle', '1 dolum': '1 fill-up', '1 fotoğraf': '1 photo', '1 kayıt': '1 record',
    '1 hatırlatıcı': '1 reminder', '1 gün kaldı': '1 day left', '1 gün gecikti': '1 day overdue',
    '1 nokta bulundu': '1 point found', '1 istasyon bulundu': '1 station found',
    '(ODbL). Konumunuz yalnızca “Konumum” veya “Bu alanda ara” dediğinizde istasyon bulmak için Photon\'a gönderilir. Adres araması arama sorgusunu gönderir.': '(ODbL). Your location is sent to Photon only when you tap “My location” or “Search this area” to find stations. Address search sends the search query.'
  });
  PATTERNS.push(
    [/^Sürüm (.+)$/, 'Version $1'],
    [/^Örn: (.+)$/, 'e.g. $1'],
    [/^(.+) başlangıçlı$/, 'starting $1'],
    [/^(\d+(?:[.,]\d+)?) kayıt$/, '$1 records'],
    [/^(\d+(?:[.,]\d+)?) araç$/, '$1 vehicles'],
    [/^(\d+(?:[.,]\d+)?) hatırlatıcı$/, '$1 reminders'],
    [/^([₺$€£₽₼])\s+(.+)$/, function (m, sym, name) {
      var tr = DICT[name.trim()];
      return tr ? sym + '  ' + tr : m;
    }]
  );

  var NORM = null;
  function normMap() {
    if (!NORM) {
      NORM = {};
      for (var k in DICT) if (Object.prototype.hasOwnProperty.call(DICT, k)) NORM[k.replace(/\s+/g, ' ')] = DICT[k];
    }
    return NORM;
  }
  function lookup(t) {
    if (Object.prototype.hasOwnProperty.call(DICT, t)) return DICT[t];
    var nm = normMap();
    var n = t.replace(/\s+/g, ' ');
    if (Object.prototype.hasOwnProperty.call(nm, n)) return nm[n];
    for (var i = 0; i < PATTERNS.length; i++) {
      var p = PATTERNS[i];
      if (p[0].test(t)) return t.replace(p[0], p[1]);
    }
    return null;
  }

  function translateSegment(seg) {
    var t = seg.trim();
    if (!t) return seg;
    var r = lookup(t);
    return r == null ? seg : seg.replace(t, r);
  }

  function translateText(text) {
    if (lang !== 'en' || text == null) return text;
    var raw = String(text);
    var trimmed = raw.trim();
    if (!trimmed) return text;
    var hit = lookup(trimmed);
    if (hit != null) return raw.replace(trimmed, hit);
    if (trimmed.indexOf(' · ') >= 0) {
      var parts = raw.split(' · ');
      var changed = false;
      var out = parts.map(function (seg) { var r = translateSegment(seg); if (r !== seg) changed = true; return r; });
      if (changed) return out.join(' · ');
    }
    return text;
  }

  // ------------------------------------------------------------------
  // DOM uygulama
  // ------------------------------------------------------------------
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  function skipEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS[el.tagName]) return true;
    if (el.hasAttribute && el.hasAttribute('data-noi18n')) return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function applyToNode(node) {
    if (node.nodeType === 3) {
      var parent = node.parentElement;
      if (!parent || skipEl(parent) || parent.closest('[data-noi18n]')) return;
      var nv = translateText(node.nodeValue);
      if (nv !== node.nodeValue) {
        if (node.__i18nOrig === undefined) node.__i18nOrig = node.nodeValue;
        node.nodeValue = nv;
      }
      return;
    }
    if (node.nodeType === 1) {
      if (skipEl(node) || node.closest('[data-noi18n]')) return;
      for (var i = 0; i < ATTRS.length; i++) {
        var a = ATTRS[i];
        if (node.hasAttribute && node.hasAttribute(a)) {
          var v = node.getAttribute(a);
          var tv = translateText(v);
          if (tv !== v) {
            if (!node.__i18nOrigAttrs) node.__i18nOrigAttrs = {};
            if (node.__i18nOrigAttrs[a] === undefined) node.__i18nOrigAttrs[a] = v;
            node.setAttribute(a, tv);
          }
        }
      }
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3 || root.nodeType === 1) applyToNode(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = tw.nextNode())) applyToNode(n);
  }

  function restore(root) {
    if (!root) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    var n;
    var fix = function (el) {
      if (el.nodeType === 3 && el.__i18nOrig !== undefined) { el.nodeValue = el.__i18nOrig; }
      if (el.nodeType === 1 && el.__i18nOrigAttrs) {
        for (var a in el.__i18nOrigAttrs) el.setAttribute(a, el.__i18nOrigAttrs[a]);
      }
    };
    fix(root);
    while ((n = tw.nextNode())) fix(n);
  }

  function apply(root) {
    if (lang !== 'en') return;
    applying = true;
    try {
      walk(root || document.body);
      if (document.title) document.title = translateText(document.title);
      document.documentElement.setAttribute('lang', 'en');
    } finally { applying = false; }
  }

  function schedule() {
    if (lang !== 'en' || applying || scheduled) return;
    scheduled = setTimeout(function () { scheduled = null; apply(document.body); }, 30);
  }

  function startObserver() {
    if (observer || typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver(function (muts) {
      if (applying || lang !== 'en') return;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') { schedule(); return; }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  function stopObserver() { if (observer) { observer.disconnect(); observer = null; } }

  // Native dialogları da çevir
  function wrapDialogs() {
    ['confirm', 'alert', 'prompt'].forEach(function (fn) {
      var orig = window[fn];
      if (typeof orig !== 'function' || orig.__i18n) return;
      var wrapped = function (msg) {
        var args = Array.prototype.slice.call(arguments);
        if (lang === 'en' && typeof args[0] === 'string') args[0] = translateText(args[0]);
        return orig.apply(window, args);
      };
      wrapped.__i18n = true;
      window[fn] = wrapped;
    });
  }

  function getLang() { return lang; }

  function setLang(next, opts) {
    next = (next === 'en') ? 'en' : 'tr';
    var prev = lang;
    lang = next;
    try { localStorage.setItem(LANG_KEY, next); } catch (e) {}
    if (window.YakitSettings && window.YakitSettings.set) {
      try { window.YakitSettings.set('language', next); } catch (e) {}
    }
    if (prev === next && !(opts && opts.force)) { if (next === 'en') apply(document.body); return; }
    applying = true;
    try {
      restore(document.body);
      document.documentElement.setAttribute('lang', next);
      document.title = (next === 'en') ? 'Fuel Tracker' : 'Yakıt Takip';
    } finally { applying = false; }
    // Dinamik görünümleri yeniden üret (kaynak Türkçe)
    if (typeof window.renderAll === 'function') { try { window.renderAll(); } catch (e) {} }
    if (window.YakitSettingsUI && window.YakitSettingsUI.render) { try { window.YakitSettingsUI.render(); } catch (e) {} }
    if (window.YakitMaintenance) {
      try { if (window.YakitMaintenance.renderHome) window.YakitMaintenance.renderHome(); } catch (e) {}
      try { if (window.YakitMaintenance.renderView) window.YakitMaintenance.renderView(); } catch (e) {}
    }
    if (next === 'en') { apply(document.body); startObserver(); }
    else { stopObserver(); }
    if (typeof window.showToast === 'function' && prev !== next) {
      window.showToast(next === 'en' ? 'Language updated' : 'Dil güncellendi');
    }
  }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
    if (!saved && window.YakitSettings && window.YakitSettings.get) {
      try { saved = (window.YakitSettings.get() || {}).language; } catch (e) {}
    }
    lang = (saved === 'en') ? 'en' : 'tr';
    wrapDialogs();
    document.documentElement.setAttribute('lang', lang);
    if (lang === 'en') {
      document.title = 'Fuel Tracker';
      apply(document.body);
      startObserver();
    }
  }

  window.YakitI18n = {
    t: translateText,
    getLang: getLang,
    setLang: setLang,
    apply: apply,
    init: init,
    DICT: DICT,
    PATTERNS: PATTERNS
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
