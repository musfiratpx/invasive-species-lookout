/**
 * Helpers for iNaturalist photo credits, used for image descriptions (alt text)
 * that screen readers read out.
 *
 * iNaturalist credits look like "(c) pak2024, some rights reserved (CC BY-NC)" or
 * "(c) Mary Finch, all rights reserved". Public-domain (CC0) photos only say
 * "no rights reserved", with no name, so the photographer can be unknown.
 */

/** The photographer's name from a credit line, or null if the credit doesn't name one. */
export function photographerOf(attribution) {
  const match = /^\(c\)\s*(.+?),\s*(?:some|all|no) rights reserved/i.exec(attribution || "");
  return match ? match[1].trim() : null;
}

/**
 * Alt text for a species photo, e.g. "common mugwort, photographed by pak2024 on iNaturalist".
 * position is optional, e.g. "photo 2 of 8" in the slideshow.
 */
export function photoAlt(speciesName, attribution, position) {
  const name = photographerOf(attribution);
  const by = name ? `photographed by ${name} on iNaturalist` : "iNaturalist photo, photographer not named";
  return [speciesName, by, position].filter(Boolean).join(", ");
}
