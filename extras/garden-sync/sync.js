// garden-sync: publishes Obsidian notes marked `publish: true` into Ghost as a digital garden.
//
//   node sync.js                  keep the garden in step with the vault (checks every INTERVAL_SECONDS)
//   node sync.js once             one pass, then exit
//   node sync.js import-scatter   one-off: turn existing Scatter notes (#note posts) into vault notes
//
// Settings (environment): GHOST_URL, GHOST_ADMIN_KEY (from a Ghost custom integration), VAULT_DIR (/vault),
// STATE_FILE (/data/state.json), INTERVAL_SECONDS (60), DRY_RUN (1 = only report), GARDEN_PAGE_SLUG (garden),
// GHOST_HTTPS (1 = tell Ghost the request is secure; needed when GHOST_URL is Ghost's plain http address on your network).
//
// A note's properties (all optional except publish):
//   publish: true            put it in the garden
//   stage: seedling | growing | evergreen      (default seedling; "budding" counts as growing)
//   topics: [Homelab, Books] (or tags:)        shown and grouped on the Garden page
//   type: source             a book, film, talk, article or paper; with source_kind: book | film | talk | ...
//   scatter: true            also show it on the Scatter wall; scatter_line: "a sharp line for the card"
//   labels: [quote, red]     extra internal tags, such as a Scatter kind (quote, lyric, reading, code, found, thought) or colour
//   confidence: certain | likely | speculative | hunch   how sure you are, shown on the note
//   rating: 4.5              your rating out of 5, in halves; the note gets your stamp and a place on the Ratings page
//   not_related: [[Other note]]   never show these two as related (either direction)
//   title, slug, tended, planted   override the file name, the address, the "last tended" or the "planted" date
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import YAML from 'yaml';
import MarkdownIt from 'markdown-it';
import footnotes from 'markdown-it-footnote';

const cfg = {
  ghost: (process.env.GHOST_URL || '').replace(/\/+$/, ''),
  key: process.env.GHOST_ADMIN_KEY || '',
  vault: process.env.VAULT_DIR || '/vault',
  state: process.env.STATE_FILE || '/data/state.json',
  interval: Math.max(15, Number(process.env.INTERVAL_SECONDS) || 60),
  dry: process.env.DRY_RUN === '1',
  page: process.env.GARDEN_PAGE_SLUG || 'garden',
  https: process.env.GHOST_HTTPS === '1',
};
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------------------------------------------------------------- Ghost Admin API
function adminToken() {
  const [id, secret] = cfg.key.split(':');
  if (!id || !secret) throw new Error('GHOST_ADMIN_KEY should look like <id>:<secret>, from Ghost > Settings > Integrations');
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64({ alg: 'HS256', typ: 'JWT', kid: id }) + '.' + b64({ iat: now, exp: now + 300, aud: '/admin/' });
  return unsigned + '.' + crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(unsigned).digest('base64url');
}
async function api(method, p, body, form) {
  const r = await fetch(cfg.ghost + '/ghost/api/admin' + p, {
    method,
    headers: { Authorization: 'Ghost ' + adminToken(), 'Accept-Version': 'v5.0', ...(cfg.https ? { 'X-Forwarded-Proto': 'https' } : {}), ...(form ? {} : { 'Content-Type': 'application/json' }) },
    redirect: 'manual',
    body: form ? body : body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 404) return null;
  if (r.status >= 300 && r.status < 400) throw new Error(`${method} ${p}: Ghost redirected to ${r.headers.get('location')}. If GHOST_URL is Ghost's http address on your network, set GHOST_HTTPS=1.`);
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${p}: ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// ---------------------------------------------------------------- the vault
const slugify = (s) => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'note';
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue; // .obsidian, .trash, .stfolder...
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
function readNote(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  let fm = {}, body = raw;
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) { try { fm = YAML.parse(m[1]) || {}; } catch (e) { log('skipping unreadable properties in', file, '-', e.message); } body = raw.slice(m[0].length); }
  return { fm, body };
}
const asList = (v) => (Array.isArray(v) ? v : v ? String(v).split(',') : []).map((x) => String(x).replace(/^#/, '').trim()).filter(Boolean);
const STAGES = { seedling: 'seedling', seed: 'seedling', budding: 'growing', growing: 'growing', sprout: 'growing', evergreen: 'evergreen', tree: 'evergreen' };
const isoDay = (d) => { const t = new Date(d); return isNaN(t) ? null : t.toISOString().slice(0, 10); };

function scanVault() {
  const files = walk(cfg.vault), notes = [], byName = new Map(), attachments = new Map();
  for (const f of files) {
    const base = path.basename(f);
    if (!/\.md$/i.test(f)) { attachments.set(base.toLowerCase(), f); continue; }
    const { fm, body } = readNote(f), name = base.replace(/\.md$/i, '');
    const note = { file: f, rel: path.relative(cfg.vault, f), name, fm, body };
    if (fm.publish === true || fm.publish === 'true') {
      note.published = true;
      note.title = String(fm.title || name).trim();
      note.slug = slugify(fm.slug || name);
      note.stage = STAGES[String(fm.stage || '').toLowerCase()] || 'seedling';
      note.topics = asList(fm.topics || fm.tags);
      note.type = String(fm.type || '').toLowerCase() === 'source' ? 'source' : 'note';
      note.kind = fm.source_kind || fm.kind ? String(fm.source_kind || fm.kind).toLowerCase() : null;
      note.scatter = fm.scatter === true || fm.scatter === 'true';
      note.scatterLine = fm.scatter_line ? String(fm.scatter_line).slice(0, 300) : null;
      note.tended = isoDay(fm.tended || fm.updated) || isoDay(fs.statSync(f).mtime);
      note.labels = asList(fm.labels).map((l) => l.toLowerCase());
      note.rating = ratingOf(fm.rating);
      const conf = String(fm.confidence || '').toLowerCase();
      note.confidence = ['certain', 'likely', 'speculative', 'hunch'].includes(conf) ? conf : null;
      const st = fs.statSync(f);
      note.planted = isoDay(fm.planted || fm.created) || isoDay(st.birthtimeMs ? st.birthtime : st.mtime) || note.tended;
      note.bodyHash = crypto.createHash('sha1').update(note.title + '\n' + body).digest('hex');
      note.notRelated = asList(fm.not_related).map((x) => x.replace(/^\[\[|\]\]$/g, '').split('|')[0].trim().toLowerCase());
    }
    notes.push(note);
    byName.set(name.toLowerCase(), note);
    for (const a of asList(fm.aliases)) if (!byName.has(a.toLowerCase())) byName.set(a.toLowerCase(), note);
  }
  return { notes, published: notes.filter((n) => n.published), byName, attachments };
}

// ---------------------------------------------------------------- the site's posts (read only)
const SKIP_TAGS = new Set(['hash-garden', 'hash-note', 'hash-now', 'hash-scatter', 'hash-thing', 'hash-watch-item']);
// Ratings: out of 5, in halves. A post carries one as an internal tag, #rated-4-5 for 4.5 or #rated-4 for 4.
function ratingOf(v) {
  const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(5, Math.max(0.5, Math.round(n * 2) / 2));
}
const ratingTag = (r) => '#rated-' + String(r).replace('.', '-');
function ratingFromTags(tags) {
  for (const t of tags || []) { const m = String(t.name || '').match(/^#rated-(\d)(?:-(5))?$/); if (m) return ratingOf(m[1] + (m[2] ? '.5' : '')); }
  return null;
}
let siteHost = null; // the site's public address, asked of Ghost once, so links written as https://yoursite/... count
async function readPosts() {
  if (!siteHost) { try { const st = await api('GET', '/site/'); siteHost = new URL(st.site.url).host; } catch { siteHost = ''; } }
  const out = []; let page = 1;
  for (;;) {
    const res = await api('GET', `/posts/?filter=status:published&formats=html,plaintext&include=tags&fields=id,slug,title,html,plaintext,custom_excerpt,published_at,updated_at,url&limit=50&page=${page}`);
    for (const p of res.posts) {
      if ((p.tags || []).some((t) => SKIP_TAGS.has(t.slug))) continue;
      const text = String(p.plaintext || '').replace(/\s+/g, ' ').trim();
      out.push({ slug: p.slug, title: p.title, html: p.html || '', text, words: text ? text.split(' ').length : 0,
        topics: (p.tags || []).filter((t) => t.visibility === 'public').map((t) => t.name), date: String(p.updated_at || p.published_at || '').slice(0, 10),
        excerpt: String(p.custom_excerpt || text).slice(0, 160), custom: p.custom_excerpt || null, rating: ratingFromTags(p.tags) });
    }
    if (!res.meta.pagination.next) break;
    page = res.meta.pagination.next;
  }
  const df = {}; out.forEach((p) => new Set(words(p.text)).forEach((w) => { df[w] = (df[w] || 0) + 1; }));
  out.forEach((p) => { p.tldr = p.custom || strongestLine(p.text, p.title, df, out.length) || null; }); // your own excerpt wins
  return out;
}
// A post's TL;DR, in its own words: the sentence that carries most of the post's distinctive vocabulary.
// Sentences are scored against the whole post (words it uses often, weighted by how rare they are across the
// site), with a bonus for words from the title, and penalties for questions, quotes, the opening hook, and
// sentences too short or too long to stand alone. No AI: it only ever picks a sentence you wrote.
function strongestLine(text, title, df, N) {
  const sents = String(text).replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(?=\s|$)/g) || [];
  if (!sents.length) return null;
  const tf = {}; words(text).forEach((w) => { tf[w] = (tf[w] || 0) + 1; });
  const weight = (w) => (tf[w] || 0) * Math.log(1 + N / (1 + (df[w] || 0)));
  const titleWords = new Set(words(title));
  let best = null;
  sents.forEach((raw, i) => {
    const t = raw.trim(), ws = words(t), n = t.split(/\s+/).length;
    if (n < 9 || n > 38) return; // too short to stand alone, or too long for a card
    if (/\?$/.test(t) || /^["'\u201c\u2018(]/.test(t) || /:\s*$/.test(t)) return; // questions, quotes, lead-ins
    const uniq = [...new Set(ws)];
    let score = uniq.reduce((a, w) => a + weight(w), 0) / Math.sqrt(uniq.length + 3);
    score *= 1 + 0.25 * uniq.filter((w) => titleWords.has(w)).length;
    if (i === 0) score *= 0.75; // the opening line is usually a hook, not the point
    if (i >= sents.length * 0.7) score *= 1.25; // the point often lands near the end
    if (/\b(the real (problem|point|reason|question)|the point is|more importantly|what (this|it) (is|means)|that's what|that is what|the (whole|only) (point|reason)|because|i picked|i chose|the answer)\b/i.test(t)) score *= 1.45; // the phrases the argument comes with
    if ((t.match(/\b[A-Z][a-zA-Z]+[A-Z0-9]\w*|\b[A-Z]{2,}\b/g) || []).length >= 2) score *= 0.8; // dense with product names: usually a detail
    if (/\b(I|we)\b/.test(t)) score *= 1.08; // his own view reads better than a bare fact
    if (!best || score > best[0]) best = [score, t];
  });
  return best ? best[1] : null;
}

// the site's own addresses a post links to, as slugs
function linkedSlugs(html) {
  const out = new Set(), site = siteHost;
  for (const m of String(html).matchAll(/href="([^"#?]+)/g)) {
    let u; try { u = new URL(m[1], 'http://local'); } catch { continue; }
    if (u.host !== 'local' && u.host !== site && !/^(localhost|ghost)(:\d+)?$/.test(u.host)) continue;
    const slug = u.pathname.replace(/^\/|\/$/g, ''); if (slug && !slug.includes('/')) out.add(slug);
  }
  return out;
}

// ---------------------------------------------------------------- turning a note into a post
const WIKI = /(!?)\[\[([^\]|#^]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
const md = new MarkdownIt({ html: true, linkify: true, typographer: true }).use(footnotes);
const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

async function uploadImage(file, state) {
  const bytes = fs.readFileSync(file), sum = crypto.createHash('sha1').update(bytes).digest('hex');
  if (state.images[sum]) return state.images[sum];
  if (cfg.dry) return '/images/' + path.basename(file);
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: ext === 'svg' ? 'image/svg+xml' : 'image/' + ext }), path.basename(file));
  form.append('purpose', 'image');
  const res = await api('POST', '/images/upload/', form, true);
  state.images[sum] = res.images[0].url;
  return state.images[sum];
}

function videoCard(url) {
  let m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `<figure class="kg-card kg-embed-card"><iframe width="560" height="315" src="https://www.youtube.com/embed/${m[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="YouTube video"></iframe></figure>`;
  m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `<figure class="kg-card kg-embed-card"><iframe src="https://player.vimeo.com/video/${m[1]}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Vimeo video"></iframe></figure>`;
  return null;
}
// the sentence a link was written in, as plain text, for the garden's connection panel
function sentenceAround(text, at, len) {
  const before = text.slice(0, at), after = text.slice(at + len);
  const start = Math.max(before.lastIndexOf('. '), before.lastIndexOf('! '), before.lastIndexOf('? '), before.lastIndexOf('\n')) + 1;
  const ends = ['. ', '! ', '? ', '\n'].map((c) => after.indexOf(c)).filter((i) => i >= 0);
  const end = at + len + (ends.length ? Math.min(...ends) + 1 : after.length);
  return text.slice(start, end).replace(/!?\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (a, n, al) => (al || n).replace(/#.*/, '')).replace(/[*_`=>#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 220);
}
async function render(note, vault, state) {
  const links = new Set();
  const target = (name) => { const k = String(name).trim().toLowerCase(), t = vault.byName.get(k); return t && t.published ? t : (vault.postsByName && vault.postsByName.get(k)) || null; }; // a note, or one of your posts by its title
  let body = note.body;
  body = body.split('\n').map((line) => { // videos on their own line: a bare link, <link>, or Obsidian's ![](link)
    const m = line.trim().match(/^(?:!\[[^\]]*\]\()?<?(https?:\/\/[^\s)>]+)>?\)?$/);
    const card = m && videoCard(m[1]);
    return card ? '\n' + card + '\n' : line;
  }).join('\n');
  // images: Obsidian's ![[picture.png|300]] and Markdown's ![alt](path)
  const embeds = [...body.matchAll(/!\[\[([^\]|]+?\.(?:png|jpe?g|gif|webp|svg|avif))(?:\|[^\]]*)?\]\]/gi)];
  for (const m of embeds) {
    const f = vault.attachments.get(path.basename(m[1]).toLowerCase());
    body = body.replace(m[0], f ? `![](${await uploadImage(f, state)})` : '');
  }
  const mdImages = [...body.matchAll(/!\[([^\]]*)\]\((?!https?:)([^)\s]+)\)/g)];
  for (const m of mdImages) {
    const rel = decodeURIComponent(m[2]), near = path.resolve(path.dirname(note.file), rel);
    const f = fs.existsSync(near) ? near : vault.attachments.get(path.basename(rel).toLowerCase());
    if (f && IMAGE.test(f)) body = body.replace(m[0], `![${m[1]}](${await uploadImage(f, state)})`);
  }
  // [[links]]: to a published note, a link; otherwise plain text, so readers never hit a dead end
  const privateMentions = [], said = {}, plain = body;
  for (const m of plain.matchAll(WIKI)) { const t = target(m[2]); if (t && t !== note && !said[t.slug]) said[t.slug] = sentenceAround(plain, m.index, m[0].length); }
  body = body.replace(WIKI, (all, bang, name, heading, alias) => {
    const t = target(name), label = (alias || (heading ? name + heading.replace('#', ' > ') : name)).trim();
    if (!t) { if (!alias) privateMentions.push(name.trim()); return label; } // its name shows as plain text: reported, so you can alias it
    if (t !== note) links.add(t.slug);
    return `[${label.replace(/[[\]]/g, '')}](/${t.slug}/${heading ? '#' + slugify(heading.slice(1)) : ''})`;
  });
  body = body.replace(/==([^=\n]+)==/g, '**$1**'); // Obsidian highlights: bold, the nearest thing Ghost keeps
  const fn = []; // footnotes, as plain text, for the theme's sidenotes
  for (const m of body.matchAll(/^\[\^([^\]]+)\]:\s*(.+)$/gm)) fn.push({ id: m[1], text: m[2].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim() });
  body = body.replace(/%%[\s\S]*?%%/g, ''); // Obsidian comments stay private
  let html = md.render(body).trim();
  const h1 = html.match(/^<h1>(.*?)<\/h1>\s*/);
  if (h1 && h1[1].replace(/<[^>]+>/g, '').trim().toLowerCase() === note.title.toLowerCase()) html = html.slice(h1[0].length); // Ghost shows the title already
  const text = html.replace(/<sup class="footnote-ref">[\s\S]*?<\/sup>/g, '').replace(/<hr class="footnotes-sep">[\s\S]*$/, '') // footnotes stay out of the excerpt and the wording
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  let lead = text.slice(0, 220); if (text.length > 220) lead = lead.replace(/\s+\S*$/, '') + '...';
  return { html, links: [...links], excerpt: text.slice(0, 160), privateMentions, words, lead, said, fn };
}

const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c'); // safe inside a <script>
function payload(note, r, backlinks, extra) {
  const tags = note.topics.map((t) => ({ name: t })); // topics first: the first tag gives a note its filing code
  tags.push({ name: '#garden' }, { name: '#' + note.stage });
  if (note.type === 'source') tags.push({ name: '#source' });
  if (note.scatter) tags.push({ name: '#scatter' });
  if (note.rating) tags.push({ name: ratingTag(note.rating) }); // the same tag you'd give a post by hand
  for (const l of note.labels) if (!['garden', 'scatter', 'source', 'seedling', 'growing', 'evergreen'].includes(l)) tags.push({ name: '#' + l });
  const meta = { stage: note.stage, tended: note.tended, planted: note.planted, confidence: note.confidence, words: r.words, type: note.type, kind: note.kind, scatter: note.scatter, backlinks,
    links: extra.links, related: extra.related, log: extra.log, fn: r.fn.length ? r.fn : undefined };
  return {
    title: note.title, slug: note.slug, html: r.html || '<p></p>', tags, status: 'published', visibility: 'public',
    custom_excerpt: note.scatterLine || (note.scatter && r.words > 60 ? r.lead : null), // long notes show their opening on the wall
    codeinjection_head: `<script type="application/json" id="garden-note">${json(meta)}</script>`,
  };
}

// ---------------------------------------------------------------- related by wording
const STOP = new Set(('a an and are as at be been but by can could did do does for from had has have he her his how i if in into is it its just like me more most my no not now of on one or our out over she so some than that the their them then there these they this those to too up us very was we were what when where which who why will with would you your also about after again all am any because before being both each few into only own same should such through under until while get got go going make made much many really thing things way well even still i\'m it\'s don\'t').split(' '));
function words(t) { return String(t).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)); }
// items: [{ slug, title, text, words, topics, links:Set, never:Set }] -> { slug: [slugs] }
// Wording alone can't tell a band's "Down with the System" from a monitoring system, so the bar is high:
// a shared topic, always; at least three distinctive words in common; notes long enough to judge; and never
// a pair you've ruled out with not_related.
function relatedByWording(items) {
  const MIN_WORDS = 25, MIN_SHARED = 3, MIN_SCORE = 0.15;
  const docs = items.map((it) => { const tf = {}; [...words(it.title), ...words(it.title), ...words(it.text)].forEach((w) => { tf[w] = (tf[w] || 0) + 1; }); return tf; });
  const df = {}; docs.forEach((tf) => Object.keys(tf).forEach((w) => { df[w] = (df[w] || 0) + 1; }));
  const N = docs.length, vecs = docs.map((tf) => { const v = {}; let n = 0; for (const w in tf) { if (df[w] < 2 || df[w] > N * 0.5) continue; const x = (1 + Math.log(tf[w])) * Math.log(1 + N / df[w]); v[w] = x; n += x * x; } n = Math.sqrt(n) || 1; for (const w in v) v[w] /= n; return v; });
  const out = {};
  items.forEach((a, i) => {
    const scores = [];
    if (a.words >= MIN_WORDS) items.forEach((b, j) => {
      if (i === j || b.words < MIN_WORDS || a.links.has(b.slug) || b.links.has(a.slug) || a.never.has(b.slug) || b.never.has(a.slug)) return;
      let s = 0, shared = 0; const va = vecs[i], vb = vecs[j];
      for (const w in va) if (vb[w]) { s += va[w] * vb[w]; shared++; }
      if (!a.topics.some((t) => b.topics.includes(t))) return; // different topics: never related by wording
      if (shared >= MIN_SHARED && s >= MIN_SCORE) scores.push([s, b.slug]);
    });
    out[a.slug] = scores.sort((x, y) => y[0] - x[0]).slice(0, 3).map((x) => x[1]);
  });
  return out;
}

// ---------------------------------------------------------------- one pass
function loadState() { try { return JSON.parse(fs.readFileSync(cfg.state, 'utf8')); } catch { return { notes: {}, images: {}, page: null }; } }
function saveState(s) { if (cfg.dry) return; fs.mkdirSync(path.dirname(cfg.state), { recursive: true }); fs.writeFileSync(cfg.state, JSON.stringify(s, null, 2)); }
const hashOf = (o) => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex');

async function upsert(note, data, known, state) {
  if (cfg.dry) { log('[dry run] would publish', note.slug); return; }
  let id = known && known.id;
  if (!id) { // a new note, or one whose file was renamed: adopt an existing post with the same address
    const found = await api('GET', `/posts/slug/${note.slug}/?fields=id`);
    if (found) id = found.posts[0].id;
  }
  if (id) {
    const cur = await api('GET', `/posts/${id}/?fields=id,updated_at`);
    if (cur) { await api('PUT', `/posts/${id}/?source=html`, { posts: [{ ...data, updated_at: cur.posts[0].updated_at }] }); return id; }
  }
  const made = await api('POST', '/posts/?source=html', { posts: [data] });
  return made.posts[0].id;
}

async function pass() {
  const vault = scanVault(), state = loadState();
  const posts = await readPosts();
  vault.postsByName = new Map(); for (const p of posts) { vault.postsByName.set(p.title.toLowerCase(), { slug: p.slug, title: p.title, stage: 'post', published: true, post: true }); vault.postsByName.set(p.slug, vault.postsByName.get(p.title.toLowerCase())); }
  const rendered = new Map();
  for (const n of vault.published) rendered.set(n, await render(n, vault, state));
  for (const [n, r] of rendered) for (const name of new Set(r.privateMentions)) // private notes stay private, but their names can show in your sentences
    log(`note: "${n.title}" mentions "${name}", which isn't published, so its name shows as plain text. To hide it, give the link an alias: [[${name}|other words]]`);
  const known = new Set([...vault.published.map((n) => n.slug), ...posts.map((p) => p.slug)]);
  for (const p of posts) p.links = [...linkedSlugs(p.html)].filter((s) => known.has(s) && s !== p.slug);
  const backlinks = new Map(vault.published.map((n) => [n.slug, []]));
  for (const [n, r] of rendered) for (const s of r.links) if (backlinks.has(s)) backlinks.get(s).push({ t: n.title, u: `/${n.slug}/`, g: n.stage });
  for (const p of posts) for (const s of p.links) if (backlinks.has(s)) backlinks.get(s).push({ t: p.title, u: `/${p.slug}/`, g: 'post' });
  const bySlug = new Map(vault.published.map((n) => [n.slug, n]));
  for (const p of posts) bySlug.set(p.slug, { slug: p.slug, title: p.title, stage: 'post' });
  const slugOfName = (name) => { const t = vault.byName.get(name); return t && t.published ? t.slug : slugify(name); };
  const related = relatedByWording(vault.published.map((n) => ({ slug: n.slug, title: n.title, text: rendered.get(n).html.replace(/<[^>]+>/g, ' '), words: rendered.get(n).words,
    topics: n.topics.map((t) => t.toLowerCase()), links: new Set(rendered.get(n).links), never: new Set(n.notRelated.map(slugOfName)) }))
    .concat(posts.map((p) => ({ slug: p.slug, title: p.title, text: p.text, words: p.words, topics: p.topics.map((t) => t.toLowerCase()), links: new Set(p.links), never: new Set() }))));
  const today = new Date().toISOString().slice(0, 10);
  const logOf = (n) => { // planted, tended and stage changes, recorded as the sync sees them
    const known = state.notes[n.rel] || {}, tl = (known.log || []).slice();
    if (!tl.length) tl.push({ d: n.planted, e: 'planted', g: n.stage });
    else if (known.stage && known.stage !== n.stage) tl.push({ d: today, e: 'stage', g: n.stage });
    else if (known.bh && known.bh !== n.bodyHash) { const last = tl[tl.length - 1]; if (!(last.e === 'tended' && last.d === n.tended)) tl.push({ d: n.tended, e: 'tended', g: n.stage }); }
    return tl.slice(-30);
  };
  let made = 0, changed = 0, gone = 0;
  const seen = new Set();
  for (const [n, r] of rendered) {
    seen.add(n.rel);
    const tlog = logOf(n), card = (s) => { const t = bySlug.get(s); return t ? { t: t.title, u: `/${t.slug}/`, g: t.stage } : null; };
    const data = payload(n, r, backlinks.get(n.slug).sort((a, b) => a.t.localeCompare(b.t)), { log: tlog, links: r.links.map(card).filter(Boolean), related: (related[n.slug] || []).map(card).filter(Boolean) });
    const h = hashOf(data), known = state.notes[n.rel];
    if (known && known.hash === h) { known.log = tlog; known.stage = n.stage; known.bh = n.bodyHash; continue; }
    const id = await upsert(n, data, known, state);
    if (cfg.dry) continue; // a dry run only says what it would do
    known ? changed++ : made++;
    state.notes[n.rel] = { id, slug: n.slug, hash: h, log: tlog, stage: n.stage, bh: n.bodyHash };
    log(known ? 'updated' : 'published', n.slug);
  }
  const inUse = new Set([...seen].map((rel) => state.notes[rel] && state.notes[rel].id).filter(Boolean));
  for (const rel of Object.keys(state.notes)) { // taken out of the garden (publish removed, or the file deleted): back to draft, never deleted
    if (seen.has(rel)) continue;
    const { id, slug } = state.notes[rel];
    if (inUse.has(id)) { delete state.notes[rel]; continue; } // a renamed file: its post now belongs to the new name
    if (!cfg.dry && id) {
      const cur = await api('GET', `/posts/${id}/?fields=id,updated_at`);
      if (cur) await api('PUT', `/posts/${id}/`, { posts: [{ status: 'draft', updated_at: cur.posts[0].updated_at }] });
    }
    delete state.notes[rel]; gone++;
    log('unpublished', slug);
  }
  // the Garden page carries the whole garden's map, so the theme can draw it without asking for every note
  const nodes = vault.published.map((n) => ({ s: n.slug, t: n.title, g: n.stage, k: n.type, kind: n.kind, p: n.topics, d: n.tended, sc: n.scatter || undefined,
    l: rendered.get(n).links, x: rendered.get(n).excerpt, w: rendered.get(n).words, q: rendered.get(n).said, r: related[n.slug] || [], c: n.confidence || undefined, rt: n.rating || undefined }));
  for (const p of posts) nodes.push({ s: p.slug, t: p.title, g: 'post', k: 'post', p: p.topics, d: p.date, l: p.links, x: p.excerpt, w: p.words, r: related[p.slug] || [], tl: p.tldr || undefined, rt: p.rating || undefined });
  const garden = { v: 2, updated: new Date().toISOString().slice(0, 10), notes: nodes.sort((a, b) => a.t.localeCompare(b.t)) };
  const ph = hashOf(garden.notes);
  if (state.page !== ph && !cfg.dry) {
    const head = `<script type="application/json" id="garden-data">${json(garden)}</script>`;
    const page = await api('GET', `/pages/slug/${cfg.page}/?fields=id,updated_at`);
    if (page) await api('PUT', `/pages/${page.pages[0].id}/`, { pages: [{ codeinjection_head: head, updated_at: page.pages[0].updated_at }] });
    else await api('POST', '/pages/?source=html', { pages: [{ title: 'Garden', slug: cfg.page, status: 'published', html: '<p>Notes that grow over time. Start anywhere and follow the links.</p>', codeinjection_head: head }] });
    state.page = ph;
    log('garden map updated,', nodes.length, 'notes');
  }
  saveState(state);
  if (made || changed || gone) log(`done: ${made} new, ${changed} updated, ${gone} unpublished`);
}

// ---------------------------------------------------------------- one-off: Scatter notes into the vault
async function importScatter() {
  const { default: Turndown } = await import('turndown');
  const td = new Turndown({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
  td.addRule('embeds', { // a video card becomes its link on its own line, which the sync turns back into a player
    filter: (node) => node.nodeName === 'IFRAME' || (node.nodeName === 'FIGURE' && node.querySelector && node.querySelector('iframe')),
    replacement: (content, node) => {
      const f = node.nodeName === 'IFRAME' ? node : node.querySelector('iframe'), src = (f && f.getAttribute('src')) || '';
      const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/), vm = src.match(/player\.vimeo\.com\/video\/(\d+)/);
      const url = yt ? `https://www.youtube.com/watch?v=${yt[1]}` : vm ? `https://vimeo.com/${vm[1]}` : src;
      return url ? `\n\n${url}\n\n` : '';
    } });
  const dir = path.join(cfg.vault, 'Garden', 'Scatter'), state = loadState();
  fs.mkdirSync(dir, { recursive: true });
  let page = 1, count = 0;
  for (;;) {
    const res = await api('GET', `/posts/?filter=tag:hash-note&formats=html&include=tags&limit=50&page=${page}`);
    for (const p of res.posts) {
      const name = p.title.replace(/[\\/:*?"<>|#^[\]]/g, '').trim() || p.slug, file = path.join(dir, name + '.md');
      if (fs.existsSync(file)) { log('already in the vault:', name); continue; }
      const topics = (p.tags || []).filter((t) => t.visibility === 'public').map((t) => t.name);
      const labels = (p.tags || []).filter((t) => t.visibility === 'internal' && t.name !== '#note').map((t) => t.name.replace(/^#/, ''));
      const fm = { title: p.title, slug: p.slug, publish: true, scatter: true, stage: 'seedling', topics, tended: (p.updated_at || '').slice(0, 10) };
      if (labels.length) fm.labels = labels;
      if (p.custom_excerpt) fm.scatter_line = p.custom_excerpt;
      fs.writeFileSync(file, '---\n' + YAML.stringify(fm) + '---\n\n' + td.turndown(p.html || '') + '\n');
      state.notes[path.relative(cfg.vault, file)] = { id: p.id, slug: p.slug, hash: '' }; // the next pass updates this same post
      count++; log('imported', p.slug);
    }
    if (!res.meta.pagination.next) break;
    page = res.meta.pagination.next;
  }
  saveState(state);
  log(`imported ${count} Scatter notes into ${path.relative(cfg.vault, dir)}; the next sync moves them into the garden, keeping their addresses`);
}

// ---------------------------------------------------------------- run
const cmd = process.argv[2] || 'watch';
if (!cfg.ghost || !cfg.key) { console.error('Set GHOST_URL and GHOST_ADMIN_KEY.'); process.exit(1); }
if (!fs.existsSync(cfg.vault)) { console.error('No vault at', cfg.vault); process.exit(1); }
try { adminToken(); } catch (e) { console.error(e.message); process.exit(1); } // a malformed key shows up straight away
if (cmd === 'import-scatter') await importScatter();
else if (cmd === 'once') await pass();
else {
  log(`garden-sync watching ${cfg.vault} every ${cfg.interval}s${cfg.dry ? ' (dry run)' : ''}`);
  for (;;) {
    try { await pass(); } catch (e) { log('sync failed, will retry:', e.message); }
    await new Promise((r) => setTimeout(r, cfg.interval * 1000));
  }
}
