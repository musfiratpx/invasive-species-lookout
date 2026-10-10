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
 * Sightings for the map (~15,000 for Queens: ~4 MB of JSON, ~0.4 MB compressed), loaded once.
 * onProgress(fraction) is called as the download comes in (0 to 1), so the page
 * can show a progress bar. bbox is optional: [minLng, minLat, maxLng, maxLat].
 */
export async function getMapObservations({ bbox, onProgress } = {}) {
  const query = bbox ? `?bbox=${bbox.join(",")}` : "";
  const response = await fetch(`${API_URL}/api/map/observations${query}`);
  if (!response.ok) throw new Error(`API /api/map/observations failed with status ${response.status}`);
  // The server compresses the download, and the browser unpacks it as it arrives, so we
  // count unpacked bytes against X-Total-Bytes (the unpacked size the server sends).
  const total = Number(response.headers.get("X-Total-Bytes")) || Number(response.headers.get("Content-Length")) || 0;
  if (!onProgress || !total || !response.body) return response.json();

  // Read the download in pieces so we can report how far along it is.
  const reader = response.body.getReader();
  const pieces = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pieces.push(value);
    received += value.length;
    onProgress(Math.min(received / total, 1));
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const piece of pieces) { bytes.set(piece, offset); offset += piece.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Every listed species seen in the area, most-sighted first. */
export function getSpeciesList() {
  return getJson("/api/species");
}

/** Everything the sidebar needs for one species. */
export function getSpecies(speciesId) {
  return getJson(`/api/species/${encodeURIComponent(speciesId)}`);
}

/** Every Queens park with at least one sighting, most sightings first. */
export function getParks() {
  return getJson("/api/parks");
}

/** A park's profile: species, danger mix, months, recent sightings and outline. */
export function getPark(parkId) {
  return getJson(`/api/parks/${encodeURIComponent(parkId)}`);
}
