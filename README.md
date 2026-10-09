# Kissena Invasive Watch

An interactive map of **invasive species around Kissena Park and Queens College** (Flushing, Queens, NYC), built at **HackKnight 2026**.

Click any sighting on the map to see what the species is, how dangerous it is (from official New York rankings, never AI), whether it's common or spreading here, when it shows up during the year, and how to handle it. Every fact links to its source.

## How it works

```
 iNaturalist API ──► backend/scripts/fetch_*.py ──► backend/data/cache/  (CSV + JSON, committed)
 NYS DEC Part 575 list ─┐                                   │
 nyis.info rank forms ──┴► backend/data/*.csv               │
                                                            ▼
 backend/knowledge/*.md ─► RAG (keyword or Snowflake        FastAPI  (backend/app/)
   (Researcher's fact      Cortex Search → extractive  ──►  /api/species, /api/map/observations
    sheets)                or Gemini) → cache/insights/          │
                                                                 ▼
                                               Next.js + Leaflet  (frontend/)
                                               map → clusters/icons → species sidebar
```

- **The app reads only cached files.** It never calls iNaturalist or an AI service while running, so the demo works even if the Wi-Fi drops.
- **Invasive status** comes only from the NYS DEC 6 NYCRR Part 575 list.
- **Danger level** comes only from official NY ranks (see [docs/SCORING.md](docs/SCORING.md)).
- **No API keys are needed** to run the app. Keys only switch on the optional extras: Gemini, Snowflake and the ElevenLabs music.

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

Open <http://localhost:3000>.

**3. Tests**

```bash
cd backend && source .venv/bin/activate && pytest
```

## Refreshing the data (optional)

The cached data is already in git. To update it, run these from `backend/` with the venv active, in this order:

| Script | What it does |
|---|---|
| `python scripts/fetch_observations.py` | Sightings of NY-listed species within 2 km of Kissena Park and QC |
| `python scripts/fetch_media.py` | Photos and real sound recordings, with credits |
| `python scripts/fetch_seasonality.py` | Sightings per month (Kissena + QC, and all of NYC) |
| `python scripts/build_insights.py` | Sidebar text from the fact sheets in `knowledge/` |
| `python scripts/build_danger_levels.py` | Rebuilds `danger_levels.csv` from the official sources |
| `python scripts/make_music.py` | One-time background music (needs `ELEVENLABS_API_KEY`) |

Restart the backend afterwards. The iNaturalist scripts go through `pyinaturalist`, which keeps us around 1 request per second.

## Optional services (`backend/.env`)

| Setting | Turns on |
|---|---|
| `GEMINI_API_KEY` + `GEMINI_MODEL` | Gemini rewrites fact-sheet sections into short plain-English text (still grounded only on our sources). |
| `SNOWFLAKE_*` | Retrieval through Snowflake Cortex Search. Run `backend/snowflake/setup.sql` once, then `python scripts/load_chunks.py`. |
| `ELEVENLABS_API_KEY` | Lets `make_music.py` generate the background music. |
| `INAT_PLACE_IDS` | Use exact iNaturalist park boundaries instead of the 2 km circle (leaves out QC). |

Without these keys, the app uses local keyword search and shows fact-sheet text word for word.

## Repository layout

```
README.md, CLAUDE.md (ground rules), .gitignore
docs/      API.md · ROLES.md · DATA_SOURCES.md · SCORING.md
backend/   app/ (FastAPI + RAG) · scripts/ · data/ · knowledge/ · snowflake/ · tests/
frontend/  app/ · components/ · lib/api.js · public/audio/
```

## Team docs

- [docs/ROLES.md](docs/ROLES.md): who does what (Researcher, Designer, Middle, Backend)
- [docs/API.md](docs/API.md): the backend ↔ frontend contract
- [docs/SCORING.md](docs/SCORING.md): how danger level and Kissena status are computed
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md): every source, with URLs and dates
- [CLAUDE.md](CLAUDE.md): the ground rules (real data only, no AI rankings, no invented sounds…)

## Credits

Sightings, photos and sounds from [iNaturalist](https://www.inaturalist.org) and its observers · Invasive status: NYS DEC 6 NYCRR Part 575 · Plant ranks: New York Non-Native Plant Invasiveness Ranking (nyis.info) · Music generated with ElevenLabs · Map © OpenStreetMap contributors.
