/* Runlog: the index page (/runlog/), a run's own page, the shared records, and the live box on the homepage.
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
    light: { land: '#f2f0e8', water: '#b6d4e4', canal: '#a3c8dc', paddy: '#dce8bd', green: '#c9ddb0', built: '#e9e5da', bldg: '#dcd5c6', minorC: '#d6d1c4', minor: '#fffefa', majorC: '#d9b765', major: '#fbe3a8', path: '#c9c3b4', label: '#5d6350', halo: '#f7f5ee' },
    dark: { land: '#1a221e', water: '#1b3040', canal: '#21394a', paddy: '#222f20', green: '#1d2d20', built: '#212823', bldg: '#2b322d', minorC: '#161c19', minor: '#343c37', majorC: '#2a2618', major: '#4d4730', path: '#2b332e', label: '#a6b2a0', halo: '#141a17' }
  };

  function isDark() {
    var c = (getComputedStyle(D.body).backgroundColor.match(/[\d.]+/g) || [255, 255, 255]).map(Number);
    return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 < 110;
  }
  function pace(s) { if (!s || !isFinite(s)) return '–'; s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function clock(s) { s = Math.round(s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + (s % 60)).slice(-2); }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function getJSON(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function where(src) { var u = src.split('?'); return { root: u[0].replace(/[^\/]*$/, ''), q: u[1] ? '?' + u[1] : '' }; }
  function nice(dateStr) { var d = new Date(dateStr + 'Z'); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
  function short(dateStr) { return new Date(dateStr + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  function timeOfDay(dateStr) { var h = +dateStr.slice(11, 13), m = dateStr.slice(14, 16); return ('0' + (h % 12 || 12)).slice(-2).replace(/^0/, '') + ':' + m + (h < 12 ? ' am' : ' pm'); }

  /* ---- the map: OpenStreetMap shapes drawn into a canvas, in the route's own units ---- */
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

  /* ---- the follow cam: the map turns so the way you are going is up; footprints behind you ---- */
  function Cam(cv, run, M, o) {
    var ctx = cv.getContext('2d'), N = run.x.length, w = 0, h = 0, dpr = 1, hd = 0, bm = null, CUM = [0], pins = o.pins || [];
    for (var k = 1; k < N; k++) CUM.push(CUM[k - 1] + Math.hypot(run.x[k] - run.x[k - 1], run.y[k] - run.y[k - 1]));
    var runs = [], s0 = 0;
    for (k = 1; k <= N; k++) if (k === N || band(run.hr[k]) !== band(run.hr[s0])) { runs.push([band(run.hr[s0]), s0, Math.min(k, N - 1)]); s0 = k; }
    function size() { dpr = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    function base(dark) { bm = null; if (M) { bm = drawBase(D.createElement('canvas'), o.ppu || 2.4, o.margin || 100, PAL[dark ? 'dark' : 'light'], false, M, run.w, run.h); } }
    function xy(f) { var i = Math.min(N - 2, Math.floor(f)), r = f - i; return [run.x[i] + (run.x[i + 1] - run.x[i]) * r, run.y[i] + (run.y[i + 1] - run.y[i]) * r]; }
    function draw(f, dark) {
      if (!w || !h) { size(); if (!w) return; }
      f = Math.max(0, Math.min(N - 1.001, f));
      var i = Math.floor(f), p = xy(f), s = w / (o.across || 105), a = Math.min(N - 1, i + 8), b = Math.max(0, i - 6);
      var ang = Math.atan2(run.y[a] - run.y[b], run.x[a] - run.x[b]), d = -Math.PI / 2 - ang - hd; d = Math.atan2(Math.sin(d), Math.cos(d)); hd += d * 0.06;
      var mg = o.margin || 100;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2, h * (o.anchor || 0.58)); ctx.rotate(hd); ctx.scale(s, s); ctx.translate(-p[0], -p[1]);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (bm) ctx.drawImage(bm, -mg, -mg, run.w + 2 * mg, run.h + 2 * mg);
      ctx.lineWidth = 4.8 / s; ctx.strokeStyle = dark ? 'rgba(255,255,255,.3)' : 'rgba(23,25,30,.22)';
      ctx.beginPath(); ctx.moveTo(run.x[0], run.y[0]); for (k = 1; k < N; k++) ctx.lineTo(run.x[k], run.y[k]); ctx.stroke();
      ctx.lineWidth = 14 / s;
      runs.forEach(function (r) { if (r[1] > i) return; ctx.strokeStyle = BAND[r[0]]; ctx.beginPath(); ctx.moveTo(run.x[r[1]], run.y[r[1]]); for (var q = r[1] + 1; q <= Math.min(r[2], i); q++) ctx.lineTo(run.x[q], run.y[q]); if (r[2] > i) ctx.lineTo(p[0], p[1]); ctx.stroke(); });
      if (o.feet !== false) {
        var STRIDE = 5, here = CUM[i] + (f - i) * (CUM[i + 1] - CUM[i]);
        ctx.fillStyle = dark ? '#fff' : '#17191e';
        for (var m = Math.floor(here / STRIDE), n = 0; m >= 0 && n < 10; m--, n++) {
          var dd = m * STRIDE, j = i; while (j > 0 && CUM[j] > dd) j--;
          var sg = (CUM[j + 1] - CUM[j]) || 1, u = (dd - CUM[j]) / sg, px = run.x[j] + (run.x[j + 1] - run.x[j]) * u, py = run.y[j] + (run.y[j + 1] - run.y[j]) * u;
          ctx.save(); ctx.globalAlpha = Math.max(0, 1 - (here - dd) / (STRIDE * 10)) * 0.95; ctx.translate(px, py);
          ctx.rotate(Math.atan2(run.y[j + 1] - run.y[j], run.x[j + 1] - run.x[j]) + Math.PI / 2); ctx.translate((m % 2 ? 1 : -1) * 1.5, 0); ctx.scale(0.95, 0.95);
          ctx.beginPath(); ctx.ellipse(0, -0.9, 0.95, 1.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 1.1, 0.7, 0.8, 0, 0, 7); ctx.fill(); ctx.restore();
        }
      }
      pins.forEach(function (pn, n) { var r = 11 / s * 2; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#17191e'; ctx.lineWidth = 2.4 / s * 2; ctx.beginPath(); ctx.arc(pn.x, pn.y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#17191e'; ctx.beginPath(); ctx.arc(pn.x, pn.y, r * 0.4, 0, 7); ctx.fill(); });
    }
    size();
    return { draw: draw, size: size, base: base };
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
    var R = records(idx), cells = [], mark = function (hit) { return hit ? ' is-this' : ''; };
    function cell(k, v, unit, hit) { cells.push('<div class="rl-rec' + mark(hit) + '"><dt>' + k + '</dt><dd>' + v + (unit ? '<small> ' + unit + '</small>' : '') + '</dd>' + (hit ? '<span class="rl-rec-tag">this run</span>' : '') + '</div>'); }
    cell('Total distance', R.total.toFixed(1), 'km'); cell('Runs', R.runs);
    cell('Longest run', R.longest.km.toFixed(2), 'km', here && R.longest.slug === here);
    if (R.fast[1]) cell('Fastest km', pace(R.fast[1].v), '/km', here && R.fast[1].slug === here);
    [5, 10, 21].forEach(function (k) { if (R.fast[k]) cell('Fastest ' + (k === 21 ? 'half' : k + 'K'), clock(R.fast[k].v), '', here && R.fast[k].slug === here); });
    cell('Biggest week', R.wkBest.v.toFixed(1), 'km'); cell('Longest streak', R.streak, R.streak === 1 ? 'day' : 'days');
    return '<section class="rl-records" aria-label="Runlog so far"><h2 class="rl-h">Runlog so far</h2><dl class="rl-recs">' + cells.join('') + '</dl></section>';
  }

  /* ---- the index page ---- */
  function renderIndex(host) {
    var src = host.getAttribute('data-src'), W = where(src);
    getJSON(src).then(function (idx) {
      if (!idx.length) { host.innerHTML = '<p class="rl-wait">No runs yet.</p>'; return; }
      var R = records(idx), total = R.total, secs = idx.reduce(function (a, r) { return a + r.durationS; }, 0);
      var since = idx[idx.length - 1].start;
      var html = '<dl class="rl-stats"><div><dt>Runs</dt><dd>' + idx.length + '</dd></div><div><dt>Total</dt><dd>' + total.toFixed(1) + '<small> km</small></dd></div><div><dt>Longest</dt><dd>' + R.longest.km.toFixed(1) + '<small> km</small></dd></div><div><dt>Average pace</dt><dd>' + pace(secs / total) + '<small> /km</small></dd></div><div><dt>Since</dt><dd>' + short(since) + '</dd></div></dl>';
      // weekly distance, the last 12 weeks that have a run
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
    var S = run.summary, N = run.x.length, MT = run.mt, total = MT[N - 1], dark = isDark();
    var paceAt = function (i) { var j = i; while (j > 0 && run.t[i] - run.t[j] < 60) j--; var dd = run.d[i] - run.d[j]; return dd > 5 ? (run.t[i] - run.t[j]) / dd * 1000 : null; };
    var pc = run.x.map(function (_, i) { return paceAt(i); });
    var html = '<dl class="rl-stats"><div><dt>Distance</dt><dd>' + run.km.toFixed(2) + '<small> km</small></dd></div><div><dt>Time</dt><dd>' + clock(run.durationS) + '</dd></div><div><dt>Pace</dt><dd>' + pace(S.paceS) + '<small> /km</small></dd></div><div><dt>Heart rate</dt><dd>' + S.hrAvg + '<small> avg, ' + S.hrMax + ' max</small></dd></div><div><dt>Cadence</dt><dd>' + S.cadAvg + '<small> spm</small></dd></div></dl>';
    html += '<h2 class="rl-h">The route</h2><div class="rl-map" id="rl-map"></div><ul class="rl-legend"><li><i style="background:' + BAND[0] + '"></i>under 115</li><li><i style="background:' + BAND[1] + '"></i>115–129</li><li><i style="background:' + BAND[2] + '"></i>130–144</li><li><i style="background:' + BAND[3] + '"></i>145–159</li><li><i style="background:' + BAND[4] + '"></i>160+</li><li class="rl-u">bpm</li></ul>' + (M ? '<p class="rl-credit">Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a></p>' : '');
    html += '<h2 class="rl-h">Watch the run</h2><div class="rl-replay" tabindex="0" aria-label="Replay of the run. Space plays and pauses, the arrow keys move a minute."><div class="rl-cam"><canvas></canvas><div class="rl-readout"><div><span>km</span><b data-r="km">0.00</b></div><div><span>time</span><b data-r="t">0:00</b></div><div><span>pace</span><b data-r="p">–</b></div><div><span>bpm</span><b data-r="hr">–</b></div></div><div class="rl-pop" hidden></div></div><div class="rl-ctl"><button type="button" class="rl-play" aria-label="Play">▶</button><input class="rl-scrub" type="range" min="0" max="1000" value="0" aria-label="Position in the run"><span class="rl-clock"></span><span class="rl-speeds"></span></div></div>';
    html += '<h2 class="rl-h">Pace, heart rate, cadence</h2><div class="rl-charts"><div class="rl-chart" data-c="p"><span>pace /km</span><canvas></canvas><i></i></div><div class="rl-chart" data-c="hr"><span>heart rate</span><canvas></canvas><i></i></div><div class="rl-chart" data-c="cad"><span>cadence</span><canvas></canvas><i></i></div></div>';
    html += '<h2 class="rl-h">Kilometre splits</h2><table class="rl-splits"><thead><tr><th>km</th><th>pace</th><th>bpm</th><th></th></tr></thead><tbody>' + (function () { var fs = run.splits.map(function (s) { return s.s / (s.part ? s.part / 1000 : 1); }), lo = Math.min.apply(null, fs), hi = Math.max.apply(null, fs); return run.splits.map(function (s, i) { return '<tr data-km="' + (s.part ? run.km : s.km) + '"><td>' + (s.part ? (s.km - 1 + s.part / 1000).toFixed(1) : s.km) + '</td><td>' + pace(fs[i]) + '</td><td>' + s.hr + '</td><td><i style="width:' + (100 - (fs[i] - lo) / (hi - lo || 1) * 70) + '%"></i></td></tr>'; }).join(''); })() + '</tbody></table>';
    html += recordsBlock(idx, run.slug);
    host.innerHTML = html;

    // overview map: base picture, the route by heart rate, pins
    var pinsBy = run.pins || [];
    var mapBox = $('#rl-map', host), mapSvg;
    function drawOverview() {
      var d2 = isDark(), url = '';
      if (M) url = drawBase(D.createElement('canvas'), 1.3, 200, PAL[d2 ? 'dark' : 'light'], true, M, run.w, run.h).toDataURL('image/png');
      var segs = '', cur = -1, d = '';
      for (var i = 0; i < N; i++) { var b = band(run.hr[i]); if (b !== cur) { if (cur >= 0) segs += '<path d="' + d + '" stroke="' + BAND[cur] + '"/>'; cur = b; d = i ? 'M' + run.x[i - 1] + ' ' + run.y[i - 1] + 'L' + run.x[i] + ' ' + run.y[i] : 'M' + run.x[i] + ' ' + run.y[i]; } else d += 'L' + run.x[i] + ' ' + run.y[i]; }
      segs += '<path d="' + d + '" stroke="' + BAND[cur] + '"/>';
      var ends = '<circle cx="' + run.x[0] + '" cy="' + run.y[0] + '" r="13" fill="#1e8b4c" stroke="#fff" stroke-width="5"/><circle cx="' + run.x[N - 1] + '" cy="' + run.y[N - 1] + '" r="13" fill="#17191e" stroke="#fff" stroke-width="5"/>';
      var pins = pinsBy.map(function (p, n) { return '<g class="rl-pin" data-n="' + n + '"><circle cx="' + p.x + '" cy="' + p.y + '" r="16" fill="#fff" stroke="#17191e" stroke-width="4"/><text x="' + p.x + '" y="' + (p.y + 6) + '" text-anchor="middle" font-size="16" font-family="monospace" font-weight="600" fill="#17191e">' + (n + 1) + '</text></g>'; }).join('');
      mapBox.innerHTML = '<svg viewBox="-30 -30 ' + (run.w + 60) + ' ' + (run.h + 60) + '" role="img" aria-label="Map of the route, coloured by heart rate. Select a point to move the replay there.">' + (url ? '<image x="-200" y="-200" width="' + (run.w + 400) + '" height="' + (run.h + 400) + '" preserveAspectRatio="none" href="' + url + '"/>' : '') + '<g fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' + segs + '</g>' + ends + pins + '<circle class="rl-here" r="9" fill="#e07a3a" stroke="#fff" stroke-width="4"/></svg>';
      mapSvg = $('svg', mapBox);
    }
    drawOverview();
    mapBox.addEventListener('click', function (e) {
      var pt = mapSvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var q = pt.matrixTransform(mapSvg.getScreenCTM().inverse()), bi = 0, bd = 1e9;
      for (var i = 0; i < N; i++) { var dd = Math.hypot(run.x[i] - q.x, run.y[i] - q.y); if (dd < bd) { bd = dd; bi = i; } }
      seek(MT[bi]);
    });

    // the replay
    var rep = $('.rl-replay', host), cam = Cam($('canvas', rep), run, M, { across: 105, ppu: 2.4, margin: 110, pins: pinsBy });
    cam.base(dark);
    var scrub = $('.rl-scrub', rep), playBtn = $('.rl-play', rep), clk = $('.rl-clock', rep), pop = $('.rl-pop', rep), pos = 0, playing = false, speed = 120, last = 0, hold = 0, shown = -1;
    var sp = $('.rl-speeds', rep); [30, 60, 120, 300, 600].forEach(function (v) { var b = el('button', v === speed ? 'on' : '', v + '×'); b.type = 'button'; b.onclick = function () { speed = v; $$('button', sp).forEach(function (x) { x.classList.toggle('on', x === b); }); }; sp.appendChild(b); });
    function idxAt(t) { var lo = 0, hi = N - 1; while (lo < hi) { var m = (lo + hi) >> 1; if (MT[m] < t) lo = m + 1; else hi = m; } return lo; }
    function frac(t) { var i = Math.max(1, idxAt(t)), a = MT[i - 1], b = MT[i]; return i - 1 + (b > a ? (t - a) / (b - a) : 0); }
    function show() {
      var f = frac(pos), i = Math.min(N - 1, Math.round(f));
      cam.draw(f, dark);
      $('[data-r=km]', rep).textContent = (run.d[i] / 1000).toFixed(2); $('[data-r=t]', rep).textContent = clock(run.t[i]); $('[data-r=p]', rep).textContent = pc[i] ? pace(pc[i]) : '–'; $('[data-r=hr]', rep).textContent = run.hr[i];
      clk.textContent = clock(pos) + ' / ' + clock(total);
      scrub.value = pos / total * 1000;
      var here = $('.rl-here', mapSvg); if (here) { here.setAttribute('cx', run.x[i]); here.setAttribute('cy', run.y[i]); }
      $$('.rl-chart i', host).forEach(function (c) { c.style.left = 'calc(var(--lab) + (100% - var(--lab)) * ' + (pos / total) + ')'; });
      $$('.rl-splits tbody tr', host).forEach(function (r) { var k = +r.getAttribute('data-km'); r.classList.toggle('is-now', run.d[i] / 1000 > k - 1 && run.d[i] / 1000 <= k + 0.0001); });
    }
    function seek(t) { pos = Math.max(0, Math.min(total, t)); hold = 0; hidePop(); show(); }
    function hidePop() { pop.hidden = true; shown = -1; }
    function tick(now) {
      if (!playing) { last = 0; return; }
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      if (hold > 0) { hold -= dt; if (hold <= 0) hidePop(); } else {
        var np = pos + dt * speed;
        for (var n = 0; n < pinsBy.length; n++) if (pinsBy[n].mt > pos && pinsBy[n].mt <= np) { np = pinsBy[n].mt; hold = 3; shown = n; pop.innerHTML = (pinsBy[n].src ? '<img src="' + esc(pinsBy[n].src) + '" alt="">' : '') + '<b>' + esc(pinsBy[n].title) + '</b><small>km ' + pinsBy[n].km + (pinsBy[n].credit ? ' · photo: ' + esc(pinsBy[n].credit) : '') + '</small>'; pop.hidden = false; break; }
        pos = np; if (pos >= total) { pos = total; playing = false; playBtn.textContent = '▶'; }
      }
      show(); requestAnimationFrame(tick);
    }
    function toggle() { playing = !playing; playBtn.textContent = playing ? '❚❚' : '▶'; playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); if (playing) { if (pos >= total) pos = 0; last = 0; requestAnimationFrame(tick); } }
    playBtn.onclick = toggle;
    scrub.oninput = function () { seek(scrub.value / 1000 * total); };
    rep.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); toggle(); } else if (e.key === 'ArrowRight') { e.preventDefault(); seek(pos + 60); } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(pos - 60); } });
    $$('.rl-splits tbody tr', host).forEach(function (r) { r.style.cursor = 'pointer'; r.onclick = function () { var k = +r.getAttribute('data-km'), j = run.d.findIndex(function (v) { return v >= (k - 1) * 1000; }); seek(MT[Math.max(0, j)]); }; });
    new ResizeObserver(function () { cam.size(); show(); }).observe($('.rl-cam', rep));

    // charts: one line each, clickable
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
    // a change of light or dark scheme redraws the maps
    new MutationObserver(function () { var d2 = isDark(); if (d2 !== dark) { dark = d2; cam.base(dark); drawOverview(); show(); } }).observe(D.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });
  }

  /* ---- the live box on the homepage: the latest run, as the whole box's background ---- */
  function renderBox(a) {
    var src = a.getAttribute('data-runs'); if (!src) return;
    var W = where(src);
    getJSON(src).then(function (idx) {
      if (!idx.length) return;
      var r = idx[0];
      a.classList.add('is-runlog');
      var kind = $('.plot-page-kind', a), line = $('.plot-page-line', a), title = $('.plot-page-title', a);
      if (kind) kind.textContent = 'Runlog · ' + short(r.start);
      if (title) title.textContent = r.title;
      if (line) line.innerHTML = '<span>' + r.km.toFixed(2) + ' km</span><span>' + clock(r.durationS) + '</span><span>' + pace(r.paceS) + ' /km</span><span>' + r.hrAvg + ' bpm</span><span class="rl-so"></span>';
      a.insertAdjacentHTML('afterbegin', '<span class="rl-bg" aria-hidden="true">' + thumb(r) + '<canvas></canvas></span>');
      if (reduced) return;
      var go = function () {
        Promise.all([getJSON(W.root + r.slug + '.json' + W.q), getJSON(W.root + r.slug + '.map.json' + W.q).catch(function () { return null; })]).then(function (res) {
          var run = res[0], cv = $('canvas', a), cam = Cam(cv, run, res[1], { across: 105, ppu: 2, margin: 100 }), vis = true, f = 0, last = 0, N = run.x.length, so = $('.rl-so', a);
          cam.base(true);
          new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(a);
          new ResizeObserver(function () { cam.size(); }).observe(a);
          function loop(now) { requestAnimationFrame(loop); if (!vis || D.hidden) { last = 0; return; } var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; f += dt * 13; if (f > N - 12) f = 0; cam.draw(f, true); if (so) so.textContent = (run.d[Math.floor(f)] / 1000).toFixed(1) + ' km so far'; }
          cam.draw(0, true); a.classList.add('is-live'); requestAnimationFrame(loop);
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
