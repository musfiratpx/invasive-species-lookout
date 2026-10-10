"use client";
/**
 * Species season chart: when people report this species across New York City, month by month.
 * One switch: "Compared with all sightings" (default) or "Raw counts".
 * Raw counts mostly follow how many people are out posting: every late April the City
 * Nature Challenge makes almost every species look like it peaks. The default view divides
 * by everyone's sightings that month (per 10,000 sightings of any species), which removes
 * most of that, so a real peak (like Asian bittersweet's winter berries) stands out.
 * (The API calls the series "by_month_of_year"; it covers our whole map area, all of NYC.
 * The old Queens / All of NYC switch is gone because the map now covers all of NYC.)
 */

import { useState } from "react";

import MonthChart from "@/components/MonthChart";

const per10k = (n) => `${n.toLocaleString()} per 10,000 sightings`;
const WHERE = "across New York City";

export default function SeasonChart({ sightings, speciesName }) {
  // Adjusted values exist once fetch_seasonality.py has saved the monthly totals.
  const canAdjust = Boolean(sightings.by_month_per_10k);
  const [adjusted, setAdjusted] = useState(true);
  const showAdjusted = adjusted && canAdjust;

  const raw = sightings.by_month_of_year;
  const values = showAdjusted ? sightings.by_month_per_10k : raw;
  const total = raw.reduce((a, b) => a + b, 0);

  return (
    <div>
      {canAdjust && (
        <div className="segmented" role="group" aria-label="What to count">
          <button onClick={() => setAdjusted(true)} aria-pressed={showAdjusted}>Compared with all sightings</button>
          <button onClick={() => setAdjusted(false)} aria-pressed={!showAdjusted}>Raw counts</button>
        </div>
      )}
      <MonthChart
        counts={values}
        format={showAdjusted ? per10k : undefined}
        label={showAdjusted ? `Sightings of ${speciesName} per 10,000 sightings of any species, by month, ${WHERE}` : `Sightings per month ${WHERE}`}
      />
      <p className="muted">
        {showAdjusted
          ? `Out of every 10,000 iNaturalist sightings ${WHERE} each month, how many were ${speciesName}. This evens out busy months, like late April's City Nature Challenge, when everyone posts more.`
          : `${total.toLocaleString()} research-grade iNaturalist sightings by month ${WHERE}. Raw counts also rise when more people are out posting, not only when the species is around.`}
      </p>
    </div>
  );
}
