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

import Highlight from "@/components/Highlight";
import PanelHead from "@/components/PanelHead";
import PhotoCredit from "@/components/PhotoCredit";
import { formatDay, formatMonth } from "@/lib/dates";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { TYPE_FILTERS, matchesGroupWord, taxonIcon, typeFilterOf } from "@/lib/taxa";
import { useReturnFocus } from "@/lib/useReturnFocus";

/** Wikimedia's small (120 px) version of a park photo: list rows don't need the full 1280 px one. */
const smallParkPhoto = (url) => url.replace(/\/\d+px-/, "/120px-");

/** A–Z by the name people see (common name, or scientific name when there is none). */
const byName = (a, b) => a.localeCompare(b, "en", { sensitivity: "base" });
const speciesName = (s) => s.common_name || s.scientific_name;

// Danger chips in the Species tab, most dangerous first. null = "Not yet ranked".
const LEVELS = [4, 3, 2, 1, null];

// Everything that differs between the tabs. Each sort is a label plus a compare
// function; ties fall back to most sightings.
const TABS = {
  species: {
    label: "Species",
    noun: "species",
    idOf: (s) => s.species_id,
    // By name, or by group: "bird" shows every bird, "plants" every plant (lib/taxa.js).
    matches: (s, q) =>
      speciesName(s).toLowerCase().includes(q) || s.scientific_name.toLowerCase().includes(q) || matchesGroupWord(s.iconic_taxon, q),
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
  // Species tab chips: show one danger level and/or one type. undefined = no chip picked (show all).
  const [levelChip, setLevelChip] = useState(undefined);
  const [typeChip, setTypeChip] = useState(undefined);
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
  const chipsOn = tab === "species" && (levelChip !== undefined || typeChip !== undefined);
  const passesChips = (s) =>
    (levelChip === undefined || (s.danger_level ?? null) === levelChip) &&
    (typeChip === undefined || typeFilterOf(s.iconic_taxon) === typeChip);
  const rows = useMemo(
    () => items
      .filter((item) => !query || config.matches(item, query))
      .filter((item) => tab !== "species" || passesChips(item))
      .sort(sort.compare),
    [items, query, config, sort, tab, levelChip, typeChip] // eslint-disable-line react-hooks/exhaustive-deps
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
      {/* The header label is the panel's only title ("Browse" twice in a row read as a mistake).
          The hidden h2 keeps a heading for screen readers. */}
      <PanelHead kicker="Browse species and parks" onClose={onClose} closeRef={closeButton} closeLabel="Close browse panel" />
      <h2 className="visually-hidden">Browse species and parks</h2>
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
          {tab === "species" && (
            <BrowseChips
              species={species}
              levelChip={levelChip}
              typeChip={typeChip}
              onLevel={(level) => setLevelChip(level === levelChip ? undefined : level)}
              onType={(type) => setTypeChip(type === typeChip ? undefined : type)}
            />
          )}
          {tab === "new" && (
            <p className="muted">
              Species first recorded in a borough{arrivals.since && ` since ${formatMonth(arrivals.since)}`}, in research-grade
              iNaturalist sightings. That&apos;s when someone first reported it there, not necessarily when it arrived.
            </p>
          )}
          {/* Screen readers read this out whenever it changes (a new sort, filter or tab). */}
          <p className="muted" role="status">
            {rows.length === items.length
              ? `${items.length} ${config.noun}`
              : `${rows.length} of ${items.length} ${config.noun}${query ? ` match “${typed.trim()}”` : chipsOn ? " match the chips" : ""}`}, sorted by {sort.label}.
          </p>
          {rows.length === 0 ? (
            <p className="muted">
              {tab === "new" && !query
                ? "No species were first recorded in a borough recently."
                : query ? `No ${config.noun} match “${typed.trim()}”` : `No ${config.noun} match`}
              {chipsOn && <> with these chips. <button className="link-button" onClick={() => { setLevelChip(undefined); setTypeChip(undefined); }}>Clear chips</button></>}
            </p>
          ) : (
            <ol className="row-list">
              {rows.map((item) => (
                <li key={config.idOf(item)}>
                  <button className="row-button" data-row-id={config.idOf(item)} onClick={() => pick(item)}>
                    {tab === "species" ? <SpeciesRow s={item} query={query} /> : tab === "parks" ? <ParkRow p={item} query={query} /> : <ArrivalRow a={item} />}
                  </button>
                  {/* Links can't go inside a button, so the photo credit and the first-sighting link sit under it. */}
                  {(tab === "species" || tab === "new") && item.thumb && <PhotoCredit photo={item.thumb} />}
                  {tab === "parks" && item.photo && (
                    <a className="photo-credit" href={item.photo.file_page} target="_blank" rel="noreferrer" title={`${item.photo.artist}, ${item.photo.license}`}>
                      Photo: {item.photo.artist} · {item.photo.license}
                    </a>
                  )}
                  {tab === "new" && (
                    // The evidence: the actual first sighting.
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

/**
 * Chips above the species list: tap one to show only that danger level or type, tap it again
 * to show all. Only levels and types that some species has are shown.
 */
function BrowseChips({ species, levelChip, typeChip, onLevel, onType }) {
  const levels = LEVELS.filter((level) => species.some((s) => (s.danger_level ?? null) === level));
  const types = TYPE_FILTERS.filter((t) => species.some((s) => typeFilterOf(s.iconic_taxon) === t.id));
  return (
    <div className="browse-chips">
      <div role="group" aria-label="Show one danger level">
        {levels.map((level) => (
          <button key={String(level)} className="browse-chip" aria-pressed={levelChip === level} onClick={() => onLevel(level)}>
            <span className="swatch" style={{ background: DANGER_COLORS[level] }} aria-hidden="true" />
            {DANGER_LABELS[level]}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Show one group of plants or animals">
        {types.map((t) => (
          <button key={t.id} className="browse-chip" aria-pressed={typeChip === t.id} onClick={() => onType(t.id)}>
            <span aria-hidden="true">{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpeciesRow({ s, query }) {
  return (
    <>
      {/* A small photo makes the list easier to scan. Only openly licensed photos (see `thumb` in docs/API.md). */}
      {s.thumb
        ? <img className="row-thumb" src={s.thumb.url} alt="" loading="lazy" />
        : <span className="row-thumb row-thumb-empty" aria-hidden="true">{taxonIcon(s.iconic_taxon).emoji}</span>}
      <span className="search-name">
        <Highlight text={speciesName(s)} query={query} />
        <em><Highlight text={s.scientific_name} query={query} /></em>
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

function ParkRow({ p, query }) {
  return (
    <>
      {/* Same size as the species photos, so the two lists line up. Small version of the park's photo. */}
      {p.photo
        ? <img className="row-thumb" src={smallParkPhoto(p.photo.url)} alt="" loading="lazy" />
        : <span className="row-thumb row-thumb-empty" aria-hidden="true">🌳</span>}
      <span className="search-name">
        <Highlight text={p.name} query={query} />
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
      {/* Same small photo as the Species list (an emoji only when there's no openly licensed photo). */}
      {a.thumb
        ? <img className="row-thumb" src={a.thumb.url} alt="" loading="lazy" />
        : <span className="row-thumb row-thumb-empty" aria-hidden="true">{taxonIcon(a.iconic_taxon).emoji}</span>}
      <span className="search-name">
        {speciesName(a)}
        {/* Short lines (the note above the list explains "first recorded"), so rows don't wrap. */}
        <em>New in {a.borough} · {formatDay(a.first_seen)}</em>
      </span>
      <span className="row-detail">
        <span className="danger-cell">
          <span className="swatch" style={{ background: DANGER_COLORS[a.danger_level ?? null] }} aria-hidden="true" />
          {DANGER_LABELS[a.danger_level ?? null]}
        </span>
        <span>{before ? `Also in ${before} borough${before > 1 ? "s" : ""}` : "First in NYC"}</span>
      </span>
    </>
  );
}
