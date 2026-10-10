"use client";
/**
 * Slide-in panel with everything about one species: photos, name, report button,
 * danger level (with what it means), status in Queens, sound, then collapsible groups:
 * "What to do" (handling + reporting, open by default because it's safety info),
 * "About this species" (summary, history), "When to see it" (chart, seasons), "Sources".
 * Closes with the X button or Escape.
 * (On phones, CSS turns it into a bottom sheet.)
 */

import { useEffect, useRef, useState } from "react";

import DangerBadge from "@/components/DangerBadge";
import InsightSection from "@/components/InsightSection";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import ReportButton from "@/components/ReportButton";
import SeasonChart from "@/components/SeasonChart";
import SoundPlayer from "@/components/SoundPlayer";
import { getSpecies } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/labels";

export default function SpeciesSidebar({ speciesId, mapCount, onClose, onBack, backLabel, onShowOnMap, shownOnMap }) {
  const [species, setSpecies] = useState(null);
  const [error, setError] = useState(null);
  const closeButton = useRef(null);

  // Load the species whenever a different one is picked.
  useEffect(() => {
    let cancelled = false; // ignore a slow answer if the user already picked another species
    setSpecies(null);
    setError(null);
    getSpecies(speciesId)
      .then((data) => !cancelled && setSpecies(data))
      .catch(() => !cancelled && setError("Couldn't load this species."));
    return () => {
      cancelled = true;
    };
  }, [speciesId]);

  // Escape closes the panel; move keyboard focus into it when it opens.
  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="sidebar" aria-label="Species details">
      <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close species panel">
        ✕
      </button>

      {onBack && (
        <button className="sidebar-back" onClick={onBack}>
          ← {backLabel}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {!species && !error && <Skeleton />}
      {species && <SpeciesDetails species={species} mapCount={mapCount} onShowOnMap={onShowOnMap} shownOnMap={shownOnMap} />}
    </aside>
  );
}

function SpeciesDetails({ species, mapCount, onShowOnMap, shownOnMap }) {
  const { insights, sightings } = species;
  const hidden = mapCount != null ? sightings.total - mapCount : 0;
  return (
    <>
      <PhotoSlideshow photos={species.photos} speciesName={species.common_name || species.scientific_name} />

      <section>
        <h2>{species.common_name}</h2>
        <p className="scientific-name">{species.scientific_name}</p>
        <ReportButton />
        {onShowOnMap && (
          <button className="show-on-map" onClick={onShowOnMap} disabled={shownOnMap}>
            {shownOnMap ? "Showing only this species on the map" : "Show only this species on the map"}
          </button>
        )}
      </section>

      <section>
        <h3>Danger level</h3>
        <DangerBadge danger={species.danger} nyStatus={species.ny_status} />
      </section>

      <section>
        <h3>In Queens</h3>
        {species.kissena_status.map((tag) => (
          <span key={tag} className="tag">{STATUS_LABELS[tag]}</span>
        ))}
        <p className="muted">
          {sightings.total.toLocaleString()} research-grade sighting{sightings.total === 1 ? "" : "s"}, {sightings.first_seen} to{" "}
          {sightings.last_seen}
          {hidden > 0 && ` · ${mapCount.toLocaleString()} shown on the map (the other ${hidden.toLocaleString()} have a private or imprecise location)`}.
        </p>
      </section>

      <SoundPlayer sound={species.sound} />

      {/* Grouped so the panel is shorter. "What to do" is safety information, so it starts open. */}
      <details className="group" open>
        <summary>What to do</summary>
        {insights.handling.touch_safe === false && <p className="warning">Sources say: do not touch.</p>}
        {insights.handling.touch_safe === true && <p className="muted">Sources say it is safe to touch.</p>}
        <h4>How to handle it</h4>
        <p className={insights.handling.is_default ? "warning" : undefined}>{insights.handling.text}</p>
        <h4>How to report it</h4>
        <InsightSection text={insights.report} />
      </details>

      <details className="group" open>
        <summary>About this species</summary>
        <h4>Summary</h4>
        <InsightSection text={insights.summary} />
        <h4>History</h4>
        <InsightSection text={insights.history} />
      </details>

      <details className="group">
        <summary>When to see it</summary>
        <SeasonChart kissena={sightings.by_month_of_year} nyc={sightings.nyc_by_month_of_year} />
        <InsightSection text={insights.seasons} />
      </details>

      <details className="group">
        <summary>Sources</summary>
        <ul>
          {insights.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
            </li>
          ))}
          {species.danger.source_url && (
            <li>
              <a href={species.danger.source_url} target="_blank" rel="noreferrer">Danger level source</a>
            </li>
          )}
          <li>
            <a href="https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf" target="_blank" rel="noreferrer">
              NYS DEC 6 NYCRR Part 575 invasive species list
            </a>
          </li>
        </ul>
        <p className="muted">
          Sightings, photos and sounds: iNaturalist and its observers (research-grade observations only).
        </p>
      </details>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading species">
      <div className="skeleton" style={{ aspectRatio: "4 / 3" }} />
      <div className="skeleton" style={{ height: 24, width: "60%" }} />
      <div className="skeleton" style={{ height: 16, width: "40%" }} />
      <div className="skeleton" style={{ height: 80 }} />
    </div>
  );
}
