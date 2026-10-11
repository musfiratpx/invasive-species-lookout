# How we score

 Every number comes from an official source or a simple count of real sightings.

## Is it invasive?

A species is **invasive** in this app only if it appears on New York's official list of prohibited and regulated invasive species: NYS DEC, 6 NYCRR Part 575 (`backend/data/ny_invasive_list.csv`). iNaturalist's "introduced" label does not count. Pigeons, for example, are introduced but not on the list.

## Danger level (1–4)

| Level | Label | Plants (NY invasiveness rank) | Animals, fungi, algae (Part 575 category) |
|---|---|---|---|
| 4 | Very High | Very High (score above 80) | — |
| 3 | High | High (70–80) | Prohibited |
| 2 | Moderate | Moderate (50–69.99) | Regulated |
| 1 | Low | Low (40–49.99) or Insignificant (below 40) | — |
| — | Not yet ranked | No usable rank | Not on the list |

- **Plants:** the rank comes from that species' *New York Non-Native Plant Invasiveness Ranking Form* on nyis.info. Experts score how much harm a plant does to ecosystems, how well it spreads, how widespread it is and how hard it is to control. The score is out of 100.
- **Animals and others:** New York has no matching 0–100 rank for these, so we use the legal category. *Prohibited* means it can't be sold, moved or released at all. *Regulated* means it can be sold, but not released into the wild.
- **"Not yet ranked"** means we found no official rank. We never guess one.
- **Health warnings** (for example, giant hogweed sap burning skin) are shown only when an official source says so.

Built by `backend/scripts/build_danger_levels.py`. Matching code: `backend/app/danger.py`. A name matches by exact name or synonym first, then with the subspecies trimmed, then by a whole-genus entry such as *Amynthas* spp.

## Status in NYC (`nyc_status` in the API)

Computed from research-grade iNaturalist sightings in our area, which is all of New York City by default (`backend/app/status.py`):

| Tag | Rule |
|---|---|
| Common here | 20 or more sightings in total |
| Spreading | Sightings so far this year are more than 1.5× the same period last year, and at least 5 |
| New arrival | The first sighting in the area was within the last 365 days |

**Caveat:** these tags count what people *reported*, not a field survey. 