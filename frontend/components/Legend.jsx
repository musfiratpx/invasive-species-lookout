"use client";
/**
 * Map legend that doubles as a filter: tap a danger level or a type to hide or
 * show it on the map. Each button shows how many sightings it covers;
 * options with no sightings (e.g. no "Low" species in Queens) are left out.
 * It can be collapsed behind a "Filter" button to keep the map clear
 * (it starts collapsed on phones, see app/page.js).
 */

import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { TYPE_FILTERS } from "@/lib/taxa";

const LEVELS = [4, 3, 2, 1, null];

export default function Legend({ open, onToggleOpen, focusName, view, onChangeView, hiddenLevels, hiddenTypes, onToggleLevel, onToggleType, counts, shown, total }) {
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

      <h2>Map style</h2>
      <div className="segmented" role="group" aria-label="Map style">
        <button aria-pressed={view === "bubbles"} onClick={() => onChangeView("bubbles")}>Bubbles</button>
        <button aria-pressed={view === "heat"} onClick={() => onChangeView("heat")}>Heat map</button>
      </div>
      {view === "heat" && <p className="muted legend-note">The glow shows where sightings are dense. Zoom in to see icons.</p>}

      {focusName && (
        <p className="legend-paused">Showing only {focusName}, so these filters are paused. Use “Show all” to go back.</p>
      )}

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
        {TYPE_FILTERS.filter((type) => counts.types[type.id]).map((type) => (
          <li key={type.id}>
            <button className="chip" aria-pressed={!hiddenTypes.has(type.id)} onClick={() => onToggleType(type.id)} disabled={!!focusName}>
              <span aria-hidden="true">{type.emoji}</span> {type.label}
              <span className="chip-count">{(counts.types[type.id] || 0).toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>

      <details className="legend-help">
        <summary>ⓘ How to read the map</summary>
        <ul className="muted">
          <li>Tap a filter to show or hide it.</li>
          <li>Numbered bubbles group nearby sightings. Tap one to zoom in, or to list what&apos;s there.</li>
          <li>Hover a bubble (or press and hold on a phone) to preview the species inside.</li>
          <li>&quot;×N&quot; on an icon = N sightings of that species within ~100 m.</li>
          <li>Sightings with a private or imprecise (over 1 km) location are counted but not drawn.</li>
        </ul>
      </details>
    </aside>
  );
}
