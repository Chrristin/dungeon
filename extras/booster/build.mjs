/* npm run booster: builds Booster's sprite atlas for the Library from the painted sheets in extras/booster/source.
     assets/images/booster/booster.webp   every frame, packed
     assets/images/booster/booster.json   where each frame is, where her feet are, and how far she moves per walk frame
   Frames are cut out of the sheets (cut.mjs), drawn at the sizes in clips.mjs so she is one size everywhere, trimmed, and packed. */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSheet, keyBlack, frames } from './cut.mjs';
import { SHEETS, CLIPS } from './clips.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NATIVE = 0.77;   /* the sheets are drawn about 390 px across for the walk; the atlas keeps her about 300 px across */
const MAXW = 2048;

const raw = {};
for (const [name, s] of Object.entries(SHEETS)) {
    let sh = await loadSheet(name + '.webp'); if (s.key === 'black') sh = keyBlack(sh);
    raw[name] = frames(sh, { rows: s.rows, R: s.R });
    const want = s.rows.reduce((a, b) => a + b, 0);
    if (raw[name].length !== want) throw new Error(name + ': found ' + raw[name].length + ' cats, expected ' + want);
}
const items = [];
for (const [clip, [sheet, first, n]] of Object.entries(CLIPS)) {
    for (let i = 0; i < n; i++) {
        const f = raw[sheet][first - 1 + i], k = SHEETS[sheet].scale * NATIVE, w = Math.max(2, Math.round(f.w * k)), h = Math.max(2, Math.round(f.h * k));
        const buf = await sharp(f.buf, { raw: { width: f.w, height: f.h, channels: 4 } }).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
        /* her centre of weight sideways, and the lowest point of her */
        let sx = 0, cnt = 0, bot = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (buf[(y * w + x) * 4 + 3] > 128) { sx += x; cnt++; if (y > bot) bot = y; }
        items.push({ clip, i, w, h, buf, ax: Math.round(sx / cnt), ay: bot });
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
for (let i = 0; i < walk.length; i++) { const a = paws(walk[i]), b = paws(walk[(i + 1) % walk.length]); a.forEach(p => { let best = null; b.forEach(q => { const d = q - p; if (d > 3 && d < 70 && (best === null || d < best)) best = d; }); if (best !== null) steps.push(best); }); }
steps.sort((a, b) => a - b); const walkStep = steps.length ? steps[Math.floor(steps.length / 2)] : 22;

const meta = { img: 'booster.webp', w: AW, h: AH, walkStep: +walkStep.toFixed(1), clips: {} };
for (const it of items) (meta.clips[it.clip] = meta.clips[it.clip] || []).push([it.x, it.y, it.w, it.h, it.ax, it.ay]);
const dir = path.join(ROOT, 'assets/images/booster'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'booster.webp'), atlas); fs.writeFileSync(path.join(dir, 'booster.json'), JSON.stringify(meta));
console.log('atlas', AW + 'x' + AH, (atlas.length / 1024).toFixed(0) + ' KB', items.length + ' frames', 'walk step', meta.walkStep, 'from', steps.length, 'paw pairs');
