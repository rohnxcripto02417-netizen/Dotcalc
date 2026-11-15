(function () {
  var $ = function (id) { return document.getElementById(id); };
  var eEl = $("expr"), vEl = $("val");
  var s = "", fresh = false, err = false, deg = true, mem = 0, ans = 0, hist = [];

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  /* ---------- settings ---------- */
  var ACC = { orange: ["#E8750A", "#F0851A"], blue: ["#2B50F0", "#6F8BFF"], green: ["#0F8A4F", "#4FD08A"], pink: ["#D6246E", "#FF6FA8"] };
  var DEF = { sci: "off", sep: "off", keep: "off", theme: "dark", accent: "orange", size: "normal", dec: "auto", angle: "deg", haptics: "on", sound: "off" };
  var cfg = {};
  (function () {
    var o = {}; try { o = JSON.parse(store("dotcalc-cfg")) || {}; } catch (e) {}
    for (var k in DEF) cfg[k] = o[k] || DEF[k];
  })();
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null, ac;
  function tick() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 900; g.gain.value = 0.04; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.015);
    } catch (e) {}
  }
  function buzz() {
    if (cfg.haptics === "on") { try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) {} }
    if (cfg.sound === "on") tick();
  }
  function apply() {
    var dark = cfg.theme === "dark" || (cfg.theme === "auto" && mq && mq.matches);
    var r = document.documentElement;
    r.dataset.theme = dark ? "dark" : "light"; r.dataset.size = cfg.size;
    r.style.setProperty("--accent", ACC[cfg.accent][dark ? 1 : 0]);
    deg = cfg.angle === "deg";
    var on = cfg.sci === "on";
    $("sci").hidden = $("mem").hidden = !on;
    $("bExp").innerHTML = on ? IC.col : IC.exp;
    document.querySelectorAll(".seg[data-s]").forEach(function (g) {
      [].forEach.call(g.children, function (b) { b.setAttribute("aria-pressed", cfg[g.dataset.s] === b.dataset.v); });
    });
    render();
  }
  function save() { store("dotcalc-cfg", JSON.stringify(cfg)); }
  function saveHist() { store("dotcalc-hist", cfg.keep === "on" ? JSON.stringify(hist) : "[]"); }

  /* ---------- math engine ---------- */
  function fmt(v) {
    var r = cfg.dec === "auto" ? +v.toPrecision(12) : +v.toFixed(+cfg.dec);
    return String(r).replace("e", "E");
  }
  function rad(x) { return deg ? x * Math.PI / 180 : x; }
  function fact(n) {
    if (n < 0 || n !== Math.floor(n) || n > 170) throw 0;
    for (var r = 1, i = 2; i <= n; i++) r *= i;
    return r;
  }
  var FN = {
    sin: function (x) { return Math.sin(rad(x)); }, cos: function (x) { return Math.cos(rad(x)); },
    tan: function (x) { if (deg && Math.abs(x % 180) === 90) throw 0; return Math.tan(rad(x)); },
    ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs
  };
  function evaluate(str) {
    var t = str.match(/\d+\.?\d*(?:E[+-]?\d+)?|\.\d+(?:E[+-]?\d+)?|sin|cos|tan|ln|log|sqrt|abs|pi|e|[-+*\/^!%()]/g) || [];
    if (!t.length || t.join("") !== str) throw 0;
    var i = 0;
    function peek() { return t[i]; }
    function expr() {
      var v = term();
      while (peek() === "+" || peek() === "-") v = t[i++] === "+" ? v + term() : v - term();
      return v;
    }
    function term() {
      var v = unary();
      for (;;) {
        var p = peek();
        if (p === "*" || p === "/") {
          i++; var r = unary();
          if (p === "/" && r === 0) throw 0;
          v = p === "*" ? v * r : v / r;
        } else if (p !== undefined && (/^[\d.a-z]/.test(p) || p === "(")) v *= unary();
        else return v;
      }
    }
    function unary() {
      if (peek() === "-") { i++; return -unary(); }
      if (peek() === "+") { i++; return unary(); }
      return pow();
    }
    function pow() { var b = post(); if (peek() === "^") { i++; return Math.pow(b, unary()); } return b; }
    function post() {
      var v = prim();
      while (peek() === "!" || peek() === "%") v = t[i++] === "!" ? fact(v) : v / 100;
      return v;
    }
    function prim() {
      var p = t[i++];
      if (p === undefined) throw 0;
      if (p === "(") { var v = expr(); if (peek() === ")") i++; return v; }
      if (/^[\d.]/.test(p)) return parseFloat(p);
      if (p === "pi") return Math.PI;
      if (p === "e") return Math.E;
      if (FN[p]) {
        if (t[i++] !== "(") throw 0;
        var a = expr(); if (peek() === ")") i++;
        return FN[p](a);
      }
      throw 0;
    }
    var out = expr();
    if (i < t.length || !isFinite(out)) throw 0;
    return Math.abs(out) < 1e-12 ? 0 : out;
  }
  function tryEval(str) { try { return evaluate(str); } catch (e) { return null; } }
  function trim(str) { return str.replace(/[-+*\/^(]+$/, ""); }
  function isNum(str) { return /^-?(\d+\.?\d*|\.\d+)(E[+-]?\d+)?$/.test(str); }
  function pretty(x) {
    return x.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−").replace(/pi/g, "π").replace(/sqrt\(/g, "√(");
  }
  function current() {
    if (err) return "Error";
    if (!s) return "0";
    if (isNum(s)) return s;
    var v = tryEval(trim(s));
    return v === null ? "0" : fmt(v);
  }
  function group(t) {
    if (cfg.sep !== "on" || /E/.test(t) || !isNum(t)) return t;
    var p = t.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }

  /* ---------- display ---------- */
  function fit() {
    eEl.style.fontSize = "";
    var f = parseFloat(getComputedStyle(eEl).fontSize), max = eEl.clientWidth;
    while (f > 18 && eEl.scrollWidth > max) { f -= 9; eEl.style.fontSize = f + "px"; }
    if (eEl.scrollWidth > max) eEl.style.fontSize = Math.max(12, f * max / eEl.scrollWidth) + "px";
  }
  function drawStrip() {
    var h = $("hist"); h.innerHTML = "";
    hist.slice(0, 4).reverse().forEach(function (it) {
      var b = document.createElement("button"); b.textContent = it.e + it.r; b.setAttribute("aria-label", "Use result " + it.r);
      b.onclick = function () { put(it.r); render(); }; h.appendChild(b);
    });
  }
  function render() {
    if (err) eEl.textContent = "Error";
    else if (fresh) eEl.textContent = group(s);
    else eEl.textContent = s ? pretty(s) : "0";
    var pv = (!err && !fresh && s && !isNum(s)) ? tryEval(trim(s)) : null;
    vEl.textContent = pv === null ? "" : "= " + group(fmt(pv));
    $("mr").classList.toggle("on", mem !== 0);
    drawStrip(); fit();
  }

  /* ---------- input ---------- */
  var last = function () { return s.slice(-1); };
  function put(x) {
    if (err) { s = ""; err = false; }
    if (fresh) { if (!/^[-+*\/^!%]/.test(x)) s = ""; fresh = false; }
    s += x;
  }
  function press(k) {
    buzz();
    if (/^\d$/.test(k)) { if ((s.match(/[\d.]*$/)[0] || "").length < 15) put(k); }
    else if (k === ".") {
      var seg = fresh || err ? "" : s.match(/[\d.]*$/)[0];
      if (seg.indexOf(".") < 0) put(seg ? "." : "0.");
    }
    else if ("+-*/^".indexOf(k) > -1 && k.length === 1) {
      if (fresh && !err) fresh = false;
      if (err) { s = ""; err = false; }
      if (!s) s = k === "-" ? "-" : "0" + k;
      else if (/[-+*\/^]$/.test(s)) {
        if (k === "-" && /[*\/^]$/.test(s)) s += k; else s = s.replace(/[-+*\/^]+$/, "") + k;
      } else if (last() === "(") { if (k === "-") s += k; }
      else s += k;
    }
    else if (k === "(" || /\($/.test(k) || k === "pi" || k === "e") put(k);
    else if (k === ")") {
      var o = (s.match(/\(/g) || []).length, c = (s.match(/\)/g) || []).length;
      if (o > c && /[\d)ie]$/.test(s)) s += ")";
    }
    else if (k === "!" || k === "%") { if (/[\d)ie]$/.test(s)) { fresh = false; s += k; } }
    else if (k === "sq") { if (s) { fresh = false; s += "^2"; } }
    else if (k === "inv") { s = "1/(" + (s || "0") + ")"; fresh = false; err = false; }
    else if (k === "neg") {
      if (!s) s = "-";
      else if (/^-\(.*\)$/.test(s)) s = s.slice(2, -1);
      else if (/^-[\d.]+$/.test(s)) s = s.slice(1);
      else s = "-(" + s + ")";
      fresh = false;
    }
    else if (k === "AC") { s = ""; err = false; fresh = false; }
    else if (k === "DEL") {
      if (err || fresh) { s = ""; err = false; fresh = false; }
      else s = s.replace(/(sin\(|cos\(|tan\(|ln\(|log\(|sqrt\(|abs\(|pi|e|.)$/, "");
    }
    else if (k === "=") {
      if (!s || err || fresh) return render();
      var v = tryEval(s);
      if (v === null) { err = true; s = ""; }
      else {
        var r = fmt(v);
        hist.unshift({ e: pretty(s) + "= ", r: r }); hist = hist.slice(0, 30); saveHist();
        s = r; ans = v; fresh = true;
      }
    }
    else if (k === "mc") mem = 0;
    else if (k === "mr") put(fmt(mem));
    else if (k === "m+" || k === "m-") {
      var m = tryEval(trim(s));
      if (m !== null) mem += k === "m+" ? m : -m;
    }
    render();
  }
  document.querySelector(".keys").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (b && b.dataset.k) press(b.dataset.k);
  });
  vEl.onclick = function () {
    var txt = current();
    try { navigator.clipboard.writeText(txt).then(function () { flash("Copied"); }, function () { flash("Copy blocked"); }); } catch (e) { flash("Copy blocked"); }
  };
  function flash(m) { var o = vEl.textContent; vEl.textContent = m; setTimeout(function () { vEl.textContent = o; render(); }, 900); }

  /* ---------- views, menu, sheets ---------- */
  function showView(v) {
    $("vCalc").hidden = v !== "calc"; $("vConv").hidden = v !== "conv"; $("vTool").hidden = v !== "tool"; $("top").hidden = v === "tool";
    $("tCalc").setAttribute("aria-pressed", v === "calc"); $("tConv").setAttribute("aria-pressed", v === "conv");
    $("menu").hidden = true; window.scrollTo(0, 0); if (v === "calc") render();
  }
  function openSheet(id) { ["sheet", "setSheet", "aboutSheet"].forEach(function (n) { $(n).hidden = n !== id; }); $("menu").hidden = true; }
  function drawHist() {
    var l = $("list"); l.innerHTML = "";
    if (!hist.length) { var p = document.createElement("p"); p.textContent = "No calculations yet"; l.appendChild(p); return; }
    hist.forEach(function (h) {
      var b = document.createElement("button"); b.className = "item";
      var a = document.createElement("span"); a.className = "ie"; a.textContent = h.e;
      var r = document.createElement("span"); r.className = "ir"; r.textContent = h.r;
      b.appendChild(a); b.appendChild(r);
      b.onclick = function () { put(h.r); openSheet(""); showView("calc"); };
      l.appendChild(b);
    });
  }
  $("tCalc").onclick = function () { showView("calc"); };
  $("tConv").onclick = function () { showView("conv"); };
  $("kConv").onclick = function () { buzz(); showView("conv"); };
  $("bExp").onclick = function () { cfg.sci = cfg.sci === "on" ? "off" : "on"; save(); apply(); };
  $("bMenu").onclick = function (e) { e.stopPropagation(); $("menu").hidden = !$("menu").hidden; };
  document.addEventListener("click", function (e) { if (!e.target.closest("#menu")) $("menu").hidden = true; });
  $("mHist").onclick = function () { drawHist(); openSheet("sheet"); };
  $("mSet").onclick = function () { openSheet("setSheet"); };
  $("mAbout").onclick = function () { openSheet("aboutSheet"); };
  ["hClose", "sClose", "aClose"].forEach(function (i) { $(i).onclick = function () { openSheet(""); }; });
  $("hClear").onclick = function () { hist = []; saveHist(); drawHist(); render(); };
  $("sReset").onclick = function () { for (var k in DEF) cfg[k] = DEF[k]; save(); apply(); };
  document.querySelectorAll(".seg[data-s]").forEach(function (g) {
    g.onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      cfg[g.dataset.s] = b.dataset.v; save(); saveHist(); apply();
    };
  });
  $("kDel").innerHTML = IC.bs; $("kConv").innerHTML = IC.conv; $("bMenu").innerHTML = IC.kebab; $("tBack").innerHTML = IC.back;

  var KEYS = { Enter: "=", "=": "=", Backspace: "DEL", Escape: "AC", Delete: "AC", ",": ".", x: "*", X: "*", p: "pi", s: "sin(", c: "cos(", t: "tan(", l: "ln(", r: "sqrt(", e: "e" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || $("vCalc").hidden || document.querySelector(".sheet:not([hidden])")) return;
    var k = KEYS[e.key] || e.key;
    if (/^(\d|\.|[-+*\/^()!%]|=|DEL|AC|pi|e|sin\(|cos\(|tan\(|ln\(|sqrt\()$/.test(k)) { e.preventDefault(); press(k); }
  });

  if (mq && mq.addEventListener) mq.addEventListener("change", apply);
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  if (cfg.keep === "on") { try { hist = JSON.parse(store("dotcalc-hist")) || []; } catch (e) { hist = []; } }
  window.DC = { cfg: cfg, store: store, buzz: buzz, showView: showView };
  window.DC._t = { press: press, state: function () { return { s: s, err: err, fresh: fresh, expr: eEl.textContent, val: vEl.textContent }; }, evaluate: tryEval };
  apply();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
