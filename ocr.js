/* Yakıt Takip v11.1 — Gerçek OCR (Tesseract.js, tamamen yerel/çevrimdışı)
 * - Motor ve Türkçe model aynı klasörden yüklenir, CDN yoktur.
 * - Görüntü cihazdan çıkmaz; işleme WebWorker içinde yapılır.
 * - Çıkarılan alanlar: yakıt türü, litre, birim fiyat, toplam tutar, tarih, saat.
 * - Sonuçlar kullanıcıya düzenlenebilir şekilde gösterilir, onaylanmadan kaydedilmez.
 * v11.0: seçilmeyen okumalar "Diğer okumalar" olarak gösterilir (tek dokunuşla seçim);
 *        miktar × fiyat satırındaki tutar, satır sonu gürültüsü varsa ve çarpımla
 *        %3 içinde uyuşuyorsa aday kabul edilir. Ölçülen doğruluk 62/72 (%86).
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Sayı / metin yardımcıları
  // ------------------------------------------------------------------
  const TR_UPPER = { 'ı': 'I', 'i': 'İ', 'ş': 'Ş', 'ğ': 'Ğ', 'ü': 'Ü', 'ö': 'Ö', 'ç': 'Ç' };
  function trUpper(s) {
    return String(s || '').replace(/[ıişğüöç]/g, c => TR_UPPER[c] || c).toUpperCase();
  }
  // OCR'ın rakam içinde sık karıştırdığı harfler
  function fixDigits(s) {
    return String(s || '')
      .replace(/[OoQD]/g, '0')
      .replace(/[lIı|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[B]/g, '8')
      .replace(/[Zz]/g, '2')
      .replace(/[Gg]/g, '6')
      .replace(/[Vv]/g, '2');
  }

  /* Türkçe sayı biçimlerini çözer:
   *  "3.468,00" -> 3468   "42,50" -> 42.5   "81.60" -> 81.6
   *  "3.468" -> belirsiz: hem 3468 hem 3.468 aday olarak döner.
   */
  function parseTrNumberCandidates(raw) {
    if (raw == null) return [];
    const spaced = String(raw).trim();
    let s = spaced.replace(/\s/g, '').replace(/[₺]|TL|TRY/gi, '');
    // OCR binlik ayracı olarak ':' okuyabilir: 1:989.12 -> 1989.12 (saat 10:44 bozulmaz)
    s = s.replace(/(\d):(\d{3})(?=[.,\d]|$)/g, '$1$2');
    if (!s) return [];
    const hasDot = s.includes('.'), hasComma = s.includes(',');
    const out = [];
    const push = (v) => { if (Number.isFinite(v) && v > 0 && !out.some(x => Math.abs(x - v) < 1e-9)) out.push(v); };

    if (hasDot && hasComma) {
      // Son görülen ayraç ondalık kabul edilir
      const decIsComma = s.lastIndexOf(',') > s.lastIndexOf('.');
      const norm = decIsComma ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
      push(parseFloat(norm));
    } else if (hasComma) {
      push(parseFloat(s.replace(',', '.')));
      // "1,234" binlik de olabilir
      if (/^\d{1,3},\d{3}$/.test(s)) push(parseFloat(s.replace(',', '')));
    } else if (hasDot) {
      push(parseFloat(s));
      if (/^\d{1,3}(\.\d{3})+$/.test(s)) push(parseFloat(s.replace(/\./g, '')));
    } else {
      push(parseFloat(s));
    }
    // OCR ondalık ayracı yerine boşluk bırakabilir: "8 560" -> 8.560, "500 . 00" -> 500.00
    const sp = spaced.replace(/[₺]|TL|TRY/gi, '').replace(/\s*\.\s*/g, '.').replace(/\s+/g, ' ');
    let m2;
    if ((m2 = sp.match(/^(\d{1,3}) (\d{3})$/))) { const v = parseFloat(m2[1] + '.' + m2[2]); if (Number.isFinite(v) && !out.some(x => Math.abs(x - v) < 1e-9)) out.push(v); }
    if ((m2 = sp.match(/^(\d{1,3}) (\d{2})$/))) { const v = parseFloat(m2[1] + '.' + m2[2]); if (Number.isFinite(v) && !out.some(x => Math.abs(x - v) < 1e-9)) out.push(v); }
    return out.filter(Number.isFinite);
  }

  function parseTrNumber(raw) {
    const c = parseTrNumberCandidates(raw);
    return c.length ? c[0] : null;
  }

  const NUM = '([0-9OoQDlIı|SsBZzGg][0-9OoQDlIı|SsBZzGg.,:\\s]{0,14})';
  /* Türk fişlerinde tutar çoğu zaman '*', 'x', '"' gibi bir önekle yazılır:
   *   TOPLAM        *410,00      TOPLAM   x650,29      TOPLAM  "4.309,74
   * Etiket ile sayı arasındaki bu işaretler atlanmalı, yoksa satır hiç eşleşmez. */
  const SEP = '\\s*[:=]?\\s*[*x×#\'"“”«».,\\-–—]{0,3}\\s*';

  function collectCandidates(lines, patterns, { min, max }) {
    const found = [];
    lines.forEach((line, idx) => {
      const U = trUpper(line);
      patterns.forEach((re, pri) => {
        const m = U.match(re);
        if (!m) return;
        const rawNum = m[m.length - 1];
        if (!/[0-9]/.test(String(rawNum))) return; // salt harf -> rakam sanma
        parseTrNumberCandidates(fixDigits(rawNum)).forEach(v => {
          if (v < min || v > max) return;
          found.push({ value: v, line: idx, priority: pri, raw: String(rawNum).trim(), text: line.trim() });
        });
      });
    });
    // düşük priority sayısı = daha güvenilir etiket
    found.sort((a, b) => a.priority - b.priority || a.line - b.line);
    return found;
  }

  /* Türkiye'deki akaryakıt fişlerinin neredeyse tamamı miktar ve birim fiyatı
   * TEK satırda yazar:  "84,15 LT X 51,22"  /  "10,000 LT x 41.00"
   * OCR 'LT'yi 'LI', 'L1', 'IT' diye okuyabilir; hepsini kabul ediyoruz. */
  const LT_UNIT = '(?:L[Iİ1T]T?|IT|LT|R)';
  // Miktar ve fiyat daima ondalıklı yazılır (23,920 / 41,80). OCR birimi
  // 'LT', 'LI', 'TAX', '1T' diye bozabilir; birimi esnek tut, ondalığı şart koş.
  const QTY_PRICE_RE = new RegExp(
    '([0-9]+[., ][0-9]{1,3})\\s*(?:[A-Z0-9]{0,3}\\s*)?[X×*#]\\s*([0-9]+[., ][0-9]{1,3})'
  );

  const LITER_PATTERNS = [
    new RegExp('(?:L[Iİ]TRE|LITRE|LTR|LT\\b)' + SEP + NUM),
    new RegExp('(?:M[Iİ]KTAR|MIKTAR|VOLUME|QTY)' + SEP + NUM),
    new RegExp(NUM + '\\s*(?:L[Iİ]TRE|LITRE|LTR|LT\\b)')
  ];
  const META_LINE = /L[Iİ]SANS|MERS[Iİ]S|VERG[Iİ]|T[Iİ]C\.?\s*S[Iİ]C|ADA\s*NO|F[Iİ][SŞ]\s*NO|POMPA|TERM[Iİ]NAL|[İI][SŞ]YER[Iİ]|EPDK|[SŞ][Iİ]RKET|TEL\s*:|MH\.|MAH\.|CAD\.|BLV\.|SOK\.|NO\s*:/;
  const PRICE_PATTERNS = [
    new RegExp('(?:B[Iİ]R[Iİ]M\\s*F[Iİ]YAT|BR\\.?\\s*F[Iİ]YAT|UNIT\\s*PRICE)' + SEP + NUM),
    new RegExp('(?:TL\\s*/\\s*LT|TL/L|F[Iİ]YAT\\s*/\\s*LT)' + SEP + NUM),
    new RegExp('(?:F[Iİ]YAT|PRICE)' + SEP + NUM)
  ];
  const TOTAL_PATTERNS = [
    new RegExp('(?:GENEL\\s*TOPLAM|TOPLAM\\s*TUTAR|ODENECEK|ÖDENECEK)' + SEP + NUM),
    new RegExp('(?:TOPLAM|TOTAL|TUTAR|AMOUNT)' + SEP + NUM),
    new RegExp('(?:KDV\\s*DAH[Iİ]L|DAHIL\\s*TOPLAM)' + SEP + NUM),
    new RegExp('(?:NAK[Iİ]T|KRED[Iİ]|K\\.?\\s*KARTI|B\\.?\\s*KARTI|KART)' + SEP + NUM),
    new RegExp(NUM + '\\s*(?:TL|₺|TRY)\\b')
  ];
  const TOTAL_SKIP_LINE = /KAR[SŞ]ILI[GĞ]I|KARSILIGI|MAL\s*VEYA|H[Iİ]ZMET[Iİ]\s*ALDIM|ALDI[GĞ]IM|PARAF\s*PARA|PUAN|KES[Iİ]M|HESAP/;
  /* KDV satırları toplam sanılmamalı: "TOPKDV *108,38" */
  const KDV_LINE = /\bKDV\b|TOPKDV|VERG[Iİ]/;

  /* OCR yıllarda 0↔9/6/8/O karışması sık görülür (2026 → 2926).
   * Aralık dışı bir yıl okunduysa tek haneli düzeltme dener.
   */
  function repairYear(token) {
    const cleaned = fixDigits(String(token || ''));
    if (!/^\d{4}$/.test(cleaned)) return null;
    const n = +cleaned;
    const nowYear = new Date().getFullYear();
    const inRange = (y) => y >= 2000 && y <= nowYear + 1;
    if (inRange(n)) return { year: n, repaired: false };
    // OCR yılın ilk hanesini de bozabiliyor: 2024 → 7024, 2025 → 1025
    const alts = {
      '9': ['0', '2'], '6': ['0', '2'], '8': ['0', '2'], '5': ['0', '2'],
      '3': ['0', '2'], '1': ['0', '2'], '7': ['2', '1', '0'], '4': ['2'],
      '0': ['9', '6', '8', '2']
    };
    for (let i = 0; i < 4; i++) {   // ilk hane de bozulabilir: 7024 → 2024
      for (const rep of (alts[cleaned[i]] || [])) {
        const cand = +(cleaned.slice(0, i) + rep + cleaned.slice(i + 1));
        if (inRange(cand)) return { year: cand, repaired: true };
      }
    }
    return null;
  }

  function extractDate(text) {
    const out = [];
    const push = (yTok, m, d, raw, pri) => {
      const yr = repairYear(yTok);
      if (!yr) return;
      const dirty = (String(yTok) + String(m) + String(d)).replace(/[0-9]/g, '').length;
      m = +fixDigits(m); d = +fixDigits(d);
      // OCR gün/ay ilk hanesini bozabilir: 66 -> 06, 0V -> 02. Tek hane onarımı dene.
      const repairDay = (v) => {
        if (v >= 1 && v <= 31) return v;
        const t = String(v).padStart(2, '0');
        const alts = { '6': ['0','1','2'], '8': ['0','1','2'], '9': ['0','1','2'], '5': ['0','1','2'], '3': ['0','1','2'], '7': ['0','1'], '4': ['0','1'] };
        for (let i = 0; i < t.length; i++) for (const r of (alts[t[i]] || [])) {
          const c = +(t.slice(0, i) + r + t.slice(i + 1));
          if (c >= 1 && c <= 31) return c;
        }
        return v;
      };
      d = repairDay(d);
      if (m < 1 || m > 12) { const mr = repairDay(m); if (mr >= 1 && mr <= 12) m = mr; }
      if (m < 1 || m > 12 || d < 1 || d > 31) return;
      const key = `${yr.year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const existing = out.find(o => o.key === key);
      if (existing) { existing.priority = Math.min(existing.priority, pri); existing.dirty = Math.min(existing.dirty, dirty); return; }
      out.push({ key, raw, priority: pri, repaired: yr.repaired, dirty });
    };
    const Y = '([0-9OoQDlIı|SsBZzGgVv]{4})';
    const D = '([0-9OoQDlIı|SsBZzGgVv]{1,2})';
    const SP = '[./\\-\u2019\u2018\u0027:|\\s]+';
    const lines = String(text || '').split(/\r?\n/);
    lines.forEach((line) => {
      const U = trUpper(line);
      if (META_LINE.test(U)) return; // MERSİS/LİSANS/TİC/SİC/ADA NO satırları tarih değildir
      const labeled = /TAR[Iİ]H|DATE/.test(U);
      // İkincil tarihler (hesap kesim / son ödeme) ana tarihin önüne geçmesin
      const secondary = /KES[Iİ]M|HESAP|VADE|SON\s*[ÖO]DEME/.test(U);
      const pri = secondary ? 3 : (labeled ? 0 : 1);
      let m;
      const re1 = new RegExp(D + SP + D + SP + Y, 'g');
      while ((m = re1.exec(U))) push(m[3], m[2], m[1], m[0], pri);
      const re2 = new RegExp(Y + SP + D + SP + D, 'g');
      while ((m = re2.exec(U))) push(m[1], m[2], m[3], m[0], pri);
      // Ayraç eksik/kaymış: 13'112024, 13/112024, 13.1124  -> GG AA YYYYY
      const re3 = new RegExp(D + SP + '([0-9]{4,6})\\b', 'g');
      while ((m = re3.exec(U))) {
        const tail = m[2];
        if (tail.length === 6) push(tail.slice(2), tail.slice(0, 2), m[1], m[0], pri);
        else if (tail.length === 4) push('20' + tail.slice(2), tail.slice(0, 2), m[1], m[0], pri + 1);
      }
    });
    // etiketli > etiketsiz, onarılmamış > onarılmış
    out.sort((a, b) => a.priority - b.priority || (a.repaired ? 1 : 0) - (b.repaired ? 1 : 0) || (a.dirty || 0) - (b.dirty || 0));
    return out[0] || null;
  }

  // ------------------------------------------------------------------
  // v9: Yakıt türü ve saat
  // ------------------------------------------------------------------
  const REFUEL_FUEL_TYPES = ['Kurşunsuz 95', 'Kurşunsuz 97/98', 'Motorin (Dizel)', 'LPG'];
  const FUEL_TYPE_PATTERNS = [
    { value: 'LPG', re: /\bLPG\b|OTOGAZ|AUTOGAS|PROPAN|PROPANE/ },
    { value: 'Motorin (Dizel)', re: /MOTOR[Iİ]N|MOTORIN|D[Iİ]ZEL|DIZEL|DIESEL|EURODI|EUROD[Iİ]|EXCELLIUM|OPT[Iİ]MUM|V-?MAX/ },
    { value: 'Kurşunsuz 97/98', re: /(?:KURSUNSUZ|KURŞUNSUZ|BENZ[Iİ]N|GASOLINE|UNLEADED|S[UÜ]PER|OKTAN|RON)\s*(?:97|98)|97\s*\/\s*98|S[UÜ]PER\s*PLUS/ },
    { value: 'Kurşunsuz 95', re: /(?:KURSUNSUZ|KURŞUNSUZ|BENZ[Iİ]N|GASOLINE|UNLEADED|SUPER|OKTAN|RON)\s*95|95\s*OKT(?:AN)?|RON\s*95|EURO\s*SUPER|K\s*[B6]NZ|KBENZ|6NZ|BNZ\s*95|\bBENZ[Iİ]N\b|\bKURSUNSUZ\b|\bKURŞUNSUZ\b/ }
  ];
  function extractFuelType(lines) {
    let best = null;
    (lines || []).forEach((line, idx) => {
      const U = trUpper(line);
      if (KDV_LINE.test(U) || /\bTOPLAM\b|\bNAK[Iİ]T\b|KART/.test(U) || META_LINE.test(U)) return;
      let priority = 2;
      if (/(?:YAKIT|FUEL|ÜRÜN|URUN|PRODUCT)\s*(?:T[Iİ]P[Iİ]|TÜRÜ|TURU|CINSI|ADI|TYPE|NAME)?\s*[:=]?/.test(U)) priority = 0;
      else if (/%\s*\d{1,2}/.test(U) && /[0-9][0-9.,]*[.,][0-9]{2}/.test(U)) priority = 0;
      else if (/[0-9][0-9.,]*\s*(?:TL|₺)|[*x×%]\s*[0-9]|[0-9][0-9.,]*\s*LT\s*[X×*]/.test(U)) priority = 1;
      for (const p of FUEL_TYPE_PATTERNS) {
        if (!p.re.test(U)) continue;
        const cand = { value: p.value, source: line.trim(), priority, line: idx, verified: priority === 0 };
        if (!best || priority < best.priority) best = cand;
        break;
      }
    });
    return best;
  }

  const TIME_TOKEN = /(^|[^\d])([01]?\d|2[0-3])\s*[:;]\s*([0-5]\d)(?!\d)/g;
  function normalizeTime(h, m) {
    h = +h; m = +m;
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  function extractTime(text) {
    const lines = String(text || '').split(/\r?\n/);
    const out = [];
    lines.forEach((line, idx) => {
      const U = trUpper(line);
      const labeled = /SAAT|TIME|ZAMAN/.test(U);
      if (!labeled && (KDV_LINE.test(U) || /\bTOPLAM\b|\bNAK[Iİ]T\b|KART|\bLT\s*[X×*]|\bZ\s*NO\b|\bEKÜ\b|POMPA|TERM[Iİ]NAL|[İI]SYER[Iİ]|F[Iİ][SŞ]\s*NO|ONAY|KODU/.test(U))) return;
      const hasDate = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(U);
      const pri = labeled ? 0 : hasDate ? 1 : 2;
      let m; TIME_TOKEN.lastIndex = 0;
      while ((m = TIME_TOKEN.exec(U)) !== null) {
        const val = normalizeTime(m[2], m[3]);
        if (!val) continue;
        out.push({ value: val, source: line.trim(), raw: m[0].trim(), priority: pri, line: idx, verified: labeled });
      }
    });
    out.sort((a, b) => a.priority - b.priority || a.line - b.line);
    return out[0] || null;
  }

  function parseTsvRows(tsv) {
    return String(tsv || '').split(/\r?\n/)
      .map(l => l.split('\t'))
      .filter(c => c.length >= 12 && c[11] && c[11].trim())
      .map(c => ({ level: +c[0], block: +c[2], par: +c[3], line: +c[4], left: +c[6], top: +c[7], width: +c[8], height: +c[9], conf: +c[10], text: c[11].trim() }));
  }

  /* Saat küçük yazıldığında OCR "01:09" yerine "0:09" okuyabilir.
   * TSV'den saat/tarih kutusunu bulup yalnız o bölgeyi PSM 7 + rakam whitelist
   * ile yeniden okur. Böylece tam fiş yeniden işlenmez, küçük bir kırpma yeterli. */
  async function verifyTimeWithCrop(worker, imageBlob, parsed) {
    try {
      const rows = parsed && parsed._tsvRows || [];
      if (!rows.length || !worker || !imageBlob) return parsed;
      const dateRow = rows.find(r => r.level === 5 && extractDate(r.text));
      const timeRow = rows.find(r => r.level === 5 && /^\d{1,2}[:;.]\d{2}$/.test(r.text) && dateRow && Math.abs(r.top - dateRow.top) < 200 && r.left > dateRow.left);
      let rect = null;
      if (timeRow) {
        rect = { x: timeRow.left - 25, y: timeRow.top - 25, w: timeRow.width + 50, h: timeRow.height + 50 };
      } else if (dateRow) {
        const lineRow = rows.find(r => r.level === 4 && r.block === dateRow.block && r.par === dateRow.par && r.line === dateRow.line);
        if (lineRow) {
          const x = Math.round(lineRow.left + lineRow.width * 0.62);
          rect = { x, y: lineRow.top - 15, w: lineRow.left + lineRow.width - x - 5, h: lineRow.height + 30 };
        }
      }
      if (!rect || rect.w < 10 || rect.h < 10) return parsed;
      const bitmap = await loadBitmap(imageBlob);
      rect.x = Math.max(0, Math.min(Math.round(rect.x), bitmap.width - 1));
      rect.y = Math.max(0, Math.min(Math.round(rect.y), bitmap.height - 1));
      rect.w = Math.max(1, Math.min(Math.round(rect.w), bitmap.width - rect.x));
      rect.h = Math.max(1, Math.min(Math.round(rect.h), bitmap.height - rect.y));
      const c = document.createElement('canvas');
      c.width = rect.w * 3; c.height = rect.h * 3;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, c.width, c.height);
      if (bitmap.close) bitmap.close();
      const blob = await new Promise(res => c.toBlob(res, 'image/png'));
      if (!blob) return parsed;
      await worker.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '0123456789:' });
      let rr;
      try { rr = await worker.recognize(blob); }
      finally { await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '' }); }
      const t = extractTime(rr && rr.data && rr.data.text || '');
      if (!t) return parsed;
      const old = parsed.fields.time;
      const oldConf = timeRow ? timeRow.conf : 0;
      const newConf = Number(rr && rr.data && rr.data.confidence) || 0;
      const oldSingle = old && /^\d:\d{2}$/.test(String(old.raw || old.value));
      if (!old || oldSingle || newConf >= oldConf + 5 || (t.value !== old.value && newConf > oldConf)) {
        parsed.fields.time = { value: t.value, source: `Saat bölgesi yeniden okundu: ${t.value}`, verified: newConf >= 80, raw: t.raw, confidence: Math.round(newConf) };
        parsed.foundCount = ['liters', 'price', 'total', 'date', 'fuelType', 'time'].filter(k => parsed.fields[k]).length;
      }
    } catch (e) { console.warn('Saat doğrulama başarısız:', e); }
    return parsed;
  }

  // ------------------------------------------------------------------
  // v10.4: Hedefli kırpma ile sayısal alan doğrulama
  // Tam fiş okumasında bozulan TOPLAM / litre×fiyat / tarih satırlarını
  // TSV'den bulup yalnız o bölgeyi PSM 7 + rakam ağırlıklı whitelist ile
  // yeniden okur. Küçük kırpma = daha yüksek doğruluk, düşük maliyet.
  // ------------------------------------------------------------------
  async function cropRecognize(worker, imageBlob, rect, whitelist) {
    const bitmap = await loadBitmap(imageBlob);
    rect.x = Math.max(0, Math.min(Math.round(rect.x), bitmap.width - 1));
    rect.y = Math.max(0, Math.min(Math.round(rect.y), bitmap.height - 1));
    rect.w = Math.max(1, Math.min(Math.round(rect.w), bitmap.width - rect.x));
    rect.h = Math.max(1, Math.min(Math.round(rect.h), bitmap.height - rect.y));
    if (rect.w < 12 || rect.h < 10) { if (bitmap.close) bitmap.close(); return null; }
    const scale = rect.h < 60 ? 4 : 3;
    const c = document.createElement('canvas');
    c.width = rect.w * scale; c.height = rect.h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, c.width, c.height);
    if (bitmap.close) bitmap.close();
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    if (!blob) return null;
    await worker.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: whitelist });
    let rr;
    try { rr = await worker.recognize(blob); }
    finally { await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '' }); }
    return { text: (rr && rr.data && rr.data.text || '').trim(), conf: Number(rr && rr.data && rr.data.confidence) || 0 };
  }
  // TSV'de satır (level 4) metni boş gelir; kelimeleri (level 5) birleştirip
  // satır kutusu ve metni üretiyoruz.
  function groupLines(rows) {
    const map = new Map();
    for (const r of rows) {
      if (r.level !== 5) continue;
      const k = r.block + ':' + r.par + ':' + r.line;
      let g = map.get(k);
      if (!g) { g = { block: r.block, par: r.par, line: r.line, left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height, words: [] }; map.set(k, g); }
      g.left = Math.min(g.left, r.left); g.top = Math.min(g.top, r.top);
      g.right = Math.max(g.right, r.left + r.width); g.bottom = Math.max(g.bottom, r.top + r.height);
      g.words.push(r);
    }
    return [...map.values()].map(g => {
      g.words.sort((a, b) => a.left - b.left);
      g.text = g.words.map(w => w.text).join(' ');
      g.width = g.right - g.left; g.height = g.bottom - g.top;
      return g;
    }).sort((a, b) => a.top - b.top || a.left - b.left);
  }
  function lineRect(rows, word) {
    const g = groupLines(rows).find(g => g.block === word.block && g.par === word.par && g.line === word.line);
    if (!g) return null;
    return { x: g.left, y: g.top, w: g.width, h: g.height, line: g };
  }
  // Birleştirme sonrası çapraz tutarlılık: litre×fiyat≈toplam değilse ve
  // fark yuvarlamadan büyükse, 3 ondalıklı (OCR artefaktı) alanı düzelt.
  // İki sayı arasındaki OCR hane hatası maliyeti (kaç rakam farklı)
  function digitCost(a, b) {
    const sa = Number(a).toFixed(2).replace('.', ''), sb = Number(b).toFixed(2).replace('.', '');
    if (sa.length !== sb.length) return Math.abs(sa.length - sb.length) + 2;
    let d = 0; for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) d++;
    return d;
  }
  /* litre × fiyat ≈ toplam tutmuyorsa hangi alanı düzelteceğimize karar verir.
   * OCR'dan en az rakam değiştirerek tutarlılığa ulaşan düzeltmeyi seçer;
   * böylece temiz okunmuş birim fiyat (41,80) bozulmaz, hatalı litre (23,97→23,92) düzelir. */
  function pickReconcile(L, P, T) {
    const err = Math.abs(L * P - T);
    if (!(L > 0 && P > 0 && T > 0) || err / Math.max(T, 1) <= 0.001) return null;
    const dL = +(T / P).toFixed(2), dP = +(T / L).toFixed(2);
    const eL = Math.abs(dL * P - T), eP = Math.abs(L * dP - T);
    const okL = dL > 0 && eL + 0.005 < err && Math.abs(dL - L) / L < 0.02;
    const okP = dP > 0 && eP + 0.005 < err && Math.abs(dP - P) / P < 0.02;
    if (!okL && !okP) return null;
    if (okL && !okP) return { field: 'L', value: dL };
    if (okP && !okL) return { field: 'P', value: dP };
    const cL = digitCost(L, dL), cP = digitCost(P, dP);
    if (cL !== cP) return cL < cP ? { field: 'L', value: dL } : { field: 'P', value: dP };
    return eL <= eP ? { field: 'L', value: dL } : { field: 'P', value: dP };
  }

  function reconcileNumeric(fields) {
    const L = fields.liters && fields.liters.value, P = fields.price && fields.price.value, T = fields.total && fields.total.value;
    if (fields.total && fields.total.computed) return;
    const pick = pickReconcile(L, P, T);
    if (!pick) return;
    if (pick.field === 'L') {
      fields.liters = { value: pick.value, source: `Toplam ÷ birim fiyat ile düzeltildi (${String(L).replace('.', ',')} → ${String(pick.value).replace('.', ',')})`, verified: true, corrected: true, ocrValue: L };
    } else {
      fields.price = { value: pick.value, source: `Toplam ÷ litre ile düzeltildi (${String(P).replace('.', ',')} → ${String(pick.value).replace('.', ',')})`, verified: true, corrected: true, ocrValue: P };
    }
  }

  function recount(parsed) {
    parsed.foundCount = ['liters', 'price', 'total', 'date', 'fuelType', 'time'].filter(k => parsed.fields[k]).length;
  }

  async function verifyNumericCrops(worker, imageBlob, parsed) {
    try {
      const rows = parsed && parsed._tsvRows || [];
      if (!rows.length || !worker || !imageBlob) return parsed;
      const lines = groupLines(rows);
      const words = rows.filter(r => r.level === 5);
      const NUMWL = '0123456789.,';

      // --- TOPLAM / TUTAR ---
      const CROP_SKIP = /KODU|MERS[Iİ]S|L[Iİ]SANS|T[Iİ]C|S[Iİ]C|ADA\s*NO|[ÜU]YE|POS\s*NO|[İI][SŞ]LEM|SATI[SŞ]|F[Iİ][SŞ]\s*NO|POMPA|TERM[Iİ]NAL/;
      const totalLine = lines.find(g => /\b(TOPLAM|TUTAR|GENEL\s*TOPLAM|TOTAL|AMOUNT)\b/i.test(trUpper(g.text)) && !CROP_SKIP.test(trUpper(g.text)));
      if (totalLine) {
        const lr = { x: totalLine.left, y: totalLine.top, w: totalLine.width, h: totalLine.height };
        let rect = { x: lr.x + lr.w * 0.40, y: lr.y - 8, w: lr.w * 0.60 + 10, h: lr.h + 16 };
        let rr = await cropRecognize(worker, imageBlob, rect, NUMWL + '*xX');
        const idContext = (t) => CROP_SKIP.test(trUpper(t || '')) || /[0-9]{6,}/.test(String(t || ''));
        let val = (rr && !idContext(rr.text) && !(parsed.fields.liters && parsed.fields.price)) ? parseTrNumberCandidates(fixDigits(rr.text.replace(/[^0-9.,]/g, ''))).find(v => v >= 5 && v <= 500000) : null;
        if (val == null) {
          const next = lines.filter(g => g.top > lr.y + lr.h * 0.5 && g.top < lr.y + lr.h * 3.5)
            .sort((a, b) => a.top - b.top)[0];
          if (next) {
            rr = await cropRecognize(worker, imageBlob, { x: next.left - 6, y: next.top - 8, w: next.width + 12, h: next.height + 16 }, NUMWL);
            val = (rr && !idContext(rr.text) && !idContext(next.text) && !(parsed.fields.liters && parsed.fields.price)) ? parseTrNumberCandidates(fixDigits(rr.text.replace(/[^0-9.,]/g, ''))).find(v => v >= 5 && v <= 500000) : null;
          }
        }
        const old = parsed.fields.total;
        if (val != null && !old) {
          parsed.fields.total = { value: +val.toFixed(2), source: `Tutar bölgesi yeniden okundu: ${String(val).replace('.', ',')}`, verified: rr.conf >= 80, confidence: Math.round(rr.conf), crop: true };
          recount(parsed);
        }
      }

      // --- litre × fiyat satırı ---
      const qtyLine = lines.find(g => /[0-9][.,][0-9]{1,3}\s*[A-Z]{0,3}\s*[X×*]/i.test(g.text) || (/[X×*]/.test(g.text) && /\bLT|\bLI\b|L[Iİ]TRE|LTX|[0-9][.,][0-9]{2,3}/i.test(g.text)));
      if (qtyLine) {
        const rr = await cropRecognize(worker, imageBlob, { x: qtyLine.left - 6, y: qtyLine.top - 8, w: qtyLine.width + 12, h: qtyLine.height + 16 }, NUMWL + 'Xx*LlIi');
        if (rr) {
          const qp = extractQtyPrice([rr.text]);
          if (qp.liters && !parsed.fields.liters) {
            parsed.fields.liters = { value: +qp.liters.value.toFixed(2), source: `Litre bölgesi yeniden okundu: ${rr.text}`, verified: rr.conf >= 80, confidence: Math.round(rr.conf) };
          }
          if (qp.price && !parsed.fields.price) {
            parsed.fields.price = { value: +qp.price.value.toFixed(2), source: `Fiyat bölgesi yeniden okundu: ${rr.text}`, verified: rr.conf >= 80, confidence: Math.round(rr.conf) };
          }
          recount(parsed);
        }
      }

      // --- tarih ---
      const dateLine = lines.find(g => extractDate(g.text)) || lines.find(g => /TAR[Iİ]H|DATE/i.test(g.text));
      if (dateLine) {
        const rr = await cropRecognize(worker, imageBlob, { x: dateLine.left - 6, y: dateLine.top - 8, w: Math.min(dateLine.width * 0.62, 460) + 12, h: dateLine.height + 16 }, NUMWL + '/-:');
        if (rr) {
          const d = extractDate(rr.text);
          const old = parsed.fields.date;
          if (d && (!old || (old.repaired && !d.repaired))) {
            parsed.fields.date = { value: d.key, source: d.repaired ? `OCR "${d.raw}" okudu; yıl onarıldı` : `Tarih bölgesi yeniden okundu: ${d.raw}`, verified: !d.repaired && rr.conf >= 75, repaired: !!d.repaired, confidence: Math.round(rr.conf) };
            recount(parsed);
          }
        }
      }
    } catch (e) { console.warn('Sayısal alan doğrulama başarısız:', e); }
    return parsed;
  }

  /* Aynı tutar fişte birkaç kez yazılır (ürün satırı, TOPLAM, K.KARTI, TUTAR).
   * OCR birini bozsa bile (1.000,04) doğru değer (1.000,00) çoğunlukla kazanır. */
  function voteTotals(totals) {
    if (!totals.length) return totals;
    const groups = [];
    for (const t of totals) {
      const g = groups.find(g => Math.abs(g.value - t.value) / Math.max(g.value, 1) <= 0.005);
      if (g) { g.items.push(t); g.votes += 1; g.bestPri = Math.min(g.bestPri, t.priority); }
      else groups.push({ value: t.value, items: [t], votes: 1, bestPri: t.priority });
    }
    groups.sort((a, b) => b.votes - a.votes || a.bestPri - b.bestPri);
    const out = [];
    for (const g of groups) {
      // grup içinde en düşük öncelikli (en güvenilir etiketli) örneği temsilci seç
      const rep = g.items.slice().sort((a, b) => a.priority - b.priority)[0];
      out.push(Object.assign({}, rep, { priority: g.bestPri, votes: g.votes }));
      for (const it of g.items) if (it !== rep) out.push(it);
    }
    return out;
  }

  /* Adayları çapraz doğrulayarak en tutarlı üçlüyü seçer:
   * litre × birim fiyat ≈ toplam
   */
  function chooseConsistent(liters, prices, totals) {
    let best = null;
    const L = liters.slice(0, 8), P = prices.slice(0, 8), T = totals.slice(0, 8);
    for (const l of L) for (const p of P) for (const t of T) {
      const expected = l.value * p.value;
      const rel = Math.abs(expected - t.value) / Math.max(t.value, 1);
      if (rel > 0.03) continue;
      const score = rel * 100 + (l.priority + p.priority + t.priority) * 0.5;
      if (!best || score < best.score) best = { l, p, t, score, rel };
    }
    return best;
  }

  /* "84,15 LT X 51,22" / "10,000 LT x 41.00" / "15,520 LT X 41,909"
   * Miktar ve birim fiyatı tek satırdan çıkarır. Türk akaryakıt fişlerinin
   * standart düzeni budur ve ayrı "BİRİM FİYAT" etiketi genelde hiç yoktur. */
  function extractQtyPrice(lines) {
    const out = { liters: null, price: null };
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const U = trUpper(line);
      const m = U.match(QTY_PRICE_RE);
      if (!m) continue;
      const lc = parseTrNumberCandidates(fixDigits(m[1]));
      const pc = parseTrNumberCandidates(fixDigits(m[2]));
      // Miktar 0,5–1500 L, birim fiyat 1–500 TL aralığında olmalı
      const l = lc.find(v => v >= 0.5 && v <= 1500);
      const p = pc.find(v => v >= 1 && v <= 500);
      if (l !== undefined && !out.liters) {
        out.liters = { value: l, line: idx, priority: -1, raw: m[1], text: line.trim() };
      }
      if (p !== undefined && !out.price) {
        out.price = { value: p, line: idx, priority: -1, raw: m[2], text: line.trim() };
      }
      // Satır sonundaki tutar (ürün satırı toplamı): "8,560 LT X 41,06 *352,29"
      if (!out.total) {
        const rest = U.slice(m.index + m[0].length);
        // v11.0: satır sonunda OCR'ın eklediği gürültüye (—, ", ., boşluk) izin ver.
        // Örn. "8 560 LT X 41,90  \"352,29   —"  → 352,29
        let tm = rest.match(/([0-9][0-9., ]*[.,][0-9]{2})\s*$/);
        if (!tm) tm = rest.match(/([0-9][0-9., ]*[.,][0-9]{2})\s*[^0-9]{1,6}\s*$/);
        if (tm) {
          const tv = parseTrNumberCandidates(fixDigits(tm[1])).find(v => v >= 5 && v <= 500000);
          // Gürültü toleransıyla bulunan tutar, aynı satırdaki miktar × birim fiyat
          // çarpımına yakın olmalı (%3). Böylece "20 TL" gibi KDV/oran değerleri
          // toplam adayı olmaz.
          let ok = tv !== undefined;
          if (ok && /[^0-9]{1,6}\s*$/.test(rest.slice(rest.indexOf(tm[1]) + tm[1].length))) {
            if (l !== undefined && p !== undefined) {
              const expect = l * p;
              ok = Math.abs(tv - expect) <= Math.max(1, expect * 0.03);
            } else ok = false;
          }
          if (ok) out.total = { value: tv, line: idx, priority: 1, raw: tm[1], text: line.trim() };
        }
      }
      if (out.liters && out.price) break;
    }
    return out;
  }

  /* Ürün satırı: "MOTORİN %20 *410,00" — yakıt adı + KDV oranı + tutar.
   * TOPLAM satırı okunamadığında güçlü bir yedektir. */
  const FUEL_WORDS = /MOTOR[Iİ]N|MOTORIN|BENZ[Iİ]N|KURSUNSUZ|KURŞUNSUZ|EURODI|EUROD[Iİ]|EXCELLIUM|OPT[Iİ]MUM|LPG|OTOGAZ|D[Iİ]ZEL|DIZEL|K\s*[B6]NZ|KBENZ|6NZ|BNZ|V-?MAX|FUELSAVE|POWER|NITRO/;
  function extractProductTotal(lines) {
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const U = trUpper(line);
      if (!FUEL_WORDS.test(U)) continue;
      if (KDV_LINE.test(U)) continue;
      // Satırdaki tüm sayıları topla; %20 gibi oranları ele
      // KDV oranı OCR'da '%20', 'x20', '*20', '(“620' gibi görünebilir → at
      const cleaned = U
        .replace(/[%X*×(“"']\s*\d{1,2}\b/g, ' ')
        .replace(/%\s*\d+/g, ' ');
      const cand = [];
      // Tutarlar Türk fişlerinde daima ondalıklı yazılır; ayraçsız sayıları alma.
      const re = /([0-9][0-9.,]*[.,][0-9]{1,3})/g;
      let m;
      while ((m = re.exec(cleaned)) !== null) {
        parseTrNumberCandidates(fixDigits(m[1])).forEach(v => {
          if (v >= 5 && v <= 500000) cand.push(v);
        });
      }
      if (cand.length) {
        const v = Math.max.apply(null, cand);
        return { value: v, line: idx, priority: 2, raw: String(v), text: line.trim() };
      }
    }
    return null;
  }

  /* ÇOKLU GEÇİŞ OYLAMASI
   * Aynı fiş farklı ön işlemeyle 2 kez okunur. Her geçiş farklı hatalar yapar;
   * alan alan birleştirip litre × fiyat ≈ toplam denetimini sağlayan kombinasyon
   * seçilir. Ölçüm: tek geçiş 11/12, oylama 12/12 (3 gerçek fiş).
   */
  function mergeResults(results) {
    const valid = (results || []).filter(Boolean);
    if (!valid.length) return null;
    if (valid.length === 1) {
      // Tek geçişte bile seçilmeyen ham adaylar gösterilir (v11.0).
      const r = valid[0], alts = {};
      ['liters', 'price', 'total'].forEach(k => {
        const chosen = r.fields && r.fields[k] ? r.fields[k].value : null;
        const seen = new Set([String(chosen)]), list = [];
        ((r.candidates && r.candidates[k]) || []).forEach(v => {
          const n = Number(v);
          if (!isFinite(n) || seen.has(String(n))) return;
          seen.add(String(n));
          list.push({ value: n, votes: 1, pass: 1 });
        });
        if (list.length) alts[k] = list.slice(0, 3);
      });
      return Object.assign({}, r, { alternatives: Object.assign({}, r.alternatives || {}, alts) });
    }

    // Alan başına adayları topla (değer → oy sayısı + en iyi kaynak)
    function gather(key) {
      const map = new Map();
      valid.forEach((r, ri) => {
        const f = r.fields && r.fields[key];
        if (!f || f.value == null) return;
        // Hesaplanmış değerler gerçek OCR okumasından daha az güvenilir
        const weight = f.computed ? 0.4 : (f.corrected ? 0.9 : 1);
        const numeric = key === 'liters' || key === 'price' || key === 'total';
        const k = numeric ? Number(f.value).toFixed(key === 'total' ? 2 : 3) : String(f.value);
        const prev = map.get(k);
        if (prev) { prev.votes += weight; if (weight > prev.weight) { prev.field = f; prev.weight = weight; prev.pass = ri; } }
        else map.set(k, { value: numeric ? Number(f.value) : f.value, field: f, votes: weight, weight, pass: ri });
      });
      return [...map.values()].sort((a, b) => b.votes - a.votes);
    }

    const L = gather('liters'), P = gather('price');
    let T = gather('total');
    // Oy eşitliğinde etiketli (TOPLAM/TUTAR) toplamı, kırpma ile okunmuş toplamdan yeğle
    T = T.slice().sort((a, b) => b.votes - a.votes || ((a.field.crop ? 1 : 0) - (b.field.crop ? 1 : 0)));
    let D = gather('date');
    D = D.slice().sort((a, b) => b.votes - a.votes || ((a.field.repaired ? 1 : 0) - (b.field.repaired ? 1 : 0)) || ((a.field.dirty || 0) - (b.field.dirty || 0)) || ((a.field.datePriority || 1) - (b.field.datePriority || 1)));
    const F = gather('fuelType'), TT = gather('time');

    // En tutarlı (L, P, T) üçlüsünü bul: çarpım toplamı doğrulamalı ve oy yüksek olmalı
    let best = null;
    const tol = 0.03;
    for (const l of L.slice(0, 4)) {
      for (const p of P.slice(0, 4)) {
        for (const t of T.slice(0, 4)) {
          const expected = l.value * p.value;
          const rel = Math.abs(expected - t.value) / Math.max(t.value, 1);
          if (rel > tol) continue;
          // Düşük hata + yüksek oy = iyi; tam eşleşme bonus alır
          const score = (l.votes + p.votes + t.votes) * (1 - rel * 8);
          if (!best || score > best.score) best = { l, p, t, score, rel };
        }
      }
    }

    const fields = {};
    let consistent = false;
    if (best) {
      consistent = true;
      fields.liters = Object.assign({}, best.l.field, { verified: true });
      fields.price = Object.assign({}, best.p.field, { verified: true });
      fields.total = Object.assign({}, best.t.field, { verified: true });
    } else {
      // Tutarlı üçlü yoksa her alanda en çok oy alanı kullan
      if (L[0]) fields.liters = L[0].field;
      if (P[0]) fields.price = P[0].field;
      if (T[0]) fields.total = T[0].field;
      // Eksik alanı mevcutlardan hesapla
      if (!fields.price && fields.liters && fields.total) {
        fields.price = { value: +(fields.total.value / fields.liters.value).toFixed(2),
          source: 'Toplam ÷ litre ile hesaplandı', computed: true };
      }
      if (!fields.total && fields.liters && fields.price) {
        fields.total = { value: +(fields.liters.value * fields.price.value).toFixed(2),
          source: 'Litre × birim fiyat ile hesaplandı', computed: true };
      }
      if (!fields.liters && fields.price && fields.total && !fields.total.computed) {
        fields.liters = { value: +(fields.total.value / fields.price.value).toFixed(2),
          source: 'Toplam ÷ birim fiyat ile hesaplandı', computed: true };
      }
    }
    if (D[0]) {
      fields.date = Object.assign({}, D[0].field);
      if (D.length > 1 && D[0].votes > D[1].votes) fields.date.verified = true;
    }
    if (F[0]) {
      fields.fuelType = Object.assign({}, F[0].field);
      if (F[0].votes >= valid.length || (F.length > 1 && F[0].votes > F[1].votes)) fields.fuelType.verified = true;
    }
    if (TT[0]) {
      fields.time = Object.assign({}, TT[0].field);
      if (TT[0].votes >= valid.length || (TT.length > 1 && TT[0].votes > TT[1].votes)) fields.time.verified = true;
    }

    const foundCount = ['liters', 'price', 'total', 'date', 'fuelType', 'time'].filter(k => fields[k]).length;
    const correctedCount = ['liters', 'price', 'total'].filter(k => fields[k] && fields[k].corrected).length;
    // v11.0 — ALTERNATİF OKUMALAR
    // Düşük çözünürlüklü fişlerde motor aynı alan için birkaç farklı değer
    // okuyor. Sessizce birini seçmek yerine diğerlerini de kullanıcıya
    // gösteriyoruz: tek dokunuşla doğru okumaya geçilebilir.
    const alternatives = {};
    [['liters', L], ['price', P], ['total', T], ['date', D], ['time', TT]].forEach(([k, arr]) => {
      const chosen = fields[k] ? fields[k].value : null;
      const seen = new Set([String(chosen)]);
      const list = [];
      (arr || []).forEach(c => {
        const key = String(c.value);
        if (seen.has(key) || c.value == null) return;
        seen.add(key);
        list.push({ value: c.value, votes: Math.round(c.votes * 100) / 100, pass: c.pass + 1 });
      });
      // Aynı alan için geçişlerde görülen HAM adaylar (seçilmemiş olanlar).
      // Kaç geçişte görüldüğüne göre sıralanır; böylece tek bir geçişte
      // okunan doğru değer de kullanıcıya sunulur.
      if (k === 'liters' || k === 'price' || k === 'total') {
        const freq = new Map();
        valid.forEach((r, ri) => {
          const arr = (r.candidates && r.candidates[k]) || [];
          const uniq = new Set(arr.map(Number).filter(n => isFinite(n)));
          uniq.forEach(n => {
            const key = n.toFixed(k === 'total' ? 2 : 3);
            if (seen.has(String(n)) || seen.has(key)) return;
            const prev = freq.get(key);
            if (prev) { prev.n++; if (ri + 1 < prev.pass) prev.pass = ri + 1; }
            else freq.set(key, { value: n, n: 1, pass: ri + 1 });
          });
        });
        [...freq.values()].sort((a, b) => b.n - a.n || a.pass - b.pass).forEach(c => {
          if (seen.has(String(c.value))) return;
          seen.add(String(c.value));
          list.push({ value: c.value, votes: c.n, pass: c.pass });
        });
      }
      if (list.length) alternatives[k] = list.slice(0, 3);
    });

    // Ham metinleri birleştir: kullanıcı hangi geçişte ne okunduğunu görebilsin
    const raw = valid.map((r, i) => `--- ${i + 1}. okuma ---\n${r.raw || ''}`).join('\n\n');
    const confidence = Math.round(valid.reduce((a, r) => a + (r.confidence || 0), 0) / valid.length);
    return {
      fields, foundCount, correctedCount, consistent, raw, alternatives,
      lines: valid[0].lines || [], confidence, passes: valid.length
    };
  }

  function parseReceipt(text) {
    const raw = String(text || '');
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 1) Önce "84,15 LT X 51,22" satırını ara — Türk fişlerinde en güvenilir kaynak.
    const qtyPrice = extractQtyPrice(lines);

    const liters = collectCandidates(lines, LITER_PATTERNS, { min: 0.5, max: 1500 })
      .filter(c => !META_LINE.test(trUpper(c.text)));
    const prices = collectCandidates(lines, PRICE_PATTERNS, { min: 1, max: 500 })
      .filter(c => !META_LINE.test(trUpper(c.text)));
    // KDV / yasal metin satırlarını toplam adaylarından çıkar
    const totalLines = lines.filter(l => { const U = trUpper(l); return !KDV_LINE.test(U) && !TOTAL_SKIP_LINE.test(U); });
    let totals = collectCandidates(totalLines, TOTAL_PATTERNS, { min: 5, max: 500000 });
    // POS slipi: "TUTAR" etiketi tek satır, tutar bir sonraki satırda ("1.830,59 TL")
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^[\W_]*TUTAR[\W_]*$/i.test(trUpper(lines[i]))) {
        const nxt = trUpper(lines[i + 1]);
        const mm = nxt.match(/([0-9][0-9.,\s]{2,14})\s*(?:TL|₺|TRY)?/);
        if (mm && /[0-9]/.test(mm[1])) {
          parseTrNumberCandidates(fixDigits(mm[1])).forEach(v => {
            if (v >= 5 && v <= 500000) totals.push({ value: v, line: i + 1, priority: 0, raw: mm[1].trim(), text: lines[i + 1].trim() });
          });
        }
      }
    }

    // Miktar×fiyat satırından gelenler en yüksek öncelikli (priority -1)
    if (qtyPrice.liters) liters.unshift(qtyPrice.liters);
    if (qtyPrice.price) prices.unshift(qtyPrice.price);
    if (qtyPrice.total) totals.push(qtyPrice.total);
    // Ürün satırındaki tutar (MOTORİN %20 *410,00) toplam için güçlü adaydır
    const productTotal = extractProductTotal(lines);
    if (productTotal) totals.push(Object.assign({}, productTotal, { priority: 1 }));
    totals = voteTotals(totals);

    const date = extractDate(raw);
    const fuelType = extractFuelType(lines);
    const time = extractTime(raw);

    const combo = chooseConsistent(liters, prices, totals);
    const pick = (arr) => arr.length ? arr[0] : null;

    const L = combo ? combo.l : pick(liters);
    const P = combo ? combo.p : pick(prices);
    const T = combo ? combo.t : pick(totals);

    const fields = {
      liters: L ? { value: +L.value.toFixed(2), source: L.text, verified: !!combo } : null,
      price: P ? { value: +P.value.toFixed(2), source: P.text, verified: !!combo } : null,
      total: T ? { value: +T.value.toFixed(2), source: T.text, verified: !!combo } : null,
      date: date ? { value: date.key, source: date.repaired ? `OCR "${date.raw}" okudu; yıl onarıldı` : date.raw, verified: date.priority === 0 && !date.repaired, repaired: !!date.repaired, dirty: date.dirty || 0, datePriority: date.priority } : null,
      fuelType: fuelType ? { value: fuelType.value, source: fuelType.source, verified: fuelType.verified } : null,
      time: time ? { value: time.value, source: time.source, verified: time.verified, raw: time.raw } : null
    };

    // Toplam yoksa litre×fiyattan hesapla (kullanıcıya "hesaplandı" olarak işaretlenir)
    if (!fields.total && fields.liters && fields.price) {
      fields.total = {
        value: +(fields.liters.value * fields.price.value).toFixed(2),
        source: 'Litre × birim fiyat ile hesaplandı',
        verified: false, computed: true
      };
    }
    // Birim fiyat yoksa toplam/litreden hesapla
    if (!fields.price && fields.liters && fields.total && !fields.total.computed) {
      fields.price = {
        value: +(fields.total.value / fields.liters.value).toFixed(2),
        source: 'Toplam ÷ litre ile hesaplandı',
        verified: false, computed: true
      };
    }
    // Litre okunamadıysa toplam ÷ birim fiyat ile hesapla
    if (!fields.liters && fields.price && fields.total && !fields.total.computed) {
      fields.liters = {
        value: +(fields.total.value / fields.price.value).toFixed(2),
        source: 'Toplam ÷ birim fiyat ile hesaplandı',
        verified: false, computed: true
      };
    }

    // İnce ayar: OCR tek haneyi yanlış okuduysa (81,60 → 81,69) çapraz hesapla düzelt.
    // Toplam ve litre genellikle daha uzun/doğrulanabilir alanlardır.
    if (fields.liters && fields.price && fields.total && !fields.total.computed) {
      const L = fields.liters.value, P = fields.price.value, T = fields.total.value;
      const pick = pickReconcile(L, P, T);
      if (pick && pick.field === 'L') {
        fields.liters = { value: pick.value, source: `OCR "${String(L).replace('.', ',')}" okudu; toplam ÷ birim fiyat ile düzeltildi`, verified: true, corrected: true, ocrValue: L };
      } else if (pick && pick.field === 'P') {
        fields.price = { value: pick.value, source: `OCR "${String(P).replace('.', ',')}" okudu; toplam ÷ litre ile düzeltildi`, verified: true, corrected: true, ocrValue: P };
      }
    }

    const foundCount = ['liters', 'price', 'total', 'date', 'fuelType', 'time'].filter(k => fields[k]).length;
    const correctedCount = ['liters', 'price', 'total'].filter(k => fields[k] && fields[k].corrected).length;
    // v11.0: seçilmeyen adaylar da dışarı verilir; birleştirme sonrası
    // "Diğer okumalar" olarak kullanıcıya gösterilir.
    const candidates = {
      liters: liters.map(c => c.value),
      price: prices.map(c => c.value),
      total: totals.map(c => c.value)
    };
    return { fields, foundCount, correctedCount, consistent: !!combo, raw, lines, candidates };
  }

  // ------------------------------------------------------------------
  // Görüntü ön işleme (kontrast + gri tonlama + ölçek)
  // ------------------------------------------------------------------
  /* ÖN İŞLEME — deneysel olarak doğrulandı (3 gerçek fiş, 12 alan):
   *   eski (2,5× sınırlı büyütme)          : 2/12
   *   kısa kenar 1500 px, gri tonlama      : 11/12
   *   + 2. varyant (2000 px + %2–98 germe) : 12/12 (oylama ile)
   *
   * En büyük kazanç BÜYÜTME. Tesseract büyük harf yüksekliği olarak ~20–30 px
   * ister; 225 px genişliğindeki bir fişte yazı 6–8 px kalır ve okunamaz.
   * Eski 2,5× sınırı bunu engelliyordu; artık kaldırıldı.
   *
   * variant 'plain'   : yalnız gri tonlama + büyütme (termal fişte en iyi)
   * variant 'stretch' : + %2–98 persentil kontrast germe (soluk fişte en iyi)
   */
  // Ayrılabilir kutu bulanıklaştırma (integral görüntü) — O(n)
  function boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    const win = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / win;
        const xa = Math.min(w - 1, x + r + 1), xs = Math.max(0, x - r);
        acc += src[row + xa] - src[row + xs];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / win;
        const ya = Math.min(h - 1, y + r + 1), ys = Math.max(0, y - r);
        acc += tmp[ya * w + x] - tmp[ys * w + x];
      }
    }
    return out;
  }
  function otsuThreshold(gray) {
    const hist = new Uint32Array(256);
    for (let j = 0; j < gray.length; j++) hist[gray[j]]++;
    const total = gray.length;
    let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
    let sumB = 0, wB = 0, maxVar = 0, thr = 127;
    for (let v = 0; v < 256; v++) {
      wB += hist[v]; if (!wB) continue;
      const wF = total - wB; if (!wF) break;
      sumB += v * hist[v];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > maxVar) { maxVar = between; thr = v; }
    }
    return thr;
  }

  // CLAHE: kontrast sınırlı uyarlamalı histogram eşitleme (soluk/karanlık fiş)
  function clahe(gray, w, h, tiles, clip) {
    tiles = tiles || 8; clip = clip || 2.5;
    const tw = Math.ceil(w / tiles), th = Math.ceil(h / tiles);
    const maps = [];
    for (let ty = 0; ty < tiles; ty++) for (let tx = 0; tx < tiles; tx++) {
      const x0 = tx * tw, y0 = ty * th, x1 = Math.min(w, x0 + tw), y1 = Math.min(h, y0 + th);
      const hist = new Uint32Array(256); let cnt = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { hist[gray[y * w + x]]++; cnt++; }
      const limit = Math.max(1, Math.round(clip * cnt / 256));
      let excess = 0; for (let i = 0; i < 256; i++) if (hist[i] > limit) { excess += hist[i] - limit; hist[i] = limit; }
      const add = Math.floor(excess / 256); let rem = excess - add * 256;
      for (let i = 0; i < 256; i++) { hist[i] += add; if (rem > 0) { hist[i]++; rem--; } }
      const map = new Uint8ClampedArray(256); let acc = 0; const scale = 255 / Math.max(1, cnt);
      for (let i = 0; i < 256; i++) { acc += hist[i]; map[i] = Math.round(acc * scale); }
      maps.push(map);
    }
    const out = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
      const fy = y / th - 0.5; let ty0 = Math.max(0, Math.min(tiles - 1, Math.floor(fy))); const fy1 = fy - Math.floor(fy); const ty1 = Math.min(tiles - 1, ty0 + 1);
      for (let x = 0; x < w; x++) {
        const fx = x / tw - 0.5; let tx0 = Math.max(0, Math.min(tiles - 1, Math.floor(fx))); const fx1 = fx - Math.floor(fx); const tx1 = Math.min(tiles - 1, tx0 + 1);
        const v = gray[y * w + x];
        const a = maps[ty0 * tiles + tx0][v] + (maps[ty0 * tiles + tx1][v] - maps[ty0 * tiles + tx0][v]) * fx1;
        const bb = maps[ty1 * tiles + tx0][v] + (maps[ty1 * tiles + tx1][v] - maps[ty1 * tiles + tx0][v]) * fx1;
        out[y * w + x] = a + (bb - a) * fy1;
      }
    }
    return out;
  }
  // Deskew: uyarlamalı ikili görüntü üzerinde izdüşüm profili ile eğiklik açısı tahmini
  function estimateSkew(gray, w, h) {
    const dw = 480, dh = Math.max(1, Math.round(h * dw / w));
    const small = new Uint8ClampedArray(dw * dh);
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) small[y * dw + x] = gray[Math.round(y * h / dh) * w + Math.round(x * w / dw)];
    // yerel ortalama ile metni izole et (karanlık arka planı değil)
    const r = 12; const integ = new Float64Array((dw + 1) * (dh + 1));
    for (let y = 0; y < dh; y++) { let row = 0; for (let x = 0; x < dw; x++) { row += small[y * dw + x]; integ[(y + 1) * (dw + 1) + (x + 1)] = integ[y * (dw + 1) + (x + 1)] + row; } }
    const bin = new Uint8Array(dw * dh);
    for (let j = 0; j < small.length; j++) { const x = j % dw, y = (j / dw) | 0; const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(dw - 1, x + r), y1 = Math.min(dh - 1, y + r); const area = (x1 - x0 + 1) * (y1 - y0 + 1); const s = integ[(y1 + 1) * (dw + 1) + (x1 + 1)] - integ[y0 * (dw + 1) + (x1 + 1)] - integ[(y1 + 1) * (dw + 1) + x0] + integ[y0 * (dw + 1) + x0]; bin[j] = small[j] < s / area - 6 ? 1 : 0; }
    const score = (ang) => { const t = Math.tan(ang * Math.PI / 180), cx = dw / 2; const proj = new Float64Array(dh + 40); for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) if (bin[y * dw + x]) { const yy = Math.round(y + t * (x - cx)) + 20; if (yy >= 0 && yy < proj.length) proj[yy]++; } let s = 0; for (let i = 0; i < proj.length; i++) s += proj[i] * proj[i]; return s; };
    let best = 0, bs = -1;
    for (let a = -12; a <= 12; a += 1) { const sc = score(a); if (sc > bs) { bs = sc; best = a; } }
    for (let a = best - 1; a <= best + 1; a += 0.25) { const sc = score(a); if (sc > bs) { bs = sc; best = a; } }
    return best;
  }

  async function preprocessImage(file, opts) {
    const o = opts || {};
    const variant = o.variant || 'plain';
    const targetShort = o.targetShort || (variant === 'stretch' ? 2000 : 1500);
    const maxDim = o.maxDim || 4000;

    const bitmap = await loadBitmap(file);
    let { width, height } = bitmap;
    let sx = 0, sy = 0, sw = width, sh = height;
    // 'receipt' / crop: karanlık arka plandaki parlak fiş bölgesini kırp (metni büyütür)
    if (o.crop || variant === 'receipt') {
      try {
        const dw = Math.min(360, width), dh = Math.round(height * (dw / width));
        const tc = document.createElement('canvas'); tc.width = dw; tc.height = dh;
        const tx = tc.getContext('2d', { willReadFrequently: true });
        tx.drawImage(bitmap, 0, 0, dw, dh);
        const px = tx.getImageData(0, 0, dw, dh).data;
        let sum = 0; const gn = dw * dh;
        for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
        const mean = sum / gn, th = Math.max(90, mean * 1.15);
        let minx = dw, miny = dh, maxx = 0, maxy = 0, cnt = 0;
        for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
          const i = (y * dw + x) * 4, g = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
          if (g > th) { cnt++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
        }
        if (cnt > gn * 0.03 && maxx - minx > dw * 0.2 && maxy - miny > dh * 0.2) {
          const kx = width / dw, ky = height / dh;
          const mx = (maxx - minx) * 0.04, my = (maxy - miny) * 0.04;
          sx = Math.max(0, Math.round((minx - mx) * kx)); sy = Math.max(0, Math.round((miny - my) * ky));
          sw = Math.min(width - sx, Math.round((maxx - minx + 2 * mx) * kx));
          sh = Math.min(height - sy, Math.round((maxy - miny + 2 * my) * ky));
        }
      } catch (e) { /* kırpma başarısız: tam kare */ }
    }
    const shortSide = Math.min(sw, sh);
    const longSide = Math.max(sw, sh);

    // Kısa kenarı hedefe çıkar; çok büyükse bellek için küçült.
    let scale = 1;
    if (shortSide < targetShort) scale = targetShort / shortSide;
    if (longSide * scale > maxDim) scale = maxDim / longSide;
    // Aşırı büyütme (8×) yeni bilgi üretmez, sadece yavaşlatır.
    scale = Math.min(scale, 8);

    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return file;
    // Kübik benzeri yumuşatma: metin kenarlarını korur
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
    // Deskew: belirgin eğiklik varsa görüntüyü döndür
    if (o.deskew) {
      try {
        const g0 = ctx.getImageData(0, 0, w, h).data;
        const gg = new Uint8ClampedArray(w * h);
        for (let i = 0, j = 0; i < g0.length; i += 4, j++) gg[j] = (g0[i] * 0.299 + g0[i + 1] * 0.587 + g0[i + 2] * 0.114) | 0;
        const ang = estimateSkew(gg, w, h);
        if (Math.abs(ang) >= 1.5) {
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
          ctx.translate(w / 2, h / 2); ctx.rotate(-ang * Math.PI / 180);
          ctx.drawImage(bitmap, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      } catch (e) { /* deskew başarısız: döndürme */ }
    }
    if (bitmap.close) bitmap.close();

    try {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const n = w * h;
      const hist = new Uint32Array(256);
      for (let i = 0; i < d.length; i += 4) {
        const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
        d[i] = d[i + 1] = d[i + 2] = g;
        hist[g]++;
      }
      // Gri tonlama dizisi (tek kanal) — tüm varyantlar bunu kullanır
      const gray = new Uint8ClampedArray(n);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) gray[j] = d[i];

      const stretch = (lo, hi) => {
        const range = Math.max(1, hi - lo);
        for (let j = 0; j < n; j++) {
          let g = ((gray[j] - lo) * 255) / range;
          gray[j] = g < 0 ? 0 : g > 255 ? 255 : g;
        }
      };
      const percentileStretch = (cutPct) => {
        const cut = n * cutPct;
        let acc = 0, lo = 0, hi = 255;
        for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= cut) { lo = v; break; } }
        acc = 0;
        for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= cut) { hi = v; break; } }
        if (hi - lo < 240) stretch(lo, hi);
      };

      if (variant === 'clahe') {
        const eq = clahe(gray, w, h, o.tiles || 8, o.clip || 2.5);
        for (let j = 0; j < n; j++) gray[j] = eq[j];
      } else if (variant === 'stretch') {
        percentileStretch(0.02);
      } else if (variant === 'otsu' || variant === 'adaptive' || variant === 'sharpen' || variant === 'receipt') {
        if (variant !== 'receipt') percentileStretch(0.01);
        if (variant === 'sharpen') {
          // Unsharp mask: kenarları belirginleştir (bulanık telefon fotoğrafı)
          const blur = boxBlur(gray, w, h, Math.max(1, Math.round(Math.min(w, h) / 300)));
          for (let j = 0; j < n; j++) {
            const g = gray[j] + (gray[j] - blur[j]) * 1.2;
            gray[j] = g < 0 ? 0 : g > 255 ? 255 : g;
          }
        }
        if (variant === 'otsu') {
          const t = otsuThreshold(gray);
          for (let j = 0; j < n; j++) gray[j] = gray[j] > t ? 255 : 0;
        } else if (variant === 'adaptive' || variant === 'receipt') {
          // Yerel ortalama eşiği: uneven lighting / gölge / karanlık fişte en iyisi
          const r = Math.max(8, Math.round(Math.min(w, h) / 40));
          const mean = boxBlur(gray, w, h, r);
          const C = Number.isFinite(o.C) ? o.C : 12;
          for (let j = 0; j < n; j++) gray[j] = gray[j] < mean[j] - C ? 0 : 255;
        }
      }
      for (let i = 0, j = 0; i < d.length; i += 4, j++) d[i] = d[i + 1] = d[i + 2] = gray[j];
      ctx.putImageData(img, 0, 0);
    } catch (e) { /* güvenlik kısıtı: orijinali kullan */ }

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    return blob || file;
  }


  async function loadBitmap(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file); } catch (e) { /* fallback */ }
    }
    const url = URL.createObjectURL(file);
    try {
      return await new Promise((res, rej) => {
        const img = new Image();
        const t = setTimeout(() => rej(new Error('Görsel yüklenemedi')), 15000);
        img.onload = () => { clearTimeout(t); res(img); };
        img.onerror = () => { clearTimeout(t); rej(new Error('Görsel açılamadı')); };
        img.src = url;
      });
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  // ------------------------------------------------------------------
  // Tesseract motoru
  // ------------------------------------------------------------------
  const OCR_ASSETS = {
    lib: './tesseract.min.js',
    worker: './tesseract-worker.min.js',
    core: './tesseract-core-simd-lstm.wasm.js',
    lang: './'
  };

  const state = { worker: null, loading: null, ready: false, lastResult: null, busy: false };

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (typeof window.Tesseract !== 'undefined') return resolve();
      const existing = document.querySelector(`script[data-ocr-src="${src}"]`);
      if (existing && existing.dataset.ocrLoaded === '1') return resolve();
      const s = existing || document.createElement('script');
      let done = false;
      const finish = (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (err) reject(err); else { s.dataset.ocrLoaded = '1'; resolve(); }
      };
      // Ağ kesilirse sonsuza kadar beklemeyi önle
      const timer = setTimeout(() => finish(new Error('OCR kütüphanesi zaman aşımına uğradı. Dosyaların sunucuda olduğunu kontrol edin.')), 30000);
      s.addEventListener('load', () => finish());
      s.addEventListener('error', () => finish(new Error('OCR kütüphanesi yüklenemedi: ' + src)));
      if (!existing) {
        s.src = src; s.async = true; s.dataset.ocrSrc = src;
        document.head.appendChild(s);
      }
    });
  }

  async function hasSimd() {
    try {
      return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
    } catch (e) { return false; }
  }

  function progressCb(m) {
    const status = String(m && m.status || '');
    const p = Math.round((Number(m && m.progress) || 0) * 100);
    const map = {
      'loading tesseract core': 'OCR motoru yükleniyor',
      'initializing tesseract': 'Motor başlatılıyor',
      'loading language traineddata': 'Türkçe dil modeli yükleniyor',
      'initializing api': 'Hazırlanıyor',
      'recognizing text': 'Fiş okunuyor'
    };
    const label = map[status] || (status ? status : 'İşleniyor');
    setProgress(label, p);
  }

  async function ensureWorker() {
    if (state.ready && state.worker) return state.worker;
    if (state.loading) return state.loading;
    state.loading = (async () => {
      if (!(await hasSimd())) {
        throw new Error('Bu cihazın tarayıcısı OCR için gereken WebAssembly SIMD desteğini sunmuyor. Lütfen güncel Chrome/Safari kullanın veya bilgileri elle girin.');
      }
      setProgress('OCR motoru hazırlanıyor', 2);
      await loadScriptOnce(OCR_ASSETS.lib);
      if (typeof Tesseract === 'undefined') throw new Error('Tesseract yüklenemedi.');
      const worker = await Tesseract.createWorker('tur', 1, {
        workerPath: OCR_ASSETS.worker,
        corePath: OCR_ASSETS.core,
        langPath: OCR_ASSETS.lang,
        gzip: true,
        workerBlobURL: false,
        cacheMethod: 'write',
        logger: progressCb
      });
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1'
      });
      state.worker = worker;
      state.ready = true;
      return worker;
    })();
    try { return await state.loading; }
    finally { state.loading = null; }
  }

  /* ÇOKLU GEÇİŞ
   * 1. geçiş: kısa kenar 1500 px, gri tonlama. Çoğu fişte 4/4 verir ve biter.
   * 2. geçiş: yalnız gerekirse — 2000 px + persentil germe. Farklı hatalar yapar.
   * Sonuçlar alan alan oylanır (mergeResults). Ölçüm: 2/12 → 12/12.
   */
  async function recognizeFile(file, opts) {
    const o = opts || {};
    if (state.busy) throw new Error('Devam eden bir tarama var.');
    state.busy = true;
    try {
      const worker = await ensureWorker();
      const pre = (window.YakitOCR && window.YakitOCR.preprocessImage) || preprocessImage;
      const passes = [];

      // --- 1. geçiş ---
      setProgress('Görüntü iyileştiriliyor', 5);
      const pre1 = await pre(file, { variant: 'plain', targetShort: 1500 });
      setProgress('Fiş okunuyor', 12);
      const r1 = await worker.recognize(pre1, {}, { text: true, tsv: true });
      const p1 = parseReceipt(r1 && r1.data && r1.data.text || '');
      p1.confidence = r1 && r1.data && Number.isFinite(r1.data.confidence) ? Math.round(r1.data.confidence) : null;
      p1._tsvRows = parseTsvRows(r1 && r1.data && r1.data.tsv);
      await verifyTimeWithCrop(worker, pre1, p1);
      await verifyNumericCrops(worker, pre1, p1);
      passes.push(p1);

      // Yeterli mi? 6 alan bulundu ve tutarlar birbirini doğruluyorsa bitir.
      const numericOk = p1.consistent && ['liters', 'price', 'total', 'date'].every(k => p1.fields[k]);
      // POS / kart slipi: yakıt-litre-fiyat yoktur; tutar+tarih+saat yeterlidir.
      const U1 = trUpper(p1.raw || '');
      const posSlip = /TUTAR|PARAF|VISA|MASTER|POS\s*NO|TERM[Iİ]NAL|SATI[SŞ]/.test(U1) &&
        !/[0-9][.,][0-9]{1,3}\s*[A-Z]{0,3}\s*[X×*]/.test(U1) && !FUEL_WORDS.test(U1);
      const posOk = posSlip && p1.fields.total && p1.fields.date && p1.fields.time;
      const goodEnough = (numericOk && p1.fields.fuelType && p1.fields.time) || posOk;
      const forceSecond = o.passes === 2;
      if (!goodEnough || forceSecond) {
        setProgress('İkinci okuma (doğrulama)', 55);
        try {
          const pre2 = await pre(file, { variant: 'stretch', targetShort: 2000 });
          setProgress('Fiş yeniden okunuyor', 62);
          const r2 = await worker.recognize(pre2, {}, { text: true, tsv: true });
          const p2 = parseReceipt(r2 && r2.data && r2.data.text || '');
          p2.confidence = r2 && r2.data && Number.isFinite(r2.data.confidence) ? Math.round(r2.data.confidence) : null;
          p2._tsvRows = parseTsvRows(r2 && r2.data && r2.data.tsv);
          await verifyTimeWithCrop(worker, pre2, p2);
          await verifyNumericCrops(worker, pre2, p2);
          passes.push(p2);
        } catch (e) {
          console.warn('İkinci geçiş başarısız, ilk sonuç kullanılıyor:', e);
        }
      }

      // --- 3. geçiş: karanlık / gölgeli / eğri fişler için yerel eşikleme ---
      let mergedSoFar = passes.length > 1 ? mergeResults(passes) : p1;
      const weak = !mergedSoFar.consistent || mergedSoFar.foundCount < 5 ||
        ['liters', 'price', 'total', 'date'].some(k => !mergedSoFar.fields[k]);
      if ((weak || o.passes === 3) && passes.length < 3) {
        setProgress('Zor görüntü için üçüncü okuma', 78);
        try {
          const pre3 = await pre(file, { variant: 'adaptive', targetShort: 2500 });
          const r3 = await worker.recognize(pre3, {}, { text: true, tsv: true });
          const p3 = parseReceipt(r3 && r3.data && r3.data.text || '');
          p3.confidence = r3 && r3.data && Number.isFinite(r3.data.confidence) ? Math.round(r3.data.confidence) : null;
          p3._tsvRows = parseTsvRows(r3 && r3.data && r3.data.tsv);
          await verifyTimeWithCrop(worker, pre3, p3);
          await verifyNumericCrops(worker, pre3, p3);
          passes.push(p3);
        } catch (e) { console.warn('Üçüncü geçiş başarısız:', e); }
      }

      // --- 4. geçiş: hâlâ litre/fiyat eksikse parlak fiş bölgesini kırpıp oku ---
      let m2 = passes.length > 1 ? mergeResults(passes) : p1;
      const stillWeak = !m2.fields.liters || !m2.fields.price || !m2.consistent;
      if ((stillWeak || o.passes === 4) && passes.length < 4) {
        setProgress('Fiş bölgesi kırpılarak okunuyor', 86);
        try {
          const pre4 = await pre(file, { variant: 'receipt', targetShort: 3000, C: 8, crop: true });
          const r4 = await worker.recognize(pre4, {}, { text: true, tsv: true });
          const p4 = parseReceipt(r4 && r4.data && r4.data.text || '');
          p4.confidence = r4 && r4.data && Number.isFinite(r4.data.confidence) ? Math.round(r4.data.confidence) : null;
          p4._tsvRows = parseTsvRows(r4 && r4.data && r4.data.tsv);
          await verifyTimeWithCrop(worker, pre4, p4);
          await verifyNumericCrops(worker, pre4, p4);
          passes.push(p4);
        } catch (e) { console.warn('Dördüncü geçiş başarısız:', e); }
      }

      // --- 5. geçiş: hâlâ zayıfsa CLAHE + deskew (agresif ön işleme) ---
      let m3 = passes.length > 1 ? mergeResults(passes) : p1;
      // 4 geçişte hiçbir alan bulunamadıysa (fiş olmayan fotoğraf) 5. geçiş zaman kaybıdır.
      const weak5 = m3.foundCount > 0 && (!m3.fields.liters || !m3.fields.price || !m3.consistent);
      if ((weak5 || o.passes === 5) && passes.length < 5) {
        setProgress('Kontrast ve eğiklik düzeltilerek okunuyor', 90);
        try {
          const pre5 = await pre(file, { variant: 'clahe', targetShort: 3000, deskew: true });
          const r5 = await worker.recognize(pre5, {}, { text: true, tsv: true });
          const p5 = parseReceipt(r5 && r5.data && r5.data.text || '');
          p5.confidence = r5 && r5.data && Number.isFinite(r5.data.confidence) ? Math.round(r5.data.confidence) : null;
          p5._tsvRows = parseTsvRows(r5 && r5.data && r5.data.tsv);
          await verifyTimeWithCrop(worker, pre5, p5);
          await verifyNumericCrops(worker, pre5, p5);
          passes.push(p5);
        } catch (e) { console.warn('Beşinci geçiş başarısız:', e); }
      }

      setProgress('Sonuçlar birleştiriliyor', 92);
      const merged = passes.length > 1 ? mergeResults(passes) : p1;
      reconcileNumeric(merged.fields);
      merged.correctedCount = ['liters', 'price', 'total'].filter(k => merged.fields[k] && merged.fields[k].corrected).length;
      merged.passes = passes.length;
      state.lastResult = merged;
      return merged;
    } finally { state.busy = false; }
  }

  async function terminate() {
    if (state.worker) { try { await state.worker.terminate(); } catch (e) {} }
    state.worker = null; state.ready = false;
  }

  // ------------------------------------------------------------------
  // Arayüz
  // ------------------------------------------------------------------
  const $ = id => document.getElementById(id);

  function setProgress(label, pct) {
    const box = $('ocr-progress');
    const bar = $('ocr-progress-bar');
    const txt = $('ocr-progress-text');
    if (box) box.classList.remove('hidden');
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (txt) txt.textContent = `${label} · %${Math.max(0, Math.min(100, pct))}`;
  }
  function hideProgress() {
    const box = $('ocr-progress');
    if (box) box.classList.add('hidden');
  }
  function setStatus(msg, kind) {
    const el = $('ocr-status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'text-[11px] leading-relaxed ' + (kind === 'error' ? 'text-rose-600' : kind === 'ok' ? 'text-emerald-700' : 'text-slate-500');
  }

  function showPicker() {
    $('ocr-step-pick')?.classList.remove('hidden');
    $('ocr-step-result')?.classList.add('hidden');
    hideProgress();
  }
  function showResult() {
    $('ocr-step-pick')?.classList.add('hidden');
    $('ocr-step-result')?.classList.remove('hidden');
    hideProgress();
  }

  function fuelBadge(f) {
    return !f ? '<span class="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">bulunamadı</span>'
      : f.verified ? '<span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">doğrulandı</span>'
      : '<span class="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">kontrol edin</span>';
  }
  function fuelFieldRow() {
    const f = state.lastResult && state.lastResult.fields.fuelType;
    const opts = ['', ...REFUEL_FUEL_TYPES].map(v =>
      `<option value="${escapeAttr(v)}" ${f && f.value === v ? 'selected' : ''}>${escapeHtml(v || 'Seçilmedi / elle seçin')}</option>`).join('');
    return `
      <div class="bg-white rounded-xl border border-slate-200 p-2.5 space-y-1">
        <div class="flex items-center justify-between">
          <label class="text-[11px] font-semibold text-slate-600" for="ocr-f-fuelType">Yakıt türü</label>
          ${fuelBadge(f)}
        </div>
        <select id="ocr-f-fuelType" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800">${opts}</select>
        ${f && f.source ? `<div class="text-[9px] text-slate-400 truncate" title="${escapeAttr(f.source)}">${escapeHtml(f.source)}</div>` : ''}
      </div>`;
  }
  function fieldRow(key, label, unit, step) {
    if (key === 'fuelType') return fuelFieldRow();
    const f = state.lastResult && state.lastResult.fields[key];
    const val = f ? (key === 'date' ? f.value : String(f.value).replace('.', ',')) : '';
    const badge = !f ? '<span class="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">bulunamadı</span>'
      : f.corrected ? '<span class="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">düzeltildi</span>'
      : f.repaired ? '<span class="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">onarıldı</span>'
      : f.computed ? '<span class="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">hesaplandı</span>'
      : f.verified ? '<span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">doğrulandı</span>'
      : '<span class="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">kontrol edin</span>';
    const type = key === 'date' ? 'date' : key === 'time' ? 'time' : 'text';
    const inputMode = (key === 'date' || key === 'time') ? '' : 'inputmode="decimal"';
    return `
      <div class="bg-white rounded-xl border border-slate-200 p-2.5 space-y-1">
        <div class="flex items-center justify-between">
          <label class="text-[11px] font-semibold text-slate-600" for="ocr-f-${key}">${label}</label>
          ${badge}
        </div>
        <div class="flex items-center gap-2">
          <input id="ocr-f-${key}" type="${type}" ${inputMode} value="${escapeAttr(val)}" step="${step || '0.01'}"
            class="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800">
          ${unit ? `<span class="text-[11px] font-semibold text-slate-400 shrink-0">${unit}</span>` : ''}
        </div>
        ${f && f.source ? `<div class="text-[9px] text-slate-400 truncate" title="${escapeAttr(f.source)}">${escapeHtml(f.source)}</div>` : ''}
        ${altChips(key)}
      </div>`;
  }

  /* v11.0 — diğer geçişlerde okunan alternatif değerler (tek dokunuşla değiştir) */
  function altChips(key) {
    const alts = state.lastResult && state.lastResult.alternatives && state.lastResult.alternatives[key];
    if (!alts || !alts.length) return '';
    const isEn = window.YakitI18n && window.YakitI18n.getLang() === 'en';
    const fmt = v => (key === 'date' || key === 'time') ? String(v) : String(v).replace('.', ',');
    const chips = alts.map(a =>
      `<button type="button" onclick="YakitOCR.pickAlternative('${key}','${escapeAttr(String(a.value))}')"
        class="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1"
        title="${escapeAttr(a.pass + '. okuma')}">${escapeHtml(fmt(a.value))}</button>`).join('');
    return `<div class="flex items-center gap-1.5 flex-wrap pt-0.5">
      <span class="text-[9px] text-slate-400 font-semibold">${isEn ? 'Other readings:' : 'Diğer okumalar:'}</span>${chips}</div>`;
  }

  function pickAlternative(key, value) {
    const el = $('ocr-f-' + key);
    if (!el) return;
    el.value = (key === 'date' || key === 'time') ? String(value) : String(value).replace('.', ',');
    if (typeof window.showToast === 'function') {
      window.showToast(window.YakitI18n && window.YakitI18n.getLang() === 'en'
        ? 'Value applied — please check' : 'Değer uygulandı — kontrol edin');
    }
  }

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(v) { return escapeHtml(v); }

  function renderResult(parsed) {
    const box = $('ocr-fields');
    if (box) {
      box.innerHTML =
        fieldRow('fuelType', 'Yakıt türü', '') +
        fieldRow('liters', 'Litre (fişteki birim)', 'L') +
        fieldRow('price', 'Birim fiyat (fişteki birim)', '₺/L') +
        fieldRow('total', 'Toplam Tutar', '₺') +
        fieldRow('date', 'Tarih', '') +
        fieldRow('time', 'Saat', '') +
        '<div class="text-[10px] text-slate-400 leading-relaxed">Fiş litre ve TL/L olarak okunur; dolum formuna aktarınca seçtiğiniz hacim birimine çevrilir.</div>';
    }
    const raw = $('ocr-raw-text');
    if (raw) raw.textContent = parsed.raw || '(metin bulunamadı)';
    const conf = $('ocr-confidence');
    if (conf) {
      const extra = parsed.correctedCount ? ` · ${parsed.correctedCount} alan çapraz hesapla düzeltildi` : '';
      conf.textContent = parsed.confidence != null
        ? `OCR güveni: %${parsed.confidence} · ${parsed.foundCount}/6 alan bulundu${parsed.consistent ? ' · tutarlar uyumlu' : ''}${extra}`
        : `${parsed.foundCount}/6 alan bulundu${extra}`;
    }
    showResult();
    if (parsed.foundCount === 0) {
      setStatus('Fişten bilgi çıkarılamadı. Fotoğrafı daha net ve düz çekmeyi deneyin ya da bilgileri elle girin.', 'error');
    } else if (!parsed.consistent) {
      setStatus('Alanları kontrol edin. Litre × birim fiyat, toplam tutarı tam karşılamıyor olabilir.', 'error');
    } else {
      setStatus('Alanlar bulundu ve tutarlar birbiriyle uyumlu. Yine de kontrol edip onaylayın.', 'ok');
    }
  }

  async function handleFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type || '')) { setStatus('Lütfen bir görsel dosyası seçin.', 'error'); return; }
    const prev = $('ocr-preview');
    if (prev) {
      try { prev.src = URL.createObjectURL(file); prev.classList.remove('hidden'); } catch (e) {}
    }
    $('ocr-step-pick')?.classList.add('hidden');
    setStatus('');
    setProgress('Başlatılıyor', 0);
    try {
      const parsed = await recognizeFile(file);
      renderResult(parsed);
    } catch (err) {
      console.error('OCR hatası:', err);
      hideProgress();
      showPicker();
      setStatus((err && err.message) ? err.message : 'Fiş okunamadı. Lütfen tekrar deneyin veya elle girin.', 'error');
    }
  }

  function readField(key) {
    const el = $('ocr-f-' + key);
    if (!el) return null;
    const v = el.value.trim();
    if (!v) return null;
    if (key === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    if (key === 'time') return /^\d{2}:\d{2}$/.test(v) ? v : null;
    if (key === 'fuelType') return REFUEL_FUEL_TYPES.includes(v) ? v : null;
    const n = parseTrNumber(v);
    return Number.isFinite(n) ? n : null;
  }

  function applyToRefuel() {
    const liters = readField('liters');
    const price = readField('price');
    const total = readField('total');
    const date = readField('date');
    const time = readField('time');
    const fuelType = readField('fuelType');
    if (!liters && !total) {
      setStatus('En az litre veya toplam tutar girilmeli.', 'error');
      return;
    }
    closeReceiptModal();
    if (typeof window.openRefuelModal === 'function') {
      window.openRefuelModal({ liters: liters || '', price: price || '', total: total || '', date: date || '', time: time || '', fuelType: fuelType || '' });
      if (date) {
        const d = $('refuel-date');
        if (d) d.value = date;
      }
      if (time) {
        const t = $('refuel-time');
        if (t) t.value = time;
      }
      if (fuelType) {
        const ft = $('refuel-type');
        if (ft && Array.from(ft.options).some(o => o.value === fuelType)) ft.value = fuelType;
      }
      // Birim fiyat boşsa toplam/litreden türet
      const priceEl = $('refuel-price');
      if (priceEl && !price && liters && total) priceEl.value = (total / liters).toFixed(2);
      if (typeof window.showToast === 'function') window.showToast('Fiş bilgileri aktarıldı — kontrol edip kaydedin');
    }
  }

  function openReceiptModal() {
    const modal = $('receipt-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    state.lastResult = null;
    setStatus('');
    showPicker();
    const prev = $('ocr-preview');
    if (prev) { prev.classList.add('hidden'); prev.removeAttribute('src'); }
    const input = $('ocr-file-input');
    if (input) input.value = '';
  }
  function closeReceiptModal() {
    const modal = $('receipt-modal');
    if (modal) modal.classList.add('hidden');
  }

  function toggleRaw() {
    const box = $('ocr-raw-box');
    if (box) box.classList.toggle('hidden');
  }

  // Motoru önceden indir (kullanıcı isterse)
  async function warmUp() {
    try {
      setStatus('OCR motoru hazırlanıyor…');
      await ensureWorker();
      hideProgress();
      setStatus('OCR hazır. Artık internet olmadan da fiş okuyabilirsiniz.', 'ok');
      if (typeof window.showToast === 'function') window.showToast('OCR motoru hazır ✓');
    } catch (err) {
      hideProgress();
      setStatus((err && err.message) || 'OCR motoru hazırlanamadı.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = $('ocr-file-input');
    if (input) input.addEventListener('change', e => handleFile(e.target.files && e.target.files[0]));
    $('ocr-apply-btn')?.addEventListener('click', applyToRefuel);
    $('ocr-retry-btn')?.addEventListener('click', () => { state.lastResult = null; showPicker(); setStatus(''); const i = $('ocr-file-input'); if (i) i.value = ''; });
    $('ocr-raw-btn')?.addEventListener('click', toggleRaw);
    $('ocr-warmup-btn')?.addEventListener('click', warmUp);
  });

  window.YakitOCR = {
    mergeResults,
    parseReceipt, parseTrNumber, parseTrNumberCandidates, extractDate,
    extractFuelType, extractTime, normalizeTime, parseTsvRows, verifyTimeWithCrop,
    verifyNumericCrops, cropRecognize, groupLines, reconcileNumeric,
    REFUEL_FUEL_TYPES,
    recognizeFile, ensureWorker, terminate, warmUp,
    openReceiptModal, closeReceiptModal, applyToRefuel, handleFile, consumeShared,
    state, preprocessImage, pickAlternative
  };

  // Eski çağrı adları index.html içinde kullanılıyor
  window.openReceiptModal = openReceiptModal;
  // v11.1: "Paylaş → Yakıt Takip" ile gelen fotoğrafı bir kez oku ve sil.
  async function consumeShared() {
    if (!/[?&]shared=1/.test(location.search || '')) return false;
    try {
      if (window.history && history.replaceState) {
        history.replaceState(null, '', location.pathname);
      }
      if (!window.caches) return false;
      const cache = await caches.open('yakit-takip-share');
      const res = await cache.match('./__shared_receipt__');
      if (!res) return false;
      const blob = await res.blob();
      const name = decodeURIComponent(res.headers.get('X-File-Name') || 'fis.jpg');
      await cache.delete('./__shared_receipt__');
      const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
      openReceiptModal();
      await handleFile(file);
      return true;
    } catch (e) {
      console.warn('Paylaşılan fiş okunamadı:', e);
      return false;
    }
  }

  window.processReceiptScan = function (e) { handleFile(e && e.target && e.target.files && e.target.files[0]); };
})();
