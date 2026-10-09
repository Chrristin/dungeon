/* npm run booster: builds Booster's sprite atlas for the Library from the painted sheets in extras/booster/source.
     assets/images/booster/booster.webp   every frame, packed
     assets/images/booster/booster.json   where each frame is, where her feet are, and how far she moves per walk frame
   Frames are cut out of the sheets (cut.mjs), drawn at the sizes in clips.mjs so she is one size everywhere, trimmed, and packed. */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSheet, keyBlack, frames, loadFolder } from './cut.mjs';
import { SHEETS, CLIPS } from './clips.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NATIVE = 0.77;   /* the sheets are drawn about 390 px across for the walk; the atlas keeps her about 300 px across */
const MAXW = 2048;

const raw = {};
for (const [name, s] of Object.entries(SHEETS)) {
    if (s.dir) { raw[name] = await loadFolder(s.dir); if (raw[name].length !== s.count) throw new Error(name + ': found ' + raw[name].length + ' pictures, expected ' + s.count); continue; }
    let sh = await loadSheet(name + '.webp'); if (s.key === 'black') sh = keyBlack(sh);
    raw[name] = frames(sh, { rows: s.rows, R: s.R });
    const want = s.rows.reduce((a, b) => a + b, 0);
    if (raw[name].length !== want) throw new Error(name + ': found ' + raw[name].length + ' cats, expected ' + want);
}
/* One colour and one size everywhere. The sheets were painted separately, so each came out a slightly different brown and a
   slightly different size. Colour: every sheet's brown (the fur that is neither white nor black) is pulled to BROWN, and
   white and black are left alone. Size: each frame is drawn so that her silhouette has the same area, with a little room
   (10 percent) for poses that really are longer or shorter; a curled-up cat is held a little smaller than a standing one. */
const BROWN = [120, 65, 39], AREA = { sleep: 30000 }, AREA_DEFAULT = 32000;
const sizeOf = {};
for (const [name, s] of Object.entries(SHEETS)) {
    let r = 0, g = 0, b = 0, n = 0;
    for (const f of raw[name]) for (let p = 0; p < f.w * f.h; p++) { const o = p * 4; if (f.buf[o + 3] > 128) { const R = f.buf[o], G = f.buf[o + 1], B = f.buf[o + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B); if (mx - mn > 45 && mx < 210) { r += R; g += G; b += B; n++; } } }
    const gain = [r, g, b].map((v, i) => Math.min(1.3, Math.max(.75, BROWN[i] / (v / n))));
    for (const f of raw[name]) for (let p = 0; p < f.w * f.h; p++) { const o = p * 4; if (f.buf[o + 3] > 0) { const mx = Math.max(f.buf[o], f.buf[o + 1], f.buf[o + 2]), mn = Math.min(f.buf[o], f.buf[o + 1], f.buf[o + 2]), w = mx < 225 ? Math.min(1, Math.max(0, (mx - mn - 25) / 35)) : 0;
        for (let c = 0; c < 3; c++) f.buf[o + c] = Math.min(255, Math.round(f.buf[o + c] * (1 + (gain[c] - 1) * w))); } }
    const T = AREA[name] || AREA_DEFAULT, ar = raw[name].map(f => f.area * s.scale * s.scale).sort((a, b) => a - b), med = ar[Math.floor(ar.length / 2)];
    sizeOf[name] = { T, sheet: Math.sqrt(T / med), gain };
    console.log(name.padEnd(8), 'colour gain', gain.map(v => v.toFixed(2)).join(' '), ' size factor', sizeOf[name].sheet.toFixed(3));
}
const items = [];
for (const [clip, [sheet, first, n]] of Object.entries(CLIPS)) {
    for (let i = 0; i < n; i++) {
        const f = raw[sheet][first - 1 + i], z = sizeOf[sheet], own = Math.sqrt(z.T / (f.area * SHEETS[sheet].scale * SHEETS[sheet].scale)), k = SHEETS[sheet].scale * NATIVE * z.sheet * Math.min(1.1, Math.max(.9, own / z.sheet)), w = Math.max(2, Math.round(f.w * k)), h = Math.max(2, Math.round(f.h * k));
        const buf = await sharp(f.buf, { raw: { width: f.w, height: f.h, channels: 4 } }).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
        /* her centre of weight sideways, and the lowest point of her */
        let sx = 0, cnt = 0, bot = 0, tx = 0, tn = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (buf[(y * w + x) * 4 + 3] > 128) { sx += x; cnt++; if (y > bot) bot = y; }
        /* the anchor is the middle of her trunk (the band of rows across her back and belly), not of everything: legs, head and tail swing, the trunk is what must stay put from one frame to the next, or the fade between two frames shows two cats */
        for (let y = Math.round(h * .22); y < Math.round(h * .62); y++) for (let x = 0; x < w; x++) if (buf[(y * w + x) * 4 + 3] > 128) { tx += x; tn++; }
        items.push({ clip, i, w, h, buf, ax: Math.round((tn > 40 ? tx / tn : sx / cnt)), ay: bot });
    }
}
/* pack, left to right in rows */
let x = 0, y = 0, rowH = 0;
for (const it of items) { if (x + it.w + 2 > MAXW) { x = 0; y += rowH + 2; rowH = 0; } it.x = x; it.y = y; x += it.w + 2; if (it.h > rowH) rowH = it.h; }
const AW = MAXW, AH = y + rowH;
const atlas = await sharp({ create: { width: AW, height: AH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(await Promise.all(items.map(async it => ({ input: await sharp(it.buf, { raw: { width: it.w, height: it.h, channels: 4 } }).png().toBuffer(), left: it.x, top: it.y })))).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toBuffer();

/* how far she moves between walk frames: follow each paw on the floor from one frame to the next, relative to her body */
const walk = items.filter(i => i.clip === 'walk');
function paws(it) { const xs = [], band = 6; for (let xx = 0; xx < it.w; xx++) { let on = false; for (let yy = it.ay - band; yy <= it.ay; yy++) if (yy >= 0 && it.buf[(yy * it.w + xx) * 4 + 3] > 128) { on = true; break; } xs.push(on); }
    const out = []; let s = -1; for (let i = 0; i <= xs.length; i++) { if (i < xs.length && xs[i]) { if (s < 0) s = i; } else if (s >= 0) { if (i - s > 5) out.push((s + i) / 2 - it.ax); s = -1; } } return out; }
const steps = [];
for (let i = 0; i < walk.length; i++) { const a = paws(walk[i]), b = paws(walk[(i + 1) % walk.length]); a.forEach(p => { let best = null; b.forEach(q => { const d = q - p; if (d > 0.4 && d < 40 && (best === null || d < best)) best = d; }); if (best !== null) steps.push(best); }); }
steps.sort((a, b) => a - b); const walkStep = steps.length ? steps[Math.floor(steps.length / 2)] : 22; console.log('paw steps (quartiles, 90th)', [.25, .5, .75, .9].map(q => steps[Math.floor(steps.length * q)]).join(' '));

const meta = { img: 'booster.webp', w: AW, h: AH, walkStep: +walkStep.toFixed(1), clips: {} };
for (const it of items) (meta.clips[it.clip] = meta.clips[it.clip] || []).push([it.x, it.y, it.w, it.h, it.ax, it.ay]);
const dir = path.join(ROOT, 'assets/images/booster'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'booster.webp'), atlas); fs.writeFileSync(path.join(dir, 'booster.json'), JSON.stringify(meta));
console.log('atlas', AW + 'x' + AH, (atlas.length / 1024).toFixed(0) + ' KB', items.length + ' frames', 'walk step', meta.walkStep, 'from', steps.length, 'paw pairs');
