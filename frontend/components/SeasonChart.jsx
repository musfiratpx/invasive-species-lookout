"use client";
/**
 * 12-month bar chart of real sightings, drawn with plain SVG.
 * Switch between our area (Kissena + QC) and all of NYC. Local numbers are
 * often small, and the NYC view shows the seasonal pattern more clearly.
 */

import { useState } from "react";

import { MONTHS } from "@/lib/labels";

const WIDTH = 300;
const HEIGHT = 110;
const BOTTOM = 14; // room for month labels
const BAR_GAP = 4;

export default function SeasonChart({ kissena, nyc }) {
  const [view, setView] = useState("kissena");
  const counts = view === "kissena" ? kissena : nyc;
  const max = Math.max(...counts, 1);
  const barWidth = WIDTH / 12 - BAR_GAP;
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="season-chart">
      <div role="group" aria-label="Which area to show">
        <button onClick={() => setView("kissena")} aria-pressed={view === "kissena"}>Kissena + QC</button>{" "}
        <button onClick={() => setView("nyc")} aria-pressed={view === "nyc"}>All of NYC</button>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img"
           aria-label={`Sightings per month, ${view === "kissena" ? "Kissena and Queens College" : "New York City"}: ` +
             MONTHS.map((m, i) => `${m} ${counts[i]}`).join(", ")}>
        {counts.map((count, i) => {
          const h = ((HEIGHT - BOTTOM) * count) / max;
          const x = i * (barWidth + BAR_GAP) + BAR_GAP / 2;
          return (
            <g key={MONTHS[i]}>
              <rect className="bar" x={x} y={HEIGHT - BOTTOM - h} width={barWidth} height={h}>
                <title>{`${MONTHS[i]}: ${count}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={HEIGHT - 3} textAnchor="middle">{MONTHS[i][0]}</text>
            </g>
          );
        })}
      </svg>
      <p className="muted">
        {total} research-grade iNaturalist sightings by month
        {view === "kissena" ? " near Kissena Park and Queens College" : " across New York City"}.
      </p>
    </div>
  );
}
