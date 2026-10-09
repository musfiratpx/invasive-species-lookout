"use client";
/**
 * Slide-in panel with everything about one species, in this order:
 * photos, names, danger level, status in Queens, sound, seasons, summary,
 * history, how to handle it, how to report it, sources. Closes with the X button or Escape.
 * (On phones, CSS turns it into a bottom sheet.)
 */

import { useEffect, useRef, useState } from "react";

import DangerBadge from "@/components/DangerBadge";
import InsightSection from "@/components/InsightSection";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import SeasonChart from "@/components/SeasonChart";
import SoundPlayer from "@/components/SoundPlayer";
import { getSpecies } from "@/lib/api";
import { NY_STATUS_LABELS, STATUS_LABELS } from "@/lib/labels";

export default function SpeciesSidebar({ speciesId, onClose }) {
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

      {error && <p role="alert">{error}</p>}
      {!species && !error && <Skeleton />}
      {species && <SpeciesDetails species={species} />}
    </aside>
  );
}

function SpeciesDetails({ species }) {
  const { insights, sightings } = species;
  return (
    <>
      <PhotoSlideshow photos={species.photos} speciesName={species.common_name || species.scientific_name} />

      <section>
        <h2>{species.common_name}</h2>
        <p className="scientific-name">{species.scientific_name}</p>
        <p className="muted">{NY_STATUS_LABELS[species.ny_status]}</p>
      </section>

      <section>
        <h3>Danger level</h3>
        <DangerBadge danger={species.danger} />
      </section>

      <section>
        <h3>In Queens</h3>
        {species.kissena_status.map((tag) => (
          <span key={tag} className="tag">{STATUS_LABELS[tag]}</span>
        ))}
        <p className="muted">
          {sightings.total} research-grade sighting{sightings.total === 1 ? "" : "s"} in Queens, from{" "}
          {sightings.first_seen} to {sightings.last_seen}.
        </p>
      </section>

      <SoundPlayer sound={species.sound} />

      <section>
        <h3>Seasonal differences</h3>
        <SeasonChart kissena={sightings.by_month_of_year} nyc={sightings.nyc_by_month_of_year} />
        <InsightSection text={insights.seasons} />
      </section>

      <InsightSection title="Summary" text={insights.summary} />
      <InsightSection title="History" text={insights.history} />

      <section>
        <h3>How to handle it</h3>
        {insights.handling.touch_safe === false && <p className="warning">Sources say: do not touch.</p>}
        {insights.handling.touch_safe === true && <p className="muted">Sources say it is safe to touch.</p>}
        <p className={insights.handling.is_default ? "warning" : undefined}>{insights.handling.text}</p>
      </section>

      <InsightSection title="How to report it" text={insights.report} />

      <section>
        <h3>Sources</h3>
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
      </section>
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
