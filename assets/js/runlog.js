/* Runlog: the index page (/runlog/), a run's own page, the shared records, and the Movement plot on the homepage.
   Data: assets/data/runs/index.json (one summary per run) and <slug>.json / <slug>.map.json per run, built from a GPX by
   extras/runlog/build.mjs. The page that asks for it says where the index is (data-src). See docs/runlog.md. */
(function () {
  'use strict';
  var D = document;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var BAND = ['#7aa7c7', '#6bb58a', '#e0b84a', '#e07a3a', '#c93a3a'];
  var band = function (hr) { return hr < 115 ? 0 : hr < 130 ? 1 : hr < 145 ? 2 : hr < 160 ? 3 : 4; };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAL = {
    light: { land: '#f2f0e8', water: '#b6d4e4', canal: '#a3c8dc', paddy: '#dce8bd', green: '#c9ddb0', built: '#e9e5da', bldg: '#e8e1d2', wall: '#cdc5b3', minorC: '#d6d1c4', minor: '#fffefa', majorC: '#d9b765', major: '#fbe3a8', path: '#c9c3b4', label: '#5d6350', halo: '#f7f5ee', sky0: '#bfcbd3', sky1: '#e6e9e3', feet: '#17191e', trail: 'rgba(23,25,30,.25)' },
    dark: { land: '#1a221e', water: '#1b3040', canal: '#21394a', paddy: '#222f20', green: '#1d2d20', built: '#212823', bldg: '#38403a', wall: '#252b27', minorC: '#161c19', minor: '#343c37', majorC: '#2a2618', major: '#4d4730', path: '#2b332e', label: '#a6b2a0', halo: '#141a17', sky0: '#090d0b', sky1: '#17201b', feet: '#fff', trail: 'rgba(255,255,255,.3)' }
  };

  /* Dark or light is decided by the first solid background behind the element (a run's page is a cream card even in dark mode) */
  function isDark(from) {
    var n = from || D.body, c = null;
    while (n && n.nodeType === 1) { c = getComputedStyle(n).backgroundColor.match(/[\d.]+/g); if (c && !(c.length > 3 && +c[3] === 0)) break; c = null; n = n.parentElement; }
    c = (c || [255, 255, 255]).map(Number);
    return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 < 110;
  }
  function pace(s) { if (!s || !isFinite(s)) return '–'; s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function clock(s) { s = Math.round(s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + (s % 60)).slice(-2); }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function getJSON(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function where(src) { var u = src.split('?'); return { root: u[0].replace(/[^\/]*$/, ''), q: u[1] ? '?' + u[1] : '' }; }
  function nice(dateStr) { return new Date(dateStr + 'Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
  function short(dateStr) { return new Date(dateStr + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  function timeOfDay(dateStr) { var h = +dateStr.slice(11, 13), m = dateStr.slice(14, 16); return (h % 12 || 12) + ':' + m + (h < 12 ? ' am' : ' pm'); }

  /* ---- the overview map: OpenStreetMap shapes drawn once into a picture (it is shown smaller than it is drawn) ---- */
  function drawBase(cv, ppu, m, pal, labels, M, W, H) {
    cv.width = Math.ceil((W + 2 * m) * ppu); cv.height = Math.ceil((H + 2 * m) * ppu);
    var c = cv.getContext('2d'); c.setTransform(ppu, 0, 0, ppu, m * ppu, m * ppu);
    c.fillStyle = pal.land; c.fillRect(-m, -m, W + 2 * m, H + 2 * m);
    function fillSet(list, col) { c.fillStyle = col; list.forEach(function (rings) { c.beginPath(); rings.forEach(function (r) { c.moveTo(r[0], r[1]); for (var i = 2; i < r.length; i += 2) c.lineTo(r[i], r[i + 1]); c.closePath(); }); c.fill('evenodd'); }); }
    function lineSet(list, col, wd) { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); list.forEach(function (r) { c.moveTo(r[0], r[1]); for (var i = 2; i < r.length; i += 2) c.lineTo(r[i], r[i + 1]); }); c.stroke(); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    fillSet(M.poly.built, pal.built); fillSet(M.poly.green, pal.green); fillSet(M.poly.paddy, pal.paddy); fillSet(M.poly.water, pal.water);
    lineSet(M.lines.canal, pal.canal, 1.3); lineSet(M.lines.river, pal.water, 4);
    fillSet(M.poly.bldg, pal.bldg);
    lineSet(M.lines.path, pal.path, 0.5);
    lineSet(M.lines.minor, pal.minorC, 2.2); lineSet(M.lines.major, pal.majorC, 3.6);
    lineSet(M.lines.minor, pal.minor, 1.5); lineSet(M.lines.major, pal.major, 2.8);
    if (labels) { c.font = '600 15px Geist, system-ui, sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; M.places.forEach(function (p) { c.strokeStyle = pal.halo; c.strokeText(p[2], p[0], p[1]); c.fillStyle = pal.label; c.fillText(p[2], p[0], p[1]); }); }
    return cv;
  }

  /* ---- the chase cam: the real map shapes, drawn live in perspective, so they are sharp at any size.
     A camera behind and above the runner looks ahead along the path; only the shapes near the runner are drawn each frame ---- */
  function prep(M) {
    function box(a) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (var i = 0; i < a.length; i += 2) { if (a[i] < x0) x0 = a[i]; if (a[i] > x1) x1 = a[i]; if (a[i + 1] < y0) y0 = a[i + 1]; if (a[i + 1] > y1) y1 = a[i + 1]; } return [x0, y0, x1, y1]; }
    var S = { poly: {}, lines: {} };
    ['built', 'green', 'paddy', 'water', 'bldg'].forEach(function (k) {
      S.poly[k] = (M.poly[k] || []).map(function (rings) { var b = [1e9, 1e9, -1e9, -1e9]; rings.forEach(function (r) { var q = box(r); b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); }); return { r: rings, b: b }; });
    });
    ['canal', 'river', 'path', 'minor', 'major'].forEach(function (k) { S.lines[k] = (M.lines[k] || []).map(function (a) { return { p: a, b: box(a) }; }); });
    return S;
  }

  function Cam(cv, run, M, o) {
    var ctx = cv.getContext('2d'), N = run.x.length, w = 0, h = 0, dpr = 1, S = M ? prep(M) : null, ang = null, pal = PAL.dark;
    var pins = o.pins || [], maxDpr = o.maxDpr || 2;
    var TH = (o.pitch || 34) * Math.PI / 180, CT = Math.cos(TH), ST = Math.sin(TH), CH = 26, CB = 14, LYMIN = -CB - CH * Math.tan(TH) + 4;
    var F = 1, CX = 0, CY = 0, HY = 0, sx = 0, sy = 0, ss = 0, px = 0, py = 0, ca = 1, sa = 0, lx = 0, ly = 0;
    var CUM = [0], k;
    for (k = 1; k < N; k++) CUM.push(CUM[k - 1] + Math.hypot(run.x[k] - run.x[k - 1], run.y[k] - run.y[k - 1]));
    var flat = new Float32Array(N * 2); for (k = 0; k < N; k++) { flat[2 * k] = run.x[k]; flat[2 * k + 1] = run.y[k]; }
    var runs = [], s0 = 0;
    for (k = 1; k <= N; k++) if (k === N || band(run.hr[k]) !== band(run.hr[s0])) { var e = Math.min(k, N - 1); runs.push({ b: band(run.hr[s0]), a: s0, e: e, p: flat.subarray(2 * s0, 2 * e + 2) }); s0 = k; }
    var LX = [], LY = [], AX = [], AY = [], BX = [], BY = [], q = 1, ema = 0;

    function size() {
      dpr = Math.min(devicePixelRatio || 1, maxDpr); w = cv.clientWidth; h = cv.clientHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      var kk = (CH * CT - CB * ST) / (CB * CT + CH * ST); F = (0.6 * h) / (Math.tan(TH) + kk); CX = w / 2; HY = 0.2 * h; CY = HY + F * Math.tan(TH);
    }
    function proj(x, y, z) { var zc = (y + CB) * CT + (CH - z) * ST; if (zc < 1) zc = 1; ss = F / zc; sx = CX + x * ss; sy = CY - ((y + CB) * ST + (z - CH) * CT) * ss; }
    function loc(x, y) { var dx = x - px, dy = y - py; lx = -dx * sa + dy * ca; ly = dx * ca + dy * sa; if (ly < LYMIN) ly = LYMIN; }
    function near(b, r) { var dx = Math.max(b[0] - px, 0, px - b[2]), dy = Math.max(b[1] - py, 0, py - b[3]); return dx * dx + dy * dy < r * r; }
    function polys(list, r) {
      list.forEach(function (it) {
        if (!near(it.b, r)) return;
        it.r.forEach(function (ring) { for (var i = 0; i < ring.length; i += 2) { loc(ring[i], ring[i + 1]); proj(lx, ly, 0); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); } ctx.closePath(); });
      });
    }
    /* a polyline becomes a ribbon of world width wd, so it narrows toward the horizon like a road does */
    function ribbon(a, wd) {
      var n = a.length / 2, i, nx, ny, mx, my, d, dx, dy, ex, ey, hw = wd / 2;
      if (n < 2) return;
      for (i = 0; i < n; i++) { loc(a[2 * i], a[2 * i + 1]); LX[i] = lx; LY[i] = ly; }
      for (i = 0; i < n; i++) {
        mx = 0; my = 0;
        if (i > 0) { dx = LX[i] - LX[i - 1]; dy = LY[i] - LY[i - 1]; d = Math.hypot(dx, dy) || 1; mx += -dy / d; my += dx / d; }
        if (i < n - 1) { ex = LX[i + 1] - LX[i]; ey = LY[i + 1] - LY[i]; d = Math.hypot(ex, ey) || 1; mx += -ey / d; my += ex / d; }
        d = Math.hypot(mx, my) || 1; nx = mx / d; ny = my / d;
        var mit = Math.min(1.6, 1 / Math.max(0.55, i > 0 && i < n - 1 ? (nx * (-(LY[i + 1] - LY[i]) / (Math.hypot(LX[i + 1] - LX[i], LY[i + 1] - LY[i]) || 1)) + ny * ((LX[i + 1] - LX[i]) / (Math.hypot(LX[i + 1] - LX[i], LY[i + 1] - LY[i]) || 1))) : 1));
        proj(LX[i] + nx * hw * mit, LY[i] + ny * hw * mit, 0); AX[i] = sx; AY[i] = sy;
        proj(LX[i] - nx * hw * mit, LY[i] - ny * hw * mit, 0); BX[i] = sx; BY[i] = sy;
      }
      ctx.moveTo(AX[0], AY[0]); for (i = 1; i < n; i++) ctx.lineTo(AX[i], AY[i]);
      for (i = n - 1; i >= 0; i--) ctx.lineTo(BX[i], BY[i]);
      ctx.closePath();
    }
    function ribbons(list, r, wd) { list.forEach(function (it) { if (near(it.b, r)) ribbon(it.p, wd); }); }
    function fillAll(col, rule) { ctx.fillStyle = col; ctx.fill(rule || 'nonzero'); }

    function buildings(r) {
      var near3 = [];
      S.poly.bldg.forEach(function (it) { if (near(it.b, r)) { loc((it.b[0] + it.b[2]) / 2, (it.b[1] + it.b[3]) / 2); near3.push([ly, it]); } });
      near3.sort(function (a, b) { return b[0] - a[0]; });
      var BH = 1.05;
      near3.forEach(function (q) {
        var ring = q[1].r[0], n = ring.length / 2, i, bx = [], by = [], rx = [], ry = [];
        for (i = 0; i < n; i++) { loc(ring[2 * i], ring[2 * i + 1]); proj(lx, ly, 0); bx.push(sx); by.push(sy); proj(lx, ly, BH); rx.push(sx); ry.push(sy); }
        ctx.fillStyle = pal.wall;
        for (i = 0; i < n - 1; i++) { ctx.beginPath(); ctx.moveTo(bx[i], by[i]); ctx.lineTo(bx[i + 1], by[i + 1]); ctx.lineTo(rx[i + 1], ry[i + 1]); ctx.lineTo(rx[i], ry[i]); ctx.closePath(); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(rx[0], ry[0]); for (i = 1; i < n; i++) ctx.lineTo(rx[i], ry[i]); ctx.closePath(); ctx.fillStyle = pal.bldg; ctx.fill();
      });
    }
    function foot(wx, wy, a, side, alpha) {
      var c2 = Math.cos(a), s2 = Math.sin(a), ox = wx - s2 * side * 1.5, oy = wy + c2 * side * 1.5, i, t;
      ctx.globalAlpha = alpha; ctx.fillStyle = pal.feet;
      [[0, -0.86, 0.9, 1.43], [0, 1.05, 0.67, 0.76]].forEach(function (E) {
        ctx.beginPath();
        /* ex is across the way of travel, ey along it (negative is ahead) */
        for (i = 0; i < 10; i++) { t = i / 10 * 6.2832; var ex = E[0] + Math.cos(t) * E[2], ey = E[1] + Math.sin(t) * E[3]; loc(ox - ey * c2 - ex * s2, oy - ey * s2 + ex * c2); proj(lx, ly, 0.05); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }
        ctx.closePath(); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function draw(f, dark) {
      var T0 = performance.now();
      if (!w || !h) { size(); if (!w) return; }
      pal = PAL[dark ? 'dark' : 'light'];
      f = Math.max(0, Math.min(N - 1.001, f));
      var i = Math.floor(f), r = f - i, x = run.x[i] + (run.x[i + 1] - run.x[i]) * r, y = run.y[i] + (run.y[i + 1] - run.y[i]) * r;
      var a = Math.min(N - 1, i + 8), b = Math.max(0, i - 6), tgt = Math.atan2(run.y[a] - run.y[b], run.x[a] - run.x[b]);
      if (ang === null) ang = tgt; else { var d = Math.atan2(Math.sin(tgt - ang), Math.cos(tgt - ang)); ang += d * 0.06; }
      px = x; py = y; ca = Math.cos(ang); sa = Math.sin(ang);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      var g = ctx.createLinearGradient(0, 0, 0, HY + 4); g.addColorStop(0, pal.sky0); g.addColorStop(1, pal.sky1); ctx.fillStyle = g; ctx.fillRect(0, 0, w, HY + 4);
      ctx.fillStyle = pal.land; ctx.fillRect(0, HY, w, h - HY);
      ctx.lineJoin = 'round';
      if (S) {
        ctx.beginPath(); polys(S.poly.built, 230 * q); fillAll(pal.built); ctx.beginPath(); polys(S.poly.green, 230 * q); fillAll(pal.green); ctx.beginPath(); polys(S.poly.paddy, 230 * q); fillAll(pal.paddy);
        ctx.beginPath(); polys(S.poly.water, 260 * q); fillAll(pal.water, 'evenodd');
        ctx.beginPath(); ribbons(S.lines.canal, 200 * q, 1.5); fillAll(pal.canal); ctx.beginPath(); ribbons(S.lines.river, 260 * q, 5); fillAll(pal.water);
        ctx.beginPath(); ribbons(S.lines.path, 70 * q, 0.7); fillAll(pal.path);
        ctx.beginPath(); ribbons(S.lines.minor, 170 * q, 2.6); fillAll(pal.minorC); ctx.beginPath(); ribbons(S.lines.major, 230 * q, 4.4); fillAll(pal.majorC);
        ctx.beginPath(); ribbons(S.lines.minor, 170 * q, 1.7); fillAll(pal.minor); ctx.beginPath(); ribbons(S.lines.major, 230 * q, 3.3); fillAll(pal.major);
      }
      ctx.beginPath(); ribbon(flat, 1.4); fillAll(pal.trail);
      runs.forEach(function (q) {
        if (q.a > i) return;
        var arr = q.p;
        if (q.e > i) { var m = i - q.a + 1; arr = new Float32Array(2 * m + 2); for (var t = 0; t < 2 * m; t++) arr[t] = q.p[t]; arr[2 * m] = x; arr[2 * m + 1] = y; }
        ctx.beginPath(); ribbon(arr, 2.1); fillAll(BAND[q.b]);
      });
      if (S && q > 0.55) buildings(110 * q);
      /* a haze where the ground meets the sky, drawn over the far shapes */
      var hz = ctx.createLinearGradient(0, HY - 2, 0, HY + h * 0.3); hz.addColorStop(0, pal.sky1); hz.addColorStop(1, dark ? 'rgba(23,32,27,0)' : 'rgba(230,233,227,0)'); ctx.fillStyle = hz; ctx.fillRect(0, HY - 2, w, h * 0.3 + 2);
      /* footprints, one every few units along the path behind the runner */
      var STRIDE = 5, here = CUM[i] + r * (CUM[i + 1] - CUM[i]);
      for (var mIx = Math.floor(here / STRIDE), n = 0; mIx >= 0 && n < 10; mIx--, n++) {
        var dd = mIx * STRIDE, j = i; while (j > 0 && CUM[j] > dd) j--;
        var sg = (CUM[j + 1] - CUM[j]) || 1, u = (dd - CUM[j]) / sg;
        foot(run.x[j] + (run.x[j + 1] - run.x[j]) * u, run.y[j] + (run.y[j + 1] - run.y[j]) * u, Math.atan2(run.y[j + 1] - run.y[j], run.x[j + 1] - run.x[j]), mIx % 2 ? 1 : -1, Math.max(0, 1 - (here - dd) / (STRIDE * 10)) * 0.95);
      }
      ema = ema * 0.9 + (performance.now() - T0) * 0.1; if (ema > 14 && q > 0.4) { q -= 0.15; ema = 6; }
      pins.forEach(function (pn) {
        loc(pn.x, pn.y); if (ly < -5 || ly > 200) return; proj(lx, ly, 0); var bx = sx, by = sy, bs = ss; proj(lx, ly, 5); ctx.strokeStyle = '#17191e'; ctx.lineWidth = Math.max(1, bs * 0.35); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, Math.max(3, ss * 1.7), 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#17191e'; ctx.beginPath(); ctx.arc(sx, sy, Math.max(1.4, ss * 0.7), 0, 7); ctx.fill();
      });
    }
    size();
    return { draw: draw, size: size, snap: function () { ang = null; }, ang: function () { return ang === null ? 0 : ang; }, cum: CUM };
  }

  /* ---- the shared records, worked out from every run's summary ---- */
  function records(idx) {
    var byWeek = {}, days = {}, tot = 0, longest = null, fast = {};
    idx.forEach(function (r) {
      tot += r.km; if (!longest || r.km > longest.km) longest = r;
      [1, 5, 10, 21].forEach(function (k) { var v = r.best && r.best[k]; if (v && (!fast[k] || v < fast[k].v)) fast[k] = { v: v, slug: r.slug }; });
      var d = new Date(r.start.slice(0, 10) + 'T00:00:00Z'), dow = (d.getUTCDay() + 6) % 7, wk = new Date(d - dow * 864e5).toISOString().slice(0, 10);
      byWeek[wk] = (byWeek[wk] || 0) + r.km; days[r.start.slice(0, 10)] = 1;
    });
    var wkBest = null; Object.keys(byWeek).forEach(function (k) { if (!wkBest || byWeek[k] > wkBest.v) wkBest = { v: byWeek[k], wk: k }; });
    var ds = Object.keys(days).sort(), streak = 0, cur = 0, prev = null;
    ds.forEach(function (x) { var t = Date.parse(x); cur = prev !== null && t - prev === 864e5 ? cur + 1 : 1; prev = t; if (cur > streak) streak = cur; });
    return { total: tot, runs: idx.length, longest: longest, fast: fast, wkBest: wkBest, streak: streak, byWeek: byWeek };
  }
  function recordsBlock(idx, here) {
    var R = records(idx), cells = [];
    function cell(k, v, unit, hit) { cells.push('<div class="rl-rec' + (hit ? ' is-this' : '') + '"><dt>' + k + '</dt><dd>' + v + (unit ? '<small> ' + unit + '</small>' : '') + '</dd>' + (hit ? '<span class="rl-rec-tag">this run</span>' : '') + '</div>'); }
    cell('Total distance', R.total.toFixed(1), 'km'); cell('Runs', R.runs);
    cell('Longest run', R.longest.km.toFixed(2), 'km', here && R.longest.slug === here);
    if (R.fast[1]) cell('Fastest km', pace(R.fast[1].v), '/km', here && R.fast[1].slug === here);
    [5, 10, 21].forEach(function (k) { if (R.fast[k]) cell('Fastest ' + (k === 21 ? 'half' : k + 'K'), clock(R.fast[k].v), '', here && R.fast[k].slug === here); });
    cell('Biggest week', R.wkBest.v.toFixed(1), 'km'); cell('Longest streak', R.streak, R.streak === 1 ? 'day' : 'days');
    return '<section class="rl-records" aria-label="Runlog so far"><h2 class="rl-h">Runlog so far</h2><dl class="rl-recs">' + cells.join('') + '</dl></section>';
  }

  /* ---- the index page ---- */
  function renderIndex(host) {
    var src = host.getAttribute('data-src');
    getJSON(src).then(function (idx) {
      if (!idx.length) { host.innerHTML = '<p class="rl-wait">No runs yet.</p>'; return; }
      var R = records(idx), total = R.total, secs = idx.reduce(function (a, r) { return a + r.durationS; }, 0);
      var since = idx[idx.length - 1].start;
      var html = '<dl class="rl-stats"><div><dt>Runs</dt><dd>' + idx.length + '</dd></div><div><dt>Total</dt><dd>' + total.toFixed(1) + '<small> km</small></dd></div><div><dt>Longest</dt><dd>' + R.longest.km.toFixed(1) + '<small> km</small></dd></div><div><dt>Average pace</dt><dd>' + pace(secs / total) + '<small> /km</small></dd></div><div><dt>Since</dt><dd>' + short(since) + '</dd></div></dl>';
      var wks = Object.keys(R.byWeek).sort().slice(-12), mx = Math.max.apply(null, wks.map(function (k) { return R.byWeek[k]; }));
      html += '<div class="rl-progress"><div class="rl-panel"><h3>Distance per week, km</h3><div class="rl-bars">' + wks.map(function (k) { var v = R.byWeek[k]; return '<div class="rl-bar"><i style="height:' + Math.max(3, v / mx * 100) + '%"></i><b>' + v.toFixed(1) + '</b><span>' + new Date(k + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) + '</span></div>'; }).join('') + '</div></div>';
      var asc = idx.slice().reverse();
      html += '<div class="rl-panel"><h3>Pace per run</h3>' + (asc.length < 3 ? '<p class="rl-note">A line will be drawn here once there are three runs.</p>' : paceLine(asc)) + '</div></div>';
      html += recordsBlock(idx, null);
      html += '<h2 class="rl-h">Runs</h2><div class="rl-grid">' + idx.map(function (r) {
        return '<a class="rl-card" href="' + (host.getAttribute('data-runs-url') || '/runs/') + esc(r.slug) + '/"><span class="rl-meta">' + nice(r.start) + ' · ' + timeOfDay(r.start) + '</span><span class="rl-thumb">' + thumb(r) + '</span><h3>' + esc(r.title) + '</h3><span class="rl-row"><span><b>' + r.km.toFixed(2) + '</b> km</span><span><b>' + clock(r.durationS) + '</b></span><span><b>' + pace(r.paceS) + '</b>/km</span><span><b>' + r.hrAvg + '</b> bpm</span></span></a>';
      }).join('') + '</div>';
      host.innerHTML = html;
    }).catch(function () { host.innerHTML = '<p class="rl-wait">The runlog could not be loaded.</p>'; });
  }
  function thumb(r) {
    var t = r.thumb || [], d = 'M' + t[0] + ' ' + t[1]; for (var i = 2; i < t.length; i += 2) d += 'L' + t[i] + ' ' + t[i + 1];
    return '<svg viewBox="-30 -30 ' + (r.w + 60) + ' ' + (r.h + 60) + '" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  function paceLine(asc) {
    var v = asc.map(function (r) { return r.paceS; }), mn = Math.min.apply(null, v), mx = Math.max.apply(null, v) || 1;
    return '<svg class="rl-spark" viewBox="0 0 120 40"><polyline fill="none" stroke="#e07a3a" stroke-width="2" points="' + v.map(function (p, i) { return (i * 120 / (v.length - 1)) + ',' + (36 - (mx - p) / (mx - mn || 1) * 32); }).join(' ') + '"/></svg><p class="rl-note">' + pace(v[0]) + ' on the first run, ' + pace(v[v.length - 1]) + ' on the latest (per km).</p>';
  }

  /* ---- a run's own page ---- */
  function renderRun(host) {
    var slug = host.getAttribute('data-slug'), src = host.getAttribute('data-src'), W = where(src);
    Promise.all([getJSON(W.root + slug + '.json' + W.q), getJSON(src).catch(function () { return []; }), getJSON(W.root + slug + '.map.json' + W.q).catch(function () { return null; })]).then(function (res) {
      build(host, res[0], res[1], res[2]);
    }).catch(function () { host.innerHTML = '<p class="rl-wait">This run’s data could not be loaded.</p>'; });
  }
  function build(host, run, idx, M) {
    var S = run.summary, N = run.x.length, MT = run.mt, total = MT[N - 1], dark = isDark(host);
    var paceAt = function (i) { var j = i; while (j > 0 && run.t[i] - run.t[j] < 60) j--; var dd = run.d[i] - run.d[j]; return dd > 5 ? (run.t[i] - run.t[j]) / dd * 1000 : null; };
    var pc = run.x.map(function (_, i) { return paceAt(i); });
    var html = '<dl class="rl-stats"><div><dt>Distance</dt><dd>' + run.km.toFixed(2) + '<small> km</small></dd></div><div><dt>Time</dt><dd>' + clock(run.durationS) + '</dd></div><div><dt>Pace</dt><dd>' + pace(S.paceS) + '<small> /km</small></dd></div><div><dt>Heart rate</dt><dd>' + S.hrAvg + '<small> avg, ' + S.hrMax + ' max</small></dd></div><div><dt>Cadence</dt><dd>' + S.cadAvg + '<small> spm</small></dd></div></dl>';
    html += '<h2 class="rl-h">Watch the run</h2><div class="rl-replay" tabindex="0" aria-label="Replay of the run. Space plays and pauses, the arrow keys move a minute."><div class="rl-stage"><div class="rl-cam"><canvas></canvas><div class="rl-readout"><div><span>km</span><b data-r="km">0.00</b></div><div><span>time</span><b data-r="t">0:00</b></div><div><span>pace</span><b data-r="p">–</b></div><div><span>bpm</span><b data-r="hr">–</b></div></div><div class="rl-pop" hidden></div><div class="rl-chips" role="group" aria-label="Speed"></div><span class="rl-state">tap to play</span></div><div class="rl-side"><div class="rl-map" id="rl-map"></div><ul class="rl-legend"><li><i style="background:' + BAND[0] + '"></i>under 115</li><li><i style="background:' + BAND[1] + '"></i>115–129</li><li><i style="background:' + BAND[2] + '"></i>130–144</li><li><i style="background:' + BAND[3] + '"></i>145–159</li><li><i style="background:' + BAND[4] + '"></i>160+</li><li class="rl-u">bpm</li></ul>' + (M ? '<p class="rl-credit">Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a></p>' : '') + '</div></div><div class="rl-bar2"><div class="rl-line" role="slider" tabindex="-1" aria-label="Position in the run" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><span class="rl-clock"></span></div></div>';
    html += '<h2 class="rl-h">Pace, heart rate, cadence</h2><div class="rl-charts"><div class="rl-chart" data-c="p"><span>pace /km</span><canvas></canvas><i></i></div><div class="rl-chart" data-c="hr"><span>heart rate</span><canvas></canvas><i></i></div><div class="rl-chart" data-c="cad"><span>cadence</span><canvas></canvas><i></i></div></div>';
    html += '<h2 class="rl-h">Kilometre splits</h2><table class="rl-splits"><thead><tr><th>km</th><th>pace</th><th>bpm</th><th></th></tr></thead><tbody>' + (function () { var fs = run.splits.map(function (s) { return s.s / (s.part ? s.part / 1000 : 1); }), lo = Math.min.apply(null, fs), hi = Math.max.apply(null, fs); return run.splits.map(function (s, i) { return '<tr data-km="' + (s.part ? run.km : s.km) + '"><td>' + (s.part ? (s.km - 1 + s.part / 1000).toFixed(1) : s.km) + '</td><td>' + pace(fs[i]) + '</td><td>' + s.hr + '</td><td><i style="width:' + (100 - (fs[i] - lo) / (hi - lo || 1) * 70) + '%"></i></td></tr>'; }).join(''); })() + '</tbody></table>';
    html += recordsBlock(idx, run.slug);
    host.innerHTML = html;

    var pinsBy = run.pins || [], rep = $('.rl-replay', host), mapBox = $('#rl-map', host), mapSvg, cam = Cam($('canvas', rep), run, M, { pins: pinsBy });
    var line = $('.rl-line', rep), playLbl = $('.rl-state', rep), clk = $('.rl-clock', rep), pop = $('.rl-pop', rep), pos = 0, playing = false, speed = 120, last = 0, hold = 0;

    /* the overview map: the route faint, the part run so far strong, and where the runner is, facing the way they face */
    function drawOverview() {
      var d2 = isDark(host), url = '';
      if (M) url = drawBase(D.createElement('canvas'), 1.3, 200, PAL[d2 ? 'dark' : 'light'], true, M, run.w, run.h).toDataURL('image/png');
      var segs = '', cur = -1, d = '', all = '';
      for (var i = 0; i < N; i++) { var b = band(run.hr[i]); all += (i ? 'L' : 'M') + run.x[i] + ' ' + run.y[i]; if (b !== cur) { if (cur >= 0) segs += '<path d="' + d + '" stroke="' + BAND[cur] + '"/>'; cur = b; d = i ? 'M' + run.x[i - 1] + ' ' + run.y[i - 1] + 'L' + run.x[i] + ' ' + run.y[i] : 'M' + run.x[i] + ' ' + run.y[i]; } else d += 'L' + run.x[i] + ' ' + run.y[i]; }
      segs += '<path d="' + d + '" stroke="' + BAND[cur] + '"/>';
      var ends = '<circle cx="' + run.x[0] + '" cy="' + run.y[0] + '" r="12" fill="#1e8b4c" stroke="#fff" stroke-width="4"/><circle cx="' + run.x[N - 1] + '" cy="' + run.y[N - 1] + '" r="12" fill="#17191e" stroke="#fff" stroke-width="4"/>';
      var pins = pinsBy.map(function (p, n) { return '<g><circle cx="' + p.x + '" cy="' + p.y + '" r="15" fill="#fff" stroke="#17191e" stroke-width="4"/><text x="' + p.x + '" y="' + (p.y + 5) + '" text-anchor="middle" font-size="15" font-family="monospace" font-weight="600" fill="#17191e">' + (n + 1) + '</text></g>'; }).join('');
      mapBox.innerHTML = '<svg viewBox="-30 -30 ' + (run.w + 60) + ' ' + (run.h + 60) + '" role="img" aria-label="Map of the route, coloured by heart rate, with where the runner is now. Select a point to move the replay there."><defs><mask id="rl-mask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="' + (run.w + 400) + '" height="' + (run.h + 400) + '"><path class="rl-mp" d="' + all + '" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 999999"/></mask></defs>' + (url ? '<image x="-200" y="-200" width="' + (run.w + 400) + '" height="' + (run.h + 400) + '" preserveAspectRatio="none" href="' + url + '"/>' : '') + '<g fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.38">' + segs + '</g><g fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" mask="url(#rl-mask)">' + segs + '</g>' + ends + pins + '<g class="rl-here"><path d="M0 0 L-30 -70 A76 76 0 0 1 30 -70Z" fill="#e07a3a" opacity="0.38"/><circle r="12" fill="#e07a3a" stroke="#17191e" stroke-width="3.5"/></g></svg>';
      mapSvg = $('svg', mapBox);
    }
    drawOverview();
    mapBox.addEventListener('click', function (e) {
      var pt = mapSvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var q = pt.matrixTransform(mapSvg.getScreenCTM().inverse()), bi = 0, bd = 1e9;
      for (var i = 0; i < N; i++) { var dd = Math.hypot(run.x[i] - q.x, run.y[i] - q.y); if (dd < bd) { bd = dd; bi = i; } }
      seek(MT[bi]);
    });

    var chips = $('.rl-chips', rep);
    [60, 120, 300].forEach(function (v) { var b = el('button', v === speed ? 'on' : '', v + '×'); b.type = 'button'; b.onclick = function (e) { e.stopPropagation(); speed = v; $$('button', chips).forEach(function (x) { x.classList.toggle('on', x === b); }); }; chips.appendChild(b); });
    function idxAt(t) { var lo = 0, hi = N - 1; while (lo < hi) { var m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m; } return lo; }
    function frac(t) { var i = Math.max(1, idxAt(t)), a = MT[i - 1], b = MT[i]; return i - 1 + (b > a ? (t - a) / (b - a) : 0); }
    function show() {
      var f = frac(pos), i = Math.min(N - 1, Math.round(f));
      cam.draw(f, dark);
      $('[data-r=km]', rep).textContent = (run.d[i] / 1000).toFixed(2); $('[data-r=t]', rep).textContent = clock(run.t[i]); $('[data-r=p]', rep).textContent = pc[i] ? pace(pc[i]) : '–'; $('[data-r=hr]', rep).textContent = run.hr[i];
      clk.textContent = clock(pos) + ' / ' + clock(total);
      line.firstChild.style.width = (pos / total * 100) + '%'; line.setAttribute('aria-valuenow', Math.round(pos / total * 100));
      var i0 = Math.min(N - 2, Math.floor(f)), r0 = f - i0, hx = run.x[i0] + (run.x[i0 + 1] - run.x[i0]) * r0, hy = run.y[i0] + (run.y[i0 + 1] - run.y[i0]) * r0;
      var here = $('.rl-here', mapSvg); if (here) here.setAttribute('transform', 'translate(' + hx + ' ' + hy + ') rotate(' + (cam.ang() * 180 / Math.PI + 90) + ')');
      var mp = $('.rl-mp', mapSvg); if (mp) mp.setAttribute('stroke-dasharray', (cam.cum[i0] + r0 * (cam.cum[i0 + 1] - cam.cum[i0])) + ' 999999');
      $$('.rl-chart i', host).forEach(function (c) { c.style.left = 'calc(var(--lab) + (100% - var(--lab)) * ' + (pos / total) + ')'; });
      $$('.rl-splits tbody tr', host).forEach(function (r) { var k = +r.getAttribute('data-km'); r.classList.toggle('is-now', run.d[i] / 1000 > k - 1 && run.d[i] / 1000 <= k + 0.0001); });
    }
    function seek(t) { pos = Math.max(0, Math.min(total, t)); hold = 0; pop.hidden = true; cam.snap(); show(); }
    function tick(now) {
      if (!playing) { last = 0; return; }
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      if (hold > 0) { hold -= dt; if (hold <= 0) pop.hidden = true; } else {
        var np = pos + dt * speed;
        for (var n = 0; n < pinsBy.length; n++) if (pinsBy[n].mt > pos && pinsBy[n].mt <= np) { np = pinsBy[n].mt; hold = 3; pop.innerHTML = (pinsBy[n].src ? '<img src="' + esc(pinsBy[n].src) + '" alt="">' : '') + '<b>' + esc(pinsBy[n].title) + '</b><small>km ' + pinsBy[n].km + (pinsBy[n].credit ? ' · photo: ' + esc(pinsBy[n].credit) : '') + '</small>'; pop.hidden = false; break; }
        pos = np; if (pos >= total) { pos = total; playing = false; playLbl.textContent = 'tap to replay'; }
      }
      show(); requestAnimationFrame(tick);
    }
    function toggle() { playing = !playing; playLbl.textContent = playing ? 'tap to pause' : 'tap to play'; if (playing) { if (pos >= total) pos = 0; last = 0; requestAnimationFrame(tick); } }
    $('.rl-cam', rep).addEventListener('click', toggle);
    function lineSeek(e) { var r = line.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * total); }
    line.addEventListener('pointerdown', function (e) { lineSeek(e); line.setPointerCapture(e.pointerId); line.onpointermove = lineSeek; });
    line.addEventListener('pointerup', function () { line.onpointermove = null; });
    rep.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); toggle(); } else if (e.key === 'ArrowRight') { e.preventDefault(); seek(pos + 60); } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(pos - 60); } });
    $$('.rl-splits tbody tr', host).forEach(function (r) { r.style.cursor = 'pointer'; r.onclick = function () { var k = +r.getAttribute('data-km'), j = run.d.findIndex(function (v) { return v >= (k - 1) * 1000; }); seek(MT[Math.max(0, j)]); }; });
    new ResizeObserver(function () { cam.size(); show(); }).observe($('.rl-cam', rep));

    function charts() {
      $$('.rl-chart', host).forEach(function (box) {
        var cv = $('canvas', box), key = box.getAttribute('data-c'), vals = key === 'p' ? pc : key === 'hr' ? run.hr : run.cad;
        var dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight; if (!w) return; cv.width = w * dpr; cv.height = h * dpr;
        var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
        var ok = vals.filter(function (v) { return v != null; }).sort(function (a, b) { return a - b; }), lo = ok[Math.floor(ok.length * 0.02)], hi = ok[Math.floor(ok.length * 0.98)];
        c.strokeStyle = key === 'p' ? '#e07a3a' : key === 'hr' ? '#c93a3a' : '#6bb58a'; c.lineWidth = 1.6; c.beginPath(); var started = false;
        for (var i = 0; i < N; i++) { var v = vals[i]; if (v == null) continue; v = Math.max(lo, Math.min(hi, v)); var x = MT[i] / total * w, y = key === 'p' ? 4 + (v - lo) / (hi - lo || 1) * (h - 8) : h - 4 - (v - lo) / (hi - lo || 1) * (h - 8); if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); }
        c.stroke();
        box.onclick = function (e) { var r = box.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * total); };
      });
    }
    charts(); addEventListener('resize', charts);
    show();
    new MutationObserver(function () { var d2 = isDark(host); if (d2 !== dark) { dark = d2; drawOverview(); show(); } }).observe(D.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });
  }

  /* ---- the Movement plot on the homepage: the latest run, drawn live, is the whole card ---- */
  function renderBox(a) {
    var src = a.getAttribute('data-runs'); if (!src) return;
    var W = where(src), plot = a.closest('.plot');
    getJSON(src).then(function (idx) {
      if (!idx.length) return;
      var r = idx[0], host = plot || a;
      a.classList.add('is-runlog'); if (plot) plot.classList.add('is-takeover');
      var kind = $('.plot-page-kind', a), line = $('.plot-page-line', a), title = $('.plot-page-title', a);
      if (kind) kind.textContent = 'Runlog · ' + short(r.start);
      if (title) title.textContent = r.title;
      if (line) line.innerHTML = '<span>' + r.km.toFixed(2) + ' km</span><span>' + clock(r.durationS) + '</span><span>' + pace(r.paceS) + ' /km</span><span>' + r.hrAvg + ' bpm</span><span class="rl-so"></span>';
      host.insertAdjacentHTML('afterbegin', '<span class="rl-bg" aria-hidden="true">' + thumb(r) + '<canvas></canvas></span><span class="rl-shade" aria-hidden="true"></span>');
      var go = function () {
        Promise.all([getJSON(W.root + r.slug + '.json' + W.q), getJSON(W.root + r.slug + '.map.json' + W.q).catch(function () { return null; })]).then(function (res) {
          var run = res[0], cv = $('canvas', host), cam = Cam(cv, run, res[1], { maxDpr: 1.75 }), vis = true, f = 0, last = 0, N = run.x.length, so = $('.rl-so', a), still = reduced;
          new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(host);
          new ResizeObserver(function () { cam.size(); cam.draw(f, true); }).observe(host);
          if (still) { f = N * 0.4; cam.draw(f, true); host.classList.add('is-live'); return; }
          function loop(now) { requestAnimationFrame(loop); if (!vis || D.hidden) { last = 0; return; } if (last && now - last < 32) return; var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; f += dt * 13; if (f > N - 12) f = 0; cam.draw(f, true); if (so) so.textContent = (run.d[Math.floor(f)] / 1000).toFixed(1) + ' km so far'; }
          cam.draw(0, true); host.classList.add('is-live'); requestAnimationFrame(loop);
        }).catch(function () { /* the picture stays */ });
      };
      if (window.requestIdleCallback) requestIdleCallback(function () { setTimeout(go, 400); }); else setTimeout(go, 1500);
    }).catch(function () { /* the plain row stays */ });
  }

  function boot() {
    $$('.rl-index').forEach(renderIndex);
    $$('.rl-run').forEach(renderRun);
    $$('.plot-page[data-template="custom-runlog"]').forEach(renderBox);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
