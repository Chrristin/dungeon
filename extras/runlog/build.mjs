#!/usr/bin/env node
// Runlog builder: one GPX (and, if given, one OpenStreetMap extract) in, the theme's run data out.
//
//   node extras/runlog/build.mjs <run.gpx> --slug 2026-10-31-kochi-dawn-15k --title "Kochi Dawn 15K" \
//        [--osm map.osm] [--fetch] [--pins pins.json] [--trim 0] [--out assets/data/runs]
//
// Writes <out>/<slug>.json (the run), <out>/<slug>.map.json (the map shapes, when an extract is given) and
// updates <out>/index.json (one summary per run; the index page and the shared records are drawn from it).
// See docs/runlog.md for the shape of every file. Not in the release zip.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const gpxPath = args.find(a => !a.startsWith('--') && /\.gpx$/i.test(a));
if (!gpxPath) { console.error('usage: build.mjs <run.gpx> --slug <slug> --title <title> [--osm map.osm] [--fetch] [--pins pins.json] [--trim metres] [--out dir]'); process.exit(1); }
const slug = opt('slug', path.basename(gpxPath, '.gpx'));
const title = opt('title', slug);
const outDir = opt('out', 'assets/data/runs');
const trim = +opt('trim', 0);
const tzMin = Math.round(+opt('tz', 5.5) * 60);

const xml = fs.readFileSync(gpxPath, 'utf8');
const raw = [...xml.matchAll(/<trkpt lat="([-\d.]+)" lon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g)].map(m => {
  const time = /<time>([^<]+)<\/time>/.exec(m[3]), hr = /<gpxtpx:hr>(\d+)/.exec(m[3]), cad = /<gpxtpx:cad>(\d+)/.exec(m[3]);
  return { la: +m[1], lo: +m[2], ms: time ? Date.parse(time[1]) : NaN, hr: hr ? +hr[1] : null, cad: cad ? +cad[1] : null };
}).filter(p => !Number.isNaN(p.ms));
if (raw.length < 60) throw new Error('fewer than 60 timed points in the GPX');
const info = (tag) => { const m = new RegExp('<exerciseinfo>[\\s\\S]*?<' + tag + '>([-\\d.]+)</' + tag + '>').exec(xml); return m ? +m[1] : null; };

// forward-fill heart rate and cadence (the watch drops them now and then); leading gaps take the first value seen
for (const key of ['hr', 'cad']) {
  let last = raw.find(p => p[key] != null)?.[key] ?? 0;
  for (const p of raw) { if (p[key] == null) p[key] = last; else last = p[key]; }
}

// distance: the track is measured, then scaled evenly to the watch's own figure (the watch corrects with its step count)
const RAD = Math.PI / 180, ER = 6371000;
const hav = (a, b) => { const x = (b.lo - a.lo) * RAD * Math.cos(a.la * RAD), y = (b.la - a.la) * RAD; return Math.hypot(x, y) * ER; };
const cum = [0]; for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + hav(raw[i - 1], raw[i]));
const officialM = info('distance') || cum[cum.length - 1];
const scale = officialM / cum[cum.length - 1];
raw.forEach((p, i) => { p.d = cum[i] * scale; p.t = (p.ms - raw[0].ms) / 1000; });
const durationS = info('duration') ? info('duration') / 1000 : raw[raw.length - 1].t;

// stops: a run of at least 10 s below 0.5 m/s. The replay clock skips them (one second each); the figures keep them.
const stopFlag = raw.map((p, i) => { const a = raw[Math.max(0, i - 2)], b = raw[Math.min(raw.length - 1, i + 2)]; return (b.d - a.d) / Math.max(1, b.t - a.t) < 0.5; });
const stops = [];
for (let i = 0; i < raw.length;) { if (!stopFlag[i]) { i++; continue; } let j = i; while (j < raw.length && stopFlag[j]) j++; if (raw[j - 1].t - raw[i].t >= 10) stops.push([i, j - 1]); i = j; }
const inStop = new Array(raw.length).fill(false); stops.forEach(([a, b]) => { for (let i = a + 1; i <= b; i++) inStop[i] = true; });
let mt = 0; raw.forEach((p, i) => { if (i) mt += inStop[i] ? 0.02 : (p.t - raw[i - 1].t); p.mt = mt; });

// the page works in a square-ish space 1000 units on its longer side; a unit is a few metres
const la0 = Math.min(...raw.map(p => p.la)), la1 = Math.max(...raw.map(p => p.la));
const lo0 = Math.min(...raw.map(p => p.lo)), lo1 = Math.max(...raw.map(p => p.lo));
const k = Math.cos(((la0 + la1) / 2) * RAD), sc = 1000 / Math.max((lo1 - lo0) * k, la1 - la0);
const proj = { lo0, la1, k, sc };
const P = (la, lo) => [Math.round((lo - lo0) * k * sc * 10) / 10, Math.round((la1 - la) * sc * 10) / 10];
const W = Math.round((lo1 - lo0) * k * sc), H = Math.round((la1 - la0) * sc);
const metresPerUnit = (la1 - la0) * RAD * ER / H;

// what is published: samples every 5 s, minus the first and last `trim` metres if asked for
const first = trim ? raw.findIndex(p => p.d >= trim) : 0;
let lastIx = raw.length - 1; if (trim) while (lastIx > 0 && raw[lastIx].d > officialM - trim) lastIx--;
const keep = raw.filter((p, i) => i >= first && i <= lastIx && (i % 5 === 0 || i === lastIx));
const r1 = v => Math.round(v * 10) / 10;
const run = {
  slug, title, w: W, h: H, mpu: r1(metresPerUnit * 100) / 100,
  start: new Date(raw[0].ms + tzMin * 60000).toISOString().slice(0, 16),
  km: r1(officialM / 100) / 10, durationS: Math.round(durationS), trim,
  x: [], y: [], d: [], t: [], mt: [], hr: [], cad: [],
  stops: stops.map(([a, b]) => [Math.round(raw[a].t), Math.round(raw[b].t - raw[a].t)])
};
for (const p of keep) { const q = P(p.la, p.lo); run.x.push(q[0]); run.y.push(q[1]); run.d.push(Math.round(p.d)); run.t.push(Math.round(p.t)); run.mt.push(Math.round(p.mt)); run.hr.push(p.hr); run.cad.push(p.cad); }

// splits by elapsed time, so walk breaks show up in them
const timeAt = dist => { let i = raw.findIndex(p => p.d >= dist); if (i <= 0) return raw[0].t; const a = raw[i - 1], b = raw[i]; return a.t + (b.t - a.t) * (dist - a.d) / Math.max(1e-6, b.d - a.d); };
run.splits = [];
for (let km = 1; km * 1000 <= officialM + 1; km++) {
  const t0 = timeAt((km - 1) * 1000), t1 = timeAt(km * 1000);
  const seg = raw.filter(p => p.d >= (km - 1) * 1000 && p.d < km * 1000);
  run.splits.push({ km, s: Math.round(t1 - t0), hr: Math.round(seg.reduce((a, p) => a + p.hr, 0) / Math.max(1, seg.length)) });
}
const restM = officialM - run.splits.length * 1000;
if (restM > 50) { const t0 = timeAt(run.splits.length * 1000); const seg = raw.filter(p => p.d >= run.splits.length * 1000); run.splits.push({ km: r1(restM / 100) / 10 + run.splits.length, part: Math.round(restM), s: Math.round(durationS - t0), hr: Math.round(seg.reduce((a, p) => a + p.hr, 0) / Math.max(1, seg.length)) }); }

// best efforts: the fastest stretch of 1, 5 and 10 km, by a sliding window over the 1 Hz track
function best(len) {
  if (officialM < len) return null;
  let b = Infinity, j = 0;
  for (let i = 0; i < raw.length; i++) { while (j < raw.length - 1 && raw[j].d - raw[i].d < len) j++; if (raw[j].d - raw[i].d >= len) b = Math.min(b, raw[j].t - raw[i].t); }
  return Number.isFinite(b) ? Math.round(b) : null;
}
// a single km more than 30% faster than the run's average pace is a GPS jump (the first km is often short while the watch finds its signal), not a record
const avgKm = durationS / (officialM / 1000), fullSplits = run.splits.filter(s => !s.part && s.s >= 0.7 * avgKm).map(s => s.s);
const bestK = { 1: fullSplits.length ? Math.min(...fullSplits) : null, 5: best(5000), 10: best(10000), 21: best(21097) };

// optional pins, from photos.mjs once its copies are uploaded: [{km, title, credit, alt, src, thumb, approx}] placed on the route by distance; approx: true says the place is a guess
const pinsPath = opt('pins', null);
run.pins = [];
if (pinsPath && pinsPath !== true) for (const p of JSON.parse(fs.readFileSync(pinsPath, 'utf8'))) {
  const i = raw.findIndex(q => q.d >= p.km * 1000); if (i < 0) continue;
  run.pins.push({ km: p.km, t: Math.round(raw[i].t), mt: Math.round(raw[i].mt), x: P(raw[i].la, raw[i].lo)[0], y: P(raw[i].la, raw[i].lo)[1], title: p.title || '', credit: p.credit || '', alt: p.alt || '', src: p.src || '', thumb: p.thumb || p.src || '', ...(p.approx ? { approx: true } : {}) });
}

const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const thumbStep = Math.max(1, Math.floor(keep.length / 140));
const summary = {
  slug, title, start: run.start, km: run.km, durationS: run.durationS, paceS: Math.round(durationS / (officialM / 1000)),
  hrAvg: Math.round(avg(raw.map(p => p.hr))), hrMax: Math.max(...raw.map(p => p.hr)), cadAvg: Math.round(avg(raw.map(p => p.cad))),
  best: bestK, w: W, h: H,
  thumb: keep.filter((_, i) => i % thumbStep === 0).flatMap((p) => P(p.la, p.lo)).map(Math.round)
};
run.summary = { ...summary, thumb: undefined };

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, slug + '.json'), JSON.stringify(run));
const idxPath = path.join(outDir, 'index.json');
let idx = []; try { idx = JSON.parse(fs.readFileSync(idxPath, 'utf8')); } catch (e) { /* first run */ }
idx = idx.filter(r => r.slug !== slug).concat(summary).sort((a, b) => (a.start < b.start ? 1 : -1));
fs.writeFileSync(idxPath, JSON.stringify(idx));

// the map: OpenStreetMap shapes in the same units as the route
let osmPath = opt('osm', null);
if (osmPath === true) osmPath = null;
if (osmPath && !fs.existsSync(osmPath) && opt('fetch', false)) {
  const m = 0.004, url = `https://www.openstreetmap.org/api/0.6/map?bbox=${(lo0 - m).toFixed(4)},${(la0 - m).toFixed(4)},${(lo1 + m).toFixed(4)},${(la1 + m).toFixed(4)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'dungeon-runlog/1.0 (christingeorge.com)' } });
  if (!res.ok) throw new Error('OpenStreetMap said ' + res.status + ' for ' + url);
  fs.writeFileSync(osmPath, Buffer.from(await res.arrayBuffer()));
  console.log('fetched', url);
}
if (osmPath && fs.existsSync(osmPath)) {
  const shapes = buildShapes(fs.readFileSync(osmPath, 'utf8'), P);
  fs.writeFileSync(path.join(outDir, slug + '.map.json'), JSON.stringify({ w: W, h: H, ...shapes }));
  console.log('map:', Object.entries(shapes.poly).map(([k, v]) => k + ' ' + v.length).join(', '), '|', Object.entries(shapes.lines).map(([k, v]) => k + ' ' + v.length).join(', '));
}
console.log(`${slug}: ${run.km} km, ${Math.round(durationS)} s, ${run.x.length} samples, ${stops.length} stops, best`, bestK);

function tagsOf(s) { const t = {}; for (const m of s.matchAll(/<tag k="([^"]*)" v="([^"]*)"/g)) t[m[1]] = m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'"); return t; }
function buildShapes(x, P) {
  const nodes = new Map(), places = [];
  for (const m of x.matchAll(/<node id="(\d+)"[^>]*?lat="([-\d.]+)" lon="([-\d.]+)"[^>]*?(?:\/>|>([\s\S]*?)<\/node>)/g)) {
    const q = P(+m[2], +m[3]); nodes.set(m[1], q);
    if (m[4]) { const t = tagsOf(m[4]); if (t.place && t.name && /^(suburb|neighbourhood|village|town|locality|hamlet|island|quarter)$/.test(t.place)) places.push([q[0], q[1], t.name]); }
  }
  const ways = new Map();
  for (const m of x.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
    const pts = [...m[2].matchAll(/<nd ref="(\d+)"/g)].map(a => nodes.get(a[1])).filter(Boolean);
    ways.set(m[1], { t: tagsOf(m[2]), pts });
  }
  const kind = t => {
    if (t.building) return 'bldg';
    if (t.natural === 'water' || t.waterway === 'riverbank' || t.landuse === 'reservoir' || t.landuse === 'basin' || t.water) return 'water';
    if (t.natural === 'wetland' || t.crop === 'rice' || /^(farmland|meadow|orchard|paddy|farmyard|plant_nursery|greenhouse_horticulture|aquaculture)$/.test(t.landuse || '')) return 'paddy';
    if (/^(forest|grass|village_green|recreation_ground|cemetery|allotments)$/.test(t.landuse || '') || /^(wood|scrub|grassland|heath)$/.test(t.natural || '') || /^(park|garden|pitch|playground|golf_course)$/.test(t.leisure || '')) return 'green';
    if (/^(residential|commercial|industrial|retail|institutional|construction|religious|education)$/.test(t.landuse || '')) return 'built';
    return null;
  };
  const poly = { built: [], green: [], paddy: [], water: [], bldg: [] }, lines = { canal: [], river: [], path: [], minor: [], major: [] };
  const closed = r => r.length > 3 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1];
  const inRel = new Set();
  for (const m of x.matchAll(/<relation id="\d+"[^>]*>([\s\S]*?)<\/relation>/g)) {
    const t = tagsOf(m[1]); if (t.type !== 'multipolygon') continue;
    const mem = [...m[1].matchAll(/<member type="way" ref="(\d+)" role="(\w*)"/g)]; mem.forEach(a => inRel.add(a[1]));
    const kd = kind(t); if (!kd) continue;
    const segs = mem.map(a => ways.get(a[1])).filter(Boolean).map(w => w.pts.slice()), rings = [];
    while (segs.length) {
      let cur = segs.pop(), grow = true;
      while (grow && !closed(cur)) {
        grow = false;
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i], a = cur[cur.length - 1];
          if (s[0][0] === a[0] && s[0][1] === a[1]) { cur = cur.concat(s.slice(1)); segs.splice(i, 1); grow = true; break; }
          if (s[s.length - 1][0] === a[0] && s[s.length - 1][1] === a[1]) { cur = cur.concat(s.slice().reverse().slice(1)); segs.splice(i, 1); grow = true; break; }
        }
      }
      if (cur.length > 3) rings.push(cur.flat());
    }
    if (rings.length) poly[kd].push(rings);
  }
  for (const [id, w] of ways) {
    const t = w.t, pts = w.pts; if (pts.length < 2) continue;
    const kd = kind(t);
    if (kd && !inRel.has(id) && closed(pts)) { poly[kd].push([pts.flat()]); continue; }
    if (t.waterway) { const c = t.waterway === 'river' ? 'river' : /^(canal|stream|drain|ditch)$/.test(t.waterway) ? 'canal' : null; if (c) lines[c].push(pts.flat()); continue; }
    if (t.highway) { const c = /^(motorway|trunk|primary|secondary|tertiary)(_link)?$/.test(t.highway) ? 'major' : /^(residential|unclassified|service|living_street|road)$/.test(t.highway) ? 'minor' : /^(footway|path|track|cycleway|pedestrian|steps|bridleway)$/.test(t.highway) ? 'path' : null; if (c) lines[c].push(pts.flat()); }
  }
  return { poly, lines, places };
}
