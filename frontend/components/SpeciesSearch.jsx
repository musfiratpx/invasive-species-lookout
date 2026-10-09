"use client";
/**
 * Search box for species and parks. Type part of a species name (common or
 * scientific) or a park name, then pick a result:
 *   - a species opens its sidebar and shows only that species on the map;
 *   - a park opens its profile and shows only that park's sightings, outlined.
 * Works with the keyboard (arrow keys + Enter, Escape to close), which also gives
 * keyboard users a way into the map.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { getSpeciesList } from "@/lib/api";
import { DANGER_COLORS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";

const MAX_SPECIES = 6;
const MAX_PARKS = 4;

export default function SpeciesSearch({ parks, onPickSpecies, onPickPark }) {
  const [species, setSpecies] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef(null);

  useEffect(() => {
    getSpeciesList().then(setSpecies).catch(() => setSpecies([]));
  }, []);

  // Close the list when clicking anywhere else.
  useEffect(() => {
    const onDown = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  // One flat list (so arrow keys work across both groups): species first, then parks.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const speciesHits = species
      .filter((s) => !q || s.common_name.toLowerCase().includes(q) || s.scientific_name.toLowerCase().includes(q))
      .slice(0, q ? MAX_SPECIES : 4)
      .map((s) => ({ kind: "species", id: s.species_id, item: s }));
    const parkHits = parks
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, q ? MAX_PARKS : 3)
      .map((p) => ({ kind: "park", id: p.park_id, item: p }));
    return [...speciesHits, ...parkHits];
  }, [query, species, parks]);

  function pick(result) {
    if (result.kind === "species") onPickSpecies(result.id);
    else onPickPark(result.id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  const optionId = (r) => `search-option-${r.kind}-${r.id}`;

  return (
    <div className="search" ref={box}>
      <input
        type="search"
        placeholder={`Search ${species.length || ""} species or ${parks.length || ""} parks…`}
        aria-label="Search species or parks"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-results"
        aria-activedescendant={open && results[active] ? optionId(results[active]) : undefined}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id="search-results" role="listbox" className="search-results">
          {results.length === 0 && <li className="muted search-empty">No species or parks match “{query}”.</li>}
          {results.map((r, i) => (
            <li
              key={optionId(r)}
              id={optionId(r)}
              role="option"
              aria-selected={i === active}
              className={`${i === active ? "active" : ""}${i > 0 && results[i - 1].kind !== r.kind ? " group-start" : ""}`}
              onMouseEnter={() => setActive(i)}
              onPointerDown={(e) => { e.preventDefault(); pick(r); }}
            >
              {r.kind === "species" ? (
                <>
                  <span className="swatch" style={{ background: DANGER_COLORS[r.item.danger_level ?? null] }} aria-hidden="true" />
                  <span aria-hidden="true">{taxonIcon(r.item.iconic_taxon).emoji}</span>
                  <span className="search-name">{r.item.common_name}<em>{r.item.scientific_name}</em></span>
                  <span className="chip-count">{r.item.sightings.toLocaleString()}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">🌳</span>
                  <span className="search-name">{r.item.name}<em>Park · {r.item.species} species</em></span>
                  <span className="chip-count">{r.item.sightings.toLocaleString()}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
