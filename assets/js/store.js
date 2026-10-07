/* Watchlist pages: reads a shelf (a JSON file of tracked items), works out each item's verdict from the shelf's
   rules, and draws the shelf, its filters and the item sheet. Everything from the file is written as text. */
(function () {
  'use strict';
  var root = document.querySelector('.store');
  var sheet = document.querySelector('.store-sheet');
  var VERDICTS = [
    { key: 'must', label: 'Must Buy' },
    { key: 'fair', label: 'Fair Price' },
    { key: 'wait', label: 'Wait for Sale' },
    { key: 'new', label: 'Collecting Data' },
    { key: 'skip', label: 'Skip' }
  ];
  /* mustGrace: a price within this much of the Must Buy price still counts (a few rupees should not decide it).
     newDays: how long an item is "Collecting Data" before it is judged like any other.
     usualDays: an item may carry a usual price (`orp`, with `orpDays`, how many days of record it rests on). Once the
     record is this long the discount is measured from the usual price and not from MRP, and a Must Buy is
     usualMustOff under it. With a shorter record the item is Collecting Data. */
  var DEFAULTS = { mustOff: 0.4, mustGrace: 0.02, nearLow: 0.03, nearLowOff: 0.25, fairOff: 0.15, newDays: 30, newOff: 0.15, lowRowOff: 0.1, usualDays: 30, usualMustOff: 0.25 };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var PAGE = 60;
  var taglines = {}; // a handwritten line beside a row's heading, set in the watchlist page's own text
  var shelves = [], shelf = null, filter = 'all', sortBy = 'verdict', shown = PAGE, view = [], at = 0;
  var VALUE_ROW = 6, VALUE_MIN = 8; // the per-piece row shows this many items, once at least this many have a piece count

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function money(v) { try { return shelf.currency + Math.round(v).toLocaleString(shelf.locale || 'en-IN'); } catch (e) { return shelf.currency + Math.round(v); } }
  function monthYear(d) { var m = /^(\d{4})-(\d{2})/.exec(d || ''); return m ? MONTHS[+m[2] - 1] + ' ' + m[1] : ''; }
  function fullDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? +m[3] + ' ' + MONTHS[+m[2] - 1] + ' ' + m[1] : (d || ''); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  /* Whether a link earns a commission: it already carries a tag, or the theme's affiliate tag is switched on for
     this page (see the Amazon affiliate tag note in site.js) and the link goes to that Amazon site */
  function meta(n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? (m.getAttribute('content') || '').trim().toLowerCase() : ''; }
  function isAffiliate(u) {
    try {
      var url = new URL(u); if (url.searchParams.get('tag')) return true;
      if (!meta('amazon-tag') || meta('amazon-tag-store') !== 'on') return false;
      return url.hostname.toLowerCase().replace(/^www\./, '') === (meta('amazon-tag-domain') || 'amazon.in').replace(/^www\./, '');
    } catch (e) { return false; }
  }
  var AFF = 'I may earn a commission if you buy.';
  function tilt(code) {
    var max = parseFloat(document.body.getAttribute('data-tilt')); if (!isFinite(max)) max = 2.5;
    var h = 0, s = String(code); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return ((h / 997) - 0.5) * 2 * Math.min(max, 4);
  }

  /* One item, with everything worked out: discount, where today's price sits, verdict */
  function judge(it, rules) {
    var o = { it: it };
    o.priced = num(it.price);
    o.shop = shopOf(it); // another shop's price, while its sale lasts
    o.shopSave = o.shop && o.priced && o.shop.price < it.price ? it.price - o.shop.price : 0;
    o.mrp = num(it.mrp) ? it.mrp : null;
    o.usual = usualOf(it, rules);
    /* Some record but too little to say what is usual, on an item that really is new: Collecting Data. An older item whose
       usual price is not worked out yet (its tracking began before the record did) keeps being judged from MRP. */
    o.thin = o.usual == null && num(it.orp) && !(num(it.days) && it.days >= rules.usualDays);
    o.base = o.usual != null ? o.usual : o.mrp; // what the discount is measured from
    o.mustOff = o.usual != null ? rules.usualMustOff : rules.mustOff;
    o.off = o.priced && o.base ? Math.max(0, 1 - it.price / o.base) : 0;
    o.atLow = o.priced && num(it.low) && it.price <= it.low * (1 + rules.nearLow);
    o.pos = o.priced && o.base && num(it.low) && o.base > it.low ? Math.min(1, Math.max(0, (it.price - it.low) / (o.base - it.low))) : null;
    var v = it.verdict;
    if (!v) {
      o.over = o.priced && o.mrp != null && it.price > o.mrp * 1.02; // priced above MRP: not the going rate
      if (it.pending && !o.priced) v = 'new';
      else if (!o.priced || it.seller === 'other' || o.over) v = 'skip';
      else if (o.thin) v = 'new'; // never a Must Buy before the usual price is known
      else if (o.off >= o.mustOff ||(o.atLow && o.off >= rules.nearLowOff) || withinMust(it, rules)) v = 'must';
      else if (num(it.days) && it.days < rules.newDays && o.off < rules.newOff) v = 'new';
      else if (o.off >= rules.fairOff) v = 'fair';
      else v = 'wait';
    }
    o.verdict = v;
    /* Price per piece, where the shelf gives a piece count */
    o.ppp = o.priced && v !== 'skip' && num(it.pieces) && it.pieces > 0 ? it.price / it.pieces : null;
    o.flags = (it.flags || []).slice();
    if (v !== 'skip' && o.atLow && o.off >= rules.lowRowOff) o.flags.unshift('Lowest Ever');
    return o;
  }
  function withinMust(it, rules) { var mp = mustPrice(it, rules); return mp != null && num(it.price) && it.price <= mp * (1 + (Number(rules.mustGrace) || 0)); }
  /* The highest price at which an item counts as a Must Buy under the shelf's rules (null if it can't be worked out) */
  function mustPrice(it, rules) {
    var usual = usualOf(it, rules), base = usual != null ? usual : (num(it.mrp) ? it.mrp : null);
    if (base == null) return null;
    var deep = base * (1 - (usual != null ? rules.usualMustOff : rules.mustOff)), near = num(it.low) ? Math.min(it.low * (1 + rules.nearLow), base * (1 - rules.nearLowOff)) : 0;
    return Math.floor(Math.max(deep, near));
  }
  /* Another shop's price for an item (`shop`: name, price, optionally was, url, until). Counted only until its end date. */
  function shopOf(it) {
    var s = it && it.shop; if (!s || !num(s.price) || !(s.price > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(s.until || '')) return null;
    return new Date().toISOString().slice(0, 10) <= s.until ? s : null;
  }
  /* The usual price an item carries, if its record is long enough to trust; null otherwise */
  function usualOf(it, rules) { return num(it.orp) && it.orp > 0 && num(it.orpDays) && it.orpDays >= rules.usualDays ? it.orp : null; }
  /* "TODAY (4 Oct 2026)": the year sits in a span of its own, so a phone can drop it when it is this year */
  function dated(word, d) {
    var k = el('span', 'store-fig-k', word), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
    if (m) { k.appendChild(document.createTextNode(' (' + (+m[3]) + ' ' + MONTHS[+m[2] - 1])); var y = el('span', +m[1] === new Date().getFullYear() ? 'store-yr' : '', ' ' + m[1]); k.appendChild(y); k.appendChild(document.createTextNode(')')); }
    return k;
  }
  /* "LOWEST SINCE 4 OCT": for an item with no lowest on record yet, the lowest seen and from when */
  function since(word, d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return el('span', 'store-fig-k', m ? word + ' ' + (+m[3]) + ' ' + MONTHS[+m[2] - 1] : 'Lowest so far'); }
  function perPiece(v) { return shelf.currency + (v < 100 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v))); }
  /* The discount, written small beside a price. It steps up in strength with the shelf's own rules:
     plain below a fair discount, green from there, a solid green pill at a Must Buy discount. */
  function offTag(o) {
    if (!o.priced || !o.base || o.off < 0.005) return null;
    /* Steps go by the figure as shown, so "40% off" is never drawn weaker than the 40% it says; a Must Buy is always the strongest */
    var rules = rulesOf(shelf), shown = Math.round(o.off * 100) / 100, step = (shown >= o.mustOff || o.verdict === 'must') ? 2 : shown >= rules.fairOff ? 1 : 0;
    return el('span', 'store-off store-off--' + step, Math.round(o.off * 100) + '% off');
  }
  function rulesOf(s) { var rules = {}, k; for (k in DEFAULTS) rules[k] = DEFAULTS[k]; for (k in (s.rules || {})) rules[k] = s.rules[k]; return rules; }
  function label(key) { for (var i = 0; i < VERDICTS.length; i++) if (VERDICTS[i].key === key) return VERDICTS[i].label; return key; }
  function reason(o) {
    var it = o.it, when = monthYear(it.lowDate), hasLow = num(it.low), hit = hasLow ? money(it.low) + (when ? ' (' + when + ')' : '') : '';
    var lower = hasLow && o.priced && it.low < it.price * 0.97, days = num(it.days) && it.days > 0 ? it.days : 0;
    if (o.verdict === 'skip') return !o.priced ? 'No offer from the main seller.' : o.over ? 'Priced above MRP right now.' + (hasLow ? ' It has been as low as ' + hit + '.' : '') : 'Reseller listing. Not the going rate.';
    var under = o.usual != null && o.off >= 0.005 ? Math.round(o.off * 100) + '% under its usual price.' : '';
    if (o.verdict === 'must') return o.atLow ? 'At or near its lowest ever.' : under ? under + ' Rarely lower.' : 'Deep discount. Rarely lower.';
    if (o.verdict === 'new') return o.thin ? 'Only ' + (it.orpDays > 0 ? it.orpDays + ' days' : 'a day') + ' of prices. Too soon to say what is usual.' : days ? 'Only ' + days + ' days tracked. No real discount yet.' : 'Just added. No price history yet.';
    if (o.verdict === 'fair') return lower ? 'Decent, but it has hit ' + hit + '.' : hasLow ? 'Decent, and as low as it has been.' : 'Decent discount. No price history yet.';
    if (o.usual != null) return (o.priced && it.price > o.usual * 1.05 ? 'Above its usual price.' : 'Near its usual price.') + (lower ? ' It has hit ' + hit + '.' : '');
    return lower ? 'Near MRP. It has hit ' + hit + '.' : days ? 'No discount yet in ' + days + ' days tracked.' : 'Near MRP. No price history yet.';
  }

  function srcFor(it, s) { return safeUrl(it.image) || (s.imagePattern && it.image !== false ? safeUrl(String(s.imagePattern).replace(/\{code\}/g, encodeURIComponent(it.code))) : ''); }
  function tile(o, cls) {
    var t = el('span', cls || 'store-tile'); t.style.setProperty('--tilt', tilt(o.it.code).toFixed(2) + 'deg');
    /* The item's own image wins; otherwise the shelf's pattern (an address with {code} in it) is tried, and the
       code is shown if no picture comes back */
    var src = srcFor(o.it, shelf);
    var ph = el('span', 'store-ph', o.it.code);
    if (src) {
      var img = el('img'); img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.onerror = function () { if (img.parentNode) img.parentNode.replaceChild(ph, img); };
      img.src = src; t.appendChild(img);
    } else t.appendChild(ph);
    return t;
  }
  function chips(o, solid, bare) {
    var c = el('span', 'store-chips');
    var v = el('span', 'store-chip store-chip--' + o.verdict + (solid ? ' is-solid' : ''), label(o.verdict)); c.appendChild(v);
    if (o.value) c.appendChild(el('span', 'store-chip', 'Best per Piece'));
    if (o.shopSave) c.appendChild(el('span', 'store-chip', 'Cheaper at ' + o.shop.name));
    o.flags.forEach(function (f) { c.appendChild(el('span', 'store-chip', f)); });
    /* The price per piece is a figure, not a label: plain small text after the pills (the sheet shows it in its own line) */
    if (o.ppp != null && !bare) c.appendChild(el('span', 'store-ppp', perPiece(o.ppp) + ' / piece'));
    return c;
  }
  /* Under a card's price: the lowest price on record and when. Pointing at it shows the buy window
     (from the lowest price to the Must Buy price). An item still collecting data says how long it has been tracked. */
  function lowLine(o) {
    if (o.verdict === 'skip') return null;
    if (o.verdict === 'new' || !num(o.it.low)) return el('span', 'store-low', num(o.it.days) ? o.it.days + ' days tracked' : 'Not tracked yet');
    var line = el('span', 'store-low', 'low ' + money(o.it.low) + ' \u00b7 ' + monthYear(o.it.lowDate)), limit = mustPrice(o.it, rulesOf(shelf));
    if (limit != null && limit >= o.it.low) { line.setAttribute('data-tip', 'Buy window: ' + money(o.it.low) + ' \u2013 ' + money(limit) + (o.priced && o.it.price <= limit ? ' \u00b7 you\u2019re in it' : '')); line.className += ' has-tip'; }
    return line;
  }
  /* Featured cards. Must Buy and My Picks take the theme's six bold colours (the ones posts get from #red, #tangerine,
     #sunflower, #cobalt, #emerald and #ink); the other featured rows take the deepened pastels. Each card in a row gets
     a different colour, and an item's sheet opens in its card's colour. Four of the bold six are dark and carry white
     text; ink also gets a fine light edge, since it sits close to a dark page. */
  var TINTS = ['#9fe3c3', '#a3cff8', '#b4b4f7', '#d7b0ef', '#f6aebb', '#f8bd92', '#f3d56b', '#9fdede'].map(function (c) { return { c: c }; });
  var BOLD = [{ c: '#d0213a', dark: true }, { c: '#f47a20' }, { c: '#ffcc2e' }, { c: '#2349c9', dark: true }, { c: '#0b7d52', dark: true }, { c: '#2a2e37', dark: true, ink: true }];
  function tintFor(code, used, set) {
    var h = 0, t = String(code); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 997;
    var k = h % set.length, n = 0; while (used.indexOf(k) > -1 && n < set.length) { k = (k + 1) % set.length; n += 1; }
    used.push(k); return set[k];
  }
  function paint(node, tint, base) {
    node.style.setProperty('--tint', tint.c);
    node.className = (base || node.className).replace(/ ?is-(dark|ink|bold)/g, '') + (set(tint) ? ' is-bold' : '') + (tint.dark ? ' is-dark' : '') + (tint.ink ? ' is-ink' : '');
  }
  function set(tint) { return BOLD.indexOf(tint) > -1; }
  var HUES = ['red', 'tangerine', 'sunflower', 'cobalt', 'emerald', 'ink'];
  function head(o, level, feature) {
    var h = el('span', 'store-headline');
    h.appendChild(el('span', 'store-code', (o.it.group ? o.it.group + ' \u00b7 ' : '') + o.it.code));
    h.appendChild(el(level || 'h3', 'store-name', o.it.name));
    var say = o.it.line || o.it.note; if (say) h.appendChild(el('span', 'store-line', say));
    var p = el('span', 'store-price');
    if (o.priced) {
      var now = el('strong', o.verdict === 'skip' ? 'is-struck' : '', money(o.it.price)); p.appendChild(now);
      if (o.verdict === 'skip') p.appendChild(el('span', '', o.over ? 'above MRP ' + money(o.mrp) : 'reseller price'));
      else { var tag = offTag(o); if (tag) p.appendChild(tag); if (o.base) p.appendChild(el('span', '', (o.usual != null ? 'usually ' : 'MRP ') + money(o.base))); }
    } else p.appendChild(el('span', '', 'no offer'));
    h.appendChild(p);
    if (o.shopSave) h.appendChild(el('span', 'store-shop', o.shop.name + ' ' + money(o.shop.price) + ' · ' + money(o.shopSave) + ' less'));
    return h;
  }
  function card(o, i, feature) {
    var a = el('button', 'store-card store-card--' + o.verdict + (feature ? ' is-feature' : '')); a.type = 'button';
    a.setAttribute('data-i', i);
    var top = el('span', 'store-card-top'); top.appendChild(tile(o)); top.appendChild(head(o, null, feature)); a.appendChild(top);
    if (!feature) { var b = lowLine(o); if (b) a.appendChild(b); }
    a.appendChild(chips(o, feature));
    return a;
  }

  /* The price section and what follows it (when it hit its lows, what you paid): used by the item sheet and by an
     item's own page */
  function detail(o) {
    var it = o.it, out = [];
    if (o.priced || num(it.low)) {
      /* The price section: three prices on one line (today's the largest), then one plain sentence saying where
         the Must Buy price is and how far today is from it, then the buy button */
      var panel = el('div', 'store-panel'), figs = el('div', 'store-figs'), rules = rulesOf(shelf);
      var vs = el('div', 'store-figs-row is-prices'), ks = el('div', 'store-figs-row');
      var now = el('span', 'store-fig-today'); now.appendChild(el('strong', 'store-fig-v is-today', o.priced ? money(it.price) : '\u2014'));
      var tag = offTag(o); if (tag) now.appendChild(tag); else if (o.priced && o.base) now.appendChild(el('span', 'store-off store-off--0', o.usual != null ? (it.price > o.usual * 1.05 ? 'above usual' : 'at usual') : o.over ? 'above MRP' : 'at MRP'));
      vs.appendChild(now); var seen = !num(it.low) && num(it.seenLow); vs.appendChild(el('strong', 'store-fig-v', num(it.low) ? money(it.low) : seen ? money(it.seenLow) : '\u2014')); vs.appendChild(el('strong', 'store-fig-v', o.base ? money(o.base) : '\u2014'));
      ks.appendChild(dated('Today', it.checked || shelf.updated)); ks.appendChild(seen ? since('Lowest since', it.seenSince) : dated('Lowest', it.lowDate)); ks.appendChild(el('span', 'store-fig-k', o.usual != null ? 'Usual' : 'MRP'));
      figs.appendChild(vs); figs.appendChild(ks); panel.appendChild(figs);
      /* One short line: the Must Buy price, "Buy Now" when today is within it, or "Collecting Data" when there
         isn't enough history. The price per piece sits at its right when the shelf has a piece count. */
      var limit = mustPrice(it, rules), say = el('p', 'store-rule'), words = el('span', ''), dot = el('span', 'store-rule-dot');
      /* A listing to skip says why in a few words; it can still be bought from here */
      if (o.verdict === 'skip') { words.textContent = !o.priced ? 'No offer right now' : o.over ? 'Above MRP' : 'Reseller price'; dot.className += ' is-red'; }
      else if (o.verdict === 'new' || limit == null || !o.priced) { words.textContent = 'Collecting Data'; dot.className += ' is-amber'; }
      else if (o.verdict === 'must' || it.price <= limit) words.textContent = 'Buy Now';
      else { words.appendChild(document.createTextNode('Must Buy under ')); words.appendChild(el('strong', '', money(limit))); }
      say.appendChild(dot);
      say.appendChild(words);
      if (o.ppp != null) say.appendChild(el('span', 'store-rule-ppp', perPiece(o.ppp) + ' per piece \u00b7 ' + it.pieces.toLocaleString(shelf.locale || 'en-IN') + ' pieces'));
      /* The label's MRP is not what the verdict goes by; when it is far above the usual price, say so */
      if (o.usual != null && o.mrp != null && o.mrp > o.usual * 1.15) say.appendChild(el('span', 'store-rule-ppp', 'Listed MRP ' + money(o.mrp) + ' is well above the usual price'));
      panel.appendChild(say);
      var buyUrl = safeUrl(it.url);
      if (buyUrl) {
        var buy = el('div', 'store-buy'), go = el('a', 'store-go', o.priced ? (shelf.linkLabel || 'Buy') : 'View on Amazon'); go.href = buyUrl; go.target = '_blank'; go.rel = 'noopener';
        buy.appendChild(go); if (isAffiliate(buyUrl)) { go.rel = 'sponsored nofollow noopener'; buy.appendChild(el('span', 'store-aff', AFF)); }
        panel.appendChild(buy);
      }
      /* Another shop's price for the same item, said plainly whichever way it falls, with a plain link (no referral) and what comes with it */
      if (o.shop) {
        var sl = el('div', 'store-shopline'), diff = o.priced ? o.shop.price - it.price : null, su = safeUrl(o.shop.url), ends = /^(\d{4})-(\d{2})-(\d{2})$/.exec(o.shop.until);
        sl.appendChild(el('strong', '', o.shop.name + ': ' + money(o.shop.price)));
        sl.appendChild(el('span', '', (num(o.shop.was) ? ' (regular ' + money(o.shop.was) + ')' : '') + (diff == null ? '' : diff < 0 ? ', ' + money(-diff) + ' less than Amazon' : diff > 0 ? ', ' + money(diff) + ' more than Amazon' : ', the same as Amazon')));
        if (su) { var gs = el('a', 'store-shopgo', 'See it at ' + o.shop.name); gs.href = su; gs.target = '_blank'; gs.rel = 'noopener'; sl.appendChild(gs); }
        var sale = shelf.shopSale || {}, note = 'Sale until ' + (ends ? (+ends[3]) + ' ' + MONTHS[+ends[2] - 1] : o.shop.until) + (sale.perks ? '. ' + sale.perks : '') + '.';
        sl.appendChild(el('span', 'store-shopnote', note));
        panel.appendChild(sl);
      }
      out.push(panel);
      var line = graphBox(it); if (line) out.push(line);
    }
    if (!(o.priced || num(it.low)) && safeUrl(it.url)) { var only = el('div', 'store-panel'), b0 = el('div', 'store-buy'), g0 = el('a', 'store-go', 'View on Amazon'); g0.href = safeUrl(it.url); g0.target = '_blank'; g0.rel = isAffiliate(g0.href) ? 'sponsored nofollow noopener' : 'noopener'; b0.appendChild(g0); only.appendChild(b0); out.push(only); }
    var extra = el('div', 'store-extra'), wins = shelf.sale && shelf.sale.windows || [];
    if (o.verdict !== 'skip' && wins.length && it.lows && it.lows.length) {
      var w = el('div', 'store-panel'); w.appendChild(el('span', 'store-stat-k', 'Lows hit in')); var row = el('span', 'store-chips');
      wins.forEach(function (n) { row.appendChild(el('span', 'store-chip' + (sameMonths(it.lows, n) ? ' store-chip--must' : ' is-off'), n)); });
      w.appendChild(row); extra.appendChild(w);
    }
    if (it.paid) { var p = el('div', 'store-panel'); p.appendChild(el('span', 'store-stat-k', 'I paid')); p.appendChild(el('strong', 'store-paid', it.paid)); extra.appendChild(p); }
    if (extra.childNodes.length) out.push(extra);
    return out;
  }
  /* A price line for the last year, drawn from the price history the list's server supplies for the item. Only for lists
     served by such a server; an item with fewer than two points shows nothing. */
  function graphBox(it) {
    var src = shelf.__src || '', m = /^(.*\/watch\/[a-z0-9-]+)\.json(?:[?#].*)?$/i.exec(src), asin = (/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i.exec(it.url || '') || [])[1];
    if (!m || !asin) return null;
    var box = el('div', 'store-panel store-graph'), rules = rulesOf(shelf), mine = shelf; box.hidden = true;
    fetch(m[1] + '/history?asin=' + asin).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      var pts = (d.points || []).map(function (p) { return [Date.parse(p[0]), Number(p[1])]; }).filter(function (p) { return p[0] && p[1] > 0; });
      if (pts.length < 2) return;
      var keep = shelf; shelf = mine; try { drawGraph(box, pts, it, rules); box.hidden = false; } finally { shelf = keep; }
    }).catch(function () {});
    return box;
  }
  function drawGraph(box, pts, it, rules) {
    var NS = 'http://www.w3.org/2000/svg', W = 640, H = 190, L = 8, R = 8, T = 16, B = 26;
    function s(tag, attrs, text) { var n = document.createElementNS(NS, tag), k; for (k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; }
    var now = Date.now(), t0 = pts[0][0], t1 = Math.max(now, pts[pts.length - 1][0]), must = mustPrice(it, rules), usual = usualOf(it, rules), mrp = usual != null ? usual : (num(it.mrp) ? it.mrp : null);
    var vals = pts.map(function (p) { return p[1]; }), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals.concat(mrp ? [mrp] : []));
    var pad = Math.max(1, (hi - lo) * 0.12), y0 = lo - pad, y1 = hi + pad;
    function X(t) { return L + (W - L - R) * (t1 === t0 ? 1 : (t - t0) / (t1 - t0)); }
    function Y(v) { return T + (H - T - B) * (1 - (v - y0) / (y1 - y0)); }
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'store-graph-svg', role: 'img', 'aria-label': 'Price over time. Lowest ' + money(lo) + '.' });
    function rule(v, cls, word) { svg.appendChild(s('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), 'class': 'store-graph-rule ' + cls })); svg.appendChild(s('text', { x: W - R, y: Y(v) - 4, 'text-anchor': 'end', 'class': 'store-graph-word ' + cls }, word + ' ' + money(v))); }
    if (mrp) rule(mrp, 'is-mrp', usual != null ? 'Usual' : 'MRP');
    if (must && must > y0 && must < y1 && (!mrp || Math.abs(Y(must) - Y(mrp)) > 14)) rule(must, 'is-must', 'Must Buy');
    /* A stepped line: a price holds until the next reading changes it */
    var d = 'M' + X(pts[0][0]).toFixed(1) + ' ' + Y(pts[0][1]).toFixed(1), i;
    for (i = 1; i < pts.length; i++) d += 'H' + X(pts[i][0]).toFixed(1) + 'V' + Y(pts[i][1]).toFixed(1);
    d += 'H' + X(t1).toFixed(1);
    svg.appendChild(s('path', { d: d + 'V' + (H - B) + 'H' + X(pts[0][0]).toFixed(1) + 'Z', 'class': 'store-graph-fill' }));
    svg.appendChild(s('path', { d: d, 'class': 'store-graph-line' }));
    /* The lowest point (its latest occurrence) and today */
    var lowAt = pts[0]; pts.forEach(function (p) { if (p[1] <= lowAt[1]) lowAt = p; });
    var last = pts[pts.length - 1], day = function (t) { var x = new Date(t); return x.getDate() + ' ' + MONTHS[x.getMonth()]; };
    if (lowAt !== last || lowAt[1] < last[1]) {
      svg.appendChild(s('circle', { cx: X(lowAt[0]), cy: Y(lowAt[1]), r: 4, 'class': 'store-graph-dot is-low' }));
      var lx = X(lowAt[0]), anchor = lx > W - 150 ? 'end' : lx < 150 ? 'start' : 'middle';
      svg.appendChild(s('text', { x: lx, y: Math.min(H - B - 4, Y(lowAt[1]) + 16), 'text-anchor': anchor, 'class': 'store-graph-word is-low' }, money(lowAt[1]) + ' \u00b7 ' + day(lowAt[0])));
    }
    svg.appendChild(s('circle', { cx: X(t1), cy: Y(last[1]), r: 4, 'class': 'store-graph-dot' }));
    var a = new Date(t0), z = new Date(t1), mid = new Date((t0 + t1) / 2), my = function (x) { return MONTHS[x.getMonth()] + ' ' + String(x.getFullYear()).slice(2); };
    svg.appendChild(s('text', { x: L, y: H - 8, 'class': 'store-graph-word' }, my(a)));
    if (t1 - t0 > 90 * 864e5) svg.appendChild(s('text', { x: W / 2, y: H - 8, 'text-anchor': 'middle', 'class': 'store-graph-word' }, my(mid)));
    svg.appendChild(s('text', { x: W - R, y: H - 8, 'text-anchor': 'end', 'class': 'store-graph-word' }, 'Today'));
    var mo = Math.max(1, Math.round((t1 - t0) / (30.4 * 864e5))); box.appendChild(el('span', 'store-stat-k', 'Price, last ' + mo + (mo === 1 ? ' month' : ' months'))); box.appendChild(svg);
  }
  /* Does any of an item's low periods fall in a sale window? Both are month names or ranges ("May", "July", "Sep to Oct",
     "Mar to Apr"), compared by month so "Jul" matches "July" and "May to Jun" matches "May". */
  function monthsOf(label) {
    var found = String(label).match(/[A-Za-z]{3,}/g) || [], idx = [];
    found.forEach(function (w) { var i = MONTHS.map(function (m) { return m.toLowerCase(); }).indexOf(w.slice(0, 3).toLowerCase()); if (i > -1) idx.push(i); });
    if (idx.length < 2) return idx;
    var out = [], i = idx[0]; for (var n = 0; n < 12; n++) { out.push(i); if (i === idx[1]) break; i = (i + 1) % 12; }
    return out;
  }
  function sameMonths(lows, win) { var w = monthsOf(win); return (lows || []).some(function (l) { return l === win || monthsOf(l).some(function (m) { return w.indexOf(m) > -1; }); }); }
  function pageUrl(it) { return shelf.pageBase && it.slug ? String(shelf.pageBase).replace(/\/?$/, '/') + encodeURIComponent(it.slug) + '/' : ''; }
  function open(i) {
    if (!sheet || !view.length) return;
    at = (i + view.length) % view.length; var o = view[at], it = o.it;
    sheet.textContent = ''; sheet.className = 'store-sheet store-sheet--' + o.verdict; sheet.style.removeProperty('--tint');
    if (o.tint) paint(sheet, o.tint, sheet.className);
    /* Top bar: the item's label and the close button only, so it fits a phone */
    var bar1 = el('div', 'store-sheet-bar');
    bar1.appendChild(el('span', 'store-code', (it.group ? it.group + ' \u00b7 ' : '') + it.code));
    var x = el('button', 'store-close', '\u00d7'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); bar1.appendChild(x);
    sheet.appendChild(bar1);

    var hero = el('div', 'store-sheet-hero'); hero.appendChild(tile(o, 'store-tile store-tile--big'));
    var txt = el('div', 'store-sheet-text'); txt.appendChild(el('h2', 'store-sheet-name', it.name)); txt.appendChild(chips(o, true, true));
    txt.appendChild(el('p', 'store-sheet-why', it.note || reason(o))); hero.appendChild(txt); sheet.appendChild(hero);

    detail(o).forEach(function (n) { sheet.appendChild(n); });

    var foot = el('div', 'store-sheet-foot'); foot.appendChild(el('span', 'store-sheet-note', shelf.method || ''));
    /* The item's own page, when the shelf has them */
    if (pageUrl(it)) { var pg = el('a', 'store-see', 'Open page \u2192'); pg.href = pageUrl(it); foot.appendChild(pg); }
    sheet.appendChild(foot);
    /* Previous and next: two plain links at the foot (arrow keys and a sideways swipe work too) */
    if (view.length > 1) {
      var steps = el('div', 'store-steps');
      [['-1', '\u2190 Previous'], ['1', 'Next \u2192']].forEach(function (d) { var b = el('button', 'store-step', d[1]); b.type = 'button'; b.setAttribute('data-dir', d[0]); steps.appendChild(b); });
      sheet.appendChild(steps);
    }
    if (!sheet.open) { if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', ''); }
    try { history.replaceState(null, '', '#' + encodeURIComponent(it.code)); } catch (e) {}
  }
  function close() { if (sheet.open) sheet.close(); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }

  function draw() {
    var rules = rulesOf(shelf);
    var all = (shelf.items || []).map(function (it) { return judge(it, rules); });
    var rank = { must: 0, fair: 1, wait: 2, 'new': 3, skip: 4 };
    all.sort(function (a, b) { return (rank[a.verdict] - rank[b.verdict]) || (b.off - a.off); });
    var counts = {}; all.forEach(function (o) { counts[o.verdict] = (counts[o.verdict] || 0) + 1; });
    /* The items with the lowest price per piece today, marked and shown in a row of their own */
    var priced = all.filter(function (o) { return o.ppp != null; }).sort(function (a, b) { return a.ppp - b.ppp; });
    var value = priced.length >= VALUE_MIN ? priced.slice(0, VALUE_ROW) : [];
    value.forEach(function (o) { o.value = true; });
    /* Items cheaper at another shop right now, the biggest saving first (a row of its own, and a filter) */
    var onSale = all.filter(function (o) { return o.shopSave > 0; }).sort(function (a, b) { return b.shopSave - a.shopSave; });
    if (filter === 'shop' && !onSale.length) filter = 'all';
    var shopName = onSale.length ? onSale[0].shop.name : '';
    view = filter === 'all' ? all.slice() : filter === 'shop' ? onSale.slice() : all.filter(function (o) { return o.verdict === filter; });
    if (sortBy === 'ppp') view.sort(function (a, b) { return (a.ppp == null) - (b.ppp == null) || a.ppp - b.ppp; });
    root.textContent = '';

    if (shelves.length > 1 || shelf.hand) {
      var tabs = el('nav', 'store-shelves'); tabs.setAttribute('aria-label', 'Shelves');
      if (shelves.length > 1) shelves.forEach(function (s, i) { var b = el('button', 'store-pill', s.name); b.type = 'button'; b.setAttribute('data-shelf', i); if (s.data === shelf) b.setAttribute('aria-current', 'true'); tabs.appendChild(b); });
      if (shelf.hand) tabs.appendChild(el('span', 'store-hand', shelf.hand));
      root.appendChild(tabs);
    }
    var strip = el('section', 'store-strip');
    if (shelf.sale && shelf.sale.label) { var s1 = el('strong', 'store-strip-lead'); s1.appendChild(el('span', 'store-led')); s1.appendChild(document.createTextNode(shelf.sale.label)); strip.appendChild(s1); }
    if (shelf.sale && shelf.sale.windows && shelf.sale.windows.length) strip.appendChild(el('span', '', 'sales: ' + shelf.sale.windows.join(' \u00b7 ')));
    if (shelf.updated) strip.appendChild(el('span', 'store-strip-end', 'updated ' + fullDate(shelf.updated)));
    if (strip.childNodes.length) root.appendChild(strip);
    /* Why the percentages here differ from the shop's own: only on a list whose items carry usual prices */
    if (all.some(function (o) { return o.usual != null; })) {
      var why = el('div', 'store-why'), sum = el('button', 'store-why-q', 'Why is our % off different from Amazon’s?'), body = el('p', 'store-why-pop');
      sum.type = 'button'; sum.setAttribute('aria-expanded', 'false'); body.id = 'store-why-pop'; body.setAttribute('role', 'note'); sum.setAttribute('aria-controls', body.id);
      body.appendChild(document.createTextNode('Amazon compares today’s price with the MRP printed on the box, and that number is often set very high. We compare it with the price the item has actually sold for most of the last year, its usual price. So “20% off” here means 20% less than what people have usually paid, not 20% less than a number on the label. A '));
      body.appendChild(el('strong', '', 'Must Buy')); body.appendChild(document.createTextNode(' is ' + Math.round(rules.usualMustOff * 100) + '% or more under the usual price. An item we have not tracked for a month yet is shown as '));
      body.appendChild(el('em', '', 'Collecting Data')); body.appendChild(document.createTextNode(' and judged against the MRP until we have enough.'));
      why.appendChild(sum); why.appendChild(body); root.appendChild(why);
      /* An overlay, not a row that pushes the page down: opens on hover or click; closes on a click elsewhere, Escape, or the pointer leaving */
      var whyTimer = 0;
      function whyOpen(on) {
        clearTimeout(whyTimer); why.classList.toggle('is-open', on); sum.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (on) { body.style.left = '0'; var r = body.getBoundingClientRect(), over = r.right - (document.documentElement.clientWidth - 12); if (over > 0) body.style.left = Math.max(12 - r.left, -over) + 'px'; }
      }
      /* A click keeps it open (hover alone closes when the pointer leaves); a second click closes it. Touch has no hover, so only taps count there */
      var whyPinned = false;
      sum.addEventListener('click', function () { whyPinned = !whyPinned; whyOpen(whyPinned); });
      why.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') whyOpen(true); });
      why.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'touch') return; whyPinned = false; clearTimeout(whyTimer); whyTimer = setTimeout(function () { whyOpen(false); }, 150); });
      document.addEventListener('click', function (ev) { if (!why.contains(ev.target)) { whyPinned = false; whyOpen(false); } });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && why.classList.contains('is-open')) { whyPinned = false; whyOpen(false); sum.focus(); } });
    }

    /* opt: note (a line under the heading: text, and a link), limit (show only the first few, with a button for the rest) */
    function feature(title, list, missed, bold, opt) {
      if (!list.length) return;
      var sec = el('section', 'store-feature'), h = el('h2', 'store-h', title); h.appendChild(el('span', 'store-n', String(list.length)));
      var line = taglines[title.toLowerCase()] || (shelf.taglines && shelf.taglines[title]); if (line) h.appendChild(el('span', 'store-hand store-tagline', line));
      sec.appendChild(h);
      if (opt && opt.note) {
        var np = el('p', 'store-feature-note', opt.note.text), nl = safeUrl(opt.note.url);
        if (nl) { np.appendChild(document.createTextNode(' ')); var na = el('a', '', 'Open the sale'); na.href = nl; na.target = '_blank'; na.rel = 'noopener'; np.appendChild(na); }
        sec.appendChild(np);
      }
      var shownList = opt && opt.limit ? list.slice(0, opt.limit) : list;
      var row = el('div', 'store-row'), used = [];
      shownList.forEach(function (o) {
        var c = card(o, view.indexOf(o), !missed);
        if (missed) {
          /* A deal that has ended: a quiet card saying what the price was, and when */
          c.className += ' is-missed'; var was = el('span', 'store-missed'); was.appendChild(document.createTextNode('Was ')); was.appendChild(el('strong', '', money(o.it.low)));
          var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(o.it.lowDate || ''); if (m) was.appendChild(document.createTextNode(' on ' + (+m[3]) + ' ' + MONTHS[+m[2] - 1]));
          var old = c.querySelector('.store-low'); if (old) old.remove(); c.insertBefore(was, c.querySelector('.store-chips'));
        } else { var tint = o.tint || tintFor(o.it.code, used, bold ? BOLD : TINTS); if (!o.tint) o.tint = tint; paint(c, tint); }
        row.appendChild(c);
      });
      sec.appendChild(row);
      if (opt && opt.more && list.length > shownList.length) { var mb = el('button', 'store-pill store-more', opt.more + ' (' + list.length + ')'); mb.type = 'button'; mb.setAttribute('data-filter', opt.filter); sec.appendChild(mb); }
      root.appendChild(sec);
    }
    if (filter === 'all') {
      /* While another shop has a sale on: the sets it sells for less than Amazon, with what comes with the sale */
      var sale = shelf.shopSale || {}, saleNote = [sale.label || (shopName + ' sale'), sale.perks].filter(Boolean).join('. ');
      feature('Cheaper at ' + shopName, onSale, false, false, { limit: 6, more: 'See all', filter: 'shop', note: { text: saleNote ? saleNote + '.' : '', url: sale.url } });
      /* Must Buy leads the page: every Must Buy, deepest discount first */
      var musts = all.filter(function (o) { return o.verdict === 'must'; }).sort(function (x, y) { return y.off - x.off; });
      feature('Must Buy', musts, false, true);
      feature('My Picks', all.filter(function (o) { return o.it.pick; }), false, true);
      feature('Lowest Right Now', all.filter(function (o) { return o.verdict !== 'skip' && o.verdict !== 'must' && !o.it.pick && o.atLow && o.off >= rules.lowRowOff; }));
      feature('Most Pieces for the Money', value);
      /* Just Missed: a real discount (15% or more under the usual price, or MRP where there is none) that was the lowest on record within the last week and is gone */
      var asOf = Date.parse(shelf.updated || '');
      feature('Just Missed', all.filter(function (o) { var it = o.it, age = asOf - Date.parse(it.lowDate || ''); return !o.thin && num(it.low) && o.base && it.low <= o.base * 0.85 && age >= 0 && age <= 7 * 864e5 && (!o.priced || it.seller === 'other' || it.price > it.low * 1.1); }), true);
    }

    var bar2 = el('nav', 'store-bar'); bar2.setAttribute('aria-label', 'Filter by verdict');
    var allB = el('button', 'store-pill', 'All'); allB.type = 'button'; allB.setAttribute('data-filter', 'all'); allB.appendChild(el('span', 'store-n', String(all.length))); if (filter === 'all') allB.setAttribute('aria-current', 'true'); bar2.appendChild(allB);
    if (onSale.length) { var sp = el('button', 'store-pill'); sp.type = 'button'; sp.setAttribute('data-filter', 'shop'); sp.appendChild(document.createTextNode('Cheaper at ' + shopName)); sp.appendChild(el('span', 'store-n', String(onSale.length))); if (filter === 'shop') sp.setAttribute('aria-current', 'true'); bar2.appendChild(sp); }
    VERDICTS.forEach(function (v) {
      if (!counts[v.key]) return;
      var b = el('button', 'store-pill'); b.type = 'button'; b.setAttribute('data-filter', v.key); b.appendChild(el('span', 'store-dot store-chip--' + v.key)); b.appendChild(document.createTextNode(v.label)); b.appendChild(el('span', 'store-n', String(counts[v.key])));
      if (filter === v.key) b.setAttribute('aria-current', 'true'); bar2.appendChild(b);
    });
    if (priced.length) { var sb = el('button', 'store-pill store-sort', sortBy === 'ppp' ? 'Sorted by price per piece' : 'Sort by price per piece'); sb.type = 'button'; sb.setAttribute('data-sort', sortBy === 'ppp' ? 'verdict' : 'ppp'); if (sortBy === 'ppp') sb.setAttribute('aria-pressed', 'true'); bar2.appendChild(sb); }
    root.appendChild(bar2);

    var grid = el('div', 'store-grid');
    view.slice(0, shown).forEach(function (o, i) { grid.appendChild(card(o, i, false)); });
    root.appendChild(grid);
    if (view.length > shown) { var more = el('button', 'store-pill store-more', 'Show ' + (view.length - shown) + ' more'); more.type = 'button'; root.appendChild(more); }
    if (!view.length) root.appendChild(el('p', 'store-wait', 'Nothing on this shelf yet.'));

    var foot = el('footer', 'store-foot');
    if (shelf.method) foot.appendChild(el('p', '', shelf.method));
    if ((shelf.items || []).some(function (it) { return isAffiliate(safeUrl(it.url)); })) { foot.appendChild(el('p', '', 'I may earn a commission if you buy through these links.')); if (meta('amazon-tag')) foot.appendChild(el('p', '', 'As an Amazon Associate I earn from qualifying purchases.')); }
    root.appendChild(foot);
  }

  /* A watchlist page shown inside a plot on the homepage: fill its box with a live line from its shelf.
     The date is left out once it is more than a week old, so a stale one never sits on the homepage. */
  [].forEach.call(document.querySelectorAll('.plot-page'), function (a) {
    var watch = a.getAttribute('data-watchlist') === '1' || /watchlist/.test(a.getAttribute('data-template') || '') || a.getAttribute('data-slug') === 'store';
    if (!watch) return;
    a.classList.add('is-watchlist');
    /* The small "watchlist" label is left out when the page's title already says so */
    var kind = a.querySelector('.plot-page-kind'), title = a.querySelector('.plot-page-title');
    if (kind) { if (title && /watch\s*list/i.test(title.textContent)) kind.remove(); else kind.textContent = 'watchlist'; }
    var src = a.getAttribute('data-src'), body = a.parentNode.querySelector('template.plot-page-body');
    var own = body && body.content ? shelfLinks(body.content)[0] : null, site = siteSources('');
    if (own) src = shelfUrl(own); else if (site.length === 1 && site[0].url) src = site[0].url;
    if (!src) return;
    fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      if (!d || !Array.isArray(d.items)) return;
      var rules = rulesOf(d), musts = d.items.map(function (it) { return judge(it, rules); }).filter(function (o) { return o.verdict === 'must'; });
      musts.sort(function (x, y) { return y.off - x.off; });
      var line = a.querySelector('.plot-page-line'); if (!line) return; line.textContent = '';
      var tally = d.items.length + ' ' + (d.unit || 'items');
      /* The featured item: the Must Buy with the deepest discount. Its picture sits on the right, overlapping the
         box's top edge, with "Must Buy" and a green dot under it. A picture that doesn't load is dropped; the
         label stays. With no Must Buy, nothing is featured. */
      [].forEach.call(a.querySelectorAll('.plot-page-feature'), function (n) { n.remove(); });
      if (musts.length) {
        var top = musts[0].it, feature = el('span', 'plot-page-feature'), u = srcFor(top, d);
        if (u) {
          var box = el('span', 'plot-page-shot'), img = el('img'); img.alt = top.name || ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
          img.onerror = function () { if (box.parentNode) box.parentNode.removeChild(box); };
          img.src = u; box.appendChild(img); feature.appendChild(box);
        }
        var m = el('span', 'plot-page-must'); m.appendChild(el('span', 'plot-page-dot')); m.appendChild(document.createTextNode(label('must'))); feature.appendChild(m);
        a.insertBefore(feature, a.querySelector('.plot-page-go'));
      }
      var when = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.updated || '');
      if (when) { var age = (Date.now() - Date.UTC(+when[1], +when[2] - 1, +when[3])) / 864e5; if (age >= -1 && age <= 7) tally += ' · updated ' + (+when[3]) + ' ' + MONTHS[+when[2] - 1]; }
      line.appendChild(el('span', '', tally));
    }).catch(function () {});
  });

  /* A Library page shown inside a plot: a box like the watchlist's. A small shelf of its books (one of each colour,
     in shelf order), or the page's feature image, rises out of the top, with how many shelves and books under it. */
  [].forEach.call(document.querySelectorAll('.plot-page'), function (a) {
    if (!/library/.test(a.getAttribute('data-template') || '') && a.getAttribute('data-slug') !== 'library') return;
    var src = a.getAttribute('data-library'); if (!src) return;
    a.classList.add('is-watchlist'); a.classList.add('is-library');
    var kind = a.querySelector('.plot-page-kind'), title = a.querySelector('.plot-page-title');
    if (kind) { if (title && /library/i.test(title.textContent)) kind.remove(); else kind.textContent = 'library'; }
    fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      var books = d && (d.books || d); if (!Array.isArray(books) || !books.length) return;
      /* Shelves are the bookcases, not the rows inside them */
      var count = (d.cases && d.cases.length) || 1;
      var line = a.querySelector('.plot-page-line'); if (line) { line.textContent = ''; line.appendChild(el('span', '', count + (count === 1 ? ' shelf' : ' shelves') + ' · ' + books.length + ' books')); }
      [].forEach.call(a.querySelectorAll('.plot-page-feature'), function (n) { n.remove(); });
      var feature = el('span', 'plot-page-feature'), box = el('span', 'plot-page-shot'), pic = a.getAttribute('data-image');
      if (pic) { var img = el('img'); img.alt = ''; img.loading = 'lazy'; img.src = pic; box.appendChild(img); }
      else {
        box.classList.add('plot-page-shelf');
        var row = el('span', 'plot-page-spines'), seen = {}, n = 0;
        books.forEach(function (b) {
          if (n >= 7 || (b.pl && b.pl !== 'up') || !b.c || seen[b.cn || b.c]) return; seen[b.cn || b.c] = 1; n++;
          var sp = el('i'); sp.style.background = b.c; sp.style.height = Math.round(Math.min(215, b.h || 160) / 215 * 100) + '%'; sp.style.width = Math.max(4, Math.round((b.w || 30) / 6)) + 'px'; row.appendChild(sp);
        });
        box.appendChild(row); box.appendChild(el('span', 'plot-page-board'));
      }
      feature.appendChild(box);
      a.insertBefore(feature, a.querySelector('.plot-page-go'));
    }).catch(function () {});
  });

  if (root) root.addEventListener('click', function (e) {
    var c = e.target.closest('.store-card'), f = e.target.closest('[data-filter]'), s = e.target.closest('[data-shelf]');
    if (c) return open(+c.getAttribute('data-i'));
    var so = e.target.closest('[data-sort]');
    if (so) { sortBy = so.getAttribute('data-sort'); shown = PAGE; return draw(); }
    if (f) { filter = f.getAttribute('data-filter'); shown = PAGE; return draw(); }
    if (s) { shelf = shelves[+s.getAttribute('data-shelf')].data; filter = 'all'; sortBy = 'verdict'; shown = PAGE; return draw(); }
    if (e.target.closest('.store-more')) { shown += PAGE; draw(); }
  });
  if (sheet) {
    sheet.addEventListener('click', function (e) {
      var step = e.target.closest('.store-step');
      if (step) return open(at + (+step.getAttribute('data-dir')));
      if (e.target === sheet || e.target.closest('.store-close')) close();
    });
    sheet.addEventListener('close', function () { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} });
    sheet.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') open(at - 1); else if (e.key === 'ArrowRight') open(at + 1); });
    var x0 = null;
    sheet.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    sheet.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) open(at + (dx < 0 ? 1 : -1)); }, { passive: true });
  }

  /* Where shelves come from. A page's own text can link to .json files (each link is a shelf). Otherwise the site's
     source is used: <meta name="watchlist-data" content="..."> in Ghost's code injection (several addresses,
     separated by spaces), or failing that the shelf the theme ships. */
  /* Links to shelf files in a piece of text: any link whose address ends in .json, whatever follows it. Ghost can add
     "?ref=yoursite" to links that leave the site, so the ending is judged on the address alone, and that tag is dropped. */
  function shelfLinks(root) {
    return [].filter.call(root.querySelectorAll('a[href*=".json"]'), function (a) { try { return /\.json$/i.test(new URL(a.href, location.href).pathname); } catch (e) { return false; } });
  }
  function shelfUrl(a) { try { var u = new URL(a.href, location.href); u.searchParams.delete('ref'); return u.href; } catch (e) { return a.href; } }
  function rawMeta(n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? (m.getAttribute('content') || '').trim() : ''; }
  function siteSources(fallback) {
    var named = rawMeta('watchlist-data').split(/\s+/).filter(function (u) { return /^https?:\/\//i.test(u) || u.charAt(0) === '/'; });
    return (named.length ? named : [fallback]).filter(Boolean).map(function (u) { return { name: '', url: u }; });
  }
  function fetchShelves(sources) {
    return Promise.all(sources.map(function (s) {
      return fetch(s.url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) { if (d && typeof d === 'object') d.__src = s.url; return { name: s.name || d.shelf || 'Shelf', data: d }; }).catch(function () { return null; });
    })).then(function (got) {
      var ok = got.filter(function (g) { return g && g.data && Array.isArray(g.data.items); });
      ok.forEach(function (s) { if (!s.data.currency) s.data.currency = ''; if (!s.data.shelf) s.data.shelf = s.name; });
      return ok;
    });
  }

  /* An item's own page (a post with the internal tag #watch-item): find the item by the post's address in the
     shelves, then draw its verdict, prices and the rest into the page. The post's title, picture and your notes are
     already there from Ghost. */
  var itemBox = document.querySelector('.watch-data');
  if (itemBox) {
    fetchShelves(siteSources(itemBox.getAttribute('data-src'))).then(function (all) {
      var slug = itemBox.getAttribute('data-slug') || '', found = null, home = null;
      all.forEach(function (s) { (s.data.items || []).forEach(function (it) { if (!found && it.slug && it.slug === slug) { found = it; home = s.data; } }); });
      if (!found) all.forEach(function (s) { (s.data.items || []).forEach(function (it) { if (!found && it.code && slug.indexOf(String(it.code).toLowerCase() + '-') === 0) { found = it; home = s.data; } }); });
      itemBox.textContent = '';
      if (!found) { itemBox.appendChild(el('p', 'store-wait', 'This item is not on a watchlist right now.')); return; }
      shelf = home;
      var o = judge(found, rulesOf(shelf)), page = itemBox.closest('.watch-item') || document.body;
      page.className += ' store-sheet--' + o.verdict;
      /* The page is a story panel: a Must Buy or a pick takes one of the story's bold hues by name, so everything a bold
         story has (white text on the dark ones, the stamp's ink) follows; other verdicts keep their pastel. */
      if (o.verdict === 'must' || found.pick) { var bold = tintFor(found.code, [], BOLD); paint(page, bold); page.setAttribute('data-hue', HUES[BOLD.indexOf(bold)]); }
      else page.setAttribute('data-hue', 'watch');
      var code = page.querySelector('.watch-code'); if (code) code.textContent = (found.group ? found.group + ' \u00b7 ' : '') + found.code;
      var back = page.querySelector('.watch-back');
      if (back && shelf.home) { back.href = shelf.home; var word = back.querySelector('span'); if (word) word.textContent = (shelf.shelf ? shelf.shelf + ' ' : '') + 'watchlist'; back.hidden = false; }
      var pic = page.querySelector('.watch-pic');
      if (pic && !pic.querySelector('img')) { var t = tile(o, 'store-tile store-tile--big'); pic.parentNode.replaceChild(t, pic); t.className += ' watch-pic'; }
      /* Your own photo (kept on this site) fills its tile; a catalogue picture, which comes on white, is blended into the page's colour */
      var shot = pic && pic.querySelector('img'); if (shot) { try { if (new URL(shot.src, location.href).host === location.host) pic.className += ' is-photo'; } catch (e) {} }
      var verdict = page.querySelector('.watch-verdict');
      if (verdict) { verdict.appendChild(chips(o, true, true)); verdict.appendChild(el('p', 'store-sheet-why', found.note || reason(o))); }
      detail(o).forEach(function (n) { itemBox.appendChild(n); });
      var foot = el('div', 'store-sheet-foot'); foot.appendChild(el('span', 'store-sheet-note', shelf.method || ''));
      itemBox.appendChild(foot);
    });
  }

  if (!root) return;
  /* The watchlist page: its shelves are the .json links in its own text, or the site's source */
  /* A paragraph in the page's text that starts with a row's name and a colon ("Must Buy: May the 4th is in October
     now!") is that row's tagline: it is taken out of the text and shown beside the row's heading, in handwriting. */
  var ROWS = ['must buy', 'my picks', 'lowest right now', 'most pieces for the money', 'just missed'];
  [].slice.call(document.querySelectorAll('.store-intro p')).forEach(function (p) {
    var m = /^\s*([^:]{3,40}):\s*(.+)$/.exec(p.textContent || ''); if (!m) return;
    var key = m[1].trim().toLowerCase(); if (ROWS.indexOf(key) < 0) return;
    taglines[key] = m[2].trim().slice(0, 120); p.remove();
  });
  var introBox = document.querySelector('.store-intro'), links = introBox ? shelfLinks(introBox) : [];
  var sources = links.map(function (a) { var s = { name: a.textContent.trim() || 'Shelf', url: shelfUrl(a) }; var p = a.parentNode; a.remove(); if (p && !p.textContent.trim() && !p.children.length) p.remove(); return s; });
  var intro = document.querySelector('.store-intro'); if (intro && !intro.textContent.trim() && !intro.querySelector('img, figure, iframe')) intro.hidden = true;
  if (!sources.length) sources = siteSources(root.getAttribute('data-src'));
  /* Sale alerts: the Telegram link comes from <meta name="watchlist-telegram" content="https://t.me/..."> in code injection */
  (function () {
    var link = document.querySelector('.store-alerts-tg'), meta = document.querySelector('meta[name="watchlist-telegram"]'), url = meta && meta.getAttribute('content');
    if (link && url && /^https:\/\/(t\.me|telegram\.me)\//.test(url)) { link.href = url; link.hidden = false; }
  })();
  /* Request a set. Only when the shelf is served by the Worker the box points at (requests go to the same place). */
  function requests(src) {
    var box = document.querySelector('.store-request'); if (!box) return;
    var base = (box.getAttribute('data-endpoint') || '').replace(/\/+$/, ''), m = /^(https?:\/\/[^/]+)\/watch\/([a-z0-9-]+)\.json/.exec(src || '');
    if (!base || !m || m[1] !== base) return;
    var shelfSlug = m[2], input = box.querySelector('.store-request-input'), send = box.querySelector('.store-request-send'), msg = box.querySelector('.store-request-msg'), queue = box.querySelector('.store-request-queue');
    box.hidden = false;
    var voter = ''; try { voter = localStorage.getItem('dungeon-voter') || ''; if (!voter) { voter = 'v' + Array.from(crypto.getRandomValues(new Uint8Array(16)), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); localStorage.setItem('dungeon-voter', voter); } } catch (e) { voter = 'v' + String(Math.random()).slice(2) + String(Date.now()) + 'xxxxxxxx'; }
    function say(t, bad) { msg.textContent = t; msg.className = 'store-request-msg' + (bad ? ' is-bad' : ''); }
    function list() {
      fetch(base + '/watch/' + shelfSlug + '/requests').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var chipsEl = queue.querySelector('.store-chips'); chipsEl.textContent = ''; var rows = (d && d.requests) || [];
        rows.forEach(function (q) { var c = el('button', 'store-chip store-request-vote', q.label + ' \u00b7 ' + q.votes); c.type = 'button'; c.setAttribute('data-label', q.label); c.setAttribute('aria-label', 'Vote for ' + q.label); chipsEl.appendChild(c); });
        queue.hidden = !rows.length;
      }).catch(function () {});
    }
    /* The spam check (Cloudflare Turnstile) loads the first time the field is used */
    var key = box.getAttribute('data-sitekey') || '', widget = null, token = '', loading = null;
    function check() {
      if (!key) return Promise.resolve('');
      if (token) return Promise.resolve(token);
      if (!loading) loading = new Promise(function (res, rej) { if (window.turnstile) return res(); var sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async = true; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
      return loading.then(function () { return new Promise(function (res) {
        if (widget !== null) { try { window.turnstile.reset(widget); } catch (e) {} }
        else widget = window.turnstile.render(box.querySelector('.store-request-check'), { sitekey: key, callback: function (t) { token = t; res(t); }, 'error-callback': function () { res(''); } });
        var wait = setInterval(function () { if (token) { clearInterval(wait); res(token); } }, 250); setTimeout(function () { clearInterval(wait); res(token); }, 20000);
      }); }).catch(function () { return ''; });
    }
    function submit(text) {
      text = String(text || '').trim(); if (!text) return say('Paste an Amazon link, an ASIN or a set number.', true);
      send.disabled = true; say('Sending\u2026');
      check().then(function (t) {
        return fetch(base + '/watch/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shelf: shelfSlug, text: text, voter: voter, turnstile: t }) });
      }).then(function (r) { return r.json(); }).then(function (d) {
        token = '';
        if (d.error) return say(d.error, true);
        if (d.status === 'listed') say('That one is already on the list.');
        else if (d.status === 'voted') say(d.again ? 'You have already asked for that one.' : 'Added your vote. ' + d.votes + ' people have asked for it.');
        else { say('Thanks. I\u2019ll add it if it\u2019s one I\u2019d track.'); input.value = ''; }
        list();
      }).catch(function () { say('Couldn\u2019t send that. Try again later.', true); }).then(function () { send.disabled = false; });
    }
    input.addEventListener('focus', function () { if (key && !loading) check(); }, { once: true });
    send.addEventListener('click', function () { submit(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(input.value); } });
    queue.addEventListener('click', function (e) { var c = e.target.closest('[data-label]'); if (c) submit(c.getAttribute('data-label')); });
    list();
  }
  fetchShelves(sources).then(function (ok) {
    shelves = ok; requests(sources[0] && sources[0].url);
    if (!shelves.length) { root.textContent = ''; root.appendChild(el('p', 'store-wait', 'Couldn\u2019t load prices. Try again later.')); return; }
    shelf = shelves[0].data; draw();
    var want = decodeURIComponent((location.hash || '').slice(1));
    if (want) for (var i = 0; i < view.length; i++) if (String(view[i].it.code) === want) { open(i); break; }
  });
})();
