"use client";
/**
 * Map legend that doubles as a filter: pick a time period, tap a danger level to hide or
 * show it, and pick which kinds to show from the "Plants & animals" dropdown (TypeFilter.jsx).
 * Each option shows how many sightings it covers;
 * options with no sightings (e.g. no "Low" species in NYC) are left out.
 * It can be collapsed behind a "Filter" button to keep the map clear
 * (it starts collapsed on phones, see app/page.js).
 */

import TypeFilter from "@/components/TypeFilter";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { TYPE_FILTERS } from "@/lib/taxa";

const LEVELS = [4, 3, 2, 1, null];

export default function Legend({ open, onToggleOpen, focusName, period, onChangePeriod, hiddenLevels, onToggleLevel, selectedTypes, onChangeTypes, counts, shown, total }) {
  if (!open) {
    return (
      <button className="legend-open-button" onClick={onToggleOpen} aria-expanded="false">
        Filter · {shown.toLocaleString()} sightings
      </button>
    );
  }

  return (
    <aside className="legend" aria-label="Map legend and filters">
      <div className="legend-header">
        <p className="muted legend-count">
          Showing {shown.toLocaleString()} of {total.toLocaleString()}
        </p>
        <button className="legend-close" onClick={onToggleOpen} aria-expanded="true" aria-label="Hide filters">✕</button>
      </div>

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

      <TypeFilter
        types={TYPE_FILTERS.filter((type) => counts.types[type.id])}
        counts={counts.types}
        selected={selectedTypes}
        onChange={onChangeTypes}
        disabled={!!focusName}
      />

      <details className="legend-help">
        <summary>ⓘ How to read the map</summary>
        <ul className="muted">
          <li>Tap a danger level to show or hide it. Pick plants, birds and more from the Plants &amp; animals menu.</li>
          <li>Numbered bubbles group nearby sightings. Tap one to zoom in, or to list what&apos;s there.</li>
          <li>Hover a bubble (or press and hold on a phone) to preview the species inside.</li>
          <li>&quot;×N&quot; on an icon = N sightings of that species within ~100 m.</li>
          <li>Click the map before zooming with the scroll wheel, so the page can scroll past it.</li>
          <li>Sightings with a private or imprecise (over 1 km) location are counted but not drawn.</li>
        </ul>
      </details>
    </aside>
  );
}
