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

## Curios

After the books, the file lists the curios: the things standing in front of the books and on top of the cases. One line each:

| Field | Meaning |
|---|---|
| `k` | Which drawing to use. The drawings are in `assets/js/library.js`; a line whose `k` has no drawing is skipped. |
| `name` | Shown on the curio's card. |
| `note` | The details shown under the name. Empty for now: fill these in as you like. |
| `s` | The shelf it stands on, numbered like the books' shelves. `-1` is the top of the left case, `-2` the top of the right case. |
| `x` | Where along the shelf, from 0 (left end) to 1 (right end). |

Later lines are drawn in front of earlier ones. A visitor can drag a curio anywhere, which is remembered only in their own browser. To change where a curio stands for everyone, drag it on the live page, click it, read the shelf and position from its card, and put those numbers in its line here.

## Changing the books

- **Add a book:** add a line where it stands, with at least `t`, `s`, `h`, `w`, `c` and `cn`.
- **Move a book:** move its line and change `s` if it changed shelf.
- **Correct a title, author or genre:** edit that line.
- Commit and push as usual. The release carries the new file to your site.

Changing the number of books makes earlier arrangement links stop working, because a link records a position for every book. The page tells the visitor and shows the real shelves instead.

## What is fixed in the script

Twelve shelves in two cases, the crooked tilt of each shelf, and the things standing on top of the cases are set in `assets/js/library.js`. The shelf width is the width of your fullest real shelf, and every sort, pattern and hand arrangement stays within it.

## Bookcases

The `cases` list at the top of the data file sets the bookcases, left to right around the ring:

| Field | Meaning |
| --- | --- |
| `name` | Shown above the shelves and on each book's card. |
| `n` | How many shelves it has. |
| `wood` | `dark` for a dark brown case. Leave out for the warm wood. |
| `layers` | `true` if some of its books stand behind others (see `ly`). The page then shows every layer side by side, with a "How it really is" button to tuck them back. |
| `straight` | `true` for level boards and upright posts. Leave out for a crooked case. |

Shelves are numbered straight through: with cases of 6, 6 and 5 shelves, the third case's shelves are 12 to 16. A curio on top of a case uses a negative shelf: -1 for the first case, -2 for the second, -3 for the third.
