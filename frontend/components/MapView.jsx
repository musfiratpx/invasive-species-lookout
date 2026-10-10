"use client";
/**
 * The Leaflet map with every sighting on it.
 *
 * - Points: repeat sightings of the same species within ~100 m are merged into one
 *   icon with a "×N" badge (see lib/aggregate.js). From zoom 18 ("street level"),
 *   every sighting is shown separately at its own position instead.
 * - Bubbles: nearby points are grouped into numbered bubbles. The grouping distance is
 *   always bigger than the bubbles, so bubbles don't overlap. Hovering a bubble
 *   previews the species inside; from zoom 17 points are shown one by one.
 * - Crowded spots: clicking a bubble zooms in; once you're zoomed in close (16+),
 *   it opens a list of the species there instead.
 * - Extras: zoom down to level 20, a scale bar, an "All of NYC" button, and your location for
 *   "Near you" (asked for by the toolbar's Near me button, see NearMePanel.jsx),
 *   and zooming to a species' sightings when one is picked in search.
 * - Parks: at mid zoom every park is outlined faintly and can be tapped (ParkOutlines.jsx).
 *   When a park is picked, its official boundary is outlined boldly and the map zooms to
 *   it. The "what's here" list links to the profile of the park a crowded spot is in.
 *
 * Markers are plain Leaflet objects, not React components: NYC has ~73,000
 * sightings, and one React component each froze phones for seconds.
 */

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { MapContainer, useMap } from "react-leaflet";

import Basemap from "@/components/Basemap";
import ParkOutlines from "@/components/ParkOutlines";
import ScrollZoomOnClick from "@/components/ScrollZoomOnClick";
import { makeMarkerIcon } from "@/components/SpeciesIcon";
import { cssColor } from "@/lib/cssColor";
import { formatDay } from "@/lib/dates";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { isInNyc } from "@/lib/nearby";

const CENTER = (process.env.NEXT_PUBLIC_MAP_CENTER || "40.7000,-73.9500").split(",").map(Number);
const ZOOM = Number(process.env.NEXT_PUBLIC_MAP_ZOOM || 11);
const MAX_ZOOM = 20; // street level; the background map is drawn as shapes, so it stays sharp
// Keep people near New York City: no zooming out past the whole city, and no panning far away
// (all our sightings are inside these bounds, with some room around the edges).
const MIN_ZOOM = 10;
const NYC_BOUNDS = [[40.35, -74.5], [41.05, -73.45]]; // [south-west], [north-east] corners
const LIST_FROM_ZOOM = 16; // clicking a bubble at this zoom or closer shows a list instead of zooming
const DETAIL_FROM_ZOOM = 18; // from here, show every sighting at its own spot (no ×N merging)

// How far apart (in screen pixels) points can be and still share a bubble.
// Always larger than the biggest bubble (46 px), so bubbles never sit on top of each other.
function clusterRadius(zoom) {
  if (zoom >= 17) return 1;
  if (zoom >= 15) return 60;
  if (zoom >= 13) return 90;
  return 120; // zoomed out: a calm overview with fewer, bigger groups
}

const sightingsIn = (cluster) => cluster.getAllChildMarkers().reduce((sum, m) => sum + m.options.count, 0);

/** Species in a bubble, most sightings first: [{ id, name, level, count }]. */
function speciesIn(cluster) {
  const bySpecies = new Map();
  for (const marker of cluster.getAllChildMarkers()) {
    const o = marker.options;
    const row = bySpecies.get(o.speciesId) || { id: o.speciesId, name: o.name, level: o.dangerLevel, count: 0 };
    row.count += o.count;
    bySpecies.set(o.speciesId, row);
  }
  return [...bySpecies.values()].sort((a, b) => b.count - a.count);
}

// One neutral bubble style, sized gently by how many sightings it holds (26-46 px).
function clusterIcon(cluster) {
  const total = sightingsIn(cluster);
  const size = Math.round(26 + Math.min(20, Math.sqrt(total) * 0.6));
  const text = total >= 1000 ? `${Math.round(total / 100) / 10}k` : String(total);
  return L.divIcon({ html: `<span>${text}</span>`, className: "cluster-bubble", iconSize: [size, size] });
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Short hover preview for a bubble, e.g. "120 sightings · mugwort, garlic mustard and 6 more". */
function previewText(cluster) {
  const rows = speciesIn(cluster);
  const names = rows.slice(0, 3).map((r) => escapeHtml(r.name)).join(", ");
  const more = rows.length > 3 ? ` and ${rows.length - 3} more` : "";
  return `<strong>${sightingsIn(cluster)} sightings</strong><br>${names}${more}`;
}

/** The park most of a bubble's sightings are in (if at least half are), or null. */
function mainParkOf(cluster) {
  const counts = new Map();
  let total = 0;
  for (const m of cluster.getAllChildMarkers()) {
    total += m.options.count;
    if (m.options.parkId) counts.set(m.options.parkId, (counts.get(m.options.parkId) || 0) + m.options.count);
  }
  const [best, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
  return n * 2 >= total ? best : null;
}

/** HTML for the "what's here" popup: one row per species, most sightings first. */
function speciesListHtml(cluster, parkNames, currentFocus) {
  const rows = speciesIn(cluster);
  const shown = rows.slice(0, 12);
  const items = shown
    .map(
      (r) =>
        `<li><button type="button" data-species-id="${escapeHtml(r.id)}">` +
        `<span class="swatch" style="background:${DANGER_COLORS[r.level ?? null]}"></span>` +
        `${escapeHtml(r.name)}<span class="chip-count">×${r.count}</span></button></li>`,
    )
    .join("");
  const more = rows.length > shown.length ? `<p class="muted">…and ${rows.length - shown.length} more species. Zoom in to see them.</p>` : "";
  const parkId = mainParkOf(cluster);
  const parkLink = parkId && parkNames[parkId] && currentFocus !== `park:${parkId}` // no link to the park you're already in
    ? `<button type="button" class="spot-park" data-park-id="${escapeHtml(parkId)}">🌳 ${escapeHtml(parkNames[parkId])} profile →</button>`
    : "";
  return `<div class="spot-list"><strong>${sightingsIn(cluster)} sightings here</strong>${parkLink}<ul>${items}</ul>${more}</div>`;
}

/** Faded icons for other species while one species' panel is open (selectedId), so its own stand out. */
const FADED = 0.3;

function toMarker(p, selectedId) {
  const name = p.common_name || p.scientific_name;
  const count = p.count || 1;
  const isOpen = !selectedId || p.species_id === selectedId;
  return L.marker([p.latitude, p.longitude], {
    opacity: isOpen ? 1 : FADED,
    zIndexOffset: selectedId && isOpen ? 1000 : 0, // the open species' icons sit on top
    icon: makeMarkerIcon({ iconicTaxon: p.iconic_taxon, dangerLevel: p.danger_level, count }),
    keyboard: false, // thousands of tab stops would make keyboard use impossible (use the search box instead)
    riseOnHover: true, // the hovered icon comes to the front (CSS also makes it a bit bigger)
    speciesId: p.species_id,
    parkId: p.park_id,
    name,
    dangerLevel: p.danger_level,
    count,
    observedOn: p.observed_on, // turned into the hover label only when someone hovers (see markerLabel)
    title: name,
  });
}

/** Hover text for one icon, e.g. "Mugwort (High) · 12 sightings here, latest Oct 4, 2026". */
function markerLabel({ name, dangerLevel, count, observedOn }) {
  const title = `${name} (${DANGER_LABELS[dangerLevel ?? null]})`;
  return count > 1 ? `${title} · ${count} sightings here, latest ${formatDay(observedOn)}` : `${title} · ${formatDay(observedOn)}`;
}

/**
 * Add markers to a cluster group a few thousand at a time, letting the browser draw
 * and respond to clicks in between. Returns a function that stops adding.
 *
 * Why not MarkerCluster's own `chunkedLoading`? It can't be stopped: if the filters change
 * while it's still adding, it keeps adding the OLD markers (so hidden sightings reappear),
 * and it crashes ("getMinZoom of null") if the layer is taken off the map meanwhile.
 */
const BATCH_SIZE = 5000;
function addInBatches(group, markers) {
  let next = 0;
  let timer = null;
  function addBatch() {
    group.addLayers(markers.slice(next, next + BATCH_SIZE));
    next += BATCH_SIZE;
    if (next < markers.length) timer = setTimeout(addBatch, 0);
  }
  addBatch();
  return () => clearTimeout(timer);
}

/** True when the person asked their device for less motion (an accessibility setting). */
const prefersLessMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Options for the map's moves: jump straight there instead of sliding, if they asked for less motion.
const motion = () => (prefersLessMotion() ? { animate: false } : {});

/**
 * Padding for zooming to a park or species, leaving room for the side panel that opens with it,
 * so the place isn't hidden behind the panel. Matches .sidebar in globals.css: 400 px wide on
 * the right, or a bottom sheet 65% of the screen tall on phones (640 px wide or less).
 */
function roomForPanel(map) {
  const { x: width, y: height } = map.getSize();
  if (window.innerWidth <= 640) return { paddingTopLeft: [20, 20], paddingBottomRight: [20, height * 0.65 + 20] };
  return { paddingTopLeft: [40, 40], paddingBottomRight: [Math.min(400, width / 2) + 40, 40] };
}

/** Adds the sightings (bubbles/icons, or street-level detail) to the map. */
function SightingsLayer({ points, sightings, focusKey, outline, parkNames, selectedSpeciesId, onSelectSpecies, onSelectPark, location, nearRadius, locateRequest, onLocated }) {
  const map = useMap();
  const merged = useRef(null); // ×N points, used below street level
  const detail = useRef(null); // every sighting separately, used at street level
  const detailFor = useRef(null); // which sightings list the detail layer was built from
  const stopAdding = useRef({ merged: () => {}, detail: () => {} }); // cancels markers still being added
  const latest = useRef({ sightings });
  latest.current = { sightings };
  const onSelect = useRef(onSelectSpecies);
  onSelect.current = onSelectSpecies;
  const onPark = useRef(onSelectPark);
  onPark.current = onSelectPark;
  const names = useRef(parkNames);
  names.current = parkNames;
  const currentFocus = useRef(focusKey);
  currentFocus.current = focusKey;
  const selected = useRef(selectedSpeciesId);
  selected.current = selectedSpeciesId;
  const located = useRef(onLocated);
  located.current = onLocated;

  // Build the detail layer only when someone actually zooms to street level.
  function ensureDetail() {
    if (detailFor.current === latest.current.sightings) return;
    stopAdding.current.detail();
    detail.current.clearLayers();
    stopAdding.current.detail = addInBatches(detail.current, latest.current.sightings.map((p) => toMarker(p, selected.current)));
    detailFor.current = latest.current.sightings;
  }

  // Show exactly one of: merged points, or street-level detail.
  function showRightLayer() {
    if (!merged.current) return;
    const zoom = map.getZoom();
    let wanted = merged.current;
    if (zoom >= DETAIL_FROM_ZOOM) { ensureDetail(); wanted = detail.current; }
    for (const layer of [merged.current, detail.current]) {
      if (layer === wanted && !map.hasLayer(layer)) map.addLayer(layer);
      if (layer !== wanted && map.hasLayer(layer)) map.removeLayer(layer);
    }
  }

  // Create the two bubble/icon layers, the controls and the event handlers once.
  useEffect(() => {
    function makeGroup() {
      const group = L.markerClusterGroup({
        maxClusterRadius: clusterRadius,
        iconCreateFunction: clusterIcon,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false, // we decide below: zoom in, or show a list
        spiderfyOnMaxZoom: false, // the fan-out was hard to read; crowded spots get a list instead
      });
      group.on("click", (event) => {
        const id = event.layer.options.speciesId; // undefined for bubbles (they use "clusterclick")
        if (id) onSelect.current(id);
      });
      group.on("mouseover", (event) => {
        const marker = event.layer;
        if (!marker.getTooltip()) marker.bindTooltip(markerLabel(marker.options)); // made on first hover only
        marker.openTooltip();
      });
      group.on("clustermouseover", (event) => {
        event.layer.bindTooltip(previewText(event.layer), { direction: "top", offset: [0, -14] }).openTooltip();
      });
      group.on("clustermouseout", (event) => event.layer.unbindTooltip());
      // Phones have no hover, so press and hold a bubble to see the same preview (for 3 seconds).
      group.on("clustercontextmenu", (event) => {
        event.originalEvent?.preventDefault(); // no browser menu
        const cluster = event.layer;
        cluster.bindTooltip(previewText(cluster), { direction: "top", offset: [0, -14] }).openTooltip();
        setTimeout(() => cluster.unbindTooltip(), 3000);
      });
      group.on("clusterclick", (event) => {
        const cluster = event.layer;
        cluster.unbindTooltip();
        if (map.getZoom() < LIST_FROM_ZOOM) {
          cluster.zoomToBounds({ padding: [40, 40], ...motion() });
          return;
        }
        const popup = L.popup({ maxWidth: 260, className: "spot-popup" })
          .setLatLng(cluster.getLatLng())
          .setContent(speciesListHtml(cluster, names.current, currentFocus.current))
          .openOn(map);
        popup.getElement().addEventListener("click", (e) => {
          const button = e.target.closest("[data-species-id], [data-park-id]");
          if (!button) return;
          map.closePopup(popup);
          if (button.dataset.parkId) onPark.current(button.dataset.parkId);
          else onSelect.current(button.dataset.speciesId);
        });
      });
      return group;
    }
    merged.current = makeGroup();
    detail.current = makeGroup();

    // Scale bar (feet and meters), bottom right above the map credits.
    const scale = L.control.scale({ position: "bottomright" }).addTo(map);

    // "All of NYC" button under the +/- zoom buttons. (Finding you is the toolbar's "Near me"
    // button; a second 📍 here did exactly the same thing.)
    const Buttons = L.Control.extend({
      onAdd() {
        const box = L.DomUtil.create("div", "leaflet-bar map-buttons");
        box.innerHTML =
          '<button type="button" data-action="home" title="Show all of New York City" aria-label="Show all of New York City">⌂</button>';
        L.DomEvent.disableClickPropagation(box);
        box.addEventListener("click", (e) => {
          const action = e.target.closest("[data-action]")?.dataset.action;
          if (action === "home") map.setView(CENTER, ZOOM, motion());
        });
        return box;
      },
    });
    const buttons = new Buttons({ position: "topleft" }).addTo(map);
    // Found you: tell the page, which opens "Near you" and passes the spot back as `location`.
    const onFound = (e) => located.current({ lat: e.latlng.lat, lng: e.latlng.lng, accuracy: e.accuracy });
    const onLocateError = () => {
      L.popup().setLatLng(map.getCenter()).setContent("Couldn't get your location. Check that location access is allowed.").openOn(map);
    };
    map.on("locationfound", onFound);
    map.on("locationerror", onLocateError);

    map.on("zoomend", showRightLayer);
    showRightLayer();
    return () => {
      map.off("zoomend", showRightLayer);
      map.off("locationfound", onFound);
      map.off("locationerror", onLocateError);
      stopAdding.current.merged();
      stopAdding.current.detail();
      for (const layer of [merged.current, detail.current]) if (layer) map.removeLayer(layer);
      scale.remove();
      buttons.remove();
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // The toolbar's "Near me" button asks the map to find you (each press bumps locateRequest).
  useEffect(() => {
    if (locateRequest) map.locate();
  }, [locateRequest, map]);

  // Your spot: a blue dot, how precise the location is, and a dashed circle showing the
  // "Near you" area (it follows the panel's 500 m / 1 km / 2 km switch). The map zooms to that
  // circle, leaving room for the panel. Outside NYC there's nothing to show, so no zoom.
  useEffect(() => {
    if (!location || !isInNyc(location)) return;
    const center = [location.lat, location.lng];
    const area = L.circle(center, { radius: nearRadius, color: cssColor("--you"), weight: 2, dashArray: "6 6", fill: false, interactive: false });
    const you = L.layerGroup([
      area,
      L.circle(center, { radius: location.accuracy, color: cssColor("--you"), weight: 1, fillOpacity: 0.1, interactive: false }),
      L.circleMarker(center, { radius: 7, color: cssColor("--bg"), weight: 2, fillColor: cssColor("--you"), fillOpacity: 1 }).bindTooltip("You are here"),
    ]).addTo(map);
    map.fitBounds(area.getBounds(), { ...roomForPanel(map), ...motion() });
    return () => map.removeLayer(you);
  }, [location, nearRadius, map]);

  // Rebuild the merged markers whenever the (filtered) points change; refresh detail if it's showing.
  useEffect(() => {
    stopAdding.current.merged(); // stop adding the previous filter's markers, if still going
    merged.current.clearLayers();
    stopAdding.current.merged = addInBatches(merged.current, points.map((p) => toMarker(p, selected.current))); // batches, not one by one
    detailFor.current = null; // detail layer is now out of date; rebuilt when needed
    showRightLayer();
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a species panel opens or closes, update the fading on icons already on the map.
  // (New icons get it in toMarker.)
  useEffect(() => {
    for (const group of [merged.current, detail.current]) {
      for (const marker of group.getLayers()) {
        const isOpen = !selectedSpeciesId || marker.options.speciesId === selectedSpeciesId;
        marker.setOpacity(isOpen ? 1 : FADED);
        marker.setZIndexOffset(selectedSpeciesId && isOpen ? 1000 : 0);
      }
    }
  }, [selectedSpeciesId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw the focused park's official boundary, in dark forest green so it stands out from the light green park fill.
  const outlineLayer = useRef(null);
  useEffect(() => {
    if (outlineLayer.current) map.removeLayer(outlineLayer.current);
    outlineLayer.current = outline
      ? L.geoJSON(outline, { style: { color: cssColor("--forest"), weight: 3, fillColor: cssColor("--forest"), fillOpacity: 0.06, dashArray: "6 4" }, interactive: false }).addTo(map)
      : null;
  }, [outline, map]);

  // When something is focused, zoom to it once: a park to its outline, a species to its
  // sightings. When focus is cleared, go back to all of NYC.
  const lastFocus = useRef(null);
  useEffect(() => {
    if (focusKey && focusKey !== lastFocus.current) {
      const isPark = focusKey.startsWith("park:");
      const bounds = isPark
        ? outline && L.geoJSON(outline).getBounds()
        : points.length && L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
      if (bounds) {
        map.fitBounds(bounds, { ...roomForPanel(map), maxZoom: isPark ? 17 : 16, ...motion() });
        lastFocus.current = focusKey;
      }
    } else if (!focusKey && lastFocus.current) {
      map.setView(CENTER, ZOOM, motion());
      lastFocus.current = null;
    }
  }, [focusKey, points, outline, map]);

  return null;
}

export default function MapView({ points, sightings, focusKey, outline, allOutlines, parkNames, selectedSpeciesId, onSelectSpecies, onSelectPark, location, nearRadius, locateRequest, onLocated }) {
  const animate = !prefersLessMotion(); // also turns off the zoom and fade animations of the map itself
  return (
    <MapContainer center={CENTER} zoom={ZOOM} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM}
      maxBounds={NYC_BOUNDS} maxBoundsViscosity={1.0} /* 1.0 = a firm edge, the map won't drag past it */ className="map" zoomAnimation={animate} fadeAnimation={animate} markerZoomAnimation={animate}
      scrollWheelZoom={false} /* turned on by a click, so the page can scroll past the map (ScrollZoomOnClick) */>
      <Basemap /> {/* simplified green background map (lib/basemapStyle.js) */}
      <ScrollZoomOnClick />
      <ParkOutlines
        outlines={allOutlines}
        focusedParkId={focusKey?.startsWith("park:") ? focusKey.slice(5) : null}
        onSelectPark={onSelectPark}
      />
      <SightingsLayer
        points={points}
        sightings={sightings}
        focusKey={focusKey}
        outline={outline}
        parkNames={parkNames}
        selectedSpeciesId={selectedSpeciesId}
        onSelectSpecies={onSelectSpecies}
        onSelectPark={onSelectPark}
        location={location}
        nearRadius={nearRadius}
        locateRequest={locateRequest}
        onLocated={onLocated}
      />
    </MapContainer>
  );
}
