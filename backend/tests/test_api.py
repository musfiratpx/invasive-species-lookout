"""
Smoke tests for the API, run against the real cached data in data/cache/.
They check the shape of each response and the ground rules, not exact numbers,
because the numbers change whenever the fetch scripts are re-run.
"""

from fastapi.testclient import TestClient

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
