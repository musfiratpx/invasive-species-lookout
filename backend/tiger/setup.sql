-- One-time Tiger Cloud setup for the "New arrivals" early-warning list (run in the console's SQL editor).
-- Creates two tables: every sighting (a TimescaleDB hypertable, split by year) and the five borough
-- outlines (PostGIS shapes). scripts/load_tiger.py fills them from our cached files, and
-- scripts/build_early_warning.py asks: which species were first recorded in a borough recently?
-- Safe to run again: nothing is created twice.
-- Docs: https://docs.tigerdata.com/api/latest/hypertable/create_hypertable/

-- PostGIS adds map shapes and "is this point inside that borough?" queries.
-- TimescaleDB is already on in every Tiger Cloud service.
CREATE EXTENSION IF NOT EXISTS postgis;

-- One row per research-grade iNaturalist sighting (same columns we use from data/cache/observations.csv).
CREATE TABLE IF NOT EXISTS sightings (
    observation_id   BIGINT           NOT NULL,
    observed_on      DATE             NOT NULL,
    species_id       TEXT             NOT NULL,   -- iNaturalist taxon ID the app groups by
    scientific_name  TEXT,
    common_name      TEXT,
    listed_name      TEXT,                        -- name on the NYS invasive list
    iconic_taxon     TEXT,                        -- Plantae, Insecta, ...
    latitude         DOUBLE PRECISION NOT NULL,
    longitude        DOUBLE PRECISION NOT NULL,
    obscured         BOOLEAN,                     -- location blurred by iNaturalist for privacy
    accuracy_m       DOUBLE PRECISION,            -- empty = the observer didn't record it
    url              TEXT,
    geom             GEOMETRY(Point, 4326),       -- longitude/latitude as a map point
    -- A hypertable's primary key must include the time column.
    PRIMARY KEY (observation_id, observed_on)
);

-- Turn it into a hypertable: TimescaleDB stores it in one chunk per year, which keeps
-- "earliest sighting" and "sightings per year" queries fast.
SELECT create_hypertable('sightings', by_range('observed_on', INTERVAL '1 year'), if_not_exists => TRUE);

-- Spatial index so "which borough is this point in?" doesn't scan every shape.
CREATE INDEX IF NOT EXISTS sightings_geom_idx ON sightings USING GIST (geom);

-- The five boroughs (NYC Department of City Planning, water excluded; data/sources/nyc_boroughs.geojson).
CREATE TABLE IF NOT EXISTS boroughs (
    borough  TEXT PRIMARY KEY,                    -- Bronx, Brooklyn, Manhattan, Queens, Staten Island
    geom     GEOMETRY(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS boroughs_geom_idx ON boroughs USING GIST (geom);

-- Check: both tables should be listed, and sightings should show as a hypertable.
SELECT hypertable_name, num_chunks FROM timescaledb_information.hypertables;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('sightings', 'boroughs');
