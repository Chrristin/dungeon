/* Makes the pictures of the bookcases shown when the Library page opens, and the partial that places them.

     npm run shelves          draw the bookcases and write the pictures and partials/library-shelves.hbs
     npm run shelves:check    only say whether the pictures still match the data and the drawing code (used by the release)

   It opens extras/shelves/harness.html, which runs the real library.js and library.css on assets/data/library.json, and
   photographs each bookcase with a transparent background, once for light wood and once for dark. The pictures must be made
   again whenever the data file, library.js or library.css change; the check fails the release until they are. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const INPUTS = ['assets/data/library.json', 'assets/js/library.js', 'assets/css/library.css', 'extras/shelves/harness.html', 'extras/shelves/build.mjs', 'assets/images/comics/covers.webp'];
const IMG_DIR = 'assets/images/shelves';
const PARTIAL = 'partials/library-shelves.hbs';
const SCHEMES = ['light', 'dark'];
const PAD = 18;        /* room kept around each bookcase for its shadow, in page pixels */
const PER_ROW = 3;     /* bookcases in the first row of the landing; any more go in a second row, centred under it */
const DPR = 2;        /* the pictures are made twice as large as they are shown */

/* Line endings are ignored, so a checkout on Windows and one on Linux agree */
function inputHash() {
    const h = crypto.createHash('sha256');
    for (const f of INPUTS) h.update(f + '\n' + fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n') + '\n');
    return h.digest('hex').slice(0, 16);
}
const stamp = h => '{{!-- shelves-input-hash: ' + h + ' --}}';

function check() {
    const want = inputHash();
    let have = '';
    try { have = (/shelves-input-hash: ([0-9a-f]+)/.exec(fs.readFileSync(path.join(ROOT, PARTIAL), 'utf8')) || [])[1] || ''; } catch (e) { /* none yet */ }
    const missing = [];
    for (const s of SCHEMES) for (let i = 1; i <= 9; i++) {
        /* Check every bookcase the partial names */
        try { if (!fs.readFileSync(path.join(ROOT, PARTIAL), 'utf8').includes('shelf-' + i + '-' + s + '.webp')) continue; } catch (e) { continue; }
        if (!fs.existsSync(path.join(ROOT, IMG_DIR, 'shelf-' + i + '-' + s + '.webp'))) missing.push('shelf-' + i + '-' + s + '.webp');
    }
    if (have !== want || missing.length) {
        console.error('The Library shelf pictures are out of date: the data file, library.js or library.css changed after they were made.');
        if (missing.length) console.error('Missing: ' + missing.join(', '));
        console.error('Run "npm run shelves", then commit assets/images/shelves and partials/library-shelves.hbs.');
        process.exit(1);
    }
    console.log('The Library shelf pictures are up to date (' + have + ').');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
function serve() {
    return new Promise(resolve => {
        const srv = http.createServer((req, res) => {
            const p = path.normalize(path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
            if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
            fs.createReadStream(p).pipe(res);
        }).listen(0, '127.0.0.1', () => resolve(srv));
    });
}

async function launch(chromium) {
    let last;
    /* The browser Playwright installs (the release uses it), else the Chrome or Edge already on this computer */
    for (const opts of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) {
        try { return await chromium.launch(opts); } catch (e) { last = e; }
    }
    throw new Error('No browser to draw the shelves with. Install one with "npx playwright-core install chromium", or install Chrome. ' + last.message);
}

async function generate() {
    const { chromium } = await import('playwright-core');
    const sharp = (await import('sharp')).default;
    const hash = inputHash();
    const dataset = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/library.json'), 'utf8')), bookCount = (dataset.books || dataset).length;
    const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
    const browser = await launch(chromium);
    fs.mkdirSync(path.join(ROOT, IMG_DIR), { recursive: true });
    let layout = null;
    const sizes = {}, files = [];
    try {
        for (const scheme of SCHEMES) {
            const ctx = await browser.newContext({ viewport: { width: 1800, height: 2800 }, deviceScaleFactor: DPR });
            const page = await ctx.newPage();
            page.on('pageerror', e => { throw e; });
            await page.goto(base + '/extras/shelves/harness.html?scheme=' + scheme);
            await page.waitForFunction(() => window.__libReady === true, null, { timeout: 90000 });
            await page.waitForLoadState('networkidle');
            await page.evaluate(() => Promise.all([...document.images].map(i => i.decode ? i.decode().catch(() => {}) : 0)));
            await page.waitForTimeout(400); /* the covers sprite, used by the leaning comics, is an SVG image: give it a moment */
            const info = await page.evaluate(() => {
                const boxes = [...document.querySelectorAll('.lb-box')];
                return {
                    std: window.__libStd, fixw: window.__libFixW,
                    boxes: boxes.map(b => {
                        const r = b.getBoundingClientRect(), c = b.querySelector('.lb-cap').getBoundingClientRect();
                        return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, nat: parseFloat(b.style.width), name: b.querySelector('.lb-cap').textContent, cap: { x: c.left + scrollX, y: c.top + scrollY, w: c.width, h: c.height } };
                    })
                };
            });
            if (!info.boxes.length) throw new Error('No bookcases were drawn.');
            if (!layout) layout = info;
            else info.boxes.forEach((b, i) => { if (Math.abs(b.w - layout.boxes[i].w) > 1 || Math.abs(b.h - layout.boxes[i].h) > 1) throw new Error('Light and dark bookcases are different sizes.'); });
            for (let i = 0; i < info.boxes.length; i++) {
                const b = info.boxes[i];
                /* One bookcase at a time, so nothing of its neighbour shows in the room kept around it */
                await page.evaluate(k => document.querySelectorAll('.lb-box').forEach((el, j) => { el.style.visibility = j === k ? '' : 'hidden'; }), i);
                const png = await page.screenshot({ clip: { x: b.x - PAD, y: b.y - PAD, width: b.w + 2 * PAD, height: b.h + 2 * PAD }, omitBackground: true, type: 'png' });
                const out = await sharp(png).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toBuffer({ resolveWithObject: true });
                files.push([path.join(ROOT, IMG_DIR, 'shelf-' + (i + 1) + '-' + scheme + '.webp'), out.data]);
                sizes['shelf-' + (i + 1) + '-' + scheme] = { bytes: out.data.length, w: out.info.width, h: out.info.height };
            }
            await ctx.close();
        }
    } finally { await browser.close(); srv.close(); }

    /* Place the pictures in natural units (the case's own drawing units), so the layout does not depend on the size they were made at */
    const bx = layout.boxes, s = bx[0].w / bx[0].nat, u = v => v / s, padU = PAD / s;
    /* The first PER_ROW bookcases make the first row; the rest make a second row, centred under it at the same scale */
    const left0 = bx[0].x, r1 = bx.slice(0, PER_ROW), T = u(r1[r1.length - 1].x + r1[r1.length - 1].w - left0) + 2 * padU;
    const maxW = Math.max(...bx.map(b => u(b.w) + 2 * padU));
    const pct = v => +(v * 100).toFixed(3);
    const rows = ['', ''];
    bx.forEach((b, i) => {
        const imgW = u(b.w) + 2 * padU, imgH = u(b.h) + 2 * padU;
        const gap = i && i !== PER_ROW ? u(b.x - left0) - u(bx[i - 1].x + bx[i - 1].w - left0) - 2 * padU : 0;
        const capL = (b.cap.x - (b.x - PAD)) / s / imgW, capT = (b.cap.y - (b.y - PAD)) / s / imgH, capW = b.cap.w / s / imgW, capH = b.cap.h / s / imgH;
        const dim = sizes['shelf-' + (i + 1) + '-light'];
        const img = scheme => '<img class="lib-shelf-img lib-shelf-' + scheme + '" src="{{asset "images/shelves/shelf-' + (i + 1) + '-' + scheme + '.webp"}}" width="' + dim.w + '" height="' + dim.h + '" alt="" loading="lazy" decoding="async">';
        /* data-px and data-py: the transparent margin round the artwork, as a fraction of the picture's width and height, so
           the page can grow the live bookcase from exactly where the artwork is */
        rows[i < PER_ROW ? 0 : 1] += '    <button class="lib-shelf" type="button" data-shelf="' + i + '" data-px="' + (padU / imgW).toFixed(5) + '" data-py="' + (padU / imgH).toFixed(5) + '" aria-label="Open ' + b.name + '" style="width:' + pct(imgW / T) + '%;margin-left:' + pct(gap / T) + '%;--rel:' + (imgW / maxW).toFixed(4) + ';--cap:' + (24 / imgW * 100).toFixed(2) + 'cqw">\n'
            + '        ' + img('light') + '\n        ' + img('dark') + '\n'
            + '        <span class="lib-shelf-cap" style="left:' + pct(capL) + '%;top:' + pct(capT) + '%;width:' + pct(capW) + '%;height:' + pct(capH) + '%" aria-hidden="true">' + b.name + '</span>\n'
            + '    </button>\n';
    });
    const partial = '{{!-- The Library landing: a picture of each bookcase, already in the page, each one button. Made by "npm run shelves"\n'
        + '      (extras/shelves/build.mjs) from the real drawing code and assets/data/library.json. Do not edit by hand; make it again\n'
        + '      whenever the data file, library.js or library.css change. data-std is the width of a standard bookcase, in drawing units. --}}\n'
        + stamp(hash) + '\n'
        + '<div class="lib-landing" id="lib-landing">\n'
        + '<div class="lib-shelves" id="lib-shelves" data-std="' + Math.round(layout.std) + '" data-fixw="' + Math.round(layout.fixw) + '">\n' + rows[0] + '</div>\n'
        + (rows[1] ? '<div class="lib-shelves lib-shelves-2">\n' + rows[1] + '</div>\n' : '')
        + '<p class="lib-allbooks"><a id="lib-allbooks" href="#books">Or see all ' + bookCount + ' books as a list <span aria-hidden="true">→</span></a></p>\n'
        + '<p class="lib-shelves-msg" id="lib-shelves-msg" role="status" hidden></p>\n</div>\n';
    /* Nothing is written until every picture has been made, so a failed run leaves the last good set alone */
    for (const [file, data] of files) fs.writeFileSync(file, data);
    fs.writeFileSync(path.join(ROOT, PARTIAL), partial);
    let total = 0;
    for (const [k, v] of Object.entries(sizes)) { total += v.bytes; console.log(k + '.webp  ' + v.w + 'x' + v.h + '  ' + (v.bytes / 1024).toFixed(0) + ' KB'); }
    console.log('Total ' + (total / 1024).toFixed(0) + ' KB (a visitor loads about half). Wrote ' + PARTIAL + ' (' + hash + ').');
}

if (process.argv.includes('--check')) check();
else generate().catch(e => { console.error(e.message || e); process.exit(1); });
