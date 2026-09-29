// Stamps: "I was here" for posts and Now months, with optional names. Cloudflare Worker + D1.
//
//   GET  /stamps/<slug>              -> { count, names: [{date, name}], more }
//   POST /stamps/<slug>              -> { count, id, token }        (stamp it)
//   PUT  /stamps/<slug>/<id>         { token, name } -> { ok, names, more }   (sign your own stamp)
//   DELETE /stamps/<slug>/<id>       { token }       -> { ok, names, more }   (remove your own name, within a day)
//
// Stickies (1.3.0), short notes under posts, pinned once approved:
//   GET    /stickies/<slug>                       -> { count, stickies: [{id, date, body, name, colour}] }   (approved only)
//   POST   /stickies/<slug>  { body, name, colour, turnstile } -> { id, token, status: "pending" }
//   POST   /stickies/<slug>/mine  { items: [{id, token}] } -> { items: [{id, status}] }   (your own stickies)
//   DELETE /stickies/<slug>/<id>  { token }       -> { ok }   (take your own back, within a day)
//   GET|POST /moderate?id=&a=approve|delete&exp=&sig=   signed, expiring links used by ntfy
//   POST   /telegram                              Telegram button presses (webhook)
//   GET    /telegram/setup?key=<MOD_SECRET>       finds your chat and connects the bot, once
//
// Bindings: DB (D1 database with schema.sql), SITE (variable, e.g. https://christingeorge.com).
// For stickies, as secrets: TURNSTILE_SECRET, MOD_SECRET (any long random text), NTFY_TOPIC,
// TELEGRAM_BOT_TOKEN; as a variable: TELEGRAM_CHAT_ID (the setup link tells you it).
// Notifications are optional: set up ntfy, Telegram, both or neither.
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
  return { 'Access-Control-Allow-Origin': ok ? origin : site, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  const slugs = new Set(), posts = new Set();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try { const p = new URL(m[1]).pathname.split('/').filter(Boolean); if (p.length) { slugs.add(p[p.length - 1]); posts.add(p[p.length - 1]); } } catch {}
  }
  for (const m of now.matchAll(/class="card now-card[^"]*"[^>]*data-key="([^"]+)"|data-key="([^"]+)"[^>]*class="card now-card/g)) slugs.add(m[1] || m[2]);
  slugs.posts = posts;
  known = { slugs, at: Date.now() };
  return slugs;
}

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function tooMany(visitor, limit = PER_MINUTE) {
  const now = Date.now(), times = (recent.get(visitor) || []).filter((t) => now - t < 60000);
  if (times.length >= limit) { recent.set(visitor, times); return true; }
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
  const rows = (await env.DB.prepare("SELECT id, created_at, name FROM stamps WHERE post = ? AND hidden = 0 AND name IS NOT NULL AND name <> '' ORDER BY id DESC LIMIT ?").bind(slug, SHOW_NAMES).all()).results;
  const names = rows.map((r) => ({ id: r.id, date: r.created_at.slice(0, 10), name: r.name }));
  return { count, names, more: Math.max(0, count - names.length) };
}

export default {
  async fetch(request, env, ctx) {
    const headers = cors(env, request);
    // Browsers ask first ("preflight") before sending JSON. Answer that for every address, before routing.
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    // Setup checks, so a missing piece shows as a clear message instead of a crash
    if (!env.DB || typeof env.DB.prepare !== 'function') return json({ error: 'setup: no D1 database connected. Add a D1 binding named DB (Worker, Bindings).' }, 500, headers);
    if (!env.SITE) return json({ error: 'setup: no SITE variable. Add a variable named SITE with your site address.' }, 500, headers);
    try {
      const path = new URL(request.url).pathname;
      if (path === '/moderate' || path === '/telegram' || path === '/telegram/setup') return await moderation(request, env, ctx);
      if (path.startsWith('/stickies/')) return await stickies(request, env, headers, ctx);
      return await handle(request, env, headers);
    } catch (e) {
      const msg = String(e && e.message || e);
      if (/no such table/i.test(msg)) return json({ error: 'setup: the stamps table is missing. Run schema.sql in the D1 console.' }, 500, headers);
      if (/no such column: colour/i.test(msg)) return json({ error: 'setup: the stickies table needs updating for 1.3.2. Run migrate-1.3.2.sql in the D1 console.' }, 500, headers);
      if (/no such table: stickies/i.test(msg)) return json({ error: 'setup: the stickies table is missing. Run migrate-1.3.0.sql in the D1 console.' }, 500, headers);
      if (/no such column: named_at/i.test(msg)) return json({ error: 'setup: the database needs updating for 1.2.3. Run migrate-1.2.3.sql in the D1 console.' }, 500, headers);
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
      await env.DB.prepare("UPDATE stamps SET name = ?, named_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?").bind(name, id).run();
      return json({ ok: true, ...(await summary(env, slug)) }, 200, headers);
    }
    if (request.method === 'DELETE' && id !== null) {
      let body = {}; try { body = await request.json(); } catch {}
      const row = await env.DB.prepare('SELECT token_hash, name, named_at FROM stamps WHERE id = ? AND post = ? AND hidden = 0').bind(id, slug).first();
      if (!row || row.token_hash !== (await sha256(String(body.token || '')))) return json({ error: 'not your stamp' }, 403, headers);
      if (!row.name) return json({ ok: true, ...(await summary(env, slug)) }, 200, headers);
      // A name can be taken back for a day; after that it stays (you can still remove it yourself)
      if (!row.named_at || Date.now() - Date.parse(row.named_at) > 24 * 60 * 60 * 1000) return json({ error: 'too late to remove' }, 403, headers);
      await env.DB.prepare('UPDATE stamps SET name = NULL, named_at = NULL WHERE id = ?').bind(id).run();
      return json({ ok: true, ...(await summary(env, slug)) }, 200, headers);
    }
    return json({ error: 'method not allowed' }, 405, headers);
  }
}

// ---------------------------------------------------------------- stickies
const STICKY_MAX = 200, STICKY_PER_MINUTE = 4, STICKY_WALL = 150, LINK_DAYS = 7;

function cleanBody(raw) {
  const body = String(raw || '').normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  if (!body || [...body].length > STICKY_MAX) return null;
  return body;
}
async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // not configured: the rate limit and approval still apply
  if (!token) return false;
  const form = new FormData(); form.append('secret', env.TURNSTILE_SECRET); form.append('response', String(token)); if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch(env.TURNSTILE_VERIFY_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    return !!(await r.json()).success;
  } catch { return false; }
}
async function hmac(env, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.MOD_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function modLink(env, base, id, action) {
  const exp = Math.floor(Date.now() / 1000) + LINK_DAYS * 86400;
  return `${base}/moderate?id=${id}&a=${action}&exp=${exp}&sig=${await hmac(env, `${id}:${action}:${exp}`)}`;
}
// Approve or delete. Approving only works on a pending sticky; the answer says what happened.
async function decide(env, id, action) {
  const row = await env.DB.prepare('SELECT status FROM stickies WHERE id = ?').bind(id).first();
  if (!row) return 'not found';
  if (action === 'approve') {
    if (row.status !== 'pending') return 'already ' + row.status;
    await env.DB.prepare("UPDATE stickies SET status = 'approved', decided_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?").bind(id).run();
    return 'approved';
  }
  if (row.status === 'deleted' || row.status === 'removed') return 'already ' + row.status;
  await env.DB.prepare("UPDATE stickies SET status = 'deleted', decided_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?").bind(id).run();
  return 'deleted';
}
async function notify(env, base, sticky) {
  const site = (env.SITE || '').replace(/\/+$/, ''), postUrl = `${site}/${sticky.post}/`;
  const who = sticky.name ? sticky.name : 'someone';
  const jobs = [];
  if (env.NTFY_TOPIC) {
    const [yes, no] = await Promise.all([modLink(env, base, sticky.id, 'approve'), modLink(env, base, sticky.id, 'delete')]);
    jobs.push(fetch(`${(env.NTFY_URL || 'https://ntfy.sh').replace(/\/+$/, '')}/${env.NTFY_TOPIC}`, {
      method: 'POST', body: sticky.body,
      headers: { Title: `New sticky from ${who}`, Tags: 'memo', Click: postUrl,
        Actions: `http, Approve, ${yes}, method=POST, clear=true; http, Delete, ${no}, method=POST, clear=true; view, Open post, ${postUrl}` } }));
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    const text = `New sticky from ${who} on /${sticky.post}/\n\n${sticky.body}`;
    jobs.push(fetch(`${env.TELEGRAM_API || 'https://api.telegram.org'}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: 'Approve', callback_data: `approve:${sticky.id}` }, { text: 'Delete', callback_data: `delete:${sticky.id}` }], [{ text: 'Open post', url: postUrl }]] } }) }));
  }
  await Promise.allSettled(jobs);
}

async function stickies(request, env, headers, ctx) {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/stickies\/([^/]+)(?:\/(\d+|mine))?\/?$/);
  if (!m) return json({ error: 'not found' }, 404, headers);
  const slug = decodeURIComponent(m[1]).toLowerCase(), sub = m[2] || null;
  if (!SLUG.test(slug)) return json({ error: 'bad post' }, 400, headers);
  let slugs;
  try { slugs = await stampable(env); } catch { return json({ error: 'site unavailable' }, 503, headers); }
  if (!slugs.posts || !slugs.posts.has(slug)) return json({ error: 'unknown post' }, 404, headers); // posts only

  if (request.method === 'GET' && !sub) {
    const count = (await env.DB.prepare("SELECT COUNT(*) AS n FROM stickies WHERE post = ? AND status = 'approved'").bind(slug).first()).n;
    const rows = (await env.DB.prepare("SELECT id, created_at, body, name, colour FROM stickies WHERE post = ? AND status = 'approved' ORDER BY id DESC LIMIT ?").bind(slug, STICKY_WALL).all()).results;
    return json({ count, stickies: rows.map((r) => ({ id: r.id, date: r.created_at.slice(0, 10), body: r.body, name: r.name || null, colour: r.colour === null || r.colour === undefined ? null : r.colour })) }, 200, headers);
  }
  let body = {}; try { body = await request.json(); } catch {}

  if (request.method === 'POST' && sub === 'mine') { // the writer's own stickies: still waiting, pinned, or gone
    const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
    const out = [];
    for (const it of items) {
      const row = await env.DB.prepare('SELECT token_hash, status FROM stickies WHERE id = ? AND post = ?').bind(Number(it.id), slug).first();
      if (row && row.token_hash === (await sha256(String(it.token || '')))) out.push({ id: Number(it.id), status: row.status });
      else out.push({ id: Number(it.id), status: 'gone' });
    }
    return json({ items: out }, 200, headers);
  }
  if (request.method === 'POST' && !sub) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (tooMany('sticky:' + ip, STICKY_PER_MINUTE)) return json({ error: 'slow down' }, 429, headers);
    const text = cleanBody(body.body);
    if (!text) return json({ error: 'a sticky needs 1 to 200 characters' }, 400, headers);
    let name = null;
    if (body.name && String(body.name).trim()) { name = cleanName(body.name); if (!name) return json({ error: 'name not allowed' }, 400, headers); }
    if (!(await turnstileOk(env, body.turnstile, ip))) return json({ error: 'spam check failed' }, 403, headers);
    const token = crypto.randomUUID() + crypto.randomUUID();
    const colour = Number.isInteger(body.colour) && body.colour >= 0 && body.colour <= 5 ? body.colour : null; // the paper it was written on
    const r = await env.DB.prepare('INSERT INTO stickies (post, body, name, colour, token_hash) VALUES (?, ?, ?, ?, ?)').bind(slug, text, name, colour, await sha256(token)).run();
    const sticky = { id: r.meta.last_row_id, post: slug, body: text, name };
    const base = url.origin;
    const sending = notify(env, base, sticky);
    if (ctx && ctx.waitUntil) ctx.waitUntil(sending); else await sending;
    return json({ id: sticky.id, token, status: 'pending' }, 200, headers);
  }
  if (request.method === 'DELETE' && sub && sub !== 'mine') {
    const row = await env.DB.prepare('SELECT token_hash, status, created_at FROM stickies WHERE id = ? AND post = ?').bind(Number(sub), slug).first();
    if (!row || row.token_hash !== (await sha256(String(body.token || '')))) return json({ error: 'not your sticky' }, 403, headers);
    if (row.status === 'removed' || row.status === 'deleted') return json({ ok: true }, 200, headers);
    if (Date.now() - Date.parse(row.created_at) > 24 * 60 * 60 * 1000) return json({ error: 'too late to remove' }, 403, headers);
    await env.DB.prepare("UPDATE stickies SET status = 'removed', decided_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?").bind(Number(sub)).run();
    return json({ ok: true }, 200, headers);
  }
  return json({ error: 'method not allowed' }, 405, headers);
}

// ---------------------------------------------------------------- moderation
const page = (title, text, status = 200) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
  `<body style="font:16px/1.5 system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#fbe9a0;color:#17191e">` +
  `<div style="text-align:center;padding:2rem"><h1 style="margin:0 0 .4rem;font-size:1.4rem">${title}</h1><p style="margin:0">${text}</p></div>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

async function moderation(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/moderate') {
    const id = Number(url.searchParams.get('id')), a = url.searchParams.get('a'), exp = Number(url.searchParams.get('exp')), sig = url.searchParams.get('sig') || '';
    if (!env.MOD_SECRET || !id || !['approve', 'delete'].includes(a) || !exp) return page('Not a valid link', 'This link is incomplete.', 400);
    if ((await hmac(env, `${id}:${a}:${exp}`)) !== sig) return page('Not a valid link', 'This link has been altered.', 403);
    if (Date.now() / 1000 > exp) return page('Link expired', 'Moderation links last ' + LINK_DAYS + ' days.', 410);
    const result = await decide(env, id, a);
    return page(result === 'approved' ? 'Pinned' : result === 'deleted' ? 'Deleted' : 'Nothing to do', `Sticky ${id}: ${result}.`);
  }
  const tgSecret = (await hmac(env, 'telegram-webhook')).slice(0, 48);
  if (url.pathname === '/telegram/setup') {
    if (!env.MOD_SECRET || url.searchParams.get('key') !== env.MOD_SECRET) return page('Not allowed', 'The key is missing or wrong.', 403);
    if (!env.TELEGRAM_BOT_TOKEN) return page('Telegram not set up', 'Add the TELEGRAM_BOT_TOKEN secret first.', 400);
    const api = `${env.TELEGRAM_API || 'https://api.telegram.org'}/bot${env.TELEGRAM_BOT_TOKEN}`;
    await fetch(`${api}/deleteWebhook`, { method: 'POST' });
    // Ask for messages explicitly: Telegram remembers the last allowed_updates filter (the webhook's
    // is button presses only) and would otherwise hide every message from getUpdates.
    const updates = await (await fetch(`${api}/getUpdates?allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'my_chat_member']))}`)).json();
    const chats = [...new Set((updates.result || []).map((u) => (u.message || u.my_chat_member || {}).chat).filter(Boolean).map((c) => c.id))];
    // No chat yet: leave the webhook off, so the next message to the bot waits here to be found.
    // (With the webhook on, Telegram hands messages to the Worker and they are gone.)
    if (!chats.length) return page('Almost there', 'No chat found yet. Send your bot a message now, then open this link again.');
    const set = await (await fetch(`${api}/setWebhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${url.origin}/telegram`, secret_token: tgSecret, allowed_updates: ['callback_query'] }) })).json();
    if (!set.ok) return page('Could not connect the bot', String(set.description || 'Telegram refused the webhook.'), 502);
    return page('Telegram connected', `Your chat ID: <b>${chats[chats.length - 1]}</b>. Add it to the Worker as the variable TELEGRAM_CHAT_ID, then deploy.`);
  }
  if (url.pathname === '/telegram' && request.method === 'POST') {
    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== tgSecret) return new Response('forbidden', { status: 403 });
    const update = await request.json().catch(() => ({}));
    const q = update.callback_query;
    if (!q) return new Response('ok');
    const api = `${env.TELEGRAM_API || 'https://api.telegram.org'}/bot${env.TELEGRAM_BOT_TOKEN}`;
    const fromChat = q.message && q.message.chat && String(q.message.chat.id);
    let answer = 'Not allowed';
    const [a, id] = String(q.data || '').split(':');
    if (fromChat === String(env.TELEGRAM_CHAT_ID) && ['approve', 'delete'].includes(a) && Number(id)) {
      const result = await decide(env, Number(id), a);
      answer = result === 'approved' ? 'Pinned' : result === 'deleted' ? 'Deleted' : result;
      if (q.message) await fetch(`${api}/editMessageText`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: q.message.chat.id, message_id: q.message.message_id, text: `${q.message.text}\n\nResult: ${answer}` }) });
    }
    await fetch(`${api}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: q.id, text: answer }) });
    return new Response('ok');
  }
  return new Response('not found', { status: 404 });
}
