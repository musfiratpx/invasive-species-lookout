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
    return df.fillna({"common_name": "", "place_guess": "", "license": ""})


@lru_cache(maxsize=1)
def media():
    return _read_json(config.MEDIA_JSON, {})


@lru_cache(maxsize=1)
def seasonality():
    return _read_json(config.SEASONALITY_JSON, {})


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
        }
        for row in df.itertuples()
    ]


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
