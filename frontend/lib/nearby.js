/**
 * Shared numbers and math for "Near you" (NearMePanel.jsx) and its circle on the map (MapView.jsx).
 */

// How far around you to look. 1 km is a short walk; 2 km helps in quieter areas.
export const RADII_M = [500, 1000, 2000];
export const DEFAULT_RADIUS_M = 1000;

// A box around the five boroughs, a little bigger than our furthest sightings. Outside it we
// have no data, so "Near you" says so instead of showing an empty (misleading) list.
const NYC_BOX = { south: 40.39, west: -74.39, north: 41.0, east: -73.59 };

export function isInNyc({ lat, lng }) {
  return lat >= NYC_BOX.south && lat <= NYC_BOX.north && lng >= NYC_BOX.west && lng <= NYC_BOX.east;
}

/** Distance in meters between two points on Earth (the "haversine" formula). */
export function metersBetween(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

/** "300 m" or "1.2 km" */
export const distanceText = (m) => (m < 950 ? `${Math.round(m / 50) * 50 || 50} m` : `${(m / 1000).toFixed(1)} km`);

/** "500 m", "1 km", "2 km" for the radius switch. */
export const radiusText = (m) => (m < 1000 ? `${m} m` : `${m / 1000} km`);
