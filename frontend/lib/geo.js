/**
 * Small map math helpers for the "Near me" list.
 */

/** Straight-line distance in meters between two points (haversine formula; fine for a city). */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** "80 m", "1 km", "1.2 km" */
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${Number((meters / 1000).toFixed(1))} km`; // Number() drops a trailing ".0": "1 km", "1.5 km"
}
