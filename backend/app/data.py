"""
Loads the cached data files once and builds what each API endpoint returns.

The app only reads files from data/ and data/cache/. It never calls iNaturalist
while running, so the demo works without Wi-Fi. To refresh the data, re-run the
scripts in backend/scripts/ and restart the server.
"""

import json
from functools import lru_cache

import pandas as pd

from app import config
from app.danger import find_danger
from app.invasive_list import load_invasive_list
from app.parks import load_parks
from app.rag.chunker import fact_sheet_reviews
from app.status import status_for_all

# Shown when we have no official handling guidance (ground rule 5: safety first).
DEFAULT_HANDLING = "We haven't found official guidance. Avoid touching it and report the sighting."


def _read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


@lru_cache(maxsize=1)
def observations():
    """All cached sightings as a DataFrame (empty if fetch_observations.py hasn't been run)."""
    if not config.OBSERVATIONS_CSV.exists():
        return pd.DataFrame(columns=["observation_id", "species_id", "listed_name", "observed_on"])
    df = pd.read_csv(config.OBSERVATIONS_CSV, dtype={"species_id": str, "license": str})
    df = df.fillna({"common_name": "", "place_guess": "", "license": ""})
    # Which park each sighting is in (made by scripts/assign_parks.py); None if outside parks.
    parks_csv = config.CACHE_DIR / "observation_parks.csv"
    if parks_csv.exists():
        df = df.merge(pd.read_csv(parks_csv, dtype={"park_id": str}), on="observation_id", how="left")
    else:
        df["park_id"] = None
    return df


@lru_cache(maxsize=1)
def media():
    return _read_json(config.MEDIA_JSON, {})


@lru_cache(maxsize=1)
def seasonality():
    return _read_json(config.SEASONALITY_JSON, {})


@lru_cache(maxsize=1)
def reviews():
    """Who has checked each fact sheet (read from its "reviewed_by:" header). Restart to see new reviews."""
    return fact_sheet_reviews()


@lru_cache(maxsize=1)
def listed_by_name():
    """The official NY list, keyed by scientific name."""
    return {row["scientific_name"]: row for row in load_invasive_list()}


@lru_cache(maxsize=1)
def statuses():
    return status_for_all(observations())


def _species_summary(species_id, group):
    """The fields shared by the species list and the species detail endpoints."""
    listed_name = group["listed_name"].iloc[0]
    danger = find_danger(listed_name)
    # iNaturalist's common name for the most-seen form of this species,
    # falling back to the name on the DEC list.
    names = group.loc[group["common_name"] != "", "common_name"]
    common_name = names.mode().iloc[0] if not names.empty else listed_by_name()[listed_name]["common_name"]
    return {
        "species_id": species_id,
        "scientific_name": listed_name,
        "common_name": common_name,
        "iconic_taxon": group["iconic_taxon"].mode().iloc[0],
        "danger_level": danger["level"],
        "danger_label": danger["label"],
        "kissena_status": statuses().get(species_id, []),
        "sightings": int(len(group)),
    }


def species_list():
    """Every listed species seen in the area, most-sighted first."""
    df = observations()
    result = [_species_summary(sid, group) for sid, group in df.groupby("species_id")]
    return sorted(result, key=lambda s: s["sightings"], reverse=True)


def map_observations(bbox=None):
    """Sightings for the map, optionally only those inside bbox = (min_lng, min_lat, max_lng, max_lat)."""
    df = observations()
    if bbox:
        min_lng, min_lat, max_lng, max_lat = bbox
        df = df[df["longitude"].between(min_lng, max_lng) & df["latitude"].between(min_lat, max_lat)]

    # Danger level is per species, so look each one up once.
    levels = {name: find_danger(name)["level"] for name in df["listed_name"].unique()}
    return [
        {
            "observation_id": int(row.observation_id),
            "species_id": row.species_id,
            "scientific_name": row.scientific_name,
            "common_name": row.common_name,
            "iconic_taxon": row.iconic_taxon,
            "latitude": float(row.latitude),
            "longitude": float(row.longitude),
            "observed_on": row.observed_on,
            "danger_level": levels[row.listed_name],
            "obscured": bool(row.obscured),  # location blurred by iNaturalist for privacy
            # How precise the location is, in meters (None if unknown). Some sightings are only
            # placed at "Queens" (the borough's center point, ~12 km accuracy); the map hides those.
            "accuracy_m": None if pd.isna(getattr(row, "accuracy_m", None)) else float(row.accuracy_m),
            "park_id": None if pd.isna(row.park_id) else row.park_id,  # NYC Parks property ID, e.g. "Q015"
        }
        for row in df.itertuples()
    ]


# ---------- Park profiles ----------

@lru_cache(maxsize=1)
def parks_by_id():
    return {p["park_id"]: p for p in load_parks()}


def park_list():
    """Every Queens park with at least one sighting, most sightings first."""
    df = observations().dropna(subset=["park_id"])
    result = []
    for park_id, group in df.groupby("park_id"):
        park = parks_by_id().get(park_id)
        if park:
            result.append({
                "park_id": park_id, "name": park["name"], "acres": park["acres"], "type": park["type"],
                "sightings": int(len(group)), "species": int(group["species_id"].nunique()),
            })
    return sorted(result, key=lambda p: p["sightings"], reverse=True)


def park_detail(park_id):
    """Everything the park profile panel shows, or None for an unknown park."""
    park = parks_by_id().get(park_id)
    if not park:
        return None
    group = observations()[observations()["park_id"] == park_id]

    species = []
    for species_id, rows in group.groupby("species_id"):
        summary = _species_summary(species_id, rows)  # "sightings" here = sightings in this park
        species.append({k: summary[k] for k in ("species_id", "scientific_name", "common_name", "iconic_taxon",
                                                "danger_level", "danger_label", "sightings")})
    species.sort(key=lambda s: s["sightings"], reverse=True)

    # How many listed species of each danger level are in the park.
    by_level = {}
    for s in species:
        by_level[s["danger_label"]] = by_level.get(s["danger_label"], 0) + 1

    months = pd.to_datetime(group["observed_on"]).dt.month.value_counts()
    recent = group.sort_values("observed_on", ascending=False).head(5)
    return {
        "park_id": park_id,
        "name": park["name"],
        "acres": park["acres"],
        "type": park["type"],
        "address": park["address"].title() if park["address"] else None,  # the city data is ALL CAPS
        "sightings": int(len(group)),
        "species_count": len(species),
        "species_by_danger": by_level,
        "species": species,
        "by_month_of_year": [int(months.get(m, 0)) for m in range(1, 13)],
        "first_seen": group["observed_on"].min() if len(group) else None,
        "last_seen": group["observed_on"].max() if len(group) else None,
        "recent": [
            {"observed_on": r.observed_on, "species_id": r.species_id,
             "common_name": r.common_name or r.scientific_name, "url": r.url}
            for r in recent.itertuples()
        ],
        "outline": {"type": "MultiPolygon", "coordinates": park["geometry"]},  # GeoJSON, for drawing the boundary
        "source": {"title": "NYC Parks Properties (NYC Department of Parks and Recreation, NYC Open Data)",
                   "url": "https://data.cityofnewyork.us/d/enfh-gkve"},
    }


def _photos(species_id):
    """Photos for the slideshow. license None = all rights reserved: the UI links instead of embedding."""
    return [
        {
            "url": p["medium_url"],
            "large_url": p["large_url"],
            "attribution": p["attribution"],
            "license": p["license"],
            "observation_url": p["observation_url"],
        }
        for p in media().get(species_id, {}).get("photos", [])
    ]


def _insights(species_id):
    """
    RAG results cached by scripts/build_insights.py. A missing section stays null,
    and the UI shows "No information in our sources yet". Handling always has text:
    the cautious default if no source covers it.
    """
    cached = _read_json(config.INSIGHTS_DIR / f"{species_id}.json", {})
    handling = cached.get("handling") or {}
    found_by = cached.get("found_by") or {}
    # Review status is read live from the fact sheets (not the cache), so signing one off
    # only needs a backend restart, not a rebuild.
    for where in found_by.values():
        if where:
            where["reviewed_by"] = {f: reviews().get(f) for f in where["files"]}
    species_files = [f for where in found_by.values() if where for f in where["files"] if f != "how-to-report.md"]
    fact_sheet = species_files[0] if species_files else None
    return {
        "summary": cached.get("summary"),
        "history": cached.get("history"),
        "seasons": cached.get("seasons"),
        "handling": {
            "text": handling.get("text") or DEFAULT_HANDLING,
            "touch_safe": handling.get("touch_safe"),  # null unless a source explicitly says
            "is_default": not handling.get("text"),
        },
        "report": cached.get("report"),  # how to report a sighting; null = no reporting source yet
        "sources": cached.get("sources", []),
        "found_by": found_by,
        # The species' own fact sheet and who checked it (reviewed_by None = still a draft).
        "fact_sheet": {"file": fact_sheet, "reviewed_by": reviews().get(fact_sheet)} if fact_sheet else None,
    }


def species_detail(species_id):
    """Everything the sidebar needs for one species, or None if it isn't in our data."""
    df = observations()
    group = df[df["species_id"] == species_id]
    if group.empty:
        return None

    summary = _species_summary(species_id, group)
    listed = listed_by_name()[summary["scientific_name"]]
    season = seasonality().get(species_id, {})
    dates = group["observed_on"].sort_values()

    return {
        "species_id": species_id,
        "scientific_name": summary["scientific_name"],
        "common_name": summary["common_name"],
        "iconic_taxon": summary["iconic_taxon"],
        "ny_status": listed["ny_status"],
        "danger": find_danger(summary["scientific_name"]),
        "kissena_status": summary["kissena_status"],
        "sightings": {
            "total": summary["sightings"],
            "by_month_of_year": season.get("kissena", [0] * 12),
            "nyc_by_month_of_year": season.get("nyc", [0] * 12),
            "first_seen": dates.iloc[0],
            "last_seen": dates.iloc[-1],
        },
        "photos": _photos(species_id),
        "sound": media().get(species_id, {}).get("sound"),  # null when no real recording exists
        "insights": _insights(species_id),
    }
