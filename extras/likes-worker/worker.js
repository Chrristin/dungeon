// christingeorge-likes: a heart count per post, stored in Workers KV.
//
//   GET  /likes/<slug>   -> { "slug": "...", "count": 12 }
//   POST /likes/<slug>   -> { "slug": "...", "count": 13 }
//
// A like is final, like a clap: there is no unlike, because the Worker can't tell whether the
// person asking ever liked the post, and an open "unlike" would let anyone drain a count.
//
// Bindings (Worker -> Settings):
//   LIKES   KV namespace that holds the counts
//   SITE    variable, the site's address, e.g. https://christingeorge.com
//
// Likes only count for posts listed in the site's sitemap, so nobody can create keys for
// made-up addresses. Each visitor address gets a handful of likes per minute. That limit is held in
// memory, per Worker instance, so it stops casual spam rather than a determined attacker.
// Two likes landing at the same instant can occasionally count as one (KV is not a counter).
// Visitor addresses are only held briefly in memory for the limit, never stored.

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const PER_MINUTE = 12;
let known = { slugs: null, at: 0 };
const recent = new Map(); // visitor -> timestamps of recent likes, per Worker instance

function cors(env, request) {
  const site = (env.SITE || '').replace(/\/+$/, '');
  const origin = request.headers.get('Origin') || '';
  const allowed = [site, site.replace(/^https:/, 'http:')].includes(origin) ? origin : site;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

// The site's post slugs, from its sitemap, refreshed every 10 minutes
async function postSlugs(env) {
  if (known.slugs && Date.now() - known.at < 10 * 60 * 1000) return known.slugs;
  const site = (env.SITE || '').replace(/\/+$/, '');
  const res = await fetch(site + '/sitemap-posts.xml', { headers: { 'User-Agent': 'christingeorge-likes' } });
  if (!res.ok) { if (known.slugs) return known.slugs; throw new Error('sitemap unavailable'); }
  const xml = await res.text();
  const slugs = new Set();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try { const parts = new URL(m[1]).pathname.split('/').filter(Boolean); if (parts.length) slugs.add(parts[parts.length - 1]); } catch {}
  }
  known = { slugs, at: Date.now() };
  return slugs;
}

function tooMany(visitor) {
  const now = Date.now();
  const times = (recent.get(visitor) || []).filter((t) => now - t < 60000);
  if (times.length >= PER_MINUTE) { recent.set(visitor, times); return true; }
  times.push(now); recent.set(visitor, times);
  if (recent.size > 5000) recent.clear();
  return false;
}

export default {
  async fetch(request, env) {
    const headers = cors(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/likes\/([^/]+)\/?$/);
    if (!m) return json({ error: 'not found' }, 404, headers);
    const slug = decodeURIComponent(m[1]).toLowerCase();
    if (!SLUG.test(slug)) return json({ error: 'bad post' }, 400, headers);

    let slugs;
    try { slugs = await postSlugs(env); } catch { return json({ error: 'site unavailable' }, 503, headers); }
    if (!slugs.has(slug)) return json({ error: 'unknown post' }, 404, headers);

    const key = 'likes:' + slug;
    const current = parseInt((await env.LIKES.get(key)) || '0', 10) || 0;
    if (request.method === 'GET') return json({ slug, count: current }, 200, headers);
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, headers);

    const visitor = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (tooMany(visitor)) return json({ error: 'slow down', count: current }, 429, headers);

    const count = current + 1;
    await env.LIKES.put(key, String(count));
    return json({ slug, count }, 200, headers);
  },
};
