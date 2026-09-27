// Builds the Dungeon demo site as static files.
//
// 1. Sets up a fresh, empty Ghost (owner account, session login).
// 2. Uploads the theme zip, activates it, applies docs/routes.yaml and the demo settings.
// 3. Replaces Ghost's starter content with demo/content.json (posts, Now months, Scatter notes).
// 4. Crawls the finished site into OUT_DIR, ready for Cloudflare Pages.
//
// Environment:
//   GHOST_URL   the running Ghost, e.g. http://localhost:2368 (must match Ghost's own url setting)
//   DEMO_URL    where the static copy will live, e.g. https://dungeon-demo.pages.dev
//   THEME_ZIP   path to dungeon.zip
//   OUT_DIR     output folder (default demo-site)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const GHOST = (process.env.GHOST_URL || 'http://localhost:2368').replace(/\/+$/, '');
const DEMO = (process.env.DEMO_URL || 'https://dungeon-demo.pages.dev').replace(/\/+$/, '');
const THEME_ZIP = process.env.THEME_ZIP || path.join(ROOT, 'dungeon.zip');
const OUT = path.resolve(process.env.OUT_DIR || 'demo-site');
const content = JSON.parse(fs.readFileSync(path.join(HERE, 'content.json'), 'utf8'));
const log = (...a) => console.log('[demo]', ...a);

// ---------- Admin API with a staff session ----------
let cookie = '';
async function api(method, apiPath, body, { form = false } = {}) {
  const headers = { Origin: GHOST, 'Accept-Version': 'v6.0' };
  if (cookie) headers.Cookie = cookie;
  let payload = body;
  if (body && !form) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(GHOST + '/ghost/api/admin' + apiPath, { method, headers, body: payload });
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const session = setCookie.find((c) => c.startsWith('ghost-admin-api-session='));
  if (session) cookie = session.split(';')[0];
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${apiPath} -> ${res.status}: ${text.slice(0, 500)}`);
  try { return text ? JSON.parse(text) : {}; } catch { return {}; } // some endpoints reply in plain text, e.g. "Created"
}
const fileForm = (field, filePath, name, extra = {}) => {
  const f = new FormData();
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.zip': 'application/zip', '.yaml': 'application/x-yaml' };
  const type = types[path.extname(name || filePath).toLowerCase()] || 'application/octet-stream';
  f.append(field, new Blob([fs.readFileSync(filePath)], { type }), name || path.basename(filePath));
  for (const [k, v] of Object.entries(extra)) f.append(k, v);
  return f;
};

async function setUp() {
  const owner = { name: 'Dungeon', email: 'demo@example.com', password: 'dungeon-demo-' + Math.random().toString(36).slice(2) + '-A1!' };
  await api('POST', '/authentication/setup/', { setup: [{ ...owner, blogTitle: content.site.title }] });
  await api('POST', '/session/', { username: owner.email, password: owner.password });
  if (!cookie) throw new Error('no session cookie after login');
  log('Ghost set up and signed in');
}

async function installTheme() {
  await api('POST', '/themes/upload/', fileForm('file', THEME_ZIP, 'dungeon.zip'), { form: true });
  await api('PUT', '/themes/dungeon/activate/');
  await api('POST', '/settings/routes/yaml/', fileForm('routes', path.join(ROOT, 'docs/routes.yaml'), 'routes.yaml'), { form: true });
  log('theme installed and activated; routes applied');
}

async function applySettings() {
  const s = content.site;
  const settings = [
    { key: 'title', value: s.title },
    { key: 'description', value: s.description },
    { key: 'timezone', value: s.timezone },
    { key: 'accent_color', value: s.accent_color },
    { key: 'navigation', value: JSON.stringify(content.navigation) },
    { key: 'secondary_navigation', value: JSON.stringify(content.secondary_navigation) },
    // A static demo can't take signups or comments, so switch members off entirely
    { key: 'members_signup_access', value: 'none' },
    { key: 'comments_enabled', value: 'off' },
  ];
  await api('PUT', '/settings/', { settings });
  const current = (await api('GET', '/custom_theme_settings/')).custom_theme_settings;
  const wanted = content.theme_settings;
  const updated = current.map((c) => ({ key: c.key, value: Object.prototype.hasOwnProperty.call(wanted, c.key) ? wanted[c.key] : c.value }));
  const unknown = Object.keys(wanted).filter((k) => !current.some((c) => c.key === k));
  if (unknown.length) log('warning: theme has no setting(s)', unknown.join(', '));
  await api('PUT', '/custom_theme_settings/', { custom_theme_settings: updated });
  log('site and theme settings applied');
}

async function uploadImages() {
  const map = {};
  for (const name of content.images) {
    const r = await api('POST', '/images/upload/', fileForm('file', path.join(HERE, 'images', name), name, { purpose: 'image' }), { form: true });
    map[name] = r.images[0].url;
  }
  log(`uploaded ${Object.keys(map).length} images`);
  return map;
}

async function clearStarterContent() {
  for (const kind of ['posts', 'pages']) {
    const list = (await api('GET', `/${kind}/?limit=all&filter=status:[draft,published,scheduled]&fields=id`))[kind] || [];
    for (const p of list) await api('DELETE', `/${kind}/${p.id}/`);
  }
  log('removed starter content');
}

const withImages = (html, map) => html.replace(/src="([\w.-]+\.(?:jpg|png))"/g, (m, n) => (map[n] ? `src="${map[n]}"` : m));
const plainTitle = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 8).join(' ');

async function createContent(images) {
  let n = 0;
  const create = async (kind, item) => {
    await api('POST', `/${kind}/?source=html`, { [kind]: [{ status: 'published', ...item }] });
    n++;
  };
  for (const p of content.pages) {
    await create('pages', { title: p.title, slug: p.slug, html: withImages(p.html, images), ...(p.custom_template ? { custom_template: p.custom_template } : {}) });
  }
  for (const p of content.posts) {
    await create('posts', {
      title: p.title, slug: p.slug, html: withImages(p.html, images), published_at: p.date,
      custom_excerpt: p.excerpt, tags: p.tags.map((name) => ({ name })),
      ...(p.feature_image ? { feature_image: images[p.feature_image] } : {}),
    });
  }
  for (const [i, m] of content.now.entries()) {
    const d = new Date(m.date);
    await create('posts', {
      title: d.toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }), slug: `now-${d.toISOString().slice(0, 7)}-${i}`,
      html: m.html, published_at: m.date, tags: m.tags.map((name) => ({ name })),
    });
  }
  for (const [i, note] of content.notes.entries()) {
    await create('posts', {
      title: note.title || plainTitle(note.html), slug: `note-${i + 1}`, html: note.html, published_at: note.date,
      tags: note.tags.map((name) => ({ name })),
      ...(note.feature_image ? { feature_image: images[note.feature_image] } : {}),
    });
  }
  log(`created ${n} pages, posts, months and notes`);
}

// ---------- Crawl into static files ----------
const TEXT = /\.(html|css|js|xml|txt|json|webmanifest)$/;
const localPath = (urlPath) => {
  let p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (p.endsWith('/')) p += 'index.html';
  return path.join(OUT, p);
};

function refsIn(text, base, type) {
  const out = new Set();
  const add = (raw) => {
    if (!raw || /^(data:|mailto:|tel:|javascript:|#|%23)/i.test(raw)) return;
    try { const u = new URL(raw.replace(/&amp;/g, '&'), base); if (u.origin === GHOST) out.add(u.pathname + u.search); } catch {}
  };
  if (type === 'css') {
    for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add(m[1]);
  } else if (type === 'xml') {
    for (const m of text.matchAll(/<(?:loc|image:loc)>([^<]+)<\//g)) add(m[1]);
  } else {
    for (const m of text.matchAll(/\s(?:href|src|data-src|poster)="([^"]+)"/g)) add(m[1]);
    // meta content="..." holds text as well as URLs; only follow the ones that are URLs
    for (const m of text.matchAll(/\scontent="((?:https?:)?\/[^"]*)"/g)) add(m[1]);
    for (const m of text.matchAll(/\ssrcset="([^"]+)"/g)) m[1].split(',').forEach((part) => add(part.trim().split(/\s+/)[0]));
    for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add(m[1]);
  }
  return out;
}

async function crawl() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const start = ['/', '/now/', '/scatter/', '/about/', '/colophon/', '/sitemap.xml', '/robots.txt', '/favicon.ico', '/rss/'];
  const queue = [...start], seen = new Set(), failed = [];
  while (queue.length) {
    const ref = queue.shift();
    const key = ref.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    const res = await fetch(GHOST + key, { redirect: 'follow' });
    if (!res.ok) { failed.push(`${res.status} ${key}`); continue; }
    const type = (res.headers.get('content-type') || '').split(';')[0];
    const buf = Buffer.from(await res.arrayBuffer());
    let file = localPath(key);
    if (type === 'text/html' && !file.endsWith('.html')) file = path.join(file, 'index.html');
    if (key === '/rss/') file = path.join(OUT, 'rss', 'index.xml');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    const kind = type === 'text/css' ? 'css' : /xml/.test(type) ? 'xml' : type === 'text/html' ? 'html' : null;
    if (kind) for (const r of refsIn(buf.toString(), GHOST + key, kind)) if (!seen.has(r.split('#')[0])) queue.push(r);
  }
  // A proper 404 page for Pages
  const nf = await fetch(GHOST + '/this-page-does-not-exist/');
  fs.writeFileSync(path.join(OUT, '404.html'), Buffer.from(await nf.arrayBuffer()));
  return { pages: seen.size, failed };
}

// Point every link at the demo's address, drop cache-busting query strings (a static host
// serves one file per path), and remove Ghost's search and sign-up scripts, which need a server.
function rewrite() {
  let files = 0;
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    if (!TEXT.test(p)) return;
    let t = fs.readFileSync(p, 'utf8');
    const before = t;
    t = t.split(GHOST).join(DEMO).split(GHOST.replace(/^https?:/, '')).join(DEMO.replace(/^https?:/, ''));
    t = t.replace(/((?:\/assets|\/public|\/content)\/[^"'\s)?#]+)\?[^"'\s)#<]*/g, '$1');
    if (p.endsWith('.html')) {
      t = t.replace(/<script[^>]*sodo-search[^>]*><\/script>\s*/g, '');
      t = t.replace(/<link[^>]*sodo-search[^>]*>\s*/g, '');
      t = t.replace(/<script[^>]*portal[^>]*><\/script>\s*/g, '');
      t = t.replace(/<link[^>]*rel="webmention"[^>]*>\s*/g, '');
      t = t.replace(/<link[^>]*rel="alternate"[^>]*application\/rss\+xml[^>]*>/g, (m) => m.replace(/\/rss\/"/, '/rss/index.xml"'));
    }
    if (t !== before) { fs.writeFileSync(p, t); files++; }
  });
  walk(OUT);
  return files;
}

function checkLinks() {
  const missing = new Set();
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    if (!/\.(html|css)$/.test(p)) return;
    const t = fs.readFileSync(p, 'utf8');
    const base = DEMO + '/' + path.relative(OUT, p).replace(/\\/g, '/');
    const re = /(?:href|src)="([^"]+)"|url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
    for (const m of t.matchAll(re)) {
      const raw = (m[1] || m[2] || '').replace(/&amp;/g, '&');
      if (!raw || /^(data:|mailto:|#|%23|javascript:)/i.test(raw)) continue;
      let u; try { u = new URL(raw, base); } catch { continue; }
      if (u.origin !== new URL(DEMO).origin) continue;
      const f = localPath(u.pathname);
      if (!fs.existsSync(f) && !fs.existsSync(path.join(f, 'index.html'))) missing.add(u.pathname);
    }
  });
  walk(OUT);
  return [...missing];
}

(async () => {
  await setUp();
  await installTheme();
  await applySettings();
  const images = await uploadImages();
  await clearStarterContent();
  await createContent(images);
  const { pages, failed } = await crawl();
  const rewritten = rewrite();
  const missing = checkLinks();
  log(`crawled ${pages} addresses into ${OUT}; rewrote ${rewritten} files for ${DEMO}`);
  if (failed.length) log('not fetched:', failed.join(' | '));
  if (missing.length) { log('broken local links:', missing.join(' | ')); process.exitCode = 1; }
  else log('link check passed: every local link and asset exists');
})().catch((e) => { console.error('[demo] failed:', e.message); process.exit(1); });
