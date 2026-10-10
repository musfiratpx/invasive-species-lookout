"use client";
/**
 * Map legend: what the icon border colors and the icons mean.
 */

import TypeFilter from "@/components/TypeFilter";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { TAXON_ICONS } from "@/lib/taxa";

const LEVELS = [4, 3, 2, 1, null];
const SHOWN_GROUPS = ["Plantae", "Aves", "Insecta", "Actinopterygii", "Mollusca", "Animalia"];

export default function Legend() {
  return (
    <aside className="legend" aria-label="Map legend and filters">
      <div className="legend-header">
        <p className="muted legend-count">
          Showing {shown.toLocaleString()} of {total.toLocaleString()}
        </p>
        <button className="legend-close" onClick={onToggleOpen} aria-expanded="true" aria-label="Hide filters">✕</button>
      </div>

      <h2>Map style</h2>
      <div className="segmented" role="group" aria-label="Map style">
        <button aria-pressed={view === "bubbles"} onClick={() => onChangeView("bubbles")}>Bubbles</button>
        <button aria-pressed={view === "heat"} onClick={() => onChangeView("heat")}>Heat map</button>
      </div>
      {view === "heat" && <p className="muted legend-note">The glow shows where sightings are dense. Zoom in to see icons.</p>}

      {focusName && (
        <p className="legend-paused">Showing only {focusName}, so these filters are paused. Use “Show all” to go back.</p>
      )}

      <h2>When</h2>
      <div className="segmented" role="group" aria-label="When it was seen">
        <button aria-pressed={period === "all"} onClick={() => onChangePeriod("all")} disabled={!!focusName}>All years</button>
        <button aria-pressed={period === "24"} onClick={() => onChangePeriod("24")} disabled={!!focusName}>Last 2 years</button>
        <button aria-pressed={period === "12"} onClick={() => onChangePeriod("12")} disabled={!!focusName}>Last 12 months</button>
      </div>
      {period !== "all" && <p className="muted legend-note">Older sightings are hidden. A plant seen years ago may be gone now.</p>}

      <h2>Danger level</h2>
      <ul>
        {LEVELS.filter((level) => counts.levels[String(level)]).map((level) => (
          <li key={String(level)}>
            <button className="chip" aria-pressed={!hiddenLevels.has(level)} onClick={() => onToggleLevel(level)} disabled={!!focusName}>
              <span className="swatch" style={{ background: DANGER_COLORS[level] }} aria-hidden="true" />
              {DANGER_LABELS[level]}
              <span className="chip-count">{(counts.levels[String(level)] || 0).toLocaleString()}</span>
            </button>
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
      <p className="muted" style={{ margin: 0 }}>
        Zoom in to see each sighting. Sightings whose exact location is hidden for privacy are counted in each
        species&apos; totals but not shown on the map.
      </p>
    </aside>
  );
}
