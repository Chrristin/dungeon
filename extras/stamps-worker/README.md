# Stamps Worker

Readers can stamp a post or a Now month ("I was here") and sign the stamp with a name. The count and names need somewhere to live, and a Ghost theme can't store anything, so this is a small Cloudflare Worker with a D1 database on your own Cloudflare account, on the free plan.

## What it does

- One row per stamp: the post or month, the date, and an optional name.
- Only posts in your sitemap and months on your Now page can be stamped.
- A stamp is final. The reader's browser gets a private key for their stamp, and only that key can add a name to it, once. Keys are stored hashed.
- Names: letters in any language, spaces, full stops, hyphens and apostrophes, up to 24 characters; no links or markup; a short blocked-word list.
- Each visitor can stamp a few times a minute. Visitor addresses are used only in memory for that limit, never stored.

The free plan allows 100,000 D1 row writes a day.

## Set it up (about ten minutes)

1. **Cloudflare dashboard → Storage & Databases → D1 → Create database.** Name it `stamps`.
2. Open the database, go to **Console**, paste the contents of [`schema.sql`](schema.sql), and click **Execute**.
3. **Workers & Pages → Create → Create Worker.** Name it, for example, `mysite-stamps`, and click **Deploy**.
4. **Edit code**, replace everything with [`worker.js`](worker.js), and click **Deploy**.
5. **Settings → Bindings → Add → D1 database.** Variable name `DB`, database `stamps`.
6. **Settings → Variables and Secrets → Add.** Name `SITE`, value your site's address, for example `https://example.com`.
7. Check it: open `https://mysite-stamps.<you>.workers.dev/stamps/<a-post-slug>`. You should see `{"count":0,"names":[],"more":0}`.
8. **Ghost → Settings → Design & branding → Customise → Stamps endpoint:** paste the Worker's address and save.

Use the Worker's own `workers.dev` address rather than a route on your domain: it keeps working if your site is down, and isn't affected by local DNS tricks such as a Pi-hole pointing your domain at a home server.

## Removing a stamp or a name

Until the approval page arrives, you can do it in the D1 **Console**. To find recent names:

```sql
SELECT id, post, name, created_at FROM stamps WHERE name IS NOT NULL ORDER BY id DESC LIMIT 50;
```

Remove just the name, keeping the stamp: `UPDATE stamps SET name = NULL WHERE id = 123;`
Remove the stamp entirely: `UPDATE stamps SET hidden = 1 WHERE id = 123;`
