/**
 * Map legend: what the icon border colors and the icons mean.
 */

import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { TAXON_ICONS } from "@/lib/taxa";

const LEVELS = [4, 3, 2, 1, null];
const SHOWN_GROUPS = ["Plantae", "Aves", "Insecta", "Actinopterygii", "Mollusca", "Animalia"];

export default function Legend() {
  return (
    <aside className="legend" aria-label="Map legend">
      <h2>Danger level</h2>
      <ul>
        {LEVELS.map((level) => (
          <li key={String(level)}>
            <span className="swatch" style={{ background: DANGER_COLORS[level] }} aria-hidden="true" />
            {DANGER_LABELS[level]}
          </li>
        ))}
      </ul>
      <h2>Type</h2>
      <ul>
        {SHOWN_GROUPS.map((group) => (
          <li key={group}>
            <span aria-hidden="true">{TAXON_ICONS[group].emoji}</span> {TAXON_ICONS[group].label}
          </li>
        ))}
      </ul>
      <p className="muted" style={{ margin: 0 }}>Dashed border = approximate location. Zoom in to see each sighting.</p>
    </aside>
  );
}
