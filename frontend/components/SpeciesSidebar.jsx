"use client";
/**
 * Slide-in panel with everything about one species: photos, name, an at-a-glance row
 * (danger · legal status · sightings · last seen), danger level (with what it means),
 * status in NYC, sound, then collapsible groups:
 * "What to do" (handling + reporting, open by default because it's safety info),
 * "About this species" (summary, history, look-alikes), "Through the year" (sourced seasons text, then
 * the chart of when people report it), "Sources".
 * Closes with the X button or Escape.
 * (On phones, CSS turns it into a bottom sheet.)
 */

import { useEffect, useRef, useState } from "react";

import DangerBadge from "@/components/DangerBadge";
import InsightSection from "@/components/InsightSection";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import ReportDontPull from "@/components/ReportDontPull";
import SeasonChart from "@/components/SeasonChart";
import SoundPlayer from "@/components/SoundPlayer";
import { getSpecies } from "@/lib/api";
import { formatDay, formatMonth } from "@/lib/dates";
import { DANGER_COLORS, NY_STATUS_LABELS, STATUS_LABELS } from "@/lib/labels";
import { useReturnFocus } from "@/lib/useReturnFocus";

// iNaturalist groups the park rule's "plants" wording fits (algae and fungi are pulled, not chased).
const NOT_ANIMALS = ["Plantae", "Fungi", "Chromista", "Protozoa"];

export default function SpeciesSidebar({ speciesId, mapCount, onClose, onBack, backLabel, onShowOnMap, shownOnMap }) {
  const [species, setSpecies] = useState(null);
  const [error, setError] = useState(null);
  const closeButton = useRef(null);
  useReturnFocus();

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
        <AtAGlance species={species} />
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
        <h3>In New York City</h3>
        {species.kissena_status.map((tag) => (
          <span key={tag} className="tag">{STATUS_LABELS[tag]}</span>
        ))}
        {/* These two tags come from counting reports, which can mislead, so say so right here. */}
        {(species.kissena_status.includes("spreading") || species.kissena_status.includes("new_arrival")) && (
          <details className="info">
            <summary>ⓘ <span className="visually-hidden">What these tags mean</span></summary>
            <p className="muted">
              These count iNaturalist reports, not a field survey. “Spreading” means more reports so far this year
              than 1.5× the same period last year (and at least 5). “New arrival” means the first report in New York City was
              within the last year. More people posting, or a busy event weekend, can look like spreading.
            </p>
          </details>
        )}
        <p className="muted">First reported in NYC: {formatMonth(sightings.first_seen)}</p>
        <details className="info">
          <summary>ⓘ <span className="visually-hidden">About these numbers</span></summary>
          <p className="muted">
            All are research-grade iNaturalist sightings in New York City.
            {hidden > 0 && ` ${mapCount.toLocaleString()} are on the map; the other ${hidden.toLocaleString()} have a private or imprecise location.`}
          </p>
        </details>
      </section>

      <SoundPlayer sound={species.sound} />

      {/* Grouped so the panel is shorter. "What to do" is safety information, so it starts open. */}
      <details className="group" open>
        <summary>What to do</summary>
        {/* First: report it, don't pull it. Reporting and the park rule live only in this box. */}
        <ReportDontPull kind={NOT_ANIMALS.includes(species.iconic_taxon) ? "plant" : "animal"} note={insights.report_note} />
        {insights.handling.touch_safe === false && <p className="warning">Sources say: do not touch.</p>}
        {insights.handling.touch_safe === true && <p className="muted">Sources say it is safe to touch.</p>}
        <h4>How to handle it</h4>
        <p className={insights.handling.is_default ? "warning" : undefined}>{insights.handling.text}</p>
      </details>

      <details className="group" open>
        <summary>About this species</summary>
        <h4>Summary</h4>
        <InsightSection text={insights.summary} />
        <h4>History</h4>
        <InsightSection text={insights.history} />
        {/* Word for word from the fact sheet, like "How to handle it": telling two species apart must be exact.
            Only shown when a source names a look-alike: most species have none, and an empty heading on
            every species would just make the panel longer. */}
        {insights.lookalikes && (
          <>
            <h4>Don&apos;t confuse it with</h4>
            <InsightSection text={insights.lookalikes} />
          </>
        )}
      </details>

      {/* The sourced text first: it says what changes through the year. The chart only shows
          when people report it, which also depends on how many people are out posting. */}
      <details className="group">
        <summary>Through the year</summary>
        <h4>What changes by season</h4>
        <InsightSection text={insights.seasons} />
        <h4>When people report it</h4>
        <SeasonChart sightings={sightings} speciesName={species.common_name || species.scientific_name} />
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

/** One line under the name: danger · legal status · sightings · last seen. Details are further down. */
function AtAGlance({ species }) {
  const { danger, sightings } = species;
  const legal = NY_STATUS_LABELS[species.ny_status];
  return (
    <p className="glance">
      <span>
        <span className="swatch" style={{ background: DANGER_COLORS[danger.level ?? null] }} aria-hidden="true" />
        {danger.level ? `${danger.label} danger` : danger.label}
      </span>
      {legal && <span>{legal}</span>}
      <span>{sightings.total.toLocaleString()} sighting{sightings.total === 1 ? "" : "s"}</span>
      <span>Last seen {formatDay(sightings.last_seen)}</span>
    </p>
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
