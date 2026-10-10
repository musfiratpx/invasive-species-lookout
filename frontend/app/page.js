"use client";
/**
 * The one page of the app: header, map, legend, species sidebar and footer credits.
 * It loads the sightings once and remembers which species and which types are selected.
 */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import Legend from "@/components/Legend";
import MusicToggle from "@/components/MusicToggle";
import SpeciesSidebar from "@/components/SpeciesSidebar";
import { getMapObservations } from "@/lib/api";
import { TAXON_ICONS } from "@/lib/taxa";

// Leaflet needs the browser's `window`, so the map must not render on the server.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <p className="muted" style={{ padding: 12 }}>Loading map…</p>,
});

export default function Home() {
  const [observations, setObservations] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(null); // null = all types

  // The types that actually appear in the sightings, in the same order as lib/taxa.js
  // (so the dropdown never offers a type with nothing on the map, or misses one).
  // Also counts the sightings of each type, shown next to it in the dropdown.
  const [types, typeCounts] = useMemo(() => {
    const counts = {};
    for (const obs of observations) counts[obs.iconic_taxon] = (counts[obs.iconic_taxon] || 0) + 1;
    const order = Object.keys(TAXON_ICONS);
    const rank = (type) => (order.includes(type) ? order.indexOf(type) : order.length);
    return [Object.keys(counts).sort((a, b) => rank(a) - rank(b)), counts];
  }, [observations]);

  const shownObservations = useMemo(
    () => (selectedTypes === null ? observations : observations.filter((obs) => selectedTypes.includes(obs.iconic_taxon))),
    [observations, selectedTypes],
  );

  useEffect(() => {
    getMapObservations()
      // Sightings with blurred locations are left off the map: iNaturalist moves them
      // up to ~20 km for privacy, so drawing them would put species in the wrong town.
      // They still count in the sidebar's totals, charts and status.
      .then((all) => setObservations(all.filter((obs) => !obs.obscured)))
      .catch(() => setLoadError("Couldn't load sightings. Is the backend running on port 8000?"));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Kissena Invasive Watch</h1>
        <MusicToggle />
      </header>

      <main className="main">
        <MapView observations={shownObservations} onSelectSpecies={setSelectedSpeciesId} />
        <Legend types={types} typeCounts={typeCounts} selectedTypes={selectedTypes} onChangeTypes={setSelectedTypes} />
        {loadError && <div className="banner" role="alert">{loadError}</div>}
        {selectedSpeciesId && (
          <SpeciesSidebar speciesId={selectedSpeciesId} onClose={() => setSelectedSpeciesId(null)} />
        )}
      </main>

      <footer className="footer">
        Sightings, photos and sounds from iNaturalist and its observers · Invasive status: NYS DEC 6 NYCRR Part 575 ·
        Plant ranks: New York Non-Native Plant Invasiveness Ranking · Music generated with ElevenLabs · Map © OpenStreetMap
        contributors
      </footer>
    </div>
  );
}
