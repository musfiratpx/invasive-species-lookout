/**
 * Picks a map icon for a sighting from its iNaturalist "iconic taxon" group.
 * The border color shows the danger level.
 *
 * Icons are cached: there are only ~30 (type, danger level) combinations, so all
 * ~15,000 markers share those few icon objects instead of each making its own.
 */

import L from "leaflet";

import { DANGER_COLORS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";

const cache = new Map();

/** A Leaflet icon made of plain HTML, so it can be styled with CSS. */
export function makeMarkerIcon({ iconicTaxon, dangerLevel }) {
  const key = `${iconicTaxon}|${dangerLevel}`;
  if (!cache.has(key)) {
    const { emoji } = taxonIcon(iconicTaxon);
    const color = DANGER_COLORS[dangerLevel ?? null];
    cache.set(
      key,
      L.divIcon({
        className: "", // drop Leaflet's default white square
        html: `<div class="species-marker" style="border-color:${color}">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    );
  }
  return cache.get(key);
}
