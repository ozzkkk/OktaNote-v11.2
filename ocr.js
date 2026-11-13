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

  const LITER_PATTERNS = [
    new RegExp('(?:L[Iİ]TRE|LITRE|L\\.?T\\.?R?)\\s*[:=]?\\s*' + NUM),
    new RegExp('(?:M[Iİ]KTAR|MIKTAR|VOLUME|QTY|ADET)\\s*[:=]?\\s*' + NUM),
    new RegExp(NUM + '\\s*(?:L[Iİ]TRE|LITRE|LT\\b|L\\b)'),
    new RegExp('(?:YAKIT|FUEL)\\s*' + NUM)
  ];
  const PRICE_PATTERNS = [
    new RegExp('(?:B[Iİ]R[Iİ]M\\s*F[Iİ]YAT|BR\\.?\\s*F[Iİ]YAT|UNIT\\s*PRICE)\\s*[:=]?\\s*' + NUM),
    new RegExp('(?:TL\\s*/\\s*LT|TL/L|F[Iİ]YAT\\s*/\\s*LT)\\s*[:=]?\\s*' + NUM),
    new RegExp('(?:F[Iİ]YAT|PRICE)\\s*[:=]?\\s*' + NUM)
  ];
  const TOTAL_PATTERNS = [
    new RegExp('(?:GENEL\\s*TOPLAM|TOPLAM\\s*TUTAR|ODENECEK|ÖDENECEK)\\s*[:=]?\\s*' + NUM),
    new RegExp('(?:TOPLAM|TOTAL|TUTAR|AMOUNT)\\s*[:=]?\\s*' + NUM),
    new RegExp('(?:KDV\\s*DAH[Iİ]L|DAHIL\\s*TOPLAM)\\s*[:=]?\\s*' + NUM),
    new RegExp('(?:NAK[Iİ]T|KRED[Iİ]\\s*KARTI|KART)\\s*[:=]?\\s*' + NUM)
  ];

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
    if (cleaned[0] !== '2') return null;
    const alts = { '9': ['0'], '6': ['0'], '8': ['0'], '5': ['0'], '3': ['0'], '1': ['0'], '0': ['9', '6', '8'] };
    for (let i = 1; i < 4; i++) {
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
    const Y = '(2[0-9OoQDlIı|SsBZzGg]{3})';
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

  function parseReceipt(text) {
    const raw = String(text || '');
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const liters = collectCandidates(lines, LITER_PATTERNS, { min: 0.5, max: 1500 });
    const prices = collectCandidates(lines, PRICE_PATTERNS, { min: 1, max: 500 });
    const totals = collectCandidates(lines, TOTAL_PATTERNS, { min: 5, max: 500000 });
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
  async function preprocessImage(file, { maxDim = 2200, minDim = 1000 } = {}) {
    const bitmap = await loadBitmap(file);
    let { width, height } = bitmap;
    let scale = 1;
    const longSide = Math.max(width, height), shortSide = Math.min(width, height);
    if (longSide > maxDim) scale = maxDim / longSide;
    else if (shortSide < minDim) scale = Math.min(2.5, minDim / shortSide);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return file; // jsdom / desteklenmeyen ortam
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();

    try {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      // Gri tonlama + histogram uçlarını gererek kontrast artır
      let min = 255, max = 0;
      for (let i = 0; i < d.length; i += 4) {
        const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
        d[i] = d[i + 1] = d[i + 2] = g;
        if (g < min) min = g;
        if (g > max) max = g;
      }
      const range = Math.max(1, max - min);
      const stretch = range < 200; // zaten yüksek kontrastlıysa dokunma
      for (let i = 0; i < d.length; i += 4) {
        let g = d[i];
        if (stretch) g = ((g - min) * 255) / range;
        g = Math.max(0, Math.min(255, g));
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      ctx.putImageData(img, 0, 0);
    } catch (e) { /* CORS/güvenlik durumunda orijinali kullan */ }

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

  async function recognizeFile(file) {
    if (state.busy) throw new Error('Devam eden bir tarama var.');
    state.busy = true;
    try {
      const worker = await ensureWorker();
      setProgress('Görüntü iyileştiriliyor', 5);
      const pre = (window.YakitOCR && window.YakitOCR.preprocessImage) || preprocessImage;
      const processed = await pre(file);
      setProgress('Fiş okunuyor', 10);
      const { data } = await worker.recognize(processed);
      const parsed = parseReceipt(data && data.text || '');
      parsed.confidence = data && Number.isFinite(data.confidence) ? Math.round(data.confidence) : null;
      state.lastResult = parsed;
      return parsed;
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
    parseReceipt, parseTrNumber, parseTrNumberCandidates, extractDate,
    recognizeFile, ensureWorker, terminate, warmUp,
    openReceiptModal, closeReceiptModal, applyToRefuel, handleFile,
    state, preprocessImage
  };

  // Eski çağrı adları index.html içinde kullanılıyor
  window.openReceiptModal = openReceiptModal;
  window.processReceiptScan = function (e) { handleFile(e && e.target && e.target.files && e.target.files[0]); };
})();
