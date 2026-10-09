"""
Collect real photos and (if any exist) one real sound recording for each species
in data/cache/observations.csv. Saves data/cache/media.json.

Photos: up to 8 per species from research-grade observations, Kissena first, then
New York City if we have fewer than 3. Creative Commons photos are preferred; we
only fall back to "all rights reserved" photos (shown as a link, not embedded) if
there aren't enough CC ones.

Sound: animals only (plants don't make sounds). Kissena first, then NYC, then
New York State. At most one recording.
If iNaturalist has none, we store null. We NEVER create or generate a sound.

Usage (from backend/):  python scripts/fetch_media.py
"""

import json

import _setup  # noqa: F401  (adds backend/ to the import path)
import pandas as pd
from _setup import NY_STATE_PLACE_ID, NYC_PLACE_ID, area_params
from pyinaturalist import get_observations

from app import config

MAX_PHOTOS = 8
MIN_PHOTOS_BEFORE_FALLBACK = 3
# Plants and fungi don't make sounds. A "sound" on a plant observation is really
# birdsong or wind recorded nearby, so showing it as "how it sounds" would mislead.
SILENT_GROUPS = {"Plantae", "Fungi", "Chromista", "Protozoa"}

CC_LICENSES = ["cc0", "cc-by", "cc-by-nc", "cc-by-sa", "cc-by-nd", "cc-by-nc-sa", "cc-by-nc-nd"]


def photo_record(photo, obs):
    """Keep only what the frontend needs, plus attribution and license."""
    square_url = photo["url"]  # iNaturalist gives the small "square" size; other sizes share the URL
    return {
        "photo_id": photo["id"],
        "medium_url": square_url.replace("/square.", "/medium."),
        "large_url": square_url.replace("/square.", "/large."),
        "attribution": photo.get("attribution", ""),
        "license": photo.get("license_code"),  # None means "all rights reserved"
        "observation_url": f"https://www.inaturalist.org/observations/{obs['id']}",
    }


def find_photos(species_id, where, licenses):
    """Photos from research-grade observations of one species in one area."""
    params = {"taxon_id": species_id, "quality_grade": "research", "photos": True,
              "per_page": 30, "order_by": "votes", **where}
    if licenses:
        params["photo_license"] = [code.upper() for code in licenses]  # the API wants "CC-BY", returns "cc-by"
    photos = []
    for obs in get_observations(**params)["results"]:
        for photo in obs.get("photos", [])[:1]:  # one photo per observation gives more variety
            if licenses is None or photo.get("license_code") in licenses:
                photos.append(photo_record(photo, obs))
    return photos


def collect_photos(species_id):
    """CC photos from Kissena, then CC from NYC, then any license, until we have enough."""
    attempts = [
        (area_params(), CC_LICENSES),
        ({"place_id": NYC_PLACE_ID}, CC_LICENSES),
        ({"place_id": NYC_PLACE_ID}, None),
    ]
    photos, seen = [], set()
    for where, licenses in attempts:
        if len(photos) >= MIN_PHOTOS_BEFORE_FALLBACK:
            break
        for photo in find_photos(species_id, where, licenses):
            if photo["photo_id"] not in seen:
                seen.add(photo["photo_id"])
                photos.append(photo)
    return photos[:MAX_PHOTOS]


def find_sound(species_id):
    """
    One real recording: Kissena, then NYC, then NY State. Returns a dict or None.
    We look for a Creative Commons recording in all three areas first, because
    "all rights reserved" ones can only be linked to, not played in the app.
    """
    for licenses in (CC_LICENSES, None):
        for where in (area_params(), {"place_id": NYC_PLACE_ID}, {"place_id": NY_STATE_PLACE_ID}):
            params = {"taxon_id": species_id, "sounds": True, "quality_grade": "research", "per_page": 10, **where}
            if licenses:
                params["sound_license"] = [code.upper() for code in licenses]
            for obs in get_observations(**params)["results"]:
                for sound in obs.get("sounds", []):
                    if sound.get("file_url") and (licenses is None or sound.get("license_code") in licenses):
                        return {
                            "file_url": sound["file_url"],
                            "file_content_type": sound.get("file_content_type"),
                            "attribution": sound.get("attribution", ""),
                            "license": sound.get("license_code"),  # None means "all rights reserved"
                            # The observer's own words, so the UI can say what you're hearing
                            # (e.g. the spongy moth "sound" is caterpillar droppings falling).
                            "observer_note": (obs.get("description") or "").strip()[:300],
                            "observation_url": f"https://www.inaturalist.org/observations/{obs['id']}",
                        }
    return None


def main():
    observations = pd.read_csv(config.OBSERVATIONS_CSV)
    species = observations.drop_duplicates("species_id")[["species_id", "listed_name", "iconic_taxon"]]
    print(f"Collecting media for {len(species)} species (about 1 request per second)...")

    media = {}
    for _, row in species.iterrows():
        species_id = int(row["species_id"])
        photos = collect_photos(species_id)
        sound = None if row["iconic_taxon"] in SILENT_GROUPS else find_sound(species_id)
        media[str(species_id)] = {"scientific_name": row["listed_name"], "photos": photos, "sound": sound}
        cc = sum(1 for p in photos if p["license"])
        print(f"  {row['listed_name']:32s} photos: {len(photos)} ({cc} CC)   sound: {'yes' if sound else 'none'}")

    config.MEDIA_JSON.write_text(json.dumps(media, indent=2))
    with_sound = sum(1 for m in media.values() if m["sound"])
    print(f"\nSaved {config.MEDIA_JSON.relative_to(config.BACKEND_DIR)}. "
          f"{with_sound} of {len(media)} species have a real recording.")


if __name__ == "__main__":
    main()
