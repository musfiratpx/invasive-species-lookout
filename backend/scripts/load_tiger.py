"""
Upload our cached sightings and the five borough outlines to Tiger Cloud (Postgres +
TimescaleDB + PostGIS), so build_early_warning.py can query them with SQL.

Run tiger/setup.sql once first (in the Tiger console's SQL editor). Then run this
whenever data/cache/observations.csv changes:
    python scripts/load_tiger.py      (from backend/)

Needs TIGER_DATABASE_URL in .env. The app itself never connects to Tiger: it reads
the JSON that build_early_warning.py saves, so the demo still works offline.
Note: some campus Wi-Fi blocks database ports; if this hangs, try a phone hotspot.
"""

import csv
import json
import os

import _setup  # noqa: F401  (adds backend/ to the import path)
import psycopg

from app import config

BOROUGHS_GEOJSON = config.DATA_DIR / "sources" / "nyc_boroughs.geojson"

# Columns copied from observations.csv, in the order of the sightings table.
COLUMNS = ["observation_id", "observed_on", "species_id", "scientific_name", "common_name", "listed_name",
           "iconic_taxon", "latitude", "longitude", "obscured", "accuracy_m", "url"]


def sighting_rows():
    """Yield one tuple per sighting, with blanks turned into NULL (None)."""
    with open(config.OBSERVATIONS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            values = [row[c] or None for c in COLUMNS]
            values[COLUMNS.index("obscured")] = row["obscured"] == "True"
            yield values


def load_sightings(conn):
    # Start fresh each time, so the table always matches the cache exactly.
    conn.execute("TRUNCATE sightings")
    with conn.cursor().copy(f"COPY sightings ({', '.join(COLUMNS)}) FROM STDIN") as copy:
        for values in sighting_rows():
            copy.write_row(values)
    # Turn latitude/longitude into a PostGIS point (4326 = ordinary GPS coordinates).
    conn.execute("UPDATE sightings SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)")
    return conn.execute("SELECT count(*) FROM sightings").fetchone()[0]


def load_boroughs(conn):
    conn.execute("TRUNCATE boroughs")
    features = json.loads(BOROUGHS_GEOJSON.read_text())["features"]
    # ST_MakeValid fixes tiny self-crossings in the coastlines (from rounding the coordinates);
    # without it PostGIS refuses to cut the shapes into pieces. CollectionExtract(..., 3) keeps only polygons.
    for feature in features:
        conn.execute(
            "INSERT INTO boroughs (borough, geom) VALUES "
            "(%s, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)), 3)))",
            (feature["properties"]["borough"], json.dumps(feature["geometry"])),
        )
    # Small pieces of each outline, so the borough lookup below takes seconds, not minutes.
    conn.execute("TRUNCATE borough_pieces")
    conn.execute("INSERT INTO borough_pieces (borough, geom) SELECT borough, ST_Subdivide(geom, 256) FROM boroughs")
    return len(features)


def assign_boroughs(conn):
    """Store each sighting's borough. The outlines leave out water, so a sighting on a beach,
    pier or in a pond at the edge may fall just outside: we take the nearest borough within
    0.005 degrees (~400-550 m). Anything farther stays NULL."""
    conn.execute("""
        UPDATE sightings s SET borough = (
            SELECT p.borough FROM borough_pieces p
            WHERE ST_DWithin(p.geom, s.geom, 0.005)
            ORDER BY p.geom <-> s.geom
            LIMIT 1
        )
    """)
    return conn.execute("SELECT borough, count(*) FROM sightings GROUP BY 1 ORDER BY 2 DESC").fetchall()


def main():
    url = os.getenv("TIGER_DATABASE_URL")
    if not url:
        raise SystemExit("Set TIGER_DATABASE_URL in backend/.env first (see .env.example).")
    # One transaction: if anything fails, Tiger keeps the previous data.
    with psycopg.connect(url, connect_timeout=15) as conn:
        print(f"Loaded {load_sightings(conn):,} sightings")
        print(f"Loaded {load_boroughs(conn)} boroughs")
        for borough, count in assign_boroughs(conn):
            print(f"  {borough or '(no borough)'}: {count:,}")
    print("Done. Next: python scripts/build_early_warning.py")


if __name__ == "__main__":
    main()
