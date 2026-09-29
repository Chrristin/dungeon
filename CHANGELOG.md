# Changelog

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
