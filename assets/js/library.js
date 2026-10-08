/* Library: the bookshelves at /collection/library/ (the Library page template).
   Draws every book in assets/data/library.json as a spine on its bookcase, as shelved in real life. The bookcases stand
   on a turning ring with one in front, or side by side in rows,
   and lets a visitor re-sort them, try patterns, or arrange them by hand and send the result. See docs/library.md. */
(function () {
  var root = document.querySelector('.lib');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  /* The page opens on pictures of the bookcases, made ahead of time by extras/shelves (npm run shelves) and already in the
     page, so nothing is fetched or drawn to show them. Choosing one starts gold sparkles at once, and they keep drifting
     up round the picture while the bookcase is fetched and drawn. When it is ready, the live bookcase is shrunk to exactly
     the picture's size and place, and the two grow together to the open size while the picture fades into the live one: at
     every moment they are the same size, and neither is ever bigger than the picture or the open bookcase. A plain list of
     every book (or of one bookcase's books) lives at #books and #books-2. The same code can draw the landing live
     (data-render="landing"): extras/shelves does that to make the pictures. */
  var TPL = root.innerHTML, landing = document.getElementById('lib-landing'), shelves = document.getElementById('lib-shelves'), DATA = null, api = null;
  var REDUCE = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function load() {
    if (!DATA) DATA = fetch(root.dataset.src).then(function (r) { if (!r.ok) throw new Error('data'); return r.json(); }).catch(function (e) { DATA = null; throw e; });
    return DATA;
  }
  if (root.dataset.render === 'landing') { load().then(function (d) { boot(d, true); }); return; }
  var btns = landing ? Array.prototype.slice.call(landing.querySelectorAll('[data-shelf]')) : [], note = document.getElementById('lib-shelves-msg');
  /* Where the lengths and counts can be changed: MIN (the least time, in ms, before the bookcase takes over, so the sparkles
     are seen), MORPH_MS (how long the grow-and-fade takes), the counts in sparkle(), and the durations in library.css
     (lib-spark, lib-glow-burst, lib-bloom). */
  var MIN = 180, MORPH_MS = 520, busy = false, MORPH = null;
  var SPARK_COL = ['#FFD98A', '#FFC56B', '#FFE9B8', '#FFF4D6'];
  /* Gold sparkles and a soft glow in the colours of the fairy lights. They start with a burst at (x, y) and, until stop() is
     called, keep drifting up from inside box; what is already in the air then finishes by itself. */
  function sparkle(x, y, box) {
    if (REDUCE) return { stop: function () {} };
    var h = document.createElement('div'), g = document.createElement('i'), over = false, tick = 0, cap = 0;
    h.className = 'lib-sparks'; h.setAttribute('aria-hidden', 'true'); g.className = 'lib-glow'; g.style.left = x + 'px'; g.style.top = y + 'px'; h.appendChild(g);
    function add(n, px, py, reach) {
      for (var k = 0; k < n; k++) {
        var a = Math.random() * Math.PI * 2, r = (80 + Math.random() * 240) * reach, s = 8 + Math.random() * 18, e = document.createElement('i');
        e.className = 'lib-spark';
        e.style.cssText = 'left:' + px + 'px;top:' + py + 'px;--s:' + s.toFixed(1) + 'px;--c:' + SPARK_COL[k % 4] + ';--dx:' + (Math.cos(a) * r).toFixed(0) + 'px;--dy:' + (Math.sin(a) * r - 50 * reach).toFixed(0) + 'px;--r:' + (Math.random() * 180 - 90).toFixed(0) + 'deg;--d:' + (850 + Math.random() * 550).toFixed(0) + 'ms;--w:' + (Math.random() * 200).toFixed(0) + 'ms';
        e.addEventListener('animationend', function () { if (this.parentNode) this.parentNode.removeChild(this); });
        h.appendChild(e);
      }
    }
    function stop() { if (over) return; over = true; clearInterval(tick); clearTimeout(cap); setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 2000); }
    add(34, x, y, 1);
    tick = setInterval(function () { add(9, box.left + Math.random() * box.width, box.top + box.height * (0.25 + Math.random() * 0.6), 0.6); }, 260);
    cap = setTimeout(stop, 8000);
    document.body.appendChild(h);
    return { stop: stop };
  }
  /* Back on the pictures (or the list's way out): focus goes to the page area, not to a picture, so no outline appears round
     one; tabbing to a picture still shows it. */
  function focusLanding() { if (!landing) return; landing.setAttribute('tabindex', '-1'); try { landing.focus({ preventScroll: true }); } catch (e) {} }
  /* One burst and no more, from a point (a book chosen in the list) */
  function burst(x, y) { sparkle(x, y, { left: x, top: y, width: 0, height: 0 }).stop(); }
  /* The picture and the live bookcase, the same size and place at every moment. pic is the picture shown, P its rectangle on
     the page, px and py the transparent margin round the artwork as a fraction of its width and height; sizer is the live
     bookcase, already in its place. The live bookcase is shrunk to where the picture's artwork is and grown back, and a copy
     of the picture is grown with it, from where it is to the live bookcase's rectangle. */
  function playMorph(pic, P, px, py, sizer) {
    if (MORPH) MORPH.cancel();
    var Sx = P.left + P.width * px, Sy = P.top + P.height * py, Sw = P.width * (1 - 2 * px), T = sizer.getBoundingClientRect();
    if (!T.width || !Sw) return false;
    var k = Sw / T.width, kk = T.width / Sw, gx = T.left - P.left - kk * (Sx - P.left), gy = T.top - P.top - kk * (Sy - P.top);
    var ghost = new Image(); ghost.alt = ''; ghost.className = 'lib-ghost'; ghost.src = pic.currentSrc || pic.src;
    ghost.style.cssText = 'left:' + P.left + 'px;top:' + P.top + 'px;width:' + P.width + 'px;height:' + P.height + 'px';
    document.body.appendChild(ghost);
    sizer.style.transformOrigin = '0 0';
    var o = { duration: MORPH_MS, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both' };
    var a = [
      ghost.animate([{ transform: 'translate(0px, 0px) scale(1)', opacity: 1 }, { opacity: 1, offset: 0.35 }, { transform: 'translate(' + gx + 'px, ' + gy + 'px) scale(' + kk + ')', opacity: 0 }], o),
      sizer.animate([{ transform: 'translate(' + (Sx - T.left) + 'px, ' + (Sy - T.top) + 'px) scale(' + k + ')' }, { transform: 'translate(0px, 0px) scale(1)' }], o),
      root.animate([{ opacity: 0 }, { opacity: 1, offset: 0.65 }, { opacity: 1 }], o)
    ];
    function end() { a.forEach(function (x) { try { x.cancel(); } catch (e) {} }); if (ghost.parentNode) ghost.parentNode.removeChild(ghost); sizer.style.transformOrigin = ''; if (MORPH === m) MORPH = null; }
    var m = MORPH = { cancel: end };
    a[1].onfinish = end;
    return true;
  }
  function go(i, now) {
    var b = btns[i]; if (!b || busy) return;
    busy = true; if (note) note.hidden = true;
    var pic = null, sp = null, t0 = Date.now(), ran = false;
    if (!now) {
      b.classList.add('lib-opening');
      [].forEach.call(b.querySelectorAll('.lib-shelf-img'), function (x) { if (!pic && getComputedStyle(x).display !== 'none') pic = x; });
      var rc = (pic || b).getBoundingClientRect();
      sp = sparkle(rc.left + rc.width / 2, rc.top + rc.height / 2, rc);
    }
    function done() { b.classList.remove('lib-opening'); busy = false; if (sp) sp.stop(); }
    function fail(e) {
      if (window.console) console.error(e);
      done();
      if (note) { note.textContent = 'The shelves could not be loaded. Tap a bookcase to try again.'; note.hidden = false; }
    }
    /* Two frames are shown before any drawing begins, so the sparkles are already moving when the page is held for the draw */
    function run() {
      if (ran) return; ran = true;
      load().then(function (d) {
        if (!api) api = boot(d, false);
        api.prepare(i);
        setTimeout(function () {
          try {
            btns.forEach(function (x) { x.classList.remove('lib-opened'); }); b.classList.add('lib-opened');
            /* measured now, while the pictures are still on the page, in case it was scrolled meanwhile */
            api.open(i, pic && !REDUCE ? { pic: pic, rect: pic.getBoundingClientRect(), px: +b.dataset.px || 0, py: +b.dataset.py || 0 } : null);
          } catch (e) { return fail(e); }
          done();
        }, now ? 0 : Math.max(0, MIN - (Date.now() - t0)));
      }).catch(fail);
    }
    if (now) run(); else { requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(run, 0); }); }); setTimeout(run, 150); }
  }
  btns.forEach(function (b, i) {
    b.addEventListener('click', function () { go(i); });
    /* The data and the lettering font are fetched as soon as a bookcase is pointed at or touched, so choosing one only waits for the drawing */
    ['pointerenter', 'focus', 'touchstart'].forEach(function (t) { b.addEventListener(t, ahead, { once: true, passive: true }); });
  });
  function ahead() { load().catch(function () {}); try { if (document.fonts && document.fonts.load) document.fonts.load("12px 'IM Fell English SC'"); } catch (e) {} }
  (window.requestIdleCallback || function (f) { setTimeout(f, 2000); })(ahead);

  /* The list of books: one plain row each, drawn a screenful at a time. #books lists every book, #books-2 only Shelf 2's.
     Choosing a row opens that book's bookcase with the book selected. */
  var LV = { on: false, scope: -1, from: -1, pend: -2, live: false, q: '', genre: '', topic: '', sort: 'shelf', moreT: false, rows: [], n: 0, bk: null, cases: null, y: 0 };
  var listEl = document.getElementById('lib-books');
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function prep(d) {
    if (LV.bk) return;
    var bs = d.books || d, cs = d.cases && d.cases.length ? d.cases : [{ name: 'Shelf 1', n: 6 }, { name: 'Shelf 2', n: 6 }], CS = [], a = 0;
    cs.forEach(function (c) { CS.push(a); a += c.n; });
    LV.cases = cs;
    LV.bk = bs.map(function (b, i) {
      var ci = 0; while (ci < cs.length - 1 && b.s >= CS[ci + 1]) ci++;
      var au = b.a || '', segs = au.split(/,| and | with /).map(function (x) { return x.trim(); }).filter(Boolean), first = segs[0] || '',
        /* "David and Stella Gemmell" sorts under Gemmell: a first name with no surname borrows the last author's */
        p = (first.indexOf(' ') < 0 && segs.length > 1 ? segs[segs.length - 1] : first).split(' '), title = b.t.indexOf('UNIDENTIFIED') === 0 ? 'Unidentified' : b.t, tags = b.tags || [];
      return { i: i, ci: ci, t: title, a: au, g: b.g || 'Unsorted', tags: tags, c: b.c || '#888', where: cs[ci].name + ', row ' + (b.s - CS[ci] + 1),
        key: title.replace(/^(The|A|An) /, '').toLowerCase(), sn: au ? (p[p.length - 1] + ' ' + p[0]).toLowerCase() : 'zzzz',
        hay: (title + ' ' + au + ' ' + (b.g || '') + ' ' + tags.join(' ')).toLowerCase() };
    });
  }
  function inScope(b) { return LV.scope < 0 || b.ci === LV.scope; }
  /* Genre and topic chips, for the books in this list. Topics are the same ones the bookcase's Topic panel offers. */
  function chips() {
    var g = {}, t = {};
    LV.bk.filter(inScope).forEach(function (b) { g[b.g] = (g[b.g] || 0) + 1; b.tags.forEach(function (x) { t[x] = (t[x] || 0) + 1; }); });
    function row(id, obj, key) {
      $(id).innerHTML = Object.keys(obj).sort(function (x, y) { return obj[y] - obj[x] || x.localeCompare(y); }).map(function (k) {
        return '<button type="button" class="lib-chip" data-' + key + '="' + esc(k) + '" aria-pressed="' + (LV[key] === k) + '">' + esc(k) + '</button>';
      }).join('');
    }
    row('lib-books-genres', g, 'genre'); row('lib-books-topics', t, 'topic');
    var tp = $('lib-books-topics'), tg = $('lib-books-tmore'); tp.classList.toggle('is-open', LV.moreT); tg.textContent = LV.moreT ? 'Fewer topics' : 'More topics'; tg.setAttribute('aria-expanded', LV.moreT);
  }
  function more() {
    var ul = $('lib-books-list'), end = Math.min(LV.n + 70, LV.rows.length), h = '';
    for (var k = LV.n; k < end; k++) {
      var b = LV.rows[k];
      h += '<li><button type="button" class="lib-row" data-i="' + b.i + '"><i class="lib-sw" style="background:' + esc(b.c) + '"></i><span class="lib-r-t">' + esc(b.t) + '</span><span class="lib-r-a">' + esc(b.a) + '</span><span class="lib-r-m">'
        + esc([b.g].concat(b.tags.filter(function (x) { return x !== b.g; })).join(' · ')) + '</span><span class="lib-r-w">' + esc(b.where) + '</span></button></li>';
    }
    ul.insertAdjacentHTML('beforeend', h); LV.n = end; $('lib-books-more').hidden = end >= LV.rows.length;
  }
  function refresh() {
    var q = LV.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var r = LV.bk.filter(function (b) {
      if (!inScope(b) || (LV.genre && b.g !== LV.genre) || (LV.topic && b.tags.indexOf(LV.topic) < 0)) return false;
      for (var k = 0; k < q.length; k++) if (b.hay.indexOf(q[k]) < 0) return false;
      return true;
    });
    if (LV.sort === 'title') r.sort(function (x, y) { return x.key.localeCompare(y.key); });
    else if (LV.sort === 'author') r.sort(function (x, y) { return x.sn.localeCompare(y.sn) || x.key.localeCompare(y.key); });
    LV.rows = r; LV.n = 0; $('lib-books-list').innerHTML = ''; more();
    var tot = LV.bk.filter(inScope).length;
    $('lib-books-count').textContent = r.length === tot ? tot + ' books' : r.length + ' of ' + tot + ' books';
    $('lib-books-empty').hidden = r.length > 0;
  }
  function showList(scope, from) {
    load().then(function (d) {
      prep(d); if (!api) api = boot(d, false);
      if (scope >= LV.cases.length) scope = -1;
      api.hide(); LV.live = false; if (landing) landing.hidden = true;
      LV.scope = scope; LV.from = from; LV.q = LV.genre = LV.topic = ''; LV.sort = 'shelf'; LV.moreT = false;
      $('lib-books-q').value = ''; $('lib-books-sort').value = 'shelf';
      $('lib-books-title').textContent = scope >= 0 ? 'Books on ' + LV.cases[scope].name : 'All books';
      $('lib-books-back').textContent = '‹ ' + (from >= 0 ? 'Back to ' + LV.cases[from].name : 'All shelves');
      chips(); refresh(); listEl.hidden = false; LV.on = true;
      var h = $('lib-books-title'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
    }).catch(function (e) {
      if (window.console) console.error(e);
      if (landing) landing.hidden = false;
      if (note) { note.textContent = 'The list of books could not be loaded. Try again.'; note.hidden = false; }
    });
  }
  function hideList() { if (listEl) listEl.hidden = true; LV.on = false; }
  /* Back out of the list: to the bookcase it was opened from, or to the pictures of the bookcases */
  function leave() {
    var from = LV.from; hideList();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (from >= 0) { openAt(from, null, null, false); return; }
    if (landing) landing.hidden = false;
    focusLanding();
  }
  function reshow() { LV.live = false; api.hide(); if (landing) landing.hidden = true; listEl.hidden = false; LV.on = true; window.scrollTo(0, LV.y || 0); }
  function openAt(ci, gi, ev, fromList) {
    if (!api) return;
    if (ev) burst(ev.clientX, ev.clientY);
    hideList(); if (landing) landing.hidden = true; LV.live = !!fromList;
    /* One tick later, so the click that chose the book is not taken by the bookcase as a click outside it */
    setTimeout(function () {
      api.prepare(ci, gi, fromList ? { back: reshow, label: 'Back to the list' } : null);
      api.open(ci);
    }, 0);
  }
  /* The "Books on this shelf" button on an open bookcase */
  function listFromShelf(ci) {
    LV.pend = ci;
    if (location.hash === '#books-' + (ci + 1)) route(); else location.hash = '#books-' + (ci + 1);
  }
  function route() {
    var m = /^#books(?:-(\d+))?$/.exec(location.hash);
    if (m) { var from = LV.pend; LV.pend = -2; showList(m[1] ? +m[1] - 1 : -1, from === -2 ? -1 : from); return; }
    if (LV.on) { hideList(); if (landing) landing.hidden = false; }
    else if (LV.live) { LV.live = false; if (api) api.home(); }
  }
  if (listEl) {
    $('lib-books-back').addEventListener('click', leave);
    var qT = 0; $('lib-books-q').addEventListener('input', function () { clearTimeout(qT); qT = setTimeout(function () { LV.q = $('lib-books-q').value; refresh(); }, 60); });
    $('lib-books-sort').addEventListener('change', function () { LV.sort = this.value; refresh(); });
    $('lib-books-tmore').addEventListener('click', function () { LV.moreT = !LV.moreT; chips(); });
    $('lib-books-more').addEventListener('click', more);
    $('lib-books-clear').addEventListener('click', function () { LV.q = LV.genre = LV.topic = ''; $('lib-books-q').value = ''; chips(); refresh(); });
    listEl.addEventListener('click', function (ev) {
      var t = ev.target, row = t.closest && t.closest('.lib-row'), chip = t.closest && t.closest('.lib-chip');
      if (row) { LV.y = window.scrollY; var b = LV.bk[+row.dataset.i]; openAt(b.ci, b.i, ev, true); return; }
      if (chip) { var key = chip.hasAttribute('data-genre') ? 'genre' : 'topic', v = chip.getAttribute('data-' + key); LV[key] = LV[key] === v ? '' : v; chips(); refresh(); }
    });
    document.addEventListener('keydown', function (ev) {
      if (!LV.on || ev.key !== 'Escape' || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      var q = $('lib-books-q'); if (ev.target === q && q.value) { q.value = ''; LV.q = ''; refresh(); return; }
      leave();
    });
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { if (es[0].isIntersecting && LV.on && LV.n < LV.rows.length) more(); }, { rootMargin: '700px' }).observe($('lib-books-more'));
    addEventListener('hashchange', route);
  }
  var hm = /^#CG(\d+)\./.exec(location.hash); if (hm) go(+hm[1] - 1, true); else route();
  function boot(d, render){
    const books=d.books||d,cases=d.cases&&d.cases.length?d.cases:[{name:'Shelf 1',n:6},{name:'Shelf 2',n:6}],curios=d.curios||[],CS=[];
    {let a=0;cases.forEach(c=>{CS.push(a);a+=c.n})}
    let AC=null,STD=shelves&&+shelves.dataset.std||0,FIXW0=shelves&&+shelves.dataset.fixw||0;
    function fresh(over){if(AC)AC.abort();AC=new AbortController();document.documentElement.classList.remove('lib-zoomed');root.innerHTML=TPL;root.classList.toggle('lib-over',over);root.hidden=false}
    let warmed=-1;
    function clear(){if(AC)AC.abort();AC=null;warmed=-1;root.innerHTML='';root.hidden=true;root.classList.remove('lib-warm','lib-fadein','lib-bloom');root.style.width=root.style.left='';document.documentElement.classList.remove('lib-zoomed')}
    function overview(){
      /* Back to the pictures: the live bookcase is thrown away, so this is instant */
      if(!render){clear();if(landing)landing.hidden=false;focusLanding();return}
      fresh(true);start(books,d.covers,curios,cases,{landing:true,signal:AC.signal,pick:()=>{},std:w=>{STD=w;window.__libStd=w},fixw:w=>{window.__libFixW=w},ready:()=>{window.__libReady=true}})}
    function draw(ci,sel,opt){const c=cases[ci];
      const bs=books.map((b,gi)=>Object.assign({},b,{_g:gi})).filter(b=>b.s>=CS[ci]&&b.s<CS[ci]+c.n).map(b=>Object.assign(b,{s:b.s-CS[ci]})),
        cu=curios.filter(q=>q.s===-1-ci||(q.s>=CS[ci]&&q.s<CS[ci]+c.n)).map(q=>Object.assign({},q,{s:q.s<0?-1:q.s-CS[ci]}));
      start(bs,d.covers,cu,[c],{ci,stdW:STD,fixW:FIXW0,signal:AC.signal,close:opt&&opt.back||overview,backLabel:opt&&opt.label,sel,list:()=>listFromShelf(ci)})}
    /* Draw a bookcase out of sight, at the size it will have when shown: the page's column, not in the page's flow */
    function prepare(ci,sel,opt){if(warmed===ci&&sel==null&&!opt)return;if(warmed>=0||AC)clear();
      const p=root.parentNode,cs=getComputedStyle(p),r=p.getBoundingClientRect();
      root.classList.add('lib-warm');root.style.width=(p.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight))+'px';root.style.left=(r.left+parseFloat(cs.paddingLeft)+p.clientLeft)+'px';
      fresh(false);draw(ci,sel,opt);warmed=ci}
    function openShelf(ci,mo){
      if(warmed!==ci)prepare(ci);
      /* Bring the drawn bookcase into the page, in place of the pictures: grown from the picture's own size and place when a
         picture was chosen, otherwise blooming outward from its middle */
      warmed=-1;root.classList.remove('lib-warm');root.style.width=root.style.left='';if(landing)landing.hidden=true;
      if(root.scrollIntoView&&root.getBoundingClientRect().top<0)root.scrollIntoView({block:'start'});
      const sz=root.querySelector('#lib-sizer');
      if(mo&&sz&&root.animate&&playMorph(mo.pic,mo.rect,mo.px,mo.py,sz))return;
      const k=REDUCE?'lib-fadein':'lib-bloom';root.classList.add(k);setTimeout(()=>root.classList.remove(k),620)}
    if(render)overview();
    return{open:openShelf,prepare,home:overview,hide:clear}}
  function start(DATA, COVERS, CURIOS, CASES0, CTX) {
    CTX=CTX||{};const KS=CTX.ci!=null?'-'+CTX.ci:'',PFX='CG'+((CTX.ci||0)+1),SIG=CTX.signal?{signal:CTX.signal}:undefined,
      onDoc=(t,fn)=>document.addEventListener(t,fn,SIG),onWin=(t,fn)=>addEventListener(t,fn,SIG);
    /* The bookcases come from the data file: a name, a shelf count, and optionally dark wood and straight boards */
    const CASES=CASES0&&CASES0.length?CASES0:[{name:'Left case',n:6},{name:'Right case',n:6}],CS=[];{let a=0;CASES.forEach(c=>{CS.push(a);a+=c.n})}
    const caseOf=s=>{let c=0;while(c<CASES.length-1&&s>=CS[c+1])c++;return c};
    const SH=250,PL=18,ROW=SH+PL+34,PAD=14,GAP=2,NS=CASES.reduce((a,c)=>a+c.n,0),FK=0.7,CG=36,TOP=30,INK='#1B1B3A';
    function rgb(hex){const n=parseInt(hex.slice(1),16);return[(n>>16)/255,(n>>8&255)/255,(n&255)/255]}
    function hsl(hex){const[r,g,b]=rgb(hex),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;let h=0,s=0;
     if(d){s=d/(1-Math.abs(2*l-1));h=mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}return{h,s,l}}
    function lum(hex){const f=v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4),[r,g,b]=rgb(hex);return .2126*f(r)+.7152*f(g)+.0722*f(b)}
    function contrast(a,b){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
    const neutral=c=>c.s<.15||c.l<.12||c.l>.9;
    const hueKey=e=>neutral(e.k)?2+(1-e.k.l):e.k.h;
    const byHue=(a,b)=>hueKey(a)-hueKey(b)||a.k.l-b.k.l||a.t.localeCompare(b.t);
    const where=s=>{const c=caseOf(s);return CASES[c].name+', row '+(s-CS[c]+1)};

    const caseEl=document.getElementById('lib-case'),sizer=document.getElementById('lib-sizer'),vp=document.getElementById('lib-vp'),
          msg=document.getElementById('lib-msg'),info=document.getElementById('lib-info');
    const boxes=CASES.map((c,i)=>{const b=document.createElement('div');b.className='lb-box'+(c.wood?' lb-'+c.wood:'')+(c.taper?' lb-ladder':'');
      ['deep','books2','books1','books','cur'].forEach(k=>{const q=document.createElement('div');q.className='lb-plane lb-p-'+k;b.appendChild(q);b['_'+k]=q});caseEl.appendChild(b);return b});
    let BOX=null,view='ring',focus=0,tucked=false,zs=1;
    const books=DATA;books.forEach(b=>{b.a=b.a||'';b.p=b.p||'';b.n=b.n||'';b.an=b.an||'';b.pl=b.pl||'up';b.c2=b.c2||'#F4F2EC';b.cn=b.cn||'unsorted';b.g=b.g||'Unsorted'});
    const seenEmb=new Set();
    books.forEach((e,i)=>{e.i=i;e.k=hsl(e.c);
      const el=document.createElement('button');el.type='button';el.className='lb-book'+(e.w<10?' lb-thin':'');el.style.setProperty('--c',e.c);
      el.setAttribute('aria-label',e.t+(e.a?' by '+e.a:''));
      const s=document.createElement('span');s.textContent=e.t.startsWith('UNIDENTIFIED')?'?':e.t;
      s.style.color=contrast(e.c,e.c2)>=3?e.c2:(lum(e.c)<.3?'#F3E3B0':'#2A1608');e.oc=lum(e.c)<.3?'#E3C56B':(contrast(e.c,e.c2)>=2?e.c2:'#3A2412');e.tc=s.style.color;{const R=rng(e.i*7919+13),pick=()=>{for(let n=0;n<40;n++){const[g,sig]=emblem(R);if(!seenEmb.has(sig)){seenEmb.add(sig);return g}}return emblem(R)[0]};
      e.emb=pick();e.emb2=pick();e.d={bt:Math.floor(R()*8),bb:Math.floor(R()*8),p:2+Math.floor(R()*3),fr:Math.floor(R()*5),tex:R()<.4?1+Math.floor(R()*4):0,two:R()<.4}}
      e.or=document.createElement('i');e.or.className='lb-orn';el.appendChild(e.or);
      el.appendChild(s);e.sp=s;el.addEventListener('click',()=>{if(e.moved){e.moved=false;return}select(e)});e.el=el;caseEl.appendChild(el)});
    const cv=document.createElement('canvas'),ctx=cv.getContext?cv.getContext('2d'):null;
    function tw(t){if(!ctx)return t.length*6.6;ctx.font="12px 'IM Fell English SC', Georgia, serif";return ctx.measureText(t).width}
    function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
    function emblem(r){const t=Math.floor(r()*6),f=n=>n.toFixed(2);let g='',sig;
      if(t===0){const n=5+Math.floor(r()*8),rho=3.6+r()*1.2,rx=.8+r()*.9,ry=2+r()*1.4,c=.8+r()*1.4;sig=[t,n,f(rho),f(rx),f(ry)];
        for(let i=0;i<n;i++)g+=`<ellipse cx="8" cy="${f(8-rho)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(i*360/n)} 8 8)"/>`;g+=`<circle cx="8" cy="8" r="${f(c)}"/>`}
      else if(t===1){const n=4+Math.floor(r()*7),inr=2.2+r()*2.6,rot=r()*360;sig=[t,n,f(inr)];let d='';
        for(let i=0;i<n*2;i++){const a=(rot+i*180/n)*Math.PI/180,R=i%2?inr:7.5;d+=(i?'L':'M')+f(8+R*Math.cos(a))+' '+f(8+R*Math.sin(a))}g=`<path d="${d}Z"/>`}
      else if(t===2){const n=6+Math.floor(r()*7),rr=2.4+r()*2,dr=.6+r()*.6;sig=[t,n,f(rr),f(dr)];
        g=`<circle cx="8" cy="8" r="${f(rr)}" fill="none" stroke="currentColor" stroke-width="1.1"/><circle cx="8" cy="8" r="${f(rr*.4)}"/>`;
        for(let i=0;i<n;i++){const a=i*2*Math.PI/n;g+=`<circle cx="${f(8+6.6*Math.cos(a))}" cy="${f(8+6.6*Math.sin(a))}" r="${f(dr)}"/>`}}
      else if(t===3){const n=3+Math.floor(r()*6),rot=r()*360,ir=2+r()*3;sig=[t,n,f(ir),Math.round(rot/20)];
        const poly=(R,ro)=>{let d='';for(let i=0;i<n;i++){const a=(ro+i*360/n)*Math.PI/180;d+=(i?'L':'M')+f(8+R*Math.cos(a))+' '+f(8+R*Math.sin(a))}return d+'Z'};
        g=`<path d="${poly(7.4,rot)}" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="${poly(ir,rot+180/n)}"/>`}
      else if(t===4){const k=2+Math.floor(r()*3),ll=2.5+r()*2,lean=(r()-.5)*3;sig=[t,k,f(ll),f(lean)];g=`<path d="M${f(8-lean)} 15.5Q8 9 ${f(8+lean)} 1" fill="none" stroke="currentColor" stroke-width="1.1"/>`;
        for(let i=0;i<k;i++){const y=13-i*(10/k),x=8+lean*((13-y)/14-.5);g+=`<ellipse cx="${f(x-ll*.6)}" cy="${f(y-1)}" rx="${f(ll*.62)}" ry="1.1" transform="rotate(28 ${f(x)} ${f(y)})"/><ellipse cx="${f(x+ll*.6)}" cy="${f(y-1)}" rx="${f(ll*.62)}" ry="1.1" transform="rotate(-28 ${f(x)} ${f(y)})"/>`}}
      else{const ph=4+r()*3.5,ns=1+Math.floor(r()*3),rot=r()*360;sig=[t,f(ph),ns,Math.round(rot/30)];
        g=`<path transform="rotate(${f(rot)} 8 8)" d="M10 1.5A6.5 6.5 0 1 0 10 14.5A${f(ph)} ${f(ph)} 0 1 1 10 1.5Z"/>`;for(let i=0;i<ns;i++)g+=`<circle cx="${f(3+r()*10)}" cy="${f(3+r()*10)}" r="${f(.5+r()*.6)}"/>`}
      return[g,sig.join()]}
    function band(t,y,W,o,p){const L=`stroke="${o}" fill="none"`;
      switch(t){case 0:return`<path d="M0 ${y}H${W}M0 ${y+p}H${W}" ${L} stroke-width="1"/>`;
       case 1:return`<path d="M0 ${y-1}H${W}M0 ${y+1.5}H${W}M0 ${y+4}H${W}" ${L} stroke-width=".8"/>`;
       case 2:return`<rect x="0" y="${y-1}" width="${W}" height="${p+3}" fill="rgba(0,0,0,.3)"/><path d="M0 ${y-1}H${W}M0 ${y+p+2}H${W}" ${L} stroke-width="1"/>`;
       case 3:return`<path d="M1 ${y+1}H${W}" ${L} stroke-width="1.8" stroke-linecap="round" stroke-dasharray=".1 ${p+1}"/>`;
       case 4:return`<path d="M0 ${y+1}H${W}" ${L} stroke-width="1.6" stroke-dasharray="${p+2} 2"/>`;
       case 5:{let d='M0 '+(y+3);for(let x=0;x<W;x+=p+1)d+=`l${(p+1)/2} -3l${(p+1)/2} 3`;return`<path d="${d}" ${L} stroke-width="1"/>`}
       case 6:{let d='M0 '+y;for(let x=0;x<W;x+=p+2)d+=`q${(p+2)/2} 4 ${p+2} 0`;return`<path d="${d}" ${L} stroke-width="1"/>`}
       default:return`<path d="M0 ${y}H${W}" ${L} stroke-width="1.2"/><path d="M1.5 ${y+3.5}H${W}" ${L} stroke-width="1.5" stroke-linecap="round" stroke-dasharray=".1 ${p+2}"/>`}}
    function decorate(e){const W=e.dw-2,H=e.dh-2,o=e.oc,f=e.f,d=e.d;let g='',r0=5,r1=5;
      const mot=(m,x,y,sz)=>`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(sz/16).toFixed(3)})" style="color:${o}" fill="currentColor">${m}</g>`;
      if(f==='up'){
        if(d.tex&&W>=14&&H>=60){const id='t'+e.i,q=4+d.p,pt=d.tex===1?`<path d="M0 ${q}L${q} 0" stroke="${o}" stroke-width=".7"/>`:d.tex===2?`<circle cx="${q/2}" cy="${q/2}" r=".8" fill="${o}"/>`:d.tex===3?`<path d="M${q/2} 0V${q}" stroke="${o}" stroke-width=".7"/>`:`<path d="M0 ${q}L${q} 0M0 0L${q} ${q}" stroke="${o}" stroke-width=".6"/>`;
          g+=`<defs><pattern id="${id}" width="${q}" height="${q}" patternUnits="userSpaceOnUse">${pt}</pattern></defs><rect x="0" y="16" width="${W}" height="${H-34}" fill="url(#${id})" opacity=".2"/>`}
        if(H>=60){g+=band(d.bt,9,W,o,d.p)+band(d.bb,H-15,W,o,d.p);r0=18;r1=20}
        if(W>=22&&d.fr){const x=3.5,y=19.5,w=W-7,h=H-41,S=`fill="none" stroke="${o}" stroke-width=".8" opacity=".7"`;
          g+=d.fr===1?`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ${S}/>`:d.fr===2?`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${S}/><rect x="${x+2.5}" y="${y+2.5}" width="${w-5}" height="${h-5}" ${S}/>`:d.fr===3?`<path d="M${x+4} ${y}H${x+w-4}L${x+w} ${y+4}V${y+h-4}L${x+w-4} ${y+h}H${x+4}L${x} ${y+h-4}V${y+4}Z" ${S}/>`:`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w/2,12)}" ${S}/>`;r0=24;r1=26}
        if(W>=18&&H>=140){const sz=Math.min(W-8,20);g+=mot(e.emb,(W-sz)/2,r0+2,sz);r0+=sz+6;
          if(d.two){const z=sz*.62;g+=mot(e.emb2,(W-z)/2,H-r1-z-2,z);r1+=z+6}}}
      else if(f==='flat'){if(W>=60){g+=`<g transform="rotate(90) translate(0 ${-W})">${band(d.bt,9,H,o,d.p)}${band(d.bb,W-15,H,o,d.p)}</g>`;r0=r1=18}}
      else{g+=`<rect x="5.5" y="5.5" width="${W-11}" height="${H-11}" rx="3" fill="none" stroke="${o}" stroke-width="1"/>`+mot(e.emb,(W-24)/2,12,24);r0=42;r1=14}
      e.r0=r0;e.r1=r1;e.or.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}</svg>`}
    function fitK(ws,gap,L,T){for(let k=1;k>.12;k-=.04){const lim=L/k/1.06;let lines=1,cur=0,ok=true;
        for(const w of ws){if(w>lim){ok=false;break}if(cur&&cur+gap+w>lim){lines++;cur=w}else cur+=(cur?gap:0)+w}
        if(ok&&lines*13*k<=T)return k}return .1}
    function fitTitle(e){const f=e.f,ws=e.sp.textContent.split(' ').map(tw),gap=tw(' '),W=e.dw-2,H=e.dh-2,Z=H-e.r0-e.r1-6;let hz=f!=='up',k,L;
      if(f==='up'){L=Z;k=fitK(ws,gap,L,W-1);if(W>=36){const kh=fitK(ws,gap,W-8,Z);if(kh>=.6){hz=true;k=kh;L=W-8}}e.el.style.padding=e.r0+'px 0 '+e.r1+'px'}
      else if(f==='flat'){L=W-e.r0-e.r1-6;k=fitK(ws,gap,L,H-1);e.el.style.padding='0 '+e.r1+'px 0 '+e.r0+'px'}
      else{L=W-14;k=fitK(ws,gap,L,Z);e.el.style.padding=e.r0+'px 0 '+e.r1+'px'}
      e.fit=k;e.el.classList.toggle('lb-hz',hz&&f==='up');const inl=Math.ceil(L/k)+'px';e.sp.style.transform='scale('+k.toFixed(2)+')';
      if(hz){e.sp.style.width=inl;e.sp.style.height=''}else{e.sp.style.height=inl;e.sp.style.width=''}}
    function form(e,f){if(e.f===f)return;e.f=f;const el=e.el;el.classList.toggle('lb-flat',f==='flat');el.classList.toggle('lb-face',f==='face');
      let w=e.w,h=e.h;if(f==='flat'){w=e.h;h=Math.max(6,Math.round(e.w*FK))}else if(f==='face'){w=Math.round(e.h*.7)}
      e.dw=w;e.dh=h;el.style.width=w+'px';el.style.height=h+'px';
      decorate(e);fitTitle(e)}

    function pack(list){const total=list.reduce((a,b)=>a+b.w+GAP,0),cap=total/NS*1.03,out=[[]];let x=0;
      list.forEach(b=>{if(x+b.w>cap&&out.length<NS){out.push([]);x=0}out[out.length-1].push(b);x+=b.w+GAP});
      while(out.length<NS)out.push([]);return out}
    function byTarget(arr,fn){const idx=arr.map((_,i)=>i).sort((a,b)=>fn(a,arr.length)-fn(b,arr.length)),byH=[...arr].sort((a,b)=>a.h-b.h),out=[];
      idx.forEach((slot,r)=>out[slot]=byH[r]);return out}
    const hueSorted=()=>[...books].sort(byHue);
    let cols=2;
    const MODES={
     shelved:{label:'As shelved',real:true,run(){const sh=Array.from({length:NS},()=>[]);books.forEach(e=>sh[e.s].push(e));
       return{sh,msg:'This bookcase as photographed. Books lying flat or facing out are drawn that way. Sizes are estimates.'}}},
     colour:{label:'Colour',run(){return{sh:pack(hueSorted()),msg:'Rainbow order across every shelf. Black, grey and white sit together at the end.'}}},
     size:{label:'Size',run(){return{sh:pack([...books].sort((a,b)=>b.h-a.h||b.w-a.w)),msg:'Tallest to shortest.'}}},
     genre:{label:'Genre',labels:true,run(){return{sh:pack([...books].sort((a,b)=>a.g.localeCompare(b.g)||a.a.localeCompare(b.a)||a.t.localeCompare(b.t))),msg:'Grouped by genre, then author. The genres are a first guess and need your review.'}}},
     thick:{label:'Thickness',run(){return{sh:pack([...books].sort((a,b)=>b.w-a.w||b.h-a.h)),msg:'Fattest to thinnest.'}}},
     author:{label:'Author',run(){return{sh:pack([...books].sort((a,b)=>surname(a).localeCompare(surname(b))||tkey(a).localeCompare(tkey(b)))),msg:'By author surname, then title. Books with no author on record go last.'}}},
     title:{label:'Title',run(){return{sh:pack([...books].sort((a,b)=>tkey(a).localeCompare(tkey(b)))),msg:'A to Z by title, ignoring a leading The, A or An.'}}},
     skyline:{label:'Skyline',pat:true,run(){return{sh:pack(hueSorted()).map(s=>byTarget(s,(i,n)=>Math.sin(i/Math.max(1,n-1)*Math.PI*2.5))),msg:'Heights rise and fall along each shelf, in colour order.'}}},
     pyramid:{label:'Pyramid',pat:true,run(){return{sh:pack(hueSorted()).map(s=>byTarget(s,(i,n)=>-Math.abs(i-(n-1)/2))),msg:'Tallest in the middle of each shelf, stepping down to the ends.'}}},
     valley:{label:'Valley',pat:true,run(){return{sh:pack(hueSorted()).map(s=>byTarget(s,(i,n)=>Math.abs(i-(n-1)/2))),msg:'Tallest at both ends of each shelf, dipping in the middle.'}}},
     stairs:{label:'Staircase',pat:true,run(){return{sh:pack(hueSorted()).map(s=>[...s].sort((a,b)=>a.h-b.h)),msg:'Each shelf climbs from its shortest book to its tallest.'}}},
     zebra:{label:'Zebra',pat:true,run(){const Li=hueSorted().filter(b=>b.k.l>=.5),Dk=hueSorted().filter(b=>b.k.l<.5),out=[],n=Math.min(Li.length,Dk.length);
       for(let i=0;i<n;i++)out.push(Li[i],Dk[i]);out.push(...Li.slice(n),...Dk.slice(n));
       return{sh:pack(out),msg:`Light and dark spines alternate for ${n} pairs. The ${Math.abs(Li.length-Dk.length)} left over are all ${Li.length>Dk.length?'light':'dark'} and sit at the end.`}}},
     blocks:{label:'Colour blocks',pat:true,run(){const sh=[[]],c=cap(),all=hueSorted();let used=0,last=null,rem=all.reduce((a,b)=>a+b.w+GAP,0);
       all.forEach(b=>{const w=b.w+GAP;if(sh.length<NS&&(used+w>c||(b.cn!==last&&used>c*.6&&rem<=(NS-sh.length)*c*.97))){sh.push([]);used=0}
         sh[sh.length-1].push(b);used+=w;rem-=w;last=b.cn});while(sh.length<NS)sh.push([]);
       return{sh,msg:'Colour order, but a shelf ends early when the colour changes, so each shelf holds one or two colours. Shelves end up unevenly full.'}}},
     rainbows:{label:'Rainbows',pat:true,run(){const sh=Array.from({length:NS},()=>[]);hueSorted().forEach((b,j)=>sh[j%NS].push(b));
       return{sh:fixW(sh),msg:'Every shelf gets its own full run of colours, red through to the neutrals.'}}},
     shuffle:{label:'Shuffle',pat:true,run(){const a=[...books];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
       return{sh:pack(a),msg:'Random order, different every time you pick it.'}}},
     piano:{label:'Piano',pat:true,run(){
       const W=books.filter(b=>b.k.l>.85).sort((a,b)=>b.h-a.h),B=books.filter(b=>b.k.l<.12).sort((a,b)=>a.h-b.h),keys=[],P='WBWBWWBWBWBW';
       for(let i=0;;i++){const src=P[i%12]==='W'?W:B;if(!src.length)break;keys.push(src.shift())}
       const used=new Set(keys),rest=hueSorted().filter(b=>!used.has(b));
       return{sh:pack([...keys,...rest]),msg:`Piano: ${keys.length} keys, then the rest by colour. It stopped when the ${W.length?'black':'white'} spines ran out, with ${W.length+B.length} ${W.length?'white':'black'} ones left over.`}}},
     rings:{label:'Rings',pat:true,centre:true,run(){
       const k=Math.ceil(books.length/NS),rows=NS/cols,slots=[];
       for(let s=0;s<NS;s++)for(let i=0;i<k;i++){const col=cols===2?(s<6?0:1):0,row=cols===2?s%6:s;
         slots.push({s,i,d:Math.hypot((col+(i+.5)/k)/cols-.5,((row+.5)/rows-.5)*.8)})}
       slots.sort((a,b)=>a.d-b.d);const grid=Array.from({length:NS},()=>[]);
       hueSorted().forEach((b,j)=>grid[slots[j].s][slots[j].i]=b);
       return{sh:fixW(grid.map(r=>r.filter(Boolean))),msg:'Colours spread outward from the centre'+(cols===2?' of the two cases':'')+'. Neutrals end up at the edges.'}}},
     manual:{label:'Arrange by hand',own:true,run(){if(!manual)manual=normalise(prevSh.map(s=>s.map(e=>e.i)));
       return{sh:manual.map(s=>s.map(i=>books[i])),msg:'Drag any book to any spot on any shelf. The shelves keep their real width, so a full shelf will not take another book.'}}}
    };
    const surname=e=>{if(!e.a)return'zzzz';const a=e.a.split(/,| and | with /)[0].trim().split(' ');return(a[a.length-1]+' '+a[0]).toLowerCase()};
    const tkey=e=>e.t.replace(/^(The|A|An) /,'').toLowerCase();
    let FIXW=0,manual=null,prevSh=null,geos=[];const cap=()=>FIXW-2*PAD,wsum=s=>s.reduce((a,i)=>a+books[i].w+GAP,0);
    function normalise(sh){const c=cap(),pool=[];sh=sh.map(s=>[...s]);sh.forEach(s=>{while(wsum(s)>c)pool.unshift(s.pop())});
      pool.forEach(i=>{let t=sh.find(s=>wsum(s)+books[i].w+GAP<=c);if(!t)t=sh.reduce((a,b)=>wsum(a)<wsum(b)?a:b);t.push(i)});return sh}
    const fixW=sh=>normalise(sh.map(s=>s.map(e=>e.i))).map(s=>s.map(i=>books[i]));
    const enc=()=>PFX+'.'+manual.map(s=>s.map(i=>i.toString(36).padStart(2,'0')).join('')).join('.');
    function dec(t){const p=t.trim().split('.');if(p[0]!==PFX||p.length!==NS+1)return null;const seen=new Set(),sh=[];
      for(const part of p.slice(1)){const s=[];for(let i=0;i<part.length;i+=2){const n=parseInt(part.substr(i,2),36);if(!(n>=0&&n<books.length)||seen.has(n))return null;seen.add(n);s.push(n)}sh.push(s)}
      return seen.size===books.length?sh:null}
    function saveManual(){try{localStorage.setItem('dungeon-library-manual'+KS,enc())}catch(err){}shareLinks()}
    const mailLink=document.querySelector('.library-intro a[href^="mailto:"]'),sendTo=mailLink?mailLink.getAttribute('href').slice(7).split('?')[0]:'';
    const shareUrl=()=>location.origin+location.pathname+'#'+enc();
    function shareLinks(){const a=document.getElementById('lib-send');if(!a||!manual)return;a.hidden=!sendTo;
      if(sendTo)a.href='mailto:'+sendTo+'?subject='+encodeURIComponent('A shelf arrangement for your library')+'&body='+encodeURIComponent('Here is how I would arrange your shelves:\n\n'+shareUrl())}
    try{manual=dec(localStorage.getItem('dungeon-library-manual'+KS)||'')}catch(err){manual=null}

    let scale=1,zoom=1,caseW=600,caseH=600,current='shelved';
    function layoutShelf(list,real,tk){
      if(real&&tk&&list.some(e=>e.ly)){const parts=[0,1,2].map(k=>list.filter(e=>(e.ly||0)===k)).filter(q=>q.length).map(q=>layoutShelf(q,true,false));
        return{place:[].concat(...parts.map(q=>q.place)),width:Math.max(...parts.map(q=>q.width))}}
      let x=PAD;const tops=[],place=[],later=[];
      for(let i=0;i<list.length;i++){const e=list[i],pl=real?e.pl:'up';
        if(pl==='stack'){const g=[];while(i<list.length&&list[i].pl==='stack'&&(list[i].pg||0)===(e.pg||0)){g.push(list[i]);i++}i--;
          g.forEach(b=>form(b,'flat'));const L=Math.max(...g.map(b=>b.dw));let acc=0;
          for(let j=g.length-1;j>=0;j--){const b=g[j];place.push([b,x+(L-b.dw)/2,-(acc+b.dh)]);acc+=b.dh}
          tops.push({x0:x,x1:x+L,top:-acc});x+=L+GAP}
        else if(pl==='top'||pl==='face')later.push(e);
        else{form(e,'up');place.push([e,x,-e.h]);e._x=x;tops.push({x0:x,x1:x+e.w,top:-e.h});x+=e.w+GAP}}
      const pts=[];tops.forEach(t=>pts.push([t.x0,t.top],[t.x1,t.top]));
      later.forEach(e=>{const a=list.find(b=>b!==e&&e.an&&b.t.startsWith(e.an)),ax=a&&a._x!=null?a._x:PAD;
        if(e.pl==='face'){form(e,'face');place.push([e,ax,-e.dh,0,true]);return}
        form(e,'flat');const len=e.dw,x1=ax+len,P=pts.filter(p=>p[0]>=ax-.5&&p[0]<=x1+.5);
        const yv=(t,x)=>t.top2==null?t.top:t.top+(t.top2-t.top)*(x-t.x0)/(t.x1-t.x0);tops.forEach(t=>{if(t.x0<ax&&t.x1>ax)P.push([ax,yv(t,ax)]);if(t.x0<x1&&t.x1>x1)P.push([x1,yv(t,x1)])});
        P.sort((p,q)=>p[0]-q[0]||p[1]-q[1]);const H=[];
        P.forEach(p=>{while(H.length>=2){const u=H[H.length-2],v=H[H.length-1];if((v[0]-u[0])*(p[1]-u[1])-(v[1]-u[1])*(p[0]-u[0])<=0)H.pop();else break}H.push(p)});
        const segs=[];for(let n=0;n<H.length-1;n++)if(H[n+1][0]-H[n][0]>1)segs.push([H[n],H[n+1]]);
        const cx=ax+len/2;let m=0,y0=H.length?Math.min(...H.map(p=>p[1])):0;
        if(segs.length){const sg=segs.find(g=>g[0][0]<=cx&&cx<=g[1][0])||(cx<segs[0][0][0]?segs[0]:segs[segs.length-1]);
          m=(sg[1][1]-sg[0][1])/(sg[1][0]-sg[0][0]);m=Math.max(-.5,Math.min(.5,m));y0=sg[0][1]+m*(ax-sg[0][0])}
        const ang=Math.atan(m),co=Math.cos(ang),si=Math.sin(ang),tl=[ax+si*e.dh,y0-co*e.dh],tr=[ax+co*len+si*e.dh,y0+si*len-co*e.dh];
        place.push([e,ax,y0-e.dh,ang]);pts.push(tl,tr);tops.push({x0:tl[0],x1:tr[0],top:tl[1],top2:tr[1]});x=Math.max(x,x1+GAP)});
      return{place,width:x+PAD}}
    let dxs={};try{dxs=JSON.parse(localStorage.getItem('dungeon-library-dx'+KS)||'{}')}catch(e){dxs={}}
    const FD=0,DEPTH=120,SIDE=24,TB=26,STUFF=236,FOOT=46,RAD=Math.PI/180,
      TILT=[-.6,.5,-.3,.7,-.5,.3,.5,-.7,.4,-.4,.6,-.3],JIT=[0,4,-3,5,-2,3,3,-2,5,0,-4,2],LEAN=[.2,-.25];
    for(let q=0;q<NS;q++){if(CASES[caseOf(q)].straight){TILT[q]=0;JIT[q]=0}else if(TILT[q]==null){TILT[q]=[-.5,.4,-.3,.6,-.4,.3][q%6];JIT[q]=[0,3,-2,4,-3,2][q%6]}}
    /* Curios: the things standing on the shelves and on top of the cases, drawn here and placed by library.json.
       Each is [width, height, drawing]. A visitor can drag any of them to any shelf; clicking one shows its details. */
    const SK='stroke="rgba(30,15,5,.6)" stroke-width="1" stroke-linejoin="round"',NS0='stroke="none"';
    const frame=(w,h,pic)=>[w,h,`<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="2" fill="#1b1b1e"/><rect x="9" y="9" width="${w-18}" height="${h-18}" fill="#E9EEF2"/><g transform="translate(9 9)">${pic}</g>`];
    const astro=(v,up)=>`<g transform="rotate(${up?150:22} 17 29)"><rect x="12.5" y="26" width="9" height="19" rx="4.5" fill="#E4E4E8"/><circle cx="17" cy="46" r="5.4" fill="#C9CCD3"/></g><g transform="rotate(${up?-150:-22} 37 29)"><rect x="32.5" y="26" width="9" height="19" rx="4.5" fill="#E4E4E8"/><circle cx="37" cy="46" r="5.4" fill="#C9CCD3"/></g><rect x="14" y="26" width="26" height="26" rx="7" fill="#F4F4F6"/><rect x="21" y="32" width="12" height="8" rx="2" fill="#C9CCD3"/><rect x="16" y="50" width="9" height="20" rx="4" fill="#F4F4F6"/><rect x="29" y="50" width="9" height="20" rx="4" fill="#F4F4F6"/><rect x="14" y="66" width="13" height="6" rx="3" fill="#C9CCD3"/><rect x="28" y="66" width="13" height="6" rx="3" fill="#C9CCD3"/><circle cx="27" cy="15" r="14" fill="#F4F4F6"/><ellipse cx="27" cy="16" rx="9" ry="8" fill="${v}"/><ellipse cx="24" cy="13" rx="2.5" ry="3.5" fill="rgba(255,255,255,.6)" ${NS0}/>`;
    const owl=(c,c2,inst)=>[56,66,`<ellipse cx="28" cy="42" rx="20" ry="22" fill="${c}"/><ellipse cx="28" cy="48" rx="12" ry="13" fill="${c2}"/><path d="M12 14l6 8M44 14l-6 8" stroke="${c}" stroke-width="5"/><circle cx="19" cy="26" r="10" fill="#F3E3B0"/><circle cx="37" cy="26" r="10" fill="#F3E3B0"/><circle cx="19" cy="26" r="4.5" fill="#2A1608"/><circle cx="37" cy="26" r="4.5" fill="#2A1608"/><path d="M25 31l3 6l3 -6z" fill="#E8A21C"/><path d="M20 63h6M30 63h6" stroke="#8A6A3A" stroke-width="3"/>${inst}`];
    const cushion=(c,r)=>[190,124,`<rect x="10" y="12" width="170" height="100" rx="26" fill="${c}" transform="rotate(${r} 95 62)"/><path d="M32 36Q95 18 158 36" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="3" transform="rotate(${r} 95 62)"/>`];
    const catL=(L,c,d)=>{const P={L:'M16 11V44H35',O:'M25 11C12 11 12 46 25 46C38 46 38 11 25 11Z',V:'M10 11L25 45L40 11',E:'M35 11H16V45H35M16 28H31'}[L],A='fill="none" stroke-linecap="round" stroke-linejoin="round"';
      return[50,60,`<path d="${P}" ${A} stroke="${d}" stroke-width="14" transform="translate(1.8 2.2)"/><path d="${P}" ${A} stroke="${c}" stroke-width="12.5"/><path d="${P}" ${A} stroke="#fff" stroke-opacity=".55" stroke-width="3" transform="translate(-2.6 -2.8)"/><ellipse cx="13" cy="52" rx="9" ry="6" fill="#FBFBFB"/><circle cx="13" cy="41" r="8.5" fill="#FBFBFB"/><path d="M5.5 37l1 -8l6 5zM20.5 37l-1 -8l-6 5z" fill="#FBFBFB"/><circle cx="10" cy="41" r="1.2" fill="#2A1608" ${NS0}/><circle cx="16" cy="41" r="1.2" fill="#2A1608" ${NS0}/><path d="M11.5 44.5q1.5 1.2 3 0" fill="none" stroke="#C8705F" stroke-width="1"/>`]};
    const bottle=(g,l)=>[54,190,`<rect x="20" y="2" width="14" height="14" rx="2" fill="#9A6236"/><rect x="21" y="16" width="12" height="34" fill="${g}"/><path d="M21 50Q8 62 8 82V178Q8 188 18 188H36Q46 188 46 178V82Q46 62 33 50Z" fill="${g}"/><rect x="8" y="92" width="38" height="50" fill="${l}"/><rect x="14" y="104" width="26" height="5" fill="rgba(0,0,0,.45)" ${NS0}/><rect x="16" y="116" width="22" height="2.5" fill="rgba(0,0,0,.3)" ${NS0}/><rect x="12" y="60" width="4" height="26" rx="2" fill="rgba(255,255,255,.3)" ${NS0}/>`];
    const person=(x,c)=>`<rect x="${x}" y="46" width="18" height="42" rx="7" fill="${c}"/><circle cx="${x+9}" cy="38" r="7" fill="#B98A62"/>`;
    const CURIO={
     boomerang:[330,100,`<path d="M8 90Q18 62 62 50Q165 -8 268 50Q312 62 322 90Q300 98 276 76Q165 30 54 76Q30 98 8 90Z" fill="#D9762B"/><path d="M8 90Q18 62 62 50L80 66Q44 80 30 94Q18 96 8 90Z" fill="#1d1a17"/><path d="M322 90Q312 62 268 50L250 66Q286 80 300 94Q312 96 322 90Z" fill="#1d1a17"/><g ${NS0}><ellipse cx="112" cy="44" rx="30" ry="9" transform="rotate(-20 112 44)" fill="#243a33"/><ellipse cx="218" cy="44" rx="30" ry="9" transform="rotate(20 218 44)" fill="#243a33"/><circle cx="165" cy="30" r="12" fill="#1d1a17"/><circle cx="165" cy="30" r="6" fill="#3BCEAC"/><circle cx="165" cy="30" r="2.5" fill="#F4F1EA"/><g fill="#3BCEAC"><circle cx="66" cy="60" r="2.5"/><circle cx="72" cy="68" r="2.5"/><circle cx="60" cy="66" r="2.5"/><circle cx="264" cy="60" r="2.5"/><circle cx="258" cy="68" r="2.5"/><circle cx="270" cy="66" r="2.5"/></g></g>`],
     fan:[284,152,`<defs><clipPath id="lbfan"><path d="M6 142A136 136 0 0 1 278 142Z"/></clipPath></defs><path d="M6 142A136 136 0 0 1 278 142Z" fill="#F4F1EA"/><g clip-path="url(#lbfan)" ${NS0} opacity=".8"><circle cx="70" cy="84" r="22" fill="#5B8FD9"/><circle cx="112" cy="46" r="19" fill="#9B7FD1"/><circle cx="164" cy="40" r="23" fill="#6FA8DC"/><circle cx="210" cy="78" r="21" fill="#5B6FD9"/><circle cx="142" cy="92" r="14" fill="#C58BD1"/><circle cx="240" cy="116" r="15" fill="#6FA8DC"/><circle cx="42" cy="120" r="14" fill="#9B7FD1"/></g><path d="M142 142L20 86M142 142L52 40M142 142L98 14M142 142L142 6M142 142L186 14M142 142L232 40M142 142L264 86" stroke="rgba(30,15,5,.25)"/><path d="M98 142A44 44 0 0 1 186 142Z" fill="#E3C98F"/>`],
     duck:[92,182,`<path d="M26 148h16v20h10v10H26zM46 148h16v20h10v10H46z" fill="#7CC04E"/><g fill="#fff" ${NS0}><circle cx="32" cy="156" r="2.5"/><circle cx="36" cy="166" r="2.5"/><circle cx="52" cy="156" r="2.5"/><circle cx="56" cy="166" r="2.5"/><circle cx="46" cy="174" r="2"/><circle cx="66" cy="174" r="2"/></g><ellipse cx="44" cy="104" rx="27" ry="52" fill="#C9A268"/><path d="M30 66Q24 30 46 22Q62 18 66 34L90 20Q92 30 68 48Q58 60 58 74Z" fill="#D6B37A"/><circle cx="56" cy="34" r="3" fill="#1b1b1e"/><path d="M38 60Q30 76 26 92" fill="none" stroke="#F4F1EA" stroke-width="1.5"/><ellipse cx="22" cy="104" rx="11" ry="15" fill="#FBFBF8"/>`],
     catL:catL('L','#E8705F','#A8483A'),catO:catL('O','#3F8FD6','#27598F'),catV:catL('V','#F2A0B4','#C0708A'),catE:catL('E','#A99AD6','#7565AE'),
     astroUp:[54,74,astro('#C9CCD3',true)],
     astroGold:[68,92,`<g transform="scale(1.25)">${astro('#E3B23C',false)}</g>`],
     astroMoon:[62,96,`<ellipse cx="31" cy="92" rx="26" ry="4" fill="#1b1b1e"/><circle cx="31" cy="70" r="20" fill="#9AA0AA"/><circle cx="24" cy="66" r="4" fill="#858B95" ${NS0}/><circle cx="38" cy="76" r="3" fill="#858B95" ${NS0}/><g transform="translate(10 4) scale(.78)">${astro('#C9CCD3',true)}</g>`],
     moonReader:[72,86,`<ellipse cx="36" cy="82" rx="22" ry="4" fill="#2A2A2E"/><path d="M24 8A37 37 0 1 0 64 64A46 46 0 0 1 24 8Z" fill="#E4E6EC"/><circle cx="20" cy="44" r="3" fill="#C9CCD6" ${NS0}/><circle cx="30" cy="66" r="2.2" fill="#C9CCD6" ${NS0}/><g transform="translate(27 27) scale(.6)">${astro('#E3B23C',false)}</g><rect x="36" y="49" width="14" height="10" fill="#8A8F9A"/>`],
     xmasOwl:[72,88,`<ellipse cx="36" cy="80" rx="32" ry="7" fill="#7A5A3A"/><ellipse cx="36" cy="76" rx="30" ry="6" fill="#E6D2A8"/><ellipse cx="36" cy="50" rx="22" ry="26" fill="#2F8F4E"/><ellipse cx="36" cy="58" rx="13" ry="16" fill="#C9C2B8"/><circle cx="28" cy="38" r="8" fill="#fff"/><circle cx="44" cy="38" r="8" fill="#fff"/><circle cx="29" cy="38" r="3" fill="#1b1b1e"/><circle cx="43" cy="38" r="3" fill="#1b1b1e"/><path d="M33 44l3 6l3 -6z" fill="#F0872B"/><path d="M14 56Q36 68 58 56L60 64Q36 76 12 64Z" fill="#D8333B"/><path d="M18 30Q36 2 56 26Z" fill="#D8333B"/><path d="M16 30Q36 22 58 28" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="24" r="5" fill="#fff"/>`],
     penguin:[58,64,`<ellipse cx="29" cy="58" rx="26" ry="5" fill="#7A5A3A"/><ellipse cx="29" cy="55" rx="24" ry="4" fill="#E6D2A8"/><ellipse cx="29" cy="38" rx="13" ry="16" fill="#1b1b1e"/><ellipse cx="29" cy="42" rx="8" ry="11" fill="#fff"/><circle cx="25" cy="30" r="2" fill="#fff" ${NS0}/><circle cx="33" cy="30" r="2" fill="#fff" ${NS0}/><path d="M27 34l2 3l2 -3z" fill="#F0872B"/><path d="M17 26Q29 4 41 26Z" fill="#3A7FE0"/><circle cx="29" cy="10" r="4" fill="#3A7FE0"/><path d="M16 44Q29 50 42 44" fill="none" stroke="#3A7FE0" stroke-width="5" stroke-linecap="round"/><path d="M22 54h6M30 54h6" stroke="#F0872B" stroke-width="3"/>`],
     vase:[34,48,`<path d="M8 22Q2 34 8 44H26Q32 34 26 22Z" fill="#5A5A3A"/><path d="M17 22L10 8M17 22L17 4M17 22L24 8" stroke="#3F7A4A" stroke-width="3" stroke-linecap="round"/><ellipse cx="17" cy="22" rx="9" ry="3" fill="#3A3A28"/>`],
     print:[130,100,`<rect x="1" y="1" width="128" height="98" fill="#FBFBF8"/><rect x="7" y="7" width="116" height="86" fill="#A9825A"/><rect x="7" y="7" width="116" height="34" fill="#7A5A3A" ${NS0}/>${person(24,'#2F4F9A')}${person(48,'#E8B7C4')}${person(74,'#25252B')}${person(98,'#6E8A5A')}`],
     calendar:[150,74,`<rect x="6" y="14" width="84" height="44" fill="#F2D21C"/><rect x="2" y="56" width="146" height="16" rx="3" fill="#F2D21C"/><rect x="10" y="16" width="36" height="28" fill="#5FAE3A"/><rect x="50" y="16" width="36" height="28" fill="#5FAE3A"/><rect x="10" y="46" width="76" height="10" fill="#5FAE3A"/><g font-family="Georgia,serif" font-weight="700" fill="#1b1b1e" text-anchor="middle" ${NS0}><text x="28" y="39" font-size="24" textLength="14" lengthAdjust="spacingAndGlyphs">1</text><text x="68" y="39" font-size="24" textLength="14" lengthAdjust="spacingAndGlyphs">9</text><text x="48" y="54.5" font-size="8" textLength="62" lengthAdjust="spacingAndGlyphs">SEPTEMBER</text></g><ellipse cx="120" cy="38" rx="22" ry="24" fill="#F2D21C"/><circle cx="110" cy="26" r="11" fill="#5FC8A0"/><circle cx="130" cy="26" r="11" fill="#5FC8A0"/><circle cx="110" cy="26" r="6" fill="#fff"/><circle cx="130" cy="26" r="6" fill="#fff"/><circle cx="110" cy="26" r="2.5" fill="#1b1b1e"/><circle cx="130" cy="26" r="2.5" fill="#1b1b1e"/><path d="M117 32l3 6l3 -6z" fill="#3A9AD0"/><g ${NS0}><circle cx="108" cy="48" r="3" fill="#D8433B"/><circle cx="120" cy="52" r="3" fill="#3A6FD0"/><circle cx="132" cy="48" r="3" fill="#D8433B"/><circle cx="20" cy="64" r="2.5" fill="#D8433B"/><circle cx="50" cy="64" r="2.5" fill="#3A6FD0"/><circle cx="80" cy="64" r="2.5" fill="#D8433B"/><circle cx="110" cy="64" r="2.5" fill="#3A6FD0"/><circle cx="138" cy="64" r="2.5" fill="#D8433B"/></g>`],
     pyramid:[72,60,`<path d="M36 4L68 56H4Z" fill="#E6D6A8"/><path d="M36 4L46 56H4Z" fill="#F1E4BE" ${NS0}/><path d="M14 44H58M22 32H52M29 20H44" stroke="#C9B682"/>`],
     rose:[84,72,`<ellipse cx="42" cy="40" rx="30" ry="26" fill="#B79A6A"/><ellipse cx="28" cy="28" rx="18" ry="8" transform="rotate(-30 28 28)" fill="#C9AD7C"/><ellipse cx="56" cy="26" rx="18" ry="8" transform="rotate(25 56 26)" fill="#A88A5A"/><ellipse cx="42" cy="44" rx="22" ry="8" transform="rotate(-8 42 44)" fill="#C9AD7C"/><ellipse cx="30" cy="54" rx="16" ry="7" transform="rotate(30 30 54)" fill="#A88A5A"/><ellipse cx="58" cy="52" rx="16" ry="7" transform="rotate(-35 58 52)" fill="#D4BA8A"/>`],
     dog:[82,88,`<ellipse cx="41" cy="64" rx="26" ry="20" fill="#F4EFE6"/><path d="M18 60Q22 46 40 48Q30 66 18 60Z" fill="#B5652B"/><ellipse cx="24" cy="80" rx="10" ry="6" fill="#F4EFE6"/><ellipse cx="58" cy="80" rx="10" ry="6" fill="#F4EFE6"/><path d="M20 20l4 -16l12 10zM62 20l-4 -16l-12 10z" fill="#B5652B"/><circle cx="41" cy="30" r="24" fill="#B5652B"/><ellipse cx="41" cy="38" rx="16" ry="14" fill="#F4EFE6"/><circle cx="32" cy="28" r="3.2" fill="#1b1b1e"/><circle cx="50" cy="28" r="3.2" fill="#1b1b1e"/><ellipse cx="41" cy="36" rx="4" ry="3" fill="#1b1b1e"/><path d="M26 52Q41 60 56 52" fill="none" stroke="#C8281E" stroke-width="4"/>`],
     owlCello:owl('#6E7178','#9AA0A8','<ellipse cx="14" cy="50" rx="8" ry="11" fill="#C8551E"/><rect x="12.5" y="26" width="3" height="16" fill="#3A2412"/><path d="M4 44L26 54" stroke="#3A2412" stroke-width="1.5"/>'),
     owlViolin:owl('#6B4226','#E6CF9A','<ellipse cx="38" cy="44" rx="8" ry="5" fill="#B5492A" transform="rotate(-25 38 44)"/><path d="M30 50L50 36" stroke="#3A2412" stroke-width="1.5"/>'),
     owlFlute:owl('#B9B6AC','#F4F2EC','<path d="M22 38H52" stroke="#C9A227" stroke-width="3" stroke-linecap="round"/>'),
     frameDog:frame(70,95,'<rect width="52" height="77" fill="#CFE0EA"/><path d="M0 62h52v15H0z" fill="#B7A58C"/><ellipse cx="30" cy="52" rx="18" ry="16" fill="#C9A268"/><circle cx="34" cy="38" r="11" fill="#D8B57C"/>'),
     frameCat:frame(70,95,'<rect width="52" height="77" fill="#F1EFEA"/><path d="M0 66h52v11H0z" fill="#3a2a22"/><rect x="26" y="26" width="20" height="40" rx="8" fill="#C8281E"/><circle cx="36" cy="20" r="8" fill="#B98A62"/><ellipse cx="14" cy="50" rx="9" ry="16" fill="#E8E2D6"/><path d="M8 36l3 -8l4 7zM20 36l-3 -8l-4 7z" fill="#C98A3A"/>'),
     framePal:frame(70,95,'<rect width="52" height="77" fill="#DDE3E8"/><rect x="6" y="30" width="22" height="40" rx="8" fill="#2B2B33"/><circle cx="17" cy="22" r="8" fill="#B98A62"/><ellipse cx="38" cy="54" rx="11" ry="14" fill="#E8D9B8"/>'),
     bridge:[170,118,`<rect x="1" y="6" width="168" height="111" rx="3" fill="#4A4A8A"/><path d="M130 6h39v24z" fill="#E3B23C"/><rect x="34" y="24" width="124" height="80" fill="#0E1626"/><path d="M34 80Q96 66 158 82V104H34Z" fill="#1E3350" ${NS0}/><g ${NS0}><g fill="#C9CCD3"><rect x="45" y="76" width="10" height="16" rx="3"/><rect x="59" y="76" width="10" height="16" rx="3"/><rect x="73" y="76" width="10" height="16" rx="3"/><rect x="87" y="76" width="10" height="16" rx="3"/><rect x="101" y="76" width="10" height="16" rx="3"/><rect x="115" y="76" width="10" height="16" rx="3"/><rect x="129" y="76" width="10" height="16" rx="3"/></g><g fill="#7FB7E6"><circle cx="50" cy="72" r="5"/><circle cx="64" cy="72" r="5"/><circle cx="78" cy="72" r="5"/><circle cx="92" cy="72" r="5"/><circle cx="106" cy="72" r="5"/><circle cx="120" cy="72" r="5"/><circle cx="134" cy="72" r="5"/></g><rect x="10" y="30" width="12" height="60" fill="#C9B27A" opacity=".8"/></g>`],
     card:[92,122,`<g transform="rotate(-3 46 61)"><rect x="2" y="2" width="88" height="118" fill="#F6F4EE"/><g fill="none" stroke="#C8281E" stroke-linecap="round"><ellipse cx="46" cy="58" rx="13" ry="7" fill="#C8281E" stroke="none" transform="rotate(-15 46 58)"/><path d="M36 62L28 76M42 64L40 78M52 60L60 72M56 56L68 62M56 52L62 40" stroke-width="2.5"/><circle cx="64" cy="38" r="4" fill="#C8281E" stroke="none"/><path d="M64 34l-4 -10M64 34l4 -10M61 28l-4 -2M67 28l4 -2" stroke-width="1.5"/><path d="M26 96H66" opacity=".6"/></g></g>`],
     shotGlass:[40,80,`<path d="M5 4H35L32 76Q20 80 8 76Z" fill="#F4F4F2"/><circle cx="20" cy="38" r="11" fill="#2F8F8A"/><circle cx="20" cy="38" r="8" fill="#F2A23C"/><path d="M12 40h16" stroke="#2A2A33" stroke-width="3"/><circle cx="12" cy="64" r="2" fill="#3A6FD0" ${NS0}/><circle cx="26" cy="12" r="1.6" fill="#3A6FD0" ${NS0}/>`],
     cup:[52,48,`<path d="M4 4H48V34Q48 46 36 46H16Q4 46 4 34Z" fill="#2A4FB8"/><path d="M4 30l6 -4l5 5l6 -7l6 6l7 -5l6 6l8 -4V34Q48 46 36 46H16Q4 46 4 34Z" fill="#101018"/><ellipse cx="26" cy="5" rx="22" ry="4" fill="#0B0B12"/>`],
     watercolour:[86,86,`<rect x="1" y="1" width="84" height="84" fill="#6B5648"/><rect x="16" y="20" width="54" height="44" fill="#F3EFE6"/><path d="M16 30Q40 18 70 28V20H16Z" fill="#9CC4E4" ${NS0}/><path d="M16 58h54v6H16z" fill="#C9B27A" ${NS0}/><path d="M20 58V40Q28 30 36 40V58M40 58V36Q50 24 60 36V58" fill="none" stroke="#C97A8A" stroke-width="3"/>`],
     rafting:[150,112,`<rect width="150" height="112" fill="#8A6A3E"/><rect width="150" height="30" fill="#4F7A3E"/><path d="M0 30Q40 22 75 30T150 28V40H0Z" fill="#9A8A6A" ${NS0}/><path d="M14 84Q16 66 40 66H120Q140 66 142 84Q140 96 120 96H36Q16 96 14 84Z" fill="#2A6FD8"/><g fill="#F0652B"><rect x="34" y="52" width="14" height="18" rx="4"/><rect x="58" y="50" width="14" height="18" rx="4"/><rect x="84" y="50" width="14" height="18" rx="4"/><rect x="108" y="52" width="14" height="18" rx="4"/></g><g fill="#B98A62"><circle cx="41" cy="46" r="6"/><circle cx="65" cy="44" r="6"/><circle cx="91" cy="44" r="6"/><circle cx="115" cy="46" r="6"/></g><path d="M52 40L46 70M100 38L106 72" stroke="#E8E2D0" stroke-width="2.5"/>`],
     jar:[38,82,`<rect x="12" y="2" width="14" height="8" rx="2" fill="#B89A6A"/><path d="M10 10H28Q34 18 34 28V74Q34 80 28 80H10Q4 80 4 74V28Q4 18 10 10Z" fill="#9AA79E"/><path d="M8 44Q20 36 30 46" fill="none" stroke="#6E7C74" stroke-width="2"/><rect x="8" y="22" width="3" height="20" rx="1.5" fill="rgba(255,255,255,.4)" ${NS0}/>`],
     plateLA:[96,96,`<circle cx="48" cy="48" r="46" fill="#6FB1E4"/><path d="M6 52L26 34L40 46L56 30L74 44L90 38V60H6Z" fill="#F4F6FA"/><g fill="#4B6C93"><rect x="20" y="44" width="10" height="34"/><rect x="34" y="34" width="11" height="44"/><rect x="48" y="40" width="10" height="38"/><rect x="62" y="48" width="12" height="30"/></g><path d="M8 66Q48 96 88 66Q70 92 48 93Q24 92 8 66Z" fill="#3E5F3A"/><text x="48" y="78" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="10" fill="#F2C400" textLength="54" lengthAdjust="spacingAndGlyphs" ${NS0}>Los Angeles</text>`],
     plateGoa:[96,96,`<circle cx="48" cy="48" r="46" fill="#F1E9D2"/><path d="M6 56Q30 44 52 56T90 52V70H6Z" fill="#4FA6D8"/><circle cx="52" cy="30" r="7" fill="#D8433B"/><path d="M70 70V28" stroke="#5A3A1E" stroke-width="3"/><path d="M70 28Q56 22 50 30M70 28Q84 20 90 30M70 28Q62 14 54 16M70 28Q80 14 88 18" fill="none" stroke="#2F7D3F" stroke-width="4" stroke-linecap="round"/><ellipse cx="34" cy="64" rx="12" ry="9" fill="#3F6FB5"/><circle cx="36" cy="50" r="6" fill="#C98A5A"/><path d="M28 46h16l-8 -6z" fill="#F2C400"/><ellipse cx="44" cy="66" rx="9" ry="6" fill="#E3B23C"/><path d="M50 62L64 54" stroke="#5A3A1E" stroke-width="2"/><text x="40" y="88" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="13" fill="#2A1608" ${NS0}>Goa</text>`],
     cairns:[110,90,`<path d="M6 80Q10 66 40 68Q80 62 104 72Q106 84 80 86Q30 90 6 80Z" fill="#8A6A4A"/><rect x="64" y="34" width="5" height="40" fill="#3A2A1E"/><path d="M50 38H86L92 44L86 50H50Z" fill="#E8D9B0"/><text x="69" y="47.5" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="8" fill="#2A1608" textLength="26" lengthAdjust="spacingAndGlyphs" ${NS0}>Cairns</text><circle cx="66" cy="16" r="4" fill="#9AA0A8"/><circle cx="82" cy="16" r="4" fill="#9AA0A8"/><circle cx="74" cy="22" r="8" fill="#9AA0A8"/><ellipse cx="74" cy="24" rx="2" ry="3" fill="#2A1608"/><ellipse cx="58" cy="26" rx="5" ry="8" fill="#F4F4F0"/><path d="M56 18l-8 -4l6 6z" fill="#F2C400"/><path d="M34 76Q30 56 38 48L36 40L42 46Q48 58 44 76Z" fill="#B5552B"/><circle cx="22" cy="62" r="6" fill="#2F8F6A"/><path d="M16 62l-6 2l6 2z" fill="#E8A21C"/><ellipse cx="24" cy="72" rx="7" ry="5" fill="#2F8F6A"/><ellipse cx="76" cy="76" rx="10" ry="6" fill="#E3C23C"/><circle cx="66" cy="78" r="3" fill="#C9A227"/><ellipse cx="94" cy="64" rx="10" ry="7" fill="#F0772B"/><path d="M90 58v12M97 58v12" stroke="#fff" stroke-width="2.5"/>`],
     archer:[120,205,`<path d="M18 30l10 34M24 28l10 34M30 26l8 34" stroke="#D9C48A" stroke-width="3"/><rect x="20" y="52" width="20" height="34" rx="4" fill="#2A2A2E" transform="rotate(-20 30 70)"/><path d="M42 178h12v18H36v-6zM66 178h12v12l6 6H66z" fill="#1b1b1e"/><path d="M40 96Q30 150 22 178H98Q90 150 80 96Z" fill="#F1EEE6"/><path d="M24 172H96" stroke="#2A2A2E" stroke-width="2" stroke-dasharray="4 3"/><rect x="42" y="68" width="36" height="34" rx="8" fill="#E9E6DE"/><rect x="40" y="96" width="40" height="7" fill="#C8281E"/><path d="M50 56Q46 80 50 100M70 56Q74 80 70 100" fill="none" stroke="#1b1b1e" stroke-width="4"/><path d="M100 30Q122 66 100 104" fill="none" stroke="#E3A81C" stroke-width="4"/><path d="M100 30V104" stroke="#2A1608"/><path d="M60 68H112" stroke="#D9C48A" stroke-width="2"/><path d="M70 76L104 66" stroke="#2A2A2E" stroke-width="8" stroke-linecap="round"/><path d="M50 76L78 70" stroke="#E9E6DE" stroke-width="8" stroke-linecap="round"/><circle cx="60" cy="50" r="13" fill="#F2DCC0"/><path d="M44 44Q60 -8 76 44Z" fill="#F4F2EC"/><rect x="44" y="40" width="32" height="8" fill="#C8281E"/><path d="M46 44h28" stroke="#2F8F6A" stroke-width="2" stroke-dasharray="3 3"/>`],
     bowl:[80,44,`<rect x="30" y="38" width="20" height="5" rx="2" fill="#1F3F7A"/><path d="M4 6H76Q72 40 40 40Q8 40 4 6Z" fill="#1F3F7A"/><ellipse cx="40" cy="7" rx="36" ry="6" fill="#F3EDDC"/><g ${NS0}><circle cx="18" cy="18" r="3.5" fill="#D8433B"/><circle cx="32" cy="26" r="3.5" fill="#F2C400"/><circle cx="48" cy="26" r="3.5" fill="#3BCEAC"/><circle cx="62" cy="18" r="3.5" fill="#D8433B"/><circle cx="40" cy="16" r="3" fill="#F4F4F0"/><circle cx="28" cy="7" r="2" fill="#D8433B"/><circle cx="52" cy="7" r="2" fill="#2F6FD0"/></g>`],
     bottleAmber:bottle('#7A4A1E','#F0922B'),bottleBlue:bottle('#1A1A2A','#8E8EE0'),
     ribbon:[130,70,`<path d="M10 60Q0 20 40 30Q70 40 50 56Q30 66 60 50Q90 30 104 44" fill="none" stroke="#D83B8A" stroke-width="6" stroke-linecap="round"/><path d="M100 40h14l6 26H94z" fill="#D8433B"/><circle cx="108" cy="34" r="7" fill="#F2DCC0"/><path d="M101 32Q108 22 115 32Z" fill="#1b1b1e"/><circle cx="110" cy="52" r="4" fill="#E3B23C"/>`],
     hippo:[150,175,`<ellipse cx="40" cy="162" rx="20" ry="11" fill="#F29AAE"/><ellipse cx="110" cy="162" rx="20" ry="11" fill="#F29AAE"/><ellipse cx="75" cy="118" rx="52" ry="50" fill="#F4A9B8"/><ellipse cx="26" cy="112" rx="13" ry="22" fill="#F29AAE" transform="rotate(18 26 112)"/><ellipse cx="124" cy="112" rx="13" ry="22" fill="#F29AAE" transform="rotate(-18 124 112)"/><circle cx="38" cy="18" r="10" fill="#F29AAE"/><circle cx="112" cy="18" r="10" fill="#F29AAE"/><ellipse cx="75" cy="52" rx="50" ry="38" fill="#F7B6C4"/><ellipse cx="75" cy="64" rx="38" ry="22" fill="#F9C6D1"/><ellipse cx="62" cy="58" rx="3" ry="5" fill="#B8566E"/><ellipse cx="88" cy="58" rx="3" ry="5" fill="#B8566E"/><circle cx="56" cy="34" r="3.5" fill="#2A1608"/><circle cx="94" cy="34" r="3.5" fill="#2A1608"/><path d="M40 86Q75 104 110 86L112 98Q75 116 38 98Z" fill="#6FA8DC"/><path d="M70 100l-6 40h16l-2 -40z" fill="#9B7FD1"/><path d="M66 112h14M65 124h15" stroke="#F29AC4" stroke-width="4"/>`],
     tiger:[150,190,`<path d="M116 152Q148 142 140 110Q136 98 144 90" fill="none" stroke="#F0872B" stroke-width="12" stroke-linecap="round"/><path d="M132 140l12 -4M143 120l-12 2M137 100l10 3" stroke="#2A1608" stroke-width="4" stroke-linecap="round"/><ellipse cx="46" cy="178" rx="20" ry="10" fill="#F0872B"/><ellipse cx="104" cy="178" rx="20" ry="10" fill="#F0872B"/><ellipse cx="75" cy="130" rx="46" ry="52" fill="#F0872B"/><ellipse cx="75" cy="142" rx="26" ry="34" fill="#F7E3B8"/><path d="M40 110l14 6M38 130l14 2M110 110l-14 6M112 130l-14 2" stroke="#2A1608" stroke-width="4" stroke-linecap="round"/><ellipse cx="32" cy="124" rx="13" ry="26" fill="#F0872B" transform="rotate(20 32 124)"/><ellipse cx="118" cy="124" rx="13" ry="26" fill="#F0872B" transform="rotate(-20 118 124)"/><circle cx="25" cy="146" r="10" fill="#F7E3B8"/><circle cx="125" cy="146" r="10" fill="#F7E3B8"/><path d="M24 114l13 4M22 126l12 2M126 114l-13 4M128 126l-12 2" stroke="#2A1608" stroke-width="3.5" stroke-linecap="round"/><circle cx="40" cy="22" r="13" fill="#F0872B"/><circle cx="110" cy="22" r="13" fill="#F0872B"/><ellipse cx="75" cy="56" rx="44" ry="40" fill="#F0872B"/><ellipse cx="75" cy="70" rx="28" ry="20" fill="#F7E3B8"/><ellipse cx="75" cy="60" rx="8" ry="6" fill="#E88AA0"/><circle cx="58" cy="46" r="4" fill="#2A1608"/><circle cx="92" cy="46" r="4" fill="#2A1608"/><path d="M62 24l4 10M75 20v12M88 24l-4 10" stroke="#2A1608" stroke-width="4" stroke-linecap="round"/><path d="M64 74Q75 84 86 74" fill="none" stroke="#2A1608" stroke-width="2"/>`],
     cushionYellow:cushion('#D8C21C',-12),cushionTeal:cushion('#2F8F96',14),cushionRed:cushion('#C8281E',-6),
     camera:[64,72,`<rect x="14" y="56" width="36" height="14" rx="5" fill="#EDEDED"/><circle cx="32" cy="34" r="28" fill="#F6F6F6"/><ellipse cx="32" cy="36" rx="18" ry="16" fill="#15151B"/><circle cx="25" cy="34" r="4" fill="#4F8FE8" ${NS0}/><circle cx="39" cy="34" r="4" fill="#4F8FE8" ${NS0}/>`],
     teddy:[364,212,`<ellipse cx="190" cy="124" rx="120" ry="80" fill="#C98A2E"/><circle cx="196" cy="26" r="22" fill="#C98A2E"/><circle cx="292" cy="32" r="22" fill="#C98A2E"/><circle cx="240" cy="72" r="62" fill="#D0943A"/><ellipse cx="246" cy="94" rx="30" ry="24" fill="#E8B878"/><ellipse cx="246" cy="84" rx="10" ry="7" fill="#5A3A1E"/><circle cx="222" cy="64" r="5" fill="#2A1608"/><circle cx="268" cy="64" r="5" fill="#2A1608"/><path d="M150 98l60 30l-10 22l-60 -30z" fill="#F4F1EA"/><path d="M160 108l8 -16M176 116l8 -16M192 124l8 -16" stroke="#C9C2B0" stroke-width="5"/><ellipse cx="70" cy="152" rx="52" ry="56" fill="#D0943A"/><ellipse cx="70" cy="158" rx="30" ry="34" fill="#F0B878"/><ellipse cx="70" cy="162" rx="12" ry="16" fill="#7A4A1E"/><ellipse cx="322" cy="154" rx="40" ry="52" fill="#D0943A"/><ellipse cx="322" cy="160" rx="22" ry="32" fill="#F0B878"/><ellipse cx="322" cy="164" rx="9" ry="14" fill="#7A4A1E"/>`],
     basket:[84,104,`<path d="M22 30Q42 -10 62 30" fill="none" stroke="#C9B27A" stroke-width="6"/><rect x="10" y="28" width="64" height="74" rx="14" fill="#D9C48A"/><path d="M10 44H74M10 60H74M10 76H74M10 90H74M26 28V102M42 28V102M58 28V102" stroke="#A88F5A" stroke-width="2"/><rect x="30" y="52" width="24" height="26" fill="#F2D21C"/><rect x="30" y="52" width="24" height="8" fill="#2F8F4E" ${NS0}/>`],
     mazeBall:[132,124,`<rect x="50" y="112" width="32" height="10" rx="4" fill="#2A2A2E"/><circle cx="66" cy="60" r="56" fill="#DCEAF2" fill-opacity=".55"/><path d="M10 60A56 56 0 0 0 122 60Z" fill="#E8B81C"/><ellipse cx="66" cy="60" rx="60" ry="12" fill="#2A7FD8"/><ellipse cx="66" cy="58" rx="50" ry="8" fill="#DCEAF2"/><path d="M36 40Q66 10 96 40M50 46Q66 28 82 46" fill="none" stroke="#fff" stroke-width="4"/>`]};
    /* Redrawn from the shelf photos: the real colours and details of each piece */
    {const R2=rng(4242),f1=n=>n.toFixed(1);
      let bd='';for(let i=0;i<420;i++)bd+=`<circle cx="${f1(20+R2()*290)}" cy="${f1(8+R2()*84)}" r="${f1(1.1+R2()*.9)}" fill="${R2()<.6?'#F6DFAE':'#B8381E'}"/>`;
      const roo=`<g fill="#1F2E2A" stroke="#F0C078" stroke-width="1"><path d="M88 58Q72 62 60 76Q76 72 92 63Z"/><path d="M100 58L108 69H119L118 65L111 64L107 55Z"/><ellipse cx="104" cy="52" rx="21" ry="9.5" transform="rotate(-22 104 52)"/><path d="M117 45Q126 41 131 36L126 33Q120 37 113 41Z"/><path d="M120 47L124 56L127.5 55L124.5 46Z"/><ellipse cx="133" cy="33" rx="8.5" ry="5" transform="rotate(-25 133 33)"/><path d="M133 29l2 -8l3.5 7zM128 30.5l-.5 -8l4.5 6z"/></g><path d="M92 55Q104 50 116 44M96 59Q104 55 110 53" fill="none" stroke="#3E8F7A" stroke-width="1.2" stroke-dasharray="1.5 2.5"/>`;
      let ring='';for(let i=0;i<10;i++){const a=i*Math.PI/5;ring+=`<circle cx="${f1(165+9.5*Math.cos(a))}" cy="${f1(30+9.5*Math.sin(a))}" r="1.7" fill="#F6DFAE"/>`}
      const endDots=x=>{let s='';for(let r=0;r<2;r++)for(let i=0;i<5;i++)s+=`<circle cx="${f1(x+i*5-r*3)}" cy="${f1(62+i*4+r*8)}" r="1.8" fill="#34C7A5"/>`;return s};
      CURIO.boomerang=[330,100,`<defs><clipPath id="lbbm"><path d="M8 90Q18 62 62 50Q165 -8 268 50Q312 62 322 90Q300 98 276 76Q165 30 54 76Q30 98 8 90Z"/></clipPath></defs><path d="M8 90Q18 62 62 50Q165 -8 268 50Q312 62 322 90Q300 98 276 76Q165 30 54 76Q30 98 8 90Z" fill="#D8702A"/><g clip-path="url(#lbbm)" ${NS0}>${bd}<path d="M0 100Q10 60 62 50L82 68Q46 82 30 100Z" fill="#17140F"/><path d="M330 100Q320 60 268 50L248 68Q284 82 300 100Z" fill="#17140F"/>${endDots(38)}<g transform="translate(330 0) scale(-1 1)">${endDots(38)}</g><path d="M66 52L84 70M71 50L89 68" stroke="#F6DFAE" stroke-width="1.2"/><path d="M264 52L246 70M259 50L241 68" stroke="#F6DFAE" stroke-width="1.2"/></g><g ${NS0}>${roo}<g transform="translate(330 0) scale(-1 1)">${roo}</g><circle cx="165" cy="30" r="13.5" fill="#17140F"/>${ring}<circle cx="165" cy="30" r="5.5" fill="#2FA98F"/><circle cx="165" cy="30" r="2.2" fill="#F6DFAE"/></g>`];
      let pl='';for(let i=0;i<14;i++){const a0=Math.PI*(1+i/14),a1=Math.PI*(1+(i+1)/14);if(i%2)pl+=`<path d="M142 142L${f1(142+136*Math.cos(a0))} ${f1(142+136*Math.sin(a0))}A136 136 0 0 1 ${f1(142+136*Math.cos(a1))} ${f1(142+136*Math.sin(a1))}Z" fill="rgba(60,50,30,.07)"/>`}
      let ribs='',holes='';for(let i=0;i<=14;i++){const a=Math.PI*(1+i/14);ribs+=`<path d="M142 142L${f1(142+64*Math.cos(a))} ${f1(142+64*Math.sin(a))}" stroke="#B89A5A" stroke-width="1"/>`;if(i<14){const m=Math.PI*(1+(i+.5)/14);holes+=`<circle cx="${f1(142+46*Math.cos(m))}" cy="${f1(142+46*Math.sin(m))}" r="1.6" fill="#8A6A3A"/><circle cx="${f1(142+34*Math.cos(m))}" cy="${f1(142+34*Math.sin(m))}" r="1.1" fill="#8A6A3A"/>`}}
      const blob=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".62"/><circle cx="${x-r*.2}" cy="${y-r*.15}" r="${r*.62}" fill="${c}" opacity=".35"/>`;
      CURIO.fan=[284,152,`<defs><clipPath id="lbfan"><path d="M6 142A136 136 0 0 1 278 142Z"/></clipPath></defs><path d="M6 142A136 136 0 0 1 278 142Z" fill="#F6F2E8"/><g clip-path="url(#lbfan)" ${NS0}>${blob(66,88,24,'#4F86D8')}${blob(108,48,20,'#9A7BD0')}${blob(160,40,25,'#63A2DE')}${blob(212,74,23,'#5567D4')}${blob(140,88,15,'#D18AC8')}${blob(244,116,17,'#5FB3D8')}${blob(40,122,15,'#8E78CE')}${blob(186,100,13,'#E59AB8')}${blob(96,112,12,'#58B8C8')}${pl}</g><path d="M78 142A64 64 0 0 1 206 142Z" fill="#E8D4A0"/><g ${NS0}>${ribs}${holes}</g><path d="M6 142H24M260 142H278" stroke="#B89A5A" stroke-width="3"/><circle cx="142" cy="140" r="4" fill="#8A6A3A"/>`];
      let grain='';for(let i=0;i<46;i++){const x=24+R2()*40,y=62+R2()*84;grain+=`<path d="M${f1(x)} ${f1(y)}v${f1(2+R2()*4)}" stroke="#A27C48" stroke-width=".8"/>`}
      CURIO.duck=[96,184,`<path d="M26 150h16v20h10v10H26zM48 150h16v20h10v10H48z" fill="#86C456"/><g fill="#fff" ${NS0}><circle cx="32" cy="158" r="2.6"/><circle cx="37" cy="168" r="2.6"/><circle cx="54" cy="158" r="2.6"/><circle cx="59" cy="168" r="2.6"/><circle cx="46" cy="176" r="2"/><circle cx="68" cy="176" r="2"/><circle cx="30" cy="174" r="2"/></g><path d="M20 152Q12 100 32 62Q38 48 50 48Q62 50 64 64Q76 104 70 152Z" fill="#CBA56A"/><path d="M56 60Q72 104 66 152H70Q76 104 64 64Z" fill="rgba(90,55,20,.22)" ${NS0}/><g ${NS0}>${grain}</g><circle cx="50" cy="38" r="17" fill="#D3AE74"/><path d="M58 24L90 8Q96 16 90 24L64 44Q56 36 58 24Z" fill="#DDBB84"/><path d="M62 30L88 14" stroke="#B08A54" stroke-width="1"/><circle cx="54" cy="32" r="3" fill="#15110C"/><path d="M36 54Q52 62 64 56" fill="none" stroke="#F4EFE2" stroke-width="2"/><path d="M40 58L26 84" stroke="#F4EFE2" stroke-width="1.4"/><ellipse cx="22" cy="100" rx="12" ry="17" fill="#FBFAF4" transform="rotate(12 22 100)"/><path d="M16 96H28M17 102H26" stroke="#3A4F9A" stroke-width="1.6" transform="rotate(12 22 100)"/>`];
      const owlB=(body,dark,chest,iris,extra)=>[60,72,`<path d="M10 16L18 28M50 16L42 28" stroke="${dark}" stroke-width="6" stroke-linecap="round"/><ellipse cx="30" cy="46" rx="22" ry="24" fill="${body}"/><path d="M8 46Q4 60 14 66Q12 54 14 44ZM52 46Q56 60 46 66Q48 54 46 44Z" fill="${dark}"/><ellipse cx="30" cy="52" rx="13" ry="15" fill="${chest}"/><circle cx="20" cy="29" r="11" fill="#F3E4BC"/><circle cx="40" cy="29" r="11" fill="#F3E4BC"/><circle cx="20" cy="29" r="6" fill="${iris}"/><circle cx="40" cy="29" r="6" fill="${iris}"/><circle cx="20" cy="29" r="3" fill="#15110C"/><circle cx="40" cy="29" r="3" fill="#15110C"/><circle cx="21.5" cy="27.5" r="1" fill="#fff" ${NS0}/><circle cx="41.5" cy="27.5" r="1" fill="#fff" ${NS0}/><path d="M27 35l3 7l3 -7z" fill="#D89A2A"/><path d="M20 68h8M32 68h8" stroke="#8A6A3A" stroke-width="3.5" stroke-linecap="round"/>${extra}`];
      const scal=(c)=>{let s='';for(let r=0;r<3;r++)for(let i=0;i<4-r%2;i++)s+=`<path d="M${20+i*6+(r%2)*3} ${46+r*6}q3 4 6 0" fill="none" stroke="${c}" stroke-width="1.2"/>`;return s};
      let spk='';for(let i=0;i<34;i++)spk+=`<circle cx="${f1(12+R2()*36)}" cy="${f1(38+R2()*28)}" r="${f1(.9+R2()*.9)}" fill="#1b1b1e"/>`;
      CURIO.owlCello=owlB('#6C7078','#3F4249','#8D9299','#E8B81C',scal('#4A4D54')+`<path d="M24 40l6 4l6 -4l-2 6h-8z" fill="#C8281E"/><ellipse cx="13" cy="50" rx="7" ry="8" fill="#D2561C"/><ellipse cx="13" cy="60" rx="9" ry="9" fill="#D2561C"/><rect x="11.5" y="28" width="3" height="18" fill="#3A2412"/><path d="M11 52h4M11 60h4" stroke="#3A2412"/><path d="M2 48L28 62" stroke="#E8DFC8" stroke-width="1.6"/>`);
      CURIO.owlViolin=owlB('#5A3620','#3A2010','#EAD7A4','#E39A1C',scal('#8A5A2A')+`<ellipse cx="40" cy="47" rx="10" ry="5.5" fill="#B0412A" transform="rotate(-28 40 47)"/><path d="M46 43L56 37" stroke="#3A2412" stroke-width="2.5"/><path d="M28 54L54 38" stroke="#E8DFC8" stroke-width="1.5"/>`);
      CURIO.owlFlute=owlB('#DCD9CE','#8E8B80','#F6F4EC','#E8731C',`<g ${NS0}>${spk}</g><path d="M22 42H56" stroke="#C9A227" stroke-width="3.5" stroke-linecap="round"/><circle cx="34" cy="42" r="1" fill="#6B5210" ${NS0}/><circle cx="42" cy="42" r="1" fill="#6B5210" ${NS0}/>`);
      CURIO.dog=[88,94,`<ellipse cx="44" cy="70" rx="28" ry="20" fill="#F6F1E8"/><path d="M18 66Q20 50 44 50Q68 50 70 66Q56 58 44 58Q32 58 18 66Z" fill="#A65A2A"/><ellipse cx="24" cy="86" rx="12" ry="7" fill="#F6F1E8"/><ellipse cx="64" cy="86" rx="12" ry="7" fill="#F6F1E8"/><path d="M18 24Q16 6 28 6Q36 10 36 20ZM70 24Q72 6 60 6Q52 10 52 20Z" fill="#A65A2A"/><path d="M22 20Q22 11 28 10Q32 13 32 19ZM66 20Q66 11 60 10Q56 13 56 19Z" fill="#F2C9B8" ${NS0}/><circle cx="44" cy="34" r="26" fill="#F6F1E8"/><path d="M18 34Q18 8 44 8Q70 8 70 34Q62 22 52 22Q46 22 44 30Q42 22 36 22Q26 22 18 34Z" fill="#A65A2A"/><ellipse cx="44" cy="44" rx="11" ry="9" fill="#FFFDF8"/><circle cx="33" cy="33" r="3.6" fill="#15110C"/><circle cx="55" cy="33" r="3.6" fill="#15110C"/><circle cx="34" cy="32" r="1.1" fill="#fff" ${NS0}/><circle cx="56" cy="32" r="1.1" fill="#fff" ${NS0}/><ellipse cx="44" cy="41" rx="4.5" ry="3.4" fill="#15110C"/><path d="M44 44v4M40 49q4 3 8 0" fill="none" stroke="#15110C" stroke-width="1.2"/><path d="M26 58Q44 66 62 58" fill="none" stroke="#B8402E" stroke-width="4"/>`];
      let swirl='';for(let i=0;i<5;i++)swirl+=`<path d="M${30+i*13} ${150+((i%2)*10)}q5 -8 10 0q-5 6 -8 0" fill="none" stroke="#9A9A98" stroke-width="1.4"/>`;
      let fuzz='';for(let i=0;i<7;i++)fuzz+=`<circle cx="${46+i*5}" cy="${47-Math.sin(i/6*Math.PI)*3}" r="4.6" fill="#EDEBE6"/>`;
      CURIO.archer=[124,210,`<ellipse cx="62" cy="204" rx="40" ry="5" fill="none" stroke="#8A6A3A" stroke-width="2"/><path d="M10 22l16 38M17 19l15 38M24 16l14 38M31 14l12 38" stroke="#D8C28A" stroke-width="3" stroke-linecap="round"/><path d="M8 20l26 -8l4 8l-26 8z" fill="#1b1b1e"/><rect x="22" y="50" width="22" height="36" rx="5" fill="#2A2A2E" transform="rotate(-22 33 68)"/><path d="M46 182h12v16H38v-6zM68 182h12v10l8 6H68z" fill="#17171a"/><path d="M40 98Q28 150 20 184H104Q96 150 84 98Z" fill="#F2EFE8"/><path d="M82 98Q94 150 100 184H104Q96 150 84 98Z" fill="rgba(0,0,0,.12)" ${NS0}/>${swirl}<path d="M22 178H102" stroke="#8E8E8C" stroke-width="2.5" stroke-dasharray="6 4"/><path d="M44 70Q62 62 80 70L84 100H40Z" fill="#E6E3DC"/><rect x="40" y="96" width="44" height="8" fill="#B8322A"/><path d="M42 100h40" stroke="#E3B23C" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M100 28Q126 66 102 108" fill="none" stroke="#E6A81C" stroke-width="4.5" stroke-linecap="round"/><path d="M100 28Q92 20 96 14M102 108Q96 116 100 122" fill="none" stroke="#E6A81C" stroke-width="4" stroke-linecap="round"/><path d="M100 28L102 108" stroke="#2A1608" stroke-width="1"/><path d="M52 74H112" stroke="#D8C28A" stroke-width="2.4"/><path d="M72 78L106 70" stroke="#1b1b1e" stroke-width="9" stroke-linecap="round"/><path d="M50 80L78 74" stroke="#BEBBB4" stroke-width="9" stroke-linecap="round"/><path d="M48 44Q44 62 50 68H74Q80 62 76 44Z" fill="#B8322A"/><path d="M50 50h24M50 56h24M51 62h22" stroke="#2F8F6A" stroke-width="1.5" stroke-dasharray="2 3"/><ellipse cx="62" cy="54" rx="10" ry="11" fill="#F4E2CE"/><path d="M57 53h3M64 53h3" stroke="#2A1608" stroke-width="1.4"/><path d="M60 60q2 1.5 4 0" fill="none" stroke="#B8322A" stroke-width="1.2"/><path d="M70 62Q76 90 70 130" fill="none" stroke="#17171a" stroke-width="4.5" stroke-linecap="round"/><path d="M44 46Q62 -14 80 46Z" fill="#DEDCD6"/><path d="M62 4Q70 22 76 44H80Q72 14 62 4Z" fill="rgba(0,0,0,.14)" ${NS0}/>${fuzz}`];
      const btl=(g,g2,l,ink)=>[56,196,`<rect x="19" y="2" width="18" height="16" rx="3" fill="#A8683A"/><path d="M19 8h18" stroke="#7A4A26"/><rect x="22" y="18" width="12" height="22" fill="${g}"/><path d="M22 40Q8 52 8 72V182Q8 194 20 194H36Q48 194 48 182V72Q48 52 34 40Z" fill="${g}"/><path d="M8 146H48V182Q48 194 36 194H20Q8 194 8 182Z" fill="${g2}"/><path d="M8 146l5 10l5 -10l5 10l5 -10l5 10l5 -10l5 10l5 -10M13 166v22M23 166v24M33 166v24M43 166v22" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.2"/><rect x="8" y="84" width="40" height="58" fill="${l}"/><rect x="12" y="94" width="32" height="7" fill="${ink}" ${NS0}/><rect x="14" y="106" width="28" height="2.4" fill="${ink}" opacity=".7" ${NS0}/><rect x="14" y="112" width="20" height="2.4" fill="${ink}" opacity=".7" ${NS0}/><rect x="30" y="128" width="12" height="3" fill="${ink}" opacity=".8" ${NS0}/><path d="M22 60Q20 44 26 42" fill="none" stroke="#3A2412" stroke-width="1" opacity=".6"/><rect x="12" y="54" width="4" height="26" rx="2" fill="rgba(255,255,255,.3)" ${NS0}/>`];
      CURIO.bottleAmber=btl('#6E3E18','#4A2A10','#F2932B','#3A2412');CURIO.bottleBlue=btl('#1C1A2C','#0E0D18','#9C98EC','#2A286A');
      CURIO.hippo=[156,180,`<ellipse cx="42" cy="168" rx="22" ry="11" fill="#EE94A8"/><ellipse cx="114" cy="168" rx="22" ry="11" fill="#EE94A8"/><ellipse cx="78" cy="122" rx="54" ry="50" fill="#F3A4B4"/><ellipse cx="26" cy="116" rx="14" ry="24" fill="#EE94A8" transform="rotate(20 26 116)"/><ellipse cx="130" cy="116" rx="14" ry="24" fill="#EE94A8" transform="rotate(-20 130 116)"/><circle cx="40" cy="16" r="11" fill="#EE94A8"/><circle cx="116" cy="16" r="11" fill="#EE94A8"/><circle cx="40" cy="17" r="5" fill="#F8C3CF" ${NS0}/><circle cx="116" cy="17" r="5" fill="#F8C3CF" ${NS0}/><ellipse cx="78" cy="48" rx="52" ry="38" fill="#F6B2C0"/><ellipse cx="78" cy="64" rx="44" ry="24" fill="#F9C8D2"/><ellipse cx="62" cy="58" rx="3.5" ry="5.5" fill="#B4526A"/><ellipse cx="94" cy="58" rx="3.5" ry="5.5" fill="#B4526A"/><circle cx="56" cy="32" r="3.6" fill="#2A1608"/><circle cx="100" cy="32" r="3.6" fill="#2A1608"/><path d="M60 74Q78 82 96 74" fill="none" stroke="#B4526A" stroke-width="1.6"/><path d="M40 88Q78 108 116 88L118 102Q78 122 38 102Z" fill="#6FA8DC"/><path d="M56 97l2 12M78 102v13M100 97l-2 12" stroke="#9B7FD1" stroke-width="6"/><path d="M68 106l-10 46h20l4 -46z" fill="#6FA8DC"/><path d="M66 118l15 1M63 130l17 1M61 142l18 1" stroke="#F29AC4" stroke-width="5"/><path d="M64 124l16 1M62 136l17 1" stroke="#9B7FD1" stroke-width="5"/><rect x="92" y="150" width="20" height="10" rx="2" fill="#E3B23C" transform="rotate(-10 102 155)"/>`];
      CURIO.plateGoa=[100,100,`<circle cx="50" cy="50" r="48" fill="#F3EAD0"/><clipPath id="lbgoa"><circle cx="50" cy="50" r="46"/></clipPath><g clip-path="url(#lbgoa)"><path d="M0 58Q26 46 50 58T100 54V76H0Z" fill="#3F9AD4"/><path d="M2 40Q20 30 40 40V58Q20 50 2 58Z" fill="#5FAE4A"/><rect x="12" y="30" width="20" height="16" fill="#FBFAF4"/><path d="M10 30l12 -9l12 9z" fill="#C8433B"/><path d="M34 56l14 -10l2 10z" fill="#FBFAF4"/><circle cx="56" cy="26" r="7" fill="#D8433B"/><path d="M76 78V30" stroke="#5A3A1E" stroke-width="3.5"/><path d="M76 30Q60 22 54 32M76 30Q92 22 98 34M76 30Q66 12 56 16M76 30Q86 12 96 18M76 30Q74 14 78 8" fill="none" stroke="#2F7D3F" stroke-width="4.5" stroke-linecap="round"/><path d="M0 74Q50 64 100 74V100H0Z" fill="#3E7A3A"/><ellipse cx="42" cy="70" rx="13" ry="10" fill="#3F6FB5"/><circle cx="44" cy="55" r="6.5" fill="#C98A5A"/><path d="M34 52h20l-10 -8z" fill="#F2C400"/><ellipse cx="52" cy="72" rx="10" ry="7" fill="#E3B23C"/><circle cx="52" cy="72" r="2.5" fill="#5A3A1E"/><path d="M58 68L74 58" stroke="#5A3A1E" stroke-width="2.4"/></g><text x="50" y="87" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="11" fill="#FBF6E0" textLength="24" lengthAdjust="spacingAndGlyphs" ${NS0}>GOA</text>`];
      CURIO.print=[132,102,`<rect x="1" y="1" width="130" height="100" fill="#FBFBF8"/><rect x="7" y="7" width="118" height="88" fill="#9A7A52"/><g ${NS0}><rect x="7" y="7" width="118" height="26" fill="#C9D4DA"/><circle cx="34" cy="38" r="15" fill="#6E4A2A"/><circle cx="66" cy="36" r="15" fill="#7A5430"/><circle cx="98" cy="38" r="15" fill="#6E4A2A"/><circle cx="34" cy="38" r="9" fill="none" stroke="#3A2412" stroke-width="1.5"/><circle cx="66" cy="36" r="9" fill="none" stroke="#3A2412" stroke-width="1.5"/><circle cx="98" cy="38" r="9" fill="none" stroke="#3A2412" stroke-width="1.5"/></g>${person(22,'#2F4F9A')}${person(46,'#E8B7C4')}${person(72,'#25252B')}${person(98,'#6E8A5A')}<rect x="26" y="54" width="10" height="20" fill="#C8281E" ${NS0}/>`];
      const cush=(c,d,r)=>[196,128,`<g transform="rotate(${r} 98 64)"><rect x="12" y="14" width="172" height="100" rx="26" fill="${c}"/><path d="M12 84Q98 70 184 84V88Q184 114 158 114H38Q12 114 12 88Z" fill="${d}" ${NS0}/><path d="M34 38Q98 20 162 38" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="3"/><path d="M40 28Q30 30 26 42M156 28Q166 30 170 42" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="2"/></g>`];
      CURIO.cushionYellow=cush('#C9B420','#A8951A',-12);CURIO.cushionTeal=cush('#2E8E96','#22727A',14);CURIO.cushionRed=cush('#C42A22','#9E1F1A',-6)}
    {const R3=rng(9191),f1=n=>n.toFixed(1),BP='M4 104L150 8Q165 -2 180 8L326 104Q320 120 296 113L165 52L34 113Q10 120 4 104Z';
      let bd='';for(let i=0;i<560;i++)bd+=`<circle cx="${f1(8+R3()*314)}" cy="${f1(6+R3()*106)}" r="${f1(1.1+R3()*1)}" fill="${R3()<.6?'#F6DFAE':'#B8381E'}"/>`;
      const roo=`<g fill="#1F2E2A" stroke="#F0C078" stroke-width="1"><path d="M88 58Q72 62 60 76Q76 72 92 63Z"/><path d="M100 58L108 69H119L118 65L111 64L107 55Z"/><ellipse cx="104" cy="52" rx="21" ry="9.5" transform="rotate(-22 104 52)"/><path d="M117 45Q126 41 131 36L126 33Q120 37 113 41Z"/><path d="M120 47L124 56L127.5 55L124.5 46Z"/><ellipse cx="133" cy="33" rx="8.5" ry="5" transform="rotate(-25 133 33)"/><path d="M133 29l2 -8l3.5 7zM128 30.5l-.5 -8l4.5 6z"/></g><path d="M92 55Q104 50 116 44M96 59Q104 55 110 53" fill="none" stroke="#3E8F7A" stroke-width="1.2" stroke-dasharray="1.5 2.5"/>`;
      let ring='';for(let i=0;i<12;i++){const a=i*Math.PI/6;ring+=`<circle cx="${f1(165+10.5*Math.cos(a))}" cy="${f1(27+10.5*Math.sin(a))}" r="1.8" fill="#F6DFAE"/>`}
      let ed='';for(let r=0;r<3;r++)for(let i=0;i<5;i++)ed+=`<circle cx="${f1(22+i*7+r*4)}" cy="${f1(96-i*4.6+r*7)}" r="2" fill="#34C7A5"/>`;
      const half=`<path d="M0 124V86L62 52L88 96L40 124Z" fill="#17140F"/>${ed}<path d="M60 54L86 98M67 50L93 94" stroke="#F6DFAE" stroke-width="1.3"/><g transform="translate(2 12) rotate(-9 104 52)">${roo}</g>`;
      CURIO.boomerang=[330,124,`<defs><clipPath id="lbbm"><path d="${BP}"/></clipPath></defs><path d="${BP}" fill="#D8702A"/><g clip-path="url(#lbbm)" ${NS0}>${bd}${half}<g transform="translate(330 0) scale(-1 1)">${half}</g><circle cx="165" cy="27" r="15" fill="#17140F"/>${ring}<circle cx="165" cy="27" r="6" fill="#2FA98F"/><circle cx="165" cy="27" r="2.5" fill="#F6DFAE"/></g>`];
      CURIO.teddy=[364,226,`<ellipse cx="282" cy="124" rx="20" ry="40" fill="#BF8128" transform="rotate(-34 282 124)"/><circle cx="302" cy="150" r="15" fill="#E8B878"/><ellipse cx="192" cy="146" rx="112" ry="66" fill="#C98A2E"/><ellipse cx="186" cy="158" rx="66" ry="40" fill="#DBA552" ${NS0}/><ellipse cx="104" cy="170" rx="62" ry="36" fill="#C98A2E" transform="rotate(8 104 170)"/><ellipse cx="282" cy="176" rx="54" ry="32" fill="#C98A2E" transform="rotate(-8 282 176)"/><circle cx="58" cy="176" r="44" fill="#D0943A"/><ellipse cx="58" cy="180" rx="27" ry="30" fill="#F0BC7C"/><ellipse cx="58" cy="186" rx="11" ry="14" fill="#7A4A1E"/><circle cx="318" cy="182" r="38" fill="#D0943A"/><ellipse cx="318" cy="186" rx="23" ry="26" fill="#F0BC7C"/><ellipse cx="318" cy="191" rx="9" ry="12" fill="#7A4A1E"/><ellipse cx="128" cy="108" rx="21" ry="42" fill="#D0943A" transform="rotate(40 128 108)"/><circle cx="104" cy="134" r="15" fill="#F0BC7C"/><path d="M168 104Q224 138 284 122L282 144Q222 160 160 124Z" fill="#F4F1EA"/><path d="M180 116l-5 12M200 126l-4 13M222 132l-2 14M244 134l0 14M266 130l3 13" stroke="#C9BFA8" stroke-width="5"/><path d="M172 112l-22 38l18 8l20 -34z" fill="#F4F1EA"/><path d="M158 140l16 7" stroke="#C9BFA8" stroke-width="5"/><circle cx="182" cy="30" r="22" fill="#C98A2E"/><circle cx="182" cy="32" r="11" fill="#E8B878" ${NS0}/><circle cx="274" cy="28" r="22" fill="#C98A2E"/><circle cx="274" cy="30" r="11" fill="#E8B878" ${NS0}/><circle cx="228" cy="74" r="58" fill="#D0943A"/><ellipse cx="230" cy="96" rx="30" ry="22" fill="#EBC084"/><ellipse cx="230" cy="86" rx="11" ry="7.5" fill="#5A3A1E"/><path d="M230 93v7M219 104q11 7 22 0" fill="none" stroke="#5A3A1E" stroke-width="2.4" stroke-linecap="round"/><circle cx="206" cy="66" r="5.2" fill="#1b130c"/><circle cx="254" cy="66" r="5.2" fill="#1b130c"/><circle cx="207.5" cy="64.5" r="1.6" fill="#fff" ${NS0}/><circle cx="255.5" cy="64.5" r="1.6" fill="#fff" ${NS0}/>`];
      CURIO.mazeBall=[136,140,`<path d="M44 136h48l-8 -16H52z" fill="#23232A"/><defs><clipPath id="lbpx"><circle cx="68" cy="64" r="58"/></clipPath></defs><circle cx="68" cy="64" r="60" fill="#DDEAF2" fill-opacity=".38" stroke="#7FA6BF" stroke-width="2"/><g clip-path="url(#lbpx)" fill="none" stroke-linecap="round" ${NS0}><path d="M8 100A60 60 0 0 0 128 100Z" fill="#E8B81C" fill-opacity=".9"/><path d="M40 30Q66 12 98 30Q76 46 54 38" stroke="#3BB273" stroke-width="6"/><path d="M20 84Q40 40 70 50T118 42" stroke="#F2C81C" stroke-width="7"/><path d="M24 58Q50 98 84 80T114 88" stroke="#2A7FD8" stroke-width="7"/><path d="M48 106Q70 92 94 106" stroke="#F0772B" stroke-width="6"/><path d="M68 20V58M90 38L60 72" stroke="#F4F4F2" stroke-width="4"/><circle cx="84" cy="78" r="4.5" fill="#C9CCD3" stroke="#6E7480" stroke-width="1"/></g><ellipse cx="68" cy="100" rx="52" ry="8" fill="none" stroke="#2A7FD8" stroke-width="5"/><path d="M28 42Q40 20 62 12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/>`];
      let weave='';for(let i=-12;i<16;i++)weave+=`<path d="M${i*9} 36l92 92M${i*9+92} 36l-92 92" stroke="#A88F5A" stroke-width="1.6"/>`;
      CURIO.basket=[70,130,`<rect x="26" y="4" width="18" height="9" rx="2" fill="#C9A227"/><rect x="28" y="12" width="14" height="30" fill="#4F6E38"/><path d="M20 46Q35 -8 50 46" fill="none" stroke="#C9B27A" stroke-width="5"/><defs><clipPath id="lbbt"><path d="M10 64Q10 42 28 40H42Q60 42 60 64V114Q60 126 48 126H22Q10 126 10 114Z"/></clipPath></defs><path d="M10 64Q10 42 28 40H42Q60 42 60 64V114Q60 126 48 126H22Q10 126 10 114Z" fill="#DCC890"/><g clip-path="url(#lbbt)" ${NS0}>${weave}<path d="M50 40Q62 44 60 126H52Z" fill="rgba(60,40,10,.2)"/></g><rect x="20" y="72" width="30" height="26" fill="#F2D21C"/><rect x="20" y="72" width="30" height="8" fill="#2F8F4E" ${NS0}/><path d="M24 86h22M24 91h16" stroke="#2A1608" stroke-width="1.2"/>`]}
    Object.assign(CURIO,{
      dvdBox:[118,150,`<rect x="2" y="2" width="114" height="146" rx="3" fill="#5A5630"/><path d="M22 34h74M30 44h58" stroke="#C9B26A" stroke-width="3"/><path d="M34 70h50M30 96h58M30 120h58" stroke="#C9B26A" stroke-width="2.2"/><path d="M40 78h38M36 104h46M36 128h46" stroke="#A8935A" stroke-width="1.4"/>`],
      dvds:[54,134,`<rect x="2" y="6" width="16" height="126" fill="#1E1E22"/><rect x="19" y="10" width="14" height="122" fill="#B9C6CF"/><rect x="34" y="2" width="18" height="130" fill="#2E4A45"/><path d="M10 30v60M26 34v50M43 26v70" stroke="#D8CFA8" stroke-width="2"/>`],
      gameBoxes:[156,64,`<rect x="4" y="2" width="150" height="30" rx="2" fill="#1E1E20"/><rect x="2" y="32" width="152" height="30" rx="2" fill="#7A1E22"/><text x="12" y="22" font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="#E8553A" textLength="100" lengthAdjust="spacingAndGlyphs" ${NS0}>EXPLODING KITTENS</text><text x="12" y="52" font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="#F2B23A" textLength="100" lengthAdjust="spacingAndGlyphs" ${NS0}>EXPLODING KITTENS</text><circle cx="132" cy="18" r="6" fill="#E8553A" ${NS0}/><circle cx="132" cy="48" r="6" fill="#F2B23A" ${NS0}/>`],
      ganesha:[112,158,`<path d="M12 60Q2 86 20 108L30 66Z" fill="#8A5630"/><path d="M100 60Q110 86 92 108L82 66Z" fill="#8A5630"/><ellipse cx="56" cy="94" rx="46" ry="62" fill="#9A6238"/><path d="M34 40Q56 -8 78 40Z" fill="#8A5630"/><path d="M38 30h36M42 20h28M48 10h16" stroke="#6E4222" stroke-width="2"/><ellipse cx="56" cy="62" rx="28" ry="26" fill="#A56C40"/><path d="M48 76Q46 112 58 128Q70 136 74 122Q66 126 62 114Q60 96 64 76Z" fill="#A56C40"/><path d="M50 88h13M50 98h12M52 108h11M48 46h16M50 51h12" stroke="#6E4222" stroke-width="1.5"/><circle cx="45" cy="60" r="3.2" fill="#F4EFE2" ${NS0}/><circle cx="67" cy="60" r="3.2" fill="#F4EFE2" ${NS0}/><circle cx="45" cy="60" r="1.4" fill="#17110A" ${NS0}/><circle cx="67" cy="60" r="1.4" fill="#17110A" ${NS0}/><path d="M42 82l-3 9l5 -1zM70 82l3 9l-5 -1z" fill="#F4EFE2"/><path d="M26 122Q56 152 86 122" fill="none" stroke="#6E4222" stroke-width="2"/>`],
      parrots:[108,176,`<path d="M22 174L30 62h10l8 112z" fill="#3E2A20"/><path d="M62 174L70 62h10l8 112z" fill="#3E2A20"/><ellipse cx="35" cy="42" rx="13" ry="22" fill="#3FA63A"/><circle cx="35" cy="24" r="10" fill="#3FA63A"/><path d="M30 22q5 -8 10 0q-5 10 -10 0z" fill="#D8362E"/><path d="M33 30l2 6l2 -6z" fill="#F2C81C"/><path d="M90 50l16 12l-20 -4z" fill="#2F8F3A"/><ellipse cx="78" cy="44" rx="20" ry="11" fill="#E8862A" transform="rotate(22 78 44)"/><circle cx="62" cy="32" r="10" fill="#E8862A"/><path d="M52 32l-6 5l8 2z" fill="#F2C81C"/><circle cx="60" cy="29" r="3.4" fill="#fff" ${NS0}/><circle cx="60" cy="29" r="1.5" fill="#111" ${NS0}/><ellipse cx="80" cy="45" rx="8" ry="5" fill="#2A1608" transform="rotate(22 80 45)" ${NS0}/><circle cx="80" cy="45" r="2.5" fill="#D8362E" ${NS0}/>`],
      bell:[72,112,`<path d="M22 44v34" stroke="#C8281E" stroke-width="3"/><path d="M19 78h6v24h-6z" fill="#C8281E"/><path d="M26 28L36 2L46 28Z" fill="#6E5236"/><rect x="29" y="26" width="14" height="16" fill="#7A5A3A"/><path d="M30 40Q20 44 16 78L10 100Q36 108 62 100L56 78Q52 44 42 40Z" fill="#8A6A4A"/><path d="M12 98q8 8 14 0q8 8 14 0q8 8 14 0q6 6 10 0" fill="none" stroke="#5A4028" stroke-width="2"/><path d="M30 20h12M32 12h8M24 58h24M21 76h30" stroke="#C9A870" stroke-width="1.5"/><ellipse cx="36" cy="66" rx="6" ry="9" fill="#A88458"/>`],
      catPlush:[124,132,`<ellipse cx="26" cy="92" rx="10" ry="18" fill="#E0A04A" transform="rotate(20 26 92)"/><ellipse cx="98" cy="92" rx="10" ry="18" fill="#E0A04A" transform="rotate(-20 98 92)"/><ellipse cx="62" cy="96" rx="34" ry="30" fill="#1E1A1E"/><g fill="#D8362E" ${NS0}><circle cx="48" cy="88" r="4"/><circle cx="74" cy="84" r="4"/><circle cx="62" cy="104" r="4"/><circle cx="82" cy="106" r="3.4"/><circle cx="42" cy="108" r="3.4"/></g><ellipse cx="34" cy="120" rx="18" ry="10" fill="#E0A04A"/><ellipse cx="90" cy="120" rx="18" ry="10" fill="#E0A04A"/><path d="M30 30l6 -22l16 16zM94 30l-6 -22l-16 16z" fill="#E0A04A"/><ellipse cx="62" cy="44" rx="36" ry="30" fill="#E0A04A"/><ellipse cx="62" cy="58" rx="20" ry="12" fill="#F3E3C0"/><ellipse cx="62" cy="52" rx="5" ry="3.5" fill="#E889A0"/><path d="M54 61q8 6 16 0" fill="none" stroke="#7A4A26" stroke-width="1.6"/><path d="M28 32q7 -9 15 0q8 -9 15 0q-1 12 -15 18q-14 -6 -15 -18zM66 32q7 -9 15 0q8 -9 15 0q-1 12 -15 18q-14 -6 -15 -18z" fill="#E8362E"/>`],
      trophy:[56,136,`<ellipse cx="28" cy="126" rx="24" ry="8" fill="#17171A"/><rect x="8" y="104" width="40" height="22" rx="3" fill="#1E1E22"/><rect x="12" y="110" width="32" height="10" fill="#D8B23C" ${NS0}/><rect x="14" y="94" width="28" height="12" rx="4" fill="#E0B93A"/><rect x="21" y="40" width="14" height="56" rx="6" fill="#E8C24A"/><path d="M14 30Q28 22 42 30L40 50H16Z" fill="#E8C24A"/><circle cx="28" cy="16" r="9" fill="#E8C24A"/><path d="M18 44h20" stroke="#B8922A" stroke-width="3"/>`],
      toyCar:[124,58,`<path d="M6 40Q8 26 30 24Q42 6 66 6Q92 6 100 26Q118 28 118 40V44H6Z" fill="#B9BEC6"/><path d="M38 24Q46 12 64 12V24ZM68 12Q86 12 92 24H68Z" fill="#4A5560" ${NS0}/><circle cx="32" cy="44" r="11" fill="#22242A"/><circle cx="32" cy="44" r="5" fill="#C9CCD3"/><circle cx="92" cy="44" r="11" fill="#22242A"/><circle cx="92" cy="44" r="5" fill="#C9CCD3"/><circle cx="112" cy="34" r="3" fill="#F2E6A8" ${NS0}/>`]});
    /* Shading: every part of a curio is shaded as the solid it is (a ball, a cylinder, a slab), from one light at the upper left,
       and by its material: plush is soft and dull, glazed and glass things carry a sharp highlight, paper and frames stay nearly flat. */
    const MAT={s:['dog','hippo','tiger','teddy','cushionYellow','cushionTeal','cushionRed','ribbon','catPlush'],
      g:['bottleAmber','bottleBlue','jar','cup','shotGlass','bowl','plateLA','plateGoa','mazeBall','vase','astroUp','astroGold','astroMoon','moonReader','camera','catL','catO','catV','catE','owlCello','owlViolin','owlFlute','bell','trophy','toyCar'],
      f:['fan','frameDog','frameCat','framePal','print','bridge','card','watercolour','rafting','dvdBox','dvds','gameBoxes']},
      TALL=['bottleAmber','bottleBlue','jar','shotGlass','basket','duck'];
    /* Drawings that arrive already lit and shaded by hand (library-art.js, Shelves 4 and 5) are left exactly as drawn */
    Object.assign(CURIO,window.__libArt||{});MAT.x=Object.keys(window.__libArt||{});
    const matOf=k=>MAT.x.indexOf(k)>=0?'x':MAT.s.indexOf(k)>=0?'s':MAT.g.indexOf(k)>=0?'g':MAT.f.indexOf(k)>=0?'f':'m';
    function shade(mk,k){const m=matOf(k);if(m==='x')return mk;const tall=TALL.indexOf(k)>=0,keep=[];
      mk=mk.replace(/<defs>[\s\S]*?<\/defs>|<clipPath[\s\S]*?<\/clipPath>/g,x=>{keep.push(x);return'\u0001'+(keep.length-1)+'\u0002'});
      mk=mk.replace(/<(ellipse|circle|rect|path)\b([^>]*?)\/>/g,(all,tag,at)=>{const fm=/\sfill="(#[0-9A-Fa-f]{3,6})"/.exec(at);if(!fm||/stroke="none"|class="/.test(at))return all;
        const num=n=>{const r=new RegExp('\\s'+n+'="([\\d.]+)"').exec(at);return r?+r[1]:0};let g;
        if(tag==='circle'){if(num('r')<5)return all;g='S'}else if(tag==='ellipse'){if(num('rx')*num('ry')<30)return all;g='S'}
        else if(tag==='rect'){const w=num('width'),h=num('height');if(w*h<120)return all;g=h>2.2*w?'C':'L'}else g=tall?'C':'L';
        if(m==='f')g='L';
        return all+'<'+tag+at.replace(fm[0],' fill="url(#lb'+g+m+')"').replace(/\sstroke(-[a-z]+)?="[^"]*"/g,'')+' stroke="none"/>'});
      return mk.replace(/\u0001(\d+)\u0002/g,(x,n)=>keep[+n])}
    const GRADS=(()=>{const st=a=>a.map(q=>`<stop offset="${q[0]}" stop-color="${q[1]}" stop-opacity="${q[2]}"/>`).join(''),W='#fff',K='#000';
      const S={s:[[0,W,.2],[.5,W,0],[.7,K,0],[1,K,.26]],m:[[0,W,.3],[.45,W,0],[.68,K,0],[1,K,.32]],g:[[0,W,.85],[.1,W,.35],[.4,W,0],[.7,K,0],[1,K,.38]]},
        L={s:[[0,W,.16],[.5,W,0],[.55,K,0],[1,K,.2]],m:[[0,W,.2],[.45,W,0],[.55,K,0],[1,K,.26]],g:[[0,W,.34],[.35,W,0],[.6,K,0],[1,K,.3]],f:[[0,W,.12],[.5,W,0],[.55,K,0],[1,K,.14]]},
        C={s:[[0,K,.18],[.3,W,.14],[.6,W,0],[.65,K,0],[1,K,.24]],m:[[0,K,.28],[.28,W,.26],[.55,W,0],[.6,K,0],[1,K,.36]],g:[[0,K,.3],[.22,W,.6],[.32,W,.15],[.55,W,0],[.6,K,0],[1,K,.42]]};
      let o='';Object.keys(S).forEach(m=>{o+=`<radialGradient id="lbS${m}" cx=".34" cy=".28" r=".8">${st(S[m])}</radialGradient>`});
      Object.keys(L).forEach(m=>{o+=`<linearGradient id="lbL${m}" x1="0" y1="0" x2="1" y2="1">${st(L[m])}</linearGradient>`});
      Object.keys(C).forEach(m=>{o+=`<linearGradient id="lbC${m}" x1="0" y1="0" x2="1" y2="0">${st(C[m])}</linearGradient>`});return o})();
    {const df=document.createElement('div');df.className='lb-defs';df.innerHTML='<svg width="0" height="0" aria-hidden="true"><defs>'+GRADS+'<radialGradient id="lbSh"><stop offset="0" stop-color="#000" stop-opacity=".95"/><stop offset=".45" stop-color="#000" stop-opacity=".5"/><stop offset=".8" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs></svg>';caseEl.appendChild(df)}
    function shadowOf(c,i){const R=rng(311+i*17),m=matOf(c.k),flat=m==='f',f=n=>n.toFixed(1),rx=c.w*(flat?.5:.4+R()*.08),ry=Math.max(2.5,Math.min(11,c.w*(.05+R()*.04)))*(flat?.5:1),
        dx=Math.min(16,c.h*(.05+R()*.04))*(flat?.4:1),op=flat?.3:m==='s'?.4:.5+R()*.1,rot=(R()-.5)*5;
      return`<g transform="rotate(${f(rot)} ${f(c.w/2)} ${c.h})"><ellipse cx="${f(c.w/2+dx)}" cy="${f(c.h-2)}" rx="${f(rx+dx*.7)}" ry="${f(ry)}" fill="url(#lbSh)" opacity="${f(op*.8)}" stroke="none"/><ellipse cx="${f(c.w/2+dx*.25)}" cy="${f(c.h-1.5)}" rx="${f(rx*.72)}" ry="${f(ry*.55)}" fill="url(#lbSh)" opacity="${f(op)}" stroke="none"/></g>`}
    const curios=(CURIOS||[]).filter(c=>c&&CURIO[c.k]);let G={},cpos={};if(!CTX.landing)try{cpos=JSON.parse(localStorage.getItem('dungeon-library-curios'+KS)||'{}')}catch(err){cpos={}}
    const lift=el=>el.classList.contains('lb-lift')?(el.classList.contains('lb-curio')?' scale(1.12)':' scale(1.08)'):'',unlift=el=>{el.style.transform=el.style.transform.replace(/ scale\([^)]*\)$/,'')},pickT=el=>{if(el.style.transform&&!/ scale\(/.test(el.style.transform))el.style.transform+=lift(el)};
    function putCurio(c){const g=G[c.s]||G[0];if(!g)return;if(c.el.parentNode!==boxes[g.c]._cur)boxes[g.c]._cur.appendChild(c.el);const lx=c._ax!=null?c._ax:Math.max(0,Math.min(g.colW-c.w,c.x*g.colW-c.w/2)),co=Math.cos(g.th),si=Math.sin(g.th);
      c.wx=g.ox+lx*co-g.front*si;c.wy=g.by+lx*si+g.front*co-(c.dy||0);c.el.style.transform=`translate(${c.wx.toFixed(1)}px,${(c.wy-c.h).toFixed(1)}px) rotate(${g.th.toFixed(4)}rad)`}
    function dropCurio(c){const cx=c.wx+c.w/2,gc=(G[c.s]||G[0]).c;let best=null,bd=1e9;
      Object.keys(G).forEach(k=>{const g=G[k];if(g.c!==gc||cx<g.ox-40||cx>g.ox+g.colW+40)return;const d=Math.abs(c.wy-(g.by+(cx-g.ox)*Math.sin(g.th)));if(d<bd){bd=d;best=+k}});
      if(best!==null){const g=G[best];c.s=best;c.x=Math.max(0,Math.min(1,(cx-g.ox)/g.colW));cpos[c.id]={s:c.s,x:+c.x.toFixed(3)};try{localStorage.setItem('dungeon-library-curios'+KS,JSON.stringify(cpos))}catch(err){}}
      c.el.classList.add('lb-settle');putCurio(c);setTimeout(()=>c.el.classList.remove('lb-settle'),500)}
    curios.forEach((c,i)=>{const sp=CURIO[c.k];c.id=c.id||c.k+'-'+i;c.curio=true;c.w=sp[0];c.h=sp[1];c.s0=c.s;c.x0=c.x;c.dy0=c.dy=+c.dy||0;if(cpos[c.id]){c.s=cpos[c.id].s;c.x=cpos[c.id].x}
      const el=document.createElement('button');el.type='button';el.className='lb-curio';el.style.zIndex=500+i;el.setAttribute('aria-label',c.name||'Curio');
      el.innerHTML=`<svg width="${c.w}" height="${c.h}" viewBox="0 0 ${c.w} ${c.h}" aria-hidden="true">${shadowOf(c,i)}<g ${SK}>${shade(sp[2],c.k)}</g></svg>`;c.el=el;caseEl.appendChild(el);
      let sx=0,sy=0,x0=0,y0=0,on=false,armed=true,timer=0;
      el.addEventListener('touchmove',ev=>{if(on&&armed)ev.preventDefault()},{passive:false});
      el.addEventListener('pointerdown',ev=>{zs=scale*(boxes[(G[c.s]||G[0]).c]._z||1);on=true;c.moved=false;sx=ev.clientX;sy=ev.clientY;x0=c.wx;y0=c.wy;armed=ev.pointerType!=='touch';if(!armed)timer=setTimeout(()=>{armed=true;pick(el)},320);try{el.setPointerCapture(ev.pointerId)}catch(err){}});
      el.addEventListener('pointermove',ev=>{if(!on)return;const dx=(ev.clientX-sx)/zs,dy=(ev.clientY-sy)/zs;
        if(!armed){if(Math.abs(dx)+Math.abs(dy)>8/zs){clearTimeout(timer);on=false}return}
        if(!c.moved){if(Math.abs(dx)+Math.abs(dy)<4)return;c.moved=true;c.dy=0;el.classList.add('lb-drag');el.classList.add('lb-lift');info.classList.remove('lb-on')}
        c.wx=x0+dx;c.wy=y0+dy;el.style.transform=`translate(${c.wx.toFixed(1)}px,${(c.wy-c.h).toFixed(1)}px)${lift(el)}`});
      const end=()=>{clearTimeout(timer);el.classList.remove('lb-lift');unlift(el);if(!on)return;on=false;el.classList.remove('lb-drag');if(c.moved)dropCurio(c)};
      el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
      el.addEventListener('click',()=>{if(c.moved){c.moved=false;return}select(c)})});
    function put(e){const g=e.geo,c=Math.cos(g.th),s=Math.sin(g.th);e.wx=g.ox+e.lx*c-e.ly_*s;e.wy=g.by+e.lx*s+e.ly_*c;
      e.el.style.transform=`translate(${e.wx.toFixed(1)}px,${(e.wy-e.dh).toFixed(1)}px) rotate(${(g.th+e.ang).toFixed(4)}rad)${lift(e.el)}`}
    let topic='';
    function applyTopic(say){let n=0;books.forEach(b=>{const on=!topic||(b.tags||[]).indexOf(topic)>=0;if(on)n++;b.el.classList.toggle('lb-dim',!on)});
      if(say)msg.textContent=topic?n+' books on '+topic+'. The rest are faded.':'Showing every book.'}
    function pick(el){el.classList.add('lb-lift');pickT(el);try{if(navigator.vibrate)navigator.vibrate(15)}catch(err){}}
    function drop(e){const cx=e.wx+e.dw/2,cy=e.wy-e.dh/2;let best=-1,bd=1e9;
      geos.forEach((g,si)=>{if(g.c!==e.geo.c||cx<g.ox-20||cx>g.ox+g.colW+20)return;const d=Math.abs(cy-(g.by-SH/2));if(d<bd&&d<ROW*.6){bd=d;best=si}});
      const from=manual.findIndex(s=>s.includes(e.i));if(best<0){render('manual');return}
      const tgt=manual[best].filter(i=>i!==e.i);
      if(best!==from&&wsum(tgt)+e.w+GAP>cap()){render('manual');msg.textContent='That shelf is full. Move a book off it first.';return}
      const lx=cx-geos[best].ox;let k=tgt.findIndex(i=>books[i]._x+books[i].w/2>lx);if(k<0)k=tgt.length;
      manual[from]=manual[from].filter(i=>i!==e.i);tgt.splice(k,0,e.i);manual[best]=tgt;saveManual();render('manual')}
    books.forEach(e=>{let sx=0,sy=0,start=0,base=0,wx0=0,wy0=0,on=null,armed=true,timer=0;const el=e.el;
      el.addEventListener('touchmove',ev=>{if(on&&armed)ev.preventDefault()},{passive:false});
      el.addEventListener('pointerdown',ev=>{zs=scale*(boxes[e.geo.c]._z||1);e.moved=false;if(current==='manual'){on='free';wx0=e.wx;wy0=e.wy;}else if(e.drag){on='slide';start=e.lx;base=e.lx-(dxs[e.i]||0)}else return;armed=ev.pointerType!=='touch';if(!armed)timer=setTimeout(()=>{armed=true;pick(el)},320);
        sx=ev.clientX;sy=ev.clientY;try{el.setPointerCapture(ev.pointerId)}catch(err){}});
      el.addEventListener('pointermove',ev=>{if(!on)return;const dx=(ev.clientX-sx)/zs,dy=(ev.clientY-sy)/zs;
        if(!armed){if(Math.abs(dx)+Math.abs(dy)>8/zs){clearTimeout(timer);on=null}return}
        if(!e.moved){if(Math.abs(dx)+Math.abs(dy)<4)return;e.moved=true;el.classList.add('lb-drag');el.classList.add('lb-lift');info.classList.remove('lb-on');if(on==='free')el.style.zIndex=999}
        if(on==='slide'){e.lx=Math.max(e.lim[0],Math.min(e.lim[1],start+dx));dxs[e.i]=e.lx-base;put(e)}
        else{e.wx=wx0+dx;e.wy=wy0+dy;el.style.transform=`translate(${e.wx.toFixed(1)}px,${(e.wy-e.dh).toFixed(1)}px) rotate(-0.06rad)${lift(el)}`}});
      const end=()=>{clearTimeout(timer);el.classList.remove('lb-lift');unlift(el);if(!on)return;const was=on;on=null;el.classList.remove('lb-drag');if(!e.moved)return;
        if(was==='slide'){try{localStorage.setItem('dungeon-library-dx'+KS,JSON.stringify(dxs))}catch(err){}}else drop(e)};
      el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)});
    const LAMP='<svg width="90" height="520" viewBox="0 0 90 520" aria-hidden="true"><rect x="42" y="90" width="6" height="412" fill="#3A2412"/><ellipse cx="45" cy="506" rx="34" ry="10" fill="#3A2412"/><path d="M18 96L30 8H60L72 96Z" fill="#F2C879" stroke="#7A4A26" stroke-width="2"/><path d="M21 84H69" stroke="#C9A227" stroke-width="3"/></svg>',
     CHAIR='<svg width="160" height="178" viewBox="0 0 160 178" aria-hidden="true"><rect x="24" y="158" width="10" height="20" fill="#3A2412"/><rect x="126" y="158" width="10" height="20" fill="#3A2412"/><path d="M26 96V34Q26 6 80 6Q134 6 134 34V96Z" fill="#8E2F2A"/><path d="M40 92V40Q40 22 80 22Q120 22 120 40V92Z" fill="#A53C34"/><rect x="8" y="78" width="30" height="84" rx="14" fill="#7A2622"/><rect x="122" y="78" width="30" height="84" rx="14" fill="#7A2622"/><rect x="30" y="104" width="100" height="54" rx="10" fill="#8E2F2A"/><rect x="36" y="96" width="88" height="24" rx="10" fill="#B8463C"/><rect x="58" y="70" width="44" height="34" rx="8" fill="#E3B23C"/></svg>';
    /* Fairy lights: a string hung along the back of each shelf, behind the books, and a coil of it lying in any empty stretch */
    function fairy(si,ox,by,W,x0,x1){const R=rng(977+si*31),f=n=>n.toFixed(1),COL=['#FFD98A','#FFC56B','#FFE9B8'],B=['','',''];let wire='M0 12';
      const bulb=(x,y)=>{const k=Math.floor(R()*3);B[k]+=`<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="url(#lbh${si})"/><circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="${COL[Math.floor(R()*3)]}"/>`};
      const n=Math.max(2,Math.round(W/150));
      for(let i=0;i<n;i++){const a=i*W/n,b=(i+1)*W/n,sag=24+R()*14;wire+=`Q${f((a+b)/2)} ${f(12+2*(sag-12))} ${f(b)} 12`;
        const k=Math.max(3,Math.round((b-a)/60));for(let j=1;j<k;j++){const t=j/k;bulb(a+(b-a)*t,15+(sag-12)*4*t*(1-t))}}
      [[PAD,x0-6],[x1+6,W-PAD]].forEach(([g0,g1])=>{if(g1-g0<90)return;const cw=Math.min(g1-g0-24,190),cx=(g0+g1)/2;
        for(let l=0;l<2;l++){const ex=cx+(R()-.5)*cw*.35,ey=SH-FD-2-l*5-R()*4,rx=cw*(.28+R()*.22),ry=9+R()*8,rot=(R()-.5)*16;
          wire+=`M${f(ex-rx)} ${f(ey)}a${f(rx)} ${f(ry)} ${f(rot)} 1 0 ${f(rx*2)} 0a${f(rx)} ${f(ry)} ${f(rot)} 1 0 ${f(-rx*2)} 0`;
          const m=3+Math.floor(R()*2),a0=R()*6;for(let q=0;q<m;q++){const a=a0+q*2*Math.PI/m;bulb(ex+rx*Math.cos(a),ey+ry*Math.sin(a))}}
        const right=g1>=W-PAD-1,ex=right?W-9:9,fy=SH-9,tx=right?cx+cw*.34:cx-cw*.34;wire+=`M${f(ex)} 12V${f(fy)}H${f(tx)}`;
        for(let y=38;y<fy-8;y+=60)bulb(ex,y);for(let x=ex+(right?-40:40);right?x>tx+10:x<tx-10;x+=right?-60:60)bulb(x,fy)});
      const svg=inner=>`<svg width="${f(W)}" height="${SH}" viewBox="0 0 ${f(W)} ${SH}" aria-hidden="true">${inner}</svg>`,org='0 '+SH+'px';
      mk('fairy',ox,by-SH,W,SH,TILT[si],org).innerHTML=svg(`<path d="${wire}" fill="none" stroke="#EFEADB" stroke-width="1.2" opacity=".5"/>`);
      /* The bulbs are split into three layers that each fade as a whole, so the glow costs the browser almost nothing */
      B.forEach((b,k)=>{if(!b)return;const d=mk('fairy lb-glow'+k,ox,by-SH,W,SH,TILT[si],org);d.style.animationDelay=(-(si*.7+k*1.9)).toFixed(1)+'s';
        d.innerHTML=svg(`<defs><radialGradient id="lbh${si}"><stop offset="0" stop-color="#FFD27A" stop-opacity=".35"/><stop offset="1" stop-color="#FFC060" stop-opacity="0"/></radialGradient></defs>${b}`)})}
    function mk(cls,x,y,w,h,rot,org){const d=document.createElement('div');d.className='lb-fr lb-'+cls;d.style.left=x+'px';d.style.top=y+'px';d.style.width=w+'px';d.style.height=h+'px';
      if(rot)d.style.transform='rotate('+rot+'deg)';if(org)d.style.transformOrigin=org;(BOX?(/^(back|tshade|fairy)/.test(cls)?BOX._deep:BOX):caseEl).appendChild(d);return d}
    function kid(parent,cls){const d=document.createElement('i');d.className='lb-'+cls;parent.appendChild(d);return d}
    function render(mode){current=mode;const m=MODES[mode];cols=vp.clientWidth>=900?2:1;const r=m.run();msg.textContent=r.msg+(m.note||'')+(topic?' Only '+topic+' is lit; the rest are faded.':'');
      if(mode!=='manual')prevSh=r.sh;
      caseEl.classList.toggle('lb-manual',mode==='manual');document.getElementById('lib-tools').hidden=mode!=='manual';if(mode==='manual')shareLinks();
      caseEl.querySelectorAll('.lb-fr').forEach(p=>p.remove());
      const tk=!!m.real&&tucked,hasL=c=>!!CASES[c].layers,ownW=c=>!!CASES[c].own;
      const L=r.sh.map(s=>layoutShelf(s,!!m.real,tk));if(m.real){FIXW=Math.max(420,CTX.fixW||0,...L.filter((l,q)=>!hasL(caseOf(q))&&!ownW(caseOf(q))).map(l=>l.width));if(CTX.fixw)CTX.fixw(FIXW)}
      geos=[];G={};sortSel.value=m.pat||m.own?'':mode;patSel.value=m.pat?mode:'';menus.forEach(x=>x.update());
      for(let c=0;c<CASES.length;c++){const n=CASES[c].n,st=!!CASES[c].straight,bx=boxes[c],LM=24,cx=LM,ty=STUFF,bot=ty+TB+n*ROW-30,D=DEPTH,
          colW=Math.max(ownW(c)?(CASES[c].w||420):(m.real&&hasL(c))?420:FIXW,...L.slice(CS[c],CS[c]+n).map(l=>l.width)),CW=colW+2*SIDE,BW=LM+CW+40;
        BOX=bx;bx._w=BW;bx._h=STUFF+TB+n*ROW+FOOT+34+44;bx.style.width=BW+'px';bx.style.height=bx._h+'px';
        /* Real depth: two side panels and a board at every level run back from the front edge to the back panel */
        const tp=+CASES[c].taper||0,rowW=rw=>tp?colW*(1-tp*(n-1-rw)/Math.max(1,n-1)):colW,lean2=tp?Math.atan((colW*tp/2)/(bot-ty-8))/RAD:0;
        const side=x=>{const d=mk('side',x,ty+4,D,bot+20-ty);d.style.transformOrigin='0 50%';d.style.transform='rotateY(90deg)'},
          deck=(x,y,w)=>{const d=mk('deck',x,y-D,w,D);d.style.transformOrigin='50% 100%';d.style.transform='rotateX(90deg)'};
        
        {const bk=mk('back',cx+SIDE-8,ty+TB-6,colW+16,n*ROW-20);if(tp){const ins=(colW*tp/2)+8,H=n*ROW-20;bk.style.clipPath='polygon('+ins+'px 0,'+(colW+16-ins)+'px 0,100% 100%,0 100%)'}}{const ts=mk('tshade',cx+SIDE-6,ty+TB,colW+12,120);if(tp){const ins=(colW*tp/2)+6;ts.style.clipPath='polygon('+ins+'px 0,'+(colW+12-ins)+'px 0,100% 100%,0 100%)'}}
        for(let rw=0;rw<n;rw++){const si=CS[c]+rw,th=TILT[si]*RAD,wr=rowW(rw),ox=cx+SIDE+(colW-wr)/2,by=ty+TB+rw*ROW+SH+JIT[si]-(wr/2)*Math.sin(th),geo={ox,by,th,colW:wr,c},
            off=m.centre?(colW-L[si].width)/2:0;geos[si]=geo;G[si]={ox,by,th,colW:wr,front:0,c};
          L[si].place.forEach(([e,x,y,ang,drag],i)=>{e.geo=geo;e.drag=!!drag;e.lx=x+off;e.ly2=0;e.ly_=y+e.dh-FD;e.ang=ang||0;
            const pln=tk&&e.ly?bx['_books'+e.ly]:bx._books;if(e.el.parentNode!==pln){pln.appendChild(e.el)}
            if(drag){e.lim=[PAD,wr-e.dw-PAD];e.lx=Math.max(e.lim[0],Math.min(e.lim[1],e.lx+(dxs[e.i]||0)))}
            e.el.style.zIndex=drag?400:10+i;put(e)});
          fairy(si,ox,by,wr,off+PAD,off+L[si].width-PAD);
          const pl=mk('plank',ox-6,by,wr+12,PL,TILT[si],'6px 0');if(rw<n-1)kid(pl,'shade');
          if(m.labels){let last=null;r.sh[si].forEach(e=>{if(e.g!==last){const sp=document.createElement('span');sp.textContent=e.g;sp.style.left=Math.round(off+e._x+6)+'px';pl.appendChild(sp);last=e.g}})}}
        kid(mk('post',cx,tp?30:ty+12,SIDE,tp?bot-26:bot-ty-8,tp?lean2:st?0:(c%2?-.12:.15),'50% 100%'),'inner');kid(mk('post',cx+CW-SIDE,tp?30:ty+12,SIDE,tp?bot-26:bot-ty-8,tp?-lean2:st?0:(c%2?.15:-.1),'50% 100%'),'rshade');
        mk('ground',cx-40,bot+34,CW+80,34);mk('skirt',cx-6,bot,CW+12,24);mk('foot',cx+8,bot+24,30,18);
        if(st)mk('foot',cx+CW-38,bot+24,30,18);else{mk('foot',cx+CW-40,bot+24,30,9);mk('wedge',cx+CW-46,bot+33,42,9)}
        mk('cap',cx,bot+62,CW,34).textContent=CASES[c].name;
        const lean=st?0:(LEAN[c]!=null?LEAN[c]:(c%2?-.25:.2));(tp?mk('topb',cx-18+(colW*tp)/2,ty,CW+36-colW*tp,TB,0,'50% 50%'):mk('topb',cx-18,ty,CW+36,TB,lean,'50% 50%'));
        const ln=lean*RAD,mx=cx+CW/2,my=ty+TB/2;
        G[-1-c]={ox:mx-(CW/2)*Math.cos(ln)+(TB/2)*Math.sin(ln),by:my-(CW/2)*Math.sin(ln)-(TB/2)*Math.cos(ln),th:ln,colW:CW,front:2,c}}
      BOX=null;
      curios.forEach(c=>{c._ax=null});
      if(m.real&&!tk)CASES.forEach((cs,c)=>{if(!cs.layers)return;for(let rw=0;rw<cs.n;rw++){const si=CS[c]+rw,g=G[si];let gx=L[si].width+6;
        curios.filter(q=>q.s===si&&!cpos[q.id]).sort((a,b)=>a.x-b.x).forEach(q=>{if(gx+q.w<=g.colW-PAD){q._ax=gx;gx+=q.w+12}})}});
      curios.forEach(putCurio);
      root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
      arrange()}
    /* How the bookcases stand. On a wide screen: a ring for choosing (one in front, its neighbours swinging away behind it
       to each side), one case open at full size with the others faded out, or all of them in rows. On a narrow screen: a plain
       list, one under another, with nothing to open. Depth is only drawn where there is perspective: the ring and the open case. */
    function arrange(){const NC=CASES.length,narrow=cols!==2,W0=Math.min(...boxes.map(b=>b._w)),mode=narrow?'list':'rows';
      ['ring','open','rows','list'].forEach(k=>caseEl.classList.toggle('lb-'+k,k===mode));
      boxes.forEach(b=>{b._z=1;b.style.zoom='';b.style.opacity='';b.style.visibility='';b.style.transformOrigin=''});
      if(mode==='list'){let y=0;boxes.forEach(b=>{b._z=W0/b._w;b.style.zoom=b._z;b.style.left='0px';b.style.top=(y/b._z)+'px';b.style.transform='none';b.style.zIndex=1;b.classList.add('lb-front');y+=b._h*b._z+30});
        caseW=W0;caseH=y;caseEl.style.perspective='none'}
      else if(mode==='rows'){const H=Math.max(...boxes.map(b=>b._h));let x=0;boxes.forEach(b=>{b.style.left=x+'px';b.style.top=(H-b._h)+'px';b.style.transform='none';b.style.zIndex=1;b.classList.add('lb-front');x+=b._w+CG});
        caseW=x-CG;caseH=H;caseEl.style.perspective='none'}
      else if(mode==='open'){const f=boxes[focus];caseW=f._w;caseH=f._h;caseEl.style.perspective=Math.round(f._w*2.2)+'px';caseEl.style.perspectiveOrigin='50% 42%';
        boxes.forEach((b,c)=>{const on=c===focus;b.style.left=((f._w-b._w)/2)+'px';b.style.top=(f._h-b._h)+'px';b.style.transform='none';b.style.zIndex=on?5:1;b.style.opacity=on?1:0;b.style.visibility=on?'':'hidden';b.classList.toggle('lb-front',on)})}
      else{const H=Math.max(...boxes.map(b=>b._h*W0/b._w)),SW=W0*1.9;caseW=SW;caseH=H;caseEl.style.perspective=Math.round(W0*2.4)+'px';caseEl.style.perspectiveOrigin='50% 45%';
        boxes.forEach((b,c)=>{let d=((c-focus)%NC+NC)%NC;if(d>NC/2)d-=NC;const a=Math.abs(d),sg=d<0?-1:1,k=W0/b._w;b.style.left=((SW-b._w)/2)+'px';b.style.top=(H-b._h)+'px';b.style.transformOrigin='50% 100%';
          b.style.transform=(a===0?'translateZ(0px)':a===1?`translateX(${Math.round(sg*W0*.6)}px) translateZ(${Math.round(-W0*.5)}px) rotateY(${sg*40}deg)`:`translateX(${Math.round(sg*W0*.2)}px) translateZ(${Math.round(-W0*1.1)}px) rotateY(${sg*10}deg)`)+(k<.999?` scale(${k.toFixed(4)})`:'');
          b.style.zIndex=10-a;b.style.visibility=a>1?'hidden':'';b.classList.toggle('lb-front',a===0)})}
      if(navEl){navEl.querySelectorAll('[data-c]').forEach(b=>{b.hidden=narrow;b.setAttribute('aria-pressed',mode!=='rows'&&+b.dataset.c===focus?'true':'false')});
        const t=navEl.querySelector('[data-view]');if(t){t.hidden=narrow;t.textContent=mode==='rows'?'Show as a ring':'Show in rows'}
        navEl.querySelectorAll('[data-step]').forEach(b=>{b.hidden=mode!=='ring'});
        const k=navEl.querySelector('[data-tuck]');if(k){k.textContent=tucked?'Show every book':'How it really is';k.setAttribute('aria-pressed',tucked?'true':'false')}}
      fit()}
    function turn(c){focus=((c%CASES.length)+CASES.length)%CASES.length;if(view==='rows')view='ring';select(null);arrange()}
    function openCase(c){focus=c;view='open';zoom=1;arrange()}
    function toRing(){if(view!=='open')return;view='ring';zoom=1;select(null);arrange()}
    const navEl=document.getElementById('lib-nav');
    if(navEl){const B=(txt,lab,fn,attr,val)=>{const b=document.createElement('button');b.type='button';b.className='lib-ctl lib-navb';b.textContent=txt;if(lab)b.setAttribute('aria-label',lab);if(attr)b.setAttribute(attr,val);b.onclick=fn;navEl.appendChild(b);return b};
      if(CTX.close){const bar=root.querySelector('.lib-bar'),bk=document.createElement('button');bk.type='button';bk.className='lib-ctl';bk.id='lib-back';bk.textContent='\u2039 '+(CTX.backLabel||'All shelves');bk.onclick=()=>CTX.close();if(bar)bar.insertBefore(bk,bar.firstChild);
        if(CTX.list&&bar){const lb=document.createElement('button');lb.type='button';lb.className='lib-ctl';lb.id='lib-shelfbooks';lb.textContent='Books on this shelf';lb.onclick=()=>CTX.list();bar.insertBefore(lb,bk.nextSibling)}}
      if(!CTX.landing&&CASES.some(c=>c.layers))B('How it really is',null,()=>{tucked=!tucked;render(MODES[current].real?current:'shelved')},'data-tuck','1')}
    if(CTX.landing)boxes.forEach((b,i)=>{b.tabIndex=0;b.setAttribute('role','button');b.setAttribute('aria-label','Open '+CASES[i].name);b.addEventListener('click',()=>CTX.pick(i));
      b.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();CTX.pick(i)}})});
    if(document.addEventListener){onDoc('click',ev=>{const t=ev.target;if(root.classList.contains('lib-warm'))return;if(CTX.close&&t&&t.closest&&t.isConnected!==false&&!t.closest('.lb-box,.lib-bar,.lib-nav,#lib-info,.lib-zoomreset,.lib-tools,.lib-msg,.lib-menu,.lib-topics,#lib-palette'))CTX.close()});
      onDoc('keydown',ev=>{if(ev.altKey||ev.ctrlKey||ev.metaKey||root.classList.contains('lib-warm'))return;const t=ev.target&&ev.target.tagName;if(t&&/INPUT|SELECT|TEXTAREA/.test(t))return;if(ev.target&&ev.target.closest&&ev.target.closest('.lib-menu,.lib-topics'))return;
        if(ev.key==='Escape'){if(zoom>1.01)resetZoom();else if(sel)select(null);else if(CTX.close)CTX.close()}
        else if(view==='ring'&&cols===2){if(ev.key==='ArrowLeft')turn(focus-1);else if(ev.key==='ArrowRight')turn(focus+1);else if(ev.key==='Enter'&&ev.target===document.body)openCase(focus)}})}
    /* Zoom lays the case out again at the new size, so lettering is redrawn sharp at every level, and nothing crops it:
       a zoomed case simply grows across and down the page. A small floating button, or Escape, puts it back. */
    const zr=document.createElement('button');zr.type='button';zr.className='lib-zoomreset';zr.hidden=true;zr.setAttribute('aria-label','Reset zoom');zr.title='Reset zoom';
    zr.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/></svg>';root.appendChild(zr);
    function resetZoom(){zoom=1;fit();if(vp.scrollIntoView)vp.scrollIntoView({block:'nearest'});try{window.scrollTo(0,window.scrollY)}catch(err){}}
    zr.onclick=resetZoom;
    function fit(){const vw=vp.clientWidth,col=(root.getBoundingClientRect&&root.getBoundingClientRect().width)||vw;let base;
      /* The landing fits the row of bookcases to the text column, a little wider if it must. An open bookcase is half the column wide. */
      if(cols!==2)base=(vw-16)/caseW;else if(CTX.landing)base=Math.min(col*1.1,vw-32)/caseW;else base=Math.min((col/2)/(CTX.stdW||caseW),(vw-32)/caseW);
      const s=base*zoom;scale=s;caseEl.style.width=caseW+'px';caseEl.style.height=caseH+'px';
      if(CTX.landing){caseEl.style.zoom='';caseEl.style.transform='scale('+s+')'}else{caseEl.style.transform='';caseEl.style.zoom=s}
      sizer.style.width=Math.ceil(caseW*s)+'px';sizer.style.height=Math.ceil(caseH*s)+'px';
      if(CTX.std){const w=boxes.filter((b,i)=>!CASES[i].layers).map(b=>b._w);if(w.length)CTX.std(Math.min(...w))}
      zr.hidden=zoom<=1.01;document.documentElement.classList.toggle('lib-zoomed',zoom>1.01)}
    function zoomTo(z,cxv,cyv){const r=caseEl.getBoundingClientRect(),px=(cxv-r.left)/scale,py=(cyv-r.top)/scale;zoom=Math.max(1,Math.min(6,z));fit();
      const r2=caseEl.getBoundingClientRect();window.scrollBy(r2.left+px*scale-cxv,r2.top+py*scale-cyv)}
    vp.addEventListener('wheel',ev=>{if(CTX.landing||(!ev.ctrlKey&&!ev.metaKey))return;ev.preventDefault();zoomTo(zoom*Math.exp(-Math.max(-30,Math.min(30,ev.deltaY))*.01),ev.clientX,ev.clientY)},{passive:false});
    let pz=null;const td=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
    vp.addEventListener('touchstart',ev=>{if(!CTX.landing&&ev.touches.length===2)pz={d:td(ev.touches),z:zoom}},{passive:true});
    vp.addEventListener('touchmove',ev=>{if(pz&&ev.touches.length===2){ev.preventDefault();zoomTo(pz.z*td(ev.touches)/pz.d,(ev.touches[0].clientX+ev.touches[1].clientX)/2,(ev.touches[0].clientY+ev.touches[1].clientY)/2)}},{passive:false});
    vp.addEventListener('touchend',()=>{pz=null});
    let rt;onWin('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{(vp.clientWidth>=900?2:1)!==cols?render(current):fit()},150)});

    let sel=null;
    function focusSel(){if(sel)setTimeout(()=>sel.el.scrollIntoView({block:'nearest',inline:'center'}),60)}
    function add(parent,tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className='lb-'+cls;parent.appendChild(n);return n}
    function realCover(e,cv){if(e.t.startsWith('UNIDENTIFIED'))return;
      const show=u=>{if(sel!==e||!u)return;const im=new Image();im.alt='Cover of '+e.t;im.onload=()=>{if(sel===e&&im.naturalWidth>40){cv.textContent='';cv.classList.add('lb-photo');cv.appendChild(im)}};im.src=u};
      if(e.cover){show(e.cover);return}
      if(COVERS==='none')return;
      let cache={};try{cache=JSON.parse(localStorage.getItem('dungeon-library-covers')||'{}')}catch(err){}
      if(e.t in cache){show(cache[e.t]);return}
      const t=e.t.replace(/\(.*?\)/g,'').split(':')[0].trim(),a=(e.a||'').split(/,| and | with /)[0].trim();
      fetch('https://openlibrary.org/search.json?limit=1&fields=cover_i&title='+encodeURIComponent(t)+(a?'&author='+encodeURIComponent(a):''))
        .then(r=>r.json()).then(d=>{const id=d.docs&&d.docs[0]&&d.docs[0].cover_i,u=id?'https://covers.openlibrary.org/b/id/'+id+'-M.jpg':'';
          cache[e.t]=u;try{localStorage.setItem('dungeon-library-covers',JSON.stringify(cache))}catch(err){}show(u)}).catch(()=>{})}
    function select(e){if(sel)sel.el.classList.remove('lb-sel');info.textContent='';info.classList.remove('lb-on');
      if(sel===e||!e||e.item){sel=null;return}
      sel=e;e.el.classList.add('lb-sel');info.classList.add('lb-on');
      if(e.curio){const f=add(info,'div',null,'f');add(f,'h2',e.name||'Curio');add(f,'p',e.note||'No details yet.');
        add(f,'p',(e.s<0?'On top of the '+CASES[-1-e.s].name.toLowerCase():where(e.s))+', position '+(+e.x).toFixed(2));add(f,'button','Close','ctl').onclick=()=>select(sel);return}
      const cv=add(info,'div',null,'cover');cv.style.setProperty('--c',e.c);cv.style.color=e.oc;
      add(cv,'i').innerHTML=`<svg width="46" height="46" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${e.emb}</svg>`;
      const ct=add(cv,'b',e.t.startsWith('UNIDENTIFIED')?'Unidentified':e.t);ct.style.color=e.tc;ct.style.fontSize=e.t.length>60?'10px':e.t.length>34?'12px':'15px';
      add(cv,'small',e.a||'');realCover(e,cv);
      const f=add(info,'div',null,'f');add(f,'h2',e.t);if(e.a)add(f,'p',e.a);
      add(f,'p',[e.g,e.h>180?'Tall':e.h>158?'Medium':'Short',e.cn.charAt(0).toUpperCase()+e.cn.slice(1),e.p].filter(Boolean).join(', '));
      if(e.tags&&e.tags.length)add(f,'p',e.tags.join(', '));
      add(f,'p','Real spot: '+where(e.s)+({top:', lying on top of the row',stack:', in the flat pile',face:', cover facing out'}[e.pl]||''));
      add(f,'button','Close','ctl').onclick=()=>select(sel)}

    const sortSel=document.getElementById('lib-sortSel'),patSel=document.getElementById('lib-patSel'),menus=[];
    function fill(el,keys,ph){const o=document.createElement('option');o.value='';o.textContent=ph;el.appendChild(o);
      keys.forEach(k=>{const q=document.createElement('option');q.value=k;q.textContent=MODES[k].label;el.appendChild(q)});el.onchange=()=>{if(el.value)render(el.value)}}
    fill(sortSel,Object.keys(MODES).filter(k=>!MODES[k].pat&&!MODES[k].own),'Pick a sort');fill(patSel,Object.keys(MODES).filter(k=>MODES[k].pat),'Pick a pattern');
    document.getElementById('lib-handBtn').onclick=()=>render('manual');
    /* Menus in the page's own style. With a mouse, Sort and Pattern open a panel of the theme's making; on a touch screen they
       keep the phone's own picker behind the same pill. Topic opens a panel of chips, grouped, on every device. */
    const fine=typeof matchMedia==='function'&&matchMedia('(hover: hover) and (pointer: fine)').matches,
      CHEV='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
      ICON=p=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>',
      EYE='<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
    const closeAll=x=>menus.forEach(m=>{if(m!==x)m.close()});
    const place=panel=>{panel.classList.remove('lib-up');if(panel.getBoundingClientRect&&panel.getBoundingClientRect().bottom>window.innerHeight-8)panel.classList.add('lib-up')};
    const pill=btn=>{const lab=document.createElement('span'),ch=document.createElement('i');ch.innerHTML=CHEV;btn.appendChild(lab);btn.appendChild(ch);return lab};
    function menu(sel){const wrap=sel.parentNode,btn=document.createElement('button'),panel=document.createElement('div'),opts=[];
      btn.type='button';btn.className='lib-pill';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');panel.className='lib-menu';panel.hidden=true;panel.setAttribute('role','listbox');const lab=pill(btn);
      const m={close(){panel.hidden=true;btn.setAttribute('aria-expanded','false')},update(){const o=sel.options[sel.selectedIndex];lab.textContent=o?o.textContent:'';opts.forEach((b,i)=>b.setAttribute('aria-selected',i===sel.selectedIndex?'true':'false'))}};
      [].forEach.call(sel.options,(o,i)=>{const b=document.createElement('button');b.type='button';b.className='lib-opt';b.setAttribute('role','option');b.textContent=o.textContent;b.hidden=!o.value;
        b.onclick=()=>{sel.selectedIndex=i;m.close();m.update();if(sel.onchange)sel.onchange();btn.focus()};opts.push(b);panel.appendChild(b)});
      btn.onclick=()=>{const open=panel.hidden;closeAll();if(open){panel.hidden=false;btn.setAttribute('aria-expanded','true');place(panel);const cur=opts[sel.selectedIndex]&&!opts[sel.selectedIndex].hidden?opts[sel.selectedIndex]:opts.find(b=>!b.hidden);if(cur)cur.focus()}};
      panel.addEventListener('keydown',ev=>{const vis=opts.filter(b=>!b.hidden),k=vis.indexOf(document.activeElement);
        if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();const n=vis[(k+(ev.key==='ArrowDown'?1:-1)+vis.length)%vis.length];if(n)n.focus()}else if(ev.key==='Escape'){m.close();btn.focus()}});
      sel.classList.add('lib-native');sel.tabIndex=-1;wrap.appendChild(btn);wrap.appendChild(panel);menus.push(m);m.update()}
    if(fine){menu(sortSel);menu(patSel)}
    const TOPICS={'Fiction':['Fantasy','Epic fantasy','Sci-fi','Space opera','Thriller','Techno-thriller','Spy & military','Adventure','Fiction','Young adult','Classics & poetry','Humour','Mythology & folklore'],
      'Non-fiction':['Science','Space','Physics & cosmology','Evolution & biology','Nature','History & politics','India','Religion & atheism','Big ideas','Memoir','Biography','Women','Photography & art'],
      'Comics':['Comics','Batman','Superman','Justice League','DC events','Marvel','Other comics'],'Series':['The Expanse','Malazan','Cosmere']};
    {const tb=document.getElementById('lib-topicBtn'),tp=document.getElementById('lib-topicPanel'),cnt={},chips=[];books.forEach(b=>(b.tags||[]).forEach(t=>{cnt[t]=(cnt[t]||0)+1}));
      const all=Object.keys(cnt);
      if(tb&&tp){if(!all.length)tb.parentNode.hidden=true;const lab=pill(tb);
        const m={close(){tp.hidden=true;tb.setAttribute('aria-expanded','false')},update(){lab.textContent=topic||'All topics';chips.forEach(c=>c.setAttribute('aria-pressed',c.dataset.t===topic?'true':'false'))}};
        const chip=(t,text)=>{const b=document.createElement('button');b.type='button';b.className='lib-chip';b.dataset.t=t;b.textContent=text;b.onclick=()=>{topic=t;applyTopic(true);m.update();m.close();tb.focus()};chips.push(b);return b};
        const row=(title,keys)=>{keys=keys.filter(k=>cnt[k]).sort((a,b)=>cnt[b]-cnt[a]||a.localeCompare(b));if(!keys.length)return;
          if(title){const h=document.createElement('p');h.className='lib-group';h.textContent=title;tp.appendChild(h)}
          const d=document.createElement('div');d.className='lib-chips';keys.forEach(k=>d.appendChild(chip(k,k+' '+cnt[k])));tp.appendChild(d)};
        {const d=document.createElement('div');d.className='lib-chips';d.appendChild(chip('','All topics'));tp.appendChild(d)}
        const used={};Object.keys(TOPICS).forEach(g=>{TOPICS[g].forEach(k=>{used[k]=1});row(g,TOPICS[g])});row('More',all.filter(k=>!used[k]));
        tb.onclick=()=>{const open=tp.hidden;closeAll();if(open){tp.hidden=false;tb.setAttribute('aria-expanded','true');place(tp)}};
        tp.addEventListener('keydown',ev=>{if(ev.key==='Escape'){m.close();tb.focus()}});menus.push(m);m.update()}}
    if(document.addEventListener)onDoc('click',ev=>{if(!ev.target||!ev.target.closest||!ev.target.closest('.lib-field'))closeAll()});
    {const cb=document.getElementById('lib-curioBtn'),rb=document.getElementById('lib-curioReset');let hid=false;try{hid=localStorage.getItem('dungeon-library-nocurios')==='1'}catch(err){}
      const setHid=()=>{caseEl.classList.toggle('lb-nocurios',hid);if(cb){const t=hid?'Show curios':'Hide curios';cb.innerHTML=ICON(EYE+(hid?'<path d="M4 4l16 16"/>':''));cb.setAttribute('aria-label',t);cb.title=t;cb.setAttribute('aria-pressed',hid?'true':'false')}};
      if(cb){cb.hidden=!curios.length;cb.onclick=()=>{hid=!hid;try{localStorage.setItem('dungeon-library-nocurios',hid?'1':'0')}catch(err){}setHid();msg.textContent=hid?'Curios hidden.':'Curios back on the shelves.'}}
      if(rb){rb.hidden=!curios.length;rb.innerHTML=ICON('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>');rb.onclick=()=>{cpos={};try{localStorage.removeItem('dungeon-library-curios'+KS)}catch(err){}curios.forEach(c=>{c.s=c.s0;c.x=c.x0;c.dy=c.dy0;putCurio(c)});msg.textContent='Curios put back where they started.'}}
      setHid()}
    document.getElementById('lib-link').onclick=()=>{const u=shareUrl(),ok=()=>{msg.textContent='Link copied. Anyone who opens it sees this exact arrangement.'};
      try{navigator.clipboard.writeText(u).then(ok,()=>window.prompt('Copy this link',u))}catch(err){window.prompt('Copy this link',u)}};
    document.getElementById('lib-restart').onclick=()=>{manual=null;render('manual');saveManual()};
    (function(){const c={};books.forEach(b=>{(c[b.cn]=c[b.cn]||{n:0,b}).n++});const p=document.getElementById('lib-palette');
      Object.values(c).sort((x,y)=>byHue(x.b,y.b)).forEach(v=>{const s=document.createElement('span'),i=document.createElement('i');i.style.background=v.b.c;s.appendChild(i);s.appendChild(document.createTextNode(v.n));s.title=v.b.cn;p.appendChild(s)})})();
    {const touch=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
      if(touch)MODES.manual.note=' On a touch screen, tap and hold a book to pick it up.'}
    render('shelved');
    if(CTX.sel!=null){const e=books.find(b=>b._g===CTX.sel);if(e)select(e)}
    if(location.hash.indexOf('#'+PFX+'.')===0){const sh=dec(location.hash.slice(1));if(sh){manual=normalise(sh);render('manual')}else msg.textContent='That link does not match the books on the shelves now, so the shelves are shown as they really are.'}
    const done=()=>{if(CTX.ready)setTimeout(CTX.ready,50)};
    /* The lettering is measured with its own font. If that font is already loaded (it is fetched ahead of time) the first draw is
       right; otherwise draw again once it arrives. */
    const fontReady=!!(document.fonts&&document.fonts.check&&document.fonts.check("12px 'IM Fell English SC'"));
    if(!fontReady&&document.fonts&&document.fonts.load)document.fonts.load("12px 'IM Fell English SC'").then(()=>{books.forEach(b=>b.f=null);render(current)}).catch(()=>{}).then(done);else done();
  }
})();
