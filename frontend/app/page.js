"use client";
/**
 * The one page of the app: header, map, legend/filters, species sidebar and footer credits.
 * It loads the sightings once, applies the filters, and remembers which species is selected.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import Legend from "@/components/Legend";
import MusicToggle from "@/components/MusicToggle";
import SpeciesSidebar from "@/components/SpeciesSidebar";
import { getMapObservations } from "@/lib/api";
import { typeFilterOf } from "@/lib/taxa";

// Leaflet needs the browser's `window`, so the map must not render on the server.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <p className="muted" style={{ padding: 12 }}>Loading map…</p>,
});

/** Add or remove one value from a Set, returning a new Set (React needs a new object to notice). */
function toggle(set, value) {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

export default function Home() {
  const [observations, setObservations] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const [hiddenLevels, setHiddenLevels] = useState(new Set());
  const [hiddenTypes, setHiddenTypes] = useState(new Set());
  const [legendOpen, setLegendOpen] = useState(true);

  useEffect(() => {
    // Start with the filter panel closed on phones, so the map isn't covered.
    if (window.innerWidth < 640) setLegendOpen(false);
    getMapObservations()
      // Sightings with blurred locations are left off the map: iNaturalist moves them
      // up to ~20 km for privacy, so drawing them would put species in the wrong town.
      // They still count in the sidebar's totals, charts and status.
      .then((all) => setObservations(all.filter((obs) => !obs.obscured).map((obs) => ({ ...obs, type: typeFilterOf(obs.iconic_taxon) }))))
      .catch(() => setLoadError("Couldn't load sightings. Is the backend running on port 8000?"));
  }, []);

  // How many sightings each filter button covers (shown on the buttons).
  const counts = useMemo(() => {
    const levels = {}, types = {};
    for (const obs of observations) {
      levels[String(obs.danger_level)] = (levels[String(obs.danger_level)] || 0) + 1;
      types[obs.type] = (types[obs.type] || 0) + 1;
    }
    return { levels, types };
  }, [observations]);

  const visible = useMemo(
    () => observations.filter((obs) => !hiddenLevels.has(obs.danger_level) && !hiddenTypes.has(obs.type)),
    [observations, hiddenLevels, hiddenTypes],
  );

  const closeSidebar = useCallback(() => setSelectedSpeciesId(null), []);

  return (
    <div className="app">
      <header className="header">
        <h1>Kissena Invasive Watch</h1>
        <MusicToggle />
      </header>

      <main className="main">
        <MapView observations={visible} onSelectSpecies={setSelectedSpeciesId} />
        <Legend
          open={legendOpen}
          onToggleOpen={() => setLegendOpen((o) => !o)}
          hiddenLevels={hiddenLevels}
          hiddenTypes={hiddenTypes}
          onToggleLevel={(level) => setHiddenLevels((s) => toggle(s, level))}
          onToggleType={(type) => setHiddenTypes((s) => toggle(s, type))}
          counts={counts}
          shown={visible.length}
          total={observations.length}
        />
        {loadError && <div className="banner" role="alert">{loadError}</div>}
        {selectedSpeciesId && <SpeciesSidebar speciesId={selectedSpeciesId} onClose={closeSidebar} />}
      </main>

      <footer className="footer">
        Sightings, photos and sounds from iNaturalist and its observers · Invasive status: NYS DEC 6 NYCRR Part 575 ·
        Plant ranks: New York Non-Native Plant Invasiveness Ranking · Music generated with ElevenLabs · Map © OpenStreetMap
        contributors
      </footer>
    </div>
  );
}
