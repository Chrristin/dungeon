# The Runlog

A run is a GPX file (Samsung Health, Strava export or any other) that `extras/runlog/build.mjs` turns into data the theme draws:
a replay page for each run, an index at `/runlog/`, the records so far, and a box on the homepage.

## Pieces

| What | Where |
| --- | --- |
| Index page | A Ghost page with the **Runlog** template (`custom-runlog.hbs`, `partials/runlog.hbs`) at `/runlog/` |
| A run's page | A Ghost post tagged `#run` at `/runs/<slug>/` (`partials/run-page.hbs`, route in `docs/routes.yaml`). The post's slug is the run's data file name. Its title, picture, excerpt and body are shown above the replay |
| The Movement plot | The Runlog page, given a plot's tag, makes that whole plot card the latest run (`partials/plots.hbs` loads `runlog.js`, which adds `is-takeover` to the plot). The card's own title and code stay, on top of the live map |
| The cam | `Cam()` in `runlog.js`: the OpenStreetMap shapes from `<slug>.map.json` are projected in perspective every frame (a camera 26 units up and 14 behind, pitched 34 degrees), only those near the runner, with extruded buildings. The runner is a pulsing ring (`ring()`), the route already run fades behind (`travelled()`), and the replay starts itself once at 300× when the cam is mostly on screen (`autoOn`; any control hands it over). `q` drops far detail, then buildings, if frames average over 14 ms. The overview map is a picture drawn once (`drawBase()`), shown smaller than it is drawn |
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
(none by default: the run's start is a public place). `--pins pins.json` places photos (see "Photos"); the replay stops at
each pin for a few seconds.

## Photos

Photos are not kept in this repository. `extras/runlog/photos.mjs` turns the originals into clean copies and a pin list:

```
node extras/runlog/photos.mjs run.gpx photos/ meta.json out/ --slug 2026-10-31-kochi-dawn-15k
```

`meta.json` gives, per original file name, `{"title", "credit", "alt"}` (alt is a plain description of the picture). Each
photo's EXIF capture time is matched to the run's clock to find where on the route it was taken, and its GPS position is
checked against that (a photo more than 60 m off the route is reported). A photo with no EXIF (one that came through a
messaging app) can be given `"km": 4.2` instead; its pin is then marked `approx` and the page says "somewhere along the
route" instead of a km and a time. The tool writes `<slug>-p<n>.jpg` (1,400 px) and `-s.jpg` (480 px), **with all EXIF
removed, including GPS**, and checks that before finishing. Upload those to Ghost's image storage (the pin's `src` and
`thumb` are the uploaded addresses, which the tool that does the upload writes into `pins.json`), then give `pins.json` to
`build.mjs --pins`. In the replay, photos within 0.35 km of each other are one pin: in the cam it is a quiet, slightly
translucent photo floating at the side of the road (two or more are fanned), on the map it is a round photo that fans out
when clicked, and a click opens the photo full size. The strip under the replay lists every photo, so the photos can be
reached without the map or the cam.

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
- Fastest km is the quickest marked kilometre, **ignoring any single km more than 30% faster than the run's average pace**:
  that is a GPS jump (the first km is often short while the watch finds its signal), not a record. Fastest 5K, 10K and half
  are the quickest stretch of that length, to the second.
- The watch shows distance truncated (10.15 km), the page rounds (10.16 km). Average heart rate and cadence are averaged from
  every second of the track, so they can differ from the watch's own figure by one.
