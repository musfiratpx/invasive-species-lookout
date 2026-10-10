/**
 * Picks a map icon for a sighting from its iNaturalist "iconic taxon" group.
 * The border color shows the danger level. Merged points (several sightings of the
 * same species close together) get a small "×N" badge.
 *
 * Icons are cached: there are only a few hundred (type, danger level, count)
 * combinations, so thousands of markers share those icon objects.
 */

import L from "leaflet";

import { DANGER_COLORS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";

const SIZE = 24;
const cache = new Map();

/** A Leaflet icon made of plain HTML, so it can be styled with CSS. */
export function makeMarkerIcon({ iconicTaxon, dangerLevel, count = 1 }) {
  const key = `${iconicTaxon}|${dangerLevel}|${count}`;
  if (!cache.has(key)) {
    const { emoji } = taxonIcon(iconicTaxon);
    const color = DANGER_COLORS[dangerLevel ?? null];
    const badge = count > 1 ? `<span class="marker-badge">×${count > 99 ? "99+" : count}</span>` : "";
    cache.set(
      key,
      L.divIcon({
        className: "", // drop Leaflet's default white square
        html: `<div class="species-marker" style="border-color:${color}">${emoji}${badge}</div>`,
        iconSize: [SIZE, SIZE],
        iconAnchor: [SIZE / 2, SIZE / 2],
      }),
    );
  }
  return cache.get(key);
}
