/* Booster, the Library's cat. She is painted frames (assets/images/booster, made by "npm run booster" from extras/booster) played on a canvas.
   Two places she appears:
   - LibCat.landing: on the first view, over the pictures of the bookcases. She walks along the front of the tops, jumps to the next bookcase,
     sits, looks at you, grooms, stretches, and now and then curls up asleep on the teddy bear between its feet. She follows the pointer:
     it to her right and she walks right, to her left and she walks left, below her and she goes to the edge and looks down. She touches nothing.
     Press her and she stretches (or wakes up and stretches) and says hello. On a phone (the bookcases stand one under another) she stays on
     one bookcase at a time: sits, stands, stretches, grooms and sleeps, and moves to another now and then. With "reduce motion" she is asleep
     on the teddy and does not move.
   - LibCat.live: on an opened bookcase she was on, she sits at the front of its top, faces you and blinks.
   Where she can stand comes from data-top on each bookcase's button, which "npm run shelves" writes. */
(function (g) {
  'use strict';
  var REDUCE = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rr(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  var LibCat = g.LibCat = { cur: null };
  /* is she on bookcase i right now, and not in the air? */
  LibCat.on = function (i) { var c = LibCat.cur; return c && c.shelf() === i ? { on: true } : null; };

  /* ---------- the picture of all her frames, loaded once ---------- */
  var atlasP = null;
  function atlas() {
    if (atlasP) return atlasP;
    var root = document.querySelector('.lib'), j = root && root.dataset.catJson, u = root && root.dataset.cat;
    if (!j || !u) return (atlasP = Promise.reject(new Error('no cat')));
    atlasP = fetch(j).then(function (r) { return r.json(); }).then(function (meta) {
      return new Promise(function (res, rej) { var im = new Image(); im.onerror = rej; im.onload = function () { (im.decode ? im.decode() : Promise.resolve()).then(function () { res({ meta: meta, img: im }); }, function () { res({ meta: meta, img: im }); }); }; im.src = u; });
    });
    return atlasP;
  }

  /* ---------- one cat: a canvas, a pose, and a way to play a clip ---------- */
  function Cat(parent, A, o) {
    var me = this; me.img = A.img; me.m = A.meta; me.k = o.k || .5; me.res = o.res || clamp(g.devicePixelRatio || 1, 1.5, 3);
    me.dir = -1; me.x = 0; me.y = 0; me.t = 0; me.clip = 'idle'; me.ti = 0; me.playing = false; me.xf = null; me.air = null; me.opacity = 1;
    var mx = 0, my = 0, c; for (c in me.m.clips) me.m.clips[c].forEach(function (f) { if (f[2] > mx) mx = f[2]; if (f[3] > my) my = f[3]; });
    me.mx = mx; me.my = my; me.canvas = document.createElement('canvas'); me.ctx = me.canvas.getContext('2d');
    me.canvas.setAttribute('aria-hidden', 'true'); me.canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;transform-origin:0 0';
    parent.appendChild(me.canvas); me.size();
  }
  Cat.prototype.size = function () {
    var me = this; me.cw = Math.ceil(me.mx * me.k) + 6; me.ch = Math.ceil(me.my * me.k) + 6;
    me.canvas.style.width = me.cw + 'px'; me.canvas.style.height = me.ch + 'px'; me.canvas.width = Math.ceil(me.cw * me.res); me.canvas.height = Math.ceil(me.ch * me.res); me.ctx.imageSmoothingQuality = 'high'; me.at();
  };
  Cat.prototype.at = function () { this.canvas.style.transform = 'translate(' + (this.x - this.cw / 2).toFixed(1) + 'px,' + (this.y - this.ch + 3).toFixed(1) + 'px)'; };
  Cat.prototype.fr = function (clip, i) { var a = this.m.clips[clip]; return a[clamp(i, 0, a.length - 1)]; };
  /* stand in a pose, with a short fade from whatever she was doing */
  Cat.prototype.hold = function (clip, i) { var me = this; if (me.clip !== clip) me.fade(); me.clip = clip; me.ti = i || 0; me.playing = false; me.resolve = null; };
  Cat.prototype.fade = function () { this.xf = { clip: this.clip, f: Math.round(this.ti), a: 1 }; };
  /* play frames from..to of a clip; resolves at the end unless it loops */
  Cat.prototype.play = function (clip, o) {
    var me = this, n = me.m.clips[clip].length; o = o || {}; if (me.clip !== clip) me.fade();
    me.clip = clip; me.fps = o.fps || 8; me.loop = !!o.loop; me.ping = !!o.ping; me.from = o.from || 0; me.to = o.to != null ? o.to : n - 1; me.ti = o.at != null ? o.at : me.from; me.dn = 1; me.playing = true;
    return new Promise(function (res) { me.resolve = res; });
  };
  Cat.prototype.step = function (dt) {
    var me = this; me.t += dt;
    if (me.playing) {
      me.ti += me.dn * me.fps * dt;
      if (me.ping) { if (me.ti >= me.to) { me.ti = me.to; me.dn = -1; } else if (me.ti <= me.from) { me.ti = me.from; me.dn = 1; } }
      else if (me.loop) { if (me.ti >= me.to + 1) me.ti = me.from + (me.ti - me.to - 1); }
      else if (me.ti >= me.to) { me.ti = me.to; me.playing = false; var r = me.resolve; me.resolve = null; if (r) r(); }
    }
    if (me.xf) { me.xf.a -= dt / .18; if (me.xf.a <= 0) me.xf = null; }
    me.draw();
  };
  Cat.prototype.draw = function () {
    var me = this, c = me.ctx, n = me.m.clips[me.clip].length, i0 = clamp(Math.floor(me.ti), 0, n - 1), b = 0, i1 = i0;
    if (me.playing) { i1 = i0 + 1; if (me.loop && !me.ping) { if (i1 > me.to) i1 = me.from; } else if (i1 > me.to) i1 = i0; b = i1 === i0 ? 0 : smooth((me.ti - Math.floor(me.ti) - .55) / .45); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, me.canvas.width, me.canvas.height);
    function put(f, a) { if (a <= .003) return; c.save(); c.globalAlpha = a * me.opacity; c.setTransform(me.res, 0, 0, me.res, 0, 0); c.translate(me.cw / 2, me.ch - 3); if (me.dir > 0) c.scale(-1, 1);
      c.drawImage(me.img, f[0], f[1], f[2], f[3], -f[4] * me.k, -(f[5] + 1) * me.k, f[2] * me.k, f[3] * me.k); c.restore(); }
    if (me.xf) put(me.fr(me.xf.clip, me.xf.f), me.xf.a);
    put(me.fr(me.clip, i0), 1); if (b > 0) put(me.fr(me.clip, i1), b);
  };
  /* is this screen point on her (not on the clear space round her)? */
  Cat.prototype.hit = function (cx, cy) {
    var r = this.canvas.getBoundingClientRect(); if (!r.width || cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
    try { return this.ctx.getImageData(Math.floor((cx - r.left) / r.width * this.canvas.width), Math.floor((cy - r.top) / r.height * this.canvas.height), 1, 1).data[3] > 30; } catch (e) { return false; }
  };
  Cat.prototype.box = function () { var f = this.fr(this.clip, Math.floor(this.ti)), k = this.k; return { w: f[2] * k, h: f[3] * k }; };

  /* a speech bubble above her, gone after a few seconds */
  function Bubble(host, scale) {
    var el = document.createElement('div'); el.className = 'lib-cat-bubble'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); if (scale) el.style.fontSize = scale + 'px';
    host.appendChild(el); var tm = 0;
    return { say: function (t, x, y) { el.textContent = t; el.style.left = x + 'px'; el.style.top = y + 'px'; el.classList.add('on'); clearTimeout(tm); tm = setTimeout(function () { el.classList.remove('on'); }, 3200); }, move: function (x, y) { el.style.left = x + 'px'; el.style.top = y + 'px'; }, on: function () { return el.classList.contains('on'); } };
  }
  /* one animation loop for one cat; it stops by itself whenever active() says no, and kick() starts it again */
  function drive(cat, active, extra) {
    var last = 0, id = 0;
    function tick(n) { id = 0; if (!active()) { last = 0; return; } var dt = last ? Math.min(.05, (n - last) / 1000) : 0; last = n; if (dt > 0) { if (extra) extra(dt); cat.step(dt); } id = requestAnimationFrame(tick); }
    return { kick: function () { if (!id && active()) { last = 0; id = requestAnimationFrame(tick); } } };
  }
  function hookClick(scope, cat, fn) { scope.addEventListener('click', function (ev) { if (cat.hit(ev.clientX, ev.clientY)) { ev.stopPropagation(); ev.preventDefault(); fn(); } }, true); }

  /* ====================================== the first view ====================================== */
  LibCat.landing = function (host, btns) {
    var shelves = [].filter.call(btns, function (b) { return b.dataset && b.dataset.top; });
    if (!shelves.length || !host) return;
    var go = function () { atlas().then(function (A) { build(host, shelves, A); }, function () {}); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 800);
  };

  function build(host, shelves, A) {
    var layer = document.createElement('div'); layer.className = 'lib-cat'; layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:6'; host.appendChild(layer);
    var cat = new Cat(layer, A, { k: .5 }), bub = Bubble(layer);
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'lib-cat-btn'; btn.setAttribute('aria-label', REDUCE ? 'Booster, the library cat' : 'Booster, the library cat. Press to make her stretch'); layer.appendChild(btn);
    var P = [], spot = null, ppu = 1, cp = 0, fx = .5, yOff = 0, onScreen = true, auto = true, pend = [], waits = [], phone = false, len = 100, pt = null, ptAt = 0, mouseOK = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
    var lock = 0, inFollow = false, follow = false, walkStep = A.meta.walkStep || 24, drv = null, napping = false;

    function measure() {
      var hr = host.getBoundingClientRect(); if (!hr.width) return false;
      P = []; spot = null; phone = typeof matchMedia === 'function' && matchMedia('(max-width: 899px)').matches;
      shelves.forEach(function (b) {
        var t = JSON.parse(b.dataset.top), r = b.getBoundingClientRect(), iw = +b.dataset.iw; if (!iw || !r.width) return;
        ppu = r.width / iw; cat.k = ppu * .63; len = 300 * cat.k;
        var ox = r.left - hr.left, oy = r.top - hr.top, m = .46 * len, x0 = ox + t.x0 * r.width + m, x1 = ox + t.x1 * r.width - m;
        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        P.push({ shelf: +b.dataset.shelf, b: b, x0: x0, x1: x1, y: oy + t.y * r.height + 5 * ppu });
        if (t.teddy) spot = { pi: P.length - 1, x: ox + (t.teddy[0] + (t.teddy[2] - t.teddy[0]) * .5) * r.width };
      });
      if (P.length) cat.size(); return P.length > 0;
    }
    function place() { var p = P[cp]; if (!p || cat.air) return; if (napping && spot) { cat.x = spot.x; } else cat.x = lerp(p.x0, p.x1, fx); cat.y = p.y + yOff; cat.at(); }
    function cancel() { cat.tx = null; cat.arrive = null; follow = false; pend.splice(0).forEach(function (r) { r('cancel'); }); waits.length = 0; }
    function W(sec) { return new Promise(function (res, rej) { pend.push(rej); waits.push({ u: cat.t + sec, res: res }); }); }
    function P_(promise) { return new Promise(function (res, rej) { pend.push(rej); promise.then(res); }); }
    function fxNow() { var p = P[cp]; fx = p.x1 > p.x0 ? clamp((cat.x - p.x0) / (p.x1 - p.x0), 0, 1) : .5; }

    /* poses she holds */
    async function holdBlink(sec, clip, base, blink) { cat.hold(clip, base); var rem = sec; while (rem > 0) { var s = Math.min(rem, rr(1.6, 3.6)); await W(s); rem -= s; if (rem > .3) { cat.hold(clip, blink); await W(.15); cat.hold(clip, base); } } }
    async function sit(s) { cat.hold('sit_side', 0); await holdBlink(s, 'sit_side', 0, 1); }
    async function look(s) { cat.hold('sit_front', 0); await holdBlink(s, 'sit_front', 0, 1); }
    async function lookUp(s) { cat.hold('sit_side', 0); await W(.2); await P_(cat.play('look_up', { fps: 5 })); await W(s); await P_(cat.play('look_up', { fps: 5, from: 0, to: 2, at: 2 })); cat.hold('sit_side', 0); }
    async function groom(times) { cat.hold('groom', 0); await W(.5); for (var i = 0; i < times; i++) await P_(cat.play('groom', { fps: 3.2, from: 0, to: 5 })); }
    async function stretch() { lock++; try { await stretch_(); } finally { lock--; } }
    async function stretch_() { cat.hold('stretch', 0); await W(.35); await P_(cat.play('stretch', { fps: 4, from: 0, to: 2 })); await W(rr(.9, 1.5)); await P_(cat.play('stretch', { fps: 4, from: 2, to: 4 })); cat.hold('sit_side', 0); }
    function idle() { cat.play('idle', { fps: 2.6, loop: true }); }
    async function wake() { await P_(cat.play('wake', { fps: 2.6 })); cat.hold('sit_side', 0); await W(.6); await stretch(); }
    async function sleepFor(s) { await P_(cat.play('lie', { fps: 2.8 })); cat.play('sleep', { fps: 1.5, ping: true }); await W(s); }

    /* walking: her speed comes from the frames, so her paws stay on the board */
    function walkSpeed() { return walkStep * (cat.walkFps || 9) * cat.k; }
    function A_walk(x) { return new Promise(function (res, rej) { pend.push(rej); cat.tx = x; cat.walkFps = 9; cat.play('walk', { fps: cat.walkFps, loop: true }); cat.arrive = function () { cat.hold('idle', 0); res(); }; }); }
    async function wander() { var p = P[cp]; await A_walk(rr(p.x0, p.x1)); fxNow(); }
    /* to the next bookcase along: walk to the edge, jump to the near end of the next top */
    async function hop(d) { lock++; try { await hop_(d); } finally { lock--; } }
    async function hop_(d) {
      var p = P[cp], q = P[cp + d]; if (!q) return;
      await A_walk(d > 0 ? p.x1 : p.x0); cat.dir = d; cat.hold('idle', 0); await W(.4);
      await P_(cat.play('crouch', { fps: 7, to: 2 })); await W(.2); await P_(cat.play('ready', { fps: 4 })); await W(.25);
      var x1 = d > 0 ? q.x0 : q.x1, y1 = q.y;
      await new Promise(function (res, rej) { pend.push(rej); cat.air = { t: 0, T: 1.18, x0: cat.x, y0: cat.y, x1: x1, y1: y1, h: .75 * len + Math.abs(cat.y - y1) * .4, done: res }; });
      cp += d; fx = d > 0 ? 0 : 1; place(); await P_(cat.play('land', { fps: 8 })); cat.hold('idle', 0); await W(.35);
    }
    async function nap() { lock++; try { await nap_(); } finally { lock--; } }
    async function nap_() {
      if (!spot) return; var ti = spot.pi;
      while (cp !== ti) await hop(cp < ti ? 1 : -1);
      var p = P[cp]; await A_walk(clamp(spot.x, p.x0, p.x1)); cat.dir = -1; cat.hold('idle', 0); await W(.3);
      napping = true; fxNow(); cat.x = spot.x; cat.at(); await sleepFor(rr(11, 24)); await wake(); napping = false; fxNow();
    }

    /* the pointer: to her right she walks right, left she walks left, below her she goes to the edge and looks down */
    function ptLocal() { if (!pt) return null; var hr = host.getBoundingClientRect(); return { x: pt.x - hr.left, y: pt.y - hr.top }; }
    function following() { if (!mouseOK || phone || REDUCE || !pt || performance.now() - ptAt > 4500) return null; var q = ptLocal(), hr = host.getBoundingClientRect(); if (q.x < -240 || q.x > hr.width + 240 || q.y < -240 || q.y > hr.height + 240) return null; return q; }
    async function followStep() {
      var q = following(); if (!q) return false; inFollow = true; try { return await followBody(q); } finally { inFollow = false; }
    }
    async function followBody(q) {
       var p = P[cp], dx = q.x - cat.x, dy = q.y - cat.y, dead = .7 * len;
      if (dy > 18 && Math.abs(dx) < 1.1 * len) { /* below her: to the edge, then look down */
        if (Math.abs(dx) > 8) { cat.dir = dx < 0 ? -1 : 1; await followWalk(); }
        cat.dir = dx < 0 ? -1 : (dx > 0 ? 1 : cat.dir); cat.hold('sit_side', 0); await W(.3); await P_(cat.play('look_down', { fps: 5 }));
        while (following() && ptLocal().y > cat.y + 18 && Math.abs(ptLocal().x - cat.x) < 1.2 * len) await W(.25);
        await P_(cat.play('look_down', { fps: 5, from: 0, to: 2, at: 2 })); cat.hold('sit_side', 0); await W(.2); return true; }
      if (dx > dead || dx < -dead) {
        var d = dx > 0 ? 1 : -1, beyond = d > 0 ? q.x > p.x1 + .4 * len : q.x < p.x0 - .4 * len;
        if (beyond && P[cp + d]) { await hop(d); return true; }
        cat.dir = d; await followWalk(); return true; }
      cat.dir = dx < 0 ? -1 : 1; if (dy < -1.1 * len) await lookUp(1.2); else await look(1.4); return true;
    }
    function followWalk() { return new Promise(function (res, rej) { pend.push(rej); follow = true; var q = ptLocal(), p = P[cp]; cat.tx = clamp(q.x, p.x0, p.x1); cat.walkFps = 9; cat.play('walk', { fps: 9, loop: true }); cat.arrive = function () { follow = false; cat.hold('idle', 0); fxNow(); res(); }; }); }

    async function pick() {
      var r = Math.random();
      if (r < .24) await wander(); else if (r < .34) await look(rr(3, 5)); else if (r < .43) await groom(2); else if (r < .51) await stretch();
      else if (r < .60) await sit(rr(2.4, 4.5)); else if (r < .68) await lookUp(rr(1.5, 2.6)); else if (r < .74) { cat.hold('idle', 0); await idle(); await W(rr(2, 3.5)); }
      else if (r < .88) { var d = Math.random() < .5 ? -1 : 1; if (!P[cp + d]) d = -d; await hop(d); } else if (spot) await nap(); else await sit(2);
    }
    /* phone: one bookcase at a time, no walking */
    async function moveTo(i, onSpot) { layer.style.transition = 'opacity .5s'; layer.style.opacity = 0; await W(.55); napping = !!onSpot; cp = i; fx = rr(.15, .85); cat.dir = Math.random() < .5 ? -1 : 1; cat.hold('sit_side', 0); place(); layer.style.opacity = 1; await W(.45); }
    async function phonePick() {
      var r = Math.random();
      if (r < .2) await look(rr(3, 5)); else if (r < .36) await groom(2); else if (r < .5) await stretch(); else if (r < .7) await sit(rr(2.4, 4));
      else if (r < .86 && spot) { await moveTo(spot.pi, true); await sleepFor(rr(10, 18)); await wake(); napping = false; fxNow(); } else { cat.hold('idle', 0); await idle(); await W(rr(2, 3.5)); }
    }
    async function main() {
      for (;;) {
        try {
          if (!auto) { await W(.3); continue; }
          if (phone) { if (Math.random() < .55 || napping) await moveTo(Math.floor(Math.random() * P.length), false); await phonePick(); }
          else { if (!(await followStep())) { await pick(); } cat.hold('idle', 0); await W(rr(.2, .7)); }
        } catch (e) { if (e !== 'cancel') { console.error(e); await new Promise(function (r) { setTimeout(r, 1000); }); } }
      }
    }
    function poke() {
      var say = function () { var b = cat.box(); bub.say('Hi! I am Booster', cat.x, cat.y - b.h - 8); };
      if (REDUCE) { say(); return; } if (cat.air) return; cancel(); auto = false; say();
      (async function () { try { if (napping) { await wake(); napping = false; fxNow(); } else { cat.hold('idle', 0); await W(.15); await stretch(); } cat.hold('idle', 0); auto = true; } catch (e) { if (e !== 'cancel') console.error(e); } })();
    }
    hookClick(host, cat, poke); btn.addEventListener('click', poke);
    document.addEventListener('pointermove', function (ev) { if (ev.pointerType && ev.pointerType !== 'mouse') return; pt = { x: ev.clientX, y: ev.clientY }; ptAt = performance.now(); if (!lock && !inFollow && auto && !phone && !REDUCE && !cat.air && !napping && following()) cancel(); }, { passive: true });

    function active() { return !REDUCE && !document.hidden && !host.hidden && onScreen; }
    function extra(dt) {
      for (var i = waits.length - 1; i >= 0; i--) if (cat.t >= waits[i].u) { var w = waits.splice(i, 1)[0]; w.res(); }
      var p = P[cp];
      if (cat.air) { var a = cat.air; a.t += dt; var u = clamp(a.t / a.T, 0, 1);
        cat.x = lerp(a.x0, a.x1, u); cat.y = lerp(a.y0, a.y1, u) - 4 * a.h * u * (1 - u);
        var ph = u < .28 ? ['jump_up', u / .28] : u < .68 ? ['mid_jump', (u - .28) / .4] : ['jump_down', (u - .68) / .32]; var n = A.meta.clips[ph[0]].length; cat.hold(ph[0], Math.min(n - 1, Math.floor(ph[1] * n)));
        if (u >= 1) { cat.air = null; a.done(); } cat.at(); }
      else if (p) {
        var tgt = p.b.matches(':hover') ? -14 : 0; yOff += (tgt - yOff) * (1 - Math.exp(-14 * dt));
        if (cat.tx != null) { /* walking */
          if (follow) { var q = following(); if (!q) { cat.tx = null; follow = false; var r = cat.arrive; cat.arrive = null; if (r) r(); } else cat.tx = clamp(q.x, p.x0, p.x1); }
          if (cat.tx != null) { var dd = cat.tx - cat.x; if (Math.abs(dd) < 2) { cat.x = cat.tx; cat.tx = null; var ar = cat.arrive; cat.arrive = null; if (ar) ar(); } else { cat.dir = dd < 0 ? -1 : 1; cat.x += Math.sign(dd) * Math.min(Math.abs(dd), walkSpeed() * dt); } } }
        if (napping && spot) cat.x = spot.x; cat.y = p.y + yOff; if (!napping && p.x1 > p.x0) fx = clamp((cat.x - p.x0) / (p.x1 - p.x0), 0, 1); cat.at(); }
      if (bub.on()) { var bx = cat.box(); bub.move(cat.x, cat.y - bx.h - 8); }
      btn.style.cssText = 'position:absolute;left:0;top:0;width:' + cat.cw + 'px;height:' + cat.ch + 'px;transform:translate(' + (cat.x - cat.cw / 2) + 'px,' + (cat.y - cat.ch + 3) + 'px)';
    }
    if (!measure()) { var tries = 0, t = setInterval(function () { if (measure() || ++tries > 20) { clearInterval(t); start(); } }, 300); } else start();

    function start() {
      if (!P.length) return;
      cp = Math.min(P.length - 1, 1); fx = rr(.2, .8); cat.dir = Math.random() < .5 ? -1 : 1; cat.opacity = 1;
      LibCat.cur = { shelf: function () { return cat.air ? -1 : (P[cp] ? P[cp].shelf : -1); }, mode: function () { return cat.clip; } };
      if (REDUCE) { /* asleep on the teddy, still */
        if (spot) { cp = spot.pi; napping = true; } place(); cat.dir = -1; cat.hold('sleep', 0); cat.draw(); return; }
      place(); cat.hold('idle', 0); cat.draw();
      drv = drive(cat, active, extra); var kick = function () { drv.kick(); };
      document.addEventListener('visibilitychange', kick);
      if (typeof IntersectionObserver === 'function') new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; kick(); }).observe(host);
      new MutationObserver(function () { if (!host.hidden) { measure(); place(); } kick(); }).observe(host, { attributes: true, attributeFilter: ['hidden'] });
      var rz = function () { if (host.hidden) return; var was = phone; measure(); if (cp >= P.length) cp = 0; place(); if (was !== phone) cancel(); };
      if (typeof ResizeObserver === 'function') new ResizeObserver(rz).observe(host); addEventListener('resize', rz);
      main(); kick();
    }
  }

  /* ====================================== an opened bookcase ====================================== */
  /* she sits at the front of its top, faces you and blinks; press her and she stretches and says hello */
  LibCat.live = function (plane, signal) {
    var out = { place: function (x, y) { out.pending = [x, y]; if (out.cat) out.go(); } };
    atlas().then(function (A) {
      if (signal && signal.aborted) return;
      var wrap = document.createElement('div'); wrap.className = 'lb-cat'; wrap.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:520'; plane.appendChild(wrap);
      var cat = new Cat(wrap, A, { k: .62, res: 2.2 }), bub = Bubble(wrap, 26); out.cat = cat;
      cat.dir = -1; cat.hold('sit_front', 0); cat.draw();
      out.go = function () { var q = out.pending; if (!q) return; cat.x = q[0]; cat.y = q[1]; cat.at(); cat.draw(); };
      var busy = false, auto = true, waits = [];
      function W(s) { return new Promise(function (res) { waits.push({ u: cat.t + s, res: res }); }); }
      async function life() { for (;;) { await W(rr(1.6, 3.6)); if (!auto || busy) continue; cat.hold('sit_front', 1); await W(.15); if (!busy) cat.hold('sit_front', 0); if (Math.random() < .25 && !busy) { await W(.5); cat.hold('sit_front', 2); await W(rr(.8, 1.4)); if (!busy) cat.hold('sit_front', 0); } } }
      function poke() { bub.say('Hi! I am Booster', cat.x, cat.y - cat.box().h - 6); if (REDUCE || busy) return; busy = true; (async function () { cat.hold('stretch', 0); await W(.3); await cat.play('stretch', { fps: 4, from: 0, to: 2 }); await W(1.1); await cat.play('stretch', { fps: 4, from: 2, to: 4 }); cat.hold('sit_front', 0); busy = false; })(); }
      hookClick(plane, cat, poke);
      out.go();
      if (REDUCE) return;
      var drv = drive(cat, function () { return !document.hidden && wrap.isConnected && !(signal && signal.aborted); }, function () { for (var i = waits.length - 1; i >= 0; i--) if (cat.t >= waits[i].u) waits.splice(i, 1)[0].res(); });
      drv.kick(); document.addEventListener('visibilitychange', drv.kick); life();
    }, function () {});
    return out;
  };
})(window);
