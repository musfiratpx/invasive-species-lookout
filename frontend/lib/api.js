/**
 * Every call to the backend lives in this file, and nowhere else.
 * The response shapes are documented in docs/API.md. Keep the two in sync.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getJson(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API ${path} failed with status ${response.status}`);
  }
  return response.json();
}

/** Server status and which data/AI modes are on. */
export function getHealth() {
  return getJson("/api/health");
}

/**
 * Sightings for the map. bbox is optional: [minLng, minLat, maxLng, maxLat].
 * We currently load everything once (under 1,000 points), so no bbox is needed.
 */
export function getMapObservations(bbox) {
  const query = bbox ? `?bbox=${bbox.join(",")}` : "";
  return getJson(`/api/map/observations${query}`);
}

/** Every listed species seen in the area, most-sighted first. */
export function getSpeciesList() {
  return getJson("/api/species");
}

/** Everything the sidebar needs for one species. */
export function getSpecies(speciesId) {
  return getJson(`/api/species/${encodeURIComponent(speciesId)}`);
}
