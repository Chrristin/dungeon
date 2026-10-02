# Changelog

## 2.2.0

- **A stack in Most connected fans out over the page.** The page stays as it is under an 80% veil (dark in dark mode, light in light) and the stack's cards spread out of it, its top card in the middle and its connected cards round it, joined by their vines. Click a card to open it; Escape, a click on the veil or "Fold back" gathers them back into the stack. Nothing on the page disappears any more.
- **The card growing into a post is visible again.** In 2.1.2 the rule that hides the post while the card grows also hid the card itself, so it looked as if the card vanished and the post appeared.
- **Everything inside a post's card takes the card's ink in dark mode.** Garden links, the tending log's dates, related chips and quiet labels were drawn in the page's light dark-mode ink on the light card. The garden heading and the stamp's red are a shade deeper inside posts, so every text in the card reads at 4.5:1 or better.
- **A garden note's "Mentioned in" chips keep their colours:** a broader link style painted them near-black in dark mode, under dark text.
- **The nearby map** is only as tall as its neighbours need, every label fits inside its box, and pointing at a box (or tabbing to it) grows it to the note's whole title. Related notes no longer look smudged: they shared a class name with the dotted line's style, so their labels were drawn with a dashed outline.
- The excerpt box in posts is 20% white.

## 2.1.2

- **The card grows into its post by being laid out live, not zoomed.** Its width, padding, spacing, font sizes, corners and colour move from the card's to the post's while the text re-wraps (a three-line title becomes two as the space opens up); the date line opens, the read-time line folds away, and the excerpt moves into its box. It lands as the post's own top, so nothing is swapped, and the story paints downward below. Closing is the exact reverse, landing in whatever state the card is really in, hovered or not.
- **The image's shape changes during the growth,** from the card's crop to its shape in the post, instead of extending after the post has landed.
- **No more image jump at the end.** The post first shows the card's own copy of the photo; the sharper post-sized one fades in over it when it arrives. On desktop, resting the pointer on a card fetches that sharper image ahead of time.
- **Desktop posts show more of the story when they open:** the feature image is at most about 40% of the screen's height (cropped to fill), the title is smaller (2.25rem at most), and the top of the post is tighter.
- **The page no longer shifts sideways** when a post opens or closes: the scrollbar's space is kept while scrolling is locked.

## 2.1.1

- **The card grows into its post with everything on it.** The card's image, code line, title and excerpt scale up together and land as the top of the post, on every screen size; then the story paints downward below. Closing is the exact reverse: the story wipes back up and the card, content and all, shrinks into its place. Where the post's own top doesn't line up exactly with the grown card (on wide screens, where the card grows about three times), a very short crossfade hands over at the landing.
- **Corners change smoothly:** the card's and its image's corners go from their own sizes to the post's (and back) in step with the growth, instead of swelling with the scale and jumping at the end.
- **The post's feature image keeps its tilt and hover again.** It stays level while the card grows, as it is on the card, then eases into its tilt once the post has landed; on closing it levels again first.

## 2.1.0

- **A card opens into its post.** Tapping a card grows it into the post and closing shrinks the post back into the card's place. On phones the whole card travels and lands as the top of the post, and the story appears below it; on wider screens the card's shape grows and the post settles in on it. Everything moves by transform alone. Reduced motion, garden notes and links inside a post open as before.
- **Posts are laid out in card order:** the feature image first (level, with the card's corners), then the code line, title and excerpt. On phones the top of a post has the card's proportions, including a card-sized title. An excerpt you wrote sits in a light box; the story starts after it.
- **Posts preload.** A post's text downloads as its card comes within a screen of view, and when a finger or pointer lands on a card, so opening doesn't wait. Skipped with Data Saver on or on very slow connections.
- **Images arrive gently:** a post's image that hasn't loaded keeps its place and fades in. When a card opens, the image starts in the card's crop and extends to the whole photo.
- **The reader opens solid.** The post no longer fades in (the cards behind showed through it for a moment); it slides up into place while the page behind dims.
- **Phones draw cards without colour-blending.** Some phones (Android Chrome, reported) leave blended card images blank. On phones and tablets the image, its colour wash and the paper grain are drawn plainly, tuned to look close. Desktop keeps the blending.
- **Stickies can be moved:** press and move with a mouse, or press and hold on a touchscreen, then drag. They stay on the board, and the arrangement is remembered in the reader's own browser, per post; everyone else still sees the original pile.
- **Stickies' controls in a post take the card's ink,** dark on a light card in either mode. A mistyped rule meant they never had.
- **Share on phones** opens the phone's share sheet straight away, as the plane takes off, without the short wait.
- **`docs/routes.yaml` leaves garden notes out of the homepage list,** so each page shows its full count of cards, with a second collection at `/notes/` keeping their addresses. Upload it in Labs: themes can't apply routes themselves. `docs/redirects.yaml` optionally sends `/notes/` to the Garden page.

## 2.0.6

- Lighter on phones. On Android Chrome, scrolling the homepage could make every card image vanish at once. It didn't reproduce in a test browser, so these cut what the page asks of a phone rather than fix a known fault:
  - Plots no longer restyle on every scroll frame on phones; they hold their angle and colour.
  - A plot's etching is a plain faint image instead of being colour-blended into the card, and phones load its 600px size rather than 1200px.
  - Post cards' scroll-linked colouring only touches a card when its value changes, so cards far off screen no longer restyle as you scroll.

## 2.0.5

- Plots list their pieces by the date they were published, newest first. Featured posts no longer jump the queue, and editing a post (adding a tag, say) no longer moves it.
- "Recently tended" under the plots becomes "Recently planted": the five newest pieces by publish date. Ghost counts any edit, even adding a tag, as an update, so the old list filled up with whatever was retagged last.
- The statement's closing full stop becomes three animated dots: they fill in one by one, hold, and fade, then start again. Without animation (or scripts) the full stop stays.

## 2.0.4

- Plots move again: pointing at one straightens and lifts it like every other card, and on phones plots follow the scroll the way the post cards do. Rows inside a plot nudge sideways when pointed at. An unplanted plot stays an outline.
- Etchings: a plot's tag image is drawn faintly behind the plot and darkens on hover. Line drawings on a transparent background work best.

## 2.0.3

- The Plots statement is drawn in two colours: everything after its first comma is green, so `Digital Christin, in progress.` shows the second half in the theme's green. With no comma it stays one colour.
- `page-map.hbs` and `partials/map.hbs` are removed for good; 2.0.2 meant to remove them.

## 2.0.2

- Removed `page-map.hbs` and `partials/map.hbs`, left over from 2.0.0 after the rename to Plots.

## 2.0.1

- The map homepage is now called Plots, so it isn't confused with the Garden's map. Its page moves from `/map/` to `/plots/`: if you made a page with the slug `map` on 2.0.0, change its slug to `plots`. Template files, partials and CSS classes are renamed to match (`page-plots.hbs`, `partials/plots.hbs`, `.plots-*`).

## 2.0.0

- **The map** (renamed Plots in 2.0.1), an optional homepage of plots. Publish a page at `/map/` and the homepage opens with it: the page's title as a badge, its excerpt as the statement, its text as the introduction (a bulleted list of links becomes a row of buttons), and its public tags, in order, as plots. Each plot is a large index card with the tag's name, description and five pieces, featured first, and a growth meter from how many pieces it holds; a tag with no posts shows as unplanted. Then the most recently tended pieces, a way into the Garden, and every post as before. Without the page, nothing changes.
- Tag pages become rooms of the map when it exists: a strip with the badge back to the map, the plot's meter, and every other plot.
- Growth stages on posts: the internal tags `#seedling`, `#growing` (or `#budding`) and `#evergreen` show the Garden's sprouts on cards and lists.
- The homepage and the post list now share one partial (`partials/feed.hbs`); `index.hbs` and the new `home.hbs` both use it. If you've customised `index.hbs`, move your changes to the partial.

## 1.10.3

- Rating a post: readers change their rating just by choosing again, with no button; a short "Thanks!" shows after each rating and fades; the count before 3 ratings reads "1 reader rating so far". The writing sticky no longer overlaps the rating box on wide screens.

## 1.10.2

- Ratings page: no rule between the title and the filters, and a card shows readers only once their average shows (3 or more ratings), not a count before that.

## 1.10.1

- Ratings page: cards show the post's feature image, like everywhere else, and the line in the card's foot is gone.

## 1.10.0

- Ratings. Give any post your rating out of 5, in halves, with an internal tag: `#rated-4-5` for 4.5, `#rated-4` for 4, from `#rated-0-5` to `#rated-5`. The post gets a red ink RATED stamp at the top, and a small one on its card. In the garden, `rating: 4.5` in a note does the same (garden-sync adds the tag).
- Readers can rate what you've rated, and only that: stars at the end of the post, amber so they never read as yours. One rating per visitor per post, changeable; visitors pass the stickies' spam check, signed-in members don't need to. The readers' average stays hidden until 3 people have rated. Needs the stamps Worker, a Turnstile site key, and `migrate-1.10.0.sql` run once in the D1 console.
- A Ratings page gathers everything you've rated: make a page with the address `/ratings/`. Filter by topic (a post's primary tag), sort by your rating, readers' or most recent. Ghost gives a theme at most 100 posts at once, so the page shows up to 100 rated posts.
- garden-sync: reads `rating:` from notes and `#rated-` tags from posts, so garden cards show the stamp too.

## 1.9.0

- Most connected comes in groups. The best-connected card is a hero (on a tie, the longer piece), and its links and related cards sit under it as a stack of pages, with a small tag saying how many. Each card appears in one group only. The first click on a stack spreads the group round the hero, joined by vines (solid and leafy for links you wrote, dotted for related by wording); a second click opens the hero. Fold back, or Escape, puts it away. On phones the group unfolds downward. Recently tended stays flat.
- A card's length is etched into its left edge instead of shown as stacked pages: one to four cuts, for under 300 words, under 1,000, under 2,500 and longer.
- Vines grow rather than run: every vine, on the Garden page and the map, bows and wanders with a tendril and leaves, random but the same on every visit. Related notes are joined by a dotted runner that wanders the same way.
- The map: pointing at a note grows it to its whole title, in front of its neighbours. Pointing at a line anywhere off the notes lights it up with the two notes it joins, and says why they're joined (a link you wrote, or related by wording and the topic they share). Click the map and scrolling zooms it until the pointer leaves; Ctrl + scroll works any time. Zoomed out, notes become dots, down to the whole garden as a node graph.
- The map on phones opens fitted, as the node graph, laid out for the tall screen. Pinch to zoom and drag to move; the first tap on a note shows its title and the second opens it; tapping a line lights it up.
- Fixed: the map's leaves were drawn as outlines; they're filled now.

## 1.8.1

- Garden cards stay pastel in dark mode, like every other Dungeon card, and posts stay light paper; the page stacks behind long notes read as paper.
- Every garden card shows its stage, links or not: a sprout on a seedling, a leafy sprig climbing a growing note's edge, a flowering sprig on an evergreen. Links still add vines round the edges.
- The Garden map sits on the page with no heading or background, and has its own zoom: + and - buttons, Fit, Ctrl + scroll or pinch to zoom, and drag to move around. Plain scrolling still scrolls the page. It fits every note on first load (on phones it starts at a readable size), vines are leafier, and fading happens only while pointing at a note.

## 1.8.0

- Post cards in the garden show a TL;DR: the post's custom excerpt if it has one, otherwise its strongest line, picked from your own sentences with no AI (weighted towards the post's distinctive words, its title, the closing part and the phrases an argument comes with; away from questions, quotes, the opening hook and product-name detail).
- garden-sync: works out each post's TL;DR. Update `sync.js` on the server and restart garden-sync.

## 1.7.0

- Posts in the garden: your published posts appear on the Garden page and map as paper cards, with an Everything, Notes and Posts filter redrawing every section. Links between posts and notes count in both directions, and a post's tags count as its topics.
- Each post's page shows "In the garden": the notes and posts that mention it, what it links to, and related ones. It comes along into the overlay, and its links open there.
- garden-sync: reads published posts (read only), lets notes link to posts by title with `[[Post title]]`, includes posts in "related by wording", and keeps footnotes out of excerpts and wording. Update `sync.js` on the server and restart garden-sync.

## 1.6.1

- garden-sync: "related by wording" is much stricter. Two notes are related only if they share a topic, have at least three distinctive words in common, and are both at least 25 words long; words used in over half the garden no longer count. New note property `not_related` rules out a pair in both directions. No theme changes; update `sync.js` on the server and restart garden-sync.

## 1.6.0

- Garden notes in the lab-notebook look: graph paper, a spec sheet (stage, confidence, links in and out, planted, tended, length), the Tended stamp on its own line, footnotes as sidenotes in the margin (under their paragraph on narrow screens), small marks after external links (YouTube, GitHub, Wikipedia, PDF), and previews of linked notes on hover.
- Under each note: a tending log, "Mentioned in", "Related" (by shared wording) and a small map of its neighbours. Links inside a note, the chips and the map open in the overlay.
- The Garden map, redesigned: notes as small labelled cards in their stage colours, spaced so they never overlap; links as vines, related notes dotted; pointing at a note lights up its neighbours.
- Keyboard shortcuts on garden pages: / searches the garden, r opens a random note, g goes to the garden, ? lists them.
- garden-sync: new note properties `confidence` and `planted`; footnotes; related notes by shared wording; a tending log kept from now on. Update `sync.js`, `package.json` and `package-lock.json` on the server, reinstall, and restart garden-sync.

## 1.5.1

- On the Scatter wall, "Read in the garden" and its vine are replaced by a small patch of grass in the bottom-right corner of garden cards, after everything else in the card. On hover, two or three flowers bloom in it, in colours that stand out from that card; clicking it opens the note in the garden overlay. It carries a label for screen readers, and no visible text.

## 1.5.0

- Garden cards are Overgrown: sized to their content and showing their text, with vines creeping round a card as it gains links, flowers on evergreens, and pages stacked behind long notes. Colours follow light and dark mode.
- Linked cards on the Garden page are joined by vines, growing behind the cards. They are faint at rest and bright for the card you point at; click one to see the two notes and the sentence the link was written in.
- Garden notes open in the reader overlay: from cards, lists, the map, the random note and "Mentioned in". Following links inside the overlay no longer leaves the address pointing at the wrong page when it closes.
- "Read in the garden" on the Scatter wall has a small vine that grows along the card and flowers on hover, without moving the words.
- garden-sync: YouTube and Vimeo links on their own line become embedded players, and the Scatter import keeps videos. Update `sync.js` on the server and restart garden-sync.

## 1.4.0

- The Garden: a digital garden written in Obsidian and published by the new `extras/garden-sync` container. The Garden page shows stage counts, a random note, recently tended and most connected notes, a map of the links, notes by topic, and every note, sortable.
- Garden notes show their stage (seedling, growing, evergreen) as hand-drawn marks, a red Tended stamp, and "Mentioned in" backlinks; sources are drawn as library cards. They stay out of the homepage feed and Older/Newer.
- The Scatter wall also shows garden notes marked `scatter: true`, each linking back to the full note. `garden-sync import-scatter` moves existing Scatter notes into the garden, keeping their addresses, kinds and colours.

## 1.3.9

- Closing a sticky is smoother, especially on phones and when closing several quickly: no more copies created mid-motion (a likely cause of white flashes on Android), the pile's edges only clip again once every sticky has settled, and a closing sticky stays on top until it slides under.
- Fixed: stickies sent to the back lost their shadow for good.
- Members' stickies have a hand-drawn frame; the author's, a double one.
- Removed the "Tap a sticky to read it" hint.

## 1.3.8

- Member stickies: signed-in Ghost members pin straight away, with no spam check or approval, under their Ghost account name, marked as a member's. They can take their stickies back any time, from any device. You still get a notification, with a Delete button.
- The author's stickies carry a small Author stamp and send no notification. Set the Worker's `AUTHOR_EMAIL` to the email you sign in with.
- Visitors see "Sign in to skip the wait" on the blank sticky, when the site has members switched on.
- Stickies Worker: run `extras/stamps-worker/migrate-1.3.8.sql` once, then deploy the latest `worker.js`. Member sign-in is checked with Ghost's own signed pass; anything unexpected falls back to the normal route.

## 1.3.7

- Tap a sticky to read it: it lifts, half again as large, to the middle of the stickies. Tap it again, tap elsewhere or press Escape to put it back at the bottom of the pile; tapping another sticky swaps them.
- Bold stickies: about one in four blank stickies is one of the theme's bold colours, with light writing on the dark ones. Needs the latest Worker.
- Stickies avoid the colour closest to the post's own, on the blank sticky and when showing existing ones.
- Stickies Worker: a /whoami check for Ghost member sign-in, the groundwork for member stickies.

## 1.3.6

- Older and Newer, below every post, are now horizontal cards like the homepage ones: image on the left (or an etched pattern if the post has none), title and excerpt on the right. They stack on phones.
- Doodles look hand-drawn: wobbly strokes, the odd overshoot or doubled line, and two or three per sticky, a main doodle with scribbles around it (squiggles, arrows, dots, hatching). One pen per sticky, mostly pencil, sometimes blue or red biro.
- The crumple folds the sticky in pieces, each at its own angle and light, around deeper-coloured crevices.
- Pinning an empty sticky writes "Write something first." on the sticky, instead of the browser's pop-up.
- The list and pile switch sits at the top left, on its own line, with new icons.
- In list view, stickies no longer sit under the blank sticky.
- Tape is plain white again.

## 1.3.5

- The crumple looks like paper: the sticky crushes into an uneven, lumpy ball, different every time, with creases, light and shade appearing as it crumples, and a shadow that follows its shape.
- Escape throws the blank sticky when it's in view. In the reader overlay, Escape throws it if something's written on it, and otherwise closes the overlay.
- "Pin it" is now a push pin, in a deeper version of the sticky's colour.
- Tape in random colours, plain and patterned, each sticky keeping its own.
- Sending a sticky to the back is one smooth motion: it pulls out, sinks beneath its neighbours with a short fade instead of blinking under them, and the neighbours nudge aside and settle.
- Hovering over a sticky gives it a small wobble.
- Stickies' random choices (tape, doodles, fraying, layout) are better mixed, so neighbouring stickies rarely repeat each other.

## 1.3.4

- Doodles: a sticky with empty paper gets a small line drawing there, matched to the post's tags where possible (music, homelab, design, F1, books, health, product) and a random one otherwise. Each sticky keeps the same doodle, and doodles never touch the writing or the name.
- In the reader overlay, the stickies now sit inside the story's card, so the story and its stickies are one piece.

## 1.3.3

- Stickies in the reader overlay: when a post opens over the homepage, its stickies come with it, working as on the post page, on a plain sheet in the page's colour. A thrown sticky flies inside the overlay.
- In the overlay, Escape clears the blank sticky if you've written on it; pressed again, it closes the overlay as usual.
- Fixed: clicking into the stickies no longer closes the overlay.

## 1.3.2

- The blank sticky is always there, stuck at an angle on the post card's bottom-right corner (just below the card on phones), ready to write on. No button to open it.
- Each blank sticky is a random colour, and the pinned sticky keeps that colour. The Worker stores it: run `extras/stamps-worker/migrate-1.3.2.sql` once, then deploy the latest `worker.js`.
- No Cancel button: the x crumples the sticky into a ball and throws it off the page in a random direction, and a fresh one takes its place. Escape clears what you've typed.
- Stickies start right below the post and flow around the blank sticky. No title or count; a list icon at the top right switches between the pile and the list.
- A sticky sent to the back moves out into a margin around the pile, where it stays visible, and never over the rest of the page.
- Cloudflare's spam check loads only when someone starts writing, not on every visit.

## 1.3.1

- Stickies sit directly on the page, with no board behind them. The area grows with the stickies, in loose rows, up to its full height; only then do they pile up (and the "send it to the back" hint appears).
- Stickies have softer, rounded corners and slightly frayed edges, different on each one and the same on every visit.
- Stickies hold 200 characters cleanly: longer stickies are written smaller, down to a readable size, and the name and x have their own row, so the text never runs over them. A sticky that still doesn't fit grows taller instead.
- The "waiting to be pinned" label has its own line.
- Tapping the stamp after you've stamped shows "You left your mark already" by the icon, and the list of names still opens.
- Stickies Worker: fixed a problem that stopped browsers sending stickies (the preflight check). Deploy the latest `extras/stamps-worker/worker.js`.

## 1.3.0

- Stickies: readers leave short handwritten notes under posts, on a board where they pile up, newest on top. Tapping one sends it to the back; **Read as a list** shows them all. New stickies wait for approval; their writer sees theirs straight away, marked as waiting, and can take it back during the same visit. Stickies replace Ghost's comments when switched on.
- Moderation from your phone: each new sticky arrives in Telegram and/or ntfy with Approve and Delete buttons, using signed, expiring links. Cloudflare Turnstile keeps bots out.
- New setting: **Stickies site key**. The stamps Worker gains stickies; existing setups need `extras/stamps-worker/migrate-1.3.0.sql` run once, then the new Worker code and secrets (see its README).
- The Caveat handwriting font is included, under the SIL Open Font License.

## 1.2.4

- Share: the paper plane and the menu icons are redrawn with smooth curves and rounded ends, instead of sharp points.
- Share: on hover the plane idles, shuddering like an engine revving. On click, the button's circle shatters and the plane takes off with flight lines behind it, climbing past the rising menu in its own lane and fading just above it, while the button re-forms and a new arrow draws itself in.
- Share: the menu opens beside the plane's flight path, and each option's icon takes on its colour and wobbles on hover.

## 1.2.3

- The internal tag `#hide-image` keeps a post's feature image off the post itself, while it still shows on the card and in social previews.
- Stamps: the name line sits closer under the date, and its field is exactly as wide as the name, so the blinking cursor sits right where typing starts.
- Stamps: a reader can remove their own name during the same browser visit, with a small x beside it in the stamp and in the list. The Worker refuses removals more than a day after signing. Existing stamps databases need one update: run `extras/stamps-worker/migrate-1.2.3.sql` in the D1 console.
- The stamp and Share buttons are slightly tilted, and straighten on hover. The list of names opens tilted, with a wobble.
- Share: hovering turns the arrow into a paper plane, and clicking launches it as the menu rises. The menu has icons, "X" is "Twitter" again, and "Copy link" is "Copy Link".

## 1.2.2

- The stamp icon is centred by its ink, not its outline, so it looks centred in its button.
- Hovering over the stamp makes it rock back and forth, like picking up a rubber stamp.
- Just after stamping, typing goes straight into the stamp's name line, with no click needed (on computers with a keyboard). Shortcuts are left alone.

## 1.2.0

- Stamps replace the heart: "I was here", on posts and Now cards. One button with the count; stamping leaves a red SEEN impression with the date and a name line to sign, and tapping again lists the latest names. Counted by a small Cloudflare Worker with a D1 database that you run yourself (`extras/stamps-worker`), set in the new **Stamps endpoint** setting.
- The **Likes endpoint** setting and the likes Worker are gone; they were never needed.

## 1.1.0

- Share at the end of every post, as a round icon button: the phone's share sheet on phones, a menu with Copy link, X, LinkedIn, WhatsApp and Email on desktop.
- A heart for posts, counted by a small Cloudflare Worker you run yourself (in `extras/likes-worker`). A like is final, and each reader's like is remembered in their browser. Hidden until the new **Likes endpoint** setting is filled in.

## 1.0.9

- The floating menu makes an entrance: on the first page of a visit it shows just Everything, gives a shake, then grows to its fitted width as the other items slide in. Later pages, and visitors who prefer reduced motion, get the finished menu straight away.
- Fixed: the menu's wobble when it hides and returns on scroll had stopped working in 1.0.8.

## 1.0.8

- On phones, the floating menu no longer visibly changes width while the page loads: it appears once it has been fitted to the screen with the real fonts.
- Demo build: the link check no longer mistakes example markup in stylesheet comments for links.

## 1.0.7

- Dark mode: the floating menu and the Everything panel no longer cast a smudgy shadow; they get a faint highlight along the top edge instead.

## 1.0.6

- A people row for thank-you sections: round faces (photos or initials) that show a name and a line on hover, focus or tap.

## 1.0.5

- Tables are more compact: tighter rows, a narrower label column, and labels aligned with their descriptions.

## 1.0.4

- Fixed: the Older and Newer links at the bottom of a post could point at a Now month or a Scatter note, which have no page of their own. They now skip those.
- A live demo site, rebuilt automatically after every release.

## 1.0.3

- Dark mode gets the same colour treatment as light mode: brighter pastel cards, a stronger hover step, and photos in colour.
- Releases now attach the theme as `dungeon.zip`, so updates install over the existing theme and keep its settings.

## 1.0.2

First public release.

- Index-card homepage: pastel cards at stable tilts, filing codes, hover straightening, reader overlay.
- Floating menu with an optional Everything panel that adapts to narrow screens.
- Now page: monthly cards that fill the screen height, arrive staggered, and hint at more months with a small wobble. Empty space can hold an etched pattern (floral, circuit board, cityscape or topographic), per site or per month, and each month can take a colour tag.
- Scatter wall: short notes (thoughts, reading, code, finds, quotes, lyrics with a play button) that drop in one by one as they scroll into view.
- Lightsaber colour-mode switch in the footer: 2-second reveal with crackling static, optional synthesised sound, customisable messages.
- Footer: tag index (chips with "show more" on phones), optional note, second line and design credit.
- Tables in posts and pages styled as clean rows; a Colophon page (URL `colophon`) gets small uppercase section labels.
- Light mode with bright pastel cards and photos in colour; dark mode; or automatic. Reduced-motion support throughout.
- Interface text translatable through `locales/`.
