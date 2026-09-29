# Likes Worker

The heart at the end of each post needs somewhere to keep its count. A Ghost theme can't run server code, so this is a tiny Cloudflare Worker you run on your own Cloudflare account, on the free plan. Nobody else's server is involved.

## What it does

- Keeps one count per post in Workers KV.
- Only counts likes for posts that are really on your site (it reads your sitemap).
- A like is final, like a clap: there is no unlike, so nobody can drain a post's count.
- Limits each visitor to a few likes a minute. The limit is held in memory, so it stops casual spam, not a determined attacker.
- Stores no visitor data. Two likes at the same instant can occasionally count as one.

The free plan allows 1,000 KV writes a day, which is 1,000 likes.

## Set it up (about five minutes)

1. **Cloudflare dashboard → Storage & Databases → KV → Create a namespace.** Name it `likes`.
2. **Workers & Pages → Create → Create Worker.** Name it, for example, `mysite-likes`, and click **Deploy**.
3. **Edit code**, replace everything with the contents of [`worker.js`](worker.js), and click **Deploy**.
4. **Settings → Bindings → Add → KV namespace.** Variable name `LIKES`, namespace `likes`.
5. **Settings → Variables and Secrets → Add.** Name `SITE`, value your site's address, for example `https://example.com`.
6. Copy the Worker's address (`https://mysite-likes.<you>.workers.dev`).
7. **Ghost → Settings → Design & branding → Customise → Likes endpoint:** paste that address and save.

The heart appears on your posts once the Worker answers. To check the Worker directly, open `https://mysite-likes.<you>.workers.dev/likes/<a-post-slug>`: it should show `{"slug":"...","count":0}`.

Use the Worker's own `workers.dev` address rather than a route on your site's domain. It keeps working if your site goes down, and it isn't affected by local DNS tricks such as a Pi-hole pointing your domain at a home server.
