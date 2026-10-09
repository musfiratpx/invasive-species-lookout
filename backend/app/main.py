"""
The FastAPI app: the web server the frontend talks to.

Run it from backend/:   uvicorn app.main:app --reload
Then open http://localhost:8000/docs to try every endpoint in the browser.
"""

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import config, data

app = FastAPI(
    title="Kissena Invasive Watch API",
    description="Invasive species sightings across Queens, New York City.",
)

# Let the Next.js dev server (a different port) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _count_cached_observations():
    """Count rows in the observations cache without loading pandas."""
    path = config.OBSERVATIONS_CSV
    if not path.exists():
        return 0
    with path.open() as f:
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


@app.get("/api/map/observations")
def map_observations(
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
    return data.map_observations(box)


@app.get("/api/species")
def species_list():
    """Every NY-listed invasive species seen in the area, most-sighted first."""
    return data.species_list()


@app.get("/api/parks")
def park_list():
    """Every Queens park with at least one sighting (official NYC Parks boundaries), most sightings first."""
    return data.park_list()


@app.get("/api/parks/{park_id}")
def park_detail(park_id: str):
    """A park's profile: its listed species, danger mix, months, recent sightings and outline."""
    detail = data.park_detail(park_id)
    if detail is None:
        raise HTTPException(404, f"No park {park_id} in our data")
    return detail


@app.get("/api/species/{species_id}")
def species_detail(species_id: str):
    """Everything the sidebar shows for one species (species_id = iNaturalist taxon ID)."""
    detail = data.species_detail(species_id)
    if detail is None:
        raise HTTPException(404, f"No sightings of species {species_id} in our data")
    return detail
