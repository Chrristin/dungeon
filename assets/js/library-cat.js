/* Booster, the Library's cat. Painted pictures of her (assets/images/booster, made by "npm run booster" from extras/booster), drawn on a canvas.
   She stays where she is: she never walks or jumps. Each time the page opens she does one thing and keeps doing it, so there is no change from one pose
   to another: she sits and looks at you (blinking, now and then turning her head), or she lifts a paw and licks it now and then, or she sleeps and
   breathes. With "reduce motion" she is a still picture.
   - LibCat.landing: on the first view she is on the top of Shelf 1 or Shelf 2, picked by chance each time the page opens, sitting or asleep.
     On the bookcase with the teddy bear, asleep means asleep in front of the teddy. Press her and she says hello.
   - LibCat.live: on an opened bookcase she was on, she is at the front of its top, in the same pose.
   Where she can stand comes from data-top on each bookcase's button, which "npm run shelves" writes. */
(function (g) {
  'use strict';
  var REDUCE = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rr(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var LibCat = g.LibCat = { cur: null };
  /* is she on bookcase i right now? */
  LibCat.on = function (i) { var c = LibCat.cur; return c && c.shelf() === i ? { on: true } : null; };

  /* ---------- the picture of her frames, loaded once ---------- */
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

  /* ---------- one cat: a canvas, a pose (clip + frame), and a way to fade from one frame to another ---------- */
  function Cat(parent, A, o) {
    var me = this; me.img = A.img; me.m = A.meta; me.k = o.k || .5; me.res = o.res || clamp(g.devicePixelRatio || 1, 1.5, 3);
    me.x = 0; me.y = 0; me.clip = 'sit_front'; me.fi = 0;
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
  Cat.prototype.fr = function () { return this.m.clips[this.clip][clamp(this.fi, 0, this.m.clips[this.clip].length - 1)]; };
  /* draw frame (c, i) */
  Cat.prototype.show = function (c, i, c2, i2, t) {
    var me = this, x = me.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, me.canvas.width, me.canvas.height); x.setTransform(me.res, 0, 0, me.res, 0, 0); x.translate(me.cw / 2, me.ch - 3);
    function put(cl, k, a) { var f = me.m.clips[cl][clamp(k, 0, me.m.clips[cl].length - 1)]; x.globalAlpha = a; x.drawImage(me.img, f[0], f[1], f[2], f[3], -f[4] * me.k, -(f[5] + 1) * me.k, f[2] * me.k, f[3] * me.k); }
    put(c, i, 1); if (c2 != null && t > 0) put(c2, i2, t); x.globalAlpha = 1;
  };
  /* stand in a pose and draw it (facing left, as painted) */
  Cat.prototype.pose = function (clip, i) { this.clip = clip; this.fi = i || 0; this.show(this.clip, this.fi); };
  Cat.prototype.draw = function () { this.show(this.clip, this.fi); };
  /* the next frame, at once: frames are never blended, so there is never a second cat showing through the first. (ms is the time the frame is held, kept by the caller.) */
  Cat.prototype.to = function (c, i) { this.pose(c, i); return Promise.resolve(); };
  /* is this screen point on her (not on the clear space round her)? */
  Cat.prototype.hit = function (cx, cy) {
    var r = this.canvas.getBoundingClientRect(); if (!r.width || cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
    try { return this.ctx.getImageData(Math.floor((cx - r.left) / r.width * this.canvas.width), Math.floor((cy - r.top) / r.height * this.canvas.height), 1, 1).data[3] > 30; } catch (e) { return false; }
  };
  Cat.prototype.box = function () { var f = this.fr(), k = this.k; return { w: f[2] * k, h: f[3] * k }; };

  /* what she does, in place. active() says whether anyone can see her; while it says no she waits. */
  async function groomLife(cat, active, alive) { /* she is sitting side-on; now and then she lifts a paw, licks it twice and puts it down */
    var seq = [1, 2, 3, 2, 3, 4, 5, 0];
    while (alive()) {
      await wait(rr(1400, 3200)); if (!alive()) return; if (!active()) continue;
      for (var k = 0; k < seq.length; k++) { await cat.to('groom', seq[k], 300); await wait(seq[k] === 3 ? 380 : 200); }
    }
  }
  async function sitLife(cat, active, alive) { /* she looks at you, blinks (now and then twice), and now and then turns her head to the side and back */
    while (alive()) {
      await wait(rr(1800, 4200)); if (!alive()) return; if (!active()) continue;
      if (Math.random() < .25) { await cat.to('sit_front', 2, 260); await wait(rr(900, 1500)); await cat.to('sit_front', 0, 260); }
      else { var n = Math.random() < .3 ? 2 : 1; for (var k = 0; k < n; k++) { cat.pose('sit_front', 1); await wait(130); cat.pose('sit_front', 0); await wait(170); } }
    }
  }
  async function sleepLife(cat, active, alive) { /* she breathes: the frames of her sleeping, slowly one into the next */
    var seq = [1, 2, 1, 0, 1, 2, 3, 2, 1, 0], k = 0;
    while (alive()) { await wait(rr(700, 1200)); if (!alive()) return; if (!active()) continue; k = (k + 1) % seq.length; await cat.to('sleep', seq[k], 800); }
  }
  function life(cat, clip, active, alive) { if (REDUCE) return; if (clip === 'sleep') sleepLife(cat, active, alive); else if (clip === 'groom') groomLife(cat, active, alive); else sitLife(cat, active, alive); }

  /* a speech bubble above her, gone after a few seconds */
  function Bubble(host, scale) {
    var el = document.createElement('div'); el.className = 'lib-cat-bubble'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); if (scale) el.style.fontSize = scale + 'px';
    host.appendChild(el); var tm = 0;
    return { say: function (t, x, y) { el.textContent = t; el.style.left = x + 'px'; el.style.top = y + 'px'; el.classList.add('on'); clearTimeout(tm); tm = setTimeout(function () { el.classList.remove('on'); }, 3200); } };
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
    var cat = new Cat(layer, A, { k: .5 }), bub = Bubble(layer), onScreen = true, started = false;
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'lib-cat-btn'; btn.setAttribute('aria-label', 'Booster, the library cat. Press her to say hello.'); layer.appendChild(btn);
    var pick = null; /* which bookcase, where along its free stretch, and the pose; chosen once per visit */
    var active = function () { return !document.hidden && !host.hidden && onScreen; };

    /* where she is: the middle of her feet, on the top board of the bookcase picked */
    function place() {
      var hr = host.getBoundingClientRect(); if (!hr.width) return false;
      var b = shelves[pick.i], t = JSON.parse(b.dataset.top), r = b.getBoundingClientRect(), iw = +b.dataset.iw; if (!iw || !r.width) return false;
      var ppu = r.width / iw, ox = r.left - hr.left, oy = r.top - hr.top;
      cat.k = ppu * .85; cat.size(); if (!started) { cat.clip = pick.clip; cat.fi = 0; }
      var cw = cat.box().w, x;
      if (pick.clip === 'sleep' && t.teddy) x = ox + (t.teddy[0] + (t.teddy[2] - t.teddy[0]) * .5) * r.width;
      else {
        /* a stretch of the top with nothing on it that she fits in (the widest if none is wide enough), her spot in it chosen once */
        var free = (t.free || []).map(function (q) { return [ox + q[0] * r.width, ox + q[1] * r.width]; }); if (!free.length) free = [[ox + t.x0 * r.width, ox + t.x1 * r.width]];
        if (pick.s == null) { var fit = free.filter(function (q) { return q[1] - q[0] >= cw * 1.05; }); var pool = fit.length ? fit : [free.slice().sort(function (a, b) { return (b[1] - b[0]) - (a[1] - a[0]); })[0]]; pick.s = free.indexOf(pool[Math.floor(Math.random() * pool.length)]); }
        var q = free[pick.s] || free[0], room = Math.max(0, (q[1] - q[0]) - cw * 1.0); x = q[0] + cw / 2 * 1.0 + room * pick.u; if (room === 0) x = (q[0] + q[1]) / 2;
      }
      cat.x = x; cat.y = oy + t.y * r.height + 5 * ppu; cat.at(); cat.draw();
      btn.style.cssText = 'position:absolute;left:0;top:0;width:' + cat.cw + 'px;height:' + cat.ch + 'px;transform:translate(' + (cat.x - cat.cw / 2) + 'px,' + (cat.y - cat.ch + 3) + 'px)';
      if (!started) { started = true; life(cat, pick.clip, active, function () { return layer.isConnected; }); }
      return true;
    }
    /* pick a bookcase and a spot on it by chance: Shelf 1 or Shelf 2, in a clear stretch of its top */
    function choose() { pick = { i: Math.floor(Math.random() * Math.min(2, shelves.length)), s: null, u: rr(.1, .9), clip: ['sit_front', 'groom', 'sleep'][Math.floor(Math.random() * 3)] }; }
    function poke() { var b = cat.box(); bub.say('Hi! I am Booster', cat.x, cat.y - b.h - 8); }
    hookClick(host, cat, poke); btn.addEventListener('click', poke);
    LibCat.cur = { shelf: function () { return pick ? +shelves[pick.i].dataset.shelf : -1; }, pose: function () { return pick ? pick.clip : 'sit_front'; } };

    choose();
    var tries = 0, t = setInterval(function () { if (place() || ++tries > 20) clearInterval(t); }, 300); place();
    var again = function () { if (!host.hidden) place(); };
    if (typeof ResizeObserver === 'function') new ResizeObserver(again).observe(host); addEventListener('resize', again);
    new MutationObserver(again).observe(host, { attributes: true, attributeFilter: ['hidden'] });
    if (typeof IntersectionObserver === 'function') new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }).observe(host);
  }

  /* ====================================== an opened bookcase ====================================== */
  /* she is at the front of its top, in the pose she was in, doing the same small things; press her and she says hello */
  LibCat.live = function (plane, signal) {
    var out = { place: function (x, y, lo, hi) { out.pending = [x, y, lo, hi]; if (out.cat) out.go(); } };
    atlas().then(function (A) {
      if (signal && signal.aborted) return;
      var wrap = document.createElement('div'); wrap.className = 'lb-cat'; wrap.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:520'; plane.appendChild(wrap);
      var cat = new Cat(wrap, A, { k: .84, res: 2.2 }), bub = Bubble(wrap, 26); out.cat = cat;
      var was = LibCat.cur && LibCat.cur.pose ? LibCat.cur.pose() : 'sit_front', pose = was === 'sleep' || was === 'groom' ? was : 'sit_front'; cat.pose(pose, 0);
      out.go = function () { var q = out.pending; if (!q) return; var half = cat.box().w * .45, x = q[0]; if (q[2] != null) x = q[3] - q[2] > half * 2 ? clamp(x, q[2] + half, q[3] - half) : (q[2] + q[3]) / 2; /* never over the edge of the board */ cat.x = x; cat.y = q[1]; cat.at(); cat.draw(); };
      hookClick(plane, cat, function () { bub.say('Hi! I am Booster', cat.x, cat.y - cat.box().h - 6); });
      out.go();
      life(cat, pose, function () { return !document.hidden; }, function () { return wrap.isConnected && !(signal && signal.aborted); });
    }, function () {});
    return out;
  };
})(window);
