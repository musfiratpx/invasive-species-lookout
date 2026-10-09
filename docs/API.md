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
    "obscured": false
  }
]
```

- `species_id` is the iNaturalist taxon ID of the **listed** species (a string). Use it for `/api/species/{species_id}`.
- `scientific_name` is what the observer recorded, which may be a variety of the listed species.
- `danger_level` is `1`–`4`, or `null` for "Not yet ranked".
- `obscured: true` means iNaturalist blurred the location for privacy. Draw it as approximate.
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
    "sources": []
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

## `POST /api/ask` (planned, optional)

Request `{"question": "..."}`, response `{"answer": "...", "sources": [{"title": "...", "url": "..."}]}`. It uses the same grounded RAG as the sidebar. Not built yet.
