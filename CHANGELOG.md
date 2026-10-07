# Changelog

## 2.20.0

Homepage plots and the garden map.

- **Each plot has its own quiet look.** Thin lines drift down The Workshop like scrolling code, with a blinking cursor after its title. The Road has a line-drawn mountain with a car climbing its road and a few birds. The Music has notes that appear, drift down and fade. The Library is dot-matrix paper (dot grid, tractor holes down the edges) with a small candle beside an open book that turns a page now and then. The Collection is a dotted parts sheet with a small pile of bottle caps and Lego bricks and a brick dropping onto it every few seconds. The Pit Wall has sector colours along its top and a chequered corner. Each has a small mono mark after its title. The moving drawings are on one small canvas per card, redrawn about eleven times a second and only while the card is on screen, so they cost little; with reduced motion they hold still. On a phone the Library and Collection corner pictures are left out for lack of room.
- **No lines between the posts in a plot.**
- **The garden map has no instructions.** The big "point at a dot" box and the sentence under the map are gone; the card appears only when you point at (or tap) a dot, in the half of the map away from that dot so it never covers it. Tapping the empty map puts it away. When a link has a picture, leaves and flowers grow over the picture as the card opens.
- **The card's picture is the 600-pixel version, not the original.** It asked for a size the theme does not define (300), so Ghost sent the full-size file each time.

## 2.19.0

Garden links, and two small fixes.

- **A post's garden links are now a small map.** Under "In the garden" the post sits in the middle and each link grows out of it on a stem as a dot, coloured by how far that note has grown (seedling, growing, evergreen; posts are squares). Solid stems with leaves are links; dotted ones are related by wording. Point at a dot, or tap it once on a phone, and a card appears in its own place under the map with the title, a line of the note and, when it has one, a small picture. The card (or a second tap) opens it. The old list is still there under "As a list", and every dot has a text label for screen readers.
- **Pictures on those cards need the garden-sync update.** `extras/garden-sync/sync.js` now records each post's feature image (or first picture) and each note's first picture. Replace `app/sync.js` on the NAS and restart the container; until its next pass the cards show no picture.
- **"Price, last 1 month"** instead of "1 months" on an item's price graph.
- **No underline on "Open page"** on an item's sheet; it shows one only when pointed at.

## 2.18.0

Homepage only.

- **The Collection puts the Library last.** Diecast Cars and Lego now share the top row and the Library box sits full width below them, whatever order the pages were published in.
- **The Library box on a phone has a bigger picture, placed lower.** It no longer floats high above the box with empty space under it; it sits level with the shelf and book count (a little smaller on the narrowest phones).
- **The headline is two lines on wide screens:** "Digital Christin," then "In Progress." Phones and tablets wrap as before.
- **The doodles behind the plot cards stay out of the writing.** They now show in the lower-right corner and fade out before the text, so they no longer run through the letters. The per-plot "nerdy" look is still to do.

## 2.17.0

Library only.

- **Choosing a bookcase no longer freezes the page.** Every book put on the shelf made the browser re-measure the whole page, a leftover from the old fly-in. A cold click used to hold the page for one to two seconds (2.1 s on Shelf 3); it now takes about a quarter of a second, most of that the sparkles being seen. The drawing itself takes under a tenth of a second, so the pre-drawing on hover is gone.
- **The picture becomes the bookcase.** Sparkles start the moment you click and keep drifting up round the picture while the bookcase loads; the ones already in the air finish over it. When it is ready, the live bookcase is drawn exactly the picture's size and place, and the two grow together to the open size, the picture fading into the live one. At every moment they are the same size, and neither is ever bigger than the picture or the open bookcase. It takes about half a second. The little ring and the dissolve are gone; with reduced motion there is only a fade.
- **No box round a bookcase after Escape.** Going back put the keyboard focus ring on the picture you had opened. Focus now returns to the page area; tabbing to a picture still shows the ring.
- **An opened bookcase is as wide as its picture,** so the picture and the live bookcase match. (Shelf 1 was about 2% narrower than its picture.)
- **The lettering font is fetched ahead of time,** so the first bookcase you open is not drawn twice.
- **The pictures keep their whole margin** at the top (they lost a strip of it), and each records its margin so the live bookcase can start exactly where the artwork is. Run `npm run shelves` to make them again.

## 2.16.2

Garden only.

- **Watchlist items stay out of the Garden unless you tag them `#garden`.** The Garden page was filling with a card for every Lego set and diecast car (103 of its 210 entries). Posts tagged `#watch-item`, and things (`#thing`), are now left out of it unless you also add `#garden` by hand; ordinary posts, Scatter notes and Now entries are as before. This needs the updated garden-sync (`extras/garden-sync`) running: rebuild its container, and the cards go on the next pass.
- **An item you do add links to its real address.** The sync now records each post's own address, and the Garden page uses it, so a Lego set in the garden opens at `/lego/42223-…/` and not at a page that does not exist. Notes and ordinary posts are unchanged.

## 2.16.1

Library only.

- **A bookcase pointed at straight after coming back is still drawn ahead.** Backing out of a bookcase or the list and resting the pointer on a picture could skip the early draw, so the opening took its full time. It now draws as soon as it is allowed.

## 2.16.0

Library, and the Library box on the homepage.

- **All books.** A plain list of every book at `/collection/library/#books`: a colour swatch, title, author, genre and topics, and where it stands ("Shelf 2, row 3"). One search box matches title, author, genre and topic as you type; genre and topic chips narrow it; it sorts by shelf order, title or author. Choosing a book opens its bookcase with the book selected. It is drawn a screenful at a time, so 535 rows stay quick. Under the three bookcases a line says "Or see all 535 books as a list".
- **Books on this shelf.** Every open bookcase has a button that opens the same list for just that bookcase (`#books-2`). Back returns to the bookcase, or to the list when you came from it.
- **Opening a bookcase is a small piece of magic.** Gold sparkles burst from the picture, it fades, and the live bookcase blooms outward from its middle. The "Opening" words are gone: a small ring turns on the picture only if the bookcase is slow to come. With reduced motion on there are no sparkles, only a fade.
- **The Library box picture stands alone.** Larger, with no frame.
- **Fixed.** Sorting by author put "David and Stella Gemmell" under D.

## 2.15.0

- **A bookcase is ready before you choose it.** Pointing at a picture on the Library page (or touching it) draws that one bookcase out of sight. When you choose it the picture gives a small shake and the live bookcase fades in, in about a third of a second, however slow the drawing is. The plain "Opening" label only appears if it takes longer than a second and a half.
- **The Collection and Watchlists boxes read left to right.** Title and figures on the left, the picture on the right still overlapping the top edge, with its "Must Buy" label under it. The line of figures sits right under the title and takes no extra row: "23 cars · updated 6 Oct".
- **The Library box counts bookcases.** It said "17 shelves", which was every row of every bookcase. It now says "3 shelves · 535 books", and the "shelves" label under the picture is gone. A long title wraps on a narrow screen instead of being cut.
- **Quicker releases.** The release no longer redraws the Library pictures; it only checks they are up to date, which is what it was already guaranteeing.

## 2.14.0

Library only.

- **The Library opens at once.** The page used to draw all 535 books to show three small bookcases, which took several seconds and froze the page while it did. It now opens on a picture of each bookcase, already in the page, with nothing to fetch or draw. Choosing a bookcase draws just that one, as before. Going back to the shelves is instant.
- **The pictures are made, not drawn by hand.** `npm run shelves` (in `extras/shelves`) opens the real Library code, photographs each bookcase in light and dark wood, and writes the pictures and `partials/library-shelves.hbs`. Run it whenever `library.json`, `library.js` or `library.css` change; the release stops with a plain message if the pictures are out of date.
- **Fewer words on the page.** The how-to line is gone. "All shelves" now sits with Sort, Pattern and Topic, under the bookcase; Escape still goes back.

## 2.13.6

Library only.

- **Books stay put.** Books no longer fly in from the corner of the case when a shelf opens, or glide when you change the sort or pattern. They are simply there. That includes Shelf 3 when you press "How it really is". A curio still settles into place after you drop it, and only then.
- **The page title sits under the shelves,** not above them, and the line "Pick a shelf to open it" is gone.
- **Calmer fairy lights.** Fewer bulbs along the string, two loops in a coil instead of five, smaller and softer glows, and a slower, dimmer pulse.

## 2.13.5

- **Housekeeping.** The Worker in `extras/stamps-worker` serves stamps, stickies and ratings only. Watchlist pages read any JSON list, as before. If a Worker you already run also serves a watchlist, leave that one in place.
- `docs/watchlist.md` now says which two extras of a watchlist (the price line, the request box) need a server of your own.

## 2.13.4

- **A plot that holds a watchlist or the Library takes its colour.** A plot with no stories was always drawn "unplanted": a dashed outline with no fill, whatever colour its tag had. One that holds pages is now a planted plot, with its card and its tag's colour (Ghost: Tags, the tag, Color). Its status says how many pages it holds ("2 pages") in place of "preparing ground", and its meter shows them. A plot with neither stories nor pages is unchanged.

## 2.13.3

- **A watchlist page's own data link is recognised when Ghost tags it.** With "outbound link tagging" on, Ghost adds `?ref=yoursite` to links that leave the site, and the theme was only accepting addresses that end in `.json` exactly. A second watchlist's page therefore ignored its link and showed the first list. The link is now judged on its address alone, on the page and in its box on the homepage.

## 2.13.2

Watchlist only; the Library is untouched.

- **A price line.** An item's sheet and its own page draw its price over the last year as a stepped line, with the lowest marked, and MRP and the Must Buy price as faint rules. It shows for a list whose server supplies a price history for its items; for any other list it is left out.
- **Must Buy has a tolerance.** A price within 2% of the Must Buy price counts (`mustGrace` in a shelf's rules), so ₹9,999 against ₹9,959 is a Must Buy and no longer sits beside a green "40% off" as a Fair Price.
- **"Collecting Data" is for the first 30 days,** down from 200. After that an item is judged like any other; one that has never been discounted says "No discount yet in 184 days tracked."
- **No more "₹NaN".** The sentence under a verdict no longer assumes a lowest price exists.
- **"Lowest since 4 Oct"** in place of a dash, for an item with no lowest on record yet: the lowest seen so far, and from when.
- **Your words on every card:** the one-liner, or failing that the start of the note, two lines at most. Before, only the featured rows showed the one-liner.
- **The homepage box reads live prices.** It uses the page's own `.json` link, then the site's source, and only then the shelf the theme ships, so it agrees with the watchlist.
- **Sale alerts on a watchlist.** A sign-up box above the requests: an email address (Ghost's own members sign-up, labelled "<page title> alerts"), and a link to your Telegram channel when the site names one with `<meta name="watchlist-telegram" content="https://t.me/…">` in code injection.
- **A second watchlist.** `docs/routes.yaml` has a block for a list named `diecast` (item pages at `/diecast/…`); the request box no longer says "Lego"; sale months are matched by month, so "Jul" lights "July". See "More than one watchlist" in `docs/watchlist.md`.

## 2.13.1

- **The Library's landing is the real drawing again.** The small bookcases are drawn by the same code as an open one, with every spine's own decoration, bands, shading and lettering, in place of the plain coloured blocks of 2.13.0. They are still only for choosing: nothing inside responds, the lights are lit but still, and the landing cannot be zoomed.
- **Sizes.** The row of bookcases fits the text column, a little wider if it must. An open bookcase is half the column wide, the size the two cases were side by side before there was a third; zoom takes it up to the full page.

## 2.13.0

- **The Library opens on small shelves, and you open one.** The landing shows every bookcase small and simplified, each book a plain block in its colour, with nothing to click inside: it is for choosing. Picking a bookcase builds that one alone at full size, with its lettering, decoration, curios and lights, and everything that can be done with it. "All shelves", Escape, or a click outside the bookcase takes you back. Only one bookcase is ever drawn in full, which is what makes the page quick.
- **Zoom belongs to the open bookcase.** The landing cannot be zoomed. Escape resets the zoom first and closes the bookcase second.
- **Sorts, patterns, topics and hand arrangements work on the open bookcase.** Each bookcase keeps its own hand arrangement and its own link; older ones are ignored.
- **"How it really is" shows only on a bookcase with books behind books** (Shelf 3). It opens spread out; the button tucks the hidden layers back.
- **Curios step aside when Shelf 3 is spread out:** each moves into the empty stretch of its own row if there is room, and goes back in front of the books when the shelf is tucked. One you have dragged stays where you put it.
- **Fairy lights:** the wire is off-white, and the lead down to a coil drops straight down the corner of the shelf and runs along the board, carrying bulbs of its own.

## 2.12.2

- **The Library's shelves really do use the full page width now.** The page's main column was clipping them to its own width, which cut the outer bookcases off at the column's edges.

## 2.12.1

- **The Library is quick again.** 2.12.0 drew every bookcase as a 3D object, and with zoom laid out at full size that was far too much for a browser: the page crawled or failed to load. The 3D is removed. The wood grain is drawn with plain stripes instead of generated noise, the lights hold still while zoomed in, and zoom stops at six times.
- **Rows are the only view.** The bookcases stand side by side, or one under another on a phone, and respond directly. The ring and the open-and-close step are gone.
- **The bookcases are named Shelf 1, Shelf 2 and Shelf 3,** shown under each one; a book's card gives its shelf and row. Rename them in the `cases` list in the data file.
- The one button above the shelves is readable in dark mode.

## 2.12.0

- **The Library's ring is for choosing; a click opens a bookcase.** On a wide screen the bookcases stand on the ring at a smaller size. Clicking one opens it at full size, facing you, and the others fade out; clicking outside it, or Escape, puts it back. Books, curios, sorting and the rest work in the open case. The neighbours now swing away behind the front case, as designed; in 2.11.0 they folded in around it.
- **On a phone there is no ring.** The bookcases stand one under another at full width and respond directly.
- **Bookcases have real depth.** Each is built as a box: side panels and a board at every level run back from the front edge to the back panel, the books stand part-way back and the curios in front of them. In the ring and the open case you look down onto the lower shelves and up under the higher ones, and the view changes properly as a case turns. The painted board strip and the dimming of neighbours are gone.
- **Zoom is sharp and unconfined.** Zooming lays the case out again at the new size, so lettering stays crisp, and nothing crops it: a zoomed case grows across and down the page. A small floating button, or Escape, resets it. The shelves use the full width of the page.
- **Every book in the brown bookcase.** The 111 books behind its front piles are now on the shelves, each layer beside the last, which makes the case about half as wide again as the others. "How it really is" tucks the hidden layers back behind the front ones and narrows the case to its real proportions; "Show every book" spreads them out again. A phone starts in the real, narrow form.
- Bookcases can each have their own width. In `assets/data/library.json` a case with `"layers": true` has books marked `ly` 1 or 2 for the middle and back layers.

## 2.11.0

- **The Library's bookcases stand on a ring.** One case faces you; its neighbours stand turned away and set back on each side, and the ring is circular. Turn it with the arrow buttons, the arrow keys, the bookcase names above the shelves, or by clicking a neighbour. Only the case in front can be touched.
- **Or in rows.** "Show in rows" stands every bookcase side by side; clicking one brings it to the front of the ring.
- **A third bookcase, the brown one:** dark wood, straight boards, five shelves, with the front layer of its books drawn as the flat piles they really stand in, the comics shelf, and its curios (the DVD box set, the game boxes, a coconut-shell Ganesha, two wooden parrots, a brass bell, a cat plush, a trophy and a toy car). The books behind the front layer are logged but not yet shown.
- **Bookcases are data.** `assets/data/library.json` has a `cases` list: each case has a name and a shelf count, and can be dark and straight. Adding a bookcase no longer needs a change to the script. Books and curios can be moved within their own bookcase only.
- Saved hand arrangements and arrangement links from before this version no longer match the shelves and are ignored.

## 2.10.6

- **The Library's curios are shaded as real objects.** The outline bevel from 2.10.5 is gone. Each part of each curio is shaded as the solid it is, lit from the upper left, by its material: plush is soft and dull, glazed, glass and plastic things carry a sharp highlight, wood and stone sit between, and paper and frames stay nearly flat.
- **Shelves have depth.** Books stand at the back of each board, the board's top shows in front of them, and curios stand on it, in front of the books and short of the front edge. Their shadows fall on the board and no longer on the edge below.
- **Soft, varied shadows.** Each curio's shadow is a smudge with no outline, sized by the object's footprint and height and fainter for plush and paper.
- **Redrawn:** the LOVE letters as rounded tubes with their cats, an angular boomerang, the teddy with legs, arms and paws that join his body, the tiger with arms, and astronauts with proper arms, gloves and boots. The reading astronaut's moon is smaller and sits on the shelf. The lettering on the Goa and Los Angeles plates sits inside them.

## 2.10.5

- **The Library's lights hang higher and glow more.** The string now runs just under the board above each shelf, filling the empty band over the shorter books. The glow runs from nearly dark to full on a quicker cycle, and keeps a gentle fade for visitors who ask for reduced motion.
- **The top boards sit on their cases.** They were tilted enough to look knocked off; now they are almost level and seated on the posts. The shadow under a top board stays inside the case and no longer falls onto the page beside it.
- **Menus in the theme's style.** Sort and Pattern open a rounded panel in the page's own colours; on a phone they keep the phone's picker behind the same pill. Topic opens a panel of chips grouped under Fiction, Non-fiction, Comics and Series, each with its count.
- **Hide and reset the curios with two icon buttons,** an eye and a circular arrow, in place of the worded ones.
- **Curios have some body.** Each has a soft highlight and shaded edge following its outline, a shadow where it stands and a longer one onto the books behind, to match the books.
- **Redrawn:** the boomerang (thicker, with its artwork kept inside the outline), the teddy bear, the Perplexus Epic (a clear sphere of coloured tracks) and the bottle in its woven cover. The lettering on the plates, signpost and calendar can no longer spill outside them.
- The message under the shelves runs on one line when there is room.

## 2.10.4

- **Fairy lights inside the Library's shelves.** A string of small warm bulbs hangs along the back of every shelf, behind the books, brightening and dimming slowly in overlapping groups. Where a shelf has an empty stretch, a coil of the string lies there; it is worked out again after every sort. The lights across the top of the cases are gone, and so are the "Left case" and "Right case" labels.
- **Older wood, deeper shadows.** The boards have grain, knots, uneven tone, a worn edge and the odd scratch. Each case casts a shadow on the page, and the shadow under each shelf board is deeper and longer, most of all in light mode.
- **Curios redrawn from the photos,** with their real colours and details: the boomerang's dot painting and kangaroos, the fan's watercolour circles and bamboo ribs, the wooden duck, the three owls, the plush dog, the archer doll, the bottles, the hippo, the Goa plate and the cushions.
- **Topics.** Every book carries topic tags, and a Topic menu lights up one topic and fades the rest, on top of any sort, pattern or hand arrangement. A book's card lists its topics.
- **On a phone: tap and hold to move.** A quick tap opens the card, a swipe scrolls the page, and holding a curio or a book for a moment picks it up, slightly enlarged, to drag. Nothing on the shelves can be text-selected any more, so a long press no longer opens the copy menu or moves things by accident.

## 2.10.3

- **Curios on the Library's shelves.** Fifty things from the real shelves are drawn where they stand: the boomerang, the paper fan, the wooden duck, the owls with their instruments, the astronauts, the plates, the photo frames, the archer doll, the bottles and the rest. The stuffed toys, cushions, basket and maze ball sit on top of the cases, in place of the made-up things that were there.
- **Movable and hideable.** A visitor can drag any curio to any shelf or onto the top of a case; it stays where they put it, in their browser. "Hide curios" clears them all off the spines, and "Put curios back" returns them to your arrangement.
- **A curio's card.** Clicking one shows its name, its details and where it stands. Names, details and places are in `assets/data/library.json`; see `docs/library.md`.

## 2.10.2

- **Boxes in a plot lose their arrows,** and a box's title stays on one line. It shrinks a little in a narrow box, and a very long title is cut with an ellipsis.

## 2.10.1

- **Boxes in a plot: picture on top, two to a row.** A watchlist's box now has its Must Buy picture on top, rising out of the box, then "Must Buy", the title and the line. Two boxes in one plot sit side by side at half width, and stack on a phone. The watchlist's box is tinged yellow in place of red.
- **The Library gets a box of its own.** Give the Library page a plot's tag and it shows there as a wood-coloured box: a small shelf of its books rising out of the top, with how many shelves and books. Set a feature image on the page to use that picture instead.
- **Library page:** the heading and the line under it are centred, and the hint stays on one line on a wide screen. It says "Pinch to zoom" on a touch screen and "Hold Ctrl and scroll to zoom" elsewhere.
- **Arranging by hand on a touch screen:** press and hold a book to pick it up, so a swipe still scrolls the page.

## 2.10.0

- **The Library.** A new page template that draws your bookshelves: 313 books across two crooked wooden bookcases, each spine in its own colours and size with its own decoration, standing where it stands in real life. Books lying on top of a row rest on the books beneath them, and string lights hang above the cases.
- **Sorts and patterns.** Visitors can re-sort every book (colour, size, thickness, genre, author, title) or try a pattern (skyline, pyramid, valley, staircase, piano, zebra, rings, colour blocks, twelve rainbows, shuffle). The shelves keep their real number and width throughout.
- **Arrange by hand, and send it.** A visitor can drag any book to any shelf. The arrangement has its own link, and with an email link in the page's text a "Send this arrangement to me" button opens their mail app with that link.
- **A book's card.** Selecting a book shows a drawn cover, its author, genre and real shelf. The page then asks Open Library for the real cover and shows it when one is found; `"covers": "none"` in the data file turns that off.
- Set-up: make a page with the address `library`, choose Template: Library, and upload `docs/routes.yaml` again so it is shown at `/collection/library/`. The books are in `assets/data/library.json`; see `docs/library.md`.

## 2.9.8

- **An item's sheet fits the window.** Its picture, type and spacing follow the window's height, so a laptop shows the whole sheet without scrolling. Where it still cannot fit (a phone on its side, a long note) it scrolls without showing a scrollbar.
- **An item's page is a story page.** The white boxes are gone: the notes, the prices and the rest sit straight on the page's colour with a fine rule between them, as a story's text does. A catalogue picture is blended into the page's colour instead of sitting on a white tile; your own photo fills its tile.
- **Stamps, sharing and stickies on item pages,** the same as on a story. They are keyed by the page's address, so each set keeps its own.

## 2.9.7

- **Request a set.** Under the listing, a visitor can paste an Amazon link, an ASIN or a set number. It goes to the Worker and waits for your approval; a repeat is a vote for the earlier request, and what has been asked for is shown with its votes. Shown only when the watchlist's data comes from the Worker (the Stamps endpoint in Design settings).
- **Featured cards fit their row.** Each sizes its picture and text to its own width, so a card in a row of two has a much bigger picture than one in a row of three. A card can also carry one line of your own under its name.
- **An item's page is as wide as a story page,** on phones and on a desktop.
- An item with no price read yet shows as Collecting Data.

## 2.9.6

- **Must Buy and My Picks use the theme's six bold colours** (red, tangerine, sunflower, cobalt, emerald, ink), a different one for each card in a row. Text is white on the four dark ones, the dark chips and the green discount pill flip to white there, and ink carries a fine light edge so it stands off a dark page.
- **An item's sheet opens in its card's colour,** in every featured row. A Must Buy's or a pick's own page takes a bold colour too. The white panels inside keep dark text on every colour.

## 2.9.5

- **A tagline for any row on the watchlist, written in Ghost.** Add a line to the watchlist page's text that starts with the row's name and a colon, such as `Must Buy: May the 4th is in October now!`. The theme lifts it out of the text and shows it beside that row's heading, in handwriting. It works for Must Buy, My Picks, Lowest Right Now, Most Pieces for the Money and Just Missed, and goes when the row does.
- **A Skip item can still be bought from its sheet and page.** It now shows its prices and the "Buy on Amazon" button like any other item, with a short reason where the Must Buy line would be: "Above MRP", "Reseller price" or "No offer right now". A set with no offer gets "View on Amazon".

## 2.9.4

- **A "Must Buy" row leads the watchlist.** Every Must Buy is shown there, deepest discount first. Before, a Must Buy only reached the top rows if it was also at its lowest recorded price. A set shown in "Must Buy" is not repeated in "Lowest Right Now".

## 2.9.3

- **Five sets added to the Lego watchlist,** making 52: the AT-ST Walker (75417), C-3PO (75398), Paris: City of Love (21064), the Medium Creative Brick Box (10696) and London (21034). Their pages are created by importing `dungeon-lego-pages-import-5-new.json` once.

## 2.9.2

- **All 47 Lego prices re-read from Amazon on 5 October 2026,** with each listing's M.R.P. line and seller.
- **"Just Missed".** A row on the watchlist for deals that have ended: a real discount that was the lowest on record within the last week and is gone. Each card says what the price was and when. Today it holds the Lewis Hamilton helmet (₹6,034 on 4 Oct).
- **The Lewis Hamilton helmet is now a reseller's offer** at ₹11,990, so it is marked Skip and has left the rows at the top. The main seller's MRP is ₹9,999.
- **An item priced above its MRP is marked Skip,** and says so. An item can also carry the date its own price was checked.
- The Road Bike is at a new low (₹10,399). The Ford GT40 is out of stock, and the Mandalorian helmet and Alpine Lodge have no offer from the main seller.

## 2.9.0

- **A page for every watchlist item.** A post with the internal tag `#watch-item` is drawn as that item's own page: its picture, title, verdict, the three prices, the Must Buy line, price per piece and the buy button. The post's body is your notes or review, shown between the heading and the prices. The prices come from the watchlist's data, matched by the post's address, so the post never holds a price.
- **Lego items live at `/lego/<set number>-<name>/`.** This needs the new `docs/routes.yaml` uploaded in Ghost Admin. The 47 pages are created by importing `dungeon-lego-pages-import.json` once.
- **The item sheet links to the item's page** ("Open page").
- **One line can point every watchlist at data kept elsewhere:** `<meta name="watchlist-data" content="https://...">` in Ghost's code injection. Without it the shelf the theme ships is used, as before.
- Items still collecting data, and listings marked Skip, carry `#watch-noindex` in the import and are kept out of search engines.
- Watchlist items stay off the homepage, the feed, the plots and the next/previous links. garden-sync skips them too (update it wherever it runs).

## 2.8.2

- **Featured cards on a watchlist use a bold palette of their own:** eight deepened colours, without the muted sage and pistachio, so no row comes out pale.
- **The price per piece is plain small text after the pills,** not a pill of its own. On a featured card in dark mode it had picked up a dark outline and pale text. The item sheet shows the figure once, in its own line.

## 2.8.1

- **Featured cards on a watchlist are bolder and more varied.** They take the theme's bright pastels, a different one for each card in a row, where they all used to take their verdict's colour (mostly the same blue). An item keeps its colour between visits; its verdict still shows on its chip.
- **The bar is gone from the listing.** Under a card's price is a plain line, "low ₹4,450 · Jul 2026". Pointing at it shows the buy window: "Buy window: ₹4,450 – ₹4,583".
- "Most Pieces for the Money" shows six items.
- The Lego shelf's handwritten note now reads "Buy it in India. Just wait for the sale."

## 2.8.0

- **Price per piece.** A shelf can give each item a piece count. The watchlist then shows the price per piece on every card and in the item sheet, adds a row for the lowest ("Most Pieces for the Money") with a "Best per Piece" label on those items, and lets the listing be sorted by it. The Lego shelf has piece counts for all 47 sets, from Rebrickable.
- **Shorter verdict line in the item sheet:** "Must Buy under ₹4,583", "Buy Now" when today's price is within it, and "Collecting Data" (with an amber dot) when there isn't enough history. "Too New" is renamed "Collecting Data" on cards and the filter as well.
- **The price section reads top down.** The three prices come first, with the discount in small type right beside today's price, and the labels ("TODAY (4 Oct 2026)", "LOWEST (4 Jul 2026)", "MRP") under them. Cards show the discount beside the price in the same way.
- **Stronger colours for what matters.** The discount is plain below a fair discount, green from there, and a solid green pill at a Must Buy discount. The Must Buy chip is solid green.
- **Amazon's statement left the site footer.** "As an Amazon Associate I earn from qualifying purchases." now shows only where Amazon links are: under the Uses page, under a watchlist's shelf, and at the end of a post that links to Amazon.
- The Lego shelf's pictures now come from Rebrickable, one address per set.

## 2.7.2

- **A clearer price section in a watchlist item's sheet.** The three prices sit on one line, today's the largest, with the dates beside their labels ("TODAY (4 Oct 2026)", "LOWEST (4 Jul 2026)") and the discount under today's price. The bar is replaced by one sentence: "Must Buy under ₹4,583. Today is ₹1,176 above that." On a phone, a date in the current year drops its year to fit.
- **The buy button is a normal size,** with "I may earn a commission if you buy." on its row, at the right (under it on a phone). The dividing line above it is gone. The line under the shelf is shortened to match.
- **The green part of the small bar on each card is now the real Must Buy range,** worked out from the shelf's rules. It was a fixed width before.

## 2.7.1

- **A watchlist's box in a plot features one item.** The Must Buy with the deepest discount shows as a larger picture on the right, leaning and overlapping the box's top edge, with "Must Buy" and its green dot under it. Pointing at the picture gives it a slight zoom and wiggle of its own. The Must Buy count and the row of pictures are gone, and the label never drops onto a line of its own.
- The small "watchlist" label is left out when the page's title already says Watchlist.

## 2.7.0

- **Plots stack by empty space.** On a wide screen the plots sit in two columns, the wider on the left, and each plot goes under whichever column is shorter. A tall plot no longer leaves a gap beside it. Each plot takes the width of the column it lands in, so the row of three small plots is gone. Phones are unchanged.
- **Fixed: every plot listed the Plots page itself** as a "page" row. The Plots page carries every plot's tag, so 2.6.0's rule for showing pages in a plot matched it everywhere. It is now left out.
- **"Preparing ground".** A plot with no posts but a page in it (a watchlist, say) says "preparing ground" where an empty one says "unplanted".
- **The watchlist's box in a plot has a slight red tinge** and a fine red edge, so it stands off the card.

## 2.6.3

- **The Must Buy items' pictures show in a watchlist's box in a plot,** beside the Must Buy count: up to three, as small leaning tiles. A picture that doesn't load is left out.

## 2.6.2

- **The Must Buy count sits on the right of a watchlist's box in a plot,** as a pill with a green dot, beside the arrow. The line under the title keeps the number of items and the date.

## 2.6.1

- **A watchlist shows properly inside its plot.** A watchlist page that carries a plot's tag appears in the plot as a box, under the description: its title, and a live line with how many items it tracks, how many are a Must Buy, and when it was updated. The date is left out once it is more than a week old. Any other page tagged into a plot is a plain row labelled "page".
- **Fixed: the page links in a plot were unreadable** on an unplanted plot in dark mode (pale text on pale pills). They now take the card's own colours in every state.
- A plot with a page in it no longer says "Not planted yet."

## 2.6.0

- **The Store is now a Watchlist, at any address.** "Watchlist" is a page template: create a page with any title and address and choose Template: Watchlist in its settings. You can have several, each with its own shelves (one for Lego, one for gear). The page at `/store/` goes on working as it is.
- **A page can sit in a plot.** A page that carries a plot's tag is linked at the foot of that plot on the homepage, so a watchlist can live in the plot it belongs to.
- **A lighter item sheet.** The top bar holds only the item's label and the close button: the "1 / 47" counter is gone and the label no longer repeats the shelf's name. Previous and Next are two plain links at the foot of the sheet. Arrow keys and a sideways swipe still work.

## 2.5.4

- **The buy button sits with the prices.** In a Store item's sheet, "Buy on Amazon" is now at the bottom of the price section, not at the very end, and fills the width on a phone. A listing marked Skip gets a quiet "View the listing" link, not a buy button.
- **Affiliate links say so.** When the affiliate tag is switched on for the Store page, a line beside the buy button and one under the shelf say the links are affiliate links.

## 2.5.3

- **Shorter words on the Store page.** Verdicts are now Must Buy, Fair Price, Wait for Sale, Too New and Skip. The labels are "Lowest Ever" and "Owned", the rows above the shelf are "My Picks" and "Lowest Right Now", and the item sheet's sentences and headings are shorter throughout.
- The Lego shelf's note no longer says its links are plain, since the affiliate tag can be switched on for the Store page.

## 2.5.2

- **Store items show pictures.** A shelf can name a picture address with `{code}` in it (`imagePattern`), and every item without its own image uses it. The Lego shelf points at Brickset's set pictures. An item's own `image` still wins, `"image": false` turns the picture off for one item, and the code is shown if no picture comes back.
- **The affiliate tag is added as soon as a link is on the page,** not only when it is pressed, so it shows when you hover over or copy a link.

## 2.5.1

- **Amazon links carry your affiliate tag by themselves.** Add one line to Ghost's code injection (Settings, Code injection, Site header): `<meta name="amazon-tag" content="yourid-21">`. Every link to amazon.in on the site then gets the tag when a visitor uses it, and is marked as sponsored for search engines. Your posts and things keep plain links, so changing or removing that one line changes every link. Links that already have a tag, short `amzn` links and other sites are left alone.
- **A disclosure line in the footer** ("As an Amazon Associate I earn from qualifying purchases.") appears while the tag is set.
- **The Store page is left out** unless you also add `<meta name="amazon-tag-store" content="on">`.

## 2.5.0

- **A Store page.** A page with the address `/store/` shows prices you track and what you'd do about them. Each item is a card with today's price, MRP and a bar showing where today's price sits between the lowest on record and MRP; the green end of the bar is must-buy territory.
- **Every item gets a verdict:** must-buy territory, fair, wait for a sale, too new to call, or skip this listing. The theme works these out from the shelf's own rules, so they stay consistent. The verdicts are the filter at the top, with counts.
- **Rows above the shelf.** Items at their lowest price appear in "At its low right now". Items you mark as picks appear in "What I'd buy this week".
- **An item sheet.** A card opens the item's prices, when it hit its lows, what you paid and a link to the listing, with previous and next (buttons, arrow keys or a swipe). An item's address can be shared: `/store/#42207`.
- **Shelves are data files.** The theme ships one shelf of Lego sets (`assets/data/store-lego.json`). To keep shelves outside the theme, so prices can change without a theme release, link to their `.json` files in the Store page's text: each link becomes a shelf. A shelf of anything works; `docs/store.md` describes the file.
- The Store page uses plain links, with no affiliate tags.

## 2.4.1

- **A thing's photo is shown as it is.** The tile no longer blends photos into its grey, so white products stay white. Every photo keeps its own shape and has rounded corners: a cut-out PNG looks the same, and a filled photo sits in the tile as a rounded picture.
- **Tiles lean and wiggle.** Each tile rests at its own slight lean (the same on every visit, within the Card tilt setting; "None" keeps them level) and wiggles upright with a small lift when pointed at. Still for visitors who prefer reduced motion.

## 2.4.0

- **Things are posts now.** Each thing on the Uses page is a post with the internal tag `#thing`: the title is its name, the feature image its photo, the excerpt its line and the body its longer note. An internal tag such as `#uses-desk` sets its category, `#retired` moves it to the last section, and any other internal tag (`#preethi`) is a label. This replaces 2.3.0's Product cards, which the Uses page no longer reads. Things live at `/things/<name>/` and stay off the homepage, the feed and the garden: upload the new `docs/routes.yaml` (and `docs/redirects.yaml`, which sends `/things/` to `/uses/`).
- **The Uses page writes itself.** It gathers every thing under its category. The page's own headings set the categories' order and names, and a paragraph under a heading is that category's line. Up to 300 things.
- **A thing can be shown in any post.** Paste its link on a line of its own and it becomes its tile, read from the thing's own page, so editing the thing updates every place it appears. Neighbouring links gather into a shelf; one alone is a small row. Without JavaScript the link stays as Ghost's bookmark.
- **Previous and next in the overlay:** buttons on either side, the arrow keys, or a sideways swipe, with the position shown ("12 / 61"). It runs through the whole Uses page (or the shelf, in a post) and wraps round. A Button card in a thing's body is its buy link.
- A thing with no body is kept out of search engines. garden-sync leaves things out of the garden.

## 2.3.0

- **A Uses page.** A page with the address `/uses/` shows everything you use as a grid of tiles. Write it in Ghost's editor: a heading starts a category, and each item is a Product card (photo, name, description, optional button). A bar of categories with counts stays at the top as you scroll and marks where you are.
- **One overlay for details.** A tile opens the item's photo, category, full description and links; left and right arrows step through items. The Product card's button becomes the buy link, marked as sponsored for search engines, with a disclosure line when it points to Amazon. A link to one of your own posts in the description becomes "Read the post".
- **Labels and retired things.** Hashtags at the end of a description (`#preethi`, `#recommended`) become labels on the tile. A category whose heading starts with "Retired" is drawn with dashed tiles and struck-through names, and each description is labelled "Cause of death".
- Items without a photo show their initials, so the page can be filled in a bit at a time.

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
