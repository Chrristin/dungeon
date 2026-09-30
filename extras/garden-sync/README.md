# garden-sync

Publishes the Obsidian notes you mark `publish: true` into your Ghost site as a digital garden, for the Dungeon theme's Garden page. It runs in a small container on your server, checks the vault every minute, and only touches notes you've marked.

**What it does, each pass:** turns `[[links]]` to published notes into site links (links to unpublished notes become plain text), uploads images once, works out every note's backlinks, and creates, updates or unpublishes the matching Ghost posts. It also gives the Garden page its map of every note. Unchanged notes are left alone.

## 1. Ghost

1. **Settings → Integrations → Add custom integration,** named "Garden sync". Copy its **Admin API key**. It's a password to your whole site: keep it out of chats and files you share.
2. **The Garden page** is created at `/garden/` on the first sync if it doesn't exist. Edit its text in Ghost like any page; the theme draws the rest. Add it to your navigation (Settings → Navigation).

## 2. Syncthing: the vault on the server, phone and laptop

Syncthing keeps a folder the same on every device, directly between them, with no cloud in between.

**On the server,** as a container:

```yaml
services:
  syncthing:
    image: lscr.io/linuxserver/syncthing:latest
    container_name: syncthing
    restart: unless-stopped
    environment:
      - PUID=1000        # your user's id: run `id` on the server
      - PGID=1000
      - TZ=Asia/Kolkata
    volumes:
      - /volume2/docker/syncthing/config:/config
      - /volume2/docker/syncthing/vault:/vault
    ports:
      - 8384:8384          # its web page: keep it to your own network
      - 22000:22000/tcp
      - 22000:22000/udp
      - 21027:21027/udp
```

**On Android:** the official Syncthing app was discontinued in December 2024. Use **Syncthing-Fork**, which is maintained, from **F-Droid** or its GitHub releases. Neither is in the Play Store, because Google stopped allowing the storage permission Syncthing needs.

**On the laptop:** Syncthing's own download for your system.

**Then** share your Obsidian vault folder between all three, with the server's copy at `/volume2/docker/syncthing/vault`. On the phone, point Obsidian at the synced folder.

## 3. The sync container

1. Copy this folder to the server, for example `/volume2/docker/garden-sync/`.
2. Create `.env` next to `docker-compose.yml` with your key: `GHOST_ADMIN_KEY=<the admin api key>`.
3. Check `docker-compose.yml`:
   - `GHOST_URL` is Ghost's address **on your network** (the container name and port, like `http://ghost:2368`), not your public address: Ghost's admin is behind Cloudflare Access, which would block the sync.
   - `networks` names the Docker network your Ghost container is on (`sudo docker network ls`).
   - The vault path matches Syncthing's.
4. **A first dry run,** to see what it would publish without changing anything:
   ```
   sudo docker compose run --rm -e DRY_RUN=1 garden-sync node sync.js once
   ```
5. **Start it:** `sudo docker compose up -d --build`, then watch it with `sudo docker logs -f garden-sync`.

## 4. Moving the Scatter notes into the garden (once)

This writes each existing Scatter note (`#note` posts) into the vault as `Garden/Scatter/<title>.md`, marked `publish: true` and `scatter: true`, keeping its kind and colour as `labels`. The next sync moves it into the garden **as the same post at the same address**, so its stamps and stickies stay attached. It needs to write to the vault, so it runs with a writable copy of the mount:

```
sudo docker compose run --rm -v /volume2/docker/syncthing/vault:/vault garden-sync node sync.js import-scatter
```

Syncthing then carries the new files to your phone and laptop.

## Writing notes

Everything goes in a note's properties (the block at the top in Obsidian). Only `publish` is required.

| Property | What it does |
|---|---|
| `publish: true` | Put the note in the garden. Remove it, or set it to false, and the post goes back to a draft; nothing is ever deleted. |
| `stage` | `seedling` (the default), `growing` or `evergreen`. |
| `topics` | A list, like `[Homelab, Books]`. Groups the note on the Garden page, and the first one gives its filing code. |
| `type: source` | A book, film, talk, article or paper, shown as a library card. Add `source_kind: film` (or book, talk...). |
| `scatter: true` | Also show the note on the Scatter wall, linking back to it. `scatter_line` sets the card's line; otherwise long notes show their opening. |
| `labels` | Extra internal tags, like a Scatter kind (`quote`, `lyric`, `reading`, `code`, `found`, `thought`) or colour (`red`, `mint`...). |
| `slug` | The note's address. Set it before renaming a file, so the address (and its stamps and stickies) stays the same. |
| `tended` | The "last tended" date. Normally taken from when the file last changed. |
| `title` | The title, if it should differ from the file name. |

## Good to know

- **Private notes stay private, but their names can show.** A link to an unpublished note becomes its name as plain text, so "details are in [[My passwords]]" would show "My passwords". The sync lists every such mention in its log; to hide one, give the link an alias: `[[My passwords|my notes]]`.
- **`%%comments%%` stay private,** and never leave the vault.
- **Highlights** (`==text==`) become bold, the nearest thing Ghost keeps.
- **Images** (`![[picture.png]]` or `![](path)`) are uploaded to Ghost once each and reused.
- **Videos:** a YouTube or Vimeo link on its own line (or `![](link)`) becomes an embedded player.
- **Garden notes appear only on the Garden page** (and the Scatter wall when marked), never in the homepage feed.
