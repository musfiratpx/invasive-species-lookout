# Invasive Species Lookout (ISL)

An interactive map of **invasive species across New York City**, built at **HackKnight 2026** (Queens College). It started around Kissena Park and Queens College, grew to all of Queens, and now covers all five boroughs of New York City: **83 New York–listed invasive species and 72,899 research-grade sightings**.

Every fact has links to the source, and danger levels are from official rankings. Not made up from AI. 

**Made by: Musfirat, Jaicee, Moses

**Try it live: <https://invasive.surf>** (or [run it on your own computer](#run-it-on-your-own-computer)).

![The home page of invasive.surf: a full-screen banner over a credited iNaturalist photo of multiflora rose, with the headline "There are more invasive species in NYC than you think" and totals (72,899 sightings, 83 listed species, 460 parks); below it, the map of all five boroughs with numbered sighting bubbles, a toolbar with search, Near me, Quiz, Music and Full screen, and the danger-level filter](docs/screenshot.jpg)

## What you can do

- **Explore the map.** Sightings are grouped into numbered bubbles that split as you zoom in. Hover a bubble to preview the species inside; zoom to street level to see every sighting at its own spot. The map stays around New York City, and scrolling over it moves the page until you click the map (so you never get stuck in it).
- **See what's near you.** Press **Near me**: the map zooms to your location & and a photo grid lists species reported within 500 m, 1 km or 2 km, most-reported first, with how close and how recently. Your location stays in your browser. IT'S NOT SENT ANYWHERE!
- **Learn about a species.** Tap an icon to open a big credited photo with the name and danger level on it, then the danger level explained in plain words, its legal status in New York, when it shows up during the year, reports per year (with a note that these are reports, not a survey), its history, look-alikes, how to handle it, and its sources. A real recording plays only for the few species that have one. 
- **Listen instead of reading.** A small 🔊 after each paragraph reads  that paragraph aloud with built-in text to speech.
- **Search and browse**click it to see every species (with a photo on each row) or park as a list you can sort (most seen, most dangerous, biggest park, A–Z), filter species with danger and plants & animals chips, and type to narrow it down, with the matching letters highlighted. Type a group like "birds", "plants", "fish" or "animals" to see that whole group. Enter opens the top match.
- **See what's new.** The **New** tab in Browse lists species recorded in a borough for the first time in the last two years (for example, a fish first reported in Queens), with a link to that first sighting on iNaturalist.
- **Open a park profile**, you can see its official boundary, a photo grid of the listed species seen there, how dangerous they are, when people see them, and the latest sightings.
- **Print a park field guide** (`/guide/Q024`): one page with the park's most-reported species, credited photos, danger levels, a "Spotted it" box to tick on your walk, how to report, and QR codes back to the live map.
- **Report it** Every species and park explains NYC Parks' rule against removing plants or animals, links to NY iMapInvasives for reporting, and to official NYC Parks volunteer programs.
- **Spot the species**: There's a 10-question quiz feature with credited iNaturalist photos and look-alike answers. At the end there's a "Learn more" link for each species you miss. You can share the results!
- **Filter** the map by when it was seen, danger level, and kind from the **Plants & animals** dropdown.

## How it works

The app has two parts: a **backend** (Python, FastAPI) that serves the data, and a **frontend** (Next.js + Leaflet) that draws the map and panels in your browser. The data is collected ahead of time by scripts and saved as files in the repo, so the app itself never waits on another website.

**1. Collect the data (scripts, run now and then by the team)**

- `fetch_observations.py` downloads research-grade iNaturalist sightings of every species on the New York invasive list, across NYC.
- `fetch_media.py` gets credited photos and real sound recordings; `fetch_parks.py` and `assign_parks.py` get official park boundaries and work out which park each sighting is in.
- Danger levels come from official New York rankings (`data/danger_levels.csv`), and invasive status from the NYS DEC list (`data/ny_invasive_list.csv`).
- `build_insights.py` pulls each species' text (history, how to handle it, look-alikes...) from our sourced fact sheets in `backend/knowledge/`. Snowflake Cortex Search finds the right section, or simple keyword search without Snowflake.
- `load_tiger.py` + `build_early_warning.py` put every sighting in Tiger Cloud (TimescaleDB + PostGIS), work out which borough each one is in, and find species first recorded in a borough recently (the **New** tab).

Everything ends up as CSV and JSON files in `backend/data/`, committed to git.

**2. Serve it (backend)**

FastAPI reads those files once and answers the frontend: `/api/map/observations`, `/api/species`, `/api/parks`, `/api/early-warning` and more (see [docs/API.md](docs/API.md)).

**3. Show it (frontend)**

Next.js asks the backend for the data and draws the map, search, Browse, species panels, park profiles, quiz and field guide.

```
 iNaturalist ──────────► fetch_*.py ─────────────┐
 NYS DEC list, NY ranks ─► data/*.csv             │
 NYC Parks + boroughs ───► fetch_parks/boroughs ──┼─► backend/data/  (CSV + JSON, committed)
 knowledge/*.md ─────────► build_insights.py ─────┤        │
   (Snowflake Cortex Search or keywords)          │        ▼
 Tiger Cloud (TimescaleDB + PostGIS) ─► build_early_warning.py     FastAPI (backend/app/)
                                                           │
                                                           ▼
                                   Next.js + Leaflet (frontend/)  →  your browser
```

- **The app reads only cached files.** It never calls iNaturalist or an AI service while running, so the demo works even if the Wi-Fi drops. The banner photos and fonts are saved in the app too. (Map tiles and species photos still need internet.)
- **Invasive status** comes only from the NYS DEC 6 NYCRR Part 575 list.
- **Danger level** comes only from official NY ranks. See [docs/SCORING.md](docs/SCORING.md).
- **Species text** comes only from our sourced fact sheets in `backend/knowledge/`, shown word for word. Snowflake Cortex Search finds the right section.

## Run it on your own computer

You don't need any accounts or API keys: all the data is already in the repo. You need:

- [Git](https://git-scm.com/downloads)
- [Python 3.11 or newer](https://www.python.org/downloads/) (on Windows, tick "Add Python to PATH" when installing)
- [Node.js 20 or newer](https://nodejs.org/) (the LTS version is fine)

You'll run the backend and the frontend at the same time, each in its own terminal window.

**1. Get the code**

```bash
git clone https://github.com/musfiratpx/invasive-species-lookout.git
cd invasive-species-lookout
```

**2. Start the backend** (terminal 1)

Mac / Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Windows (PowerShell):

```powershell
cd backend
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned   # lets PowerShell run the activate script
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Leave it running. Check it at <http://localhost:8000/api/health>: you should see `"ok": true`. The interactive API docs are at <http://localhost:8000/docs>.

**3. Start the frontend** (terminal 2, from the `invasive-species-lookout` folder)

```bash
cd frontend
npm install
cp .env.local.example .env.local     # Windows PowerShell: copy .env.local.example .env.local
npm run dev
```

**4. Open <http://localhost:3000>.** The map takes a few seconds to load all 72,899 sightings. For a demo, the production build is faster: `npm run demo` (see [docs/DEMO.md](docs/DEMO.md)).

**Next time,** you only need to activate the venv and run `uvicorn app.main:app --reload` in `backend/`, and `npm run dev` in `frontend/`. After a `git pull`, run `pip install -r requirements.txt` and `npm install` again in case someone added a package.

**If something goes wrong**

| Problem | Fix |
|---|---|
| The page says it can't reach the backend, or the map stays empty | Make sure terminal 1 is still running and <http://localhost:8000/api/health> works. `frontend/.env.local` should have `NEXT_PUBLIC_API_URL=http://localhost:8000`. |
| `Module not found: Can't resolve ...` | A package was added. Stop the frontend, run `npm install`, start it again. |
| `ModuleNotFoundError: No module named ...` | The venv isn't active, or a package was added. Activate it and run `pip install -r requirements.txt`. |
| PowerShell says "running scripts is disabled" | Run the `Set-ExecutionPolicy -Scope Process ...` line above, then activate again. |
| "Address already in use" / port 8000 or 3000 is taken | Another copy is already running. Close the old terminal, or stop it with Ctrl+C. |

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
| `python scripts/fetch_boroughs.py` | Official borough outlines (NYC Department of City Planning) |
| `python scripts/load_tiger.py` | Uploads sightings and boroughs to Tiger Cloud (needs `TIGER_DATABASE_URL`) |
| `python scripts/build_early_warning.py` | The "New" list: species first recorded in a borough recently |
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
  tiger/            setup.sql for Tiger Cloud (the "New" early-warning list)
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

Sightings, photos (including the banner photos, each credited on screen) and sounds from [iNaturalist](https://www.inaturalist.org) and its observers · Invasive status: NYS DEC 6 NYCRR Part 575 · Plant ranks: New York Non-Native Plant Invasiveness Ranking ([nyis.info](https://nyis.info)) · Park boundaries: [NYC Parks Properties](https://data.cityofnewyork.us/d/enfh-gkve) (NYC Department of Parks and Recreation) · Borough boundaries: [NYC Department of City Planning](https://data.cityofnewyork.us/d/gthc-hcne) · Early-warning list built with [Tiger Cloud](https://www.tigerdata.com) (TimescaleDB + PostGIS) · Species fact sheets: NYIS (Cornell / NY Sea Grant), NYS DEC, USGS, WNY PRISM, NY iMapInvasives · Park rules and volunteering: [NYC Parks](https://www.nycgovparks.org/reg/stewardship) · Music generated with ElevenLabs · Map © OpenStreetMap contributors, via [OpenFreeMap](https://openfreemap.org) · Fonts: Source Sans 3 and Source Serif 4 (SIL Open Font License).
