/**
 * Picks a map icon for a sighting from its iNaturalist "iconic taxon" group.
 * The border color shows the danger level; a dashed border means the location is approximate.
 */

import L from "leaflet";

import { DANGER_COLORS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";

/** A Leaflet icon made of plain HTML, so it can be styled with CSS. */
export function makeMarkerIcon({ iconicTaxon, dangerLevel, obscured }) {
  const { emoji } = taxonIcon(iconicTaxon);
  const color = DANGER_COLORS[dangerLevel ?? null];
  return L.divIcon({
    className: "", // drop Leaflet's default white square
    html: `<div class="species-marker${obscured ? " obscured" : ""}" style="border-color:${color}">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}
