"""
Tests for danger-level matching (app/danger.py).

Most tests use a tiny example table written here, so they don't break when the
Researcher edits the real data/danger_levels.csv. These rows are EXAMPLE DATA
for testing only. The last test checks that the real file is well formed.
"""

from app.danger import find_danger, find_row, load_danger_table, trim_to_species

EXAMPLE_TABLE = [
    {"scientific_name": "Ampelopsis brevipedunculata",
     "match_names": "Ampelopsis brevipedunculata;Ampelopsis glandulosa brevipedunculata",
     "basis": "ny_plant_rank", "ny_rank": "High", "ny_rank_score": "71.26", "danger_level": "3",
     "health_warning": "", "source_url": "https://example.org/ampelopsis", "checked_on": "2026-10-09"},
    {"scientific_name": "Trachemys scripta",
     "match_names": "Trachemys scripta",
     "basis": "ny_part575_status", "ny_rank": "", "ny_rank_score": "", "danger_level": "2",
     "health_warning": "", "source_url": "https://example.org/slider", "checked_on": "2026-10-09"},
    {"scientific_name": "Amynthas",
     "match_names": "Amynthas;Amynthas*",
     "basis": "ny_part575_status", "ny_rank": "", "ny_rank_score": "", "danger_level": "3",
     "health_warning": "", "source_url": "https://example.org/amynthas", "checked_on": "2026-10-09"},
    {"scientific_name": "Lonicera x bella",
     "match_names": "Lonicera x bella;Lonicera × bella",
     "basis": "ny_plant_rank", "ny_rank": "Very High", "ny_rank_score": "85.54", "danger_level": "4",
     "health_warning": "", "source_url": "https://example.org/lonicera", "checked_on": "2026-10-09"},
]


def test_exact_match():
    danger = find_danger("Ampelopsis brevipedunculata", EXAMPLE_TABLE)
    assert danger["level"] == 3
    assert danger["label"] == "High"
    assert danger["score"] == 71.26


def test_synonym_match():
    # iNaturalist's name for porcelain berry is different from the NY list's name
    danger = find_danger("Ampelopsis glandulosa brevipedunculata", EXAMPLE_TABLE)
    assert danger["level"] == 3


def test_match_ignores_case_and_spacing():
    assert find_row("  ampelopsis   BREVIPEDUNCULATA ", EXAMPLE_TABLE) is not None


def test_subspecies_is_trimmed():
    danger = find_danger("Trachemys scripta elegans", EXAMPLE_TABLE)
    assert danger["level"] == 2


def test_genus_wildcard():
    danger = find_danger("Amynthas agrestis", EXAMPLE_TABLE)
    assert danger["level"] == 3


def test_genus_wildcard_needs_a_star():
    # "Ampelopsis" is not listed as a whole genus, so another Ampelopsis species must not match
    assert find_row("Ampelopsis cordata", EXAMPLE_TABLE) is None


def test_hybrid_name_matches_with_either_x():
    assert find_danger("Lonicera × bella", EXAMPLE_TABLE)["level"] == 4
    assert find_danger("Lonicera x bella", EXAMPLE_TABLE)["level"] == 4


def test_no_match_is_not_yet_ranked():
    danger = find_danger("Columba livia", EXAMPLE_TABLE)  # rock pigeon: introduced, but not on the list
    assert danger["level"] is None
    assert danger["label"] == "Not yet ranked"
    assert danger["source_url"] is None


def test_trim_to_species():
    assert trim_to_species("Trachemys scripta elegans") == "trachemys scripta"
    assert trim_to_species("Lonicera x bella") == "lonicera x bella"
    assert trim_to_species("Celastrus orbiculatus") == "celastrus orbiculatus"


def test_real_file_is_well_formed():
    table = load_danger_table()
    assert len(table) > 0
    for row in table:
        assert row["danger_level"] in {"1", "2", "3", "4"}, row["scientific_name"]
        assert row["basis"] in {"ny_plant_rank", "ny_part575_status"}, row["scientific_name"]
        assert row["source_url"].startswith("https://"), row["scientific_name"]
        assert row["scientific_name"] in row["match_names"], row["scientific_name"]
