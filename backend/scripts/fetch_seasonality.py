"""
Month-by-month sighting counts for each species. Saves data/cache/seasonality.json.

Two views per species, both from real research-grade iNaturalist sightings:
  - "kissena": counted with pandas from data/cache/observations.csv (no network)
  - "nyc":     iNaturalist's month-of-year histogram for all of New York City.
               Kissena alone often has only a few sightings, so the NYC curve shows
               the seasonal pattern more clearly. The UI must label which one it shows.

Usage (from backend/):  python scripts/fetch_seasonality.py
"""

import json

import _setup  # noqa: F401  (adds backend/ to the import path)
import pandas as pd
from _setup import NYC_PLACE_ID
from pyinaturalist import get_observation_histogram

from app import config


def kissena_by_month(observations, species_id):
    """Count cached sightings of one species per month (index 0 = January)."""
    months = pd.to_datetime(observations.loc[observations["species_id"] == species_id, "observed_on"]).dt.month
    counts = months.value_counts()
    return [int(counts.get(m, 0)) for m in range(1, 13)]


def nyc_by_month(species_id):
    """iNaturalist's month-of-year histogram for one species across NYC."""
    histogram = get_observation_histogram(
        taxon_id=species_id, place_id=NYC_PLACE_ID, quality_grade="research", interval="month_of_year"
    )
    return [int(histogram.get(m, 0)) for m in range(1, 13)]


def main():
    observations = pd.read_csv(config.OBSERVATIONS_CSV)
    species = observations.drop_duplicates("species_id")[["species_id", "listed_name"]]
    print(f"Building seasonality for {len(species)} species...")

    seasonality = {}
    for _, row in species.iterrows():
        species_id = int(row["species_id"])
        seasonality[str(species_id)] = {
            "scientific_name": row["listed_name"],
            "kissena": kissena_by_month(observations, species_id),
            "nyc": nyc_by_month(species_id),
        }
        s = seasonality[str(species_id)]
        print(f"  {row['listed_name']:32s} Kissena {sum(s['kissena']):4d}   NYC {sum(s['nyc']):6d}")

    config.SEASONALITY_JSON.write_text(json.dumps(seasonality, indent=2))
    print(f"\nSaved {config.SEASONALITY_JSON.relative_to(config.BACKEND_DIR)}")


if __name__ == "__main__":
    main()
