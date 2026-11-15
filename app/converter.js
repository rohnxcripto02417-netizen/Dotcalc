(function () {
  var $ = function (id) { return document.getElementById(id); };
  var DC = window.DC, IC = window.IC;
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  /* ---------- unit tables (value of 1 unit in the base unit) ---------- */
  var T = {
    length: { m: 1, mm: .001, cm: .01, km: 1000, "in": .0254, ft: .3048, yd: .9144, mi: 1609.344 },
    mass: { kg: 1, mg: 1e-6, g: .001, t: 1000, oz: .028349523125, lb: .45359237, st: 6.35029318 },
    area: { "m²": 1, "mm²": 1e-6, "cm²": 1e-4, ha: 1e4, "km²": 1e6, "in²": 6.4516e-4, "ft²": .09290304, "yd²": .83612736, ac: 4046.8564224, "mi²": 2589988.110336 },
    time: { s: 1, ms: .001, min: 60, h: 3600, day: 86400, week: 604800, month: 2629746, year: 31556952 },
    data: { B: 1, bit: .125, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, PB: 1125899906842624 },
    volume: { L: 1, mL: .001, "m³": 1000, tsp: .00492892159375, tbsp: .01478676478125, "fl oz": .0295735295625, cup: .2365882365, pt: .473176473, qt: .946352946, gal: 3.785411784 },
    speed: { "m/s": 1, "km/h": 1 / 3.6, mph: .44704, kn: .514444444, "ft/s": .3048 },
    temp: { C: 1, F: 1, K: 1 }
  };
  var FXLIST = "USD EUR GBP INR BDT PKR NPR LKR JPY CNY KRW AUD CAD CHF SGD AED SAR MYR THB IDR TRY RUB BRL MXN ZAR NZD HKD SEK NOK DKK".split(" ");
  var FXDEF = { USD: 1, EUR: .86, GBP: .75, INR: 88, BDT: 122, PKR: 281, NPR: 141, LKR: 302, JPY: 150, CNY: 7.1, KRW: 1400, AUD: 1.52, CAD: 1.4, CHF: .8, SGD: 1.3,
    AED: 3.6725, SAR: 3.75, MYR: 4.2, THB: 33, IDR: 16500, TRY: 42, RUB: 82, BRL: 5.4, MXN: 18.5, ZAR: 17.5, NZD: 1.75, HKD: 7.78, SEK: 9.5, NOK: 10.2, DKK: 6.4 };
  var fx = FXDEF, fxNote = "Offline: approximate rates. Connect to the internet to update.";

  function toC(v, u) { return u === "F" ? (v - 32) * 5 / 9 : u === "K" ? v - 273.15 : v; }
  function fromC(c, u) { return u === "F" ? c * 9 / 5 + 32 : u === "K" ? c + 273.15 : c; }
  function convert(d, v, a, b) {
    if (d === "temp") return fromC(toC(v, a), b);
    if (d === "currency") return v / fx[a] * fx[b];
    return v * T[d][a] / T[d][b];
  }
  function fmtn(x, money) {
    if (!isFinite(x)) return "0";
    if (money) return (Math.round(x * 100) / 100).toFixed(2);
    var a = Math.abs(x);
    if (a !== 0 && (a >= 1e12 || a < 1e-6)) return x.toExponential(4);
    return String(+x.toPrecision(10));
  }

  var TOOLS = [
    ["currency", "Currency"], ["length", "Length"], ["mass", "Mass"], ["area", "Area"], ["time", "Time"], ["data", "Data"],
    ["discount", "Discount"], ["volume", "Volume"], ["numeral", "Numeral system"], ["speed", "Speed"], ["temp", "Temperature"], ["bmi", "BMI"], ["gst", "GST"]
  ];
  var DU = { currency: ["USD", "INR"], length: ["m", "ft"], mass: ["kg", "lb"], area: ["m²", "ft²"], time: ["h", "min"], data: ["MB", "KB"], volume: ["L", "gal"], speed: ["km/h", "mph"], temp: ["C", "F"] };
  var BASES = { b2: ["BIN", 2], b8: ["OCT", 8], b10: ["DEC", 10], b16: ["HEX", 16] };
  var st = null;

  function num(k) { var n = parseFloat(st.v[k]); return isNaN(n) ? 0 : n; }
  function opts(d) { return d === "currency" ? FXLIST : Object.keys(T[d]); }

  /* ---------- rows for each tool ---------- */
  function rows() {
    var d = st.id, r = [];
    if (T[d] || d === "currency") {
      r.push({ k: "a", label: "From", val: st.v.a || "0", input: 1, unit: "a" });
      r.push({ k: "b", label: "To", val: fmtn(convert(d, num("a"), st.u.a, st.u.b)), unit: "b" });
    } else if (d === "numeral") {
      var cur = st.v[st.act] || "", n = null;
      try { n = cur ? BigInt((st.act === "b2" ? "0b" : st.act === "b8" ? "0o" : st.act === "b16" ? "0x" : "") + cur) : 0n; } catch (e) { n = null; }
      Object.keys(BASES).forEach(function (k) {
        r.push({ k: k, label: BASES[k][0], input: 1, val: k === st.act ? (cur || "0") : (n === null ? "–" : n.toString(BASES[k][1]).toUpperCase()) });
      });
    } else if (d === "discount") {
      var p = num("p"), dc = num("d"), sv = p * dc / 100;
      r.push({ k: "p", label: "Original price", val: st.v.p || "0", input: 1 }, { k: "d", label: "Discount %", val: st.v.d || "0", input: 1 },
        { label: "You save", val: fmtn(sv, 1) }, { label: "Final price", val: fmtn(p - sv, 1) });
    } else if (d === "gst") {
      var a = num("amt"), g = num("rate"), add = st.m.mode !== "remove", net = add ? a : a / (1 + g / 100), gst = add ? a * g / 100 : a - net;
      r.push({ k: "amt", label: add ? "Price without GST" : "Price with GST", val: st.v.amt || "0", input: 1 }, { k: "rate", label: "GST rate %", val: st.v.rate || "0", input: 1 },
        { label: "GST", val: fmtn(gst, 1) }, { label: "CGST + SGST (each)", val: fmtn(gst / 2, 1) }, { label: add ? "Total price" : "Price without GST", val: fmtn(add ? a + gst : net, 1) });
    } else if (d === "bmi") {
      var im = st.m.unit === "imperial", w = num("w"), ht = num("hgt"), b = ht > 0 ? (im ? 703 * w / (ht * ht) : w / Math.pow(ht / 100, 2)) : 0;
      var cat = !b ? "–" : b < 18.5 ? "Underweight" : b < 25 ? "Normal" : b < 30 ? "Overweight" : "Obese";
      r.push({ k: "w", label: im ? "Weight (lb)" : "Weight (kg)", val: st.v.w || "0", input: 1 }, { k: "hgt", label: im ? "Height (in)" : "Height (cm)", val: st.v.hgt || "0", input: 1 },
        { label: "BMI", val: fmtn(b, 1) }, { label: "Category", val: cat, small: 1 });
    }
    return r;
  }
  function extras() {
    var d = st.id, out = [];
    if (d === "gst") {
      out.push({ chips: ["Add GST", "Remove GST"], on: st.m.mode === "remove" ? 1 : 0, fn: function (i) { st.m.mode = i ? "remove" : "add"; } });
      out.push({ chips: ["3", "5", "12", "18", "28"], on: ["3", "5", "12", "18", "28"].indexOf(st.v.rate), fn: function (i) { st.v.rate = ["3", "5", "12", "18", "28"][i]; } });
    }
    if (d === "bmi") out.push({ chips: ["Metric", "Imperial"], on: st.m.unit === "imperial" ? 1 : 0, fn: function (i) { st.m.unit = i ? "imperial" : "metric"; st.v.w = ""; st.v.hgt = ""; } });
    return out;
  }

  /* ---------- drawing ---------- */
  function draw() {
    var body = $("tBody"); body.innerHTML = "";
    rows().forEach(function (r) {
      var row = h("div", "frow" + (r.input ? "" : " res") + (r.input && r.k === st.act ? " on" : ""));
      row.appendChild(h("small", "", r.label));
      var b = h("b", "", r.val); if (r.small) b.style.font = "400 27px/1.4 Tiny5,monospace"; row.appendChild(b);
      if (r.unit) {
        var sel = h("select"); sel.setAttribute("aria-label", r.label + " unit");
        opts(st.id).forEach(function (o) { var op = h("option", "", o); op.value = o; if (o === st.u[r.unit]) op.selected = true; sel.appendChild(op); });
        sel.onchange = function () { st.u[r.unit] = sel.value; draw(); };
        sel.onclick = function (e) { e.stopPropagation(); };
        row.appendChild(sel);
      }
      if (r.input) row.onclick = function () { st.act = r.k; draw(); };
      body.appendChild(row);
    });
    extras().forEach(function (x) {
      var c = h("div", "chips");
      x.chips.forEach(function (t, i) {
        var b = h("button", "", t); b.setAttribute("aria-pressed", x.on === i);
        b.onclick = function () { DC.buzz(); x.fn(i); draw(); }; c.appendChild(b);
      });
      body.appendChild(c);
    });
    if (st.id === "currency") body.appendChild(h("p", "note", fxNote));
    if (st.id === "bmi") body.appendChild(h("p", "note", "BMI is a general guide only, not medical advice."));
    body.appendChild(keypad());
  }
  function keypad() {
    var kp = h("div", "kp"), hex = st.id === "numeral", swap = !!(T[st.id] || st.id === "currency");
    var L = hex ? [["7"], ["8"], ["9"], ["A"], ["4"], ["5"], ["6"], ["B"], ["1"], ["2"], ["3"], ["C"], ["0"], ["D"], ["E"], ["F"], ["⌫", "del", 2], ["C", "clr", 2]]
      : [["7"], ["8"], ["9"], ["⌫", "del"], ["4"], ["5"], ["6"], ["C", "clr"], ["1"], ["2"], ["3"], ["±", "neg"], ["0", "0", swap ? 2 : 3], [".", "."]].concat(swap ? [["", "swap"]] : []);
    var base = hex ? BASES[st.act][1] : 10;
    L.forEach(function (x) {
      var k = x[1] || x[0], b = h("button", x[2] ? "w" + x[2] : "", x[0]);
      if (k === "del") b.innerHTML = IC.bs; if (k === "del") b.style.fontSize = "28px";
      if (x[2] === 3) b.style.gridColumn = "span 3";
      if (k === "clr" || k === "del" || k === "swap") b.style.color = "var(--accent)";
      if (k === "swap") { b.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/></svg>'; b.style.background = "var(--accent)"; b.style.color = "var(--on-accent)"; b.setAttribute("aria-label", "Swap units"); }
      if (hex && /^[0-9A-F]$/.test(k) && parseInt(k, 16) >= base) b.disabled = true;
      if (k === "neg" && st.id !== "temp") b.disabled = true;
      if (k === "." && hex) b.disabled = true;
      b.onclick = function () { key(k); };
      kp.appendChild(b);
    });
    return kp;
  }
  function key(k) {
    DC.buzz();
    if (k === "swap") { var t = st.u.a; st.u.a = st.u.b; st.u.b = t; return draw(); }
    var a = st.act, v = st.v[a] || "";
    if (k === "del") v = v.slice(0, -1);
    else if (k === "clr") v = "";
    else if (k === "neg") v = v[0] === "-" ? v.slice(1) : "-" + v;
    else if (k === ".") { if (v.indexOf(".") < 0) v = (v === "" || v === "-") ? v + "0." : v + "."; }
    else if (v.replace(/[-.]/g, "").length < 12) v = (v === "0" || v === "") ? k : v + k;
    st.v[a] = v; draw();
  }
  function open(id) {
    st = { id: id, v: {}, m: {}, u: DU[id] ? { a: DU[id][0], b: DU[id][1] } : {}, act: id === "numeral" ? "b10" : id === "discount" ? "p" : id === "gst" ? "amt" : id === "bmi" ? "w" : "a" };
    if (id === "gst") st.v.rate = "18";
    $("tTitle").textContent = TOOLS.filter(function (t) { return t[0] === id; })[0][1];
    DC.showView("tool"); draw();
    if (id === "currency") loadFx();
  }
  function loadFx() {
    try { var c = JSON.parse(DC.store("dotcalc-fx")); if (c && c.r) { fx = c.r; fxNote = "Rates from " + c.d + ". Updating…"; draw(); } } catch (e) {}
    if (!window.fetch) return;
    fetch("https://open.er-api.com/v6/latest/USD").then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.rates) throw 0;
      var r = {}; FXLIST.forEach(function (c) { r[c] = j.rates[c] || FXDEF[c]; });
      fx = r; var d = new Date().toLocaleDateString(); fxNote = "Live rates updated " + d + ".";
      DC.store("dotcalc-fx", JSON.stringify({ r: r, d: d }));
      if (st && st.id === "currency") draw();
    }).catch(function () {
      fxNote = fxNote.indexOf("Rates from") === 0 ? fxNote.replace("Updating…", "Offline, using saved rates.") : "Offline: approximate rates. Connect to the internet to update.";
      if (st && st.id === "currency") draw();
    });
  }

  var g = $("cgrid");
  TOOLS.forEach(function (t) {
    var b = h("button"); b.innerHTML = IC[t[0]] || ""; b.appendChild(h("span", "", t[1]));
    b.onclick = function () { DC.buzz(); open(t[0]); }; g.appendChild(b);
  });
  $("tBack").onclick = function () { DC.buzz(); DC.showView("conv"); };
  window.DC._c = { open: open, convert: convert, fmtn: fmtn };
})();
