"""
Build data/danger_levels.csv from two official sources:

  1. data/ny_invasive_list.csv        - NYS DEC 6 NYCRR Part 575 (prohibited / regulated)
  2. data/sources/nyis_plant_ranks.csv - NY plant invasiveness ranks (from import_nyis_ranks.py)

Rules (same as docs/SCORING.md and app/danger.py):
  - Plants with an NY rank: Very High -> 4, High -> 3, Moderate -> 2, Low -> 1, Insignificant -> 1
  - Everything else on the Part 575 list: prohibited -> 3, regulated -> 2
  - A plant with no usable rank ("Unknown", "Not Assessable", or no form) gets NO row,
    so the app shows "Not yet ranked". We never guess.

health_warning is left empty on purpose: the Researcher fills it in by hand,
only when an official source says so.

Usage (from backend/):  python scripts/build_danger_levels.py
"""

import csv
import json
import re
from datetime import date
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
LIST_CSV = BACKEND / "data" / "ny_invasive_list.csv"
RANKS_CSV = BACKEND / "data" / "sources" / "nyis_plant_ranks.csv"
OUT_CSV = BACKEND / "data" / "danger_levels.csv"
# Written by fetch_observations.py: each listed name -> its current iNaturalist name.
TAXON_MAP_JSON = BACKEND / "data" / "cache" / "taxon_map.json"

PART_575_URL = "https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf"

RANK_TO_LEVEL = {"Very High": 4, "High": 3, "Moderate": 2, "Low": 1, "Insignificant": 1}
STATUS_TO_LEVEL = {"prohibited": 3, "regulated": 2}

# A few forms cover several species at once, or use a different name than the
# Part 575 list. These were checked by reading the forms. Key = Part 575 name,
# value = start of the form's file name.
FORM_OVERRIDES = {
    "Lonicera x bella": "595a0_",       # form covers L. morrowii, L. tatarica, L. x bella
    "Reynoutria x bohemica": "19e83_",  # form covers Fallopia japonica, F. sachalinensis, F. x bohemica
}

# Some older forms use a different rank wording for the same scale.
RANK_ALIASES = {"Very High Invasive Nature": "Very High", "Low Invasive Nature": "Low"}


def words(text):
    """Lowercase words only, so 'Ranunculus-ficaria.NYS_.pdf' and 'Ranunculus ficaria' can match."""
    return set(re.sub(r"[^a-z]+", " ", text.lower().replace("×", "x")).split())


def find_form(species, forms):
    """Return the ranking form for a listed plant, or None."""
    name = species["scientific_name"]
    if name in FORM_OVERRIDES:
        return next(f for f in forms if f["file"].startswith(FORM_OVERRIDES[name]))

    names = [name] + [n for n in species["synonyms"].split(";") if n]
    for form in forms:
        # skip the 5-character id prefix in the file name, e.g. "1adce_"
        haystack = words(form["file"][6:] + " " + form["scientific_name"])
        for n in names:
            parts = sorted(words(n), key=n.lower().find)  # same splitting as haystack, in name order
            if parts[0] in haystack and parts[-1] in haystack and "x" not in parts:
                return form
    return None


def main():
    listed = list(csv.DictReader(LIST_CSV.open()))
    forms = list(csv.DictReader(RANKS_CSV.open()))
    today = date.today().isoformat()
    # iNaturalist's current name for each species becomes one more synonym, so a
    # sighting matches even when iNaturalist renamed it (Humulus japonicus -> Humulus scandens).
    taxon_map = json.loads(TAXON_MAP_JSON.read_text()) if TAXON_MAP_JSON.exists() else {}

    rows, unranked = [], []
    for sp in listed:
        names = [sp["scientific_name"]] + [n for n in sp["synonyms"].split(";") if n]
        inat = taxon_map.get(sp["scientific_name"])
        if inat and inat["inat_name"] not in names:
            names.append(inat["inat_name"])
        if len(sp["scientific_name"].split()) == 1:
            # A genus-only entry (e.g. "Amynthas" = Amynthas spp.) covers every species in it.
            names.append(sp["scientific_name"] + "*")
        match_names = ";".join(names)
        base = {
            "scientific_name": sp["scientific_name"],
            "match_names": match_names,
            "health_warning": "",
            "checked_on": today,
        }

        if sp["category"] == "plant":
            form = find_form(sp, forms)
            rank = RANK_ALIASES.get(form["rank"], form["rank"]) if form else ""
            if rank not in RANK_TO_LEVEL:
                why = f"form says '{form['rank_line']}'" if form else "no ranking form found"
                unranked.append(f"{sp['scientific_name']} ({why})")
                continue
            rows.append({**base, "basis": "ny_plant_rank", "ny_rank": rank,
                         "ny_rank_score": form["score"], "danger_level": RANK_TO_LEVEL[rank],
                         "source_url": form["url"]})
        else:
            rows.append({**base, "basis": "ny_part575_status", "ny_rank": "", "ny_rank_score": "",
                         "danger_level": STATUS_TO_LEVEL[sp["ny_status"]], "source_url": PART_575_URL})

    fields = ["scientific_name", "match_names", "basis", "ny_rank", "ny_rank_score",
              "danger_level", "health_warning", "source_url", "checked_on"]
    with OUT_CSV.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {OUT_CSV.relative_to(BACKEND)}")
    print(f"{len(unranked)} listed plants left as 'Not yet ranked':")
    for line in unranked:
        print("  -", line)


if __name__ == "__main__":
    main()
