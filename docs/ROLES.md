# Roles

Tick items off as you go. Hacking ends **Sunday Oct 11, 12:00 PM ET**.

Everyone should read [CLAUDE.md](../CLAUDE.md) (the ground rules) and be able to explain [SCORING.md](SCORING.md) to a judge.

**Presenting?** Follow [DEMO.md](DEMO.md): run `npm run demo`, practice the 60-second script, and learn the Q&A answers.

## Where we are (Oct 9, night)

- ✅ Map covers **all of Queens** (iNaturalist place 675): 14,620 sightings of 76 listed species. Privacy-blurred sightings are counted but not drawn (they'd land in the wrong town).
- ✅ Danger levels come from official NY data (151 species ranked). Tests pass.
- ✅ Fact sheets drafted for **all 76 species** in `backend/knowledge/`, plus `how-to-report.md` with the verified NYC Parks rules. 278 sections loaded into Snowflake.
- ✅ Snowflake RAG is live: Cortex Search finds the right fact-sheet section for each species, and the sidebar shows that text **word for word** (Cortex rewriting is off; see the decision below).
- ✅ Code is on GitHub: <https://github.com/musfiratpx/sail>.
- ⏳ Not done: fact-sheet drafts need human review, real design, background music, and the latest local commits still need pushing.

## Team decisions

- [x] **Cortex rewriting is OFF** (decided Oct 9). `SNOWFLAKE_CORTEX_MODEL` is empty, so `/api/health` shows `"retriever": "snowflake"` and `"rag_mode": "extractive"`. Why: in testing, Cortex added small details the sources don't say (e.g. "seeds *annually*"). What to tell judges: *Snowflake Cortex Search retrieves the right section of our sourced fact sheets; we show that text exactly, so nothing on screen is invented.* To turn it back on: set the model in `backend/.env` and rerun `build_insights.py`.

## Researcher

Owns: `backend/data/*.csv`, `backend/knowledge/`, `docs/DATA_SOURCES.md`

- [x] Official NY invasive list (`ny_invasive_list.csv`) and danger levels (`danger_levels.csv`) built from DEC + nyis.info.
- [x] Fact sheets drafted for all 76 Queens species (see the table in `DATA_SOURCES.md`).
- [x] `how-to-report.md` written; NYC Parks rule (56 RCNY §1-04) verified and added.
- [ ] **Ask NYS DEC** what people should do if they catch a northern snakehead or Chinese mitten crab in a NYC park: NYIS says kill/destroy it, but NYC Parks rules say freshwater fish must be released (details in the `DATA_SOURCES.md` decisions log). Update `channa-argus.md` and `eriocheir-sinensis.md` with the answer.
- [ ] **Review every fact sheet against its sources.** Use [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md): every sentence as a checkbox, with its sources, most-sighted first (top 10 = 71% of sightings, top 20 = 90%). Split the groups between people. When a sheet is checked, put your name on its `reviewed_by:` line (top of the file) **and** in the "Written by" column of `DATA_SOURCES.md`. The app shows "📝 Draft" on every species until then; after that the note disappears (restart the backend to see it; no rebuild needed). Your name isn't shown in the app. Start with the most-sighted: mugwort, mute swan, lesser celandine, multiflora rose, garlic mustard, black locust, *Phragmites*, Norway maple.
- [ ] Fill the thinnest sheets if you find official sources: European rabbit (only its legal status), monk parakeet, green crab, rapa whelk, Asian shore crab, Japanese chaff flower, kudzu, and the plants with no "Seasonal differences".
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
- [x] Map opens on all of Queens (zoom 12, clusters); icons appear from zoom 15. Only on-screen icons are drawn, so 14,620 points stay fast.
- [ ] Music toggle works once `background.mp3` exists (Backend runs `make_music.py`). Until then the button is hidden.
- [ ] Optional: a species list / search panel using `getSpeciesList()` (see "Backend human discussion" below).
- [ ] Optional: a "How we score" page built from `docs/SCORING.md`.

## Backend

Owns: `backend/`

- [x] Snowflake search: PAT works, `setup.sql` run, 145 chunks loaded, `/api/health` says `"retriever": "snowflake"`.
- [x] Cortex rewriting tested (COMPLETE through SQL works; the REST chat endpoint is blocked on our trial account), then turned off by team decision. Sidebar text rebuilt word for word with Snowflake search.
- [x] Rebuilt `backend/data/cache/insights/` committed (word-for-word text).
- [ ] Push the local commits to GitHub (`git push`).
- [ ] Tidy `backend/.env.example`: the Oct 9 commit added a stray VS Code message as a comment and removed the explanation comments. Keep values empty; `export ` in front is fine.
- [ ] After every change to `knowledge/`: run `python scripts/load_chunks.py`, then `python scripts/build_insights.py` (fast with rewriting off), then restart the backend and commit `data/cache/insights/`.
- [ ] Keep `pytest` green, and the app starting **with no keys**.
- [ ] Re-run the fetch scripts before the demo (fetch_observations → fetch_media → fetch_seasonality), then commit the cache.
- [ ] ElevenLabs: set `ELEVENLABS_API_KEY`, run `scripts/make_music.py` once, and commit `background.mp3` and `background.credit.json`.
- [ ] After the demo: suspend the `COMPUTE_WH` warehouse (or drop the `KNOWLEDGE_SEARCH` service) so it stops using Snowflake credits.
- [ ] Optional: `POST /api/ask` (grounded Q&A, see `docs/API.md`).

## Backend human discussion

- [ ] Search function / filter that sorts by type (plant, bird, insect, fish…). `GET /api/species` already returns `iconic_taxon` for each species, so this can be done in the frontend without backend changes.

## Before the demo (everyone)

- [ ] Pull before you start working (`git pull`), and push often. The repo is <https://github.com/musfiratpx/sail>.
- [ ] Fresh clone → README quick start works.
- [ ] Turn the Wi-Fi off and check: sightings, danger levels, status, charts and sidebar text still load (all cached). Map tiles, photos and sounds come from the internet, so pan around the map and open a few species *before* the demo to warm the browser cache, or bring a phone hotspot.
- [ ] Each person can explain: where danger levels come from, why some species are "Not yet ranked", why most species have no sound, and what Snowflake does (Cortex Search finds the right fact-sheet section, and the app shows it word for word; Cortex doesn't reword it. The fact sheets themselves were drafted with an AI assistant from official sources and are marked "Draft" until a teammate checks them).
