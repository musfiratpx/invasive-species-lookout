# Invasive Species Lookout (ISL)

An interactive map of **invasive species across New York City**, built at **HackKnight 2026** (Queens College). It started around Kissena Park and Queens College, grew to all of Queens, and now covers all five boroughs of New York City: **83 New York–listed invasive species and 72,899 research-grade sightings**.

Every fact links to its source. Danger levels come from official New York rankings, never from AI.

![Kissena Park profile: the park's outline on the map with its sightings, and a panel listing 31 listed invasive species, 16 of them Very High risk](docs/screenshot.jpg)

## What you can do

- **Explore the map.** Sightings are grouped into numbered bubbles that split as you zoom in. Hover a bubble to preview the species inside; zoom to street level to see every sighting at its own spot.
- **Learn about a species.** Tap an icon to see photos, its danger level explained in plain words, its legal status in New York, when it shows up during the year, its history, how to handle it, and its sources. A real recording plays only for the few species that have one.
- **Search and browse** from one box: click it to see every species or park as a list you can sort (most seen, most dangerous, biggest park, A–Z), and type to narrow it down. Enter opens the top match.
- **Open a park profile**, for example Kissena Park: its official boundary, which listed species have been seen there, how dangerous they are, when people see them, and the latest sightings.
- **Print a park field guide** (`/guide/Q024`): one page with the park's most-reported species, credited photos, danger levels, how to report, and QR codes back to the live map.
- **Report it, don't pull it.** Every species and park explains NYC Parks' rule against removing plants or animals, links to NY iMapInvasives for reporting, and to official NYC Parks volunteer programs.
- **Spot the species**: a 10-question photo quiz with real, credited iNaturalist photos and look-alike answers. "Copy my score" shares the result with a link to the quiz.
- **Filter** by danger level or type (plants, birds, insects, fish and shellfish, other animals) from the **Types** dropdown.
- **Share any view**: links like `/?park=Q024` (Kissena Park), `/?species=6921` (Mute Swan) or `/?quiz=1` open the app on that view, and the browser's Back button closes panels one step at a time.
- **Find me** shows where you are on the map; the location stays in your browser.
- **Accessible**: works with a keyboard and screen readers, respects "reduce motion", and uses large tap targets on phones.

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

- **The app reads only cached files.** It never calls iNaturalist or an AI service while running, so the demo works even if the Wi-Fi drops. (Map tiles and photos still need internet.)
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

`render.yaml` describes two free web services: `isl-api` (backend) and `isl-web` (frontend). The backend only reads the cached data committed in `backend/data/cache`, so it never calls iNaturalist or Snowflake live and needs no API keys.

1. Push your branch to GitHub. In Render, choose **New > Blueprint** and pick this repo and branch.
2. Render asks for the `sync: false` values. Use the addresses Render shows for each service:
   - `isl-api` → `FRONTEND_ORIGIN` = `https://isl-web.onrender.com` (add `,http://localhost:3000` to keep local dev working)
   - `isl-web` → `NEXT_PUBLIC_API_URL` = `https://isl-api.onrender.com`, `NEXT_PUBLIC_SITE_URL` = `https://isl-web.onrender.com`
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
  components/       MapView, SpeciesSidebar, ParkProfile, BrowsePanel, SearchBox, Quiz, Legend, ReportDontPull, ...
  lib/              api.js (every backend call), urlState.js (links), quiz.js, labels.js, meanings.js, dates.js, ...
```

## Team docs

- [docs/DEMO.md](docs/DEMO.md): how to run the demo, the 60-second script, venue prep, and answers to likely judge questions
- [docs/ROLES.md](docs/ROLES.md): who does what (Researcher, Designer, Middle, Backend)
- [docs/API.md](docs/API.md): the backend ↔ frontend contract
- [docs/SCORING.md](docs/SCORING.md): how danger level and status in NYC are computed
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md): every source, with URLs and dates
- [CLAUDE.md](CLAUDE.md): the ground rules (real data only, no AI rankings, no invented sounds…)

## Credits

Sightings, photos and sounds from [iNaturalist](https://www.inaturalist.org) and its observers · Invasive status: NYS DEC 6 NYCRR Part 575 · Plant ranks: New York Non-Native Plant Invasiveness Ranking ([nyis.info](https://nyis.info)) · Park boundaries: [NYC Parks Properties](https://data.cityofnewyork.us/d/enfh-gkve) (NYC Department of Parks and Recreation) · Species fact sheets: NYIS (Cornell / NY Sea Grant), NYS DEC, USGS, WNY PRISM, NY iMapInvasives · Park rules and volunteering: [NYC Parks](https://www.nycgovparks.org/reg/stewardship) · Music generated with ElevenLabs · Map © OpenStreetMap contributors.
