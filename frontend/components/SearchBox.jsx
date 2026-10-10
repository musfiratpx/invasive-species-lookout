"use client";
/**
 * The search box in the header. It's the way into Browse: clicking it opens the Browse
 * panel (every species, or every park), and typing filters that list as you go.
 * It opens on click or typing, not on focus: when Browse closes, focus comes back to
 * this box, and opening on focus would pop Browse right back open.
 * Keyboard: Enter opens the top result, Down arrow moves into the list, Escape closes Browse.
 *
 * The text itself lives in the page (it's passed to BrowsePanel as `query`), so this
 * file only handles the box and its keys.
 */

// The first row in the Browse list. Found on the page instead of passed around, because
// Browse decides the order (sort and tab), and this is the only place that needs it.
const firstRow = () => document.querySelector(".sidebar.browse .row-button");

export default function SearchBox({ query, onChangeQuery, onOpen, onClose, speciesCount, parkCount }) {
  function onKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); firstRow()?.click(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); onOpen(); setTimeout(() => firstRow()?.focus()); } // after Browse appears
    else if (e.key === "Escape") { onClose(); }
  }

  return (
    <div className="search">
      <input
        id="search-box"
        type="search"
        placeholder={`Search or browse ${speciesCount || ""} species and ${parkCount || ""} parks…`}
        aria-label="Search species and parks"
        aria-controls="browse-panel"
        value={query}
        onClick={onOpen}
        onChange={(e) => { onChangeQuery(e.target.value); onOpen(); }}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
