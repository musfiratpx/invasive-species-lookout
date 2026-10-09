"""
Queens park boundaries (official NYC Parks data) and "which park is this sighting in?".

Boundaries come from data/sources/queens_parks.geojson (made by scripts/fetch_parks.py).
Each park is a MultiPolygon: one or more shapes, each with an outer edge and maybe holes.

The point-in-polygon test is the classic "ray casting" method: draw a line from the
point to the right and count how many edges it crosses; an odd number means inside.
We check each park's bounding box first, so most parks are skipped instantly.
"""

import json
from functools import lru_cache

from app import config

PARKS_GEOJSON = config.DATA_DIR / "sources" / "queens_parks.geojson"


def _inside_ring(lng, lat, ring):
    """True if (lng, lat) is inside one closed ring of [lng, lat] points."""
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lng < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def point_in_multipolygon(lng, lat, multipolygon):
    """True if the point is inside any polygon (and not in one of its holes)."""
    for polygon in multipolygon:
        outer, holes = polygon[0], polygon[1:]
        if _inside_ring(lng, lat, outer) and not any(_inside_ring(lng, lat, h) for h in holes):
            return True
    return False


def _bbox(multipolygon):
    xs = [x for polygon in multipolygon for x, _ in polygon[0]]
    ys = [y for polygon in multipolygon for _, y in polygon[0]]
    return min(xs), min(ys), max(xs), max(ys)


# Names NYC Parks uses for many unrelated little properties. These are never merged,
# and get their address added so people can tell them apart.
GENERIC_NAMES = {"park", "sitting area", "garden", "triangle", "plaza", "mall", "playground"}


@lru_cache(maxsize=1)
def load_parks():
    """
    List of parks: {park_id, name, acres, type, address, geometry, bbox}. Empty if the file is missing.

    Some parks are recorded as several properties with the same name (e.g. two
    "Kissena Corridor Park" pieces). People think of them as one park, so properties
    with the same specific name are merged into one, using the first property ID.
    """
    if not PARKS_GEOJSON.exists():
        return []
    merged = {}
    for feature in json.loads(PARKS_GEOJSON.read_text())["features"]:
        props = feature["properties"]
        geometry = feature["geometry"]
        coords = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        name = (props.get("name") or "Unnamed park").strip()
        generic = name.lower() in GENERIC_NAMES
        if generic and props.get("address"):
            name = f"{name} at {props['address'].title()}"
        key = props["park_id"] if generic else name.lower()
        if key in merged:
            park = merged[key]
            park["geometry"] = park["geometry"] + coords
            park["acres"] = (park["acres"] or 0) + (props.get("acres") or 0)
            park["park_id"] = min(park["park_id"], props["park_id"])
        else:
            merged[key] = {**props, "name": name, "geometry": coords}
    parks = list(merged.values())
    for park in parks:
        park["bbox"] = _bbox(park["geometry"])
    return parks


def park_for(lng, lat, parks=None):
    """The park a point falls in, or None. If parks overlap, the smallest one wins (most specific)."""
    hits = []
    for park in parks if parks is not None else load_parks():
        x0, y0, x1, y1 = park["bbox"]
        if x0 <= lng <= x1 and y0 <= lat <= y1 and point_in_multipolygon(lng, lat, park["geometry"]):
            hits.append(park)
    return min(hits, key=lambda p: p.get("acres") or 0) if hits else None
