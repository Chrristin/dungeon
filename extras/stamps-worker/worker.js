// Stamps: "I was here" for posts and Now months, with optional names. Cloudflare Worker + D1.
//
//   GET  /stamps/<slug>              -> { count, names: [{date, name}], more }
//   POST /stamps/<slug>              -> { count, id, token }        (stamp it)
//   PUT  /stamps/<slug>/<id>         { token, name } -> { ok, names, more }   (sign your own stamp)
//
// Bindings: DB (D1 database with schema.sql), SITE (variable, e.g. https://christingeorge.com).
// Only slugs that exist on the site can be stamped: posts from the sitemap, Now months from the
// Now page. A stamp is final. The token returned on stamping is the only way to name that stamp,
// and is stored hashed. Visitor addresses are used only in memory, for the rate limit.

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'\u2019-]{0,23}$/u;
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigger', 'faggot', 'whore', 'slut', 'rape', 'nazi', 'bitch'];
const SHOW_NAMES = 3, PER_MINUTE = 12;
let known = { slugs: null, at: 0 };
const recent = new Map();

function cors(env, request) {
  const site = (env.SITE || '').replace(/\/+$/, '');
  const origin = request.headers.get('Origin') || '';
  const ok = [site, site.replace(/^https:/, 'http:')].includes(origin);
  return { 'Access-Control-Allow-Origin': ok ? origin : site, 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

// Everything that can be stamped: post slugs from the sitemap, Now-month slugs from the Now page
async function stampable(env) {
  if (known.slugs && Date.now() - known.at < 10 * 60 * 1000) return known.slugs;
  const site = (env.SITE || '').replace(/\/+$/, '');
  const get = (p) => fetch(site + p, { headers: { 'User-Agent': 'dungeon-stamps' } }).then((r) => (r.ok ? r.text() : ''));
  const [xml, now] = await Promise.all([get('/sitemap-posts.xml'), get('/now/')]);
  if (!xml && !now) { if (known.slugs) return known.slugs; throw new Error('site unavailable'); }
  const slugs = new Set();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try { const p = new URL(m[1]).pathname.split('/').filter(Boolean); if (p.length) slugs.add(p[p.length - 1]); } catch {}
  }
  for (const m of now.matchAll(/class="card now-card[^"]*"[^>]*data-key="([^"]+)"|data-key="([^"]+)"[^>]*class="card now-card/g)) slugs.add(m[1] || m[2]);
  known = { slugs, at: Date.now() };
  return slugs;
}

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function tooMany(visitor) {
  const now = Date.now(), times = (recent.get(visitor) || []).filter((t) => now - t < 60000);
  if (times.length >= PER_MINUTE) { recent.set(visitor, times); return true; }
  times.push(now); recent.set(visitor, times); if (recent.size > 5000) recent.clear();
  return false;
}
function cleanName(raw) {
  const name = String(raw || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!name || !NAME.test(name)) return null;
  const flat = name.toLowerCase().replace(/[^a-z]/g, '');
  return BLOCKED.some((w) => flat.includes(w)) ? null : name;
}
async function summary(env, slug) {
  const count = (await env.DB.prepare('SELECT COUNT(*) AS n FROM stamps WHERE post = ? AND hidden = 0').bind(slug).first()).n;
  const rows = (await env.DB.prepare("SELECT created_at, name FROM stamps WHERE post = ? AND hidden = 0 AND name IS NOT NULL AND name <> '' ORDER BY id DESC LIMIT ?").bind(slug, SHOW_NAMES).all()).results;
  const names = rows.map((r) => ({ date: r.created_at.slice(0, 10), name: r.name }));
  return { count, names, more: Math.max(0, count - names.length) };
}

export default {
  async fetch(request, env) {
    const headers = cors(env, request);
    // Setup checks, so a missing piece shows as a clear message instead of a crash
    if (!env.DB || typeof env.DB.prepare !== 'function') return json({ error: 'setup: no D1 database connected. Add a D1 binding named DB (Worker, Bindings).' }, 500, headers);
    if (!env.SITE) return json({ error: 'setup: no SITE variable. Add a variable named SITE with your site address.' }, 500, headers);
    try {
      return await handle(request, env, headers);
    } catch (e) {
      const msg = String(e && e.message || e);
      if (/no such table/i.test(msg)) return json({ error: 'setup: the stamps table is missing. Run schema.sql in the D1 console.' }, 500, headers);
      return json({ error: 'unexpected: ' + msg }, 500, headers);
    }
  },
};

async function handle(request, env, headers) {
  {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const m = new URL(request.url).pathname.match(/^\/stamps\/([^/]+)(?:\/(\d+))?\/?$/);
    if (!m) return json({ error: 'not found' }, 404, headers);
    const slug = decodeURIComponent(m[1]).toLowerCase(), id = m[2] ? Number(m[2]) : null;
    if (!SLUG.test(slug)) return json({ error: 'bad post' }, 400, headers);
    let slugs;
    try { slugs = await stampable(env); } catch { return json({ error: 'site unavailable' }, 503, headers); }
    if (!slugs.has(slug)) return json({ error: 'unknown post' }, 404, headers);

    if (request.method === 'GET' && id === null) return json(await summary(env, slug), 200, headers);

    const visitor = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (tooMany(visitor)) return json({ error: 'slow down' }, 429, headers);

    if (request.method === 'POST' && id === null) {
      const token = crypto.randomUUID() + crypto.randomUUID();
      const r = await env.DB.prepare('INSERT INTO stamps (post, token_hash) VALUES (?, ?)').bind(slug, await sha256(token)).run();
      const s = await summary(env, slug);
      return json({ ...s, id: r.meta.last_row_id, token }, 200, headers);
    }
    if (request.method === 'PUT' && id !== null) {
      let body = {}; try { body = await request.json(); } catch {}
      const name = cleanName(body.name);
      if (!name) return json({ error: 'name not allowed' }, 400, headers);
      const row = await env.DB.prepare('SELECT token_hash, name FROM stamps WHERE id = ? AND post = ? AND hidden = 0').bind(id, slug).first();
      if (!row || row.token_hash !== (await sha256(String(body.token || '')))) return json({ error: 'not your stamp' }, 403, headers);
      if (row.name) return json({ error: 'already signed' }, 409, headers);
      await env.DB.prepare('UPDATE stamps SET name = ? WHERE id = ?').bind(name, id).run();
      return json({ ok: true, ...(await summary(env, slug)) }, 200, headers);
    }
    return json({ error: 'method not allowed' }, 405, headers);
  }
}
