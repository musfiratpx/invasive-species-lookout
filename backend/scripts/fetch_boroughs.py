"""
Download the official outlines of the five NYC boroughs and save them to
data/sources/nyc_boroughs.geojson. build_early_warning.py uses them to tell which
borough each sighting is in.

Source: "Borough Boundaries" on NYC Open Data (NYC Department of City Planning),
water areas excluded: https://data.cityofnewyork.us/d/gthc-hcne
Coordinates are rounded to 5 decimals (~1 m) to keep the file small enough to commit.

Usage (from backend/):  python scripts/fetch_boroughs.py
"""

import json

import _setup  # noqa: F401  (adds backend/ to the import path)
import requests

from app import config

URL = "https://data.cityofnewyork.us/resource/gthc-hcne.geojson"
OUT = config.DATA_DIR / "sources" / "nyc_boroughs.geojson"


def rounded(coords):
    """Round every number in a nested coordinate list to 5 decimals."""
    if isinstance(coords, (int, float)):
        return round(coords, 5)
    return [rounded(c) for c in coords]


def main():
    response = requests.get(URL, timeout=120,
                            headers={"User-Agent": "InvasiveSpeciesLookout/0.1 (HackKnight 2026 student project)"})
    response.raise_for_status()
    features = [
        {
            "type": "Feature",
            "properties": {"borough": f["properties"]["boroname"]},
            "geometry": {"type": f["geometry"]["type"], "coordinates": rounded(f["geometry"]["coordinates"])},
        }
        for f in response.json()["features"]
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))
    print(f"Saved {len(features)} boroughs to {OUT.relative_to(config.BACKEND_DIR)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
