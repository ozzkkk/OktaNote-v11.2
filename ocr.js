/* Yakıt Takip v6 — Gerçek OCR (Tesseract.js, tamamen yerel/çevrimdışı)
 * - Motor ve Türkçe model aynı klasörden yüklenir, CDN yoktur.
 * - Görüntü cihazdan çıkmaz; işleme WebWorker içinde yapılır.
 * - Çıkarılan alanlar: litre, birim fiyat, toplam tutar, tarih.
 * - Sonuçlar kullanıcıya düzenlenebilir şekilde gösterilir, onaylanmadan kaydedilmez.
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
      .replace(/[Gg]/g, '6');
  }

  /* Türkçe sayı biçimlerini çözer:
   *  "3.468,00" -> 3468   "42,50" -> 42.5   "81.60" -> 81.6
   *  "3.468" -> belirsiz: hem 3468 hem 3.468 aday olarak döner.
   */
  function parseTrNumberCandidates(raw) {
    if (raw == null) return [];
    let s = String(raw).trim().replace(/\s/g, '').replace(/[₺]|TL|TRY/gi, '');
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
    return out.filter(Number.isFinite);
  }

  function parseTrNumber(raw) {
    const c = parseTrNumberCandidates(raw);
    return c.length ? c[0] : null;
  }

  const NUM = '([0-9OoQDlIı|SsBZzGg][0-9OoQDlIı|SsBZzGg.,\\s]{0,14})';
  /* Türk fişlerinde tutar çoğu zaman '*', 'x', '"' gibi bir önekle yazılır:
   *   TOPLAM        *410,00      TOPLAM   x650,29      TOPLAM  "4.309,74
   * Etiket ile sayı arasındaki bu işaretler atlanmalı, yoksa satır hiç eşleşmez. */
  const SEP = '\\s*[:=]?\\s*[*x×#\'"“”«».,\\-–—]?\\s*';

  function collectCandidates(lines, patterns, { min, max }) {
    const found = [];
    lines.forEach((line, idx) => {
      const U = trUpper(line);
      patterns.forEach((re, pri) => {
        const m = U.match(re);
        if (!m) return;
        const rawNum = m[m.length - 1];
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
  const QTY_PRICE_RE = new RegExp(
    '([0-9][0-9.,]*)\\s*' + LT_UNIT + '\\s*[X×*#x]\\s*([0-9][0-9.,]*)'
  );

  const LITER_PATTERNS = [
    new RegExp('(?:L[Iİ]TRE|LITRE|L\\.?T\\.?R?)' + SEP + NUM),
    new RegExp('(?:M[Iİ]KTAR|MIKTAR|VOLUME|QTY|ADET)' + SEP + NUM),
    new RegExp(NUM + '\\s*(?:L[Iİ]TRE|LITRE|LT\\b|LI\\b|L\\b)'),
    new RegExp('(?:YAKIT|FUEL)\\s*' + NUM)
  ];
  const PRICE_PATTERNS = [
    new RegExp('(?:B[Iİ]R[Iİ]M\\s*F[Iİ]YAT|BR\\.?\\s*F[Iİ]YAT|UNIT\\s*PRICE)' + SEP + NUM),
    new RegExp('(?:TL\\s*/\\s*LT|TL/L|F[Iİ]YAT\\s*/\\s*LT)' + SEP + NUM),
    new RegExp('(?:F[Iİ]YAT|PRICE)' + SEP + NUM)
  ];
  const TOTAL_PATTERNS = [
    new RegExp('(?:GENEL\\s*TOPLAM|TOPLAM\\s*TUTAR|ODENECEK|ÖDENECEK)' + SEP + NUM),
    new RegExp('(?:TOPLAM|TOTAL|TUTAR|AMOUNT)' + SEP + NUM),
    new RegExp('(?:KDV\\s*DAH[Iİ]L|DAHIL\\s*TOPLAM)' + SEP + NUM),
    new RegExp('(?:NAK[Iİ]T|KRED[Iİ]|K\\.?\\s*KARTI|B\\.?\\s*KARTI|KART)' + SEP + NUM)
  ];
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
    if (cleaned[0] !== '2' && !['7','1','4','9','0'].includes(cleaned[0])) return null;
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
      m = +fixDigits(m); d = +fixDigits(d);
      if (m < 1 || m > 12 || d < 1 || d > 31) return;
      const key = `${yr.year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const existing = out.find(o => o.key === key);
      if (existing) { existing.priority = Math.min(existing.priority, pri); return; }
      out.push({ key, raw, priority: pri, repaired: yr.repaired });
    };
    const Y = '([271490][0-9OoQDlIı|SsBZzGg]{3})';
    const D = '([0-9OoQDlIı|SsBZzGg]{1,2})';
    const lines = String(text || '').split(/\r?\n/);
    lines.forEach((line) => {
      const U = trUpper(line);
      const labeled = /TARIH|DATE/.test(U);
      const pri = labeled ? 0 : 1;
      let m;
      const re1 = new RegExp(D + '[./-]' + D + '[./-]' + Y, 'g');
      while ((m = re1.exec(U))) push(m[3], m[2], m[1], m[0], pri);
      const re2 = new RegExp(Y + '[./-]' + D + '[./-]' + D, 'g');
      while ((m = re2.exec(U))) push(m[1], m[2], m[3], m[0], pri);
    });
    // etiketli > etiketsiz, onarılmamış > onarılmış
    out.sort((a, b) => a.priority - b.priority || (a.repaired ? 1 : 0) - (b.repaired ? 1 : 0));
    return out[0] || null;
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
      if (out.liters && out.price) break;
    }
    return out;
  }

  /* Ürün satırı: "MOTORİN %20 *410,00" — yakıt adı + KDV oranı + tutar.
   * TOPLAM satırı okunamadığında güçlü bir yedektir. */
  const FUEL_WORDS = /MOTOR[Iİ]N|MOTORIN|BENZ[Iİ]N|KURSUNSUZ|KURŞUNSUZ|EURODI|EUROD[Iİ]|EXCELLIUM|LPG|OTOGAZ|D[Iİ]ZEL|DIZEL|V-?MAX|FUELSAVE|POWER|NITRO/;
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
    if (valid.length === 1) return valid[0];

    // Alan başına adayları topla (değer → oy sayısı + en iyi kaynak)
    function gather(key) {
      const map = new Map();
      valid.forEach((r, ri) => {
        const f = r.fields && r.fields[key];
        if (!f || f.value == null) return;
        // Hesaplanmış değerler gerçek OCR okumasından daha az güvenilir
        const weight = f.computed ? 0.4 : (f.corrected ? 0.9 : 1);
        const k = key === 'date' ? String(f.value) : Number(f.value).toFixed(key === 'total' ? 2 : 3);
        const prev = map.get(k);
        if (prev) { prev.votes += weight; if (weight > prev.weight) { prev.field = f; prev.weight = weight; prev.pass = ri; } }
        else map.set(k, { value: key === 'date' ? f.value : Number(f.value), field: f, votes: weight, weight, pass: ri });
      });
      return [...map.values()].sort((a, b) => b.votes - a.votes);
    }

    const L = gather('liters'), P = gather('price'), T = gather('total'), D = gather('date');

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
    }
    if (D[0]) {
      fields.date = Object.assign({}, D[0].field);
      if (D.length > 1 && D[0].votes > D[1].votes) fields.date.verified = true;
    }

    const foundCount = ['liters', 'price', 'total', 'date'].filter(k => fields[k]).length;
    const correctedCount = ['liters', 'price', 'total'].filter(k => fields[k] && fields[k].corrected).length;
    // Ham metinleri birleştir: kullanıcı hangi geçişte ne okunduğunu görebilsin
    const raw = valid.map((r, i) => `--- ${i + 1}. okuma ---\n${r.raw || ''}`).join('\n\n');
    const confidence = Math.round(valid.reduce((a, r) => a + (r.confidence || 0), 0) / valid.length);
    return {
      fields, foundCount, correctedCount, consistent, raw,
      lines: valid[0].lines || [], confidence, passes: valid.length
    };
  }

  function parseReceipt(text) {
    const raw = String(text || '');
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 1) Önce "84,15 LT X 51,22" satırını ara — Türk fişlerinde en güvenilir kaynak.
    const qtyPrice = extractQtyPrice(lines);

    const liters = collectCandidates(lines, LITER_PATTERNS, { min: 0.5, max: 1500 });
    const prices = collectCandidates(lines, PRICE_PATTERNS, { min: 1, max: 500 });
    // KDV satırlarını toplam adaylarından çıkar
    const totalLines = lines.filter(l => !KDV_LINE.test(trUpper(l)));
    const totals = collectCandidates(totalLines, TOTAL_PATTERNS, { min: 5, max: 500000 });

    // Miktar×fiyat satırından gelenler en yüksek öncelikli (priority -1)
    if (qtyPrice.liters) liters.unshift(qtyPrice.liters);
    if (qtyPrice.price) prices.unshift(qtyPrice.price);
    // Ürün satırındaki tutar (MOTORİN %20 *410,00) toplam için güçlü adaydır
    const productTotal = extractProductTotal(lines);
    if (productTotal) totals.push(productTotal);

    const date = extractDate(raw);

    const combo = chooseConsistent(liters, prices, totals);
    const pick = (arr) => arr.length ? arr[0] : null;

    const L = combo ? combo.l : pick(liters);
    const P = combo ? combo.p : pick(prices);
    const T = combo ? combo.t : pick(totals);

    const fields = {
      liters: L ? { value: +L.value.toFixed(2), source: L.text, verified: !!combo } : null,
      price: P ? { value: +P.value.toFixed(2), source: P.text, verified: !!combo } : null,
      total: T ? { value: +T.value.toFixed(2), source: T.text, verified: !!combo } : null,
      date: date ? { value: date.key, source: date.repaired ? `OCR "${date.raw}" okudu; yıl onarıldı` : date.raw, verified: date.priority === 0 && !date.repaired, repaired: !!date.repaired } : null
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

    // İnce ayar: OCR tek haneyi yanlış okuduysa (81,60 → 81,69) çapraz hesapla düzelt.
    // Toplam ve litre genellikle daha uzun/doğrulanabilir alanlardır.
    if (fields.liters && fields.price && fields.total && !fields.total.computed) {
      const L = fields.liters.value, P = fields.price.value, T = fields.total.value;
      const errP = Math.abs(L * P - T);
      const derivedP = +(T / L).toFixed(2);
      const errDerivedP = Math.abs(L * derivedP - T);
      if (derivedP > 0 && errDerivedP + 0.005 < errP && Math.abs(derivedP - P) / P < 0.02) {
        fields.price = {
          value: derivedP,
          source: `OCR "${String(P).replace('.', ',')}" okudu; toplam ÷ litre ile düzeltildi`,
          verified: true, corrected: true, ocrValue: P
        };
      } else {
        const derivedL = +(T / P).toFixed(2);
        const errDerivedL = Math.abs(derivedL * P - T);
        if (derivedL > 0 && errDerivedL + 0.005 < errP && Math.abs(derivedL - L) / L < 0.02) {
          fields.liters = {
            value: derivedL,
            source: `OCR "${String(L).replace('.', ',')}" okudu; toplam ÷ birim fiyat ile düzeltildi`,
            verified: true, corrected: true, ocrValue: L
          };
        }
      }
    }

    const foundCount = ['liters', 'price', 'total', 'date'].filter(k => fields[k]).length;
    const correctedCount = ['liters', 'price', 'total'].filter(k => fields[k] && fields[k].corrected).length;
    return { fields, foundCount, correctedCount, consistent: !!combo, raw, lines };
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
  async function preprocessImage(file, opts) {
    const o = opts || {};
    const variant = o.variant || 'plain';
    const targetShort = o.targetShort || (variant === 'stretch' ? 2000 : 1500);
    const maxDim = o.maxDim || 4000;

    const bitmap = await loadBitmap(file);
    let { width, height } = bitmap;
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);

    // Kısa kenarı hedefe çıkar; çok büyükse bellek için küçült.
    let scale = 1;
    if (shortSide < targetShort) scale = targetShort / shortSide;
    if (longSide * scale > maxDim) scale = maxDim / longSide;
    // Aşırı büyütme (8×) yeni bilgi üretmez, sadece yavaşlatır.
    scale = Math.min(scale, 8);

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return file;
    // Kübik benzeri yumuşatma: metin kenarlarını korur
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
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
      if (variant === 'stretch') {
        // Uçlardaki %2'yi atarak ger: tek bir parlak nokta tüm aralığı bozmasın.
        const cut = n * 0.02;
        let acc = 0, lo = 0, hi = 255;
        for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= cut) { lo = v; break; } }
        acc = 0;
        for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= cut) { hi = v; break; } }
        const range = Math.max(1, hi - lo);
        if (range < 240) {
          for (let i = 0; i < d.length; i += 4) {
            let g = ((d[i] - lo) * 255) / range;
            g = g < 0 ? 0 : g > 255 ? 255 : g;
            d[i] = d[i + 1] = d[i + 2] = g;
          }
        }
      }
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
      const r1 = await worker.recognize(pre1);
      const p1 = parseReceipt(r1 && r1.data && r1.data.text || '');
      p1.confidence = r1 && r1.data && Number.isFinite(r1.data.confidence) ? Math.round(r1.data.confidence) : null;
      passes.push(p1);

      // Yeterli mi? 4 alan bulundu ve tutarlar birbirini doğruluyorsa bitir.
      const goodEnough = p1.foundCount === 4 && p1.consistent;
      const forceSecond = o.passes === 2;
      if (!goodEnough || forceSecond) {
        setProgress('İkinci okuma (doğrulama)', 55);
        try {
          const pre2 = await pre(file, { variant: 'stretch', targetShort: 2000 });
          setProgress('Fiş yeniden okunuyor', 62);
          const r2 = await worker.recognize(pre2);
          const p2 = parseReceipt(r2 && r2.data && r2.data.text || '');
          p2.confidence = r2 && r2.data && Number.isFinite(r2.data.confidence) ? Math.round(r2.data.confidence) : null;
          passes.push(p2);
        } catch (e) {
          console.warn('İkinci geçiş başarısız, ilk sonuç kullanılıyor:', e);
        }
      }

      setProgress('Sonuçlar birleştiriliyor', 92);
      const merged = passes.length > 1 ? mergeResults(passes) : p1;
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

  function fieldRow(key, label, unit, step) {
    const f = state.lastResult && state.lastResult.fields[key];
    const val = f ? (key === 'date' ? f.value : String(f.value).replace('.', ',')) : '';
    const badge = !f ? '<span class="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">bulunamadı</span>'
      : f.corrected ? '<span class="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">düzeltildi</span>'
      : f.repaired ? '<span class="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">onarıldı</span>'
      : f.computed ? '<span class="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">hesaplandı</span>'
      : f.verified ? '<span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">doğrulandı</span>'
      : '<span class="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">kontrol edin</span>';
    const type = key === 'date' ? 'date' : 'text';
    const inputMode = key === 'date' ? '' : 'inputmode="decimal"';
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
      </div>`;
  }
  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(v) { return escapeHtml(v); }

  function renderResult(parsed) {
    const box = $('ocr-fields');
    if (box) {
      box.innerHTML =
        fieldRow('liters', 'Litre', 'L') +
        fieldRow('price', 'Birim Fiyat', '₺/L') +
        fieldRow('total', 'Toplam Tutar', '₺') +
        fieldRow('date', 'Tarih', '');
    }
    const raw = $('ocr-raw-text');
    if (raw) raw.textContent = parsed.raw || '(metin bulunamadı)';
    const conf = $('ocr-confidence');
    if (conf) {
      const extra = parsed.correctedCount ? ` · ${parsed.correctedCount} alan çapraz hesapla düzeltildi` : '';
      conf.textContent = parsed.confidence != null
        ? `OCR güveni: %${parsed.confidence} · ${parsed.foundCount}/4 alan bulundu${parsed.consistent ? ' · tutarlar uyumlu' : ''}${extra}`
        : `${parsed.foundCount}/4 alan bulundu${extra}`;
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
    const n = parseTrNumber(v);
    return Number.isFinite(n) ? n : null;
  }

  function applyToRefuel() {
    const liters = readField('liters');
    const price = readField('price');
    const total = readField('total');
    const date = readField('date');
    if (!liters && !total) {
      setStatus('En az litre veya toplam tutar girilmeli.', 'error');
      return;
    }
    closeReceiptModal();
    if (typeof window.openRefuelModal === 'function') {
      window.openRefuelModal({ liters: liters || '', price: price || '', total: total || '' });
      if (date) {
        const d = $('refuel-date');
        if (d) d.value = date;
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
    recognizeFile, ensureWorker, terminate, warmUp,
    openReceiptModal, closeReceiptModal, applyToRefuel, handleFile,
    state, preprocessImage
  };

  // Eski çağrı adları index.html içinde kullanılıyor
  window.openReceiptModal = openReceiptModal;
  window.processReceiptScan = function (e) { handleFile(e && e.target && e.target.files && e.target.files[0]); };
})();
