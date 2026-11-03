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

  /* photos within 0.35 km of each other are one pin */
  function makeGroups(pins) {
    var groups = [];
    pins.forEach(function (p, i) { p._i = i; var g = groups[groups.length - 1]; if (g && p.km - g.items[g.items.length - 1].km <= 0.35) g.items.push(p); else groups.push({ items: [p] }); });
    groups.forEach(function (g, n) { g.n = n; g.x = g.items[0].x; g.y = g.items[0].y; g.mt = g.items[0].mt; g.km = g.items[0].km; });
    return groups;
  }

  function Cam(cv, run, M, o) {
    var ctx = cv.getContext('2d'), N = run.x.length, w = 0, h = 0, dpr = 1, S = M ? prep(M) : null, ang = null, pal = PAL.dark;
    var pins = o.pins || [], maxDpr = o.maxDpr || 2; pins.forEach(function (g) { g.items.forEach(function (p) { if (!p._img && (p.thumb || p.src)) { p._img = new Image(); p._img.src = p.thumb || p.src; } }); });
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
    function tri(img, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2) {
      var d = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1); if (!d) return;
      var A = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / d, B = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / d,
        C = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / d, Dd = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / d,
        E = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / d, Fv = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / d;
      var cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
      function out(x, y) { var dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + dx / l * 0.6, y + dy / l * 0.6]; }
      var p0 = out(x0, y0), p1 = out(x1, y1), p2 = out(x2, y2);
      ctx.save(); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath(); ctx.clip(); ctx.transform(A, B, C, Dd, E, Fv); ctx.drawImage(img, 0, 0); ctx.restore();
    }
    function P3(x, y, z) { loc(x, y); proj(lx, ly, z); return [sx, sy, ss]; }
    function floater(p, cxw, cyw, dx, dy, W, Hh, z0, alpha) {
      var ax = cxw - dx * W / 2, ay = cyw - dy * W / 2, bx = cxw + dx * W / 2, by = cyw + dy * W / 2, z1 = z0 + Hh, G = 6, i, jx, V = [];
      var TL = P3(ax, ay, z1), TR = P3(bx, by, z1), BL = P3(ax, ay, z0), BR = P3(bx, by, z0);
      if ((TR[0] - TL[0]) * (BL[1] - TL[1]) - (TR[1] - TL[1]) * (BL[0] - TL[0]) <= 0) return null;
      var img = p._img; if (!img || !img.complete || !img.naturalWidth) return { TL: TL, BL: BL, BR: BR };
      var iw = img.naturalWidth, ih = img.naturalHeight;
      ctx.globalAlpha = alpha;
      for (i = 0; i <= G; i++) { V[i] = []; for (jx = 0; jx <= G; jx++) V[i][jx] = P3(ax + (bx - ax) * i / G, ay + (by - ay) * i / G, z1 - Hh * jx / G); }
      for (i = 0; i < G; i++) for (jx = 0; jx < G; jx++) {
        var a = V[i][jx], b = V[i + 1][jx], c = V[i][jx + 1], d = V[i + 1][jx + 1], u0 = iw * i / G, u1 = iw * (i + 1) / G, v0 = ih * jx / G, v1 = ih * (jx + 1) / G;
        tri(img, a[0], a[1], b[0], b[1], c[0], c[1], u0, v0, u1, v0, u0, v1); tri(img, b[0], b[1], d[0], d[1], c[0], c[1], u1, v0, u1, v1, u0, v1);
      }
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * alpha) + ')'; ctx.lineWidth = Math.max(1, TL[2] * 0.22); ctx.beginPath(); ctx.moveTo(TL[0], TL[1]); ctx.lineTo(TR[0], TR[1]); ctx.lineTo(BR[0], BR[1]); ctx.lineTo(BL[0], BL[1]); ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 1; return { TL: TL, BL: BL, BR: BR };
    }
    function floaters(tnow) {
      var list = [];
      pins.forEach(function (g) {
        if (!g.geo) { var bi = 0, bd = 1e9, i; for (i = 0; i < N; i++) { var dd = (run.x[i] - g.x) * (run.x[i] - g.x) + (run.y[i] - g.y) * (run.y[i] - g.y); if (dd < bd) { bd = dd; bi = i; } } var a = Math.min(N - 1, bi + 4), b = Math.max(0, bi - 4); g.geo = { ang: Math.atan2(run.y[a] - run.y[b], run.x[a] - run.x[b]), side: g.n % 2 ? 1 : -1 }; }
        loc(g.x, g.y); if (ly < -6 || ly > 135) return; list.push([ly, g]);
      });
      list.sort(function (a, b) { return b[0] - a[0]; });
      list.forEach(function (q) {
        var g = q[1], dist = q[0], a = g.geo.ang, side = g.geo.side, c = Math.cos(a), s = Math.sin(a), rxv = -s, ryv = c, off = 8;
        var alpha = 0.9 * Math.max(0, Math.min(1, (135 - dist) / 50)) * Math.max(0, Math.min(1, (dist + 2) / 12)); if (alpha <= 0.02) return;
        var bx = g.x + rxv * side * off, by = g.y + ryv * side * off;
        /* each photo turns toward the runner, a little off square so it reads as hanging in the scene */ var cdx = px - bx, cdy = py - by, cl = Math.hypot(cdx, cdy) || 1, yaw = -side * 0.45; cdx /= cl; cdy /= cl; var nx = cdx * Math.cos(yaw) - cdy * Math.sin(yaw), ny = cdx * Math.sin(yaw) + cdy * Math.cos(yaw), wx = ny, wy = -nx, m = g.items.length;
        var z0 = 2.3 + (reduced ? 0 : 0.3 * Math.sin(tnow * 1.1 + g.n * 1.7)), first = null;
        /* a soft shadow on the ground under them */
        var sh = P3(bx, by, 0); ctx.fillStyle = 'rgba(0,0,0,' + (0.12 * alpha) + ')'; ctx.beginPath();
        for (var k0 = 0; k0 < 12; k0++) { var tt = k0 / 12 * 6.2832, qq = P3(bx + Math.cos(tt) * 3.2 * m * 0.8, by + Math.sin(tt) * 2.2, 0); if (k0) ctx.lineTo(qq[0], qq[1]); else ctx.moveTo(qq[0], qq[1]); } ctx.closePath(); ctx.fill();
        g.items.forEach(function (p, k) {
          var im = p._img, ar = im && im.naturalWidth ? im.naturalWidth / im.naturalHeight : 1.33, Wp = ar >= 1 ? 6 : 6 * ar, Hp = ar >= 1 ? 6 / ar : 6;
          var fold = m > 1 ? (k % 2 ? 0.2 : -0.2) : 0, ca = Math.cos(fold), sa = Math.sin(fold), dxk = wx * ca - wy * sa, dyk = wx * sa + wy * ca, along = m > 1 ? (k - (m - 1) / 2) * 5.2 : 0;
          var r = floater(p, bx + wx * along, by + wy * along, dxk, dyk, Wp, Hp, z0 + (m > 1 && k % 2 ? 0.35 : 0), alpha); if (r && !first) first = r;
        });
        if (first) { var mx = (first.BL[0] + first.BR[0]) / 2, my = (first.BL[1] + first.BR[1]) / 2 + Math.max(5, first.BL[2] * 0.9), rr = Math.max(3.5, first.BL[2] * 0.55); ctx.globalAlpha = alpha; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx, my, rr, 0, 7); ctx.fill(); if (rr >= 5.5) { ctx.fillStyle = '#17191e'; ctx.font = '600 ' + Math.round(rr * 1.2) + 'px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(g.n + 1), mx, my + rr * 0.42); } ctx.globalAlpha = 1; }
      });
    }
    /* a circle on the ground, in world units, as a path */
    function disc(wx, wy, rad) { for (var k = 0; k < 28; k++) { var t = k / 28 * 6.2832; loc(wx + Math.cos(t) * rad, wy + Math.sin(t) * rad); proj(lx, ly, 0.05); if (k) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); } ctx.closePath(); }
    /* the runner: a soft ring on the ground that breathes, a ripple that spreads and fades, and a faint shadow */
    function ring(x, y, tnow) {
      var ph = reduced ? 0.35 : (tnow * 0.8) % 1, ac = '224,122,58';
      ctx.beginPath(); disc(x + 0.5, y + 0.4, 3); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
      ctx.beginPath(); disc(x, y, 2); ctx.fillStyle = 'rgba(' + ac + ',0.16)'; ctx.fill();
      loc(x, y); proj(lx, ly, 0.05); var u = ss;
      ctx.beginPath(); disc(x, y, 2.05 + 0.25 * Math.sin(ph * 6.2832)); ctx.strokeStyle = 'rgba(' + ac + ',0.95)'; ctx.lineWidth = Math.max(2, u * 0.45); ctx.stroke();
      ctx.beginPath(); disc(x, y, 2.4 + ph * 4.2); ctx.strokeStyle = 'rgba(' + ac + ',' + (0.5 * (1 - ph)) + ')'; ctx.lineWidth = Math.max(1.2, u * 0.3 * (1 - ph * 0.5)); ctx.stroke();
    }
    /* the part of the route already run, strongest near the runner and fading behind */
    function travelled(i, x, y, here, back, alpha, wd) {
      var si = 0; if (isFinite(back)) { si = i; while (si > 0 && CUM[si] > here - back) si--; }
      ctx.globalAlpha = alpha;
      runs.forEach(function (q) {
        if (q.a > i || q.e < si) return;
        var a0 = Math.max(q.a, si), e0 = Math.min(q.e, i), m = e0 - a0 + 1, cur = q.e > i; if (m < 1) return;
        var arr = new Float32Array(2 * m + (cur ? 2 : 0)), t; for (t = 0; t < 2 * m; t++) arr[t] = q.p[2 * (a0 - q.a) + t];
        if (cur) { arr[2 * m] = x; arr[2 * m + 1] = y; }
        ctx.beginPath(); ribbon(arr, wd); fillAll(BAND[q.b]);
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
      var here = CUM[i] + r * (CUM[i + 1] - CUM[i]);
      travelled(i, x, y, here, 260, 0.42, 2.1); travelled(i, x, y, here, 90, 0.7, 2.3); travelled(i, x, y, here, 36, 1, 2.6);
      if (S && q > 0.55) buildings(110 * q);
      floaters(T0 / 1000);
      /* a haze where the ground meets the sky, drawn over the far shapes */
      var hz = ctx.createLinearGradient(0, HY - 2, 0, HY + h * 0.3); hz.addColorStop(0, pal.sky1); hz.addColorStop(1, dark ? 'rgba(23,32,27,0)' : 'rgba(230,233,227,0)'); ctx.fillStyle = hz; ctx.fillRect(0, HY - 2, w, h * 0.3 + 2);
      ring(x, y, T0 / 1000);
      ema = ema * 0.9 + (performance.now() - T0) * 0.1; if (ema > 14 && q > 0.4) { q -= 0.15; ema = 6; }
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
    function cell(c, k, v, unit, hit) { cells.push('<div class="rl-rec' + (hit ? ' is-this' : '') + '" style="--c:' + c + '"><dt>' + k + '</dt><dd>' + v + (unit ? '<small> ' + unit + '</small>' : '') + '</dd>' + (hit ? '<span class="rl-rec-tag">this run</span>' : '') + '</div>'); }
    cell(BAND[1], 'Total distance', R.total.toFixed(1), 'km'); cell(BAND[0], 'Runs', R.runs);
    cell(BAND[2], 'Longest run', R.longest.km.toFixed(2), 'km', here && R.longest.slug === here);
    if (R.fast[1]) cell(BAND[3], 'Fastest km', pace(R.fast[1].v), '/km', here && R.fast[1].slug === here);
    [[5, BAND[4]], [10, '#c0617d'], [21, '#8b6fc0']].forEach(function (f) { var k = f[0]; if (R.fast[k]) cell(f[1], 'Fastest ' + (k === 21 ? 'half' : k + 'K'), clock(R.fast[k].v), '', here && R.fast[k].slug === here); });
    cell(BAND[2], 'Biggest week', R.wkBest.v.toFixed(1), 'km'); cell(BAND[1], 'Longest streak', R.streak, R.streak === 1 ? 'day' : 'days');
    return '<section class="rl-records" aria-label="Runlog so far"><h2 class="rl-h">Runlog so far</h2><dl class="rl-recs">' + cells.join('') + '</dl></section>';
  }

  /* a figure that keeps its width: fixed slots, each digit a small reel that rolls to its new value */
  function Odo(host, pattern) {
    host.classList.add('od'); host.setAttribute('aria-hidden', 'true');
    var slots = [];
    pattern.split('').forEach(function (ch) {
      if (ch === '#') { var d = el('span', 'od-d'), r = el('span', 'od-r', '<i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i><i></i>'); d.appendChild(r); host.appendChild(d); slots.push({ r: r, last: -1 }); }
      else { var c = el('span', 'od-c', ch); host.appendChild(c); slots.push({ c: c }); }
    });
    return function (str) {
      var none = str === '–', si = str.length - 1, k, s, ch;
      host.classList.toggle('od-none', none);
      for (k = slots.length - 1; k >= 0; k--) {
        s = slots[k]; ch = si >= 0 && !none ? str.charAt(si) : null;
        if (s.r) { var idx = ch !== null && ch >= '0' && ch <= '9' ? +ch : 10; if (s.last !== idx) { s.last = idx; s.r.style.setProperty('--i', idx); } if (ch !== null) si--; }
        else { s.c.style.visibility = ch !== null ? 'visible' : 'hidden'; if (ch !== null) si--; }
      }
    };
  }

  /* ---- the index page ---- */
  function routeSvg(r, sw) {
    var t = r.thumb || [], b = r.thumbB || [], n = t.length / 2, s = '', cur = -1, d = '', i;
    if (n < 2) return '';
    for (i = 0; i < n; i++) {
      var bb = b.length ? b[i] : 2;
      if (bb !== cur) { if (cur >= 0) s += '<path d="' + d + '" stroke="' + BAND[cur] + '"/>'; cur = bb; d = i ? 'M' + t[2 * i - 2] + ' ' + t[2 * i - 1] + 'L' + t[2 * i] + ' ' + t[2 * i + 1] : 'M' + t[0] + ' ' + t[1]; } else d += 'L' + t[2 * i] + ' ' + t[2 * i + 1];
    }
    s += '<path d="' + d + '" stroke="' + BAND[cur] + '"/>';
    return '<svg viewBox="-30 -30 ' + (r.w + 60) + ' ' + (r.h + 60) + '" fill="none" stroke-width="' + (sw || 24) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + s + '</svg>';
  }
  function paceChart(asc) {
    var v = asc.map(function (r) { return r.paceS; }), mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), n = v.length;
    var pts = v.map(function (p, i) { return [20 + i * (260 / (n - 1)), 12 + (p - mn) / (mx - mn || 1) * 70]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(''), area = line + 'L' + pts[n - 1][0] + ' 100L' + pts[0][0] + ' 100Z';
    return '<div class="rl-pacechart"><svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="rl-pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e07a3a" stop-opacity=".45"/><stop offset="1" stop-color="#e07a3a" stop-opacity="0"/></linearGradient></defs><path d="' + area + '" fill="url(#rl-pg)"/><path d="' + line + '" fill="none" stroke="#e07a3a" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>' + pts.map(function (p, i) { return '<i class="rl-dot" style="left:' + (p[0] / 3) + '%;top:' + p[1] + '%;background:' + BAND[Math.min(4, i + 1)] + '"></i>'; }).join('') + '</div><p class="rl-note">' + pace(v[0]) + ' on the first run, ' + pace(v[n - 1]) + ' on the latest (per km).</p>';
  }
  function renderIndex(host) {
    var src = host.getAttribute('data-src');
    getJSON(src).then(function (idx) {
      if (!idx.length) { host.innerHTML = '<p class="rl-wait">No runs yet.</p>'; return; }
      var R = records(idx), total = R.total, secs = idx.reduce(function (a, r) { return a + r.durationS; }, 0);
      var since = idx[idx.length - 1].start, base = host.getAttribute('data-runs-url') || '/runs/';
      /* a run's card picture: a photo from the run, else the featured image of its post in Ghost (the page passes them in), else none */
      var covers = {}; try { covers = JSON.parse(($('#rl-covers') || {}).textContent || '{}') || {}; } catch (e) { covers = {}; }
      function tile(k, v, u) { return '<div class="rl-tile"><dt>' + k + '</dt><dd>' + v + (u ? '<small> ' + u + '</small>' : '') + '</dd></div>'; }
      var html = '<dl class="rl-tiles">' + tile('Runs', idx.length) + tile('Total', total.toFixed(1), 'km') + tile('Longest', R.longest.km.toFixed(1), 'km') + tile('Average pace', pace(secs / total), '/km') + tile('Since', short(since)) + '</dl>';
      var wks = Object.keys(R.byWeek).sort().slice(-12), mx = Math.max.apply(null, wks.map(function (k) { return R.byWeek[k]; })), asc = idx.slice().reverse();
      html += '<div class="rl-prog"><div class="rl-panel"><h3>Distance per week, km</h3><div class="rl-bars">' + wks.map(function (k) { var v = R.byWeek[k]; return '<div class="rl-bar"><i style="height:' + Math.max(3, v / mx * 100) + '%"></i><b>' + v.toFixed(1) + '</b><span>' + new Date(k + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) + '</span></div>'; }).join('') + '</div></div>';
      html += '<div class="rl-panel"><h3>Pace per run</h3>' + (asc.length < 2 ? '<p class="rl-note">A line will be drawn here once there are two runs.</p>' : paceChart(asc)) + '</div></div>';
      html += recordsBlock(idx, null);
      var top = html; html = '<h2 class="rl-h">Runs <small>' + idx.length + ' so far</small></h2><div class="rl-runs">' + idx.map(function (r, i) {
        var stats = '<span class="rc-row"><span><b>' + r.km.toFixed(2) + '</b> km</span><span><b>' + clock(r.durationS) + '</b></span><span><b>' + pace(r.paceS) + '</b>/km</span><span><b>' + r.hrAvg + '</b> bpm</span></span>';
        var cv = r.cover || covers[r.slug] || '';
        if (cv) return '<a class="rc-card rc-photo" style="background-image:url(&quot;' + esc(cv) + '&quot;)" href="' + base + esc(r.slug) + '/"><span class="rc-meta">' + nice(r.start) + '</span><span class="rc-map">' + routeSvg(r) + '</span><span class="rc-body"><h3>' + esc(r.title) + '</h3>' + stats + '</span></a>';
        return '<a class="rc-card rc-plain rc-c' + (i % 3) + '" href="' + base + esc(r.slug) + '/"><span class="rc-meta">' + nice(r.start) + ' · ' + timeOfDay(r.start) + '</span><span class="rc-inset">' + routeSvg(r) + '</span><span class="rc-body"><h3>' + esc(r.title) + '</h3>' + stats + '</span></a>';
      }).join('') + '</div>';
      var runsHost = $('#rl-runs'); host.innerHTML = top; if (runsHost) runsHost.innerHTML = html; else host.innerHTML += html;
    }).catch(function () { host.innerHTML = '<p class="rl-wait">The runlog could not be loaded.</p>'; });
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
    html += '<h2 class="rl-h">Watch the run</h2><div class="rl-replay" tabindex="0" aria-label="Replay of the run. Space plays and pauses, the arrow keys move a minute."><div class="rl-stage"><div class="rl-cam"><canvas></canvas><div class="rl-readout"><div><span>km</span><b data-r="km"></b></div><div><span>time</span><b data-r="t"></b></div><div><span>pace</span><b data-r="p"></b></div><div><span>bpm</span><b data-r="hr"></b></div></div><div class="rl-pop" hidden></div><div class="rl-chips" role="group" aria-label="Speed"></div><span class="rl-state">tap to play</span></div><div class="rl-side"><div class="rl-map" id="rl-map"></div><ul class="rl-key" aria-label="Heart rate colours, beats per minute"><li class="rl-key-h">bpm</li>' + [['under 115', 0], ['115–129', 1], ['130–144', 2], ['145–159', 3], ['160+', 4]].map(function (k) { return '<li><i style="background:' + BAND[k[1]] + '"></i>' + k[0] + '</li>'; }).join('') + '</ul>' + (M ? '<a class="rl-osm" href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>' : '') + '</div></div></div>';
    html += '<h2 class="rl-h">Pace, heart rate, cadence</h2><div class="rl-charts"><div class="rl-chart" data-c="p"><span>pace /km</span><canvas></canvas><i></i></div><div class="rl-chart" data-c="hr"><span>heart rate</span><canvas></canvas><i></i></div><div class="rl-chart" data-c="cad"><span>cadence</span><canvas></canvas><i></i></div></div>';
    html += '<h2 class="rl-h">Kilometre splits</h2><table class="rl-splits"><thead><tr><th>km</th><th>pace</th><th>bpm</th><th></th></tr></thead><tbody>' + (function () { var fs = run.splits.map(function (s) { return s.s / (s.part ? s.part / 1000 : 1); }), lo = Math.min.apply(null, fs), hi = Math.max.apply(null, fs); return run.splits.map(function (s, i) { return '<tr data-km="' + (s.part ? run.km : s.km) + '"><td>' + (s.part ? (s.km - 1 + s.part / 1000).toFixed(1) : s.km) + '</td><td>' + pace(fs[i]) + '</td><td>' + s.hr + '</td><td><i style="width:' + (100 - (fs[i] - lo) / (hi - lo || 1) * 70) + '%"></i></td></tr>'; }).join(''); })() + '</tbody></table>';
    html += recordsBlock(idx, run.slug);
    if (M) html += '<p class="rl-credit">Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>.</p>';
    host.innerHTML = html;

    var pinsBy = run.pins || [], rep = $('.rl-replay', host), mapBox = $('#rl-map', host), mapSvg, side = $('.rl-side', host), groups = makeGroups(pinsBy), cam = Cam($('canvas', rep), run, M, { pins: groups });
    if (pinsBy.length) { var gl = el('div', 'rl-photos'); gl.innerHTML = '<h2 class="rl-h">Photos from the run</h2><div class="rl-strip">' + pinsBy.map(function (p, n) { return '<button type="button" class="rl-ph" data-i="' + n + '"><img src="' + esc(p.thumb || p.src) + '" alt="' + esc(p.alt || p.title) + '" loading="lazy"><span>' + esc(p.title) + (p.approx ? '' : ' · km ' + p.km) + '</span></button>'; }).join('') + '</div>'; rep.parentNode.insertBefore(gl, rep.nextSibling); gl.onclick = function (e) { var b = e.target.closest('[data-i]'); if (b) openBox(+b.getAttribute('data-i')); }; }
    var playLbl = $('.rl-state', rep), pop = $('.rl-pop', rep), pos = 0, playing = false, speed = 120, last = 0, hold = 0;

    /* the overview map: the route faint, the part run so far strong, and where the runner is, facing the way they face */
    function drawOverview() {
      var d2 = isDark(host), url = '';
      if (M) url = drawBase(D.createElement('canvas'), 1.3, 200, PAL[d2 ? 'dark' : 'light'], true, M, run.w, run.h).toDataURL('image/png');
      var segs = '', cur = -1, d = '', all = '';
      for (var i = 0; i < N; i++) { var b = band(run.hr[i]); all += (i ? 'L' : 'M') + run.x[i] + ' ' + run.y[i]; if (b !== cur) { if (cur >= 0) segs += '<path d="' + d + '" stroke="' + BAND[cur] + '"/>'; cur = b; d = i ? 'M' + run.x[i - 1] + ' ' + run.y[i - 1] + 'L' + run.x[i] + ' ' + run.y[i] : 'M' + run.x[i] + ' ' + run.y[i]; } else d += 'L' + run.x[i] + ' ' + run.y[i]; }
      segs += '<path d="' + d + '" stroke="' + BAND[cur] + '"/>';
      var ends = '<circle cx="' + run.x[0] + '" cy="' + run.y[0] + '" r="12" fill="#1e8b4c" stroke="#fff" stroke-width="4"/><circle cx="' + run.x[N - 1] + '" cy="' + run.y[N - 1] + '" r="12" fill="#17191e" stroke="#fff" stroke-width="4"/>';
      var pins = groups.map(function (g, n) { var p = g.items[0], cy = g.y - 30; return '<g class="rl-pin"><clipPath id="rl-pc' + n + '"><circle cx="' + g.x + '" cy="' + cy + '" r="21"/></clipPath><path d="M' + (g.x - 10) + ' ' + (cy + 16) + 'L' + g.x + ' ' + g.y + 'L' + (g.x + 10) + ' ' + (cy + 16) + 'Z" fill="#fff"/><circle cx="' + g.x + '" cy="' + cy + '" r="25" fill="#fff"/><image href="' + esc(p.thumb || p.src) + '" x="' + (g.x - 21) + '" y="' + (cy - 21) + '" width="42" height="42" preserveAspectRatio="xMidYMid slice" clip-path="url(#rl-pc' + n + ')"/>' + (g.items.length > 1 ? '<circle cx="' + (g.x + 19) + '" cy="' + (cy + 17) + '" r="11" fill="#e07a3a" stroke="#fff" stroke-width="3"/><text x="' + (g.x + 19) + '" y="' + (cy + 22) + '" text-anchor="middle" font-size="14" font-family="monospace" font-weight="700" fill="#fff">' + g.items.length + '</text>' : '') + '</g>'; }).join('');
      mapBox.innerHTML = '<svg viewBox="-30 -30 ' + (run.w + 60) + ' ' + (run.h + 60) + '" role="img" aria-label="Map of the route, coloured by heart rate, with where the runner is now. Select a point to move the replay there."><defs><mask id="rl-mask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="' + (run.w + 400) + '" height="' + (run.h + 400) + '"><path class="rl-mp" d="' + all + '" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 999999"/></mask></defs>' + (url ? '<image x="-200" y="-200" width="' + (run.w + 400) + '" height="' + (run.h + 400) + '" preserveAspectRatio="none" href="' + url + '"/>' : '') + '<g fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.38">' + segs + '</g><g fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" mask="url(#rl-mask)">' + segs + '</g>' + ends + pins + '<g class="rl-here"><path d="M0 0 L-30 -70 A76 76 0 0 1 30 -70Z" fill="#e07a3a" opacity="0.38"/><circle r="12" fill="#e07a3a" stroke="#17191e" stroke-width="3.5"/></g></svg>';
      mapSvg = $('svg', mapBox);
    }
    drawOverview();
    mapBox.addEventListener('click', function (e) {
      var pt = mapSvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var q = pt.matrixTransform(mapSvg.getScreenCTM().inverse()), bi = 0, bd = 1e9;
      for (var pq = 0; pq < groups.length; pq++) if (Math.min(Math.hypot(groups[pq].x - q.x, groups[pq].y - q.y), Math.hypot(groups[pq].x - q.x, groups[pq].y - 30 - q.y)) < 34) { openFan(pq); return; }
      closeFan();
      for (var i = 0; i < N; i++) { var dd = Math.hypot(run.x[i] - q.x, run.y[i] - q.y); if (dd < bd) { bd = dd; bi = i; } }
      seek(MT[bi]);
    });

    var autoOn = false, autoStarted = false;
    var chips = $('.rl-chips', rep);
    [60, 120, 300].forEach(function (v) { var b = el('button', v === speed ? 'on' : '', v + '×'); b.type = 'button'; b.onclick = function (e) { e.stopPropagation(); autoOn = false; speed = v; $$('button', chips).forEach(function (x) { x.classList.toggle('on', x === b); }); }; chips.appendChild(b); });
    function idxAt(t) { var lo = 0, hi = N - 1; while (lo < hi) { var m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m; } return lo; }
    function frac(t) { var i = Math.max(1, idxAt(t)), a = MT[i - 1], b = MT[i]; return i - 1 + (b > a ? (t - a) / (b - a) : 0); }
    var od = {}; [['km', '##.##'], ['t', total >= 3600 ? '#:##:##' : '##:##'], ['p', '##:##'], ['hr', '###']].forEach(function (f) { od[f[0]] = Odo($('[data-r=' + f[0] + ']', rep), f[1]); });
    function show() {
      var f = frac(pos), i = Math.min(N - 1, Math.round(f));
      cam.draw(f, dark);
      od.km((run.d[i] / 1000).toFixed(2)); od.t(clock(run.t[i])); od.p(pc[i] ? pace(pc[i]) : '–'); od.hr(String(run.hr[i]));
      var i0 = Math.min(N - 2, Math.floor(f)), r0 = f - i0, hx = run.x[i0] + (run.x[i0 + 1] - run.x[i0]) * r0, hy = run.y[i0] + (run.y[i0 + 1] - run.y[i0]) * r0;
      var here = $('.rl-here', mapSvg); if (here) here.setAttribute('transform', 'translate(' + hx + ' ' + hy + ') rotate(' + (cam.ang() * 180 / Math.PI + 90) + ')');
      var mp = $('.rl-mp', mapSvg); if (mp) mp.setAttribute('stroke-dasharray', (cam.cum[i0] + r0 * (cam.cum[i0 + 1] - cam.cum[i0])) + ' 999999');
      $$('.rl-chart i', host).forEach(function (c) { c.style.left = 'calc(var(--lab) + (100% - var(--lab)) * ' + (pos / total) + ')'; });
      $$('.rl-splits tbody tr', host).forEach(function (r) { var k = +r.getAttribute('data-km'); r.classList.toggle('is-now', run.d[i] / 1000 > k - 1 && run.d[i] / 1000 <= k + 0.0001); });
    }
    function whenText(p) { var d = new Date(run.start + ':00Z'); d.setUTCSeconds(d.getUTCSeconds() + p.t); return (p.approx ? 'somewhere along the route' : 'km ' + p.km + ' · ' + timeOfDay(d.toISOString().slice(0, 16))) + (p.credit ? (p.approx ? ' · ' : ' · ') + 'photo: ' + esc(p.credit) : ''); }
    function popHtml(g) { var p = g.items[0]; return '<button type="button" class="rl-pop-main" data-i="' + p._i + '" aria-label="Open this photo full size"><img src="' + esc(p.src) + '" alt="' + esc(p.alt || p.title) + '"></button><div class="rl-pop-t"><b>' + esc(p.title) + (g.items.length > 1 ? ' <i>+' + (g.items.length - 1) + ' more</i>' : '') + '</b><small>' + whenText(p) + '</small></div>' + (g.items.length > 1 ? '<div class="rl-pop-row">' + g.items.map(function (it) { return '<button type="button" data-i="' + it._i + '" aria-label="Open ' + esc(it.title) + '"><img src="' + esc(it.thumb || it.src) + '" alt=""></button>'; }).join('') + '</div>' : ''); }
    function goGroup(n) { seek(groups[n].mt); pop.innerHTML = popHtml(groups[n]); pop.hidden = false; hold = 8; }
    function closeFan() { $$('.rl-fan', side).forEach(function (f) { f.remove(); }); }
    function openFan(n) {
      closeFan(); var g = groups[n], pt = mapSvg.createSVGPoint(); pt.x = g.x; pt.y = g.y - 30; var sp = pt.matrixTransform(mapSvg.getScreenCTM()), sb = side.getBoundingClientRect(), mb = mapBox.getBoundingClientRect();
      var f = el('div', 'rl-fan'); f.style.left = (sp.x - sb.left) + 'px'; f.style.top = (Math.max(sp.y, mb.top + 150) - sb.top) + 'px';
      var m = g.items.length; f.innerHTML = g.items.map(function (it, k) { var ang = (k - (m - 1) / 2) * 22; return '<button type="button" class="rl-fan-c" data-i="' + it._i + '" style="--a:' + ang + 'deg;--k:' + k + '"><img src="' + esc(it.thumb || it.src) + '" alt="' + esc(it.alt || it.title) + '"><span>' + (it.approx ? 'along the route' : 'km ' + it.km) + '</span></button>'; }).join('') + '<button type="button" class="rl-fan-go">Show in the replay</button>';
      side.appendChild(f); requestAnimationFrame(function () { f.classList.add('on'); });
      f.onclick = function (e) { var b = e.target.closest('[data-i]'); if (b) openBox(+b.getAttribute('data-i')); else if (e.target.closest('.rl-fan-go')) { goGroup(n); closeFan(); rep.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); } };
    }
    function openBox(i) {
      var p = pinsBy[i], b = $('.rl-lb') || el('div', 'rl-lb'); b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true'); b.setAttribute('aria-label', p.title);
      b.innerHTML = '<button type="button" class="rl-lb-x" aria-label="Close">✕</button><button type="button" class="rl-lb-p" aria-label="Previous photo">‹</button><button type="button" class="rl-lb-n" aria-label="Next photo">›</button><figure><img src="' + esc(p.src) + '" alt="' + esc(p.alt || p.title) + '"><figcaption><b>' + esc(p.title) + '</b><span>' + (i + 1) + ' of ' + pinsBy.length + ' · ' + whenText(p) + '</span><button type="button" class="rl-lb-go">Show in the replay</button></figcaption></figure>';
      D.body.appendChild(b); $('.rl-lb-x', b).focus();
      function shut() { b.remove(); }
      b.onclick = function (e) { if (e.target.closest('.rl-lb-x') || e.target === b) shut(); else if (e.target.closest('.rl-lb-p')) openBox((i + pinsBy.length - 1) % pinsBy.length); else if (e.target.closest('.rl-lb-n')) openBox((i + 1) % pinsBy.length); else if (e.target.closest('.rl-lb-go')) { var gi = groups.findIndex(function (g) { return g.items.indexOf(p) >= 0; }); shut(); closeFan(); goGroup(gi); rep.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); } };
    }
    function seek(t) { autoOn = false; pos = Math.max(0, Math.min(total, t)); hold = 0; pop.hidden = true; cam.snap(); show(); }
    function tick(now) {
      if (!playing) { last = 0; return; }
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      if (hold > 0) { hold -= dt; if (hold <= 0) pop.hidden = true; } else {
        var np = pos + dt * speed;
        for (var n = 0; n < groups.length; n++) if (groups[n].mt > pos && groups[n].mt <= np) { np = groups[n].mt; hold = 3.5; pop.innerHTML = popHtml(groups[n]); pop.hidden = false; break; }
        pos = np; if (pos >= total) { pos = total; playing = false; playLbl.textContent = 'tap to replay'; autoOn = false; }
      }
      show(); requestAnimationFrame(tick);
    }
    function toggle() { playing = !playing; playLbl.textContent = playing ? 'tap to pause' : 'tap to play'; if (playing) { if (pos >= total) pos = 0; last = 0; requestAnimationFrame(tick); } }
    $('.rl-cam', rep).addEventListener('click', function () { autoOn = false; toggle(); });
    rep.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); autoOn = false; toggle(); } else if (e.key === 'ArrowRight') { e.preventDefault(); seek(pos + 60); } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(pos - 60); } });
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
    /* the replay plays itself once, when it is mostly on screen; any touch of the controls, or the end, hands it over */
    if (!reduced && window.IntersectionObserver) new IntersectionObserver(function (es) {
      var rt = es[0].intersectionRatio;
      if (rt >= 0.6) { if (!autoStarted && pos === 0) { autoStarted = true; autoOn = true; speed = 300; $$('button', chips).forEach(function (x) { x.classList.toggle('on', x.textContent === '300×'); }); toggle(); } else if (autoOn && !playing && pos < total) toggle(); }
      else if (rt < 0.2 && autoOn && playing) toggle();
    }, { threshold: [0.2, 0.6] }).observe($('.rl-cam', rep));
    show(); pop.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) { e.stopPropagation(); openBox(+b.getAttribute('data-i')); } }); D.addEventListener('keydown', function (e) { var lb = $('.rl-lb'); if (!lb) return; if (e.key === 'Escape') lb.remove(); else if (e.key === 'ArrowRight') $('.rl-lb-n', lb).click(); else if (e.key === 'ArrowLeft') $('.rl-lb-p', lb).click(); }); D.addEventListener('click', function (e) { if (!e.target.closest('.rl-fan') && !e.target.closest('#rl-map')) closeFan(); });
    new MutationObserver(function () { var d2 = isDark(host); if (d2 !== dark) { dark = d2; drawOverview(); show(); } }).observe(D.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });
  }

  /* ---- the Movement plot on the homepage: the latest run, drawn live, is the whole card ---- */
  function renderBox(a) {
    var src = a.getAttribute('data-runs'); if (!src) return;
    var W = where(src), plot = a.closest('.plot');
    getJSON(src).then(function (idx) {
      if (!idx.length) return;
      var r = idx[0], host = plot || a;
      /* the plot counts activities across every log (runs now, badminton and others later), not Ghost pages */
      /* another script writes this label too, and the last to write wins: so it is written again when the page has loaded */
      function applyCount() { if (!plot) return; var st = $('.plot-status', plot), mt = $('.plot-meter', plot), n = idx.length; if (st) st.textContent = n + (n === 1 ? ' activity' : ' activities'); if (mt) $$('i', mt).forEach(function (cell, i) { cell.classList.toggle('is-on', i < Math.min(5, n)); }); }
      applyCount(); if (D.readyState !== 'complete') addEventListener('load', applyCount); setTimeout(applyCount, 1500);
      a.classList.add('is-runlog'); if (plot) plot.classList.add('is-takeover');
      var kind = $('.plot-page-kind', a), line = $('.plot-page-line', a), title = $('.plot-page-title', a);
      if (kind) kind.textContent = 'Runlog · ' + short(r.start);
      if (title) title.textContent = r.title;
      if (line) line.innerHTML = '<span>' + r.km.toFixed(2) + ' km</span><span>' + clock(r.durationS) + '</span><span>' + pace(r.paceS) + ' /km</span><span>' + r.hrAvg + ' bpm</span><span class="rl-so"></span>';
      host.insertAdjacentHTML('afterbegin', '<span class="rl-bg" aria-hidden="true">' + routeSvg(r, 26) + '<canvas></canvas></span><span class="rl-shade" aria-hidden="true"></span>');
      var go = function () {
        Promise.all([getJSON(W.root + r.slug + '.json' + W.q), getJSON(W.root + r.slug + '.map.json' + W.q).catch(function () { return null; })]).then(function (res) {
          var run = res[0], cv = $('canvas', host), cam = Cam(cv, run, res[1], { maxDpr: 1.75 }), vis = true, f = 0, last = 0, N = run.x.length, so = $('.rl-so', a), still = reduced;
          new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(host);
          new ResizeObserver(function () { cam.size(); cam.draw(f, true); }).observe(host);
          if (still) { f = N * 0.4; cam.draw(f, true); host.classList.add('is-live'); return; }
          function loop(now) { requestAnimationFrame(loop); if (!vis || D.hidden) { last = 0; return; } if (last && now - last < 32) return; var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; f += dt * 13; if (f > N - 12) f = 0; cam.draw(f, true); if (so) so.textContent = (run.d[Math.floor(f)] / 1000).toFixed(1) + ' km so far'; }
          cam.draw(0, true); host.classList.add('is-live'); requestAnimationFrame(loop);
        }).catch(function (e) { if (window.console) console.warn('Runlog card: the live picture failed', e); });
      };
      if (window.requestIdleCallback) requestIdleCallback(function () { setTimeout(go, 400); }); else setTimeout(go, 1500);
    }).catch(function (e) { if (window.console) console.warn('Runlog card failed', e); });
  }

  function boot() {
    $$('.rl-index').forEach(renderIndex);
    $$('.rl-run').forEach(renderRun);
    $$('.plot-page[data-template="custom-runlog"]').forEach(renderBox);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
