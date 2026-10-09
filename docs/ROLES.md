# Roles

Tick items off as you go. Hacking ends **Sunday Oct 11, 12:00 PM ET**.

Everyone should read [CLAUDE.md](../CLAUDE.md) (the ground rules) and be able to explain [SCORING.md](SCORING.md) to a judge.

## Researcher

Owns: `backend/data/*.csv`, `backend/knowledge/`, `docs/DATA_SOURCES.md`

- [ ] Spot-check `ny_invasive_list.csv` against the DEC list ([islist.pdf](https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf)). Re-check that dec.ny.gov still links the 2014 list.
- [ ] Spot-check 5 rows of `danger_levels.csv` against their ranking-form PDFs (the `source_url` column).
- [ ] Fill in `health_warning` in `danger_levels.csv` **only** where an official source says so (giant hogweed is the classic example, even though it isn't seen at Kissena). Rebuilding with `build_danger_levels.py` keeps your warnings.
- [ ] Decide on the three below-species-level entries (porcelain berry variety, red-eared slider subspecies, Africanized honey bee). Should sightings identified only to the species count? If yes, add the species name to `synonyms` in `ny_invasive_list.csv` and record why in `DATA_SOURCES.md`.
- [ ] Write fact sheets in `knowledge/`, copying `_TEMPLATE.md`. Start with the most-sighted species:
  - [ ] mugwort (*Artemisia vulgaris*)
  - [ ] mute swan (*Cygnus olor*)
  - [ ] lesser celandine (*Ficaria verna*)
  - [ ] multiflora rose (*Rosa multiflora*)
  - [ ] garlic mustard (*Alliaria petiolata*)
  - [ ] black locust (*Robinia pseudoacacia*)
  - [ ] common reed (*Phragmites australis*)
  - [ ] Norway maple (*Acer platanoides*)
  - [ ] oriental bittersweet (*Celastrus orbiculatus*)
  - [ ] Japanese knotweed (*Reynoutria japonica*)
  - [ ] monk parakeet (*Myiopsitta monachus*)
  - [ ] Japanese hops (*Humulus japonicus*)
  - [ ] cup-plant (*Silphium perfoliatum*)
  - [ ] Amur honeysuckle (*Lonicera maackii*)
  - [ ] spongy moth (*Lymantria dispar*)
- [ ] Write one general file, `how-to-report.md` (iMapInvasives / NYC Parks reporting).
- [ ] Use only official sources (NYS DEC, NYS Ag & Markets, NYC Parks, PRISMs, Cornell, iMapInvasives). Leave a section empty rather than guess.
- [ ] Set `touch_safe` only when a source explicitly says whether it's safe to touch.
- [ ] Log every source in `docs/DATA_SOURCES.md` with its URL and the date you accessed it.

## Designer

Owns: `frontend/app/globals.css`, icons, logo, Devpost images

- [ ] Learn the basics: run the frontend, edit `globals.css`, and watch it update.
- [ ] Pick the palette and type. Change only the tokens in `:root` in `globals.css`. Keep the danger colors readable for color-blind users (the meter also shows the level as a number of filled bars).
- [ ] Replace the emoji map icons in `frontend/lib/taxa.js` (plant, bird, insect, fish, mollusk, crab/other).
- [ ] Design the sidebar: slideshow, danger badge, "How we score" panel, season chart, empty states.
- [ ] Check the phone layout (the bottom sheet) and keyboard focus styles.
- [ ] Logo and Devpost images in Canva.
- [ ] Don't remove any credits or attribution text. The licenses require them.

## Middle (frontend ↔ backend)

Owns: `frontend/lib/api.js`, `docs/API.md`, `frontend/components/`

- [ ] Keep `lib/api.js` and `docs/API.md` in sync: every fetch goes through `api.js`.
- [ ] Map → sidebar flow: loading skeleton, error message, Escape/✕ to close.
- [ ] Decide on the default zoom. At 15 (the current default) every icon shows at once, and at 14 the map opens on clusters. Set it in `frontend/.env.local`.
- [ ] Music toggle works once `background.mp3` exists (Backend runs `make_music.py`).
- [ ] Optional: a species list / search panel using `getSpeciesList()`.
- [ ] Optional: a "How we score" page built from `docs/SCORING.md`.

## Backend

Owns: `backend/`

- [ ] Keep `pytest` green, and the app starting **with no keys**.
- [ ] Re-run the fetch scripts before the demo (fetch_observations → fetch_media → fetch_seasonality), then commit the cache.
- [ ] Snowflake search: create a PAT (your user needs a network policy), run `snowflake/setup.sql`, then run `scripts/load_chunks.py`, and check that `/api/health` says `"retriever": "snowflake"`.
- [ ] Snowflake writing: set `SNOWFLAKE_CORTEX_MODEL` to a model available in your region, then run `build_insights.py`. Check that `/api/health` says `"rag_mode": "cortex"`, and read the output: it must use only the fact sheets.
- [ ] ElevenLabs: set the key, run `scripts/make_music.py` once, and commit `background.mp3` and `background.credit.json`.
- [ ] Optional: `POST /api/ask` (grounded Q&A, see `docs/API.md`).
- [ ] After every change to `knowledge/`, run `build_insights.py` and restart the backend.

## Before the demo (everyone)

- [ ] Fresh clone → README quick start works.
- [ ] Turn the Wi-Fi off and check: sightings, danger levels, status, charts and sidebar text still load (all cached). Map tiles, photos and sounds come from the internet, so pan around the map and open a few species *before* the demo to warm the browser cache, or bring a phone hotspot.
- [ ] Each person can explain: where danger levels come from, why some species are "Not yet ranked", and why most species have no sound.
