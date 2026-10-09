"""
Shared setup for the scripts in this folder.

The scripts are run as `python scripts/<name>.py` from backend/. Python then only
looks for imports inside scripts/, so we add backend/ to the path. That lets every
script use `from app import config` like the server does.
"""

import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import config  # noqa: E402  (must come after the path fix above)


def area_params():
    """
    iNaturalist search parameters for our area.

    Uses the place IDs from .env when set (exact park boundaries), otherwise a
    circle around AREA_LAT/AREA_LNG (which also covers Queens College).
    """
    if config.INAT_PLACE_IDS:
        return {"place_id": config.INAT_PLACE_IDS}
    return {"lat": config.AREA_LAT, "lng": config.AREA_LNG, "radius": config.AREA_RADIUS_KM}


# iNaturalist place IDs used when Kissena alone has too few photos or sounds.
# Checked with the iNaturalist places API on 2026-10-09.
NYC_PLACE_ID = 674
NY_STATE_PLACE_ID = 48


def polite(api_function, **params):
    """
    Call a pyinaturalist function, pausing 1 second first. If iNaturalist says
    "slow down" (HTTP 429), wait and try again instead of crashing: 1, 2, then 4 minutes.
    """
    import requests

    for wait_minutes in (1, 2, 4, None):
        time.sleep(1)
        try:
            return api_function(**params)
        except requests.exceptions.HTTPError as error:
            if error.response is None or error.response.status_code != 429 or wait_minutes is None:
                raise
            print(f"    iNaturalist asked us to slow down; waiting {wait_minutes} min...")
            time.sleep(60 * wait_minutes)
