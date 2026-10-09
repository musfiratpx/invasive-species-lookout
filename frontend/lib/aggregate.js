/**
 * Merge repeat sightings of the SAME species that are close together into one map point.
 *
 * Why: people often log the same plant many times along the same path (e.g. 40 mugwort
 * sightings in one stretch of Kissena Park). Drawing 40 identical icons is clutter;
 * one icon with a "×40" badge says the same thing. This cuts ~14,000 points to a few thousand.
 *
 * "Close" means in the same grid cell of about 100 m × 100 m. The merged point sits at
 * the average position of its sightings, and keeps the most recent date.
 */

const CELL_LAT = 0.0009; // ≈ 100 m north–south
const CELL_LNG = 0.0012; // ≈ 100 m east–west at New York's latitude

export function mergeNearbySightings(observations) {
  const cells = new Map();
  for (const obs of observations) {
    const key = `${obs.species_id}|${Math.floor(obs.latitude / CELL_LAT)}|${Math.floor(obs.longitude / CELL_LNG)}`;
    const cell = cells.get(key);
    if (!cell) {
      cells.set(key, { ...obs, count: 1, latSum: obs.latitude, lngSum: obs.longitude });
    } else {
      cell.count += 1;
      cell.latSum += obs.latitude;
      cell.lngSum += obs.longitude;
      if (obs.observed_on > cell.observed_on) cell.observed_on = obs.observed_on; // keep the latest date
    }
  }
  return [...cells.values()].map(({ latSum, lngSum, ...point }) => ({
    ...point,
    latitude: latSum / point.count,
    longitude: lngSum / point.count,
  }));
}
