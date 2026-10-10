"use client";
/**
 * "Plants & animals: [All ›]" dropdown that picks which kinds of species the map shows
 * (plants, birds, insects, ...). In the code these groups are called "types".
 * The menu slides out to the right of the legend (above the button on phones).
 * Selected types get a border.
 *
 * Clicking works like this (so no checkboxes or "only" buttons are needed):
 *   - from "All", clicking a type shows just that type
 *   - clicking another type adds it; clicking a selected type removes it
 *   - removing the last one, or clicking "All", goes back to all types
 * `types` are entries of TYPE_FILTERS (lib/taxa.js); `counts` is keyed by their id.
 * `selected` is null for "all types", otherwise an array of type ids.
 */

import { useEffect, useRef, useState } from "react";

const PHONE_WIDTH = 640; // same breakpoint as globals.css

export default function TypeFilter({ types, counts, selected, onChange, disabled }) {
  const [menuStyle, setMenuStyle] = useState(null); // null = closed
  const wrapper = useRef(null);
  const menu = useRef(null);
  const open = menuStyle !== null;

  // The legend scrolls (overflow: auto), which would cut off a menu that sticks out of it.
  // So the menu is placed with `position: fixed`, measured from the button when it opens.
  function openMenu() {
    const button = wrapper.current.querySelector(".type-filter-button").getBoundingClientRect();
    const legend = wrapper.current.closest(".legend")?.getBoundingClientRect() || button;
    const fromBottom = window.innerHeight - button.bottom;
    setMenuStyle(
      window.innerWidth <= PHONE_WIDTH
        ? { left: button.left, bottom: window.innerHeight - button.top + 8, phone: true }
        : { left: legend.right + 12, bottom: Math.max(8, fromBottom - 10) }
    );
  }

  // Close when clicking outside, pressing Escape, scrolling (the legend or the page) or
  // resizing the window (those would leave the fixed menu in the wrong place).
  useEffect(() => {
    if (!open) return;
    const close = () => setMenuStyle(null);
    const onClick = (event) => {
      if (!wrapper.current?.contains(event.target) && !menu.current?.contains(event.target)) close();
    };
    const onKey = (event) => event.key === "Escape" && close();
    const legend = wrapper.current?.closest(".legend");
    document.addEventListener("pointerdown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close);
    legend?.addEventListener("scroll", close);
    return () => {
      document.removeEventListener("pointerdown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close);
      legend?.removeEventListener("scroll", close);
    };
  }, [open]);

  // While a species or park is focused the filters are paused, so the menu closes.
  useEffect(() => {
    if (disabled) setMenuStyle(null);
  }, [disabled]);

  const pick = (id) => {
    if (selected === null) return onChange([id]);
    const next = selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id];
    // Nothing left, or everything picked, both mean "All" (an empty map is never useful).
    onChange(next.length === 0 || next.length === types.length ? null : next);
  };

  const total = types.reduce((sum, type) => sum + (counts[type.id] || 0), 0);
  const { phone, ...position } = menuStyle || {};

  return (
    <div className="type-filter" ref={wrapper}>
      <span className="type-filter-label" id="type-filter-label">Plants &amp; animals:</span>
      <button
        type="button"
        id="type-filter-button"
        className="type-filter-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-labelledby="type-filter-label type-filter-button"
        disabled={disabled}
        onClick={() => (open ? setMenuStyle(null) : openMenu())}
      >
        <span>{buttonText(selected, types)}</span>
        <span className={`type-filter-caret${open ? " open" : ""}`} aria-hidden="true">›</span>
      </button>

      {open && (
        <div
          ref={menu}
          className={`type-filter-menu${phone ? " phone" : ""}`}
          style={position}
          role="group"
          aria-label="Plants and animals to show"
        >
          <p className="type-filter-heading">Show on map</p>
          <OptionButton emoji="✨" label="All" count={total} pressed={selected === null} onClick={() => onChange(null)} />
          <hr className="type-filter-divider" />
          {types.map((type) => (
            <OptionButton
              key={type.id}
              emoji={type.emoji}
              label={type.label}
              count={counts[type.id] || 0}
              pressed={selected !== null && selected.includes(type.id)}
              onClick={() => pick(type.id)}
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

/** What the closed button says: "All", "Plants, Birds", or "3 groups". */
function buttonText(selected, types) {
  if (selected === null) return "All";
  if (selected.length <= 2) return selected.map((id) => types.find((t) => t.id === id)?.label || id).join(", ");
  return `${selected.length} groups`;
}
