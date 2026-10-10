/**
 * Reads a color token from :root in app/globals.css, e.g. cssColor("--forest") -> "#18382f".
 * Map shapes (park outlines, the "you are here" dot) are drawn by Leaflet, which needs real
 * color values instead of var(--...), so this lets them follow the palette in one place.
 * Browser only.
 */

export function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
