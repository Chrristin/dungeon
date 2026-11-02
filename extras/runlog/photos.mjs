#!/usr/bin/env node
// Runlog photos: original JPEGs in, a pin list and clean copies out.
//
//   node extras/runlog/photos.mjs <run.gpx> <photos-dir> <meta.json> <out-dir> --slug <slug> [--tz 5.5]
//
// Each photo's capture time (EXIF) is matched to the run's own clock to find where on the route it was taken, and its GPS
// position (if it has one) is checked against that: a photo more than 60 m from the route is reported, not placed by GPS.
// Out: <out-dir>/<slug>-p<n>.jpg (1,400 px on its long side) and <slug>-p<n>-s.jpg (480 px), both with ALL EXIF removed
// (no GPS, no time, no camera), and <out-dir>/pins.json for `build.mjs --pins`. meta.json says, per original file name,
// {"title": "...", "credit": "...", "alt": "a plain description of the picture"}; a photo with no EXIF may be given "km": 4.2, and is then shown as "somewhere along the route". Needs `sharp` (npm install).
// The copies are meant for Ghost's image storage, not for this repository. See docs/runlog.md.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [gpxPath, dir, metaPath, outDir] = pos;
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
if (!gpxPath || !dir || !metaPath || !outDir || !opt('slug')) { console.error('usage: photos.mjs <run.gpx> <photos-dir> <meta.json> <out-dir> --slug <slug> [--tz 5.5]'); process.exit(1); }
const slug = opt('slug'), tzMin = Math.round(+opt('tz', 5.5) * 60);
const sharp = (await import('sharp')).default;
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
function exifOf(b) {
  let p = 2;
  while (p < b.length - 4 && b[p] === 0xff) {
    const m = b[p + 1], len = b.readUInt16BE(p + 2);
    if (m === 0xe1 && b.toString('latin1', p + 4, p + 8) === 'Exif') {
      const t = p + 10, le = b.toString('latin1', t, t + 2) === 'II';
      const u16 = o => le ? b.readUInt16LE(t + o) : b.readUInt16BE(t + o), u32 = o => le ? b.readUInt32LE(t + o) : b.readUInt32BE(t + o);
      const val = (type, count, vo) => {
        const o = SZ[type] * count > 4 ? u32(vo) : vo;
        if (type === 2) return b.toString('latin1', t + o, t + o + count).replace(/\0.*$/, '');
        const out = []; for (let i = 0; i < count; i++) { const q = o + i * SZ[type]; if (type === 3) out.push(u16(q)); else if (type === 4) out.push(u32(q)); else if (type === 5) out.push(u32(q) / (u32(q + 4) || 1)); else out.push(b[t + q]); }
        return count === 1 ? out[0] : out;
      };
      const res = {};
      const ifd = (o, ns) => { const n = u16(o); for (let i = 0; i < n; i++) { const e = o + 2 + i * 12, tag = u16(e), type = u16(e + 2), count = u32(e + 4); if (tag === 0x8825) { ifd(u32(e + 8), 'gps'); continue; } if (tag === 0x8769) { ifd(u32(e + 8), 'exif'); continue; } if (SZ[type]) res[ns + ':' + tag.toString(16)] = val(type, count, e + 8); } };
      ifd(u32(4), 'ifd0'); return res;
    }
    if (m === 0xda) break; p += 2 + len;
  }
  return null;
}
const dms = (a, ref) => { if (!Array.isArray(a)) return null; const v = a[0] + a[1] / 60 + a[2] / 3600; return /[SW]/.test(ref) ? -v : v; };

const xml = fs.readFileSync(gpxPath, 'utf8');
const pts = [...xml.matchAll(/<trkpt lat="([-\d.]+)" lon="([-\d.]+)"[^>]*>\s*<ele>[^<]*<\/ele>\s*<time>([^<]+)<\/time>/g)].map(m => ({ la: +m[1], lo: +m[2], t: Date.parse(m[3]) }));
const info = tag => { const m = new RegExp('<exerciseinfo>[\\s\\S]*?<' + tag + '>([-\\d.]+)</' + tag + '>').exec(xml); return m ? +m[1] : null; };
const R = Math.PI / 180, hav = (a, b) => Math.hypot((b.lo - a.lo) * R * Math.cos(a.la * R), (b.la - a.la) * R) * 6371000;
const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hav(pts[i - 1], pts[i]));
const scale = (info('distance') || cum[cum.length - 1]) / cum[cum.length - 1];
const t0 = pts[0].t, t1 = pts[pts.length - 1].t;

fs.mkdirSync(outDir, { recursive: true });
const rows = [];
for (const f of fs.readdirSync(dir).filter(n => /\.jpe?g$/i.test(n))) {
  const b = fs.readFileSync(path.join(dir, f)), e = exifOf(b), m = meta[f];
  if (!m || !m.title) { console.error('SKIPPED (no title in meta.json):', f); continue; }
  if (typeof m.km === 'number') { /* no usable EXIF: the place is given by hand and is marked as a guess */ const gi = Math.max(0, cum.findIndex(c => c * scale >= m.km * 1000)); rows.push({ f, i: gi, km: m.km, how: 'given by hand, marked approximate', gd: null, warn: '', approx: true, m }); continue; }
  if (!e) { console.error('SKIPPED (no EXIF and no km in meta.json):', f); continue; }
  const taken = e['exif:9003'] || e['ifd0:132'], off = e['exif:9011'] || (tzMin >= 0 ? '+' : '-') + String(Math.floor(Math.abs(tzMin) / 60)).padStart(2, '0') + ':' + String(Math.abs(tzMin) % 60).padStart(2, '0');
  const g = e['gps:2'] ? { la: dms(e['gps:2'], e['gps:1']), lo: dms(e['gps:4'], e['gps:3']) } : null;
  let tu = null; const tm = taken && /(\d+):(\d+):(\d+) (\d+):(\d+):(\d+)/.exec(taken);
  if (tm) tu = Date.UTC(+tm[1], +tm[2] - 1, +tm[3], +tm[4], +tm[5], +tm[6]) - (off[0] === '-' ? -1 : 1) * (+off.slice(1, 3) * 60 + +off.slice(4, 6)) * 60000;
  let i = -1, how = '';
  if (tu !== null && tu >= t0 && tu <= t1) { i = Math.max(0, pts.findIndex(p => p.t >= tu)); how = 'time'; }
  let gd = null;
  if (g) { let bi = 0, bd = 1e12; pts.forEach((p, k) => { const d = hav(p, g); if (d < bd) { bd = d; bi = k; } }); gd = Math.round(bd); if (i < 0 && bd <= 60) { i = bi; how = 'gps'; } }
  if (i < 0) { console.error('SKIPPED (not on the run by time or GPS):', f); continue; }
  const warn = g && gd > 60 ? ' GPS is ' + gd + ' m from the route' : '';
  rows.push({ f, i, km: Math.round(cum[i] * scale / 10) / 100, tu, how, gd, warn, m });
}
rows.sort((a, b) => a.i - b.i);
const pins = [];
for (let n = 0; n < rows.length; n++) {
  const r = rows[n], base = path.join(outDir, slug + '-p' + (n + 1));
  const src = sharp(path.join(dir, r.f)).rotate();
  await src.clone().resize({ width: 1400, height: 1400, fit: 'inside' }).jpeg({ quality: 80, mozjpeg: true }).toFile(base + '.jpg');
  await src.clone().resize({ width: 480, height: 480, fit: 'inside' }).jpeg({ quality: 76, mozjpeg: true }).toFile(base + '-s.jpg');
  for (const out of [base + '.jpg', base + '-s.jpg']) if (exifOf(fs.readFileSync(out))) throw new Error('EXIF survived in ' + out);
  pins.push({ ...(r.approx ? { approx: true } : {}), km: r.km, title: r.m.title, credit: r.m.credit || '', alt: r.m.alt || '', file: path.basename(base) + '.jpg', thumbFile: path.basename(base) + '-s.jpg' });
  console.log((n + 1) + '. km ' + r.km + ' (by ' + r.how + (r.gd != null ? ', GPS ' + r.gd + ' m off the route' : ', no GPS') + ') ' + r.f + ' -> ' + path.basename(base) + '.jpg' + r.warn);
}
fs.writeFileSync(path.join(outDir, 'pins.json'), JSON.stringify(pins, null, 1));
console.log(pins.length + ' pins written; every copy checked: no EXIF left.');
