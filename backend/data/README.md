# Data files

Every file here comes from an official source or is computed from one. Nothing is made up.

| File | What it is | Source | How it was made |
|---|---|---|---|
| `ny_invasive_list.csv` | All species on New York's prohibited and regulated invasive species lists. **A species is "invasive" in this app only if it is in this file.** | NYS DEC, 6 NYCRR Part 575, list dated Sept 10, 2014 (in effect since Mar 10, 2015): <https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf> | Copied by hand from the PDF on 2026-10-09. The `synonyms` column holds the other names DEC prints in parentheses. The `notes` column marks DEC typos we corrected and the two synonyms we added ourselves. |
| `sources/nyis_plant_ranks.csv` | Rank and score from every New York Non-Native Plant Invasiveness Ranking Form (183 forms). | nyis.info (New York Invasive Species Information) | `python scripts/import_nyis_ranks.py` downloads the PDFs and reads them. The score is recomputed as 100 × a / b from each form's "Outcome score" row. |
| `danger_levels.csv` | Danger level (1–4) for each listed species. | The two files above | `python scripts/build_danger_levels.py`. The rules are in `docs/SCORING.md`. `health_warning` is filled in by hand, only from an official source. |

## Known gaps and quirks (2026-10-09)

- **Not yet ranked:** three listed plants have no usable state rank, so the app shows "Not yet ranked" for them:
  - *Myriophyllum heterophyllum × laxum* (no form)
  - *Phyllostachys aurea* and *P. aureosulcata* (form says "Not Assessable", because the bamboos are not known to escape cultivation in NY)
- **Curly pondweed** (*Potamogeton crispus*): the form is ranked "Very High" but its score is 79.79, which falls in the High range. We keep the official rank exactly as published.
- **Non-plant danger levels** come from the Part 575 category: prohibited → 3, regulated → 2.
- **List age:** DEC's list dates from 2014 and is still the current one on dec.ny.gov as of 2026-10-09. The Researcher should re-check it before the demo.
- **iNaturalist names** can differ from DEC's (for example, *Ampelopsis glandulosa* var. *brevipedunculata* for porcelain berry). The fetch script will look up each name on iNaturalist, which follows synonyms, and print any it can't match, so the Researcher can add them to `synonyms`.
