/* calc.niveshsahayak.in: business calculators (GST, EMI, SIP, HRA, stamp duty and registration, margin and markup).
   Arithmetic lives in calccore.js (NSCalc, tested in node). This file draws the form, keeps the inputs in the address after #
   (so a copied link opens the same figures, no server involved), saves a result to the data home (meta 'calcs', newest first,
   at most 60) and lists saved results. Screen text: NS.t('cx.*'). The page says plainly that a shared link is a snapshot of the
   typed figures, worked out again by whoever opens it. */
(function () {
  'use strict';
  var NS = window.NS, $ = NS.$, esc = NS.esc, C = window.NSCalc;
  function T(k, v) { return NS.t(k, v); }
  var M = function (n) { return NS.money(n); };
  var KINDS = ['gst', 'emi', 'sip', 'hra', 'stamp', 'margin'];
  /* fields: [name, type, default, extra]; type n = number, c = checkbox, s = select with options in extra */
  var DEFS = {
    gst: { f: [['amount', 'n', '1000'], ['rate', 'n', '18', 'rates'], ['mode', 's', 'add', ['add', 'remove']], ['inter', 'c', '']] },
    emi: { f: [['p', 'n', '500000'], ['r', 'n', '9'], ['n', 'n', '60'], ['u', 's', 'm', ['m', 'y']]] },
    sip: { f: [['m', 'n', '10000'], ['r', 'n', '12'], ['y', 'n', '10'], ['s', 'n', '0']] },
    hra: { f: [['sal', 'n', '600000'], ['hra', 'n', '240000'], ['rent', 'n', '210000'], ['per', 's', 'y', ['y', 'm']], ['metro', 'c', '']] },
    stamp: { f: [['v', 'n', '5000000'], ['d', 'n', ''], ['g', 'n', ''], ['o', 'n', '0'], ['c', 'n', '0']] },
    margin: { f: [['cost', 'n', '80'], ['price', 'n', '100'], ['mg', 'n', ''], ['mk', 'n', '']] }
  };
  var RATES = ['0', '0.1', '0.25', '1.5', '3', '5', '12', '18', '40'];   /* the rate list the document makers use from 1 Feb 2026 (docs.js RATE_SETS) */
  var cur = 'gst', vals = {}, root, saved = [], showAll = false;

  function read() { var o = {}; KINDS.forEach(function (k) { o[k] = {}; DEFS[k].f.forEach(function (f) { o[k][f[0]] = f[2]; }); }); return o; }
  vals = read();

  function compute(k) {
    var v = vals[k], x, mult;
    if (k === 'gst') { x = C.gst(v.amount, v.rate, v.mode, v.inter === '1'); if (!x) return null; var rows = [['cx.r.base', M(x.base)]];
      if (x.inter) rows.push(['cx.r.igst', M(x.igst)]); else rows.push(['cx.r.cgst', M(x.cgst)], ['cx.r.sgst', M(x.sgst)]);
      rows.push(['cx.r.tax', M(x.tax)], ['cx.r.total', M(x.total), 1]); return { rows: rows, sum: M(x.total) }; }
    if (k === 'emi') { var n = NS.num(v.n) * (v.u === 'y' ? 12 : 1); x = C.emi(v.p, v.r, n); if (!x) return null;
      return { rows: [['cx.r.emi', M(x.emi), 1], ['cx.r.interest', M(x.interest)], ['cx.r.total', M(x.total)], ['cx.r.months', String(x.months)]], sum: M(x.emi), sched: x.rows }; }
    if (k === 'sip') { x = C.sip(v.m, v.r, v.y, v.s); if (!x) return null;
      return { rows: [['cx.r.invested', M(x.invested)], ['cx.r.gain', M(x.gain)], ['cx.r.value', M(x.value), 1]], sum: M(x.value), years: x.rows }; }
    if (k === 'hra') { mult = v.per === 'm' ? 12 : 1; x = C.hra(NS.num(v.sal) * mult, NS.num(v.hra) * mult, NS.num(v.rent) * mult, v.metro === '1'); if (!x) return null;
      return { rows: [['cx.r.hraA', M(x.a)], ['cx.r.hraB', M(x.b)], ['cx.r.hraC', M(x.c)], ['cx.r.exempt', M(x.exempt), 1], ['cx.r.taxable', M(x.taxable)], ['cx.r.least', T('cx.which.' + x.which)]], sum: M(x.exempt) }; }
    if (k === 'stamp') { x = C.stamp(v.v, v.d, v.g, v.o, v.c); if (!x) return null; if (v.d === '' || v.g === '') return null;
      return { rows: [['cx.r.effduty', x.effDuty + '%'], ['cx.r.duty', M(x.duty)], ['cx.r.reg', M(x.reg)], ['cx.r.other', M(x.other)], ['cx.r.charges', M(x.total), 1], ['cx.r.allin', M(x.allIn)]], sum: M(x.total) }; }
    if (k === 'margin') { x = C.margin(v.cost, v.price, v.mg, v.mk); if (!x) return null;
      return { rows: [['cx.r.price', M(x.price)], ['cx.r.profit', M(x.profit)], ['cx.r.margin', x.margin + '%', 1], ['cx.r.markup', x.markup + '%']], sum: x.margin + '%' }; }
    return null;
  }

  function field(k, f) {
    var id = 'cx-' + k + '-' + f[0], lab = T('cx.f.' + k + '.' + f[0]), val = vals[k][f[0]];
    if (f[1] === 'c') return '<label class="cx-chk"><input type="checkbox" id="' + id + '" data-f="' + f[0] + '"' + (val === '1' ? ' checked' : '') + '> ' + esc(lab) + '</label>';
    if (f[1] === 's') return '<label class="gt-lbl" for="' + id + '">' + esc(lab) + '</label><select id="' + id + '" data-f="' + f[0] + '">' +
      f[3].map(function (o) { return '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + esc(T('cx.o.' + k + '.' + f[0] + '.' + o)) + '</option>'; }).join('') + '</select>';
    return '<label class="gt-lbl" for="' + id + '">' + esc(lab) + '</label><input id="' + id + '" data-f="' + f[0] + '" inputmode="decimal" autocomplete="off" value="' + esc(val) + '"' +
      (f[3] === 'rates' ? ' list="cx-rates"' : '') + '>' + (f[3] === 'rates' ? '<datalist id="cx-rates">' + RATES.map(function (r) { return '<option value="' + r + '">'; }).join('') + '</datalist>' : '');
  }

  function table(rows) { return '<table class="gt-tbl"><tbody>' + rows.map(function (r) { return '<tr' + (r[2] ? ' class="cx-key"' : '') + '><th scope="row">' + esc(T(r[0])) + '</th><td class="r">' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>'; }

  function resultHtml() {
    var r = compute(cur), out = '';
    if (!r) return '<p class="note" role="status">' + esc(T('cx.fill')) + '</p>';
    out += table(r.rows);
    if (r.sched) {
      var list = showAll ? r.sched : r.sched.slice(0, 12);
      out += '<h3>' + esc(T('cx.sched')) + '</h3><div class="gt-scroll"><table class="gt-tbl gt-list"><thead><tr><th>#</th><th>' + esc(T('cx.s.pay')) + '</th><th>' + esc(T('cx.s.int')) + '</th><th>' + esc(T('cx.s.prin')) + '</th><th>' + esc(T('cx.s.bal')) + '</th></tr></thead><tbody>' +
        list.map(function (x) { return '<tr><td>' + x.m + '</td><td class="r">' + M(x.pay) + '</td><td class="r">' + M(x.interest) + '</td><td class="r">' + M(x.principal) + '</td><td class="r">' + M(x.balance) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        (r.sched.length > 12 ? '<button type="button" class="btn sm" data-cx="more">' + esc(T(showAll ? 'cx.less' : 'cx.more', { n: r.sched.length })) + '</button> ' : '') + '<button type="button" class="btn sm" data-cx="csv">' + esc(T('cx.csv')) + '</button>';
    }
    if (r.years) out += '<h3>' + esc(T('cx.years')) + '</h3><div class="gt-scroll"><table class="gt-tbl gt-list"><thead><tr><th>' + esc(T('cx.s.year')) + '</th><th>' + esc(T('cx.r.invested')) + '</th><th>' + esc(T('cx.r.value')) + '</th></tr></thead><tbody>' +
      r.years.map(function (x) { return '<tr><td>' + x.year + '</td><td class="r">' + M(x.invested) + '</td><td class="r">' + M(x.value) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    return out;
  }

  function hash() { var o = Object.assign({}, vals[cur]); DEFS[cur].f.forEach(function (f) { if (f[1] === 'c' && !o[f[0]]) delete o[f[0]]; }); return C.toHash(cur, o); }
  function url() { return location.origin + location.pathname + hash(); }

  function links() {
    var h = { gst: '<a class="btn sm" href="https://billing.niveshsahayak.in/">' + esc(T('cx.l.billing')) + '</a>', margin: '<a class="btn sm" href="https://price-list.niveshsahayak.in/">' + esc(T('cx.l.price')) + '</a>',
      hra: '<a class="btn sm" href="https://rent-receipt.niveshsahayak.in/">' + esc(T('cx.l.rent')) + '</a>' };
    return h[cur] || '';
  }

  function savedHtml() {
    if (!saved.length) return '<p class="note">' + esc(T('cx.nosaved')) + '</p>';
    return '<ul class="cx-saved">' + saved.map(function (s) {
      return '<li><span><b>' + esc(T('cx.tab.' + s.kind)) + '</b> ' + esc(s.sum || '') + ' <small>' + esc(NS.fmtDate(s.at.slice(0, 10))) + (s.note ? ' · ' + esc(s.note) : '') + '</small></span>' +
        '<span><button type="button" class="btn sm" data-cx="open" data-id="' + esc(s.id) + '">' + esc(T('cx.open')) + '</button> <button type="button" class="btn sm" data-cx="del" data-id="' + esc(s.id) + '" aria-label="' + esc(T('cx.del')) + '">✕</button></span></li>';
    }).join('') + '</ul>';
  }

  function render() {
    var tabs = KINDS.map(function (k) { return '<button type="button" role="tab" class="cx-tab" data-cx="tab" data-k="' + k + '" aria-selected="' + (k === cur) + '">' + esc(T('cx.tab.' + k)) + '</button>'; }).join('');
    root.innerHTML = '<div class="cx-tabs" role="tablist">' + tabs + '</div><div class="gt-grid"><div class="gt-card"><h2>' + esc(T('cx.tab.' + cur)) + '</h2><p class="note">' + esc(T('cx.help.' + cur)) + '</p>' +
      DEFS[cur].f.map(function (f) { return field(cur, f); }).join('') + '</div><div class="gt-card" aria-live="polite"><h2>' + esc(T('cx.result')) + '</h2><div id="cx-out">' + resultHtml() + '</div>' +
      '<div class="row gt-acts"><button type="button" class="btn sm primary" data-cx="link">' + esc(T('cx.copy')) + '</button> <button type="button" class="btn sm" data-cx="save">' + esc(T('cx.save')) + '</button> <button type="button" class="btn sm" data-cx="print">' + esc(T('cx.print')) + '</button> ' + links() + '</div>' +
      '<p class="note gt-noprint">' + esc(T('cx.snap')) + '</p><p id="cx-msg" class="note" role="status" hidden></p></div></div>' +
      '<div class="gt-card"><h2>' + esc(T('cx.saved')) + '</h2>' + savedHtml() + '</div>';
  }
  function refresh() { $('#cx-out', root).innerHTML = resultHtml(); try { history.replaceState(null, '', hash()); } catch (e) {} }
  function say(m) { var p = $('#cx-msg', root); if (p) { p.textContent = m; p.hidden = false; } }

  function persist() { return NSStore.meta('calcs', saved).catch(function () {}); }
  function loadHash() {
    var h = C.fromHash(location.hash);
    if (KINDS.indexOf(h.kind) < 0) return false;
    cur = h.kind;
    DEFS[cur].f.forEach(function (f) { if (h.inputs[f[0]] != null) vals[cur][f[0]] = String(h.inputs[f[0]]).slice(0, 24); else if (f[1] === 'c') vals[cur][f[0]] = ''; });
    return true;
  }
  function csv() {
    var r = compute('emi'); if (!r || cur !== 'emi') return;
    var t = '﻿Month,Instalment,Interest,Principal,Balance\r\n' + r.sched.map(function (x) { return [x.m, x.pay, x.interest, x.principal, x.balance].join(','); }).join('\r\n') + '\r\n';
    NS.saveFile(new Blob([t], { type: 'text/csv' }), 'emi-schedule-' + NS.today() + '.csv');
  }

  function wire() {
    root.addEventListener('input', function (e) { var f = e.target.getAttribute('data-f'); if (!f) return; vals[cur][f] = e.target.type === 'checkbox' ? (e.target.checked ? '1' : '') : e.target.value; refresh(); });
    root.addEventListener('change', function (e) { var f = e.target.getAttribute('data-f'); if (!f) return; vals[cur][f] = e.target.type === 'checkbox' ? (e.target.checked ? '1' : '') : e.target.value; refresh(); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cx]'); if (!b) return; var a = b.getAttribute('data-cx'), id = b.getAttribute('data-id');
      if (a === 'tab') { cur = b.getAttribute('data-k'); showAll = false; render(); try { history.replaceState(null, '', hash()); } catch (x) {} }
      else if (a === 'more') { showAll = !showAll; refresh(); }
      else if (a === 'csv') csv();
      else if (a === 'print') window.print();
      else if (a === 'link') {
        var u = url();
        (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { say(T('cx.copied')); }, function () { try { window.prompt(T('cx.copy'), u); } catch (x) {} });
      }
      else if (a === 'save') {
        var r = compute(cur); if (!r) { say(T('cx.fill')); return; }
        saved.unshift({ id: 'c' + Date.now().toString(36), kind: cur, at: new Date().toISOString(), sum: r.sum, hash: hash() }); saved = saved.slice(0, 60);
        persist().then(function () { render(); say(T('cx.saveddone')); });
      }
      else if (a === 'open') { var s = saved.filter(function (y) { return y.id === id; })[0]; if (s) { location.hash = s.hash; loadHash(); render(); } }
      else if (a === 'del') { saved = saved.filter(function (y) { return y.id !== id; }); persist().then(render); }
    });
    window.addEventListener('hashchange', function () { if (loadHash()) render(); });
    document.addEventListener('ns-lang', render);
  }
  function init() {
    root = $('#cx-tool'); if (!root) return;
    loadHash(); render(); wire();
    NSStore.ready().then(function () { return NSStore.meta('calcs'); }).then(function (m) { if (Array.isArray(m)) { saved = m; render(); } }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
