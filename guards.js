/* Oktanote v11.3 — Veri giriş korumaları
 * Bağımsız modül: window.YakitGuards
 * Kayıt ENGELLEMEZ; yalnızca uyarı üretir. Kullanıcı "Yine de kaydet" derse kayıt geçer.
 * Tüm değerler kanonik birimdedir: km, litre, TL. (Birim çevirimi index.html'de yapılır.)
 *
 * Kurallar:
 *   1) Mükerrer dolum   — aynı araç + aynı tarih + yakın litre/tutar (veya aynı sayaç + litre)
 *   2) Sayaç gerilemesi — yeni km, aracın en yüksek km'sinden düşük
 *      2a) Basamak hatası — 7778 yerine 77780 gibi (10× / ÷10)
 *      2b) Büyük sıçrama — tek dolumda 2000 km üzeri artış (bilgi)
 *   3) Tüketim sapması  — tam depolar arası tüketim, geçmiş medyanın 0,5×–1,8× dışında
 *   4) Depo aşımı       — litre, depo kapasitesinin 1,5 katından fazla (yalnızca BİLGİ)
 */
(function () {
  'use strict';

  var LIMITS = {
    dupLitersTol: 0.05,        // L — aynı fiş sayılacak litre farkı
    dupLitersPct: 0.005,       // %0,5
    dupCostTol: 0.5,           // TL
    dupCostPct: 0.005,         // %0,5
    odoTypoPct: 0.02,          // 10× / ÷10 karşılaştırma toleransı
    odoJumpKm: 2000,           // tek dolumda olağandışı artış
    consMinIntervals: 3,       // geçmişte en az 3 geçerli aralık olmalı
    consMinKm: 50,             // çok kısa aralıkta tüketim uyarısı üretme
    consLowRatio: 0.5,
    consHighRatio: 1.8,
    tankFactor: 1.5
  };

  function n(v) { var x = Number(v); return isFinite(x) ? x : NaN; }
  function r1(v) { return Math.round(n(v) * 10) / 10; }
  function r2(v) { return Math.round(n(v) * 100) / 100; }

  function median(arr) {
    var a = (arr || []).map(n).filter(isFinite).sort(function (x, y) { return x - y; });
    if (!a.length) return NaN;
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function sameVehicle(r, vehicleId) {
    if (!vehicleId) return true;
    return String(r.vehicleId || '') === String(vehicleId);
  }

  // Tam depolar arası geçerli aralıklar (index.html'deki analyzeConsumption ile aynı mantık)
  function analyzeIntervals(refuels) {
    var sorted = (refuels || []).slice().sort(function (a, b) {
      return (n(a.odometer) - n(b.odometer)) || String(a.date || '').localeCompare(String(b.date || ''));
    });
    var intervals = [], base = null, accL = 0;
    for (var i = 0; i < sorted.length; i++) {
      var r = sorted[i];
      if (r.fullTank === false) { if (base) accL += n(r.liters) || 0; continue; }
      if (base) {
        var km = n(r.odometer) - n(base.odometer);
        if (km > 0) {
          var liters = accL + (n(r.liters) || 0);
          intervals.push({ endId: r.id, startOdo: n(base.odometer), endOdo: n(r.odometer), km: km, liters: liters, l100: (liters / km) * 100 });
        }
        accL = 0;
      }
      base = r;
    }
    return intervals;
  }

  // ---------- 1) Mükerrer dolum ----------
  function findDuplicates(rec, refuels, editId) {
    var out = [];
    var L = n(rec.liters), C = n(rec.totalCost), O = n(rec.odometer);
    var lt = Math.max(LIMITS.dupLitersTol, Math.abs(L) * LIMITS.dupLitersPct);
    var ct = Math.max(LIMITS.dupCostTol, Math.abs(C) * LIMITS.dupCostPct);
    (refuels || []).forEach(function (r) {
      if (editId && r.id === editId) return;
      if (!sameVehicle(r, rec.vehicleId)) return;
      var dL = Math.abs((n(r.liters) || 0) - L);
      var dC = Math.abs((n(r.totalCost) || 0) - C);
      var close = isFinite(L) && isFinite(C) && dL <= lt && dC <= ct;
      var sameDay = !!rec.date && String(r.date || '') === String(rec.date);
      var sameOdo = isFinite(O) && n(r.odometer) === O;
      var hit = (close && sameDay) || (close && sameOdo);
      if (!hit) return;
      var exact = dL < 0.005 && dC < 0.005;
      out.push({
        id: r.id, date: r.date || '', odometer: n(r.odometer), liters: n(r.liters), totalCost: n(r.totalCost),
        exact: exact, sameDay: sameDay, sameOdo: sameOdo,
        score: (exact ? 4 : 0) + (sameDay ? 2 : 0) + (sameOdo ? 1 : 0)
      });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }

  // ---------- 2) Sayaç ----------
  function checkOdometer(rec, refuels, editId) {
    var O = n(rec.odometer);
    if (!isFinite(O) || O <= 0) return [];
    var maxOdo = 0, last = null;
    (refuels || []).forEach(function (r) {
      if (editId && r.id === editId) return;
      if (!sameVehicle(r, rec.vehicleId)) return;
      var o = n(r.odometer);
      if (!isFinite(o)) return;
      if (o > maxOdo) { maxOdo = o; last = r; }
    });
    if (!last || maxOdo <= 0) return [];

    var out = [];
    var delta = O - maxOdo;

    if (delta < 0) {
      var fix = null;
      // 10× fazla yazılmış olabilir: 77780 → 7778
      if (O / 10 >= maxOdo * (1 - LIMITS.odoTypoPct)) {
        fix = { field: 'odometer', value: r1(O / 10), label: 'Sayaçı ' + r1(O / 10) + ' olarak düzelt' };
      }
      out.push({
        code: 'odo-back', severity: 'warn', field: 'odometer',
        title: 'Sayaç gerilemiş görünüyor',
        detail: 'Girdiğiniz değer, bu aracın en yüksek sayacından (' + r1(maxOdo) + ') ' + r1(Math.abs(delta)) + ' düşük. ' +
                'Geçmiş bir dolumu kaydediyorsanız normaldir.',
        fix: fix, data: { entered: O, max: maxOdo, delta: delta }
      });
    } else if (delta > LIMITS.odoJumpKm) {
      var fix2 = null;
      // ÷10 eksik yazılmış olabilir: 7778 yerine 77780 değil, 777800 gibi
      if (O / 10 >= maxOdo * (1 - LIMITS.odoTypoPct) && (O / 10 - maxOdo) <= LIMITS.odoJumpKm) {
        fix2 = { field: 'odometer', value: r1(O / 10), label: 'Sayaçı ' + r1(O / 10) + ' olarak düzelt' };
      }
      out.push({
        code: 'odo-jump', severity: fix2 ? 'warn' : 'info', field: 'odometer',
        title: fix2 ? 'Sayaca fazla basamak girilmiş olabilir' : 'Tek dolumda büyük mesafe',
        detail: 'Son sayaçtan ' + r1(delta) + ' km artış görünüyor. Uzun yol yaptıysanız normaldir.',
        fix: fix2, data: { entered: O, max: maxOdo, delta: delta }
      });
    }
    return out;
  }

  // ---------- 3) Tüketim sapması ----------
  function checkConsumption(rec, refuels, editId) {
    if (rec.fullTank === false) return [];             // kısmi dolumda aralık hesabı yapılmaz
    var O = n(rec.odometer), L = n(rec.liters);
    if (!isFinite(O) || !isFinite(L) || L <= 0) return [];

    var others = (refuels || []).filter(function (r) {
      if (editId && r.id === editId) return false;
      return sameVehicle(r, rec.vehicleId);
    });
    var hist = analyzeIntervals(others).filter(function (iv) { return iv.endId !== '__guard_new__'; });
    if (hist.length < LIMITS.consMinIntervals) return [];

    var probe = { id: '__guard_new__', vehicleId: rec.vehicleId, odometer: O, liters: L, date: rec.date, fullTank: true };
    var all = analyzeIntervals(others.concat([probe]));
    var iv = null;
    for (var i = 0; i < all.length; i++) { if (all[i].endId === '__guard_new__') iv = all[i]; }
    if (!iv || iv.km < LIMITS.consMinKm) return [];

    var med = median(hist.map(function (x) { return x.l100; }));
    if (!isFinite(med) || med <= 0) return [];
    var ratio = iv.l100 / med;
    if (ratio >= LIMITS.consLowRatio && ratio <= LIMITS.consHighRatio) return [];

    var high = ratio > LIMITS.consHighRatio;
    return [{
      code: 'consumption', severity: 'warn', field: 'liters',
      title: high ? 'Tüketim alışılmadık yüksek' : 'Tüketim alışılmadık düşük',
      detail: 'Bu dolumda ' + r2(iv.l100) + ' L/100km görünüyor; araç ortalaması yaklaşık ' + r2(med) + ' L/100km. ' +
              'Litre veya sayaç değerini kontrol edin.',
      fix: null, data: { l100: iv.l100, median: med, ratio: ratio, km: iv.km }
    }];
  }

  // ---------- 4) Depo kapasitesi ----------
  function checkTank(rec, vehicle) {
    var cap = vehicle ? n(vehicle.tankCapacity) : NaN;
    var L = n(rec.liters);
    if (!isFinite(cap) || cap <= 0 || !isFinite(L) || L <= 0) return [];
    if (L <= cap * LIMITS.tankFactor) return [];
    return [{
      code: 'tank', severity: 'info', field: 'liters',
      title: 'Litre depo kapasitesini aşıyor',
      detail: r2(L) + ' L girdiniz; bu aracın depo kapasitesi ' + r1(cap) + ' L. ' +
              'Bidon/ek yakıt aldıysanız normaldir.',
      fix: null, data: { liters: L, capacity: cap }
    }];
  }

  // ---------- birleşik kontrol ----------
  // rec: { vehicleId, odometer, liters, totalCost, date, fullTank }
  // ctx: { refuels: [...], editId: '', vehicle: {...} }
  function check(rec, ctx) {
    ctx = ctx || {};
    if (!rec) return [];
    var refuels = ctx.refuels || [];
    var editId = ctx.editId || '';
    var out = [];

    var dups = findDuplicates(rec, refuels, editId);
    if (dups.length) {
      var d = dups[0];
      out.push({
        code: 'duplicate', severity: 'warn', field: 'liters',
        title: d.exact ? 'Bu dolum zaten kayıtlı olabilir' : 'Çok benzer bir dolum var',
        detail: (d.date || 'tarihsiz') + ' · ' + r1(d.odometer) + ' km · ' + r2(d.liters) + ' L · ' + r2(d.totalCost) +
                ' ₺ değerinde bir kayıt bulundu' + (d.sameOdo && !d.sameDay ? ' (aynı sayaç)' : '') +
                '. Aynı fişi iki kez okutmuş olabilirsiniz.',
        fix: null, data: { match: d, count: dups.length }
      });
    }

    out = out.concat(checkOdometer(rec, refuels, editId));
    out = out.concat(checkConsumption(rec, refuels, editId));
    out = out.concat(checkTank(rec, ctx.vehicle));
    return out;
  }

  window.YakitGuards = {
    LIMITS: LIMITS,
    check: check,
    findDuplicates: findDuplicates,
    checkOdometer: checkOdometer,
    checkConsumption: checkConsumption,
    checkTank: checkTank,
    analyzeIntervals: analyzeIntervals,
    median: median
  };
})();