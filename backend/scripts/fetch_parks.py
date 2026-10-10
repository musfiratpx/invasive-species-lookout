"""
Download the official boundaries of every park in New York City (all five
boroughs) and save them to data/sources/nyc_parks.geojson.

Source: NYC Parks "Parks Properties" dataset on NYC Open Data (published by the
NYC Department of Parks and Recreation): https://data.cityofnewyork.us/d/enfh-gkve
We keep only the fields the app uses and round coordinates to 6 decimals (~10 cm),
which keeps the file small enough to commit so the app works offline.

Usage (from backend/):  python scripts/fetch_parks.py
"""

import json

import _setup  # noqa: F401  (adds backend/ to the import path)
import requests

from app import config

URL = "https://data.cityofnewyork.us/resource/enfh-gkve.geojson"
OUT = config.DATA_DIR / "sources" / "nyc_parks.geojson"
KEEP = {"gispropnum": "park_id", "signname": "name", "acres": "acres", "typecategory": "type", "address": "address"}


def rounded(coords):
    """Round every number in a nested coordinate list to 6 decimals."""
    if isinstance(coords, (int, float)):
        return round(coords, 6)
    return [rounded(c) for c in coords]


def main():
    response = requests.get(URL, params={"$limit": 50000}, timeout=120,
                            headers={"User-Agent": "InvasiveSpeciesLookout/0.1 (HackKnight 2026 student project)"})
    response.raise_for_status()
    features = []
    for feature in response.json()["features"]:
        props = feature["properties"]
        if props.get("retired") or not feature.get("geometry"):
            continue
        slim = {new: props.get(old) for old, new in KEEP.items()}
        slim["acres"] = float(slim["acres"]) if slim["acres"] else None
        features.append({
            "type": "Feature",
            "properties": slim,
            "geometry": {"type": feature["geometry"]["type"], "coordinates": rounded(feature["geometry"]["coordinates"])},
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))
    print(f"Saved {len(features)} NYC parks to {OUT.relative_to(config.BACKEND_DIR)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
