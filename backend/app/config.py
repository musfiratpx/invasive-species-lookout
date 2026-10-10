"""
All settings in one place: the map area, file paths and which optional services are on.

Values come from backend/.env (see .env.example). Every setting has a safe default,
so the app starts with no .env at all.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


def _env(name, default=""):
    """Read an env var, treating 'set but empty' the same as 'not set'."""
    value = os.getenv(name, "").strip()
    return value or default


# --- Area -------------------------------------------------------------------
# By default we cover all of New York City (all five boroughs): iNaturalist place 674.
# Other places: 675 = Queens County, 125479 = Kissena Park, 125415 = Kissena Corridor Park.
# Set INAT_PLACE_IDS= (empty) in .env to use the circle below instead.
INAT_PLACE_IDS = [int(p) for p in os.getenv("INAT_PLACE_IDS", "674").split("#")[0].split(",") if p.strip()]

# The search circle (only used when INAT_PLACE_IDS is empty): 2 km around Kissena Park + Queens College.
AREA_LAT = float(_env("AREA_LAT", "40.741"))
AREA_LNG = float(_env("AREA_LNG", "-73.812"))
AREA_RADIUS_KM = float(_env("AREA_RADIUS_KM", "2"))

AREA_NAME = "New York City"

# --- Paths ------------------------------------------------------------------
DATA_DIR = BACKEND_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"
KNOWLEDGE_DIR = BACKEND_DIR / "knowledge"

INVASIVE_LIST_CSV = DATA_DIR / "ny_invasive_list.csv"
DANGER_LEVELS_CSV = DATA_DIR / "danger_levels.csv"
OBSERVATIONS_CSV = CACHE_DIR / "observations.csv"
MEDIA_JSON = CACHE_DIR / "media.json"
PHOTO_ORDER_JSON = DATA_DIR / "photo_order.json"  # hand-picked first photos (see the file)
SEASONALITY_JSON = CACHE_DIR / "seasonality.json"
ACTIVITY_JSON = CACHE_DIR / "activity_by_month.json"  # all sightings per month, to adjust seasonality for activity
INSIGHTS_DIR = CACHE_DIR / "insights"
EARLY_WARNING_JSON = CACHE_DIR / "early_warning.json"  # species first recorded in a borough recently (scripts/build_early_warning.py)

# --- Optional services --------------------------------------------------------
SNOWFLAKE = {
    "account": _env("SNOWFLAKE_ACCOUNT"),
    "user": _env("SNOWFLAKE_USER"),
    "pat": _env("SNOWFLAKE_PAT"),
    "role": _env("SNOWFLAKE_ROLE"),
    "warehouse": _env("SNOWFLAKE_WAREHOUSE"),
    "database": _env("SNOWFLAKE_DATABASE", "INVASIVE_WATCH"),
    "schema": _env("SNOWFLAKE_SCHEMA", "PUBLIC"),
    "search_service": _env("SNOWFLAKE_SEARCH_SERVICE", "KNOWLEDGE_SEARCH"),
    # Model for writing the sidebar text with Cortex. Empty = no AI writing (word-for-word fallback).
    "cortex_model": _env("SNOWFLAKE_CORTEX_MODEL"),
}

ELEVENLABS_API_KEY = _env("ELEVENLABS_API_KEY")

# Which websites may call this API from the browser. Comma-separated, so the deployed
# site and local development can both work, e.g. "https://x.onrender.com,http://localhost:3000".
FRONTEND_ORIGINS = [o.strip().rstrip("/") for o in _env("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if o.strip()]


def snowflake_enabled():
    """True only when every Snowflake setting needed to connect is filled in."""
    return all(SNOWFLAKE[k] for k in ("account", "user", "pat", "warehouse"))


def cortex_generation_enabled():
    """True when Snowflake is set up AND a Cortex model is chosen for writing text."""
    return snowflake_enabled() and bool(SNOWFLAKE["cortex_model"])
