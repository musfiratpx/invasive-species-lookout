"use client";
/**
 * The one page of the app: header, map, legend, species sidebar and footer credits.
 * It loads the sightings once and remembers which species is selected.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import Legend from "@/components/Legend";
import MusicToggle from "@/components/MusicToggle";
import SpeciesSidebar from "@/components/SpeciesSidebar";
import { getMapObservations } from "@/lib/api";

// Leaflet needs the browser's `window`, so the map must not render on the server.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <p className="muted" style={{ padding: 12 }}>Loading map…</p>,
});

export default function Home() {
  const [observations, setObservations] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);

  useEffect(() => {
    getMapObservations()
      .then(setObservations)
      .catch(() => setLoadError("Couldn't load sightings. Is the backend running on port 8000?"));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Kissena Invasive Watch</h1>
        <MusicToggle />
      </header>

      <main className="main">
        <MapView observations={observations} onSelectSpecies={setSelectedSpeciesId} />
        <Legend />
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
