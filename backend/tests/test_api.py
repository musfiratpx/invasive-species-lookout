"""
Smoke tests for the API, run against the real cached data in data/cache/.
They check the shape of each response and the ground rules, not exact numbers,
because the numbers change whenever the fetch scripts are re-run.
"""

import json

from fastapi.testclient import TestClient

from app.config import ACTIVITY_JSON, KNOWLEDGE_DIR, PHOTO_ORDER_JSON
from app.main import app

client = TestClient(app)


def test_health():
    body = client.get("/api/health").json()
    assert body["ok"] is True
    assert body["observations"] > 0


def test_species_list_is_sorted_and_ranked_from_data():
    species = client.get("/api/species").json()
    assert len(species) > 0
    counts = [s["sightings"] for s in species]
    assert counts == sorted(counts, reverse=True)
    for s in species:
        assert s["danger_level"] in {None, 1, 2, 3, 4}
        if s["danger_level"] is None:
            assert s["danger_label"] == "Not yet ranked"


def test_species_detail_has_every_sidebar_section():
    species_id = client.get("/api/species").json()[0]["species_id"]
    body = client.get(f"/api/species/{species_id}").json()
    for key in ("scientific_name", "common_name", "ny_status", "danger", "kissena_status",
                "sightings", "photos", "sound", "insights"):
        assert key in body
    assert len(body["sightings"]["by_month_of_year"]) == 12
    # Handling is safety information: it always has text (the cautious default if no source)
    assert body["insights"]["handling"]["text"]


def test_every_photo_has_credit():
    for s in client.get("/api/species").json():
        for photo in client.get(f"/api/species/{s['species_id']}").json()["photos"]:
            assert photo["attribution"]
            assert photo["observation_url"].startswith("https://www.inaturalist.org/observations/")


def test_unknown_species_is_404():
    assert client.get("/api/species/0").status_code == 404


def test_bbox_filters_and_validates():
    all_points = client.get("/api/map/observations").json()
    some = client.get("/api/map/observations?bbox=-73.81,40.74,-73.80,40.75").json()
    assert 0 < len(some) < len(all_points)
    assert client.get("/api/map/observations?bbox=1,2,3").status_code == 400
    assert client.get("/api/map/observations?bbox=a,b,c,d").status_code == 400


def test_parks_list_and_profile():
    parks = client.get("/api/parks").json()
    assert len(parks) > 0
    assert [p["sightings"] for p in parks] == sorted((p["sightings"] for p in parks), reverse=True)
    profile = client.get(f"/api/parks/{parks[0]['park_id']}").json()
    assert profile["sightings"] == parks[0]["sightings"]
    assert profile["species_count"] == len(profile["species"]) == parks[0]["species"]
    assert sum(s["sightings"] for s in profile["species"]) == profile["sightings"]
    assert len(profile["by_month_of_year"]) == 12
    assert profile["outline"]["type"] == "MultiPolygon"
    assert client.get("/api/parks/NOPE").status_code == 404


def test_park_outlines_cover_every_park_with_sightings():
    parks = client.get("/api/parks").json()
    outlines = client.get("/api/parks/outlines").json()
    assert outlines["type"] == "FeatureCollection"
    assert [f["properties"]["park_id"] for f in outlines["features"]] == [p["park_id"] for p in parks]
    for feature in outlines["features"]:
        assert feature["geometry"]["type"] == "MultiPolygon"
        assert feature["properties"]["name"]


def test_cached_map_observations_match_with_and_without_gzip():
    zipped = client.get("/api/map/observations", headers={"Accept-Encoding": "gzip"})
    plain = client.get("/api/map/observations", headers={"Accept-Encoding": "identity"})
    assert zipped.headers["content-encoding"] == "gzip"
    assert "content-encoding" not in plain.headers
    assert zipped.json() == plain.json()  # the test client unzips it for us
    assert int(zipped.headers["x-total-bytes"]) == len(plain.content)


def test_quiz_uses_only_openly_licensed_credited_photos():
    quiz = client.get("/api/quiz").json()
    assert len(quiz) >= 3  # enough species for three answer choices
    for species in quiz:
        assert species["photos"]
        for photo in species["photos"]:
            assert photo["license"] and photo["attribution"]
            assert photo["observation_url"].startswith("https://www.inaturalist.org/observations/")


def test_hand_picked_photos_come_first_and_misleading_ones_skip_the_quiz():
    order = json.loads(PHOTO_ORDER_JSON.read_text(encoding="utf-8"))
    quiz = {s["species_id"]: s for s in client.get("/api/quiz").json()}
    for species_id, choice in order.items():
        if species_id.startswith("_"):
            continue  # the "_about" note
        photos = client.get(f"/api/species/{species_id}").json()["photos"]
        assert [p["observation_url"] for p in photos[:len(choice["first"])]] == choice["first"]
        quiz_links = {p["observation_url"] for p in quiz[species_id]["photos"]}
        assert not quiz_links & set(choice.get("not_in_quiz", []))


def test_report_note_is_only_the_species_own_advice():
    general = client.get("/api/how-to-report").json()["text"]
    for s in client.get("/api/species").json():
        insights = client.get(f"/api/species/{s['species_id']}").json()["insights"]
        note = insights["report_note"]
        if note:
            assert note in insights["report"] and note not in general
        elif insights["report"]:
            assert insights["report"] == general  # nothing species-specific: just the general text


def test_seasonality_is_also_adjusted_for_how_busy_each_month_is():
    sightings = client.get("/api/species/52856").json()["sightings"]  # common mugwort
    totals = json.loads(ACTIVITY_JSON.read_text(encoding="utf-8"))
    for raw, adjusted, all_sightings in [
        (sightings["by_month_of_year"], sightings["by_month_per_10k"], totals["area"]),
        (sightings["nyc_by_month_of_year"], sightings["nyc_by_month_per_10k"], totals["nyc"]),
    ]:
        assert len(adjusted) == 12
        for count, share, total in zip(raw, adjusted, all_sightings):
            assert abs(share - 10000 * count / total) < 0.1


def test_how_to_report_is_word_for_word_with_sources():
    body = client.get("/api/how-to-report").json()
    assert "iMapInvasives" in body["text"]
    assert body["text"] in (KNOWLEDGE_DIR / "how-to-report.md").read_text(encoding="utf-8")  # not rewritten
    assert all(s["url"].startswith("https://") for s in body["sources"]) and body["sources"]
