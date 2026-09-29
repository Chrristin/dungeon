# Stamps Worker

Readers can stamp a post or a Now month ("I was here") and sign the stamp with a name. The count and names need somewhere to live, and a Ghost theme can't store anything, so this is a small Cloudflare Worker with a D1 database on your own Cloudflare account, on the free plan.

## What it does

- One row per stamp: the post or month, the date, and an optional name.
- Only posts in your sitemap and months on your Now page can be stamped.
- A stamp is final. The reader's browser gets a private key for their stamp, and only that key can add a name to it. The reader can remove their name again for up to a day after signing. Keys are stored hashed.
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

## Stickies (from 1.3.0)

Short notes readers leave under posts, pinned once you approve them. They live in the same Worker and database.

1. **Database:** in the D1 **Console**, run [`migrate-1.3.0.sql`](migrate-1.3.0.sql), one statement at a time, then [`migrate-1.3.2.sql`](migrate-1.3.2.sql).
2. **Turnstile:** Cloudflare dashboard → **Turnstile** → **Add widget**, your domain, mode **Managed**, pre-clearance off. Keep the site key (public) and secret key.
3. **Worker code:** deploy the latest [`worker.js`](worker.js).
4. **Secrets** (Worker → Settings → Variables and Secrets, type Secret): `TURNSTILE_SECRET` (the Turnstile secret key) and `MOD_SECRET` (any long random text, kept in your password manager). Deploy.
5. **Notifications,** either or both:
   - **Telegram:** create a bot with @BotFather and add its token as the secret `TELEGRAM_BOT_TOKEN` (the token alone, without "bot" in front). Deploy, then open `https://<your-worker>/telegram/setup?key=<MOD_SECRET>`. It says "Almost there": send your bot a message, and open the link again. It shows your chat ID: add it as the text variable `TELEGRAM_CHAT_ID`, and deploy.
   - **ntfy:** pick a long, hard-to-guess channel name, subscribe to it in the ntfy app, and add it as the secret `NTFY_TOPIC`.
6. **Theme:** Ghost → Design → **Stickies site key**: paste the Turnstile site key. Stickies appear under posts, replacing Ghost's comments.

Approve and Delete buttons use signed links that expire after 7 days. To remove a sticky later by hand: `UPDATE stickies SET status = 'deleted' WHERE id = 123;` in the D1 Console.

## Upgrading from before 1.3.8

In the D1 **Console**, run [`migrate-1.3.8.sql`](migrate-1.3.8.sql) once (it marks members' and the author's stickies), then deploy the new `worker.js`. For the Author stamp, add the variable `AUTHOR_EMAIL` with the email you sign in to your site with. To check member sign-in works on your site, sign in as a member and run this in the browser console on your site (with your Worker's address):

```
fetch('/members/api/session').then(r=>r.text()).then(t=>fetch('https://<your-worker>/whoami',{headers:{Authorization:'GhostMember '+t}})).then(r=>r.text())
```

It should show `"member":true` (and `"author":true` when signed in with `AUTHOR_EMAIL`).

## Upgrading from before 1.3.2

In the D1 **Console**, run [`migrate-1.3.2.sql`](migrate-1.3.2.sql) once (it lets stickies keep the colour they were written on), then deploy the new `worker.js`. Until you do, the stickies area stays hidden and the Worker says the table needs updating.

## Upgrading from before 1.2.3

In the D1 **Console**, run [`migrate-1.2.3.sql`](migrate-1.2.3.sql) once (it adds one column), then deploy the new `worker.js`. Until you do, signing a name shows a message saying the database needs updating.

## Removing a stamp or a name

Until the approval page arrives, you can do it in the D1 **Console**. To find recent names:

```sql
SELECT id, post, name, created_at FROM stamps WHERE name IS NOT NULL ORDER BY id DESC LIMIT 50;
```

Remove just the name, keeping the stamp: `UPDATE stamps SET name = NULL WHERE id = 123;`
Remove the stamp entirely: `UPDATE stamps SET hidden = 1 WHERE id = 123;`
