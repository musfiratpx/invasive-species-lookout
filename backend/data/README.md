# Data files

Every file here comes from an official source or is computed from one. Nothing is made up.

| File | What it is | Source | How it was made |
|---|---|---|---|
| `ny_invasive_list.csv` | All species on New York's prohibited and regulated invasive species lists. **A species is "invasive" in this app only if it is in this file.** | NYS DEC, 6 NYCRR Part 575, list dated Sept 10, 2014 (in effect since Mar 10, 2015): <https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf> | Copied by hand from the PDF on 2026-10-09. The `synonyms` column holds the other names DEC prints in parentheses. The `notes` column marks DEC typos we corrected and the two synonyms we added ourselves. |
| `sources/nyis_plant_ranks.csv` | Rank and score from every New York Non-Native Plant Invasiveness Ranking Form (183 forms). | nyis.info (New York Invasive Species Information) | `python scripts/import_nyis_ranks.py` downloads the PDFs and reads them. The score is recomputed as 100 × a / b from each form's "Outcome score" row. |
| `danger_levels.csv` | Danger level (1–4) for each listed species. | The two files above | `python scripts/build_danger_levels.py`. The rules are in `docs/SCORING.md`. `health_warning` is filled in by hand, only from an official source. |

## Cache files (`cache/`)

These come from iNaturalist and are **committed to git on purpose**, so the demo works offline. Re-run the scripts (from `backend/`, in this order) to refresh them.

| File | What it is | Script |
|---|---|---|
| `cache/taxon_map.json` | Each listed species → its iNaturalist taxon ID. iNaturalist's search follows synonyms, e.g. *Cynanchum rossicum* → *Vincetoxicum rossicum*. | `fetch_observations.py` (add `--refresh-taxa` to redo) |
| `cache/observations.csv` | Every research-grade sighting of a listed species in the area. `taxon_id` is what the observer saw (it may be a variety). `species_id` and `listed_name` say which list entry it counts toward. | `fetch_observations.py` |
| `cache/media.json` | Up to 8 photos and at most one real sound per species, with attribution, license and observation link. CC licenses are preferred, and `license: null` means all rights reserved. **Sounds are only looked up for animals**, and each one keeps the observer's note (`observer_note`): a "sound" on a plant observation is really birdsong or wind. | `fetch_media.py` |
| `cache/seasonality.json` | Sightings per month (Jan–Dec): `kissena` from our cache, and `nyc` from iNaturalist's histogram for all of New York City. | `fetch_seasonality.py` |

Snapshot taken 2026-10-09: 778 sightings of 39 listed species within 2 km of 40.741, -73.812, which covers Kissena Park and Queens College. 3 species have a real recording: mute swan, monk parakeet, and spongy moth. The spongy moth recording is of caterpillar droppings falling during an outbreak, per the observer's note, which we save as `observer_note`.

9 sightings have `obscured = true`: iNaturalist moves the point by up to ~20 km to protect the observer or the species, so the map should mark them as approximate.

**Things to say if asked:**
- Sightings show where people *looked and posted*, not everywhere a species *is*. Busy paths and popular events (like City Nature Challenge weekends) show up as spikes.
- Three list entries are below species level: porcelain berry (a variety), red-eared slider (a subspecies) and Africanized honey bee. Sightings identified only to the parent species (e.g. *Trachemys scripta*) are **not** counted, because the list doesn't say so. The Researcher can decide to add the species name to `synonyms`.
- Two listed names have no iNaturalist match (*Myriophyllum heterophyllum × laxum*, *Achatina achatina*). Neither is a Kissena species.

## Known gaps and quirks (2026-10-09)

- **Not yet ranked:** three listed plants have no usable state rank, so the app shows "Not yet ranked" for them:
  - *Myriophyllum heterophyllum × laxum* (no form)
  - *Phyllostachys aurea* and *P. aureosulcata* (form says "Not Assessable", because the bamboos are not known to escape cultivation in NY)
- **Curly pondweed** (*Potamogeton crispus*): the form is ranked "Very High" but its score is 79.79, which falls in the High range. We keep the official rank exactly as published.
- **Non-plant danger levels** come from the Part 575 category: prohibited → 3, regulated → 2.
- **List age:** DEC's list dates from 2014 and is still the current one on dec.ny.gov as of 2026-10-09. The Researcher should re-check it before the demo.
- **iNaturalist names** can differ from DEC's (for example, *Ampelopsis glandulosa* var. *brevipedunculata* for porcelain berry). The fetch script will look up each name on iNaturalist, which follows synonyms, and print any it can't match, so the Researcher can add them to `synonyms`.
