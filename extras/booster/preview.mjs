import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
import { SHEETS, CLIPS } from './clips.mjs';
const dir = process.argv[2], out = process.argv[3], K = +process.argv[4] || 0.5;
const rows = []; let maxW = 0;
for (const [name, [sheet, first, n]] of Object.entries(CLIPS)) {
    const sc = SHEETS[sheet].scale * K, items = []; let x = 10, maxH = 0;
    for (let i = 0; i < n; i++) { const f = path.join(dir, sheet + '_' + String(first + i).padStart(2, '0') + '.png'); const m = await sharp(f).metadata();
        const w = Math.round(m.width * sc), h = Math.round(m.height * sc); items.push({ buf: await sharp(f).resize(w, h).toBuffer(), x, w, h }); x += w + 12; if (h > maxH) maxH = h; }
    rows.push({ name, items, maxH, w: x }); if (x > maxW) maxW = x;
}
const comp = []; let y = 4; const label = [];
for (const r of rows) { const base = y + r.maxH + 8; for (const it of r.items) comp.push({ input: it.buf, left: it.x, top: base - it.h }); label.push({ name: r.name, y: base }); y = base + 22; }
const H = y + 6;
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + maxW + '" height="' + H + '">' + label.map(l => '<line x1="0" x2="' + maxW + '" y1="' + l.y + '" y2="' + l.y + '" stroke="#8a7a6a" stroke-width="1"/><text x="10" y="' + (l.y + 15) + '" font-family="Arial" font-size="13" fill="#444">' + l.name + '</text>').join('') + '</svg>');
await sharp({ create: { width: maxW, height: H, channels: 4, background: '#f4f1ea' } }).composite([{ input: svg, left: 0, top: 0 }, ...comp]).png().toFile(out);
console.log('ok', maxW, H);
