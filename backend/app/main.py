"""
The FastAPI app: the web server the frontend talks to.

Run it from backend/:   uvicorn app.main:app --reload
Then open http://localhost:8000/docs to try every endpoint in the browser.
"""

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config

app = FastAPI(
    title="Kissena Invasive Watch API",
    description="Invasive species sightings around Kissena Park and Queens College.",
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
        "rag_mode": "gemini" if config.gemini_enabled() else "extractive",
        "retriever": "snowflake" if config.snowflake_enabled() else "keyword",
    }
