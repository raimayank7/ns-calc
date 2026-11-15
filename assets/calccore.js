/* NSCalc: the arithmetic of the calculator hub (calc.niveshsahayak.in). Pure functions, no page access, tested by
   node scripts/test_calc.js. Every figure is plain arithmetic worked out in the visitor's browser; nothing is sent anywhere.
   Rules that depend on law are typed fields or dated notes on the page, never hidden constants:
     GST        price x rate/100; inclusive price x 100/(100+rate); CGST+SGST halves or IGST (the rate itself comes from the user)
     EMI        P r (1+r)^n / ((1+r)^n - 1), r = annual rate / 12 / 100, reducing balance, instalment at the end of each month
     SIP        instalment at the START of each month (the usual fund-house calculator), monthly rate = annual / 12; optional yearly step-up
     HRA        section 10(13A) style: least of actual HRA, rent - 10% of salary, 50% (eight metro cities, from 1 Apr 2026) or 40% of salary;
                old tax regime only. Salary = basic + DA that counts for retirement benefits + commission on a fixed % of turnover.
     Stamp duty typed rates (duty %, registration %, other charges, concession %) because they differ by state, buyer and year
     Margin     margin = (price - cost)/price; markup = (price - cost)/cost */
(function (G) {
  'use strict';
  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function pos(v) { var n = num(v); return isFinite(n) && n >= 0 ? n : NaN; }

  /* ---- GST ---- mode 'add' (amount is before GST) or 'remove' (amount includes GST); inter = IGST instead of CGST + SGST */
  function gst(amount, rate, mode, inter) {
    amount = pos(amount); rate = pos(rate);
    if (!isFinite(amount) || !isFinite(rate)) return null;
    var base, tax, total;
    if (mode === 'remove') { total = amount; base = r2(amount * 100 / (100 + rate)); tax = r2(total - base); }
    else { base = amount; tax = r2(amount * rate / 100); total = r2(base + tax); }
    var o = { base: r2(base), tax: tax, total: total, rate: rate, inter: !!inter };
    if (inter) o.igst = tax; else { o.cgst = r2(tax / 2); o.sgst = r2(tax - o.cgst); }
    return o;
  }

  /* ---- EMI ---- returns emi, totals and the month by month schedule (the last instalment clears the rounding) */
  function emi(principal, annualRate, months) {
    principal = pos(principal); annualRate = pos(annualRate); months = Math.round(num(months));
    if (!(principal > 0) || !isFinite(annualRate) || !(months >= 1) || months > 1200) return null;
    var r = annualRate / 12 / 100, e = r === 0 ? principal / months : principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
    e = r2(e);
    var bal = principal, rows = [], paid = 0, intr = 0;
    for (var m = 1; m <= months; m++) {
      var i = r2(bal * r), p = r2(e - i), pay = e;
      if (m === months) { p = r2(bal); pay = r2(p + i); }
      bal = r2(bal - p); paid = r2(paid + pay); intr = r2(intr + i);
      rows.push({ m: m, pay: pay, interest: i, principal: p, balance: Math.max(0, bal) });
    }
    return { emi: e, months: months, total: paid, interest: intr, principal: principal, rows: rows };
  }

  /* ---- SIP ---- monthly instalment, annual return %, years, yearly step-up % (0 = none) */
  function sip(monthly, annualRate, years, stepUp) {
    monthly = pos(monthly); annualRate = pos(annualRate); years = num(years); stepUp = isFinite(pos(stepUp)) ? pos(stepUp) : 0;
    if (!(monthly > 0) || !isFinite(annualRate) || !(years > 0) || years > 60) return null;
    var n = Math.round(years * 12), i = annualRate / 12 / 100, bal = 0, inv = 0, cur = monthly, rows = [];
    for (var m = 1; m <= n; m++) {
      if (m > 1 && (m - 1) % 12 === 0) cur = cur * (1 + stepUp / 100);
      var c = r2(cur); bal = (bal + c) * (1 + i); inv += c;
      if (m % 12 === 0 || m === n) rows.push({ year: Math.ceil(m / 12), invested: r2(inv), value: r2(bal) });
    }
    return { invested: r2(inv), value: r2(bal), gain: r2(bal - inv), months: n, rows: rows };
  }

  /* ---- HRA ---- yearly figures: salary for this purpose, hra received, rent paid; metro = 50% of salary else 40% */
  function hra(salary, received, rent, metro) {
    salary = pos(salary); received = pos(received); rent = pos(rent);
    if (!isFinite(salary) || !isFinite(received) || !isFinite(rent)) return null;
    var a = r2(received), b = r2(Math.max(0, rent - salary / 10)), c = r2(salary * (metro ? 50 : 40) / 100);
    var ex = Math.min(a, b, c), which = ex === a ? 'received' : ex === b ? 'rent' : 'salary';
    return { a: a, b: b, c: c, exempt: r2(ex), taxable: r2(received - ex), which: which };
  }

  /* ---- stamp duty and registration (rates typed by the user) ---- value in rupees; concession % off the duty only */
  function stamp(value, dutyPct, regPct, other, concession) {
    value = pos(value); dutyPct = pos(dutyPct); regPct = pos(regPct);
    other = isFinite(pos(other)) ? pos(other) : 0; concession = isFinite(pos(concession)) ? pos(concession) : 0;
    if (!isFinite(value) || !isFinite(dutyPct) || !isFinite(regPct) || concession > 100) return null;
    var eff = r2(dutyPct * (100 - concession) / 100), duty = r2(value * eff / 100), reg = r2(value * regPct / 100);
    return { value: value, effDuty: eff, duty: duty, reg: reg, other: r2(other), total: r2(duty + reg + other), allIn: r2(value + duty + reg + other) };
  }

  /* ---- margin and markup ---- given cost and price, or cost and one of the two percentages */
  function margin(cost, price, marginPct, markupPct) {
    cost = pos(cost);
    if (!(cost > 0)) return null;
    var p = pos(price);
    if (!isFinite(p) || p === 0) {
      var mg = pos(marginPct), mk = pos(markupPct);
      if (isFinite(mg) && mg < 100) p = cost * 100 / (100 - mg);
      else if (isFinite(mk)) p = cost * (100 + mk) / 100;
      else return null;
    }
    p = r2(p);
    return { cost: cost, price: p, profit: r2(p - cost), margin: r2((p - cost) / p * 100), markup: r2((p - cost) / cost * 100) };
  }

  /* ---- shareable link: the state sits inside the address (no server): "#emi?p=500000&r=9&n=60" ---- */
  function toHash(kind, o) {
    var s = Object.keys(o).filter(function (k) { return o[k] !== '' && o[k] != null && k !== 'kind'; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); });
    return '#' + kind + (s.length ? '?' + s.join('&') : '');
  }
  function fromHash(h) {
    h = String(h || '').replace(/^#/, '');
    var q = h.indexOf('?'), kind = q < 0 ? h : h.slice(0, q), o = {};
    if (q >= 0) h.slice(q + 1).split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); try { o[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); } catch (e) {} });
    return { kind: kind, inputs: o };
  }

  var API = { gst: gst, emi: emi, sip: sip, hra: hra, stamp: stamp, margin: margin, toHash: toHash, fromHash: fromHash, r2: r2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else G.NSCalc = API;
})(typeof window !== 'undefined' ? window : this);
