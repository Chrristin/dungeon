# Watchlist pages

A watchlist is a page that shows one or more shelves of prices you track (template `custom-watchlist.hbs`, partial
`partials/watchlist.hbs`, script `assets/js/store.js`). A shelf is a JSON file. The theme ships
`assets/data/store-lego.json`.

## Setting it up

1. In Ghost Admin, create a page with any title and address. Its title, excerpt and text are the heading and introduction.
2. In the page's settings, choose Template: Watchlist.
3. That is all: the bundled shelf is shown. You can have several watchlist pages, each with its own shelves.

To show a watchlist inside a plot on the homepage, give the page that plot's tag: it appears in the plot as a box with
its title and a live line (how many items, how many are a Must Buy, and the date if it is under a week old). If the box
shows as a plain row instead, also give the page the internal tag `#watchlist`. The shelf's `unit` ("sets") names the items.
A page with the address `store` is a watchlist too, without choosing the template.

## Keeping shelves outside the theme

Prices in the bundled file only change with a theme release. To change them without one, host the file somewhere
that serves it to browsers (a public GitHub repository through jsDelivr or GitHub Pages works) and link to it in the
page's text. Every link ending in `.json` becomes a shelf, named by the link's words, and the links are not
shown as text. With two or more, tabs appear. Once any link is present, the bundled shelf is no longer used.

## The file

```json
{
  "shelf": "Lego",
  "unit": "sets",
  "currency": "₹",
  "locale": "en-IN",
  "updated": "2026-10-04",
  "hand": "Buy it in India. Just wait for the sale.",
  "sale": { "label": "Festival sale opens 8 Oct", "windows": ["Sep to Oct", "May", "July"] },
  "linkLabel": "Buy on Amazon",
  "method": "Where the prices come from.",
  "rules": { "mustOff": 0.4, "nearLow": 0.03, "nearLowOff": 0.25, "fairOff": 0.15, "newDays": 200, "newOff": 0.15, "lowRowOff": 0.1 },
  "items": [
    {
      "code": "42207", "name": "Ferrari SF-24 F1 Car", "group": "Technic",
      "url": "https://www.amazon.in/dp/B0DHSCYDL2",
      "price": 20609, "mrp": 22899, "low": 11449, "lowDate": "2025-09-26", "days": 588,
      "flags": ["Owned"], "paid": "about ₹18,000 · Jul 2025", "lows": ["Sep to Oct", "July"]
    }
  ]
}
```

Per item, only `code`, `name` and `price` are needed for a card. The rest:

- `mrp`, `low`, `lowDate`, `days` (days of price history): used for the verdict and the line under a card's price.
- `orp`, `orpDays`, `orpWeak`: the item's usual price: the price it has most often sold at over the past year (a whole number), how many days of record that rests on, and `true` when the price wandered too much to have one clear figure. A listed MRP can be anything, so once `orpDays` reaches `usualDays` (30) the theme measures discounts from the usual price instead of MRP, shows "usually ₹X" and "N% off usual", and draws it on the price line in place of MRP. All three are optional; without them an item is judged from its MRP.
- `pieces`: how many pieces (or units) the item has. With it, the price per piece is shown, the six lowest get a row of their own ("Most Pieces for the Money") once eight or more items have a count, and the listing can be sorted by it.
- `seller: "other"`: not sold by the main seller. The verdict is Skip. An item priced above its MRP is Skip too.
- `checked`: the date this item's price was read, when it differs from the shelf's `updated` date.
- `flags`: any labels, shown as written. "Lowest Ever" is added by the theme.
- `lows`: which of the shelf's sale windows the item hit its lows in.
- `paid`: what you paid, as text.
- `note`: your own sentence for the item sheet, in place of the theme's.
- `pick: true`: puts the item in "My Picks".
- `image`: a full address of a photo. Without one, the shelf's `imagePattern` is used (an address with `{code}` in it, such as `https://images.brickset.com/sets/images/{code}-1.jpg`); if that brings nothing, the tile shows the code. `"image": false` turns the picture off for one item.
- `verdict`: `must`, `fair`, `wait`, `new` or `skip`, to overrule the theme.

## How a verdict is worked out

In this order, with `off` meaning today's discount from the item's usual price when it has one with at least `usualDays` of record behind it, and from MRP otherwise:

1. No price, or `seller` is `other`: Skip.
2. The item has an `orp` but under `usualDays` of record, and under `usualDays` of history overall: Collecting Data, never a Must Buy. (An older item whose usual price is not worked out yet is judged from MRP.)
3. `off` is at least `mustOff` (`usualMustOff`, 0.25, when measured from the usual price), or today's price is within `nearLow` of the lowest and `off` is at least `nearLowOff`: Must Buy.
4. Fewer than `newDays` of history and `off` below `newOff`: Too New.
5. `off` is at least `fairOff`: Fair Price.
6. Otherwise: Wait for Sale.

"Just Missed" and the Must Buy price shown on an item use the same starting point.

## A page for every item

A post with the internal tag `#watch-item` is drawn as an item's own page. The theme finds the item in the watchlist's
data by the post's address: the item's `slug` must equal the post's address (its last part).

- In the shelf: `"pageBase": "/lego/"` (where the item pages live), `"home": "/lego-watchlist/"` (the watchlist page, for
  the link back), and on each item `"slug": "42207-ferrari-sf-24-f1-car"`.
- `docs/routes.yaml` gives Lego items (`#lego-set`) the address `/lego/<slug>/` and keeps `#watch-item` posts off the homepage.
  Upload it in Ghost Admin, Settings, Labs, Routes.
- `dungeon-lego-pages-import.json` creates the 47 posts. Import it once (Settings, Import). A second import duplicates them.
- The post's feature image is the picture, its excerpt the line under the title, and its body your notes.
- A post tagged `#watch-noindex` is kept out of search engines.

## Data kept outside the theme, for every watchlist at once

Add `<meta name="watchlist-data" content="https://example.com/lego.json">` to Ghost's code injection (site header).
Watchlist pages and item pages then read that address in place of the bundled shelf. Several addresses, separated
by spaces, are several shelves. A watchlist page whose own text links to `.json` files still uses those.

## Taglines

A paragraph in a watchlist page's text that starts with a row's name and a colon becomes that row's tagline, shown beside
its heading in handwriting and taken out of the text: `Must Buy: May the 4th is in October now!`. The rows are Must Buy,
My Picks, Lowest Right Now, Most Pieces for the Money and Just Missed.

## Optional: things that need a server

A list is just a JSON file, and everything above works with a file hosted anywhere. Two extras need a small server of
your own, and are left out when it is not there:

- **A price line** on an item's sheet and page. For a list loaded from `https://host/path/<name>.json`, the theme asks
  `https://host/path/<name>/history?asin=<ASIN>` and draws the answer, `{ "points": [["2026-01-04", 11449], ...] }`
  (a date and a price each), when it has two points or more.
- **Request a set** appears under the listing when the Stamps endpoint is set in Design settings and the list is loaded
  from an address ending `/watch/<name>.json` on that same server. It uses the Stickies site key for its spam check, and
  sends requests to `<endpoint>/watch/request` and reads `<endpoint>/watch/<name>/requests`. The Worker in
  `extras/stamps-worker` serves stamps, stickies and ratings only, so it does not answer these two addresses, and a list
  hosted anywhere else never shows the box.

## Other things an item can carry

- `"line"`: one sentence of your own, shown under its name on featured cards.
- `"pending": true` (no price yet): the item is shown as Collecting Data.

## More than one watchlist

Each list is its own JSON file and has its own page on the site.

1. **Make each list's file,** and host it at an address that serves it to browsers. Its `unit` names what its items are
   called (cars), and its `rules` can differ from another list's.
2. **Give each watchlist page its own data link.** In the page's text, add a link to the list's file, such as
   `https://example.com/diecast.json`; the link's words are the list's name. Do this on the first watchlist's page too,
   so each page shows only its own list.
3. **List every file in the site's source,** so item pages can find their item: in code injection,
   `<meta name="watchlist-data" content="https://example.com/lego.json https://example.com/diecast.json">`
   (addresses separated by a space).
4. **Upload `docs/routes.yaml`** again. It has a block per list; a list named `diecast` has item pages at `/diecast/…`.
   Another list needs a block of its own with its short name.
5. **Make the page** with Template: Watchlist. A shelf's `home` names the page its items link back to;
   `/<short name>-watchlist/` is the simplest address to give it.

A list without piece counts shows no price per piece.
