"""
"Kissena status" tags for a species, computed with pandas from cached sightings.

  new_arrival  - the first sighting in our area was within the last 365 days
  spreading    - sightings so far this year > 1.5 x the same period last year, and at least 5 this year
  common_here  - 20 or more sightings in total

A species can have several tags, or none. These describe what people have
*reported* on iNaturalist, not a field survey, and docs/SCORING.md says so.
"""

from datetime import date

import pandas as pd

NEW_ARRIVAL_DAYS = 365
SPREADING_FACTOR = 1.5
SPREADING_MIN_SIGHTINGS = 5
COMMON_MIN_SIGHTINGS = 20


def _same_period_count(dates, year, today):
    """Sightings from Jan 1 of `year` up to the same month/day as `today`."""
    start = pd.Timestamp(year=year, month=1, day=1)
    # Feb 29 doesn't exist in most years, so clamp it to Feb 28.
    day = 28 if (today.month, today.day) == (2, 29) else today.day
    end = pd.Timestamp(year=year, month=today.month, day=day)
    return int(((dates >= start) & (dates <= end)).sum())


def kissena_status(observed_on, today=None):
    """
    Status tags for one species.

    observed_on: the dates of that species' sightings (strings or dates)
    today:       pass a date in tests; defaults to the real today
    """
    today = today or date.today()
    dates = pd.to_datetime(pd.Series(observed_on), errors="coerce").dropna()
    if dates.empty:
        return []

    tags = []
    first_seen = dates.min()
    if (pd.Timestamp(today) - first_seen).days <= NEW_ARRIVAL_DAYS:
        tags.append("new_arrival")

    this_year = _same_period_count(dates, today.year, today)
    last_year = _same_period_count(dates, today.year - 1, today)
    if this_year >= SPREADING_MIN_SIGHTINGS and this_year > last_year * SPREADING_FACTOR:
        tags.append("spreading")

    if len(dates) >= COMMON_MIN_SIGHTINGS:
        tags.append("common_here")
    return tags


def status_for_all(observations, today=None):
    """{species_id: [tags]} for every species in the observations DataFrame."""
    return {
        str(species_id): kissena_status(group["observed_on"], today)
        for species_id, group in observations.groupby("species_id")
    }
