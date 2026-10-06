# Dungeon

A playful theme for [Ghost](https://ghost.org). Posts sit on the page as pastel index cards, each tilted at its own slight angle and stamped with a filing code. There's a floating menu, a month-by-month **Now** page, a **Scatter** wall of short notes, and a lightsaber in the footer that switches between light and dark.

**[See the live demo](https://dungeon-demo.pages.dev)**, with sample content that shows every feature.

Version 2.9.7. Works with Ghost 5 and 6. Built for [christingeorge.com](https://christingeorge.com).

![Dungeon: homepage](docs/screenshots/home.jpg)

<p align="center">
  <img src="docs/screenshots/switch.gif" alt="The lightsaber switch changing the site from dark to light and back" width="840">
</p>

## Features

- **Plots homepage (optional).** A homepage of plots, one per part of your site, each a large index card showing its newest pieces and how far it has grown. Tag pages become rooms inside it. Turned on by publishing a page at `/plots/`; see [Plots](#plots).
- **Index-card homepage.** Grainy pastel cards, each at a stable angle. Hovering straightens a card and brings its image's colour back. On phones, cards gain colour as they scroll into view.
- **Filing codes.** Every post gets a code from its primary tag and date, such as `#HO260924` for a Homelab post on 24 September 2026.
- **Reader overlay.** Posts open over the homepage in a panel; direct links still work as normal pages.
- **Floating menu.** A pill at the bottom of the screen that hides while you scroll down on phones, rests above the footer at the end of a page, and adapts to narrow screens.
- **Library.** Your bookshelves drawn spine by spine on two crooked wooden bookcases, exactly as shelved. Visitors can re-sort them, try patterns such as a piano or twelve rainbows, or arrange them by hand and send you the result. See [Library](#library).
- **Now page.** Monthly updates as cards that fill the screen's height, arrive one by one, and nudge sideways to show there's more. Empty space in a card can hold an etched pattern.
- **Scatter wall.** One- or two-line notes: thoughts, quotes, song lyrics with a play button, reading notes, code snippets. They drop in one by one as you scroll.
- **Lightsaber switch.** A glowing blade in the footer. Clicking it switches between light and dark mode over two seconds, with the new mode spreading out in a circle edged with crackling static. Optional synthesised sound.
- **Light, dark or automatic** colour scheme, and a remembered choice per visitor.
- **Calm when asked.** Every animation respects the visitor's reduced-motion setting.
- **Privacy-minded.** Fonts are hosted by the theme. YouTube embeds show a thumbnail and only load YouTube's no-cookie player when a visitor presses play.
- **Translatable.** All interface wording goes through Ghost's translation helper.


## Screenshots

| Now page | Scatter wall |
|---|---|
| ![Now page](docs/screenshots/now.jpg) | ![Scatter wall](docs/screenshots/scatter.jpg) |

| Dark mode | On a phone |
|---|---|
| ![Homepage in dark mode](docs/screenshots/home-dark.jpg) | ![Homepage, Now page and Scatter wall on a phone](docs/screenshots/phone.jpg) |

## Installation

1. Download **`dungeon.zip`** from the [latest release](../../releases/latest). Keep that file name: Ghost names the theme after the zip, and theme settings belong to that name, so an update uploaded as `dungeon.zip` overwrites the theme and keeps your settings.
2. Ghost Admin → **Settings → Design & branding → Change theme → Upload theme**, choose the zip, and activate it.
3. Optional, but needed for the Now page and Scatter wall: upload [`docs/routes.yaml`](docs/routes.yaml) in **Settings → Labs → Routes**. Download your current file first as a backup.

## Theme settings

Found in **Settings → Design & branding → Customise**.

| Setting | What it does |
|---|---|
| **Role line** | A short line under the homepage statement, for example what you do. Hidden when empty. |
| **Now items** | A ticker in the footer. Separate items with `\|`. Hidden when empty. |
| **Color scheme** | Auto (follows the visitor's device), Light or Dark. The saber switch overrides it per visitor. |
| **Card tilt** | None, Subtle, Playful or Wild. |
| **Hero card** | Shows the newest post as a large card beside the homepage statement on desktop. |
| **Show index** | A list of your tags, with post counts, in the footer. On phones it shows the top six, with "+N more". |
| **Logo invert dark** | Inverts a dark logo so it shows on the dark scheme. |
| **List heading** | A heading above the post list. Hidden when empty. |
| **Floating nav** | The floating menu. Off puts navigation back under the logo. |
| **Footer name** | The name in the footer. Defaults to the site title. |
| **Footer note** | A short line after the name in the footer. Hidden when empty. |
| **Footer line two** | A second footer line, bottom left: your fonts, a note, anything. Hidden when empty. |
| **Show credit** | The design credit in the footer. Switch it off if you prefer. |
| **Now filler** | The pattern drawn in empty space on Now cards: Floral, Circuit board, Cityscape, Topographic or None. |
| **Scheme switch** | The lightsaber light/dark switch in the footer. |
| **Saber light message** | Text shown briefly when switching to light mode. |
| **Saber dark message** | Text shown briefly when switching to dark mode. |
| **Saber sound** | A synthesised saber sound on switching. Off by default. It only ever plays when a visitor clicks the saber. |
| **Stamps endpoint** | The address of your stamps Worker. Empty hides the stamps; share always shows. See [Stamps and sharing](#stamps-and-sharing). |
| **Stickies site key** | Your Cloudflare Turnstile site key. With the stamps endpoint set, stickies replace Ghost's comments under posts. See [Stickies](#stickies). |

## Navigation

Set the links in **Settings → Navigation**.

- **Primary** links appear in the floating menu. Four or five short labels fit comfortably.
- **An "Everything" menu:** add a primary item whose URL is `#everything`, with any label. It opens a small panel above the menu holding your **Secondary** links. When it's set up, secondary links are shown only there, not in the footer.
- **Narrow screens:** if the menu doesn't fit, the theme first tightens its spacing, then moves items into the Everything panel (keeping the last item, such as Contact, visible), and as a last resort shrinks Everything to a `+`.

## Now page

1. Create a page with the URL **`now`**. Its body becomes the intro above the timeline.
2. Each month is a post with the internal tag **`#now`**. Its publish date sets the month label (for example **Sep '26**). The title isn't shown.
3. Clicking a month opens it in the overlay. A feature image appears at the top of the card.
4. **Pattern for one month:** add one of `#filler-floral`, `#filler-circuit`, `#filler-city`, `#filler-topo` or `#filler-none`. It overrides the **Now filler** setting for that month.
5. **Colour for one month:** add a colour tag (see [Colours](#colours)). Otherwise each month gets a colour automatically.

The page shows the latest 60 months.

## Scatter wall

1. Create a page with any title and URL, then pick the **Scattered** template in its settings. Its body becomes the intro.
2. Each note is a post with the internal tag **`#note`**. The title isn't shown (except on quotes and lyrics, below).
3. **Kind** (optional, sets the card's label and code prefix):

| Tag | Label | Code |
|---|---|---|
| `#thought` | Thought | `#TH260926·1745` |
| `#reading` | Reading | `#RD…` |
| `#code` | Code | `#CD…` |
| `#found` | Found | `#FD…` |
| `#quote` | Quote | `#QT…` |
| `#lyric` | Lyric | `#LY…` |
| none | none | `#NO…` |

4. **Quotes and lyrics:** the body is the quote, and the **title is the attribution** (for example `Author, Book`). Paste a YouTube or YouTube Music link in the body and it becomes a play button that opens a small player in the card.
5. **Colour** (optional): see [Colours](#colours).
6. A **feature image** appears at the top of the card and zooms out past it on hover.

The wall shows the latest 100 notes, newest first, packed into columns.

When publishing Now entries and notes, choose **Publish only**, so they aren't emailed to newsletter subscribers.

## Colours

Add one of these internal tags to a Scatter note or a Now month to fix its colour:

- **Pastels:** `#pistachio` `#mint` `#sky` `#periwinkle` `#lilac` `#blush` `#peach` `#butter` `#sage` `#seafoam`
- **Bold:** `#red` `#tangerine` `#sunflower` `#cobalt` `#emerald` `#ink` (text and patterns switch to white automatically)

## Hiding a post's feature image

Add the internal tag **`#hide-image`** to a post to keep its feature image off the post itself. The image still shows on the post's card and in social previews. To hide a feature image everywhere, remove it and set the sharing images in the post's **Social** settings instead. Pages don't need the tag: Ghost's page settings have their own "Show title and feature image" switch, which the theme follows.

## Tables and a Colophon page

Tables in posts and pages are styled as clean rows, with the first column as the label and the rest quieter. Two-column Markdown tables with an empty header row show no header at all. On a page with the URL **`colophon`**, level-4 headings (`####`) become small uppercase section labels, handy for a "how this site is made" page.

## Stamps and sharing

Every post ends with a round **Share** button. Hovering turns its arrow into a paper plane that idles, ready for take-off; clicking shatters the button's circle and launches the plane: on phones it opens the phone's own share sheet, and on desktop the plane climbs past a small menu with Copy Link, Twitter, LinkedIn, WhatsApp and Email. It needs no setup and loads nothing from those services.

**Stamps** are the "I was here" of this theme, on posts and on Now cards. One stamp button shows how many readers have stamped. Stamping brings the stamp down with a small animation and leaves a red SEEN impression with the date, and a name line inside the stamp invites a signature for a few seconds: just start typing. Tapping the stamp again lists the latest names. A reader can take their own name back during the same browser visit, and for up to a day after signing.

Stamps need a small counter you run yourself on Cloudflare's free plan, because a Ghost theme can't store anything. Follow [`extras/stamps-worker`](extras/stamps-worker/README.md), then paste the Worker's address into the **Stamps endpoint** setting. Until then the stamps stay hidden.

## Plots

An optional homepage that shows your site as a set of plots, one per subject, instead of one long list. It's off until you publish a page with the address `/plots/`, and everything on it comes from Ghost, so there's nothing to configure in the theme.

**The page at `/plots/`:**

| Part of the page | Becomes |
|---|---|
| Title | The badge at the top left, like `DCIP`. Also the page's own title. |
| Excerpt | The statement, the large heading. Everything after its first comma is drawn in green, and a closing full stop becomes three dots that fill in and fade, on a loop: `Digital Christin, in progress.` Without an excerpt, the site description. |
| Text | The introduction under the statement. A bulleted list of links becomes a row of buttons, for the first thing a visitor should do (a résumé, your best work, a contact page). |
| Public tags, in order | The plots, in that order. The first is the largest. |

**Each plot** is a public tag: its name and description are the plot's heading and line, its accent colour (Tags → the tag → Accent colour) sets the card's colour, and otherwise the colour comes from the slug like any card. Give the tag an image and it's etched faintly behind the plot, darkening when you point at it: line drawings on a transparent background work best. It lists its five newest pieces, by the date they were published. A tag with no posts yet shows as an outline marked unplanted, so you can show a subject you mean to start. Add a plot's tag to a post as a **second** tag: the first tag gives a post its filing code, and making the plot the first tag would change it.

**Growth.** A post or note can carry an internal tag for its stage, `#seedling`, `#growing` (or `#budding`) or `#evergreen`, shown as the Garden page's sprouts on cards, plots and lists. Garden notes get theirs from garden-sync. Each plot's meter counts its pieces: none is unplanted, 1 to 2 sprouting, 3 to 10 growing, 11 to 20 flourishing, more is lit.

**Under the plots:** the five most recently published pieces (Recently planted), a link to the Garden page when you have one, and then every post, newest first, as usual. The list heading uses the List heading setting.

**Inside a plot.** Each plot's tag page gets a strip with the badge (back to the plots), the plot's meter and every other plot, so visitors can move between them. Other tag pages get the strip too.

The plots are also shown at `/plots/` itself. Unpublish the page, or make it a draft, and the classic homepage comes back.

## The Garden

A digital garden: notes that grow over time, linked to each other, instead of posts that are finished when published. You write them in Obsidian; [`extras/garden-sync`](extras/garden-sync/README.md) publishes the ones you mark `publish: true` into Ghost, with their links, images and backlinks.

Garden notes are Overgrown cards, sized to their content: vines creep round a card as it gains links, flowers open on evergreens, and a card's length is etched into its left edge (one to four cuts). Cards that link to each other are joined by vines; click one to see the sentence the link was written in. In Most connected, cards come in groups: the best-connected card sits on top with its links and related notes stacked under it; the first click spreads the group round it, joined by vines, and a second click opens it. Notes open in the reader overlay. The Garden page (at `/garden/`) shows the stage counts, a "Pull a random note" button, recently tended and most connected notes, a map of how they link (point at a note for its whole title, or at a line to see why two notes are joined; zoomed out, notes become dots), notes by topic, and every note, sortable. Each note's page is a lab notebook: graph paper, a spec sheet (stage, confidence, links in and out, planted, tended, length), a red "Tended" stamp, footnotes as sidenotes in the margin, small marks after external links, previews of linked notes on hover, a tending log, what links to it, related notes (worked out from shared wording), and a small map of its neighbours. On garden pages, / searches the garden, r opens a random note, g goes to the garden and ? lists these. Sources (books, films, talks) are drawn as library cards. Your posts are part of the garden too: they appear on the Garden page (with an Everything, Notes and Posts filter) and on the map as paper cards with a TL;DR (your custom excerpt if the post has one, otherwise its strongest line, picked from your own sentences), their links count in both directions, notes can link to them by title, and each post's page shows its place in the garden (what mentions it, what it links to, and related notes and posts). Garden notes stay out of the homepage feed. Mark a note `scatter: true` and it also appears on the Scatter wall, with a small patch of grass in its corner: hover it and a few flowers bloom, click it to open the note in the garden.

## Stickies

Readers can leave a short handwritten sticky under a post: up to 200 characters and an optional name. A blank sticky, in a random colour, is always stuck on the post card's corner (just below the card on phones), ready to write on; the pinned sticky keeps its colour. Its x, or Escape while it's in view, crumples it up and throws it off the page (in the reader overlay, Escape throws it only if something's written, and otherwise closes the overlay). The pin button takes a deeper version of the sticky's colour, and every sticky is held on by a strip of white tape. Stickies sit right on the page, in loose rows around the blank one; the area grows with them, and once it's full they pile up, the newest on top. Tapping one lifts it, larger, to read; tapping again, tapping elsewhere or Escape puts it back at the bottom of the pile. The list icon shows them all in order. Stickies come in pastel and, about one in four, the theme's bold colours, avoiding the colour closest to the post's own. Longer stickies are written smaller, like a real sticky note, and short ones get a few hand-drawn doodles and scribbles in the empty space, matched to the post's tags where it can (music, homelab, design, F1, books, health, product) and a random one otherwise. In the reader overlay, the stickies sit inside the story's card. A new sticky waits for your approval before anyone else sees it, while its writer sees it straight away, marked as waiting, and can take it back during the same visit. There are no replies.

Signed-in members skip the wait: their sticky goes up straight away under their Ghost account name, marked as a member's with a hand-drawn frame, and they can take it back any time from any device. The author's stickies (the Worker's `AUTHOR_EMAIL`) carry an Author stamp and a double frame. Visitors see a "Sign in to skip the wait" link when the site has members switched on.

You approve or delete each sticky from a Telegram message or an ntfy notification, with one tap. Stickies use the same Worker as stamps, plus Cloudflare Turnstile to keep bots out. Set them up with [`extras/stamps-worker`](extras/stamps-worker/README.md), then fill in **Stickies site key**. Once they're on, Ghost's own comments are no longer shown under posts; switch commenting off in Ghost too (**Settings → Membership → Access → Commenting → Nobody**).

The handwriting is Caveat, under the SIL Open Font License (`assets/fonts/LICENSE-Caveat.txt`).

## Ratings

Rate any post out of 5, in halves, with an internal tag: `#rated-4-5` is 4.5, `#rated-4` is 4 (from `#rated-0-5` to `#rated-5`; create the tags once, then pick one from the tag list). The post shows a red RATED stamp, and a small one on its card. Garden notes take `rating: 4.5` in their properties instead.

With the stamps Worker and a Turnstile site key set, readers can rate what you've rated, at the end of the post. Run `extras/stamps-worker/migrate-1.10.0.sql` once in the D1 console first. The readers' average shows once 3 people have rated.

A page with the address `/ratings/` lists everything you've rated (up to 100), by topic, with readers' averages.

## Uses

A page with the address `/uses/` shows what you use as a grid of tiles, with a bar of categories and one overlay for details. Each thing is a post:

- **A thing** is a post with the internal tag `#thing`. Its title is the name, its feature image the photo, its excerpt the line under the tile, and its body a longer note for the overlay (leave it empty if there's nothing more to say).
- **Its category** is an internal tag that starts with `#uses-`, such as `#uses-desk`.
- **Labels** are any other internal tags, such as `#preethi` or `#recommended`.
- **Retired things** take `#retired`. They keep their category tag but are shown in the last section, with their excerpt labelled "Cause of death".
- **A buy link** is a Button card in the body. It's marked `sponsored nofollow`, and Amazon links get a disclosure line.
- **Order:** oldest first within a category, by publish date. Change a thing's date to move it.

The Uses page itself holds the introduction and the categories: each heading (H2) names a category and sets its place in the order ("Desk" matches `#uses-desk`), and a paragraph under a heading is that category's line. A heading that starts with "Retired" names the retired section. Categories without a heading follow, named after their tag.

To show a thing in a post, paste its link (`/things/its-name/`) on a line of its own. It becomes the thing's tile; neighbouring ones form a shelf. The tile is read from the thing's page, so there's one place to edit.

Photos are shown as they are, with rounded corners: cut-out PNGs with a transparent background sit best, and a filled photo shows as a rounded picture in the tile. Around 800px is plenty. Each tile leans slightly (following the Card tilt setting) and wiggles upright on hover. A thing without a photo shows its initials. In the overlay, the arrows, the arrow keys or a swipe step to the previous and next thing.

Upload `docs/routes.yaml` so things get their addresses (`/things/<name>/`) and stay off the homepage and feed. `docs/redirects.yaml` sends `/things/` to the Uses page. If you run garden-sync, update it too: it now leaves things out of the garden.

## Library

A page that draws your bookshelves: every book is a spine with its own colours, size and decoration, standing where it stands in real life. Make a page, choose **Template: Library** in its settings, and it works at any address. With the bundled [`docs/routes.yaml`](docs/routes.yaml), the page with the address `/library/` is shown at `/collection/library/`.

- **The books** are one file, [`assets/data/library.json`](assets/data/library.json), one line per book. [docs/library.md](docs/library.md) explains each field and how to add, move or correct a book.
- **The page's title, excerpt and text** are the heading and introduction, as on any page.
- **Sort and Pattern** rearrange every book across the twelve shelves. **Arrange by hand** lets a visitor drag any book anywhere; shelves keep their real number and width, so a full shelf refuses another book.
- **Sending an arrangement.** A hand arrangement has its own link, and opening the link shows it. Put an email link in the page's text and a "Send this arrangement to me" button appears, which opens the visitor's mail app with the link in it. Without an email link, visitors can still copy the link.
- **Topics.** Each book can carry topic tags. The Topic menu lights up one topic and fades every other book, whatever the arrangement.
- **Curios.** The things standing on your shelves and on top of the cases are drawn too. Visitors can drag them anywhere or hide them all; clicking one shows the name and details you give it in the data file.
- **Covers.** Selecting a book shows a drawn cover at once. The page then asks [Open Library](https://openlibrary.org) for the real cover and shows it if one is found. To use your own image, give the book a `cover` address in the data file. To stop the lookups, set `"covers": "none"` at the top of the file.
- **On a plot.** Give the page a plot's tag, such as The Collection's, and it gets a box in that plot: a small shelf of its books rising out of the top (or the page's feature image, if it has one), with how many shelves and books. Beside a watchlist's box, the two share the row at half width each.

## A row of people

For a thank-you section, put round faces in a row; each shows a small card with a name and a line on hover, or on tap on a phone. In a Markdown or HTML card:

```html
<div class="people">
<span class="person" tabindex="0"><span class="person-initials">AB</span><span class="person-note"><a href="https://example.com">Their Name</a>Why they're here</span></span>
</div>
```

Use `<img src="..." alt="Their Name">` in place of the initials span for a photo.

## routes.yaml

Upload [`docs/routes.yaml`](docs/routes.yaml) in Ghost Admin (Settings > Labs > Routes). It puts the Library page at `/collection/library/` and keeps Now entries, Scatter notes, garden notes and things out of the homepage's list, each on its own page, while garden notes keep their addresses through a second collection at `/notes/`. Leaving garden notes out matters: the theme never shows them as cards, so if the homepage list included them they'd still take up places on each page, and a page of 25 could show only a handful of cards. Ghost doesn't apply a theme's routes file by itself when the theme updates, so upload it again whenever this file changes. [`docs/redirects.yaml`](docs/redirects.yaml) optionally sends visitors of `/notes/` to the Garden page.

## The demo site

The [demo](https://dungeon-demo.pages.dev) is rebuilt automatically after every release: GitHub starts a throwaway Ghost, installs the new theme, loads the sample content in [`demo/content.json`](demo/content.json), and publishes a static copy to Cloudflare Pages. Static means search, sign-ups and comments are switched off there; everything else is exactly what you'd install. The build lives in [`demo/build.mjs`](demo/build.mjs).

## Translations

Copy `locales/en.json` to a file named after your language (for example `locales/de.json`), translate the values, and set your site's language in **Settings → General**.

## Known limitations

- A few labels created by the theme's script (such as the Index's "+N more" and the music player's "Play" and "Stop") are English only.
- The Library's own wording (sort names, messages, the book card) is English only, and its real covers come from Open Library, a third party, when a visitor selects a book (see [Library](#library) to turn that off).
- The Now page shows up to 60 months and the Scatter wall up to 100 notes.
- The circular colour-mode reveal needs a browser with View Transitions; others get a smooth two-second colour blend instead.

## Credits

- Design inspired by [Jake Przespo](https://www.jake.design/).
- Floating navigation inspired by [Hiran Venugopalan](https://hiran.in).
- Fonts: [Geist](https://vercel.com/font) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/), and IM Fell English SC by Igino Marini for the Library's spines, all under the SIL Open Font License (licences in `assets/fonts`).

## Licence

MIT. See [LICENSE](LICENSE).
