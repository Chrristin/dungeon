/* Smoke tests for the theme, driven in real browsers. Not in the release zip (extras/ is left out).

   It loads pages of the live site (or any address you give) and checks what a visitor would notice: no script errors, the
   main features are there and respond, the Buy links carry the Associates tag, the pictures of the Library open and close,
   nothing scrolls sideways on a phone.

   Usage (run `npm install` once first):
     node extras/smoke/run.mjs                          live site, Chrome and WebKit
     node extras/smoke/run.mjs --local                  live pages, but with this folder's scripts and styles swapped in
                                                        (how to test a change before it is released)
     node extras/smoke/run.mjs --engines chrome         one engine (chrome, webkit, firefox)
     node extras/smoke/run.mjs --base https://staging.example.com
     node extras/smoke/run.mjs --local --fingerprint after.json
     node extras/smoke/run.mjs --fingerprint before.json                       then:
     node extras/smoke/run.mjs --compare before.json after.json                shows what changed in the pages' structure

   A fingerprint counts every class name on each page after it has loaded and been used a little. Comparing the fingerprints of
   two versions shows a feature that stopped drawing even when no check was written for it. Live content (stickies, stamps) moves
   a little between runs, so small count changes in those are normal; look for classes that appear or vanish.

   It reads pages and clicks things that do nothing permanent. It never submits a form, posts a sticky or stamps. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let require = createRequire(path.join(ROOT, 'package.json'));
/* In a git worktree without node_modules, point SMOKE_MODULES_FROM at the package.json of a folder that has them */
try { require.resolve('playwright-core'); } catch (e) { if (process.env.SMOKE_MODULES_FROM) require = createRequire(process.env.SMOKE_MODULES_FROM); }
const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

if (flag('compare')) {
  const [a, b] = argv.slice(argv.indexOf('--compare') + 1);
  const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = JSON.parse(fs.readFileSync(b, 'utf8'));
  let diffs = 0;
  for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const x = A[key] || {}, y = B[key] || {}, lines = [];
    for (const cls of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (!(cls in x)) lines.push(`  + ${cls} (${y[cls]})`);
      else if (!(cls in y)) lines.push(`  - ${cls} (${x[cls]})`);
      else if (Math.abs(x[cls] - y[cls]) > Math.max(2, 0.15 * x[cls])) lines.push(`  ~ ${cls}: ${x[cls]} -> ${y[cls]}`);
    }
    if (lines.length) { diffs += lines.length; console.log(key + '\n' + lines.join('\n')); }
  }
  console.log(diffs ? `${diffs} difference(s)` : 'no differences');
  process.exit(diffs ? 1 : 0);
}

const pw = require('playwright-core');
const BASE = opt('base', 'https://christingeorge.com').replace(/\/$/, '');
const LOCAL = flag('local');
const ENGINES = opt('engines', 'chrome,webkit').split(',');
const FP_OUT = opt('fingerprint', '');
const launchers = {
  chrome: () => pw.chromium.launch({ channel: 'chrome' }),
  webkit: () => pw.webkit.launch(),
  firefox: () => pw.firefox.launch(),
};
const SWAPS = [[/\/assets\/js\/(site|store|library|library-art|library-cat|ghost-later)\.js/, 'assets/js/$1.js', 'text/javascript'], [/\/assets\/css\/(screen|library)\.css/, 'assets/css/$1.css', 'text/css']];
const LEGO_LIST = opt('list', '/lego-watchlist/');
const ITEM = opt('item', '/lego/77256-time-machine-from-back-to-the-future/');
const POST = opt('post', '/worth-every-piece/');

let fails = 0, passes = 0;
const ck = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); ok ? passes++ : fails++; };
const fingerprints = {};

async function open(browser, name, url, size) {
  const ctx = await browser.newContext({ viewport: size || { width: 1280, height: 800 }, hasTouch: !!(size && size.width < 600), isMobile: !!(size && size.width < 600 && name !== 'firefox') });
  if (LOCAL) for (const [re, file, type] of SWAPS) {
    await ctx.route(re, (r) => {
      const m = r.request().url().match(re); const f = path.join(ROOT, file.replace('$1', m[1]));
      if (!fs.existsSync(f)) return r.continue();
      r.fulfill({ contentType: type, body: fs.readFileSync(f) });
    });
  }
  const page = await ctx.newPage(); const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 140)); });
  page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && u.startsWith(BASE) && !/\/(favicon|members\/api|content\/images)/.test(u)) failed.push(r.status() + ' ' + u.replace(BASE, '')); });
  await page.goto(BASE + url + (url.includes('?') ? '&' : '?') + 'smoke=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4500);
  return { ctx, page, errors, failed };
}
async function classCounts(page) {
  return page.evaluate(() => { const o = {}; document.querySelectorAll('[class]').forEach((e) => { if (e.closest('svg') && !(e instanceof SVGSVGElement)) return; String(e.getAttribute('class')).split(/\s+/).forEach((c) => { if (c) o[c] = (o[c] || 0) + 1; }); }); return o; });
}
async function finish(name, label, h, extra) {
  if (extra) await extra(h.page);
  ck(`${name} ${label}: no script errors`, h.errors.length === 0, h.errors.slice(0, 2).join(' | '));
  ck(`${name} ${label}: no failed requests for the site's own files`, h.failed.length === 0, h.failed.slice(0, 2).join(' | '));
  if (FP_OUT) fingerprints[`${name} ${label}`] = await classCounts(h.page);
  await h.ctx.close();
}

for (const name of ENGINES) {
  let browser; try { browser = await launchers[name](); } catch (e) { console.log(`SKIP ${name}: could not start (${String(e).split('\n')[0].slice(0, 90)})`); continue; }
  console.log(`\n== ${name}${LOCAL ? ' with local scripts and styles' : ''} on ${BASE}`);

  // Home: the plots, and a post opening in place
  { const h = await open(browser, name, '/'); const p = h.page;
    ck(`${name} home: plots drawn`, await p.locator('.plots .plot').count() >= 3);
    ck(`${name} home: menu and footer there`, await p.locator('.dock').count() === 1 && await p.locator('.colophon').count() === 1);
    await finish(name, 'home', h, async (pg) => {
      const card = pg.locator('.cards .card').first();
      if (await card.count()) {
        await card.scrollIntoViewIfNeeded(); await card.click({ timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(1800);
        const open = await pg.evaluate(() => { const d = document.querySelector('dialog.reader'); return !!(d && d.open && d.querySelector('.post-panel')); });
        ck(`${name} home: a card opens its post in place`, open);
        await pg.keyboard.press('Escape');
        await pg.waitForFunction(() => !document.querySelector('dialog.reader').open, null, { timeout: 4000 }).catch(() => {}); // closing takes a moment; a slow machine needs longer than a fixed wait
        ck(`${name} home: Escape closes it`, await pg.evaluate(() => !document.querySelector('dialog.reader').open));
      } else ck(`${name} home: has post cards to open`, false);
    }); }

  // A review post: the Buy card, the tag, the stamp and stickies, the Klingon switch
  { const h = await open(browser, name, POST); const p = h.page;
    const r = await p.evaluate(() => { const m = document.querySelector('meta[name="amazon-tag"]'), tag = m && m.content, a = document.querySelector('.review-buy a.store-go, .review-buy a[href*="amazon."]'); return { tag, href: a && a.href, shown: !!document.querySelector('.review-buy:not([hidden])'), stamp: !!document.querySelector('.stamp'), stickies: !!document.querySelector('.stickies'), rated: !!document.querySelector('.rated'), map: !!document.querySelector('.pm svg, .post-garden') }; });
    ck(`${name} post: the Buy card shows`, r.shown);
    ck(`${name} post: its Buy link carries the site's Associates tag`, !!r.tag && !!r.href && new URL(r.href).searchParams.get('tag') === r.tag, `${r.tag} ${(r.href || '').slice(0, 70)}`);
    ck(`${name} post: stamp, stickies and rating are there`, r.stamp && r.stickies && r.rated);
    ck(`${name} post: "where it sits in the garden" is there`, r.map);
    await finish(name, 'post', h, async (pg) => {
      const sw = pg.locator('.post-panel .panel-meta .code[data-kl]').first();
      if (await sw.count()) {
        const before = await pg.locator('.post-panel .gh-content p').first().innerText().catch(() => '');
        await sw.click().catch(() => {}); await pg.waitForTimeout(1500);
        const during = await pg.locator('.post-panel .gh-content p').first().innerText().catch(() => '');
        ck(`${name} post: the Klingon switch changes the text`, !!before && before !== during);
        await sw.click().catch(() => {}); await pg.waitForTimeout(1500);
        ck(`${name} post: and switches back`, (await pg.locator('.post-panel .gh-content p').first().innerText().catch(() => '')) === before);
      } else ck(`${name} post: the Klingon switch is there`, false);
    }); }

  // The garden: notes, the map, a note opening in place
  { const h = await open(browser, name, '/garden/'); const p = h.page;
    ck(`${name} garden: note cards drawn`, await p.locator('.garden .og').count() >= 3, String(await p.locator('.garden .og').count()));
    ck(`${name} garden: the map is drawn`, await p.locator('.garden-map svg').count() === 1 && await p.locator('.gm-hit').count() > 5);
    await finish(name, 'garden', h); }

  // The price list and an item
  { const h = await open(browser, name, LEGO_LIST); const p = h.page; await p.waitForTimeout(2500);
    ck(`${name} list: item tiles drawn`, await p.locator('.store-tile').count() >= 5, String(await p.locator('.store-tile').count()));
    await finish(name, 'list', h); }
  { const h = await open(browser, name, ITEM, { width: 390, height: 640 }); const p = h.page;
    const r = await p.evaluate(() => { const m = document.querySelector('meta[name="amazon-tag"]'), g = document.querySelector('.store-panel--buy .store-go'); const bottom = g ? g.getBoundingClientRect().bottom + scrollY : 0; return { tag: m && m.content, href: g && g.href, bottom, vh: innerHeight, side: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ck(`${name} item (phone): Buy button there and tagged`, !!r.href && !!r.tag && new URL(r.href).searchParams.get('tag') === r.tag, (r.href || '').slice(0, 60));
    ck(`${name} item (phone): Buy button above the fold`, r.bottom > 0 && r.bottom < r.vh, `${Math.round(r.bottom)}/${r.vh}`);
    ck(`${name} item (phone): nothing scrolls sideways`, !r.side);
    await finish(name, 'item', h); }

  // The Library: pictures open a bookcase, Escape goes back
  { const h = await open(browser, name, '/collection/library/'); const p = h.page;
    const n = await p.locator('#lib-shelves [data-shelf]').count();
    ck(`${name} library: a picture for each bookcase`, n >= 5, String(n));
    await finish(name, 'library', h, async (pg) => {
      await pg.locator('#lib-shelves [data-shelf]').first().click().catch(() => {}); await pg.waitForTimeout(3500);
      ck(`${name} library: choosing a bookcase opens it`, await pg.evaluate(() => { const l = document.getElementById('lib-landing'); return !!l && l.hidden; }));
      await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200);
      ck(`${name} library: Escape goes back to the pictures`, await pg.evaluate(() => { const l = document.getElementById('lib-landing'); return !!l && !l.hidden; }));
    }); }

  await browser.close();
}
if (FP_OUT) { fs.writeFileSync(FP_OUT, JSON.stringify(fingerprints)); console.log('\nfingerprints written to ' + FP_OUT); }
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
