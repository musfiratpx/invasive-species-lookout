"""Tests for the point-in-park check (app/parks.py), using made-up EXAMPLE shapes."""

from app.parks import park_for, point_in_multipolygon

# A 10x10 square with a 2x2 hole in the middle (EXAMPLE geometry, not a real park).
SQUARE_WITH_HOLE = [[
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
]]


def test_inside_outside_and_hole():
    assert point_in_multipolygon(1, 1, SQUARE_WITH_HOLE)
    assert not point_in_multipolygon(11, 5, SQUARE_WITH_HOLE)
    assert not point_in_multipolygon(5, 5, SQUARE_WITH_HOLE)  # in the hole


def test_smallest_overlapping_park_wins():
    big = {"park_id": "BIG", "acres": 100, "geometry": [[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]], "bbox": (0, 0, 10, 10)}
    small = {"park_id": "SMALL", "acres": 1, "geometry": [[[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]], "bbox": (1, 1, 3, 3)}
    assert park_for(2, 2, [big, small])["park_id"] == "SMALL"
    assert park_for(8, 8, [big, small])["park_id"] == "BIG"
    assert park_for(20, 20, [big, small]) is None
