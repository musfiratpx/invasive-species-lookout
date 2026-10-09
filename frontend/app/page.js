"use client";
/**
 * The one page of the app: header (search + music), map, legend/filters, the side
 * panel (species details or park profile) and footer credits.
 *
 * "Focus" narrows the map to one thing at a time:
 *   - { kind: "species", id }  only that species' sightings;
 *   - { kind: "park", id }     only sightings inside that park, with its outline drawn.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import Legend from "@/components/Legend";
import MusicToggle from "@/components/MusicToggle";
import ParkProfile from "@/components/ParkProfile";
import SpeciesSearch from "@/components/SpeciesSearch";
import SpeciesSidebar from "@/components/SpeciesSidebar";
import { mergeNearbySightings } from "@/lib/aggregate";
import { getMapObservations, getPark, getParks } from "@/lib/api";
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
  const [parks, setParks] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const [hiddenLevels, setHiddenLevels] = useState(new Set());
  const [hiddenTypes, setHiddenTypes] = useState(new Set());
  const [legendOpen, setLegendOpen] = useState(true);
  const [view, setView] = useState("bubbles"); // "bubbles" or "heat"
  const [focus, setFocus] = useState(null); // null, { kind: "species", id } or { kind: "park", id }
  const [park, setPark] = useState(null); // loaded profile of the focused park
  const [parkError, setParkError] = useState(null);
  const [parkPanelOpen, setParkPanelOpen] = useState(false);

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
    getParks().then(setParks).catch(() => setParks([]));
  }, []);

  // Load the park profile whenever a park is focused.
  const focusedParkId = focus?.kind === "park" ? focus.id : null;
  useEffect(() => {
    setPark(null);
    setParkError(null);
    if (!focusedParkId) return;
    let cancelled = false;
    getPark(focusedParkId)
      .then((p) => !cancelled && setPark(p))
      .catch(() => !cancelled && setParkError("Couldn't load this park."));
    return () => { cancelled = true; };
  }, [focusedParkId]);

  // How many sightings each filter button covers (shown on the buttons).
  const counts = useMemo(() => {
    const levels = {}, types = {};
    for (const obs of observations) {
      levels[String(obs.danger_level)] = (levels[String(obs.danger_level)] || 0) + 1;
      types[obs.type] = (types[obs.type] || 0) + 1;
    }
    return { levels, types };
  }, [observations]);

  const visible = useMemo(() => {
    if (focus?.kind === "species") return observations.filter((obs) => obs.species_id === focus.id);
    if (focus?.kind === "park") return observations.filter((obs) => obs.park_id === focus.id);
    return observations.filter((obs) => !hiddenLevels.has(obs.danger_level) && !hiddenTypes.has(obs.type));
  }, [observations, hiddenLevels, hiddenTypes, focus]);

  const focusName = useMemo(() => {
    if (focus?.kind === "park") return parks.find((p) => p.park_id === focus.id)?.name || "this park";
    if (focus?.kind === "species") {
      const first = observations.find((obs) => obs.species_id === focus.id);
      return first ? first.common_name || first.scientific_name : null;
    }
    return null;
  }, [focus, observations, parks]);

  const parkNames = useMemo(() => Object.fromEntries(parks.map((p) => [p.park_id, p.name])), [parks]);

  // Search: a species opens its sidebar and shows only it; a park opens its profile and shows only it.
  const pickSpecies = useCallback((id) => {
    setSelectedSpeciesId(id);
    setFocus({ kind: "species", id });
  }, []);
  const pickPark = useCallback((id) => {
    setSelectedSpeciesId(null);
    setFocus({ kind: "park", id });
    setParkPanelOpen(true);
  }, []);
  const clearFocus = useCallback(() => {
    setFocus(null);
    setParkPanelOpen(false);
  }, []);

  // One map point per species per ~100 m (with a count), instead of one per sighting.
  const points = useMemo(() => mergeNearbySightings(visible), [visible]);

  const closeSidebar = useCallback(() => setSelectedSpeciesId(null), []);
  const closePark = useCallback(() => setParkPanelOpen(false), []);
  const inPark = focus?.kind === "park";

  return (
    <div className="app">
      <header className="header">
        <h1>Kissena Invasive Watch</h1>
        <SpeciesSearch parks={parks} onPickSpecies={pickSpecies} onPickPark={pickPark} />
        <MusicToggle />
      </header>

      <main className="main">
        <MapView
          points={points}
          sightings={visible}
          view={view}
          focusKey={focus ? `${focus.kind}:${focus.id}` : null}
          outline={inPark ? park?.outline : null}
          parkNames={parkNames}
          onSelectSpecies={setSelectedSpeciesId}
          onSelectPark={pickPark}
        />
        {focus && (
          <div className="focus-banner" role="status">
            <span>
              {inPark ? "🌳 " : "Showing only "}
              <strong>{focusName}</strong> ({visible.length.toLocaleString()} sightings)
            </span>
            {inPark && !parkPanelOpen && <button onClick={() => { setSelectedSpeciesId(null); setParkPanelOpen(true); }}>Park profile</button>}
            <button onClick={clearFocus}>Show all</button>
          </div>
        )}
        <Legend
          open={legendOpen}
          onToggleOpen={() => setLegendOpen((o) => !o)}
          focusName={focus ? focusName : null}
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
        {selectedSpeciesId ? (
          <SpeciesSidebar
            speciesId={selectedSpeciesId}
            onClose={closeSidebar}
            onBack={inPark && parkPanelOpen ? closeSidebar : null}
            backLabel={inPark ? `Back to ${focusName}` : null}
            onShowOnMap={inPark ? null : () => setFocus({ kind: "species", id: selectedSpeciesId })}
            shownOnMap={focus?.kind === "species" && focus.id === selectedSpeciesId}
          />
        ) : (
          inPark && parkPanelOpen && <ParkProfile park={park} error={parkError} onClose={closePark} onPickSpecies={setSelectedSpeciesId} />
        )}
      </main>

      <footer className="footer">
        Sightings, photos and sounds from iNaturalist and its observers · Invasive status: NYS DEC 6 NYCRR Part 575 ·
        Plant ranks: New York Non-Native Plant Invasiveness Ranking · Park boundaries: NYC Parks · Music generated with
        ElevenLabs · Map © OpenStreetMap contributors
      </footer>
    </div>
  );
}
