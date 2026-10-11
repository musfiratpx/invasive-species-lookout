"use client";
/**
 * Slide-in panel with everything about one species (layout after the SAIL "species story"
 * mockup): a header row (PanelHead), a full-width photo with the name, scientific name, legal
 * status and danger level laid over it, an at-a-glance row (sightings · last seen), "Copy link",
 * a small ▶ "read aloud" button next to each subheading, danger level (with what it means),
 * status in NYC, sound, then fold-out groups:
 * "What to do" (handling + reporting, open by default because it's safety info),
 * "About this species" (summary, history, look-alikes), "Through the year" (sourced seasons text, then
 * the chart of when people report it), "Sources".
 * Once the name scrolls out of view, the header row shows the name instead of its label.
 * Closes with the X button or Escape.
 * (On phones, CSS turns it into a bottom sheet.)
 */

import { useEffect, useRef, useState } from "react";

import CopyLink from "@/components/CopyLink";
import DangerBadge from "@/components/DangerBadge";
import InsightSection from "@/components/InsightSection";
import PanelHead from "@/components/PanelHead";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import ReadAloud from "@/components/ReadAloud";
import ReportDontPull from "@/components/ReportDontPull";
import SeasonChart from "@/components/SeasonChart";
import SoundPlayer from "@/components/SoundPlayer";
import YearChart from "@/components/YearChart";
import { getSpecies } from "@/lib/api";
import { formatDay, formatMonth } from "@/lib/dates";
import { DANGER_COLORS, NY_STATUS_LABELS, STATUS_LABELS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";
import { useReturnFocus } from "@/lib/useReturnFocus";

// iNaturalist groups the park rule's "plants" wording fits (algae and fungi are pulled, not chased).
const NOT_ANIMALS = ["Plantae", "Fungi", "Chromista", "Protozoa"];

export default function SpeciesSidebar({ speciesId, mapCount, onClose, onBack, backLabel, onShowOnMap, shownOnMap }) {
  const [species, setSpecies] = useState(null);
  const [error, setError] = useState(null);
  const [titleHidden, setTitleHidden] = useState(false); // the big name scrolled out of view
  const closeButton = useRef(null);
  useReturnFocus();

  // Load the species whenever a different one is picked.
  useEffect(() => {
    let cancelled = false; // ignore a slow answer if the user already picked another species
    setSpecies(null);
    setError(null);
    setTitleHidden(false);
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
      <PanelHead
        kicker={species ? `Species profile / ${taxonIcon(species.iconic_taxon).label}` : "Species profile"}
        stuckTitle={species && titleHidden ? species.common_name || species.scientific_name : null}
        onClose={onClose} closeRef={closeButton} closeLabel="Close species panel"
        onBack={onBack} backLabel={backLabel}
      />
      {error && <p role="alert">{error}</p>}
      {!species && !error && <Skeleton />}
      {species && (
        <SpeciesDetails species={species} mapCount={mapCount} onShowOnMap={onShowOnMap} shownOnMap={shownOnMap}
                        onTitleHidden={setTitleHidden} />
      )}
    </aside>
  );
}

function SpeciesDetails({ species, mapCount, onShowOnMap, shownOnMap, onTitleHidden }) {
  const { insights, sightings, danger } = species;
  const hidden = mapCount != null ? sightings.total - mapCount : 0;
  const name = species.common_name || species.scientific_name;

  // Tell the header row once the big name has scrolled out of view, so it can show the name.
  const title = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => onTitleHidden(!entry.isIntersecting));
    if (title.current) observer.observe(title.current);
    return () => observer.disconnect();
  }, [onTitleHidden]);
  const legal = NY_STATUS_LABELS[species.ny_status];

  return (
    <>
      <PhotoSlideshow
        photos={species.photos}
        speciesName={name}
        overlay={
          <div className="species-title" ref={title}>
            <h2>{species.common_name}</h2>
            <p className="scientific-name">
              <i>{species.scientific_name}</i>{legal && <span> · {legal}</span>}
            </p>
            <p className="danger-pill">
              <span className="swatch" style={{ background: DANGER_COLORS[danger.level ?? null] }} aria-hidden="true" />
              {danger.level ? `${danger.label} danger` : danger.label}
            </p>
          </div>
        }
      />

      <section>
        <AtAGlance species={species} />
        <div className="panel-actions">
          {onShowOnMap && (
            <button className="show-on-map" onClick={onShowOnMap} disabled={shownOnMap}>
              {shownOnMap ? "Showing only this species on the map" : "Show only this species on the map"}
            </button>
          )}
          <CopyLink speciesId={species.species_id} />
        </div>
      </section>

      <section className="card">
        <h3>Danger level</h3>
        <DangerBadge danger={species.danger} nyStatus={species.ny_status} />
      </section>

      <section>
        <h3>In New York City</h3>
        {species.nyc_status.map((tag) => (
          <span key={tag} className="tag">{STATUS_LABELS[tag]}</span>
        ))}
        {/* These two tags come from counting reports, which can mislead, so say so right here. */}
        {(species.nyc_status.includes("spreading") || species.nyc_status.includes("new_arrival")) && (
          <details className="info">
            <summary>ⓘ What these tags mean</summary>
            <p className="muted">
              These count iNaturalist reports, not a field survey. “Spreading” means more reports so far this year
              than 1.5× the same period last year (and at least 5). “New arrival” means the first report in New York City was
              within the last year. More people posting, or a busy event weekend, can look like spreading.
            </p>
          </details>
        )}
        <p className="muted">First reported in NYC: {formatMonth(sightings.first_seen)}</p>
        <details className="info">
          <summary>ⓘ About these numbers</summary>
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
        <h4>How to handle it <ReadAloud text={insights.handling.text} label="“How to handle it”" /></h4>
        <p className={insights.handling.is_default ? "warning" : undefined}>{insights.handling.text}</p>
      </details>

      <details className="group" open>
        <summary>About this species</summary>
        <InsightSection heading="Summary" text={insights.summary} />
        <InsightSection heading="History" text={insights.history} />
        {/* Word for word from the fact sheet, like "How to handle it": telling two species apart must be exact.
            Only shown when a source names a look-alike: most species have none, and an empty heading on
            every species would just make the panel longer. */}
        {insights.lookalikes && (
          <>
            <InsightSection heading="Don’t confuse it with" text={insights.lookalikes} />
          </>
        )}
      </details>

      {/* The sourced text first: it says what changes through the year. The chart only shows
          when people report it, which also depends on how many people are out posting. */}
      <details className="group">
        <summary>Through the year</summary>
        <InsightSection heading="What changes by season" text={insights.seasons} />
        <h4>When people report it</h4>
        <SeasonChart sightings={sightings} speciesName={name} />
        <h4>Reports per year</h4>
        <YearChart byYear={sightings.by_year} speciesName={name} />
      </details>

      <details className="group">
        <summary>Sources</summary>
        <ul className="link-rows">
          {insights.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer"><span>Read: {source.title}</span></a>
            </li>
          ))}
          {species.danger.source_url && (
            <li>
              <a href={species.danger.source_url} target="_blank" rel="noreferrer"><span>Read: Danger level source</span></a>
            </li>
          )}
          <li>
            <a href="https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf" target="_blank" rel="noreferrer">
              <span>Read: NYS DEC 6 NYCRR Part 575 invasive species list</span>
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

/** One line under the name: sightings · last seen. (Danger is on the photo, legal status after the scientific name.) */
function AtAGlance({ species }) {
  const { sightings } = species;
  return (
    <p className="glance">
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
