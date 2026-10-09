# Roles

Tick items off as you go. Hacking ends **Sunday Oct 11, 12:00 PM ET**.

Everyone should read [CLAUDE.md](../CLAUDE.md) (the ground rules) and be able to explain [SCORING.md](SCORING.md) to a judge.

## Where we are (Oct 9, evening)

- ✅ Map, clusters/icons and sidebar work end to end with real data: 778 sightings, 39 listed species around Kissena Park + Queens College.
- ✅ Danger levels come from official NY data (151 species ranked). Tests pass.
- ✅ Fact sheets drafted for **all 39 species** in `backend/knowledge/`, plus `how-to-report.md` with the verified NYC Parks rules.
- ✅ Snowflake RAG is live: Cortex Search finds fact-sheet sections; Cortex COMPLETE rewrites Summary/History/Seasons. "How to handle it" and "How to report it" are always shown word for word (safety).
- ⏳ Not done: drafts need human review, Cortex output needs checking, real design, background music.

## Team decision (needed today)

- [ ] **Keep Cortex rewriting, or turn it off?** Cortex sometimes adds small details the sources don't say (e.g. "seeds *annually*"). Options:
  - Keep it: someone must read all 39 species' Summary/History/Seasons before the demo (Researcher + Backend).
  - Turn it off: clear `SNOWFLAKE_CORTEX_MODEL` in `backend/.env` and rerun `build_insights.py`. Snowflake Cortex Search still does retrieval, and text stays exactly as sourced.

## Researcher

Owns: `backend/data/*.csv`, `backend/knowledge/`, `docs/DATA_SOURCES.md`

- [x] Official NY invasive list (`ny_invasive_list.csv`) and danger levels (`danger_levels.csv`) built from DEC + nyis.info.
- [x] Fact sheets drafted for all 39 species (see the table in `DATA_SOURCES.md`).
- [x] `how-to-report.md` written; NYC Parks rule (56 RCNY §1-04) verified and added.
- [ ] **Review every fact sheet against its sources.** In `DATA_SOURCES.md`, change "Claude (draft), needs Researcher review" to your name when a sheet is checked. Start with the most-sighted: mugwort, mute swan, lesser celandine, multiflora rose, garlic mustard, black locust, *Phragmites*, Norway maple.
- [ ] If Cortex rewriting stays on: read each species' Summary/History/Seasons in the app and flag anything the fact sheet doesn't say.
- [ ] Fill the thinnest sheets if you find official sources: monk parakeet (only summary + history), Asian shore crab and Japanese chaff flower (no handling advice), and the 8 form-only plants with no "Seasonal differences".
- [ ] Replace the monk parakeet source (currently a *proposed* 2021 NY bill) with Cornell All About Birds or a DEC page. Open them in a browser; they block automated access.
- [ ] Spot-check 5 rows of `danger_levels.csv` against their ranking-form PDFs (the `source_url` column).
- [ ] Fill in `health_warning` in `danger_levels.csv` **only** where an official source says so. Rebuilding with `build_danger_levels.py` keeps your warnings.
- [ ] Decide on the three below-species-level entries (porcelain berry variety, red-eared slider subspecies, Africanized honey bee). Record the decision in `DATA_SOURCES.md`.
- Rules for any new text: official sources only, leave a section empty rather than guess, set `touch_safe` only when a source explicitly says so, log every source in `DATA_SOURCES.md`.
- After editing any file in `knowledge/`: tell Backend (they need to run `load_chunks.py` and `build_insights.py`).

## Designer

Owns: `frontend/app/globals.css`, icons, logo, Devpost images

- [ ] Learn the basics: run the frontend, edit `globals.css`, and watch it update.
- [ ] Pick the palette and type. Change only the tokens in `:root` in `globals.css`. Keep the danger colors readable for color-blind users (the meter also shows the level as a number of filled bars).
- [ ] Replace the emoji map icons in `frontend/lib/taxa.js` (plant, bird, insect, fish, mollusk, crab/other).
- [ ] Design the sidebar: slideshow, danger badge, "How we score" panel, season chart, "Sources say: do not touch" warning, empty states ("No information in our sources yet").
- [ ] Check the phone layout (the bottom sheet) and keyboard focus styles.
- [ ] Logo and Devpost images in Canva.
- [ ] Don't remove any credits or attribution text. The licenses require them.

## Middle (frontend ↔ backend)

Owns: `frontend/lib/api.js`, `docs/API.md`, `frontend/components/`

- [x] Map → sidebar flow with loading skeleton, error message, Escape/✕ to close.
- [x] "How to report it" section added to the sidebar.
- [ ] Keep `lib/api.js` and `docs/API.md` in sync: every fetch goes through `api.js`.
- [ ] Decide on the default zoom. At 15 (the current default) every icon shows at once; at 14 the map opens on clusters. Set it in `frontend/.env.local`.
- [ ] Music toggle works once `background.mp3` exists (Backend runs `make_music.py`).
- [ ] Optional: a species list / search panel using `getSpeciesList()` (see "Backend human discussion" below).
- [ ] Optional: a "How we score" page built from `docs/SCORING.md`.

## Backend

Owns: `backend/`

- [x] Snowflake search: PAT works, `setup.sql` run, 145 chunks loaded, `/api/health` says `"retriever": "snowflake"`.
- [x] Snowflake writing: `SNOWFLAKE_CORTEX_MODEL=claude-haiku-4-5`, `/api/health` says `"rag_mode": "cortex"`. (Uses COMPLETE through SQL; the REST chat endpoint is blocked on our trial account.)
- [ ] Apply the team decision on Cortex rewriting (above).
- [ ] After every change to `knowledge/`: run `python scripts/load_chunks.py`, then `python scripts/build_insights.py` (~4 min with Cortex), then restart the backend and commit `data/cache/insights/`.
- [ ] Keep `pytest` green, and the app starting **with no keys**.
- [ ] Re-run the fetch scripts before the demo (fetch_observations → fetch_media → fetch_seasonality), then commit the cache.
- [ ] ElevenLabs: set `ELEVENLABS_API_KEY`, run `scripts/make_music.py` once, and commit `background.mp3` and `background.credit.json`.
- [ ] After the demo: suspend the `COMPUTE_WH` warehouse (or drop the `KNOWLEDGE_SEARCH` service) so it stops using Snowflake credits.
- [ ] Optional: `POST /api/ask` (grounded Q&A, see `docs/API.md`).

## Backend human discussion

- [ ] Search function / filter that sorts by type (plant, bird, insect, fish…). `GET /api/species` already returns `iconic_taxon` for each species, so this can be done in the frontend without backend changes.

## Before the demo (everyone)

- [ ] Push to GitHub (nothing has been pushed yet).
- [ ] Fresh clone → README quick start works.
- [ ] Turn the Wi-Fi off and check: sightings, danger levels, status, charts and sidebar text still load (all cached). Map tiles, photos and sounds come from the internet, so pan around the map and open a few species *before* the demo to warm the browser cache, or bring a phone hotspot.
- [ ] Each person can explain: where danger levels come from, why some species are "Not yet ranked", why most species have no sound, and what Snowflake does (Cortex Search finds the right fact-sheet section; safety text is never AI-written).
