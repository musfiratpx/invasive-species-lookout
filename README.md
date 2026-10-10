# Invasive Species Lookout (ISL)

An interactive map of **invasive species across New York City**, built at **HackKnight 2026** (Queens College). It started around Kissena Park and Queens College, grew to all of Queens, and now covers all five boroughs of New York City: **83 New York–listed invasive species and 72,899 research-grade sightings**.

Every fact links to its source. Danger levels come from official New York rankings, never from AI.

![The home page: a welcome banner over a credited iNaturalist photo with live totals (72,899 sightings, 83 listed species, 460 parks), then the map of all five boroughs with numbered sighting bubbles and the danger-level filter](docs/screenshot.jpg)

## What you can do

- **Explore the map.** Sightings are grouped into numbered bubbles that split as you zoom in. Hover a bubble to preview the species inside; zoom to street level to see every sighting at its own spot. The map stays around New York City, and scrolling over it moves the page until you click the map (so you never get stuck in it).
- **See what's near you.** Press **📍 Near me**: the map zooms to you and a photo grid lists the listed species reported within 500 m, 1 km or 2 km, most-reported first, with how close and how recently. Your location stays in your browser; it is never sent anywhere or put in a link. Outside NYC it says we have no data there instead of showing an empty list.
- **Learn about a species.** Tap an icon to open a big credited photo with the name and danger level on it, then the danger level explained in plain words, its legal status in New York, when it shows up during the year, reports per year (with a note that these are reports, not a survey), its history, look-alikes, how to handle it, and its sources. A real recording plays only for the few species that have one. **Copy link** shares that species.
- **Listen instead of reading.** A small 🔊 after each paragraph reads just that paragraph aloud with the browser's built-in voice (free, offline, no AI voice).
- **Search and browse** from one box: click it to see every species (with a photo on each row) or park as a list you can sort (most seen, most dangerous, biggest park, A–Z), filter species with danger and plants & animals chips, and type to narrow it down, with the matching letters highlighted. Type a group like "birds", "plants", "fish" or "animals" to see that whole group. Enter opens the top match.
- **Open a park profile**, for example Kissena Park: its official boundary, a photo grid of the listed species seen there, how dangerous they are, when people see them, and the latest sightings.
- **Print a park field guide** (`/guide/Q024`): one page with the park's most-reported species, credited photos, danger levels, a "Spotted it" box to tick on your walk, how to report, and QR codes back to the live map.
- **Report it, don't pull it.** Every species and park explains NYC Parks' rule against removing plants or animals, links to NY iMapInvasives for reporting, and to official NYC Parks volunteer programs.
- **Spot the species**: a 10-question photo quiz with real, credited iNaturalist photos and look-alike answers. Progress dots show how you're doing, keys 1–3 pick an answer, and the end of a round lists the species you missed with a "Learn more" link for each. "Copy my score" shares the result with a link to the quiz.
- **Filter** the map by when it was seen (all years, last 2 years, last 12 months), danger level, and kind (plants, birds, insects, fish and shellfish, other animals) from the **Plants & animals** dropdown.
- **Share any view**: links like `/?park=Q024` (Kissena Park), `/?species=6921` (Mute Swan) or `/?quiz=1` open the app on that view, and the browser's Back button closes panels one step at a time.
- **Accessible**: works with a keyboard and screen readers, reads paragraphs aloud, uses easy-to-read fonts, respects "reduce motion" (no animations or rotating photos), and uses large tap targets on phones.

## How it works

```
 iNaturalist API ─────► scripts/fetch_*.py ────────┐
 NYS DEC Part 575 list ─► data/ny_invasive_list.csv │
 nyis.info rank forms ──► data/danger_levels.csv    ├─► backend/data/  (CSV + JSON, committed)
 NYC Parks boundaries ──► scripts/fetch_parks.py ───┘          │
                          + assign_parks.py                    ▼
 knowledge/*.md ───► RAG: Cortex Search (or keywords)     FastAPI  (backend/app/)
 (sourced fact sheets)   finds the right section ───────► /api/species, /api/parks,
                         → shown word for word            /api/map/observations
                         → cached in data/cache/insights/         │
                                                                  ▼
                                    Next.js + Leaflet  (frontend/)
                    map · search · Browse · species panel · park profiles · quiz · field guide
```

- **The app reads only cached files.** It never calls iNaturalist or an AI service while running, so the demo works even if the Wi-Fi drops. The banner photos and fonts are saved in the app too. (Map tiles and species photos still need internet.)
- **Invasive status** comes only from the NYS DEC 6 NYCRR Part 575 list.
- **Danger level** comes only from official NY ranks. See [docs/SCORING.md](docs/SCORING.md).
- **Species text** comes only from our sourced fact sheets in `backend/knowledge/`, shown word for word. Snowflake Cortex Search finds the right section; AI rewriting is available but turned off by team decision.
- **Honest mapping:** sightings with a privacy-blurred or very imprecise (over 1 km) location are counted but not drawn, so no species appears in the wrong place.
- **No API keys are needed** to run the app. Keys only switch on the optional extras below.

## Quick start

You need **Python 3.11+** and **Node.js 20+**.

**1. Backend** (terminal 1)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # optional: add keys later
uvicorn app.main:app --reload
```

Check that it's running: <http://localhost:8000/api/health>. The interactive API docs are at <http://localhost:8000/docs>.

**2. Frontend** (terminal 2)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>. For the demo, use the faster production build: `npm run demo` (see [docs/DEMO.md](docs/DEMO.md)).

Once the app is online, set `NEXT_PUBLIC_SITE_URL` in `frontend/.env.local` to its public address. The field guide's QR codes and the quiz's shared score link use it (otherwise they point to `localhost`).

**3. Tests**

```bash
cd backend && source .venv/bin/activate && pytest
```

## Refreshing the data (optional)

The cached data is already in git. To update it, run these from `backend/` with the venv active, in this order:

| Script | What it does |
|---|---|
| `python scripts/fetch_observations.py` | Sightings of NY-listed species in New York City (iNaturalist place 674) |
| `python scripts/fetch_media.py` | Photos and real sound recordings, with credits |
| `python scripts/fetch_seasonality.py` | Sightings per month across NYC |
| `python scripts/fetch_parks.py` | Official park boundaries for all five boroughs from NYC Parks (NYC Open Data) |
| `python scripts/assign_parks.py` | Works out which park each sighting is in (for park profiles) |
| `python scripts/load_chunks.py` | Uploads the fact sheets to Snowflake (only if Snowflake is set up) |
| `python scripts/build_insights.py` | Sidebar text from the fact sheets in `knowledge/` |
| `python scripts/build_danger_levels.py` | Rebuilds `danger_levels.csv` from the official sources |
| `python scripts/make_music.py` | One-time background music (needs `ELEVENLABS_API_KEY`) |

Restart the backend afterwards. The iNaturalist scripts go through `pyinaturalist`, stay around 1 request per second, and wait and retry if iNaturalist asks them to slow down.

## Optional services (`backend/.env`)

| Setting | Turns on |
|---|---|
| `SNOWFLAKE_*` | Retrieval through Snowflake Cortex Search. Run `backend/snowflake/setup.sql` once, then `python scripts/load_chunks.py`. |
| `SNOWFLAKE_CORTEX_MODEL` | Optional: a Cortex model rewrites Summary/History/Seasons into short plain-English text, grounded only on our sources. Leave empty (the team's choice) to show the fact sheets word for word. Safety and reporting text is never rewritten. |
| `TIGER_DATABASE_URL` | Rebuilds the "New" early-warning list (species first recorded in a borough recently) with Tiger Cloud (TimescaleDB + PostGIS). Run `backend/tiger/setup.sql` once, then `python scripts/load_tiger.py` and `python scripts/build_early_warning.py`. The app reads the saved `data/cache/early_warning.json`, never Tiger. Some campus Wi-Fi blocks database ports; use a hotspot if it hangs. |
| `ELEVENLABS_API_KEY` | Lets `make_music.py` generate the background music. |
| `INAT_PLACE_IDS` | Which iNaturalist place(s) to cover. Default `674` = all of NYC; `675` = Queens only; empty = a 2 km circle around Kissena Park + QC. Rerun the fetch scripts after changing it. |

Without these keys, the app uses local keyword search and shows fact-sheet text word for word.

## Deploying to Render

`render.yaml` describes two free web services: `kissena-api` (backend) and `kissena-web` (frontend). The backend only reads the cached data committed in `backend/data/cache`, so it never calls iNaturalist or Snowflake live and needs no API keys.

1. Push your branch to GitHub. In Render, choose **New > Blueprint** and pick this repo and branch.
2. Render asks for the `sync: false` values. Use the addresses Render shows for each service:
   - `kissena-api` → `FRONTEND_ORIGIN` = `https://kissena-web.onrender.com` (add `,http://localhost:3000` to keep local dev working)
   - `kissena-web` → `NEXT_PUBLIC_API_URL` = `https://kissena-api.onrender.com`, `NEXT_PUBLIC_SITE_URL` = `https://kissena-web.onrender.com`
3. If Render gave the services different addresses, fix these values and redeploy the frontend (`NEXT_PUBLIC_` values are baked in at build time).

After that, every push to the deployed branch redeploys automatically. When you change fact sheets, run `scripts/build_insights.py` locally and commit the updated cache; Render doesn't run the scripts.

Free services sleep after ~15 minutes of no visits, so the first load after a break takes up to a minute. Open both URLs a few minutes before a demo.

## Repository layout

```
README.md · CLAUDE.md (ground rules) · .gitignore
docs/
  API.md            backend ↔ frontend contract
  SCORING.md        how danger level and status are computed
  DATA_SOURCES.md   every source with URL and date, plus a decisions log
  ROLES.md          team checklist
  DEMO.md           demo script, venue prep, judge Q&A
backend/
  app/              FastAPI app: data.py (responses), danger.py, status.py, parks.py, rag/ (search + text)
  scripts/          data refresh scripts (see the table above)
  data/             official lists, danger levels, park boundaries, cache/ (see data/README.md)
  knowledge/        sourced fact sheets, one per species (copy _TEMPLATE.md)
  snowflake/        setup.sql for Cortex Search
  tests/            pytest
frontend/
  app/              page.js (the map page), guide/[parkId]/ (printable field guide), layout.js, globals.css (design tokens)
  components/       MapView, SpeciesSidebar, ParkProfile, BrowsePanel, NearMePanel, SearchBox, Quiz, Legend, ReadAloud, ...
  lib/              api.js (every backend call), urlState.js (links), nearby.js (Near you), quiz.js, labels.js, taxa.js, ...
  public/images/    banner photos (openly licensed iNaturalist photos, credited in Hero.jsx)
```

## Team docs

- [docs/DEMO.md](docs/DEMO.md): how to run the demo, the 60-second script, venue prep, and answers to likely judge questions
- [docs/ROLES.md](docs/ROLES.md): who does what (Researcher, Designer, Middle, Backend)
- [docs/API.md](docs/API.md): the backend ↔ frontend contract
- [docs/SCORING.md](docs/SCORING.md): how danger level and status in NYC are computed
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md): every source, with URLs and dates
- [CLAUDE.md](CLAUDE.md): the ground rules (real data only, no AI rankings, no invented sounds…)

## Credits

Sightings, photos (including the banner photos, each credited on screen) and sounds from [iNaturalist](https://www.inaturalist.org) and its observers · Invasive status: NYS DEC 6 NYCRR Part 575 · Plant ranks: New York Non-Native Plant Invasiveness Ranking ([nyis.info](https://nyis.info)) · Park boundaries: [NYC Parks Properties](https://data.cityofnewyork.us/d/enfh-gkve) (NYC Department of Parks and Recreation) · Species fact sheets: NYIS (Cornell / NY Sea Grant), NYS DEC, USGS, WNY PRISM, NY iMapInvasives · Park rules and volunteering: [NYC Parks](https://www.nycgovparks.org/reg/stewardship) · Music generated with ElevenLabs · Map © OpenStreetMap contributors, via [OpenFreeMap](https://openfreemap.org) · Fonts: Source Sans 3 and Source Serif 4 (SIL Open Font License).
