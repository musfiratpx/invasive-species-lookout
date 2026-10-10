/**
 * Map legend: what the icon border colors mean, plus the "Types" dropdown
 * that picks which kinds of species the map shows.
 */

import TypeFilter from "@/components/TypeFilter";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";

const LEVELS = [4, 3, 2, 1, null];

export default function Legend({ types, typeCounts, selectedTypes, onChangeTypes }) {
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
      <TypeFilter types={types} counts={typeCounts} selected={selectedTypes} onChange={onChangeTypes} />
      <p className="muted" style={{ margin: 0 }}>
        Zoom in to see each sighting. Sightings whose exact location is hidden for privacy are counted in each
        species&apos; totals but not shown on the map.
      </p>
    </aside>
  );
}
