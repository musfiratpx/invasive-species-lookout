"use client";
/**
 * Profile of one NYC park: which NY-listed invasive species have been seen there,
 * how dangerous they are, when people see them, and the latest sightings.
 * Uses the same slide-in panel as the species sidebar (a bottom sheet on phones).
 * Tapping a species opens its details; the park stays highlighted on the map.
 */

import { useEffect, useRef } from "react";

import MonthChart from "@/components/MonthChart";
import ReportDontPull from "@/components/ReportDontPull";
import { formatDay, formatMonth } from "@/lib/dates";
import { DANGER_COLORS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";
import { useReturnFocus } from "@/lib/useReturnFocus";

const LEVEL_ORDER = ["Very High", "High", "Moderate", "Low", "Not yet ranked"];
const LEVEL_NUMBER = { "Very High": 4, High: 3, Moderate: 2, Low: 1, "Not yet ranked": null };

export default function ParkProfile({ park, error, onClose, onPickSpecies }) {
  const closeButton = useRef(null);
  useReturnFocus();

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="sidebar" aria-label="Park profile">
      <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close park profile">
        ✕
      </button>
      {error && <p role="alert">{error}</p>}
      {!park && !error && <p className="muted">Loading park…</p>}
      {park && <Details park={park} onPickSpecies={onPickSpecies} />}
    </aside>
  );
}

function Details({ park, onPickSpecies }) {
  const totalSpecies = park.species_count || 1;
  return (
    <>
      <section>
        <p className="muted park-kicker">Park profile · {park.type}</p>
        <h2>{park.name}</h2>
        <p className="muted">
          {park.acres ? `${Math.round(park.acres).toLocaleString()} acres` : ""}
          {park.address ? ` · ${park.address}` : ""}
        </p>
        <p className="guide-link">
          <a href={`/guide/${encodeURIComponent(park.park_id)}`} target="_blank" rel="noreferrer">🖨️ Printable field guide</a>
          <span className="muted"> for a walk with no signal</span>
        </p>
        <ReportDontPull kind="any" />
      </section>

      <section className="stat-row">
        <div className="stat"><strong>{park.sightings.toLocaleString()}</strong><span>sightings</span></div>
        <div className="stat"><strong>{park.species_count}</strong><span>listed invasive species</span></div>
      </section>

      <section>
        <h3>How dangerous are they?</h3>
        <div className="danger-mix" role="img"
             aria-label={LEVEL_ORDER.filter((l) => park.species_by_danger[l]).map((l) => `${park.species_by_danger[l]} ${l}`).join(", ")}>
          {LEVEL_ORDER.filter((l) => park.species_by_danger[l]).map((label) => (
            <span key={label} style={{ flex: park.species_by_danger[label] / totalSpecies, background: DANGER_COLORS[LEVEL_NUMBER[label]] }} />
          ))}
        </div>
        <ul className="danger-mix-legend">
          {LEVEL_ORDER.filter((l) => park.species_by_danger[l]).map((label) => (
            <li key={label}>
              <span className="swatch" style={{ background: DANGER_COLORS[LEVEL_NUMBER[label]] }} aria-hidden="true" />
              {park.species_by_danger[label]} {label}
            </li>
          ))}
        </ul>
        <p className="muted">Number of species at each danger level (see “How we score” on any species).</p>
      </section>

      <section>
        <h3>Species seen here</h3>
        <ul className="park-species">
          {park.species.map((s) => (
            <li key={s.species_id}>
              <button onClick={() => onPickSpecies(s.species_id)}>
                <span className="swatch" style={{ background: DANGER_COLORS[s.danger_level ?? null] }} aria-hidden="true" />
                <span aria-hidden="true">{taxonIcon(s.iconic_taxon).emoji}</span>
                <span className="search-name">{s.common_name}<em>{s.scientific_name}</em></span>
                <span className="chip-count">{s.sightings.toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>When people report them here</h3>
        <MonthChart counts={park.by_month_of_year} label="Sightings per month in this park" height={90} />
        <p className="muted">
          Sightings per month, all years ({formatMonth(park.first_seen)} to {formatMonth(park.last_seen)}). These follow when
          people visit and post as much as when species are around. Events like late April&apos;s City Nature Challenge can
          make one month look much busier.
        </p>
      </section>

      <section>
        <h3>Latest sightings</h3>
        <ul>
          {park.recent.map((r) => (
            <li key={r.url}>
              {formatDay(r.observed_on)}: {r.common_name} ·{" "}
              <a href={r.url} target="_blank" rel="noreferrer">iNaturalist observation</a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Sources</h3>
        <p className="muted">
          Park boundary: <a href={park.source.url} target="_blank" rel="noreferrer">{park.source.title}</a>. Sightings:
          research-grade iNaturalist observations with a precise location inside the park.
        </p>
      </section>
    </>
  );
}
