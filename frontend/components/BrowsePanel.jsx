"use client";
/**
 * "Browse" panel: every listed species, every park, or the "New" early-warning list
 * (species first recorded in a borough recently), as a list you can sort.
 * The header search box (SearchBox.jsx) opens it and filters it: `query` is what's typed there.
 * Uses the same slide-in panel as the species sidebar (a bottom sheet on phones).
 * Tapping a row opens that species or park on top of this panel ("covered"). The panel
 * stays on the page underneath, so when you come back your sort, filter, scroll position
 * and keyboard focus are where you left them.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { formatDay, formatMonth } from "@/lib/dates";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";
import { useReturnFocus } from "@/lib/useReturnFocus";

/** A–Z by the name people see (common name, or scientific name when there is none). */
const byName = (a, b) => a.localeCompare(b, "en", { sensitivity: "base" });
const speciesName = (s) => s.common_name || s.scientific_name;

// Everything that differs between the tabs. Each sort is a label plus a compare
// function; ties fall back to most sightings.
const TABS = {
  species: {
    label: "Species",
    noun: "species",
    idOf: (s) => s.species_id,
    matches: (s, q) => speciesName(s).toLowerCase().includes(q) || s.scientific_name.toLowerCase().includes(q),
    sorts: [
      { id: "sightings", label: "Most seen", compare: (a, b) => b.sightings - a.sightings },
      // "Not yet ranked" (null) goes last: it means no official ranking, not "harmless".
      { id: "danger", label: "Most dangerous", compare: (a, b) => (b.danger_level ?? 0) - (a.danger_level ?? 0) || b.sightings - a.sightings },
      { id: "name", label: "A–Z", compare: (a, b) => byName(speciesName(a), speciesName(b)) },
    ],
  },
  parks: {
    label: "Parks",
    noun: "parks",
    idOf: (p) => p.park_id,
    matches: (p, q) => p.name.toLowerCase().includes(q),
    sorts: [
      { id: "sightings", label: "Most seen", compare: (a, b) => b.sightings - a.sightings },
      { id: "species", label: "Most species", compare: (a, b) => b.species - a.species || b.sightings - a.sightings },
      { id: "acres", label: "Biggest", compare: (a, b) => b.acres - a.acres },
      { id: "name", label: "A–Z", compare: (a, b) => byName(a.name, b.name) },
    ],
  },
  // One row per species + borough, built by backend/scripts/build_early_warning.py.
  new: {
    label: "New",
    noun: "new arrivals",
    idOf: (a) => `${a.species_id}-${a.borough}`,
    matches: (a, q) => TABS.species.matches(a, q) || a.borough.toLowerCase().includes(q),
    sorts: [
      { id: "newest", label: "Newest", compare: (a, b) => b.first_seen.localeCompare(a.first_seen) },
      { id: "danger", label: "Most dangerous", compare: (a, b) => (b.danger_level ?? 0) - (a.danger_level ?? 0) || b.first_seen.localeCompare(a.first_seen) },
      { id: "borough", label: "Borough", compare: (a, b) => byName(a.borough, b.borough) || b.first_seen.localeCompare(a.first_seen) },
    ],
  },
};

export default function BrowsePanel({ tab, onChangeTab, query: typed = "", species, parks, arrivals, status, onRetry, covered, onPickSpecies, onPickPark, onClose }) {
  const panel = useRef(null);
  const closeButton = useRef(null);
  const [sortBy, setSortBy] = useState({ species: "sightings", parks: "sightings", new: "newest" });
  const [lastPicked, setLastPicked] = useState(null); // id of the row that was tapped, to return focus to it
  useReturnFocus();

  // Move focus into the panel, unless someone is typing in the search box that opened it.
  useEffect(() => {
    if (document.activeElement?.id !== "search-box") closeButton.current?.focus();
  }, []);

  // When the species or park on top closes, put focus back on the row that opened it.
  useEffect(() => {
    if (covered || !lastPicked) return;
    const row = panel.current?.querySelector(`[data-row-id="${CSS.escape(lastPicked)}"]`);
    (row || closeButton.current)?.focus();
  }, [covered, lastPicked]);

  // Escape closes Browse, but only while it's the panel you can see.
  useEffect(() => {
    if (covered) return;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [covered, onClose]);

  const config = TABS[tab];
  const items = { species, parks, new: arrivals.items }[tab];
  const sort = config.sorts.find((s) => s.id === sortBy[tab]);
  const query = typed.trim().toLowerCase();
  const rows = useMemo(
    () => items.filter((item) => !query || config.matches(item, query)).sort(sort.compare),
    [items, query, config, sort]
  );
  // How many match in each tab, shown on the tab buttons while searching.
  const matchCount = {
    species: species.filter((s) => !query || TABS.species.matches(s, query)).length,
    parks: parks.filter((p) => !query || TABS.parks.matches(p, query)).length,
    new: arrivals.items.filter((a) => !query || TABS.new.matches(a, query)).length,
  };

  // Typing a park name while on Species (or the other way round) switches tabs by itself.
  const otherTab = { species: "parks", parks: "species" }[tab]; // "New" never switches by itself
  useEffect(() => {
    if (otherTab && query && matchCount[tab] === 0 && matchCount[otherTab] > 0) onChangeTab(otherTab);
  }, [query, tab, otherTab, matchCount.species, matchCount.parks, onChangeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(item) {
    const id = config.idOf(item);
    setLastPicked(id);
    if (tab === "parks") onPickPark(id);
    else onPickSpecies(item.species_id);
  }

  return (
    <aside ref={panel} id="browse-panel" className={covered ? "sidebar browse covered" : "sidebar browse"} aria-label="Browse species and parks">
      <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close browse panel">✕</button>
      <h2>Browse</h2>
      <div className="segmented browse-tabs" role="group" aria-label="Browse by">
        {Object.entries(TABS).map(([id, t]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => onChangeTab(id)}>
            {t.label}{query && ` (${matchCount[id]})`}
          </button>
        ))}
      </div>

      {status === "error" ? (
        <div role="alert">
          <p>Couldn't load the list. Is the backend running?</p>
          <button onClick={onRetry}>Try again</button>
        </div>
      ) : status === "loading" ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="segmented" role="group" aria-label="Sort by">
            {config.sorts.map((s) => (
              <button key={s.id} aria-pressed={sort.id === s.id} onClick={() => setSortBy({ ...sortBy, [tab]: s.id })}>{s.label}</button>
            ))}
          </div>
          {tab === "new" && (
            <p className="muted">
              Species first recorded in a borough{arrivals.since && ` since ${formatMonth(arrivals.since)}`}, in research-grade
              iNaturalist sightings. That&apos;s when someone first reported it there, not necessarily when it arrived.
            </p>
          )}
          {/* Screen readers read this out whenever it changes (a new sort, filter or tab). */}
          <p className="muted" role="status">
            {rows.length === items.length ? `${items.length} ${config.noun}` : `${rows.length} of ${items.length} ${config.noun} match “${typed.trim()}”`}, sorted by {sort.label}.
          </p>
          {rows.length === 0 ? (
            <p className="muted">{query ? `Nothing matches “${typed.trim()}”.` : "No species were first recorded in a borough recently."}</p>
          ) : (
            <ol className="row-list">
              {rows.map((item) => (
                <li key={config.idOf(item)}>
                  <button className="row-button" data-row-id={config.idOf(item)} onClick={() => pick(item)}>
                    {tab === "species" ? <SpeciesRow s={item} /> : tab === "parks" ? <ParkRow p={item} /> : <ArrivalRow a={item} />}
                  </button>
                  {tab === "new" && (
                    // The evidence: the actual first sighting (a link can't sit inside the row's button).
                    <a className="row-link" href={item.first_observation_url} target="_blank" rel="noreferrer">
                      View the first sighting on iNaturalist ↗
                    </a>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </aside>
  );
}

function SpeciesRow({ s }) {
  return (
    <>
      <span aria-hidden="true">{taxonIcon(s.iconic_taxon).emoji}</span>
      <span className="search-name">
        {speciesName(s)}
        <em>{s.scientific_name}</em>
      </span>
      <span className="row-detail">
        <span className="danger-cell">
          <span className="swatch" style={{ background: DANGER_COLORS[s.danger_level ?? null] }} aria-hidden="true" />
          {DANGER_LABELS[s.danger_level ?? null]}
        </span>
        <span>{s.sightings.toLocaleString()} seen</span>
      </span>
    </>
  );
}

function ParkRow({ p }) {
  return (
    <>
      <span aria-hidden="true">🌳</span>
      <span className="search-name">
        {p.name}
        <em>{p.type} · {Math.round(p.acres).toLocaleString()} acres</em>
      </span>
      <span className="row-detail">
        <span>{p.species} species</span>
        <span>{p.sightings.toLocaleString()} seen</span>
      </span>
    </>
  );
}

function ArrivalRow({ a }) {
  const before = a.already_in.length;
  return (
    <>
      <span aria-hidden="true">{taxonIcon(a.iconic_taxon).emoji}</span>
      <span className="search-name">
        {speciesName(a)}
        <em>First recorded in {a.borough} · {formatDay(a.first_seen)}</em>
      </span>
      <span className="row-detail">
        <span className="danger-cell">
          <span className="swatch" style={{ background: DANGER_COLORS[a.danger_level ?? null] }} aria-hidden="true" />
          {DANGER_LABELS[a.danger_level ?? null]}
        </span>
        <span>{before ? `Already in ${before} other borough${before > 1 ? "s" : ""}` : "First in NYC"}</span>
      </span>
    </>
  );
}
