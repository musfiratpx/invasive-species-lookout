"""
Work out which NYC park (if any) each sighting is in, and save it to
data/cache/observation_parks.csv (observation_id, park_id).

Only sightings with a trustworthy location are matched: not privacy-blurred and
accurate to within 1 km. (A blurred point could land in the wrong park.)
Run after fetch_observations.py or fetch_parks.py. Takes a few seconds.

Usage (from backend/):  python scripts/assign_parks.py
"""

import csv

import _setup  # noqa: F401  (adds backend/ to the import path)
import pandas as pd

from app import config
from app.parks import load_parks, park_for

OUT = config.CACHE_DIR / "observation_parks.csv"
MAX_ACCURACY_M = 1000


def main():
    parks = load_parks()
    if not parks:
        print("No park boundaries found. Run scripts/fetch_parks.py first.")
        return
    observations = pd.read_csv(config.OBSERVATIONS_CSV)
    trusted = observations[~observations["obscured"] & ~(observations["accuracy_m"] > MAX_ACCURACY_M)]

    rows = []
    for obs in trusted.itertuples():
        park = park_for(obs.longitude, obs.latitude, parks)
        if park:
            rows.append((obs.observation_id, park["park_id"]))

    with OUT.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["observation_id", "park_id"])
        writer.writerows(rows)
    print(f"{len(rows)} of {len(trusted)} trusted sightings are inside a park "
          f"({len({p for _, p in rows})} parks). Saved {OUT.relative_to(config.BACKEND_DIR)}")


if __name__ == "__main__":
    main()
