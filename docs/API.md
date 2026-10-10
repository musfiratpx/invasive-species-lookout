# API contract

The backend runs at `http://localhost:8000`. Interactive docs: <http://localhost:8000/docs>.

The frontend calls the API only from `frontend/lib/api.js`. **If you change a response here, change that file and this document in the same commit.**

Every response is built from cached files in `backend/data/`. The API never calls iNaturalist or an AI service while running.

---

## `GET /api/health`

Checks that the server is up and shows which modes are active.

```json
{
  "ok": true,
  "area": {"name": "Queens, New York City", "inat_place_ids": [675],
           "center": [40.741, -73.812], "radius_km": 2.0},
  "observations": 14620,
  "cache_updated_at": "2026-10-09T18:02:11+00:00",
  "rag_mode": "extractive",
  "retriever": "keyword"
}
```

- `rag_mode`: `"cortex"` when the Snowflake settings and `SNOWFLAKE_CORTEX_MODEL` are set (Cortex writes the text), otherwise `"extractive"` (fact-sheet text word for word).
- `retriever`: `"snowflake"` when the Snowflake settings are filled in, otherwise `"keyword"`.

## `GET /api/map/observations?bbox=minLng,minLat,maxLng,maxLat`

Sightings to draw on the map. `bbox` is optional. Without it, you get every sighting. A badly formed `bbox` returns `400`.

```json
[
  {
    "observation_id": 406833083,
    "species_id": "52856",
    "scientific_name": "Artemisia vulgaris",
    "common_name": "common mugwort",
    "iconic_taxon": "Plantae",
    "latitude": 40.7454750448,
    "longitude": -73.8118106561,
    "observed_on": "2026-10-08",
    "danger_level": 3,
    "obscured": false,
    "accuracy_m": 10.0
  }
]
```

- `species_id` is the iNaturalist taxon ID of the **listed** species (a string). Use it for `/api/species/{species_id}`.
- `scientific_name` is what the observer recorded, which may be a variety of the listed species.
- `danger_level` is `1`–`4`, or `null` for "Not yet ranked".
- `obscured: true` means iNaturalist blurred the location for privacy (moved up to ~20 km). The map doesn't draw these.
- `accuracy_m` is how precise the location is, in meters, or `null` if unknown. The map doesn't draw sightings over 1,000 m: some are only placed at "Queens", which iNaturalist puts at the borough's center point.
- `iconic_taxon` is one of `Plantae, Insecta, Aves, Reptilia, Mammalia, Actinopterygii, Mollusca, Fungi, Amphibia, Arachnida, Animalia, Chromista, Protozoa`. The map icon is picked from this.

## `GET /api/species`

Every listed species seen in the area, most-sighted first.

```json
[
  {
    "species_id": "52856",
    "scientific_name": "Artemisia vulgaris",
    "common_name": "common mugwort",
    "iconic_taxon": "Plantae",
    "danger_level": 3,
    "danger_label": "High",
    "kissena_status": ["common_here"],
    "sightings": 166
  }
]
```

- `danger_label` is `"Very High" | "High" | "Moderate" | "Low" | "Not yet ranked"`.
- `kissena_status` contains zero or more of `"common_here" | "spreading" | "new_arrival"`. See [SCORING.md](SCORING.md).

## `GET /api/species/{species_id}`

Everything the sidebar shows for one species. An unknown `species_id` returns `404`.

```json
{
  "species_id": "64540",
  "scientific_name": "Celastrus orbiculatus",
  "common_name": "Asian bittersweet",
  "iconic_taxon": "Plantae",
  "ny_status": "prohibited",
  "danger": {
    "level": 4, "label": "Very High", "basis": "ny_plant_rank",
    "ny_rank": "Very High", "score": 86.67, "health_warning": null,
    "source_url": "https://nyis.info/wp-content/uploads/2024/10/9b927_Celastrus.orbiculatus.NYS_.pdf"
  },
  "kissena_status": ["common_here"],
  "sightings": {
    "total": 27,
    "by_month_of_year": [3, 0, 0, 10, 1, 1, 3, 0, 0, 1, 5, 3],
    "nyc_by_month_of_year": [159, 129, 54, 664, 334, 179, 186, 195, 227, 209, 433, 1792],
    "first_seen": "2015-11-09",
    "last_seen": "2026-07-06"
  },
  "photos": [
    {
      "url": "https://inaturalist-open-data.s3.amazonaws.com/photos/494610440/medium.jpg",
      "large_url": "https://inaturalist-open-data.s3.amazonaws.com/photos/494610440/large.jpg",
      "attribution": "(c) bzedu, some rights reserved (CC BY-NC)",
      "license": "cc-by-nc",
      "observation_url": "https://www.inaturalist.org/observations/275227620"
    }
  ],
  "sound": null,
  "insights": {
    "summary": null,
    "history": null,
    "seasons": null,
    "handling": {
      "text": "We haven't found official guidance. Avoid touching it and report the sighting.",
      "touch_safe": null,
      "is_default": true
    },
    "report": "New York's official database for invasive species sightings is iMapInvasives, ...",
    "sources": [],
    "found_by": {
      "summary": null,
      "report": {
        "retriever": "snowflake",
        "files": ["how-to-report.md"],
        "section": "How to report it",
        "word_for_word": true,
        "reviewed_by": {"how-to-report.md": null}
      }
    },
    "fact_sheet": null
  }
}
```

Field notes:

- **`ny_status`**: `"prohibited"` or `"regulated"`, from NYS DEC Part 575.
- **`danger`**: comes only from `danger_levels.csv`. When `level` is `null`, `label` is `"Not yet ranked"`. `basis` is `"ny_plant_rank"` (plants, where `ny_rank` and `score` are filled) or `"ny_part575_status"` (everything else, where they are `null`). Show `health_warning` only when it isn't `null`.
- **`sightings.by_month_of_year`**: sightings in our area, January first. `nyc_by_month_of_year` covers all of NYC, which shows the seasonal pattern better when local numbers are small. Label whichever one you show.
- **`photos`**: up to 8. `license: null` means all rights reserved. Show a "View on iNaturalist" link instead of embedding the image. Always show `attribution`.
- **`sound`**: `null` for most species. Hide the section completely. When present, it looks like this:
  ```json
  {"file_url": "https://static.inaturalist.org/sounds/565451.m4a?1669003926",
   "file_content_type": "audio/mp4",
   "attribution": "(c) Misha Zitser, some rights reserved (CC BY-NC)",
   "license": "cc-by-nc",
   "observer_note": "A snort can be heard at second 3",
   "observation_url": "https://www.inaturalist.org/observations/142509792"}
  ```
  `observer_note` is the observer's own description and may be empty.
- **`insights`**: written by `scripts/build_insights.py` from our source documents.
  - A `null` section means our sources don't cover it. Show "No information in our sources yet".
  - `handling.text` is never empty. When `is_default` is `true`, it's the cautious default message.
  - `touch_safe` is `true`, `false`, or `null`. It is only non-`null` when a source explicitly says so.
  - `report` is how to report a sighting, shown **word for word** from the sources (never AI-rewritten). It holds the species' own reporting note, if any, then the general instructions from `knowledge/how-to-report.md`. Paragraphs are separated by a blank line (`\n\n`). `null` means no reporting source yet.
  - `sources` lists `{title, url}` for every document used.
  - `found_by` says, per section (`summary`, `history`, `seasons`, `handling`, `report`), how the text was found: `retriever` is `"snowflake"` (Cortex Search) or `"keyword"` (the offline backup, also used if Snowflake failed during the build), plus the fact-sheet `files` and `section` it came from, and `word_for_word` (`false` only if a Cortex model reworded it). `null` = nothing found. The UI shows this as a small "🔎 Found by …" line.
  - `fact_sheet` is the species' own fact sheet `{file, reviewed_by}`. `reviewed_by` is `null` until a teammate puts their name in that file's `reviewed_by:` header line; the UI shows "Draft" until then. `fact_sheet` is `null` if the species has no sheet.

## `GET /api/parks`

Every Queens park with at least one sighting, most sightings first. Boundaries are NYC Parks' official "Parks Properties" (NYC Open Data). Properties sharing a specific name (e.g. two pieces of "Kissena Corridor Park") are merged into one park; generic names like "Park" get their address added.

```json
[{"park_id": "Q001", "name": "Alley Pond Park", "acres": 635.514, "type": "Flagship Park", "sightings": 3138, "species": 49}]
```

Only sightings with a trustworthy location (not privacy-blurred, accuracy within 1 km) are matched to parks.

## `GET /api/parks/{park_id}`

A park's profile. Unknown `park_id` → `404`.

```json
{
  "park_id": "Q024", "name": "Kissena Park", "acres": 237.147, "type": "Community Park", "address": "...",
  "sightings": 498, "species_count": 31,
  "species_by_danger": {"Very High": 16, "High": 12, "Moderate": 2, "Not yet ranked": 1},
  "species": [{"species_id": "52856", "scientific_name": "Artemisia vulgaris", "common_name": "common mugwort",
               "iconic_taxon": "Plantae", "danger_level": 3, "danger_label": "High", "sightings": 88}],
  "by_month_of_year": [8, 7, 19, 167, 65, 39, 61, 24, 28, 45, 24, 11],
  "first_seen": "...", "last_seen": "2026-10-08",
  "recent": [{"observed_on": "2026-10-08", "species_id": "52856", "common_name": "common mugwort", "url": "https://www.inaturalist.org/observations/..."}],
  "outline": {"type": "MultiPolygon", "coordinates": [...]},
  "source": {"title": "NYC Parks Properties (...)", "url": "https://data.cityofnewyork.us/d/enfh-gkve"}
}
```

- `species_by_danger` counts **species** (not sightings) at each danger level.
- `species[].sightings` is sightings **in this park**.
- `outline` is GeoJSON for drawing the park boundary.

The map endpoint also includes `park_id` (or `null`) on each sighting.

## `POST /api/ask` (planned, optional)

Request `{"question": "..."}`, response `{"answer": "...", "sources": [{"title": "...", "url": "..."}]}`. It uses the same grounded RAG as the sidebar. Not built yet.
