"""
Load the official NY invasive species list (data/ny_invasive_list.csv).

Ground rule: a species counts as invasive in this app ONLY if it is in that file.
This module just reads it; it never adds or guesses species.
"""

import csv

from app import config


def normalize_name(name):
    """Make names comparable: lowercase, single spaces, and '×' written as 'x'."""
    return " ".join(name.replace("×", "x").lower().split())


def load_invasive_list():
    """Return a list of dicts, one per listed species, with a parsed 'all_names' list."""
    with config.INVASIVE_LIST_CSV.open(newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        synonyms = [s.strip() for s in row["synonyms"].split(";") if s.strip()]
        row["all_names"] = [row["scientific_name"]] + synonyms
    return rows
