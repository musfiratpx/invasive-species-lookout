"""
Find one real, openly licensed photo for each park with sightings, from Wikipedia /
Wikimedia Commons. Saves data/cache/park_photos.json (the app reads only that file).

How a park gets a photo (so we never show a photo of the wrong place):
  1. Ask Wikipedia for articles whose map location is near the park (geosearch).
  2. Keep an article only if its name is the park's name (ignoring "(Queens)" and
     punctuation) AND its location is inside the park's official boundary, or within
     about 300 m of it.
  3. Use that article's main photo, but only a freely licensed one (Wikipedia's
     "free" filter), hosted on Wikimedia Commons, with a Creative Commons or public
     domain license. Maps, logos and drawings (.svg) are skipped.
  4. We looked at every photo by eye; the few that don't show the park are in REJECTED.
Parks with no match get no photo; the profile just shows no photo.

Every saved photo keeps its photographer, license and a link to its Commons page,
which the park profile shows under the photo (CLAUDE.md rule 9).

Polite to Wikimedia: one request per second, a User-Agent that says who we are,
and batches of 50 titles where the API allows it.

Usage (from backend/):  python scripts/fetch_park_photos.py
"""

import html
import json
import math
import re
import time

import _setup  # noqa: F401  (adds backend/ to the import path)
import requests

from app import config, data
from app.parks import point_in_multipolygon

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "InvasiveSpeciesLookout/1.0 (https://github.com/musfiratpx/invasive-species-lookout; student hackathon project)"}
OUTPUT = config.CACHE_DIR / "park_photos.json"
NEAR_DEGREES = 0.003  # about 300 m: an article's pin can sit just outside a park's edge
PHOTO_WIDTH = 1024  # big enough for the panel, small enough to load fast
SKIP_FILE_WORDS = ("map", "logo", "locator", "location", "seal", "flag", "plan", "diagram")
# Photos we looked at (2026-10-11) and left out: real, but they don't show the park well
# or would mislead. Keyed by park ID, with the reason.
REJECTED = {
    "M283": "Battery Park City: the article is the neighborhood; the photo is its skyscrapers",
    "M369": "Pier 42: a 1970s photo of a ship and the Twin Towers, not today's park",
    "B369": "Steeplechase Park: a 1900s photo of the old amusement park",
    "M039": "Harlem River Park: a close-up of a plaque",
    "M108Q1": "Andrew Haswell Green Park: mostly a highway",
    "M145": "Albert Capsouto Park: mostly a building",
    "M170": "Petrosino Square: a Citi Bike station",
    "Q219": "Rockaway Freeway: a street",
}


def get(url, **params):
    """One API call, after a 1-second pause (Wikimedia asks bots to go slowly)."""
    time.sleep(1)
    response = requests.get(url, params={"format": "json", "formatversion": 2, **params}, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return response.json()


def normalize(name):
    """'Flushing Meadows–Corona Park (Queens)' and 'Flushing Meadows Corona Park' -> the same text."""
    name = re.sub(r"\(.*?\)", "", name.lower()).replace("&", " and ")
    name = re.sub(r"[^a-z0-9 ]", " ", name)
    name = re.sub(r"^the ", "", " ".join(name.split()))
    return name


def bbox(multipolygon):
    xs = [x for polygon in multipolygon for x, _ in polygon[0]]
    ys = [y for polygon in multipolygon for _, y in polygon[0]]
    return min(xs), min(ys), max(xs), max(ys)


def matching_article(park):
    """The Wikipedia article about this park (name matches, pin inside or next to it), or None."""
    geometry = data.parks_by_id()[park["park_id"]]["geometry"]
    west, south, east, north = bbox(geometry)
    lat, lng = (south + north) / 2, (west + east) / 2
    # Search a circle that covers the whole park (Wikipedia's limit is 10 km).
    half_diagonal_m = math.hypot((east - west) * 84_000, (north - south) * 111_000) / 2
    radius = int(min(10_000, max(300, half_diagonal_m + 300)))
    results = get(WIKIPEDIA_API, action="query", list="geosearch", gscoord=f"{lat}|{lng}",
                  gsradius=radius, gslimit=500, gsprimary="primary")["query"]["geosearch"]
    wanted = normalize(park["name"])
    for article in results:
        if normalize(article["title"]) != wanted:
            continue
        a_lng, a_lat = article["lon"], article["lat"]
        inside = point_in_multipolygon(a_lng, a_lat, geometry)
        near = west - NEAR_DEGREES <= a_lng <= east + NEAR_DEGREES and south - NEAR_DEGREES <= a_lat <= north + NEAR_DEGREES
        if inside or near:
            return article["title"]
    return None


def main_images(titles):
    """{article title: free main image file name} for up to 50 articles at a time."""
    found = {}
    for start in range(0, len(titles), 50):
        batch = titles[start:start + 50]
        pages = get(WIKIPEDIA_API, action="query", prop="pageimages", piprop="name", pilicense="free",
                    titles="|".join(batch), redirects=1)["query"]["pages"]
        for page in pages:
            if page.get("pageimage"):
                found[page["title"]] = page["pageimage"].replace("_", " ")  # Commons titles use spaces
    return found


def plain(text):
    """Commons metadata is HTML; keep just the words."""
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", text or "")).split())


def commons_info(file_names):
    """{file name: photo record} for files on Commons with an open license."""
    found = {}
    for start in range(0, len(file_names), 50):
        batch = file_names[start:start + 50]
        pages = get(COMMONS_API, action="query", prop="imageinfo", iiprop="url|extmetadata|size",
                    iiurlwidth=PHOTO_WIDTH, titles="|".join(f"File:{name}" for name in batch))["query"]["pages"]
        for page in pages:
            if page.get("missing") or not page.get("imageinfo"):
                continue  # not on Commons (e.g. a file only on English Wikipedia)
            info = page["imageinfo"][0]
            meta = info.get("extmetadata", {})
            license_name = plain(meta.get("LicenseShortName", {}).get("value"))
            if not re.search(r"^(CC|Public domain|PD)", license_name, re.I):
                continue
            # Some "Artist" fields hold a whole paragraph of license text; then the credit
            # points people to the Commons page, which names the author properly.
            artist = plain(meta.get("Artist", {}).get("value"))
            if not artist or len(artist) > 80:
                artist = "see the Wikimedia Commons page"
            found[page["title"].removeprefix("File:")] = {
                "url": (info.get("thumburl") or info["url"]).split("?")[0],  # drop tracking parameters
                "width": info.get("thumbwidth") or info.get("width"),
                "height": info.get("thumbheight") or info.get("height"),
                "file_page": info["descriptionurl"],
                "artist": artist,
                "license": license_name,
                "license_url": plain(meta.get("LicenseUrl", {}).get("value")) or None,
            }
    return found


def main():
    parks = data.park_list()
    print(f"Looking for Wikipedia articles about {len(parks)} parks (about 1 per second)...")
    articles = {}
    for i, park in enumerate(parks, 1):
        title = matching_article(park)
        if title:
            articles[park["park_id"]] = title
        if i % 25 == 0:
            print(f"  {i}/{len(parks)} checked, {len(articles)} matched")

    images = main_images(sorted(set(articles.values())))
    usable = {t: f for t, f in images.items()
              if not f.lower().endswith(".svg") and not any(w in f.lower() for w in SKIP_FILE_WORDS)}
    photos = commons_info(sorted(set(usable.values())))

    result = {"_about": "One openly licensed Wikimedia Commons photo per park, from the main image of the park's "
                        "Wikipedia article (name and location checked against the official boundary). "
                        "Made by scripts/fetch_park_photos.py."}
    for park in parks:
        title = articles.get(park["park_id"])
        photo = photos.get(usable.get(title)) if title and park["park_id"] not in REJECTED else None
        if photo:
            result[park["park_id"]] = {
                "park_name": park["name"],
                "article": title,
                "article_url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                **photo,
            }
    OUTPUT.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\n{len(articles)} parks matched an article; {len(result) - 1} have an openly licensed photo.")
    print(f"Saved {OUTPUT.relative_to(config.BACKEND_DIR)}")


if __name__ == "__main__":
    main()
