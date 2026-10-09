"use client";
/**
 * Search box: type part of a common or scientific name, pick a species, and the page
 * opens its sidebar and shows only that species on the map.
 * Works with the keyboard (arrow keys + Enter, Escape to close), which also gives
 * keyboard users a way into the map's species.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { getSpeciesList } from "@/lib/api";
import { DANGER_COLORS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";

const MAX_RESULTS = 8;

export default function SpeciesSearch({ onPick }) {
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return species.slice(0, MAX_RESULTS); // most-sighted first (the API sorts them)
    return species
      .filter((s) => s.common_name.toLowerCase().includes(q) || s.scientific_name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [query, species]);

  function pick(s) {
    onPick(s.species_id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div className="search" ref={box}>
      <input
        type="search"
        placeholder={`Search ${species.length || ""} species…`}
        aria-label="Search species"
        role="combobox"
        aria-expanded={open}
        aria-controls="species-results"
        aria-activedescendant={open && results[active] ? `species-option-${results[active].species_id}` : undefined}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id="species-results" role="listbox" className="search-results">
          {results.length === 0 && <li className="muted search-empty">No listed species match “{query}”.</li>}
          {results.map((s, i) => (
            <li
              key={s.species_id}
              id={`species-option-${s.species_id}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : undefined}
              onMouseEnter={() => setActive(i)}
              onPointerDown={(e) => { e.preventDefault(); pick(s); }}
            >
              <span className="swatch" style={{ background: DANGER_COLORS[s.danger_level ?? null] }} aria-hidden="true" />
              <span aria-hidden="true">{taxonIcon(s.iconic_taxon).emoji}</span>
              <span className="search-name">
                {s.common_name}
                <em>{s.scientific_name}</em>
              </span>
              <span className="chip-count">{s.sightings.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
