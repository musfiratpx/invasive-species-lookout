"""
Early-warning list: which invasive species were recorded in a borough for the first time recently?

Asks Tiger Cloud (loaded by load_tiger.py) for the earliest sighting of every species in
every borough, keeps the ones first seen in the last two years, and saves them to
data/cache/early_warning.json. The app reads that file, never Tiger, so the demo works offline.

Honesty notes (shown in the app too):
  - "First recorded" means first in our research-grade iNaturalist data, not the day it arrived.
  - Only precise sightings count (not blurred for privacy, location within 1 km), the same rule
    the map uses, so a sighting pinned to a whole borough can't create a fake "first".
  - The window ends at our newest sighting, not today, so an old cache can't hide recent firsts.

Usage (from backend/):  python scripts/build_early_warning.py
"""

import json
import os
from datetime import datetime, timedelta, timezone

import _setup  # noqa: F401  (adds backend/ to the import path)
import psycopg

from app import config

WINDOW_DAYS = 730  # "recent" = first recorded in the last two years
MAX_ACCURACY_M = 1000  # same limit as the map (frontend/app/page.js)

# first(x, observed_on) is a TimescaleDB function: the value of x on the earliest row.
FIRSTS_SQL = """
    SELECT species_id,
           borough,
           min(observed_on)                      AS first_seen,
           first(observation_id, observed_on)    AS first_observation_id,
           first(url, observed_on)               AS first_url,
           count(*)                              AS sightings
    FROM sightings
    WHERE borough IS NOT NULL
      AND NOT obscured
      AND (accuracy_m IS NULL OR accuracy_m <= %(max_accuracy)s)
    GROUP BY species_id, borough
"""


def main():
    url = os.getenv("TIGER_DATABASE_URL")
    if not url:
        raise SystemExit("Set TIGER_DATABASE_URL in backend/.env first (see .env.example).")
    with psycopg.connect(url, connect_timeout=15) as conn:
        newest = conn.execute("SELECT max(observed_on) FROM sightings").fetchone()[0]
        rows = conn.execute(FIRSTS_SQL, {"max_accuracy": MAX_ACCURACY_M}).fetchall()

    since = newest - timedelta(days=WINDOW_DAYS)

    # Each species' first sighting per borough: {species_id: {borough: first_seen}}
    firsts = {}
    for species_id, borough, first_seen, *_ in rows:
        firsts.setdefault(species_id, {})[borough] = first_seen

    items = []
    for species_id, borough, first_seen, obs_id, obs_url, sightings in rows:
        if first_seen < since:
            continue
        # Boroughs where this species was already known before it reached this one.
        earlier = sorted(
            ({"borough": b, "first_seen": d.isoformat()} for b, d in firsts[species_id].items() if d < first_seen),
            key=lambda e: e["first_seen"],
        )
        items.append({
            "species_id": species_id,
            "borough": borough,
            "first_seen": first_seen.isoformat(),
            "first_observation_id": obs_id,
            "first_observation_url": obs_url,
            "sightings_since": sightings,
            "already_in": earlier,
        })
    items.sort(key=lambda i: i["first_seen"], reverse=True)

    out = {
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "window_days": WINDOW_DAYS,
        "since": since.isoformat(),
        "newest_sighting": newest.isoformat(),
        "source": "Research-grade iNaturalist sightings; boroughs from NYC Department of City Planning",
        "items": items,
    }
    path = config.EARLY_WARNING_JSON
    path.write_text(json.dumps(out, indent=1))
    print(f"{len(items)} species first recorded in a borough since {since} -> {path.relative_to(config.BACKEND_DIR)}")
    for i in items[:15]:
        print(f"  {i['first_seen']}  {i['borough']:<14} species {i['species_id']:<8} ({i['sightings_since']} sightings)")


if __name__ == "__main__":
    main()
