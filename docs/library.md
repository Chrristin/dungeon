# The Library

The Library page draws your bookshelves from one file, `assets/data/library.json`. This note explains how to set the page up and how to change the books.

## Setting the page up

1. In Ghost Admin, make a page with the address `library`. Its title is the page's heading, for example "Christin's Library".
2. In the page's settings choose **Template: Library**.
3. Upload `docs/routes.yaml` (Settings > Labs > Routes). The page is then shown at `/collection/library/`, and `/library/` sends visitors there.
4. To let visitors send you an arrangement, put an email link somewhere in the page's text, such as "Write to me" linked to `mailto:you@example.com`. The first email link on the page is where the Send button goes.
5. To list the page in a plot, give it that plot's tag.

## The data file

The file has two settings and a list of books, one book per line:

| Setting | Meaning |
|---|---|
| `updated` | The date you last changed the file. Not shown anywhere yet. |
| `covers` | `"openlibrary"` asks Open Library for a real cover when a visitor selects a book. `"none"` never asks, and only drawn covers or your own `cover` images are shown. |

Each book:

| Field | Meaning |
|---|---|
| `t` | Title, as it should appear on the spine and the card. |
| `a` | Author. Leave it out if unknown. |
| `p` | Publisher. Optional. |
| `g` | Genre, used by the Genre sort. Any wording works; books with the same wording are grouped. |
| `ly` | For a book that stands behind others: 1 for the middle layer, 2 for the back. Leave out for the front. The case it stands in needs `layers` set. |
| `pg` | For a book in a flat pile (`pl` is `stack`): which pile on the shelf it belongs to, counted from the left. Books with the same number, listed one after another from top to bottom, make one pile. |
| `tags` | Topics, as a list. The Topic panel on the page is built from these. Which heading a topic sits under (Fiction, Non-fiction, Comics, Series) is set by the `TOPICS` list in `assets/js/library.js`; a topic not listed there appears under More. |
| `s` | The shelf the book really stands on: 0 to 5 are the left case from top to bottom, 6 to 11 the right case. |
| `pl` | How it is placed: `up` standing, `top` lying on top of the row, `stack` in a flat pile, `face` cover facing out. |
| `an` | For `top` and `face` books only: the start of the title of the standing book it rests on or stands in front of. |
| `h` | Height, 110 to 215. A typical paperback is about 150, a tall hardcover about 190. |
| `w` | Thickness, 6 to 66. |
| `c` | Main spine colour, as a hex code. |
| `c2` | Second colour, used for the title and decoration when it shows up well against the first. |
| `cn` | The main colour's name, used to count colours under the shelves. |
| `cover` | Optional. The address of your own cover image for this book. |
| `cf`, `n` | How sure the reading from the photos was, and notes. Kept for your reference and not shown to visitors. |

The order of the lines is the order on the shelves: within one shelf, books stand left to right in the order they appear in the file.

## Piles of comics

A pile of thin comics is one thing on its shelf, not hundreds. Click it and its card shows one cover for each title, with a search box, twelve titles to a page. Choosing a title shows every issue of it. The comics are still in the book list at `#books`, with the pile named in their place ("Shelf 3, row 5, gotham super specials, left pile").

The `piles` list near the top of the data file sets the piles:

| Field | Meaning |
|---|---|
| `id` | A short name the comics refer to. |
| `name` | Shown on the pile's card and in the list. |
| `s` | The shelf it stands on (for Shelf 3's bottom row, 16). |
| `w` | How long a comic in it is drawn, in drawing units. Piles are drawn wider than this only to fill their shelf. |
| `fw`, `bw` | How much of the shelf a front pile (`fw`, default 1) or a back pile (`bw`, default .8) takes, compared with the others. |
| `th` | How thick each comic is drawn. A pile is drawn no taller than `cap` (default 240), so a big pile has thinner slabs. |
| `on` | The `id` of a pile this one stands on, as the Archie digests stand on the middle Super Specials. `dy` is how far above the shelf it rests. |
| `back` | `true` for a pile that stands behind the front piles. Where the layers lie side by side, the back piles stand beside the front ones. |
| `a`, `p`, `h`, `c`, `c2`, `cn` | What each comic takes unless it says otherwise: author or publisher, height, spine colour, title colour and colour name. |
| `sets` | `true` for a pile of single issues: drawn as a boxed set, one band for each title, lettered with the title's name and the issues in it. |
| `imprint` | Optional. A second line of lettering on each spine ("GOTHAM COMICS"). |
| `lean` | Optional. Comics leaning on the pile, as a list of `{cv, b2, ser, at, ang, w, h, bow}`: `cv` is the cover (see below), `b2` the cover of a second comic leaning behind it, `ser` the title in the pile it opens, `at` where along the pile (0 to 1), `ang` the lean in degrees (negative leans left), and `bow` how much the page sags (a little). Each is drawn as a stapled booklet: a spine, its pages showing along the edges, a shadow. |

A comic in a pile is a line in `books` with only `t` (title), `pile` (the pile's `id`) and `tags`. It may add `c`, `w` or `n` of its own. The order of the lines is the order in the pile, top to bottom. A title with several issues is "Title No. 14", "Title No. 15" and so on: the card groups them by the words before "No.".

**Covers.** `cc` near the top of the data file maps a title to its cover: a number, counted left to right then down, in `assets/images/comics/covers.webp` (12 covers across, 5 down, each 150 by 215). A title with no cover shows a plain plate in its pile's colours. To add or change a cover, edit that picture and the number; then run `npm run shelves`.

A book can also have `lead`: `"rest"` puts it and every book after it against the right end of the shelf, which is how the standing albums sit beside the piles.

**Every row is full.** On the real shelves each row's standing books are stretched a little (never by more than a third) until the row reaches both ends, because a shelf in a house has no free centimetre. Thicknesses in the data are estimates, so this is a rounding of them.

## Curios

After the books, the file lists the curios: the things standing in front of the books and on top of the cases. One line each:

| Field | Meaning |
|---|---|
| `k` | Which drawing to use. The drawings are in `assets/js/library.js`, and the hand-drawn, hand-shaded ones for Shelves 4 and 5 in `assets/js/library-art.js` (parts of a figure that move are groups with class `mv`; `library.css` plays them while the curio is hovered, focused or held, never for visitors who ask for less motion); a line whose `k` has no drawing is skipped. |
| `name` | Shown on the curio's card. |
| `note` | The details shown under the name. Empty for now: fill these in as you like. |
| `s` | The shelf it stands on, numbered like the books' shelves. `-1` is the top of the left case, `-2` the top of the right case. |
| `x` | Where along the shelf, from 0 (left end) to 1 (right end). |
| `dy` | Optional. How far above the shelf it rests, in drawing units: the moon behind the turtles, the helmet box on the pile of books. Picked up and dropped, it settles on the shelf. |

Later lines are drawn in front of earlier ones. A visitor can drag a curio anywhere, which is remembered only in their own browser. To change where a curio stands for everyone, drag it on the live page, click it, read the shelf and position from its card, and put those numbers in its line here.

## Changing the books

- **Add a book:** add a line where it stands, with at least `t`, `s`, `h`, `w`, `c` and `cn`.
- **Move a book:** move its line and change `s` if it changed shelf.
- **Correct a title, author or genre:** edit that line.
- **Make the shelf pictures again.** The page opens on pictures of the bookcases, not the live drawing, so after any change to `library.json` (or to `library.js` or `library.css`) run `npm run shelves` and commit what it writes: `assets/images/shelves/` and `partials/library-shelves.hbs`. It needs Chrome or Chromium on your computer (`npm install` once first).
- Commit and push as usual. The release carries the new file to your site. It stops, saying why, if the pictures were not made again.

Changing the number of books makes earlier arrangement links stop working, because a link records a position for every book. The page tells the visitor and shows the real shelves instead.

## The list of books

`/collection/library/#books` lists every book, and `#books-1`, `#books-2` and so on list one bookcase's books (the number is the bookcase's place in the `cases` list). Nothing is set up in Ghost: the list is part of the Library page, and it reads the same data file. A line under the bookcase pictures links to it, and every open bookcase has a "Books on this shelf" button.

Each row shows the book's colour, title, author, genre and topics, and "Shelf 2, row 3". Search matches any of those words. The genre and topic chips are the genres and topics in the data file, most common first.

## The shelf pictures

The landing is a picture of each bookcase, in light and dark wood, already in the page. `extras/shelves/build.mjs` makes them: it opens `extras/shelves/harness.html`, which runs the real `library.js` and `library.css` on the data file, and photographs each bookcase with a transparent background at twice its shown size. It also writes `partials/library-shelves.hbs`, which places them. Choosing a bookcase fetches the data and draws that bookcase live.

- `npm run shelves` makes them. `npm run shelves:check` only says whether they are up to date; the release runs it and stops if they are not.
- The release does not make them: it only checks, and stops if they are out of date, so a release never carries pictures that do not match the data.
- Lights and flames are held still in the pictures, so every run makes the same ones.

## What is fixed in the script

Twelve shelves in two cases, the crooked tilt of each shelf, and the things standing on top of the cases are set in `assets/js/library.js`. The shelf width is the width of your fullest real shelf, and every sort, pattern and hand arrangement stays within it.

## Bookcases

The `cases` list at the top of the data file sets the bookcases, left to right around the ring:

| Field | Meaning |
| --- | --- |
| `name` | Shown above the shelves and on each book's card. |
| `n` | How many shelves it has. |
| `wood` | `dark` for a dark brown case, `oak` for the tall oak case, `pale` for pale oak rails with white shelves. Leave out for the warm wood. |
| `layers` | `true` if some of its books stand behind others (see `ly`). The page then shows every layer side by side, with a "How it really is" button to tuck them back. |
| `straight` | `true` for level boards and upright posts. Leave out for a crooked case. |
| `own` | `true` for a case sized to its own contents, not to the fullest shelf of the others. `w` is the least width it takes, in drawing units (300 for the tall oak case). |
| `taper` | A ladder: each shelf is narrower than the one below it by this fraction of the width, and the rails lean in and rise above the top shelf. Such a case has no back, no fairy lights and no shadow behind the shelves, so the page shows through. A curio on top of a ladder stands on its top shelf. |

Shelves are numbered straight through: with cases of 6, 6 and 5 shelves, the third case's shelves are 12 to 16. A curio on top of a case uses a negative shelf: -1 for the first case, -2 for the second, -3 for the third, -4 for the fourth, -5 for the fifth.
