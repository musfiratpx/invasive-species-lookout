"use client";
/**
 * The one page of the app: header, map, legend/filters, species sidebar and footer credits.
 * It loads the sightings once, applies the filters, and remembers which species is selected.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import Legend from "@/components/Legend";
import MusicToggle from "@/components/MusicToggle";
import SpeciesSearch from "@/components/SpeciesSearch";
import SpeciesSidebar from "@/components/SpeciesSidebar";
import { mergeNearbySightings } from "@/lib/aggregate";
import { getMapObservations } from "@/lib/api";
import { typeFilterOf } from "@/lib/taxa";

// Leaflet needs the browser's `window`, so the map must not render on the server.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <p className="muted" style={{ padding: 12 }}>Loading map…</p>,
});

const MAX_ACCURACY_M = 1000;

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
  const [view, setView] = useState("bubbles"); // "bubbles" or "heat"
  const [focusSpeciesId, setFocusSpeciesId] = useState(null); // show only this species on the map

  useEffect(() => {
    // Start with the filter panel closed on phones, so the map isn't covered.
    if (window.innerWidth < 640) setLegendOpen(false);
    getMapObservations()
      // Left off the map (but still counted in the sidebar's totals, charts and status):
      //  - privacy-blurred sightings: iNaturalist moves them up to ~20 km, so they'd land in the wrong town;
      //  - very imprecise sightings (over 1 km): e.g. ones only placed at "Queens", which iNaturalist
      //    puts at the borough's center point and which would create a fake hotspot there.
      .then((all) => setObservations(all.filter((obs) => !obs.obscured && !(obs.accuracy_m > MAX_ACCURACY_M)).map((obs) => ({ ...obs, type: typeFilterOf(obs.iconic_taxon) }))))
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
    () =>
      focusSpeciesId
        ? observations.filter((obs) => obs.species_id === focusSpeciesId) // one species: ignore the other filters
        : observations.filter((obs) => !hiddenLevels.has(obs.danger_level) && !hiddenTypes.has(obs.type)),
    [observations, hiddenLevels, hiddenTypes, focusSpeciesId],
  );
  const focusName = useMemo(() => {
    const first = focusSpeciesId && observations.find((obs) => obs.species_id === focusSpeciesId);
    return first ? first.common_name || first.scientific_name : null;
  }, [focusSpeciesId, observations]);

  // Picking a species in search opens its sidebar and shows only it on the map.
  const pickSpecies = useCallback((id) => {
    setSelectedSpeciesId(id);
    setFocusSpeciesId(id);
  }, []);

  // One map point per species per ~100 m (with a count), instead of one per sighting.
  const points = useMemo(() => mergeNearbySightings(visible), [visible]);

  const closeSidebar = useCallback(() => setSelectedSpeciesId(null), []);

  return (
    <div className="app">
      <header className="header">
        <h1>Kissena Invasive Watch</h1>
        <SpeciesSearch onPick={pickSpecies} />
        <MusicToggle />
      </header>

      <main className="main">
        <MapView points={points} sightings={visible} view={view} focusKey={focusSpeciesId} onSelectSpecies={setSelectedSpeciesId} />
        {focusSpeciesId && (
          <div className="focus-banner" role="status">
            Showing only <strong>{focusName}</strong> ({visible.length.toLocaleString()} sightings)
            <button onClick={() => setFocusSpeciesId(null)}>Show all</button>
          </div>
        )}
        <Legend
          open={legendOpen}
          onToggleOpen={() => setLegendOpen((o) => !o)}
          focusName={focusSpeciesId ? focusName : null}
          view={view}
          onChangeView={setView}
          hiddenLevels={hiddenLevels}
          hiddenTypes={hiddenTypes}
          onToggleLevel={(level) => setHiddenLevels((s) => toggle(s, level))}
          onToggleType={(type) => setHiddenTypes((s) => toggle(s, type))}
          counts={counts}
          shown={visible.length}
          total={observations.length}
        />
        {loadError && <div className="banner" role="alert">{loadError}</div>}
        {selectedSpeciesId && (
          <SpeciesSidebar
            speciesId={selectedSpeciesId}
            onClose={closeSidebar}
            onShowOnMap={() => setFocusSpeciesId(selectedSpeciesId)}
            shownOnMap={focusSpeciesId === selectedSpeciesId}
          />
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
