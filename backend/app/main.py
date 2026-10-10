"""
The FastAPI app: the web server the frontend talks to.

Run it from backend/:   uvicorn app.main:app --reload
Then open http://localhost:8000/docs to try every endpoint in the browser.
"""

import gzip
import json
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app import config, data

app = FastAPI(
    title="Kissena Invasive Watch API",
    description="Invasive species sightings across New York City (all five boroughs).",
)

# Let the Next.js dev server (a different port) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-Total-Bytes"],  # lets the browser read our download-size header (progress bar)
)

# Compress responses. The map's sightings are ~3.7 MB of JSON but only ~0.5 MB
# compressed, which makes a big difference on phones.
app.add_middleware(GZipMiddleware, minimum_size=1000)


def _count_cached_observations():
    """Count rows in the observations cache without loading pandas."""
    path = config.OBSERVATIONS_CSV
    if not path.exists():
        return 0
    with path.open(encoding="utf-8") as f:
        return max(sum(1 for _ in f) - 1, 0)  # minus the header row


def _cache_updated_at():
    """When the observations cache was last written (ISO time), or None if it doesn't exist yet."""
    path = config.OBSERVATIONS_CSV
    if not path.exists():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


@app.get("/api/health")
def health():
    """Quick check that the server is up, plus which data and AI modes are active."""
    return {
        "ok": True,
        "area": {
            "name": config.AREA_NAME,
            "inat_place_ids": config.INAT_PLACE_IDS,
            "center": [config.AREA_LAT, config.AREA_LNG],
            "radius_km": config.AREA_RADIUS_KM,
        },
        "observations": _count_cached_observations(),
        "cache_updated_at": _cache_updated_at(),
        # Which RAG pieces will be used. Without keys we fall back to local, non-AI versions.
        "rag_mode": "cortex" if config.cortex_generation_enabled() else "extractive",
        "retriever": "snowflake" if config.snowflake_enabled() else "keyword",
    }


@lru_cache(maxsize=1)
def _all_observations_bytes():
    """
    Every sighting for the map, as JSON bytes and as gzip-compressed JSON bytes.
    Building, encoding and compressing ~15,000 sightings takes ~180 ms, and every page
    load asks for exactly this, so we do it once. The sightings themselves are also only
    read once (data.observations() is cached the same way), so restart the server after
    re-running the fetch scripts, as before.
    """
    body = json.dumps(data.map_observations(None), separators=(",", ":")).encode()
    return body, gzip.compress(body)


@app.get("/api/map/observations")
def map_observations(
    request: Request,
    bbox: str | None = Query(None, description="minLng,minLat,maxLng,maxLat (optional)"),
):
    """Sightings to draw on the map. Pass the visible map area as bbox to get only those."""
    box = None
    if bbox:
        try:
            box = [float(v) for v in bbox.split(",")]
        except ValueError:
            box = []
        if len(box) != 4:
            raise HTTPException(400, "bbox must be four numbers: minLng,minLat,maxLng,maxLat")
    # Send the uncompressed size too: with compression on, the browser can't otherwise
    # tell how big the download will be once unpacked, which the progress bar needs.
    if box is None:
        body, compressed = _all_observations_bytes()
        headers = {"X-Total-Bytes": str(len(body)), "Vary": "Accept-Encoding"}
        if "gzip" in request.headers.get("accept-encoding", ""):
            # Already compressed, so the GZip middleware passes it through untouched.
            return Response(content=compressed, media_type="application/json", headers={**headers, "Content-Encoding": "gzip"})
        return Response(content=body, media_type="application/json", headers=headers)

    body = json.dumps(data.map_observations(box), separators=(",", ":")).encode()
    return Response(content=body, media_type="application/json", headers={"X-Total-Bytes": str(len(body))})


@app.get("/api/species")
def species_list():
    """Every NY-listed invasive species seen in the area, most-sighted first."""
    return data.species_list()


@app.get("/api/parks")
def park_list():
    """Every NYC park with at least one sighting (official NYC Parks boundaries), most sightings first."""
    return data.park_list()


# Must come before /api/parks/{park_id}, or "outlines" would be read as a park ID.
@app.get("/api/parks/outlines")
def park_outlines():
    """Every park with sightings as one GeoJSON FeatureCollection (~140 KB compressed), for faint outlines on the map."""
    return data.park_outlines()


@app.get("/api/parks/{park_id}")
def park_detail(park_id: str):
    """A park's profile: its listed species, danger mix, months, recent sightings and outline."""
    detail = data.park_detail(park_id)
    if detail is None:
        raise HTTPException(404, f"No park {park_id} in our data")
    return detail


@app.get("/api/quiz")
def quiz():
    """Every species with an openly licensed photo, and those photos, for the photo quiz."""
    return data.quiz_photos()


@app.get("/api/how-to-report")
def how_to_report():
    """
    The general "How to report it" text from knowledge/how-to-report.md, word for word,
    with its sources. (The park field guide shows it once, instead of once per species.)
    """
    return data.general_report()


@app.get("/api/species/{species_id}")
def species_detail(species_id: str):
    """Everything the sidebar shows for one species (species_id = iNaturalist taxon ID)."""
    detail = data.species_detail(species_id)
    if detail is None:
        raise HTTPException(404, f"No sightings of species {species_id} in our data")
    return detail
