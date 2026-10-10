"use client";
/**
 * Species season chart: sightings per month, with a switch between our area
 * (Queens) and all of NYC. Local numbers are often small, and the NYC view
 * shows the seasonal pattern more clearly.
 * (The API calls the local series "by_month_of_year"; it covers all of Queens.)
 */

import { useState } from "react";

import MonthChart from "@/components/MonthChart";

export default function SeasonChart({ kissena, nyc }) {
  const [view, setView] = useState("queens");
  const counts = view === "queens" ? kissena : nyc;
  const total = counts.reduce((a, b) => a + b, 0);
  const area = view === "queens" ? "in Queens" : "across New York City";

  return (
    <div>
      <div role="group" aria-label="Which area to show">
        <button onClick={() => setView("queens")} aria-pressed={view === "queens"}>Queens</button>{" "}
        <button onClick={() => setView("nyc")} aria-pressed={view === "nyc"}>All of NYC</button>
      </div>
      <MonthChart counts={counts} label={`Sightings per month ${area}`} />
      <p className="muted">{total.toLocaleString()} research-grade iNaturalist sightings by month {area}.</p>
    </div>
  );
}
