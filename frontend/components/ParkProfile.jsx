"use client";
/**
 * Profile of one NYC park: a photo of the park (when Wikimedia Commons has a matching,
 * openly licensed one; see scripts/fetch_park_photos.py), which NY-listed invasive species
 * have been seen there, how dangerous they are, when people see them, and the latest sightings.
 * Uses the same slide-in panel as the species sidebar (a bottom sheet on phones).
 * Tapping a species opens its details; the park stays highlighted on the map.
 */

import { useEffect, useRef } from "react";

import MonthChart from "@/components/MonthChart";
import PanelHead from "@/components/PanelHead";
import PhotoCredit from "@/components/PhotoCredit";
import ReportDontPull from "@/components/ReportDontPull";
import { formatDay, formatMonth } from "@/lib/dates";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
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
      <PanelHead kicker={park ? `Park profile / ${park.type}` : "Park profile"}
                 onClose={onClose} closeRef={closeButton} closeLabel="Close park profile" />
      {error && <p role="alert">{error}</p>}
      {!park && !error && <p className="muted">Loading park…</p>}
      {park && <Details park={park} onPickSpecies={onPickSpecies} />}
    </aside>
  );
}

/**
 * The park's photo, edge to edge, with the name laid over its bottom edge (like the
 * species panel) and its credit under it. It comes from the park's
 * Wikipedia article and is openly licensed, so it's embedded with the photographer,
 * license and a link to its Wikimedia Commons page (CLAUDE.md rule 9).
 */
function ParkPhoto({ photo, name, title }) {
  return (
    <figure className="park-photo">
      <div className="slide-frame">
        <img src={photo.url} alt={`${name}, photo by ${photo.artist}`} loading="lazy" />
        <div className="slide-overlay">{title}</div>
      </div>
      <figcaption className="caption">
        Photo: {photo.artist} ·{" "}
        {photo.license_url ? <a href={photo.license_url} target="_blank" rel="noreferrer">{photo.license}</a> : photo.license} ·{" "}
        <a href={photo.file_page} target="_blank" rel="noreferrer">Wikimedia Commons</a>
      </figcaption>
    </figure>
  );
}

function Details({ park, onPickSpecies }) {
  const totalSpecies = park.species_count || 1;
  const title = (
    <div className="species-title">
      <h2>{park.name}</h2>
      <p className="scientific-name">
        {park.acres ? `${Math.round(park.acres).toLocaleString()} acres` : ""}
        {park.address ? ` · ${park.address}` : ""}
      </p>
    </div>
  );
  return (
    <>
      {/* The name sits on the photo when there is one, otherwise at the top of the panel. */}
      {park.photo && <ParkPhoto photo={park.photo} name={park.name} title={title} />}
      <section className={park.photo ? undefined : "species-title"}>
        {!park.photo && title}
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
        {/* A photo grid: easier to recognize what you saw than a list of names. */}
        <ul className="park-species">
          {park.species.map((s) => (
            <li key={s.species_id}>
              <button onClick={() => onPickSpecies(s.species_id)}>
                {s.thumb
                  ? <img src={s.thumb.url} alt="" loading="lazy" />
                  : <span className="park-species-empty" aria-hidden="true">{taxonIcon(s.iconic_taxon).emoji}</span>}
                <span className="park-species-name">{s.common_name}</span>
                <span className="park-species-detail">
                  <span className="swatch" style={{ background: DANGER_COLORS[s.danger_level ?? null] }} aria-hidden="true" />
                  {DANGER_LABELS[s.danger_level ?? null]} · {s.sightings.toLocaleString()} seen
                </span>
              </button>
              {s.thumb && <PhotoCredit photo={s.thumb} />}
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
