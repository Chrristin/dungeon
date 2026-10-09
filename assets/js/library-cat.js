/* Booster, the Library's cat: a jointed vector cat (faces left, mirrored when she goes right). Poses, springs and the fur are in here;
   where she goes and what she does is LibCat, at the end of this file. The Library loads it before library.js. */
/* Booster: a jointed vector cat. Faces left; mirrored when she walks right. Units are "cat units" (about 130 long with her tail). */
(function (g) {
  var NS = 'http://www.w3.org/2000/svg', R = Math.PI / 180;
  function E(tag, at, par) { var n = document.createElementNS(NS, tag); for (var k in at) n.setAttribute(k, at[k]); if (par) par.appendChild(n); return n; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function damp(cur, tgt, rate, dt) { return lerp(cur, tgt, 1 - Math.exp(-rate * dt)); }
  var UID = 0;

  /* two-bone leg: the bend points back for a front leg (dir -1) and forward for a hind leg (dir +1) */
  function ik(rx, ry, tx, ty, l1, l2, dir) {
    var dx = tx - rx, dy = ty - ry, d = Math.hypot(dx, dy), mx = l1 + l2 - 0.02, mn = Math.abs(l1 - l2) + 0.02, dd = Math.min(mx, Math.max(mn, d)), base = Math.atan2(dy, dx),
      A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd)))), a1 = base + dir * A;
    return { ex: rx + l1 * Math.cos(a1), ey: ry + l1 * Math.sin(a1), px: rx + dd * Math.cos(base), py: ry + dd * Math.sin(base) };
  }

  /* smooth curves: a closed or open Catmull-Rom spline through points, as a cubic path */
  function spline(p, closed) { var n = p.length, d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1), i, a, b, c, e, m = closed ? n : n - 1;
    for (i = 0; i < m; i++) { a = p[(i - 1 + n) % n]; b = p[i]; c = p[(i + 1) % n]; e = p[(i + 2) % n]; if (!closed) { if (i === 0) a = b; if (i === n - 2) e = c; }
      d += 'C' + (b[0] + (c[0] - a[0]) / 6).toFixed(1) + ' ' + (b[1] + (c[1] - a[1]) / 6).toFixed(1) + ' ' + (c[0] - (e[0] - b[0]) / 6).toFixed(1) + ' ' + (c[1] - (e[1] - b[1]) / 6).toFixed(1) + ' ' + c[0].toFixed(1) + ' ' + c[1].toFixed(1); }
    return d + (closed ? 'Z' : ''); }
  /* a limb: tapered capsules between its joints (radius at each joint), joined by round ends. Drawn over one outline, so bends never break. */
  function cap(p, r, q, s2) { var dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || .001, A = Math.atan2(dy, dx), B = Math.acos(Math.max(-1, Math.min(1, (r - s2) / d))), f = function (P, rr, an) { return (P[0] + rr * Math.cos(an)).toFixed(1) + ' ' + (P[1] + rr * Math.sin(an)).toFixed(1); };
    return 'M' + f(p, r, A + B) + 'L' + f(q, s2, A + B) + 'A' + s2.toFixed(1) + ' ' + s2.toFixed(1) + ' 0 0 0 ' + f(q, s2, A - B) + 'L' + f(p, r, A - B) + 'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 1 0 ' + f(p, r, A + B) + 'Z'; }
  function limb(pts, rad) { var d = '', i; for (i = 0; i < pts.length - 1; i++) d += cap(pts[i], rad[i], pts[i + 1], rad[i + 1]); return d; }
  /* the body: one smooth shape that arches or dips along the spine */
  function torsoD(arch) { var top = [[-60, -6], [-50, -21], [-30, -26], [-6, -20], [22, -22], [48, -24], [64, -12]], bot = [[67, 4], [60, 18], [40, 22], [16, 14], [0, 15], [-22, 19], [-46, 24], [-62, 16]];
    function k(x) { return Math.sin(Math.PI * Math.max(0, Math.min(1, (x + 64) / 130))) * arch; }
    return spline(top.map(function (q) { return [q[0], q[1] - k(q[0])]; }).concat(bot.map(function (q) { return [q[0], q[1] - k(q[0]) * .55]; })), true); }
  function rnd(i) { var x = Math.sin(i * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); }
  function cr(a, b, c, e, t) { var t2 = t * t, t3 = t2 * t; return [.5 * ((2 * b[0]) + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - e[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + e[0]) * t3), .5 * ((2 * b[1]) + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - e[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + e[1]) * t3)]; }
  /* short hairs standing out of the body's edge, leaning back; three colours */
  function torsoHairs(arch) { var TOP = [[-60, -6], [-50, -21], [-30, -26], [-6, -20], [22, -22], [48, -24], [64, -12]], BOT = [[67, 4], [60, 18], [40, 22], [16, 14], [0, 15], [-22, 19], [-46, 24], [-62, 16]];
    function k(x) { return Math.sin(Math.PI * Math.max(0, Math.min(1, (x + 64) / 130))) * arch; }
    var tp = TOP.map(function (q) { return [q[0], q[1] - k(q[0])]; }), bt = BOT.map(function (q) { return [q[0], q[1] - k(q[0]) * .55]; }), dA = '', dB = '', dW = '', idx = 0;
    function run(pts, sign, below) { var n = pts.length, i, j; for (i = 0; i < n - 1; i++) { var a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], e = pts[Math.min(n - 1, i + 2)];
        for (j = 0; j < 5; j++) { var t = j / 5, p = cr(a, b, c, e, t), p2 = cr(a, b, c, e, t + .05), tx = p2[0] - p[0], ty = p2[1] - p[1], l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; var nx = ty, ny = -tx, r = rnd(idx++), Ln = 1.5 + r * 2.1, ruff = below && p[0] < -42 ? 1.5 : 1,
            vx = nx * .75 + tx * sign * .65, vy = ny * .75 + ty * sign * .65, vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
          var seg = 'M' + (p[0] - nx * .6).toFixed(1) + ' ' + (p[1] - ny * .6).toFixed(1) + 'L' + (p[0] + vx * Ln * ruff).toFixed(1) + ' ' + (p[1] + vy * Ln * ruff).toFixed(1);
          if (below) { if (p[0] > 38) dB += seg; else dW += seg; } else if (r < .42) dA += seg; else dB += seg; } } }
    run(tp, 1, false); run(bt, -1, true); return [dA, dB, dW]; }
  var POSES = {
    stand: { arch: 0, len: 1, pitch: 0, by: -47, neck: 0, front: 0, fold: 0, tail: [6, -6, -14, -22, -28], g: 0, lick: 0 },
    walk: { arch: 1, len: 1, pitch: 0, by: -47, neck: 4, front: 0, fold: 0, tail: [-4, -10, -16, -24, -32], g: 1, lick: 0 },
    sit: { arch: 5, len: .62, pitch: 40, by: -29, neck: -26, front: 0, fold: 1, tail: [-26, 6, 10, -4, -26], g: 0, lick: 0 },
    look: { arch: 5, len: .62, pitch: 40, by: -29, neck: -34, front: 1, fold: 1, tail: [-26, 6, 10, -4, -26], g: 0, lick: 0 },
    groom: { arch: 8, len: .62, pitch: 40, by: -29, neck: -52, front: 0, fold: 1, tail: [-26, 6, 10, -4, -26], g: 0, lick: 1 },
    stretch: { arch: -6, len: 1.12, pitch: -17, by: -40, neck: -28, front: 0, fold: 0, tail: [-62, -14, -6, -4, -4], g: 0, lick: 0 },
    crouch: { arch: 3, len: .9, pitch: 12, by: -33, neck: -10, front: 0, fold: 0, tail: [4, -4, -8, -10, -10], g: 0, lick: 0 },
    sleep: { arch: 5, len: .62, pitch: 40, by: -29, neck: -26, front: 0, fold: 1, tail: [-26, 6, 10, -4, -26], g: 0, lick: 0 }
  };

  function Cat(parent, o) {
    o = o || {}; var me = this, id = 'bc' + (UID++);
    me.k = o.scale || 1; me.x = o.x || 0; me.y = o.y || 0; me.dir = -1; me.t = 0; me.phase = 0; me.mode = 'stand'; me.modeT = 0; me.curl = 0; me.tok = 0;
    me.P = { arch: 0, len: 1, pitch: 0, by: -47, neck: 0, front: 0, fold: 0, g: 0, lick: 0, tail: [6, -6, -14, -22, -28], eye: 1, ear: 0 };
    me.paws = { NF: [-50, 0], FF: [-34, 0], NR: [48, 0], FR: [60, 0] };
    me.blinkAt = 2; me.blinkT = -1; me.earAt = 3; me.earT = -1; me.speed = 0; me.tx = null; me.lickT = 0;
    var C = { dark: '#34200f', dark2: '#4a2c16', orange: '#b9652c', rust: '#8e4a22', white: '#f6f2e8', pink: '#e7a3a0', green: '#9db652', greenD: '#4f6320', ink: '#24150a' };
    me.C = C;

    var root = me.root = E('g', { class: 'booster' }, parent);
    E('title', {}, root).textContent = 'Booster';
    var defs = E('defs', {}, root);
    function rg(idn, col, a0) { var gd = E('radialGradient', { id: id + idn }, defs); E('stop', { offset: 0, 'stop-color': col, 'stop-opacity': a0 }, gd); E('stop', { offset: 1, 'stop-color': col, 'stop-opacity': 0 }, gd); }
    rg('o', C.orange, .95); rg('r', C.rust, .9); rg('d', C.dark, .95); rg('w', C.white, .95);
    var sh = E('linearGradient', { id: id + 's', x1: 0, y1: 0, x2: 0, y2: 1 }, defs); E('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': .16 }, sh); E('stop', { offset: .5, 'stop-color': '#fff', 'stop-opacity': 0 }, sh); E('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': .28 }, sh);
    var pwg = E('linearGradient', { id: id + 'pw', x1: 0, y1: 0, x2: 0, y2: 1 }, defs); E('stop', { offset: 0, 'stop-color': '#fffdf6' }, pwg); E('stop', { offset: 1, 'stop-color': '#d9d3c3' }, pwg);
    var eg = E('radialGradient', { id: id + 'e', cx: .42, cy: .38, r: .75 }, defs); E('stop', { offset: 0, 'stop-color': '#c7dc7a' }, eg); E('stop', { offset: .6, 'stop-color': C.green }, eg); E('stop', { offset: 1, 'stop-color': C.greenD }, eg);
    var torsoPath = torsoD(0);
    var cp = E('clipPath', { id: id + 'c' }, defs); E('path', { d: torsoPath }, cp);

    me.shadow = E('ellipse', { cx: 0, cy: 1, rx: 60, ry: 5, fill: '#000', opacity: .3 }, root);
    me.far = E('g', {}, root);
    me.bodyA = E('g', {}, root);
    me.tailG = E('g', {}, me.bodyA);
    var ts = me.torsoS = E('g', {}, me.bodyA);
    E('path', { d: torsoPath, fill: C.dark2 }, ts);
    var tg = E('g', { 'clip-path': 'url(#' + id + 'c)' }, ts);
    [['o', -4, -14, 24, 11, -8], ['d', -30, -16, 14, 9, 0], ['r', 16, -14, 20, 8, 6], ['o', 38, -8, 22, 12, -14], ['d', 4, -4, 14, 7, 0], ['r', -18, 4, 12, 7, 0], ['o', 56, 2, 14, 12, 0], ['d', 46, -16, 12, 7, 0], ['d', -10, -22, 16, 6, -4]].forEach(function (a) {
      E('ellipse', { cx: a[1], cy: a[2], rx: a[3], ry: a[4], fill: 'url(#' + id + a[0] + ')', transform: 'rotate(' + a[5] + ' ' + a[1] + ' ' + a[2] + ')' }, tg); });
    E('path', { d: 'M-64 6C-63 16-58 24-44 24C-28 24-16 16 0 15C14 14 26 22 40 22C56 22 69 12 66-4C66 6 60 9 50 8C40 6 28 7 14 8C-2 9-18 11-34 11C-50 11-62 3-64 6Z', fill: C.white, opacity: .97 }, tg);
    E('ellipse', { cx: -52, cy: 8, rx: 14, ry: 19, fill: C.white }, tg);
    E('path', { d: 'M-50-8C-30-20 4-22 40-18', fill: 'none', stroke: '#fff', 'stroke-width': 2, opacity: .12 }, tg);
    E('path', { d: torsoPath, fill: 'url(#' + id + 's)' }, ts);
    E('path', { d: torsoPath, fill: 'none', stroke: C.ink, 'stroke-width': .9, opacity: .85 }, ts);
    me.hA = E('path', { fill: 'none', stroke: '#2a180b', 'stroke-width': .6, 'stroke-linecap': 'round', opacity: .7 }, ts); me.hB = E('path', { fill: 'none', stroke: '#c9742f', 'stroke-width': .8, 'stroke-linecap': 'round', opacity: .75 }, ts); me.hW = E('path', { fill: 'none', stroke: '#fdfaf2', 'stroke-width': .9, 'stroke-linecap': 'round', opacity: .9 }, ts);

    me.tp = [].filter.call(root.querySelectorAll('path'), function (q) { return q.getAttribute('d') === torsoPath; });
    me.near = E('g', {}, root);
    me.bodyB = E('g', {}, root);
    me.headG = E('g', {}, me.bodyB);
    me.curlG = E('g', {}, root); me.curlG.setAttribute('opacity', 0);
    me.zz = E('g', { opacity: 0 }, root);
    ['z', 'z', 'z'].forEach(function (z, i) { var t = E('text', { x: i * 7, y: -i * 9, 'font-size': 9 + i * 3, 'font-family': 'Georgia,serif', 'font-style': 'italic', fill: '#cfd6ff', opacity: .85 }, me.zz); t.textContent = 'z'; });

    /* legs: smooth tapered shapes through their joints, with the paw's white sock; the hind leg is a Z (thigh, knee forward, hock back, foot) */
    function lg(par, up, dn, col) { var gg = E('g', {}, par); return { g: gg, k: E('path', { fill: 'none', stroke: 'none' }, gg), u: E('path', { fill: up }, gg), s: E('path', { fill: 'url(#' + id + 's)' }, gg), d: E('path', { fill: dn }, gg), h: E('path', { fill: 'none', stroke: col, 'stroke-width': .9, 'stroke-linecap': 'round', opacity: .8 }, gg), p: E('ellipse', { rx: 8.6, ry: 4.4, fill: 'url(#' + id + 'pw)' }, gg) }; }
    me.L = { FF: lg(me.far, '#26150a', C.white, '#26150a'), FR: lg(me.far, '#6b3a1c', C.white, '#6b3a1c'), NF: lg(me.near, C.dark, C.white, C.dark), NR: lg(me.near, '#9a5326', C.white, '#9a5326') };
    me.hn = E('g', {}, me.near); me.hn1 = E('ellipse', { rx: 18, ry: 16, fill: '#9a5326', stroke: C.ink, 'stroke-width': .8 }, me.hn); me.hn2 = E('ellipse', { rx: 15, ry: 13, fill: 'url(#' + id + 'o)' }, me.hn); me.hn3 = E('ellipse', { rx: 18, ry: 16, fill: 'url(#' + id + 's)' }, me.hn);
    /* tail: five round segments, the last one white */
    me.tseg = []; var par = me.tailG, lens = [15, 15, 14, 13, 12], wid = [10, 9.4, 8.6, 7.6, 6.6];
    for (var i = 0; i < 5; i++) { var gg = E('g', {}, par); var ln = E('path', { d: 'M0 0L' + lens[i] + ' 0', stroke: i === 4 ? C.white : (i === 3 ? '#4a2c16' : C.dark2), 'stroke-width': wid[i], 'stroke-linecap': 'round', fill: 'none' }, gg); if (i === 3) E('path', { d: 'M0 0L' + lens[i] + ' 0', stroke: C.white, 'stroke-width': wid[i] * .86, 'stroke-linecap': 'round', fill: 'none', opacity: .55 }, gg); var fz = '', jj, sd; for (jj = 0; jj < 6; jj++) for (sd = -1; sd <= 1; sd += 2) fz += 'M' + (lens[i] * (jj + .5) / 6).toFixed(1) + ' ' + (sd * wid[i] * .42).toFixed(1) + 'L' + (lens[i] * (jj + .5) / 6 + 1.8).toFixed(1) + ' ' + (sd * (wid[i] * .5 + 1.9 + ((i * 7 + jj) % 3) * .6)).toFixed(1);
      E('path', { d: fz, stroke: i === 4 ? C.white : (i === 3 ? '#6a4a30' : C.dark2), 'stroke-width': .8, 'stroke-linecap': 'round', fill: 'none', opacity: .85 }, gg); me.tseg.push({ g: gg, len: lens[i] }); par = E('g', { transform: 'translate(' + lens[i] + ' 0)' }, gg); me.tseg[i].next = par; }

    /* head: a profile and a front view, with eyelids that close from the top */
    var hp = me.hp = E('g', {}, me.headG), hf = me.hf = E('g', {}, me.headG);
    me.earP = E('g', {}, hp);
    E('path', { d: 'M4-12L16-34L22-8Z', fill: '#2a180b', stroke: C.ink, 'stroke-width': .7 }, me.earP);
    E('path', { d: 'M-8-14L-2-36L12-12Z', fill: C.dark2, stroke: C.ink, 'stroke-width': .8 }, hp);
    E('path', { d: 'M-4-16L-1-31L7-14Z', fill: C.pink, opacity: .8 }, hp);
    E('ellipse', { cx: 0, cy: 0, rx: 22, ry: 18, fill: C.dark2, stroke: C.ink, 'stroke-width': .9 }, hp);
    E('ellipse', { cx: 8, cy: -7, rx: 12, ry: 9, fill: 'url(#' + id + 'o)' }, hp);
    E('ellipse', { cx: 14, cy: 5, rx: 9, ry: 8, fill: 'url(#' + id + 'd)' }, hp);
    E('path', { d: 'M-4-17C-1-6-6 4-14 10L-6 12C2 6 4-6 2-17Z', fill: C.white }, hp);
    E('ellipse', { cx: -15, cy: 7, rx: 10, ry: 8, fill: C.white }, hp); E('ellipse', { cx: -11, cy: 13, rx: 8, ry: 5, fill: C.white }, hp);
    E('path', { d: 'M-25 2L-19 2L-22 6Z', fill: C.pink, stroke: C.ink, 'stroke-width': .5 }, hp);
    E('path', { d: 'M-22 6C-21 9-17 10-13 8M-22 6C-23 9-26 10-28 9', fill: 'none', stroke: C.ink, 'stroke-width': .7 }, hp);
    E('path', { d: 'M-22 3L-41 -9M-22 5L-43 -2M-21.5 7L-40 9', stroke: '#fff', 'stroke-width': .45, opacity: .5, fill: 'none' }, hp);
    E('path', { d: 'M-24 4L-47 -4M-24 5.5L-49 5M-23.5 7L-47 14M-22 8.5L-42 21', stroke: '#fff', 'stroke-width': .6, opacity: .88, fill: 'none' }, hp);
    E('path', { d: 'M-9 -9L-18 -18M-5 -10L-11 -20M-1 -10L-4 -19', stroke: '#fff', 'stroke-width': .5, opacity: .75, fill: 'none' }, hp);
    E('path', { d: 'M-14 15l-3 4M-9 17l-2 5M-4 17l-1 5M1 15l0 5M-18 11l-4 3', stroke: '#fff', 'stroke-width': .8, 'stroke-linecap': 'round', opacity: .9, fill: 'none' }, hp);
    E('ellipse', { cx: -8, cy: -2, rx: 6, ry: 6.8, fill: 'url(#' + id + 'e)', stroke: C.greenD, 'stroke-width': .7 }, hp);
    E('ellipse', { cx: -8.6, cy: -2, rx: 2.5, ry: 4.5, fill: '#0b0705' }, hp); E('circle', { cx: -10.2, cy: -4.4, r: 1.4, fill: '#fff' }, hp);
    me.lidP = E('g', { transform: 'translate(-8 -8.8)' }, hp); E('rect', { x: -6.8, y: -2, width: 13.6, height: 25, rx: 5, fill: C.dark2 }, me.lidP);
    me.lashP = E('path', { d: 'M-14 -1C-11 2-5 2-2 -1', stroke: C.ink, 'stroke-width': 1.1, fill: 'none', opacity: 0 }, hp);
    E('path', { d: 'M-8-14L-3-36L10-12Z', fill: 'none' }, hp);
    /* front view */
    E('path', { d: 'M-22-10L-26-36L-6-17Z', fill: C.dark2, stroke: C.ink, 'stroke-width': .8 }, hf); E('path', { d: 'M-21-14L-24-30L-11-18Z', fill: C.pink, opacity: .8 }, hf);
    me.earF = E('g', {}, hf); E('path', { d: 'M22-10L26-36L6-17Z', fill: C.dark2, stroke: C.ink, 'stroke-width': .8 }, me.earF); E('path', { d: 'M21-14L24-30L11-18Z', fill: C.pink, opacity: .8 }, me.earF);
    E('ellipse', { cx: 0, cy: 0, rx: 25, ry: 20, fill: C.dark2, stroke: C.ink, 'stroke-width': .9 }, hf);
    E('ellipse', { cx: 13, cy: -7, rx: 13, ry: 10, fill: 'url(#' + id + 'o)' }, hf); E('ellipse', { cx: -14, cy: 6, rx: 9, ry: 8, fill: 'url(#' + id + 'd)' }, hf);
    E('path', { d: 'M-4-19L4-19C5-6 9 4 12 11L-12 11C-8 4-5-6-4-19Z', fill: C.white }, hf);
    E('ellipse', { cx: 0, cy: 10, rx: 13, ry: 9, fill: C.white }, hf);
    E('path', { d: 'M-4 5L4 5L0 10Z', fill: C.pink, stroke: C.ink, 'stroke-width': .5 }, hf); E('path', { d: 'M0 10C0 13-5 14-7 12M0 10C0 13 5 14 7 12', fill: 'none', stroke: C.ink, 'stroke-width': .7 }, hf);
    E('path', { d: 'M-9 7L-33 0M-9 9L-34 9M-9 11L-31 18M-8 12L-26 23M9 7L33 0M9 9L34 9M9 11L31 18M8 12L26 23', stroke: '#fff', 'stroke-width': .6, opacity: .88, fill: 'none' }, hf);
    E('path', { d: 'M-14 -11L-21 -19M-9 -12L-13 -22M14 -11L21 -19M9 -12L13 -22', stroke: '#fff', 'stroke-width': .5, opacity: .75, fill: 'none' }, hf);
    E('path', { d: 'M-23 4l-4 2M-24 9l-4 3M-21 14l-3 4M23 4l4 2M24 9l4 3M21 14l3 4', stroke: '#fff', 'stroke-width': .8, 'stroke-linecap': 'round', opacity: .9, fill: 'none' }, hf);
    [-10.5, 10.5].forEach(function (cx, i) { E('ellipse', { cx: cx, cy: -2, rx: 6.2, ry: 7, fill: 'url(#' + id + 'e)', stroke: C.greenD, 'stroke-width': .7 }, hf); E('ellipse', { cx: cx, cy: -2, rx: 2.5, ry: 4.6, fill: '#0b0705' }, hf); E('circle', { cx: cx - 1.9, cy: -4.4, r: 1.4, fill: '#fff' }, hf); });
    me.lidF = []; me.lashF = [];
    [-10.5, 10.5].forEach(function (cx, i) { var lg = E('g', { transform: 'translate(' + cx + ' -9)' }, hf); E('rect', { x: -6.8, y: -2, width: 13.6, height: 25, rx: 5, fill: C.dark2 }, lg); me.lidF.push(lg); me.lashF.push(E('path', { d: 'M' + (cx - 6) + ' -1C' + (cx - 3) + ' 2 ' + (cx + 3) + ' 2 ' + (cx + 6) + ' -1', stroke: C.ink, 'stroke-width': 1.1, fill: 'none', opacity: 0 }, hf)); });
    E('ellipse', { cx: 0, cy: 22, rx: 16, ry: 8, fill: C.white, opacity: 0 }, hf);

    /* curled up asleep */
    var cg = me.curlG; me.curlBody = E('g', {}, cg);
    var cb = me.curlBody; E('ellipse', { cx: 6, cy: -22, rx: 44, ry: 24, fill: C.dark2, stroke: C.ink, 'stroke-width': .9 }, cb);
    var cc = E('clipPath', { id: id + 'k' }, defs); E('ellipse', { cx: 6, cy: -22, rx: 44, ry: 24 }, cc); var ck = E('g', { 'clip-path': 'url(#' + id + 'k)' }, cb);
    [['o', 0, -34, 24, 11], ['d', 22, -26, 16, 10], ['r', -14, -30, 14, 8], ['o', 34, -18, 14, 10], ['d', -8, -14, 14, 8]].forEach(function (a) { E('ellipse', { cx: a[1], cy: a[2], rx: a[3], ry: a[4], fill: 'url(#' + id + a[0] + ')' }, ck); });
    E('path', { d: 'M-38-8C-24 4 0 4 22 2C34 0 44-6 50-12C52 0 40 4 20 4C-6 6-30 4-40-4Z', fill: C.white }, ck);
    E('ellipse', { cx: 6, cy: -22, rx: 44, ry: 24, fill: 'url(#' + id + 's)' }, cb);
    me.curlTail = E('path', { d: 'M48-10C62-6 56 4 36 4C10 6-18 4-40 2', fill: 'none', stroke: C.dark2, 'stroke-width': 9, 'stroke-linecap': 'round' }, cg);
    E('path', { d: 'M-18 3C-30 4-38 3-46 1', fill: 'none', stroke: C.white, 'stroke-width': 8.6, 'stroke-linecap': 'round' }, cg);
    var hd = me.curlHead = E('g', { transform: 'translate(-40 -16) rotate(-14)' }, cg);
    E('path', { d: 'M-4-10L2-30L14-12Z', fill: '#2a180b', stroke: C.ink, 'stroke-width': .7 }, hd); E('path', { d: 'M-14-9L-12-30L2-14Z', fill: C.dark2, stroke: C.ink, 'stroke-width': .7 }, hd);
    E('ellipse', { cx: 0, cy: 0, rx: 20, ry: 16, fill: C.dark2, stroke: C.ink, 'stroke-width': .9 }, hd); E('ellipse', { cx: 6, cy: -5, rx: 11, ry: 8, fill: 'url(#' + id + 'o)' }, hd);
    E('path', { d: 'M-8-15C-5-5-8 4-14 9L-6 10C0 4 0-5-2-15Z', fill: C.white }, hd); E('ellipse', { cx: -13, cy: 6, rx: 9, ry: 7, fill: C.white }, hd);
    E('path', { d: 'M-22 3L-17 3L-19.5 6.5Z', fill: C.pink }, hd);
    E('path', { d: 'M-12-3C-9 0-5 0-2-3', stroke: C.ink, 'stroke-width': 1.2, fill: 'none', 'stroke-linecap': 'round' }, hd);
    E('ellipse', { cx: -22, cy: 12, rx: 9, ry: 5, fill: C.white, stroke: C.ink, 'stroke-width': .6 }, cg);
    me.curlTail.setAttribute('transform', 'translate(0 0)');

    [].forEach.call(root.querySelectorAll('[stroke="#24150a"]'), function (q) { q.setAttribute('stroke-opacity', '.2'); });
    root.style.cursor = 'pointer';
    me.apply();
  }

  Cat.prototype.spr = function (key, cur, tgt, w, z, dt) { var V = this.vel || (this.vel = {}), v = V[key] || 0, n = Math.max(1, Math.ceil(dt * 240)), h = dt / n, i; for (i = 0; i < n; i++) { v += (w * w * (tgt - cur) - 2 * z * w * v) * h; cur += v * h; } V[key] = v; return cur; };
  Cat.prototype.setMode = function (m) { if (this.mode === m) return; this.mode = m; this.modeT = 0; this.lickT = 0; if (this.cb) this.cb(m); };
  Cat.prototype.blink = function () { this.blinkT = 0; };

  Cat.prototype.step = function (dt) {
    var me = this, P = me.P, m = me.mode, tgt = POSES[m] || POSES.stand, rate = (m === 'walk') ? 22 : 7, i; me.dtL = dt;
    me.t += dt; me.modeT += dt;
    /* where she goes */
    var walking = (m === 'walk') && me.tx != null;
    if (walking) {
      var d = me.tx - me.x, sp = me.vmax || 62; if (Math.abs(d) < 1.5) { me.tx = null; me.speed = 0; var r = me.arrive; me.arrive = null; if (r) r(); } else { me.dir = d < 0 ? -1 : 1; me.speed = damp(me.speed, sp, 6, dt); me.x += Math.sign(d) * Math.min(Math.abs(d), me.speed * me.k * dt); me.phase += dt * (me.speed / 59) / 0.9; }
    } else me.speed = damp(me.speed, 0, 8, dt);
    if (me.jp) { var J = me.jp, tt = (J.t += dt);
      if (tt < .42) me.setMode('crouch');
      else if (tt < 1.32) { var uj = (tt - .42) / .9; me.setMode('jump'); me.x = lerp(J.x0, J.x1, uj); me.y = lerp(J.y0, J.y1, uj) - 4 * J.h * uj * (1 - uj); POSES.jump.pitch = lerp(34, -30, uj); }
      else if (tt < 1.7) { me.x = J.x1; me.y = J.y1; me.setMode('crouch'); }
      else { me.jp = null; me.jumping = false; me.setMode('stand'); if (J.done) J.done(); } }
    /* pose */
    var wk = (m === 'walk');
    ['arch', 'len', 'pitch', 'by'].forEach(function (k) { P[k] = me.spr(k, P[k], tgt[k], wk ? 16 : 8.5, wk ? 1 : .72, dt); });
    P.neck = me.spr('neck', P.neck, tgt.neck, wk ? 14 : 10, .8, dt);
    ['front', 'fold', 'g', 'lick'].forEach(function (k) { P[k] = Math.max(0, Math.min(1, me.spr(k, P[k], tgt[k], k === 'g' ? 10 : (k === 'front' ? 5.5 : 7), 1, dt))); });
    for (i = 0; i < 5; i++) P.tail[i] = me.spr('t' + i, P.tail[i], tgt.tail[i], 6.5, .5, dt);
    me.curl = Math.max(0, Math.min(1, me.spr('curl', me.curl, m === 'sleep' ? 1 : 0, m === 'sleep' ? 3 : 5, 1, dt)));
    /* blinking and ear twitches */
    if (m === 'sleep') P.eye = damp(P.eye, 0, 6, dt); else {
      me.blinkAt -= dt; if (me.blinkAt <= 0 && me.blinkT < 0) { me.blinkT = 0; me.blinkAt = 2.2 + Math.random() * 3.6; }
      var tgtEye = 1; if (me.blinkT >= 0) { me.blinkT += dt; var u = me.blinkT / .24; tgtEye = u < .5 ? 1 - u * 2 : (u < 1 ? (u - .5) * 2 : 1); if (u >= 1) me.blinkT = -1; P.eye = tgtEye; } else P.eye = damp(P.eye, 1, 14, dt);
      if (m === 'look') { /* a slow, sleepy blink now and then */ var q = (me.modeT % 3.2); if (q > 2.4 && q < 3.0 && me.blinkT < 0) P.eye = Math.max(0, 1 - Math.sin((q - 2.4) / .6 * Math.PI) * 1.05); }
    }
    me.earAt -= dt; if (me.earAt <= 0 && me.earT < 0) { me.earT = 0; me.earAt = 2.5 + Math.random() * 4; } if (me.earT >= 0) { me.earT += dt; P.ear = Math.sin(me.earT / .3 * Math.PI) * 14; if (me.earT > .3) { me.earT = -1; P.ear = 0; } }
    me.apply();
  };

  Cat.prototype.apply = function () {
    var me = this, P = me.P, C = me.C, len = P.len, pr = P.pitch * R, c = Math.cos(pr), s = Math.sin(pr), by = P.by, t = me.t, i;
    var bob = 0, sway = 0;
    if (P.g > .01) { bob = 1.5 * Math.sin(me.phase * 4 * Math.PI) * P.g; sway = 1.2 * Math.sin(me.phase * 2 * Math.PI) * P.g; }
    var breathe = (me.mode === 'sleep') ? 0 : 0.35 * Math.sin(t * 2.2);
    by = by + bob;
    var bt = 'translate(0 ' + by.toFixed(2) + ') rotate(' + (P.pitch + sway).toFixed(2) + ')';
    me.bodyA.setAttribute('transform', bt); me.bodyB.setAttribute('transform', bt);
    me.torsoS.setAttribute('transform', 'translate(-46 0) scale(' + len.toFixed(3) + ' ' + (1 + breathe * .02).toFixed(3) + ') translate(46 0)');
    var hipLx = -46 + 92 * len, neckLx = -46 + (-58 + 46) * len - 2;
    function W(lx, ly) { return [lx * c - ly * s, by + lx * s + ly * c]; }
    /* tail */
    me.tailG.setAttribute('transform', 'translate(' + (-46 + 112 * len - 4).toFixed(2) + ' -6)');
    var idle = (me.mode === 'sit' || me.mode === 'look' || me.mode === 'groom') ? 3 : 7, wag = (me.mode === 'stretch') ? 2 : 1;
    for (i = 0; i < 5; i++) { var a = P.tail[i] + idle * wag * Math.sin(t * 1.5 + i * .8) * (i + 1) / 5 * (me.mode === 'walk' ? 1.6 : 1); me.tseg[i].g.setAttribute('transform', 'rotate(' + a.toFixed(2) + ')'); }
    /* head */
    var hx = neckLx, hy = -8, headDip = (P.lick > .5) ? Math.sin(t * 7) * 3 : 0, nk = P.neck + (P.g > .5 ? Math.sin(me.phase * 4 * Math.PI) * 2 : 0) + (P.lick * -6);
    me.headG.setAttribute('transform', 'translate(' + hx.toFixed(2) + ' ' + (hy + headDip).toFixed(2) + ') rotate(' + nk.toFixed(2) + ') scale(1.22) translate(-16 -6)');
    var f = P.front; me.hp.setAttribute('opacity', (1 - f).toFixed(3)); me.hf.setAttribute('opacity', f.toFixed(3));
    me.hp.setAttribute('transform', 'scale(' + (1 - .25 * Math.sin(Math.PI * f)).toFixed(3) + ' 1)'); me.hf.setAttribute('transform', 'scale(' + (1 - .25 * Math.sin(Math.PI * (1 - f))).toFixed(3) + ' 1)');
    var lid = 1 - P.eye; me.lidP.setAttribute('transform', 'translate(-8 -8.8) scale(1 ' + (lid * .58 + .001).toFixed(3) + ')'); me.lashP.setAttribute('opacity', lid > .85 ? 1 : 0);
    me.lidF.forEach(function (l, j) { var cx = j ? 10.5 : -10.5; l.setAttribute('transform', 'translate(' + cx + ' -9) scale(1 ' + (lid * .58 + .001).toFixed(3) + ')'); me.lashF[j].setAttribute('opacity', lid > .85 ? 1 : 0); });
    me.earP.setAttribute('transform', 'rotate(' + (P.ear).toFixed(2) + ' 12 -10)'); me.earF.setAttribute('transform', 'rotate(' + (P.ear * .8).toFixed(2) + ' 14 -12)');

    /* legs: where each shoulder and hip is, then where each paw goes */
    var sh = W(-46, 6), hp = W(hipLx, 6), pw = me.paws, ph = me.phase, g = P.g, fold = P.fold;
    function gait(off) { var u = ((ph + off) % 1 + 1) % 1, S = 17, lift = 10; if (u < .6) return [-S + 2 * S * (u / .6), 0]; var v = (u - .6) / .4, vs = v * v * (3 - 2 * v); return [S - 2 * S * vs, -lift * Math.sin(Math.PI * v)]; }
    var gNR = gait(0), gNF = gait(.25), gFR = gait(.5), gFF = gait(.75), lickP = P.lick;
    function tgt(base, gt) { return [lerp(base[0], base[0] + gt[0], g), lerp(base[1], base[1] + gt[1], g)]; }
    var sb = { NF: [sh[0] - 5, 0], FF: [sh[0] + 9, 0], NR: [hp[0] + 3, 0], FR: [hp[0] - 11, 0] };
    if (me.mode === 'stretch') { sb.NF = [sh[0] - 46, 0]; sb.FF = [sh[0] - 30, 0]; }
    if (me.mode === 'jump') { sb.NF = [sh[0] - 18, sh[1] + 24]; sb.FF = [sh[0] - 6, sh[1] + 27]; sb.NR = [hp[0] + 22, hp[1] + 18]; sb.FR = [hp[0] + 11, hp[1] + 23]; }
    var T = { NF: tgt(sb.NF, gNF), FF: tgt(sb.FF, gFF), NR: tgt(sb.NR, gNR), FR: tgt(sb.FR, gFR) };
    if (lickP > .01) { var lp = [sh[0] - 16 - Math.sin(t * 7) * 3, -34 + Math.sin(t * 7) * 3]; T.NF = [lerp(T.NF[0], lp[0], lickP), lerp(T.NF[1], lp[1], lickP)]; }
    var k;
    for (k in T) { pw[k][0] = me.spr('px' + k, pw[k][0], T[k][0], g > .5 ? 38 : 13, 1, me.dtL || 1 / 60); pw[k][1] = me.spr('py' + k, pw[k][1], T[k][1], g > .5 ? 38 : 13, 1, me.dtL || 1 / 60); }
    function front(L, root, paw, rr) { var wr = [paw[0] + 4, paw[1] - 15], r = ik(root[0], root[1], wr[0], wr[1], 23, 25, -1), wx = r.px, wy = r.py, vx = paw[0] - wx, vy = paw[1] - wy, vl = Math.hypot(vx, vy) || 1, ln = Math.min(vl, 17), tx = wx + vx / vl * ln, ty = wy + vy / vl * ln, up = limb([root, [r.ex, r.ey], [wx, wy]], rr);
      var lo = limb([[wx, wy], [tx, ty]], [rr[2] - .1, 4.9]); L.u.setAttribute('d', up); L.s.setAttribute('d', up); L.k.setAttribute('d', up + lo);
      L.h.setAttribute('d', 'M' + (r.ex + 2).toFixed(1) + ' ' + (r.ey - 1).toFixed(1) + 'l6 2M' + (r.ex + 3).toFixed(1) + ' ' + (r.ey + 2).toFixed(1) + 'l6 3M' + (r.ex + 2).toFixed(1) + ' ' + (r.ey - 4).toFixed(1) + 'l5 -1M' + (tx - 9).toFixed(1) + ' ' + (ty - 2).toFixed(1) + 'l-3 .5M' + (tx - 9).toFixed(1) + ' ' + (ty + .5).toFixed(1) + 'l-3 1.5');
      L.d.setAttribute('d', lo); L.p.setAttribute('cx', (tx - 3.6).toFixed(2)); L.p.setAttribute('cy', (ty - 3.2).toFixed(2)); }
    function hind(L, root, paw, off, rr) { var toe = [lerp(paw[0], root[0] - 25 + off, fold), lerp(paw[1], -1, fold)], hock = [lerp(toe[0] + 7, root[0] + 9 + off, fold), lerp(toe[1] - 17, -4.5, fold)],
        r = ik(root[0], root[1], hock[0], hock[1], 27, 25, 1), hx = r.px, hy = r.py, mid = [lerp(hx, toe[0], .55) + 1.5, lerp(hy, toe[1], .55)], up = limb([root, [r.ex, r.ey], [hx, hy]], rr);
      var lo = limb([[hx, hy], mid, [toe[0] + 1, toe[1] - 2]], [4.9, 4.2, 4.8]); L.u.setAttribute('d', up); L.s.setAttribute('d', up); L.k.setAttribute('d', up + lo);
      L.h.setAttribute('d', 'M' + (hx + 3).toFixed(1) + ' ' + (hy - 3).toFixed(1) + 'l6 -2M' + (hx + 3).toFixed(1) + ' ' + hy.toFixed(1) + 'l6 0M' + (hx + 2).toFixed(1) + ' ' + (hy + 3).toFixed(1) + 'l5 2M' + (toe[0] - 9).toFixed(1) + ' ' + (toe[1] - 3).toFixed(1) + 'l-3 .5M' + (toe[0] - 9).toFixed(1) + ' ' + (toe[1] - .5).toFixed(1) + 'l-3 1.5');
      L.d.setAttribute('d', lo); L.p.setAttribute('cx', (toe[0] - 3.4).toFixed(2)); L.p.setAttribute('cy', (toe[1] - 3).toFixed(2)); }
    var shF = W(-46, 8), shN = W(-44, 6);
    front(me.L.NF, shN, pw.NF, [10.5, 7.2, 5.2]); front(me.L.FF, [shF[0] + 7, shF[1] - 1], pw.FF, [9.5, 6.6, 4.9]);
    hind(me.L.FR, [hp[0] - 6, hp[1] - 1], pw.FR, -7, [10.5, 6.8, 5]); hind(me.L.NR, [hp[0] + 2, hp[1]], pw.NR, 0, [12.5, 7.4, 5.2]);
    var hRot = P.pitch + sway; [me.hn1, me.hn2, me.hn3].forEach(function (e, ii) { e.setAttribute('cx', (hp[0] + 2).toFixed(1)); e.setAttribute('cy', (hp[1] - 1).toFixed(1)); e.setAttribute('transform', 'rotate(' + hRot.toFixed(1) + ' ' + (hp[0] + 2).toFixed(1) + ' ' + (hp[1] - 1).toFixed(1) + ')'); e.setAttribute('rx', ii === 1 ? 9 : 11); e.setAttribute('ry', ii === 1 ? 8 : 10); e.setAttribute('opacity', ii === 0 ? 0 : .8); });
    var arch = P.arch + (P.g > .05 ? 2.4 * Math.sin(ph * 4 * Math.PI + 1) * P.g : 0) + 1.1 * Math.sin(t * 2.2) * (1 - P.g);
    var td = torsoD(arch); me.tp.forEach(function (q) { q.setAttribute('d', td); }); var th = torsoHairs(arch); me.hA.setAttribute('d', th[0]); me.hB.setAttribute('d', th[1]); me.hW.setAttribute('d', th[2]);
    /* where she stands */
    var sx = me.dir === 1 ? -1 : 1; me.root.setAttribute('transform', 'translate(' + me.x.toFixed(2) + ' ' + me.y.toFixed(2) + ') scale(' + (me.k * sx * 1).toFixed(3) + ' ' + me.k + ')');
    me.shadow.setAttribute('rx', (46 + 14 * (1 - fold * .5)).toFixed(1)); me.shadow.setAttribute('opacity', (.3 * (1 - me.curl * .3)).toFixed(2));
    var cu = me.curl; var rigO = 1 - Math.min(1, cu * 1.6); [me.far, me.bodyA, me.near, me.bodyB].forEach(function (n) { n.setAttribute('opacity', rigO.toFixed(2)); });
    me.curlG.setAttribute('opacity', Math.min(1, cu * 1.4).toFixed(2));
    me.curlBody.setAttribute('transform', 'translate(0 ' + (-(1 - cu) * 3).toFixed(2) + ') scale(1 ' + (1 + .035 * Math.sin(t * 1.6) * cu).toFixed(3) + ')');
    me.curlG.setAttribute('transform', 'translate(0 0)');
    me.zz.setAttribute('opacity', (cu > .9 ? 1 : 0)); me.zz.setAttribute('transform', 'translate(-30 -52)');
    var zi = 0; [].forEach.call(me.zz.childNodes, function (z) { var u = ((t * .45 + zi * .33) % 1); z.setAttribute('opacity', (Math.sin(u * Math.PI) * .9).toFixed(2)); z.setAttribute('transform', 'translate(' + (u * 10).toFixed(1) + ' ' + (-u * 18).toFixed(1) + ')'); zi++; });
  };

  Cat.prototype.jump = function (x1, y1, done) { /* crouch, spring, fly, land: driven by step() */
    var me = this; me.dir = x1 < me.x ? -1 : 1; me.tx = null; me.jumping = true; me.jp = { t: 0, x0: me.x, y0: me.y, x1: x1, y1: y1, h: 26 * me.k + Math.abs(me.y - y1) * .35, done: done };
  };
  POSES.jump = { arch: -3, len: 1.18, pitch: 20, by: -40, neck: -14, front: 0, fold: 0, tail: [14, 4, -2, -8, -14], g: 0, lick: 0, air: 1 };

  g.Booster = Cat; g.BoosterPoses = POSES;
})(window);


/* ------------------------------------------------------------------------------------------------------------------------
   The Library's cat. Two places she appears:
   - LibCat.landing: on the first view, over the pictures of the bookcases. She walks along the front of the tops, jumps from one
     bookcase to the next, sits, looks at you, grooms, stretches, and now and then goes to sleep on the teddy bear. She never
     touches anything. On a phone (the bookcases stand one under another) she stays on one bookcase at a time: sits, stands,
     stretches, grooms and sleeps, and moves to another bookcase now and then. With "reduce motion" she is asleep on the teddy.
   - LibCat.live: on an opened bookcase she was on, she sits at the front of its top, faces you and blinks.
   The tops she can use come from data-top on each bookcase's button, which "npm run shelves" writes.
   ------------------------------------------------------------------------------------------------------------------------ */
(function (g) {
  var NS = 'http://www.w3.org/2000/svg', REDUCE = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function S(tag, at, par) { var n = document.createElementNS(NS, tag); for (var k in at) n.setAttribute(k, at[k]); if (par) par.appendChild(n); return n; }
  function rr(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var LibCat = g.LibCat = { cur: null };
  /* is she on bookcase i right now (and not in the air)? */
  LibCat.on = function (i) { var c = LibCat.cur; return c && c.shelf() === i ? { on: true } : null; };

  /* one animation loop for one cat; it stops by itself whenever active() says no, and kick() starts it again */
  function drive(cat, active, extra) {
    var last = 0, id = 0;
    function tick(n) { id = 0; if (!active()) { last = 0; return; } var dt = last ? Math.min(.05, (n - last) / 1000) : 0; last = n; if (dt > 0) { cat.step(dt); if (extra) extra(dt); } id = requestAnimationFrame(tick); }
    return { kick: function () { if (!id && active()) { last = 0; id = requestAnimationFrame(tick); } } };
  }

  LibCat.landing = function (host, btns) {
    var shelves = [].filter.call(btns, function (b) { return b.dataset && b.dataset.top; });
    if (!shelves.length || !g.Booster || !host) return;
    var svg = S('svg', { 'class': 'lib-cat', width: 1, height: 1 }, host);
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:6';
    var cat = new g.Booster(svg, { scale: 1 }), root = cat.root;
    root.setAttribute('role', REDUCE ? 'img' : 'button'); root.setAttribute('aria-label', 'Booster, the library cat' + (REDUCE ? '' : '. Press to make her stretch'));
    if (!REDUCE) root.setAttribute('tabindex', '0');
    root.style.transition = 'opacity .5s ease';
    var P = [], spot = null, ppu = 1, cp = 0, fx = .5, yOff = 0, atSpot = false, onScreen = true, auto = true, pend = [], waits = [], phone = false;
    var drv = null;

    function measure() {
      var hr = host.getBoundingClientRect(); if (!hr.width) return false;
      P = []; spot = null; phone = typeof matchMedia === 'function' && matchMedia('(max-width: 899px)').matches;
      shelves.forEach(function (b) {
        var t = JSON.parse(b.dataset.top), r = b.getBoundingClientRect(), iw = +b.dataset.iw; if (!iw || !r.width) return;
        ppu = r.width / iw; var ox = r.left - hr.left, oy = r.top - hr.top, m = 70 * ppu, x0 = ox + t.x0 * r.width + m, x1 = ox + t.x1 * r.width - m;
        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        P.push({ shelf: +b.dataset.shelf, b: b, x0: x0, x1: x1, y: oy + t.y * r.height + 5 * ppu });
        if (t.teddy) spot = { pi: P.length - 1, x: ox + (t.teddy[0] + (t.teddy[2] - t.teddy[0]) * .64) * r.width, y: oy + (t.teddy[1] + (t.teddy[3] - t.teddy[1]) * .56) * r.height };
      });
      return P.length > 0;
    }
    function place() {
      var p = P[cp]; if (!p) return; cat.k = ppu * .9;
      if (cat.jp) return;
      if (atSpot && spot) { cat.x = spot.x; cat.y = spot.y + yOff; } else { cat.x = lerp(p.x0, p.x1, fx); cat.y = p.y + yOff; }
    }
    function cancel() { cat.tx = null; cat.arrive = null; pend.splice(0).forEach(function (r) { r('cancel'); }); waits.length = 0; }
    function A_wait(sec) { return new Promise(function (res, rej) { pend.push(rej); waits.push({ u: cat.t + sec, res: res }); }); }
    function A_walk(x) { return new Promise(function (res, rej) { pend.push(rej); cat.tx = x; cat.setMode('walk'); cat.arrive = res; }); }
    function A_jump(x, y) { return new Promise(function (res, rej) { pend.push(rej); cat.jump(x, y, res); }); }
    function spotFx() { var p = P[cp]; fx = p.x1 > p.x0 ? clamp((cat.x - p.x0) / (p.x1 - p.x0), 0, 1) : .5; }
    async function sit(s) { cat.setMode('sit'); await A_wait(s); }
    async function look(s) { cat.setMode('look'); await A_wait(s); }
    async function groom(s) { cat.setMode('groom'); await A_wait(s); }
    async function stretch() { cat.setMode('sit'); await A_wait(.5); cat.setMode('stretch'); await A_wait(2.3); cat.setMode('sit'); await A_wait(.6); }
    async function wake() { cat.setMode('sit'); await A_wait(.9); await stretch(); }
    async function wander() { var p = P[cp]; await A_walk(rr(p.x0, p.x1)); spotFx(); }
    /* to the next bookcase along: walk to the edge, jump to the near end of the next top */
    async function hop(d) {
      var p = P[cp], q = P[cp + d]; if (!q) return;
      if (atSpot) { atSpot = false; await A_jump(clamp(spot.x, p.x0, p.x1), p.y); cat.setMode('stand'); }
      await A_walk(d > 0 ? p.x1 : p.x0); cat.dir = d; cat.setMode('stand'); await A_wait(.45);
      await A_jump(d > 0 ? q.x0 : q.x1, q.y); cp += d; fx = d > 0 ? 0 : 1; place();
    }
    async function nap() {
      if (!spot) return; var ti = spot.pi;
      while (cp !== ti) await hop(cp < ti ? 1 : -1);
      var p = P[cp]; await A_walk(clamp(spot.x, p.x0, p.x1)); cat.setMode('stand'); await A_wait(.5);
      await A_jump(spot.x, spot.y); atSpot = true; cat.dir = -1; place(); cat.setMode('sleep'); await A_wait(rr(11, 24));
      await wake(); atSpot = false; await A_jump(clamp(spot.x, p.x0, p.x1), p.y); spotFx(); cat.setMode('stand');
    }
    async function pick() {
      var r = Math.random();
      if (r < .26) await wander();
      else if (r < .38) await look(rr(3.2, 5));
      else if (r < .49) await groom(rr(3.8, 5.3));
      else if (r < .57) await stretch();
      else if (r < .70) await sit(rr(2, 4.5));
      else if (r < .86) { var d = Math.random() < .5 ? -1 : 1; if (!P[cp + d]) d = -d; await hop(d); }
      else if (spot) await nap();
      else await sit(2);
    }
    /* phone: one bookcase at a time, no walking */
    async function phonePick() {
      var r = Math.random();
      if (r < .2) await look(rr(3.2, 5)); else if (r < .38) await groom(rr(3.8, 5.3)); else if (r < .55) await stretch();
      else if (r < .75) await sit(rr(2, 4)); else if (r < .9 && spot) { await moveTo(spot.pi, true); cat.setMode('sleep'); await A_wait(rr(10, 18)); await wake(); }
      else { cat.setMode('stand'); await A_wait(rr(1, 2.4)); }
    }
    async function moveTo(i, onSpot) {
      root.style.opacity = 0; await A_wait(.55); atSpot = !!onSpot; cp = i; fx = rr(.15, .85); cat.dir = Math.random() < .5 ? -1 : 1; cat.setMode('stand'); place(); root.style.opacity = 1; await A_wait(.4);
    }
    async function main() {
      for (;;) {
        try {
          if (!auto) { await A_wait(.3); continue; }
          if (phone) { if (Math.random() < .55 || !atSpot) await moveTo(Math.floor(Math.random() * P.length), false); await phonePick(); }
          else { await pick(); cat.setMode('stand'); await A_wait(rr(.3, 1)); }
        } catch (e) { if (e !== 'cancel') { console.error(e); await new Promise(function (r) { setTimeout(r, 1000); }); } }
      }
    }
    function poke() {
      if (REDUCE || cat.jp) return; cancel(); auto = false;
      (async function () { try { if (cat.mode === 'sleep') await wake(); else { cat.setMode('stand'); await A_wait(.2); await stretch(); } cat.setMode('stand'); auto = true; } catch (e) { if (e !== 'cancel') console.error(e); } })();
    }
    root.addEventListener('click', function (ev) { ev.stopPropagation(); poke(); });
    root.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); poke(); } });

    function active() { return !REDUCE && !document.hidden && !host.hidden && onScreen; }
    function extra(dt) {
      for (var i = waits.length - 1; i >= 0; i--) if (cat.t >= waits[i].u) { var w = waits.splice(i, 1)[0]; w.res(); }
      var p = P[cp]; if (p && !cat.jp) { var tgt = p.b.matches(':hover') ? -14 : 0; yOff += (tgt - yOff) * (1 - Math.exp(-14 * dt)); }
      if (!cat.jp) { var q = P[cp]; if (q) { if (atSpot) cat.y = spot.y + yOff; else { cat.y = q.y + yOff; if (q.x1 > q.x0) fx = clamp((cat.x - q.x0) / (q.x1 - q.x0), 0, 1); } } }
      if (cat.jp) yOff = 0;
    }
    if (!measure()) { var tries = 0, t = setInterval(function () { if (measure() || ++tries > 20) { clearInterval(t); start(); } }, 300); } else start();

    function start() {
      if (!P.length) return;
      cp = Math.min(P.length - 1, 1); fx = rr(.2, .8); cat.dir = Math.random() < .5 ? -1 : 1;
      LibCat.cur = { shelf: function () { return cat.jp ? -1 : (P[cp] ? P[cp].shelf : -1); }, mode: function () { return cat.mode; } };
      if (REDUCE) { /* asleep on the teddy, still */
        if (spot) { cp = spot.pi; atSpot = true; } place(); cat.dir = -1; cat.setMode('sleep'); for (var i = 0; i < 180; i++) cat.step(1 / 60); place(); cat.apply(); return;
      }
      place(); cat.setMode('stand');
      drv = drive(cat, active, extra);
      var kick = function () { drv.kick(); };
      document.addEventListener('visibilitychange', kick);
      if (typeof IntersectionObserver === 'function') new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; kick(); }).observe(host);
      new MutationObserver(function () { if (!host.hidden) { measure(); place(); } kick(); }).observe(host, { attributes: true, attributeFilter: ['hidden'] });
      if (typeof ResizeObserver === 'function') new ResizeObserver(function () { if (host.hidden) return; var was = phone; measure(); if (cp >= P.length) cp = 0; place(); if (was !== phone) { cancel(); } }).observe(host);
      addEventListener('resize', function () { if (!host.hidden) { measure(); place(); } });
      main(); kick();
    }
  };

  /* on an opened bookcase: sits at the front of its top, faces you, blinks. Click and she stretches. */
  LibCat.live = function (plane, signal) {
    if (!g.Booster) return null;
    var svg = S('svg', { 'class': 'lb-cat', width: 1, height: 1 }, plane);
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:520';
    var cat = new g.Booster(svg, { scale: .9 }), busy = false, i;
    cat.root.setAttribute('role', REDUCE ? 'img' : 'button'); cat.root.setAttribute('aria-label', 'Booster, the library cat' + (REDUCE ? '' : '. Press to make her stretch'));
    if (!REDUCE) cat.root.setAttribute('tabindex', '0');
    cat.dir = -1; cat.setMode('look'); for (i = 0; i < 120; i++) cat.step(1 / 60);
    function poke() { if (REDUCE || busy) return; busy = true; cat.setMode('sit'); setTimeout(function () { cat.setMode('stretch'); setTimeout(function () { cat.setMode('sit'); setTimeout(function () { cat.setMode('look'); busy = false; }, 800); }, 2300); }, 500); }
    cat.root.addEventListener('click', function (ev) { ev.stopPropagation(); poke(); });
    cat.root.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); poke(); } });
    if (!REDUCE) { var drv = drive(cat, function () { return !document.hidden && svg.isConnected && !(signal && signal.aborted); }); drv.kick(); document.addEventListener('visibilitychange', drv.kick); }
    return { place: function (x, y) { cat.x = x; cat.y = y; cat.apply(); } };
  };
})(window);
