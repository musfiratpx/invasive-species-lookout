"""
Danger level (1-4) for a species, looked up in data/danger_levels.csv.

Ground rule: danger level is NEVER made up by AI. It only comes from that file,
which is built from official NY sources (see docs/SCORING.md). If a species has
no row, find_danger() returns None and the UI shows "Not yet ranked".

How a name is matched, in order:
  1. Exact match against any name in the row's match_names (synonyms included).
  2. Trim a subspecies or variety: "Trachemys scripta elegans" -> "Trachemys scripta".
  3. Genus wildcard, only if a row lists one: "Amynthas*" matches "Amynthas agrestis".
"""

import csv
from functools import lru_cache

from app import config
from app.invasive_list import normalize_name

LEVEL_LABELS = {4: "Very High", 3: "High", 2: "Moderate", 1: "Low"}
NOT_RANKED_LABEL = "Not yet ranked"


def load_danger_table(path=None):
    """Read danger_levels.csv into a list of dicts."""
    path = path or config.DANGER_LEVELS_CSV
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


@lru_cache(maxsize=1)
def _default_table():
    # Read the file once per server start; it only changes when the Researcher edits it.
    return load_danger_table()


def trim_to_species(name):
    """
    Drop anything after genus + species: "Trachemys scripta elegans" -> "Trachemys scripta".
    Keeps hybrids whole: "Lonicera x bella" stays "Lonicera x bella".
    """
    words = normalize_name(name).split()
    keep = 3 if len(words) >= 3 and words[1] == "x" else 2
    return " ".join(words[:keep])


def _row_names(row):
    return [normalize_name(n) for n in row["match_names"].split(";") if n.strip()]


def find_row(scientific_name, table=None):
    """Return the matching danger_levels.csv row, or None. See the module docstring for the order."""
    table = table if table is not None else _default_table()
    wanted = normalize_name(scientific_name)
    trimmed = trim_to_species(scientific_name)
    genus = wanted.split()[0] if wanted else ""

    for candidate in (wanted, trimmed):
        for row in table:
            if candidate in _row_names(row):
                return row

    for row in table:
        if genus + "*" in _row_names(row):
            return row
    return None


def to_api(row):
    """Turn a CSV row into the 'danger' object the API returns (see docs/API.md)."""
    if row is None:
        return {"level": None, "label": NOT_RANKED_LABEL, "basis": None, "ny_rank": None,
                "score": None, "health_warning": None, "source_url": None}
    level = int(row["danger_level"])
    return {
        "level": level,
        "label": LEVEL_LABELS[level],
        "basis": row["basis"],
        "ny_rank": row["ny_rank"] or None,
        "score": float(row["ny_rank_score"]) if row["ny_rank_score"] else None,
        "health_warning": row["health_warning"] or None,
        "source_url": row["source_url"] or None,
    }


def find_danger(scientific_name, table=None):
    """The 'danger' object for a species name. level is None when it isn't ranked."""
    return to_api(find_row(scientific_name, table))
