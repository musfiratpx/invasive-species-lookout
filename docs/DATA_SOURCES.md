# Data sources

Every source the app uses, with the date it was checked. **The Researcher keeps this file up to date.** Add a row whenever you add a fact sheet or change a data file.

For file-by-file details, see [backend/data/README.md](../backend/data/README.md).

## Official lists and rankings

| Source | Used for | URL | Checked |
|---|---|---|---|
| NYS DEC, 6 NYCRR Part 575 Prohibited and Regulated Invasive Species (list dated Sept 10, 2014; in effect since Mar 10, 2015) | Which species count as invasive; prohibited vs regulated | <https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf> | 2026-10-09 |
| NYS DEC invasive species regulations page | Confirms islist.pdf is the current printable list | <https://dec.ny.gov/nature/invasive-species/resources-regulations/regulations> | 2026-10-09 |
| NYS DEC prohibited & regulated plants booklet | Cross-check of plant names and synonyms | <https://dec.ny.gov/docs/lands_forests_pdf/isprohibitedplants2.pdf> | 2026-10-09 |
| NYS DEC prohibited & regulated animals booklet | Cross-check of animal names | <https://dec.ny.gov/docs/lands_forests_pdf/isprohibitedanimals.pdf> | 2026-10-09 |
| New York Non-Native Plant Invasiveness Ranking Forms, nyis.info (183 forms) | Plant danger levels (rank + score) | Listed per species in `backend/data/sources/nyis_plant_ranks.csv` | 2026-10-09 |
| NYS Ag & Markets announcement (2016) | Cross-check: 69 prohibited + 6 regulated plants | <https://agriculture.ny.gov/node/11711> | 2026-10-09 |

## Sightings, photos, sounds

| Source | Used for | URL | Checked |
|---|---|---|---|
| iNaturalist API (via pyinaturalist), research-grade observations | Sightings, photos, sounds, monthly counts | <https://api.inaturalist.org/v1/docs/> | 2026-10-09 |
| iNaturalist places: New York City (674), New York State (48), Kissena Park (125479), Kissena Corridor Park (125415) | Area fallbacks for photos and sounds | <https://www.inaturalist.org/places> | 2026-10-09 |

Each photo and sound carries its own attribution, license and observation link in `backend/data/cache/media.json`.

## Map and music

| Source | Used for | URL |
|---|---|---|
| OpenStreetMap tiles | Base map | <https://www.openstreetmap.org/copyright> |
| ElevenLabs Music API | Background music only (prompt saved in `frontend/public/audio/background.credit.json`) | <https://elevenlabs.io/docs/api-reference/music/compose> |

## Fact sheets (`backend/knowledge/`)

| Species / file | Sources used | Accessed | Written by |
|---|---|---|---|
| `how-to-report.md` (general) | NY iMapInvasives "Report an Invasive" (NY Natural Heritage Program: SUNY ESF + NYS DEC), <https://www.nyimapinvasives.org/report> | 2026-10-09 | Claude (draft), needs Researcher review |
| `artemisia-vulgaris.md` (mugwort) | NYIS species profile <https://nyis.info/species/mugwort/>; NY ranking form (link in file) | 2026-10-09 | Claude (draft), needs Researcher review |
| `cygnus-olor.md` (mute swan) | NYIS species profile <https://nyis.info/species/mute-swan/> | 2026-10-09 | Claude (draft), needs Researcher review |
| `ficaria-verna.md` (lesser celandine) | NYIS species profile <https://nyis.info/species/lesser-celandine/> | 2026-10-09 | Claude (draft), needs Researcher review |
| `rosa-multiflora.md` (multiflora rose) | NYIS species profile <https://nyis.info/species/multiflora-rose/> | 2026-10-09 | Claude (draft), needs Researcher review |
| `alliaria-petiolata.md` (garlic mustard) | NYIS species profile <https://nyis.info/species/garlic-mustard/> | 2026-10-09 | Claude (draft), needs Researcher review |

## Decisions log

Record judgment calls here so the team can explain them.

| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | Area = 2 km circle around 40.741, -73.812 | Covers both Kissena Park and Queens College; iNaturalist's park boundary leaves out QC. |
| 2026-10-09 | Sounds only looked up for animals | "Sounds" attached to plant observations are birdsong or wind, not the plant. |
| 2026-10-09 | Sightings identified only to a parent species don't count for below-species list entries (porcelain berry, red-eared slider, Africanized honey bee) | The list names the variety or subspecies; counting the whole species would be a guess. The Researcher may revisit this. |
| 2026-10-09 | Bamboos (*Phyllostachys*) and *Myriophyllum heterophyllum × laxum* are "Not yet ranked" | Their forms are "Not Assessable", or there is no form. |
| 2026-10-09 | Mute swan `touch_safe: false` | NYIS: "Do not handle or harm the swans, their nests, or any eggs without DEC authorization." All plant sheets stay `null`: no source says explicitly whether touching is safe. |
| 2026-10-09 | Plant "How to handle it" text describes control methods but doesn't tell visitors to pull plants in Kissena | Kissena is a NYC park. NYC Parks rules appear to forbid removing vegetation without permission (56 RCNY §1-04), but we could only find that text on unofficial copies, so it's not in the fact sheets yet. **Researcher: verify on nycgovparks.org/rules in a browser and add it to `how-to-report.md` if confirmed.** |
| 2026-10-09 | Curly pondweed keeps rank "Very High" although its score is 79.79 | We copy the official rank as published. |
