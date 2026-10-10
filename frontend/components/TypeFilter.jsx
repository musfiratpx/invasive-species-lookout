"use client";
/**
 * "Types: [All ▾]" dropdown that picks which kinds of species the map shows.
 * The menu slides out to the right of the legend. Selected types get a border.
 *
 * Clicking works like this (so no checkboxes or "only" buttons are needed):
 *   - from "All", clicking a type shows just that type
 *   - clicking another type adds it; clicking a selected type removes it
 *   - removing the last one, or clicking "All", goes back to all types
 * `selected` is null for "all types", otherwise an array of iconic taxon names.
 */

import { useEffect, useRef, useState } from "react";

import { taxonIcon } from "@/lib/taxa";

export default function TypeFilter({ types, counts, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);

  // Close when clicking anywhere outside the dropdown, or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (event) => !wrapper.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (type) => {
    if (selected === null) return onChange([type]);
    const next = selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type];
    // Nothing left, or everything picked, both mean "All" (an empty map is never useful).
    onChange(next.length === 0 || next.length === types.length ? null : next);
  };

  const total = types.reduce((sum, type) => sum + (counts[type] || 0), 0);

  return (
    <div className="type-filter" ref={wrapper}>
      <span className="type-filter-label" id="type-filter-label">Types:</span>
      <button
        type="button"
        id="type-filter-button"
        className="type-filter-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-labelledby="type-filter-label type-filter-button"
        onClick={() => setOpen(!open)}
      >
        <span>{buttonText(selected)}</span>
        <span className={`type-filter-caret${open ? " open" : ""}`} aria-hidden="true">›</span>
      </button>

      {open && (
        <div className="type-filter-menu" role="group" aria-label="Species types to show">
          <p className="type-filter-heading">Show on map</p>
          <OptionButton emoji="✨" label="All types" count={total} pressed={selected === null} onClick={() => onChange(null)} />
          <hr className="type-filter-divider" />
          {types.map((type) => (
            <OptionButton
              key={type}
              emoji={taxonIcon(type).emoji}
              label={taxonIcon(type).label}
              count={counts[type] || 0}
              pressed={selected !== null && selected.includes(type)}
              onClick={() => pick(type)}
            />
          ))}
          <p className="type-filter-hint">Click more than one to combine.</p>
        </div>
      )}
    </div>
  );
}

/** One row in the menu. aria-pressed tells screen readers whether it's selected. */
function OptionButton({ emoji, label, count, pressed, onClick }) {
  return (
    <button type="button" className="type-filter-option" aria-pressed={pressed} onClick={onClick}>
      <span className="type-filter-emoji" aria-hidden="true">{emoji}</span>
      <span className="type-filter-name">{label}</span>
      <span className="type-filter-count">{count.toLocaleString()}</span>
    </button>
  );
}

/** What the closed button says: "All", "Bird, Fish", or "3 types". */
function buttonText(selected) {
  if (selected === null) return "All";
  if (selected.length <= 2) return selected.map((type) => taxonIcon(type).label).join(", ");
  return `${selected.length} types`;
}
