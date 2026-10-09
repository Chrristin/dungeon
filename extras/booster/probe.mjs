import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort()) {
    const { data, info } = await sharp(path.join(dir, f)).raw().toBuffer({ resolveWithObject: true });
    let n = 0, sx = 0, sy = 0, mnx = 1e9, mxx = 0, mny = 1e9, mxy = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 4; if (data[i + 3] < 200) continue; const r = data[i], g = data[i + 1], b = data[i + 2];
        if (g >= r - 14 && g > b + 38 && g > 105) { n++; sx += x; sy += y; if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; } }
    console.log(f.padEnd(14), info.width + 'x' + info.height, 'iris px', n, n ? 'box ' + (mxx - mnx + 1) + 'x' + (mxy - mny + 1) : '');
}
