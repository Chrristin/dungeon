# The Runlog

A run is a GPX file (Samsung Health, Strava export or any other) that `extras/runlog/build.mjs` turns into data the theme draws:
a replay page for each run, an index at `/runlog/`, the records so far, and a box on the homepage.

## Pieces

| What | Where |
| --- | --- |
| Index page | A Ghost page with the **Runlog** template (`custom-runlog.hbs`, `partials/runlog.hbs`) at `/runlog/` |
| A run's page | A Ghost post tagged `#run` at `/runs/<slug>/` (`partials/run-page.hbs`, route in `docs/routes.yaml`). The post's slug is the run's data file name. Its title, picture, excerpt and body are shown above the replay |
| Homepage box | The Runlog page, given a plot's tag, gets a box in that plot (`partials/plots.hbs`), drawn by `runlog.js` |
| Drawing | `assets/js/runlog.js`, `assets/css/runlog.css` |
| Data | `assets/data/runs/index.json`, `<slug>.json`, `<slug>.map.json` |
| Builder | `extras/runlog/build.mjs` (not in the release zip) |

## Building a run

```
node extras/runlog/build.mjs run.gpx --slug 2026-10-31-kochi-dawn-15k --title "Kochi Dawn 15K" --osm map.osm --fetch
```

`--osm map.osm --fetch` downloads the OpenStreetMap extract for the route (plus about 450 m around it) the first time, through
the public API, and keeps it in `map.osm`; later runs over the same ground can reuse the file. Credit "© OpenStreetMap
contributors" is on every page that shows the map. `--trim 200` leaves out the first and last 200 m of the published route
(none by default: the run's start is a public place). `--pins pins.json` places photos: `[{"km": 6.0, "title": "...",
"credit": "...", "src": "https://..."}]`; the replay stops at each for three seconds.

## Data

- **index.json**: one summary per run, newest first: `slug, title, start (local, ISO), km, durationS, paceS, hrAvg, hrMax,
  cadAvg, best {1,5,10,21: seconds}, w, h, thumb [x,y,...]`. The index page, records and homepage box all read it.
- **<slug>.json**: `x, y` (route in a space 1000 units on its longer side), `d` metres, `t` seconds, `mt` seconds on the
  replay's clock (stops of 10 s or more count for almost nothing), `hr`, `cad`, one entry every 5 s; `splits`, `stops`,
  `pins`, `summary`.
- **<slug>.map.json**: OpenStreetMap shapes in the same units: `poly` (built, green, paddy, water, bldg), `lines` (canal,
  river, path, minor, major), `places`.

## What is and is not trusted

- Distance is the track's measured length scaled evenly to the watch's own distance. Time is the watch's duration.
- **Elevation is not used.** The watch's altitude is not credible on flat ground (the first run reports 165 m of climb and
  none of descent). A terrain-model profile would be within its own error of the whole climb; add one only on a hilly run.
- Heart rate and cadence gaps are carried forward from the last reading.
- Fastest km is the quickest marked kilometre. Fastest 5K, 10K and half are the quickest stretch of that length, to the second.
