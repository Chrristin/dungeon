/* Cuts the frames of Booster out of the source sheets (extras/booster/source) and reports what it found.
   Each sheet is a picture of several poses; this finds each cat as one connected shape, drops the printed labels,
   keeps whiskers and tail tips that touch her, and returns the frames in reading order. */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));

export async function loadSheet(file) {
    const { data, info } = await sharp(path.join(HERE, 'source', file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    return { data, W, H };
}
/* a sheet drawn on opaque black: the black connected to the edge becomes transparent, with the edge ring cleaned */
export function keyBlack(sh) {
    const { data, W, H } = sh, bg = new Uint8Array(W * H), st = [];
    const dark = i => Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < 16;
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) { const i = st.pop(); if (bg[i] || !dark(i)) continue; bg[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
    const ring = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (bg[i]) continue; if (bg[i - 1] || bg[i + 1] || bg[i - W] || bg[i + W] || bg[i - W - 1] || bg[i - W + 1] || bg[i + W - 1] || bg[i + W + 1]) ring[i] = 1; }
    for (let i = 0; i < W * H; i++) data[i * 4 + 3] = bg[i] ? 0 : ring[i] ? 120 : 255;
    return sh;
}
export function frames(sh, opt = {}) {
    const { data, W, H } = sh, lab = new Int32Array(W * H), comps = [null], R = opt.R || 4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (data[i * 4 + 3] <= 24 || lab[i]) continue;
        const id = comps.length, c = { id, area: 0, x0: x, x1: x, y0: y, y1: y, r: 0, g: 0, b: 0 }; comps.push(c); const s = [i]; lab[i] = id;
        while (s.length) { const j = s.pop(), xx = j % W, yy = (j / W) | 0; c.area++; c.r += data[j * 4]; c.g += data[j * 4 + 1]; c.b += data[j * 4 + 2];
            if (xx < c.x0) c.x0 = xx; if (xx > c.x1) c.x1 = xx; if (yy < c.y0) c.y0 = yy; if (yy > c.y1) c.y1 = yy;
            for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const nx = xx + dx, ny = yy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (!lab[k] && data[k * 4 + 3] > 24) { lab[k] = id; s.push(k); } } }
    }
    const BIG = opt.big || 9000, big = comps.filter(c => c && c.area >= BIG);
    /* small pieces: printed labels are neutral and dark, so they go; anything else small joins the cat whose box it sits in */
    const owner = new Int32Array(comps.length);
    comps.forEach(c => { if (!c || c.area >= BIG) return; const r = c.r / c.area, g = c.g / c.area, b = c.b / c.area, neutral = Math.abs(r - g) < 22 && Math.abs(g - b) < 22 && (r + g + b) / 3 < 130;
        if (neutral || c.area < 25) return; const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2; let best = 0, bd = 1e9;
        big.forEach(B => { const dx = Math.max(B.x0 - cx, 0, cx - B.x1), dy = Math.max(B.y0 - cy, 0, cy - B.y1), d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = B.id; } }); if (bd < 14) owner[c.id] = best; });
    big.forEach(B => { owner[B.id] = B.id; });
    const out = big.map(B => ({ id: B.id, x0: B.x0, x1: B.x1, y0: B.y0, y1: B.y1, area: B.area, cy: (B.y0 + B.y1) / 2 }));
    comps.forEach(c => { if (!c || c.area >= BIG || !owner[c.id]) return; const o = out.find(q => q.id === owner[c.id]); o.x0 = Math.min(o.x0, c.x0); o.x1 = Math.max(o.x1, c.x1); o.y0 = Math.min(o.y0, c.y0); o.y1 = Math.max(o.y1, c.y1); });
    /* reading order: rows by the lowest point of each cat, then left to right */
    out.forEach(o => { o.bot = o.y1; });
    const rows = opt.rows; let order;
    if (rows) { /* rows = how many cats per row, in order */ const byY = out.slice().sort((a, b) => a.cy - b.cy); order = []; let k = 0; rows.forEach(n => { const g = byY.slice(k, k + n).sort((a, b) => a.x0 - b.x0); order.push(...g); k += n; }); }
    else order = out.sort((a, b) => a.x0 - b.x0);
    return order.map(o => {
        const w = o.x1 - o.x0 + 1, h = o.y1 - o.y0 + 1, buf = Buffer.alloc(w * h * 4); let gr = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const gi = (y + o.y0) * W + x + o.x0, li = y * w + x, own = owner[lab[gi]] === o.id; buf[li * 4] = data[gi * 4]; buf[li * 4 + 1] = data[gi * 4 + 1]; buf[li * 4 + 2] = data[gi * 4 + 2]; buf[li * 4 + 3] = own ? data[gi * 4 + 3] : 0;
            if (own) { const r = data[gi * 4], g = data[gi * 4 + 1], b = data[gi * 4 + 2]; if (g > r + 8 && g > b + 22 && g > 90) gr++; } }
        return { w, h, buf, green: gr, area: o.area };
    });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const spec = { walk: [4, 4], look: [3, 3], sit: [3, 3], groom: [3, 3], sleep: [5, 5], stretch: [5], jump: [6, 5, 5, 4], crouch: [5], idle: [4] };
    const scratch = process.argv[2]; fs.mkdirSync(scratch, { recursive: true });
    for (const [name, rows] of Object.entries(spec)) {
        let sh = await loadSheet(name + '.webp'); if (name === 'idle') sh = keyBlack(sh);
        const fr = frames(sh, { rows, R: name === 'crouch' ? 1 : 4 }), want = rows.reduce((a, b) => a + b, 0);
        console.log(name.padEnd(8), 'found', fr.length, 'wanted', want, fr.map(f => f.w + 'x' + f.h + ' g' + f.green).join('  '));
        for (let i = 0; i < fr.length; i++) await sharp(fr[i].buf, { raw: { width: fr[i].w, height: fr[i].h, channels: 4 } }).png().toFile(path.join(scratch, name + '_' + String(i + 1).padStart(2, '0') + '.png'));
    }
}
