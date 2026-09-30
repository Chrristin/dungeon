# Changelog

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
