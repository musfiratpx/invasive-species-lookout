"""
Download research-grade iNaturalist sightings of NY-listed invasive species in our area.

Steps:
  1. Look up every name on ny_invasive_list.csv on iNaturalist to get its taxon ID.
     iNaturalist's search understands synonyms, e.g. "Ampelopsis brevipedunculata"
     finds "Ampelopsis glandulosa var. brevipedunculata". Saved to data/cache/taxon_map.json
     so we only do this once (use --refresh-taxa to redo it).
  2. Get the list of all species seen in the area, and keep only the listed ones.
  3. Download every research-grade observation of those species.
  4. Save data/cache/observations.csv and print a summary.

Ground rules: only species on the official list count as invasive, and every row
is a real iNaturalist observation. pyinaturalist rate-limits our requests.

Usage (from backend/):  python scripts/fetch_observations.py [--refresh-taxa]
"""

import csv
import json
import sys
from collections import Counter

import _setup  # noqa: F401  (adds backend/ to the import path)
from _setup import area_params, polite
from pyinaturalist import get_observation_species_counts, get_observations, get_taxa

from app import config
from app.invasive_list import load_invasive_list, normalize_name

TAXON_MAP_JSON = config.CACHE_DIR / "taxon_map.json"

OBSERVATION_COLUMNS = [
    "observation_id", "observed_on", "scientific_name", "common_name", "iconic_taxon",
    "taxon_id", "latitude", "longitude", "place_guess", "url", "license", "observer", "obscured",
    # How precise the public location is, in meters (blank if the observer didn't say).
    # Some sightings are only placed at a borough like "Queens" (its center point), so the map hides imprecise ones.
    "accuracy_m",
    # Extra columns: which list entry this sighting belongs to. A sighting of a
    # variety (taxon_id) is grouped under the listed species (species_id).
    "species_id", "listed_name",
]


def resolve_name(name):
    """Find the iNaturalist taxon whose name or synonym exactly equals `name`. Returns a dict or None."""
    response = polite(get_taxa, q=name, per_page=10)
    wanted = normalize_name(name)
    for taxon in response["results"]:
        if not taxon.get("is_active", True):
            continue
        names = {normalize_name(taxon["name"]), normalize_name(taxon.get("matched_term", ""))}
        if wanted in names:
            return taxon
    return None


def build_taxon_map(listed, refresh=False):
    """Map each listed species to an iNaturalist taxon, trying its synonyms in order."""
    if TAXON_MAP_JSON.exists() and not refresh:
        return json.loads(TAXON_MAP_JSON.read_text())

    print(f"Looking up {len(listed)} listed species on iNaturalist (about 1 per second)...")
    taxon_map = {}
    for species in listed:
        entry = None
        for name in species["all_names"]:
            taxon = resolve_name(name)
            if taxon:
                entry = {"taxon_id": taxon["id"], "inat_name": taxon["name"],
                         "rank": taxon["rank"], "matched_on": name}
                break
        taxon_map[species["scientific_name"]] = entry
        if entry is None:
            print(f"  no iNaturalist match: {species['scientific_name']}")
        elif entry["inat_name"] != species["scientific_name"]:
            print(f"  {species['scientific_name']} -> {entry['inat_name']} ({entry['rank']})")

    TAXON_MAP_JSON.write_text(json.dumps(taxon_map, indent=2))
    return taxon_map


def species_in_area():
    """All taxa with research-grade sightings in the area: list of taxon dicts with ancestor_ids."""
    response = polite(get_observation_species_counts, quality_grade="research", page="all", **area_params())
    return [r["taxon"] for r in response["results"]]


def match_to_list(area_taxa, taxon_map):
    """
    Return {area_taxon_id: listed_scientific_name} for taxa that are on the list.

    A taxon matches if it IS the listed taxon or sits BELOW it (a variety or
    subspecies of a listed species, or a species in a listed genus like Amynthas).
    """
    listed_ids = {entry["taxon_id"]: name for name, entry in taxon_map.items() if entry}
    matches = {}
    for taxon in area_taxa:
        for taxon_id in [taxon["id"]] + list(reversed(taxon.get("ancestor_ids") or [])):
            if taxon_id in listed_ids:
                matches[taxon["id"]] = listed_ids[taxon_id]
                break
    return matches


def report_near_misses(area_taxa, taxon_map):
    """
    Some list entries are below species level (a variety or subspecies, like the
    red-eared slider). Sightings identified only to the parent species do NOT count,
    because the list doesn't say so. We print them so the Researcher can decide.
    """
    area_species = {t["id"]: t["name"] for t in area_taxa if t["rank"] == "species"}
    for listed_name, entry in taxon_map.items():
        if not entry or entry["rank"] in ("species", "genus", "hybrid"):
            continue
        parent_id = polite(get_taxa, taxon_id=entry["taxon_id"])["results"][0]["parent_id"]
        if parent_id in area_species:
            print(f"  note: '{listed_name}' is listed below species level; sightings of "
                  f"{area_species[parent_id]} identified only to species are NOT counted.")


def download_observations(matches, taxon_map):
    """Download all research-grade observations of the matched taxa in the area."""
    response = polite(
        get_observations,
        taxon_id=list(matches.keys()), quality_grade="research", page="all", per_page=200, **area_params()
    )
    rows = []
    for obs in response["results"]:
        taxon = obs.get("taxon") or {}
        listed_name = matches.get(taxon.get("id"))
        if not listed_name or not obs.get("location"):
            continue  # skip anything we can't place on the map
        lat, lng = obs["location"]
        observed_on = obs.get("observed_on")
        rows.append({
            "observation_id": obs["id"],
            # pyinaturalist sometimes gives a datetime and sometimes a string; keep just YYYY-MM-DD
            "observed_on": str(observed_on)[:10] if observed_on else "",
            "scientific_name": taxon.get("name", ""),
            "common_name": taxon.get("preferred_common_name", ""),
            "iconic_taxon": taxon.get("iconic_taxon_name", ""),
            "taxon_id": taxon.get("id"),
            "latitude": lat,
            "longitude": lng,
            "place_guess": obs.get("place_guess") or "",
            "url": f"https://www.inaturalist.org/observations/{obs['id']}",
            "license": obs.get("license_code") or "",
            "observer": (obs.get("user") or {}).get("login", ""),
            "obscured": bool(obs.get("obscured")),
            "accuracy_m": obs.get("public_positional_accuracy") or obs.get("positional_accuracy") or "",
            "species_id": taxon_map[listed_name]["taxon_id"],
            "listed_name": listed_name,
        })
    return rows


def main():
    refresh = "--refresh-taxa" in sys.argv
    config.CACHE_DIR.mkdir(parents=True, exist_ok=True)

    listed = load_invasive_list()
    taxon_map = build_taxon_map(listed, refresh=refresh)
    print(f"Matched {sum(1 for e in taxon_map.values() if e)} of {len(listed)} listed species to iNaturalist taxa.")

    print(f"Getting species seen in the area ({area_params()})...")
    area_taxa = species_in_area()
    matches = match_to_list(area_taxa, taxon_map)
    print(f"{len(area_taxa)} taxa seen in the area; {len(matches)} are on the NY invasive list.")
    report_near_misses(area_taxa, taxon_map)

    if not matches:
        print("No listed species found, so observations.csv was not changed.")
        return

    rows = download_observations(matches, taxon_map)
    rows.sort(key=lambda r: r["observed_on"], reverse=True)
    with config.OBSERVATIONS_CSV.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OBSERVATION_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nSaved {len(rows)} observations to {config.OBSERVATIONS_CSV.relative_to(config.BACKEND_DIR)}")
    print("Sightings per listed species:")
    for name, n in Counter(r["listed_name"] for r in rows).most_common():
        print(f"  {n:5d}  {name}")
    print(f"Obscured locations: {sum(r['obscured'] for r in rows)}")


if __name__ == "__main__":
    main()
