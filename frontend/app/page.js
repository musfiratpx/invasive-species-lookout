"use client";
/**
 * The one page of the app: header (search + music), map, legend/filters, the side
 * panel (species details or park profile) and a short footer (data date + Credits dialog).
 *
 * "Focus" narrows the map to one thing at a time:
 *   - { kind: "species", id }  only that species' sightings;
 *   - { kind: "park", id }     only sightings inside that park, with its outline drawn.
 *
 * What's open is kept in the address bar, so a link can be shared (or put in a QR code)
 * and the browser's Back button works:
 *   ?park=Q024          Kissena Park's profile
 *   ?only=6921          show only Mute Swan on the map
 *   ?species=6921       open Mute Swan's panel (can be combined with the two above)
 *   ?browse=near        open the Browse panel on a tab ("species", "recent" or "near")
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import BrowsePanel from "@/components/BrowsePanel";
import Credits from "@/components/Credits";
import Legend from "@/components/Legend";
import MapStatus from "@/components/MapStatus";
import MusicToggle from "@/components/MusicToggle";
import ParkProfile from "@/components/ParkProfile";
import SpeciesSearch from "@/components/SpeciesSearch";
import SpeciesSidebar from "@/components/SpeciesSidebar";
import { mergeNearbySightings } from "@/lib/aggregate";
import { getHealth, getMapObservations, getPark, getParks, getSpeciesList } from "@/lib/api";
import { typeFilterOf } from "@/lib/taxa";

// Leaflet needs the browser's `window`, so the map must not render on the server.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => null, // the loading card (MapStatus) covers this moment
});

const MAX_ACCURACY_M = 1000;

/** Read the address bar (see the comment at the top) into the page's state. */
function stateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const park = params.get("park");
  const only = params.get("only");
  const browse = params.get("browse");
  return {
    focus: park ? { kind: "park", id: park } : only ? { kind: "species", id: only } : null,
    selectedSpeciesId: params.get("species"),
    browseTab: ["species", "recent", "near"].includes(browse) ? browse : null,
  };
}

/** The address-bar query string for the current state ("" = nothing open). */
function urlFromState(focus, selectedSpeciesId, browseTab) {
  const params = new URLSearchParams();
  if (focus?.kind === "park") params.set("park", focus.id);
  if (focus?.kind === "species") params.set("only", focus.id);
  if (selectedSpeciesId) params.set("species", selectedSpeciesId);
  if (browseTab) params.set("browse", browseTab);
  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
}

/** Add or remove one value from a Set, returning a new Set (React needs a new object to notice). */
function toggle(set, value) {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

export default function Home() {
  const [observations, setObservations] = useState([]);
  const [parks, setParks] = useState([]);
  const [speciesList, setSpeciesList] = useState([]); // for the search box
  const [loadStatus, setLoadStatus] = useState("loading"); // "loading", "error" or "done"
  const [loadProgress, setLoadProgress] = useState(0);
  const [expectedCount, setExpectedCount] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null); // when the sightings were last fetched from iNaturalist
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [browseTab, setBrowseTab] = useState(null); // null = Browse panel closed
  const [userLocation, setUserLocation] = useState(null); // from "Find me" / "Near me"; stays in the browser
  const [flyTarget, setFlyTarget] = useState(null);
  const [urlReady, setUrlReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const [hiddenLevels, setHiddenLevels] = useState(new Set());
  const [hiddenTypes, setHiddenTypes] = useState(new Set());
  const [legendOpen, setLegendOpen] = useState(true);
  const [view, setView] = useState("bubbles"); // "bubbles" or "heat"
  const [focus, setFocus] = useState(null); // null, { kind: "species", id } or { kind: "park", id }
  const [park, setPark] = useState(null); // loaded profile of the focused park
  const [parkError, setParkError] = useState(null);
  const [parkPanelOpen, setParkPanelOpen] = useState(false);

  // Load the sightings (and park list). Called again by the "Try again" button.
  const loadData = useCallback(() => {
    setLoadStatus("loading");
    setLoadProgress(0);
    getHealth()
      .then((h) => {
        setExpectedCount(h.observations);
        setUpdatedAt(h.cache_updated_at);
      })
      .catch(() => {});
    getMapObservations({ onProgress: setLoadProgress })
      .then((all) => {
        // Left off the map (but still counted in the sidebar's totals, charts and status):
        //  - privacy-blurred sightings: iNaturalist moves them up to ~20 km, so they'd land in the wrong town;
        //  - very imprecise sightings (over 1 km): e.g. ones only placed at "Queens", which iNaturalist
        //    puts at the borough's center point and which would create a fake hotspot there.
        setObservations(all.filter((obs) => !obs.obscured && !(obs.accuracy_m > MAX_ACCURACY_M)).map((obs) => ({ ...obs, type: typeFilterOf(obs.iconic_taxon) })));
        setLoadStatus("done");
      })
      .catch(() => setLoadStatus("error"));
    getParks().then(setParks).catch(() => setParks([]));
    getSpeciesList().then(setSpeciesList).catch(() => setSpeciesList([]));
  }, []);

  useEffect(() => {
    // Start with the filter panel closed on phones, so the map isn't covered.
    if (window.innerWidth < 640) setLegendOpen(false);
    loadData();
  }, [loadData]);

  // Open whatever the link asks for, and follow the Back/Forward buttons.
  useEffect(() => {
    const apply = () => {
      const state = stateFromUrl();
      setFocus(state.focus);
      setParkPanelOpen(state.focus?.kind === "park");
      setSelectedSpeciesId(state.selectedSpeciesId);
      setBrowseTab(state.browseTab);
    };
    apply();
    setUrlReady(true);
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  // Each change adds a history entry (so Back undoes it). Skipped until the link has been read.
  useEffect(() => {
    if (!urlReady) return;
    const next = urlFromState(focus, selectedSpeciesId, browseTab);
    const current = window.location.search || window.location.pathname;
    if (next !== current) window.history.pushState(null, "", next);
  }, [urlReady, focus, selectedSpeciesId, browseTab]);

  const copyLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

  // All sightings (including ones not drawn on the map) of the focused species or park, for the banner.
  const focusTotal = useMemo(() => {
    if (focus?.kind === "species") return speciesList.find((s) => s.species_id === focus.id)?.sightings ?? null;
    if (focus?.kind === "park") return parks.find((p) => p.park_id === focus.id)?.sightings ?? null;
    return null;
  }, [focus, speciesList, parks]);

  // How many sightings of the open species are drawn on the map (the sidebar compares it with the total).
  const selectedMapCount = useMemo(
    () => (selectedSpeciesId && loadStatus === "done" ? observations.filter((obs) => obs.species_id === selectedSpeciesId).length : null),
    [selectedSpeciesId, observations, loadStatus]
  );

  const parkNames = useMemo(() => Object.fromEntries(parks.map((p) => [p.park_id, p.name])), [parks]);

  // Search: a species opens its sidebar and shows only it; a park opens its profile and shows only it.
  const pickSpecies = useCallback((id) => {
    setSelectedSpeciesId(id);
    setFocus({ kind: "species", id });
  }, []);
  const pickPark = useCallback((id) => {
    setSelectedSpeciesId(null);
    setBrowseTab(null);
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
  const closeBrowse = useCallback(() => setBrowseTab(null), []);
  // A sighting picked in Browse: fly to it and open its species.
  const pickSighting = useCallback((obs) => {
    setSelectedSpeciesId(obs.species_id);
    setFlyTarget({ lat: obs.latitude, lng: obs.longitude, zoom: 18, key: Date.now() });
  }, []);
  const locate = useCallback((location) => {
    setUserLocation(location);
    setFlyTarget({ lat: location.lat, lng: location.lng, zoom: 16, key: Date.now() });
  }, []);
  const closePark = useCallback(() => setParkPanelOpen(false), []);
  const inPark = focus?.kind === "park";

  return (
    <div className="app">
      <header className="header">
        <div className="title">
          <h1>Kissena Invasive Watch</h1>
          <p className="subtitle">Invasive species across Queens, NYC</p>
        </div>
        <SpeciesSearch species={speciesList} parks={parks} onPickSpecies={pickSpecies} onPickPark={pickPark} />
        <button className="browse-button" onClick={() => { setSelectedSpeciesId(null); setParkPanelOpen(false); setBrowseTab((t) => (t ? null : "species")); }} aria-expanded={!!browseTab}>
          ☰ <span className="browse-label">Browse</span>
        </button>
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
          userLocation={userLocation}
          flyTarget={flyTarget}
          onSelectSpecies={setSelectedSpeciesId}
          onSelectPark={pickPark}
          onLocate={setUserLocation}
        />
        {focus && (
          <div className="focus-banner" role="status">
            <span>
              {inPark ? "🌳 " : "Showing only "}
              <strong>{focusName}</strong>{" "}
              <span className="focus-count">
                {visible.length.toLocaleString()} on the map
                {focusTotal != null && focusTotal !== visible.length && ` · ${focusTotal.toLocaleString()} total`}
              </span>
            </span>
            {inPark && !parkPanelOpen && <button onClick={() => { setSelectedSpeciesId(null); setParkPanelOpen(true); }}>Park profile</button>}
            <button onClick={copyLink} title="Copy a link to this view">{copied ? "Link copied" : "🔗 Copy link"}</button>
            <button onClick={clearFocus}>Show all</button>
          </div>
        )}
        {loadStatus === "done" && <Legend
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
        />}
        <MapStatus
          status={loadStatus !== "done" ? loadStatus : visible.length === 0 && observations.length > 0 ? "empty" : null}
          expected={expectedCount}
          progress={loadProgress}
          onRetry={loadData}
          onResetFilters={() => { setHiddenLevels(new Set()); setHiddenTypes(new Set()); }}
        />
        {selectedSpeciesId ? (
          <SpeciesSidebar
            speciesId={selectedSpeciesId}
            mapCount={selectedMapCount}
            onClose={closeSidebar}
            onBack={(inPark && parkPanelOpen) || browseTab ? closeSidebar : null}
            backLabel={inPark && parkPanelOpen ? `Back to ${focusName}` : "Back to list"}
            onShowOnMap={inPark ? null : () => setFocus({ kind: "species", id: selectedSpeciesId })}
            shownOnMap={focus?.kind === "species" && focus.id === selectedSpeciesId}
          />
        ) : inPark && parkPanelOpen ? (
          <ParkProfile park={park} error={parkError} onClose={closePark} onPickSpecies={setSelectedSpeciesId} />
        ) : (
          browseTab && (
            <BrowsePanel
              tab={browseTab}
              onChangeTab={setBrowseTab}
              onClose={closeBrowse}
              species={speciesList}
              observations={observations}
              parkNames={parkNames}
              userLocation={userLocation}
              onLocate={locate}
              onPickSpecies={setSelectedSpeciesId}
              onPickSighting={pickSighting}
            />
          )
        )}
      </main>

      <footer className="footer">
        <span>
          Sightings from iNaturalist
          {updatedAt && `, updated ${new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          <span className="footer-extra"> · Danger levels from official New York rankings, never AI</span>
        </span>
        <button className="link-button" onClick={() => setCreditsOpen(true)}>Credits &amp; sources</button>
      </footer>
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
    </div>
  );
}
