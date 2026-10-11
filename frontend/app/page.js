"use client";
/**
 * The one page of the app. From the top: the nav bar and welcome banner (Hero.jsx, from the
 * SAIL mockup); the "Explore" section with the map app in a large frame: a toolbar (search
 * box that opens Browse, music, Quiz + full screen), map, legend/filters, the side panel (species details,
 * park profile or Browse list) and a short footer (data date + Credits dialog).
 *
 * "Focus" narrows the map to one thing at a time:
 *   - { kind: "species", id }  only that species' sightings;
 *   - { kind: "park", id }     only sightings inside that park, with its outline drawn.
 *
 * What's open is kept in the address bar (lib/urlState.js), so the browser's Back button
 * closes panels one step at a time and a link like ?park=Q024 opens the same view.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BrowsePanel from "@/components/BrowsePanel";
import Credits from "@/components/Credits";
import Hero from "@/components/Hero";
import Legend from "@/components/Legend";
import MapStatus from "@/components/MapStatus";
import MusicToggle from "@/components/MusicToggle";
import NearMePanel from "@/components/NearMePanel";
import ParkProfile from "@/components/ParkProfile";
import Quiz from "@/components/Quiz";
import SearchBox from "@/components/SearchBox";
import SpeciesSidebar from "@/components/SpeciesSidebar";
import { mergeNearbySightings } from "@/lib/aggregate";
import { getEarlyWarning, getHealth, getMapObservations, getPark, getParkOutlines, getParks, getSpeciesList } from "@/lib/api";
import { isoDateMonthsAgo } from "@/lib/dates";
import { DEFAULT_RADIUS_M, isInNyc } from "@/lib/nearby";
import { typeFilterOf } from "@/lib/taxa";
import { stateFromUrl, urlFromState } from "@/lib/urlState";

// Leaflet needs the browser's `window`, so the map must not render on the server.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => null, // the loading card (MapStatus) covers this moment
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
  const [parkOutlines, setParkOutlines] = useState(null); // every park's boundary, for faint outlines on the map
  const [speciesList, setSpeciesList] = useState([]); // for the search box and Browse
  const [arrivals, setArrivals] = useState({ items: [] }); // Browse's "New" tab (early-warning list)
  const [listsStatus, setListsStatus] = useState("loading"); // species + park lists: "loading", "error" or "done"
  const [loadStatus, setLoadStatus] = useState("loading"); // "loading", "error" or "done"
  const [loadProgress, setLoadProgress] = useState(0);
  const [expectedCount, setExpectedCount] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null); // when the sightings were last fetched from iNaturalist
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [mapFull, setMapFull] = useState(false); // the map app covers the whole window
  const [quiz, setQuiz] = useState("closed"); // "closed", "open", or "paused" (hidden while you look at a species, progress kept)
  const [browseTab, setBrowseTab] = useState(null); // null = Browse closed, else "species", "parks" or "new"
  const [searchText, setSearchText] = useState(""); // what's typed in the header box; filters Browse
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const [hiddenLevels, setHiddenLevels] = useState(new Set());
  const [selectedTypes, setSelectedTypes] = useState(null); // null = all types, else type ids from the Types dropdown
  const [period, setPeriod] = useState("all"); // "all", "24" or "12": how many months back to show
  const [legendOpen, setLegendOpen] = useState(true);
  const [focus, setFocus] = useState(null); // null, { kind: "species", id } or { kind: "park", id }
  const [park, setPark] = useState(null); // loaded profile of the focused park
  const [parkError, setParkError] = useState(null);
  const [parkPanelOpen, setParkPanelOpen] = useState(false);
  const [urlRead, setUrlRead] = useState(false); // don't write the address bar before reading it
  const [sheetCollapsed, setSheetCollapsed] = useState(false); // phones: panel shrunk to a strip
  // "Near you": where the browser says you are (never sent anywhere or put in the address bar),
  // whether its panel is open, and a counter the toolbar button bumps to ask the map to find you.
  const [location, setLocation] = useState(null);
  const [nearOpen, setNearOpen] = useState(false);
  const [locateRequest, setLocateRequest] = useState(0);
  const [nearRadius, setNearRadius] = useState(DEFAULT_RADIUS_M); // how far "Near you" looks

  // Load the species and park lists (search box and Browse). Called again by Browse's "Try again".
  const loadLists = useCallback(() => {
    setListsStatus("loading");
    // The "New" list is extra: if it fails, Browse still works with that tab empty.
    Promise.all([getSpeciesList(), getParks(), getEarlyWarning().catch(() => ({ items: [] }))])
      .then(([speciesRows, parkRows, arrivalList]) => {
        setSpeciesList(speciesRows);
        setParks(parkRows);
        setArrivals(arrivalList);
        setListsStatus("done");
      })
      .catch(() => setListsStatus("error"));
  }, []);

  // Load the sightings and the lists. Called again by the map's "Try again" button.
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
        //  - very imprecise sightings (over 1 km): e.g. ones only placed at "Queens" or "Brooklyn", which iNaturalist
        //    puts at the borough's center point and which would create a fake hotspot there.
        setObservations(all.filter((obs) => !obs.obscured && !(obs.accuracy_m > MAX_ACCURACY_M)).map((obs) => ({ ...obs, type: typeFilterOf(obs.iconic_taxon) })));
        setLoadStatus("done");
      })
      .catch(() => setLoadStatus("error"));
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    // Start with the filter panel closed on phones, so the map isn't covered.
    if (window.innerWidth < 640) setLegendOpen(false);
    loadData();
  }, [loadData]);

  // The faint park outlines are an extra, so they load after the sightings and a failure is
  // simply ignored: the map works fine without them.
  useEffect(() => {
    if (loadStatus === "done" && !parkOutlines) getParkOutlines().then(setParkOutlines).catch(() => {});
  }, [loadStatus, parkOutlines]);

  // Open whatever the link asks for, and follow the browser's Back/Forward buttons.
  useEffect(() => {
    const apply = () => {
      const state = stateFromUrl();
      setFocus(state.focus);
      setSelectedSpeciesId(state.selectedSpeciesId);
      setParkPanelOpen(state.parkPanelOpen);
      setBrowseTab(state.browseTab);
      // Back/Forward: a paused quiz (hidden while you look at a species) keeps its place.
      setQuiz((current) => (state.quiz === "closed" ? "closed" : current === "paused" && state.selectedSpeciesId ? "paused" : "open"));
    };
    apply();
    setUrlRead(true);
    // A shared link to a species, park, Browse or the quiz should land on the map, not the banner.
    // (Instant, not smooth: a panel moving focus to its close button would stop a smooth scroll halfway.)
    if (window.location.search) document.getElementById("explore")?.scrollIntoView({ behavior: "instant" });
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  // Each time what's open changes, add a step to the browser history. (After Back/Forward,
  // the state already matches the address bar, so nothing is added.)
  const url = urlRead ? urlFromState({ focus, selectedSpeciesId, browseTab, quiz }) : null;
  useEffect(() => {
    if (url && url !== (window.location.search || window.location.pathname)) {
      window.history.pushState(null, "", url);
    }
  }, [url]);

  // A newly opened panel always starts full size on phones.
  const panelKey = selectedSpeciesId || (parkPanelOpen && focus?.id) || browseTab || (nearOpen && "near");
  useEffect(() => setSheetCollapsed(false), [panelKey]);

  // While one species or park is focused, the filters are paused and the banner already says
  // what's shown, so fold the filter panel away. "Show all" brings it back as it was.
  const focusKey = focus ? `${focus.kind}:${focus.id}` : null;
  const legendWasOpen = useRef(null); // null = nothing remembered (not focused)
  useEffect(() => {
    if (focusKey && legendWasOpen.current === null) {
      legendWasOpen.current = legendOpen;
      setLegendOpen(false);
    } else if (!focusKey && legendWasOpen.current !== null) {
      setLegendOpen(legendWasOpen.current);
      legendWasOpen.current = null;
    }
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the focus changes

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

  // The time filter. A 2016 sighting may be long gone, so letting people see only recent ones
  // gives the current picture. Dates are "2026-10-04" strings, so they compare as text.
  const inPeriod = useMemo(() => {
    if (period === "all") return observations;
    const cutoff = isoDateMonthsAgo(Number(period));
    return observations.filter((obs) => obs.observed_on >= cutoff);
  }, [observations, period]);

  // How many sightings each filter button covers within the chosen time period (shown on the buttons).
  const counts = useMemo(() => {
    const levels = {}, types = {};
    for (const obs of inPeriod) {
      levels[String(obs.danger_level)] = (levels[String(obs.danger_level)] || 0) + 1;
      types[obs.type] = (types[obs.type] || 0) + 1;
    }
    return { levels, types };
  }, [inPeriod]);

  const visible = useMemo(() => {
    if (focus?.kind === "species") return observations.filter((obs) => obs.species_id === focus.id);
    if (focus?.kind === "park") return observations.filter((obs) => obs.park_id === focus.id);
    return inPeriod.filter(
      (obs) => !hiddenLevels.has(obs.danger_level) && (selectedTypes === null || selectedTypes.includes(obs.type))
    );
  }, [observations, inPeriod, hiddenLevels, selectedTypes, focus]);

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
    setFocus({ kind: "park", id });
    setParkPanelOpen(true);
    setNearOpen(false); // one side panel at a time
  }, []);
  const clearFocus = useCallback(() => {
    setFocus(null);
    setParkPanelOpen(false);
  }, []);

  // One map point per species per ~100 m (with a count), instead of one per sighting.
  const points = useMemo(() => mergeNearbySightings(visible), [visible]);

  // Browse stays open underneath a species or park you pick from it, so closing that returns to the list.
  const openBrowse = useCallback(() => {
    setSelectedSpeciesId(null);
    setParkPanelOpen(false);
    setNearOpen(false);
    setBrowseTab((tab) => tab || "species");
  }, []);
  // Closing Browse also empties the search box, so the next search starts fresh.
  const closeBrowse = useCallback(() => { setBrowseTab(null); setSearchText(""); }, []);

  const closeSidebar = useCallback(() => setSelectedSpeciesId(null), []);

  // Location found (after "Near me" in the toolbar): show what's been seen nearby.
  const showNearMe = useCallback((spot) => {
    setLocation(spot);
    setSelectedSpeciesId(null);
    setParkPanelOpen(false);
    setBrowseTab(null);
    setNearOpen(true);
  }, []);
  const closeNearMe = useCallback(() => { setNearOpen(false); setLocation(null); }, []);
  const closePark = useCallback(() => setParkPanelOpen(false), []);
  const inPark = focus?.kind === "park";

  // Full-screen map: stop the page behind it from scrolling, and let Esc go back to the page.
  // Esc only does that when nothing else is open, since Esc first closes panels and dialogs.
  const nothingElseOpen = !panelKey && quiz !== "open" && !creditsOpen;
  useEffect(() => {
    if (!mapFull) return;
    document.body.classList.add("map-full");
    const onKey = (e) => { if (e.key === "Escape" && nothingElseOpen) setMapFull(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("map-full"); window.removeEventListener("keydown", onKey); };
  }, [mapFull, nothingElseOpen]);

  return (
    <>
    <Hero species={speciesList} parks={parks} updatedAt={updatedAt} />
    <section className="discovery" id="explore">
    <div className="section-heading">
      <h2>Find invasive species near you.</h2>
      <p>
        Every point is a real sighting of a species on New York&apos;s official invasive list. Tap one to see what it
        is, how risky it is, and what to do about it.
      </p>
    </div>
    <div className={mapFull ? "app full-screen" : "app"}>
      <header className="header">
        <label className="toolbar-label" htmlFor="search-box">Find a species</label>
        <SearchBox
          query={searchText}
          onChangeQuery={setSearchText}
          onOpen={openBrowse}
          onClose={closeBrowse}
          speciesCount={speciesList.length}
          parkCount={parks.length}
        />
        <button className="header-button" onClick={() => setLocateRequest((n) => n + 1)} aria-label="Species seen near me">
          <span className="symbol sym-near" aria-hidden="true">⌖</span><span className="button-label"> Near me</span>
        </button>
        {/* On phones only the icons show (CSS hides .button-label); aria-label keeps the name for screen readers. */}
        <button className="header-button" onClick={() => setQuiz("open")} aria-label={quiz === "paused" ? "Back to the quiz" : "Quiz: spot the species"}>
          <span className="symbol sym-quiz" aria-hidden="true">◎</span><span className="button-label"> Quiz</span>
        </button>
        <MusicToggle />
        <button className="header-button" onClick={() => setMapFull((f) => !f)} aria-pressed={mapFull}
                aria-label={mapFull ? "Exit full screen, back to the page" : "Full screen map"}>
          <span className="symbol sym-full" aria-hidden="true">{mapFull ? "✕" : "⤢"}</span>
          <span className="button-label">{mapFull ? " Exit full screen" : " Full screen"}</span>
        </button>
      </header>

      <main className={["main", panelKey && "panel-open", sheetCollapsed && "sheet-collapsed"].filter(Boolean).join(" ")}>
        <MapView
          points={points}
          sightings={visible}
          focusKey={focusKey}
          // Only the focused park's own outline: while a newly picked park loads, `park` is still the old one.
          outline={inPark && park?.park_id === focus.id ? park.outline : null}
          allOutlines={parkOutlines}
          parkNames={parkNames}
          selectedSpeciesId={selectedSpeciesId}
          onSelectSpecies={setSelectedSpeciesId}
          onSelectPark={pickPark}
          location={location}
          nearRadius={nearRadius}
          locateRequest={locateRequest}
          onLocated={showNearMe}
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
            <button onClick={clearFocus}>Show all</button>
          </div>
        )}
        {loadStatus === "done" && <Legend
          open={legendOpen}
          onToggleOpen={() => setLegendOpen((o) => !o)}
          focusName={focus ? focusName : null}
          period={period}
          onChangePeriod={setPeriod}
          hiddenLevels={hiddenLevels}
          onToggleLevel={(level) => setHiddenLevels((s) => toggle(s, level))}
          selectedTypes={selectedTypes}
          onChangeTypes={setSelectedTypes}
          counts={counts}
          shown={visible.length}
          total={observations.length}
        />}
        <MapStatus
          status={loadStatus !== "done" ? loadStatus : visible.length === 0 && observations.length > 0 ? "empty" : null}
          expected={expectedCount}
          progress={loadProgress}
          onRetry={loadData}
          onResetFilters={() => { setHiddenLevels(new Set()); setSelectedTypes(null); setPeriod("all"); }}
        />
        {browseTab && (
          <BrowsePanel
            tab={browseTab}
            onChangeTab={setBrowseTab}
            query={searchText}
            species={speciesList}
            parks={parks}
            arrivals={arrivals}
            status={listsStatus}
            onRetry={loadLists}
            covered={Boolean(selectedSpeciesId || (inPark && parkPanelOpen))}
            onPickSpecies={pickSpecies}
            onPickPark={pickPark}
            onClose={closeBrowse}
          />
        )}
        {nearOpen && location && (
          <NearMePanel
            location={location}
            outside={!isInNyc(location)}
            radius={nearRadius}
            onChangeRadius={setNearRadius}
            sightings={observations}
            species={speciesList}
            covered={Boolean(selectedSpeciesId)}
            onPickSpecies={setSelectedSpeciesId}
            onClose={closeNearMe}
          />
        )}
        {selectedSpeciesId ? (
          <SpeciesSidebar
            speciesId={selectedSpeciesId}
            mapCount={selectedMapCount}
            onClose={closeSidebar}
            onBack={quiz === "paused" ? () => setQuiz("open") : (inPark && parkPanelOpen) || browseTab || nearOpen ? closeSidebar : null}
            backLabel={quiz === "paused" ? "Back to the quiz" : inPark && parkPanelOpen ? `Back to ${focusName}` : nearOpen ? "Back to near you" : "Back to Browse"}
            onShowOnMap={inPark ? null : () => setFocus({ kind: "species", id: selectedSpeciesId })}
            shownOnMap={focus?.kind === "species" && focus.id === selectedSpeciesId}
          />
        ) : (
          inPark && parkPanelOpen && <ParkProfile park={park} error={parkError} onClose={closePark} onPickSpecies={setSelectedSpeciesId} />
        )}
        {panelKey && (
          // Phones only (hidden by CSS on wider screens): shrink the bottom sheet to see the map.
          <button
            className="sheet-handle"
            onClick={() => setSheetCollapsed((c) => !c)}
            aria-expanded={!sheetCollapsed}
            aria-label={sheetCollapsed ? "Show the panel" : "Shrink the panel to see the map"}
          >
            <span aria-hidden="true">{sheetCollapsed ? "▲" : "▼"}</span>
          </button>
        )}
      </main>

      <footer className="footer">
        <span>
          Sightings from iNaturalist
          {updatedAt && `, updated ${new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          <span className="footer-extra"> · Danger levels from official New York rankings</span>
        </span>
        <button className="link-button" onClick={() => setCreditsOpen(true)}>Credits &amp; sources</button>
      </footer>
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
      {quiz !== "closed" && (
        <Quiz
          hidden={quiz === "paused"}
          onClose={() => setQuiz("closed")}
          // "Learn more": hide the quiz (keeping its question and score) and open that species.
          // The species panel's "Back to the quiz" button, or the header's 🎯 button, brings it back.
          onLearnMore={(id) => { setQuiz("paused"); pickSpecies(id); }}
        />
      )}
    </div>
    </section>
    </>
  );
}
