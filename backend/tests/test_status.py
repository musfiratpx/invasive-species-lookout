"""
Tests for the NYC status tags (app/status.py).

All dates here are EXAMPLE DATA made up for testing, not real sightings.
"""

from datetime import date

import pandas as pd

from app.status import status_tags, status_for_all

TODAY = date(2026, 10, 9)


def test_no_sightings_means_no_tags():
    assert status_tags([], TODAY) == []


def test_new_arrival():
    assert "new_arrival" in status_tags(["2026-03-01"], TODAY)


def test_not_new_if_first_seen_long_ago():
    assert "new_arrival" not in status_tags(["2020-05-01", "2026-03-01"], TODAY)


def test_common_here_at_20():
    assert "common_here" in status_tags(["2021-06-01"] * 20, TODAY)
    assert "common_here" not in status_tags(["2021-06-01"] * 19, TODAY)


def test_spreading():
    last_year = ["2025-05-01"] * 2
    this_year = ["2026-05-01"] * 5  # 5 > 2 * 1.5
    assert "spreading" in status_tags(last_year + this_year, TODAY)


def test_not_spreading_below_minimum():
    # 4 is more than 1.5x zero, but below the minimum of 5
    assert "spreading" not in status_tags(["2026-05-01"] * 4, TODAY)


def test_not_spreading_when_growth_is_small():
    last_year = ["2025-05-01"] * 10
    this_year = ["2026-05-01"] * 12  # 12 is not more than 10 * 1.5
    assert "spreading" not in status_tags(last_year + this_year, TODAY)


def test_spreading_compares_same_period_only():
    # Last year's sightings AFTER Oct 9 must not count against this year
    last_year_late = ["2025-12-01"] * 10
    this_year = ["2026-05-01"] * 5
    assert "spreading" in status_tags(last_year_late + this_year, TODAY)


def test_leap_day_today_does_not_crash():
    assert status_tags(["2023-02-01"], date(2024, 2, 29)) == []


def test_status_for_all_groups_by_species():
    df = pd.DataFrame({
        "species_id": [1] * 20 + [2],
        "observed_on": ["2020-06-01"] * 20 + ["2026-09-01"],
    })
    result = status_for_all(df, TODAY)
    assert result["1"] == ["common_here"]
    assert result["2"] == ["new_arrival"]
