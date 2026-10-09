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
 * - Heat map (optional view): a soft glow shows where sightings are dense when zoomed
 *   out; icons take over from zoom 15.
 * - Extras: zoom down to level 20, a scale bar, "Find me" and "All of Queens" buttons,
 *   and zooming to a species' sightings when one is picked in search.
 *
 * Markers are plain Leaflet objects, not React components: Queens has ~15,000
 * sightings, and one React component each froze phones for seconds.
 */

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import { makeMarkerIcon } from "@/components/SpeciesIcon";
import { DANGER_COLORS } from "@/lib/labels";

const CENTER = (process.env.NEXT_PUBLIC_MAP_CENTER || "40.7282,-73.7949").split(",").map(Number);
const ZOOM = Number(process.env.NEXT_PUBLIC_MAP_ZOOM || 12);
const MAX_ZOOM = 20; // OpenStreetMap images stop at 19; level 20 enlarges them (slightly blurry, still useful)
const LIST_FROM_ZOOM = 16; // clicking a bubble at this zoom or closer shows a list instead of zooming
const DETAIL_FROM_ZOOM = 18; // from here, show every sighting at its own spot (no ×N merging)
const HEAT_UNTIL_ZOOM = 15; // in heat-map view, the glow is shown below this zoom, icons from it
const HEAT_INTENSITY = 0.08; // per sighting; low so only truly dense areas turn dark (Queens has ~14,000)

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

/** HTML for the "what's here" popup: one row per species, most sightings first. */
function speciesListHtml(cluster) {
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
  return `<div class="spot-list"><strong>${sightingsIn(cluster)} sightings here</strong><ul>${items}</ul>${more}</div>`;
}

function toMarker(p) {
  const name = p.common_name || p.scientific_name;
  const count = p.count || 1;
  return L.marker([p.latitude, p.longitude], {
    icon: makeMarkerIcon({ iconicTaxon: p.iconic_taxon, dangerLevel: p.danger_level, count }),
    keyboard: false, // thousands of tab stops would make keyboard use impossible (use the search box instead)
    speciesId: p.species_id,
    name,
    dangerLevel: p.danger_level,
    count,
    label: count > 1 ? `${name} · ${count} sightings here, latest ${p.observed_on}` : `${name} · ${p.observed_on}`,
    title: name,
  });
}

/** Adds the sightings (bubbles/icons, street-level detail, and optionally the heat map) to the map. */
function SightingsLayer({ points, sightings, view, focusKey, onSelectSpecies }) {
  const map = useMap();
  const merged = useRef(null); // ×N points, used below street level
  const detail = useRef(null); // every sighting separately, used at street level
  const detailFor = useRef(null); // which sightings list the detail layer was built from
  const heat = useRef(null);
  const latest = useRef({ sightings, view });
  latest.current = { sightings, view };
  const onSelect = useRef(onSelectSpecies);
  onSelect.current = onSelectSpecies;

  // Build the detail layer only when someone actually zooms to street level.
  function ensureDetail() {
    if (detailFor.current === latest.current.sightings) return;
    detail.current.clearLayers();
    detail.current.addLayers(latest.current.sightings.map(toMarker));
    detailFor.current = latest.current.sightings;
  }

  // Show exactly one of: heat map, merged points, or street-level detail.
  function showRightLayer() {
    if (!merged.current) return;
    const zoom = map.getZoom();
    let wanted = merged.current;
    if (latest.current.view === "heat" && heat.current && zoom < HEAT_UNTIL_ZOOM) wanted = heat.current;
    else if (zoom >= DETAIL_FROM_ZOOM) { ensureDetail(); wanted = detail.current; }
    for (const layer of [merged.current, detail.current, heat.current]) {
      if (!layer) continue;
      if (layer === wanted && !map.hasLayer(layer)) map.addLayer(layer);
      if (layer !== wanted && map.hasLayer(layer)) map.removeLayer(layer);
    }
  }

  // Create the two bubble/icon layers, the controls and the event handlers once.
  useEffect(() => {
    function makeGroup() {
      const group = L.markerClusterGroup({
        chunkedLoading: true, // add markers in small batches so the page never freezes for long
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
        if (!marker.getTooltip()) marker.bindTooltip(marker.options.label); // made on first hover only
        marker.openTooltip();
      });
      group.on("clustermouseover", (event) => {
        event.layer.bindTooltip(previewText(event.layer), { direction: "top", offset: [0, -14] }).openTooltip();
      });
      group.on("clustermouseout", (event) => event.layer.unbindTooltip());
      group.on("clusterclick", (event) => {
        const cluster = event.layer;
        cluster.unbindTooltip();
        if (map.getZoom() < LIST_FROM_ZOOM) {
          cluster.zoomToBounds({ padding: [40, 40] });
          return;
        }
        const popup = L.popup({ maxWidth: 260, className: "spot-popup" })
          .setLatLng(cluster.getLatLng())
          .setContent(speciesListHtml(cluster))
          .openOn(map);
        popup.getElement().addEventListener("click", (e) => {
          const button = e.target.closest("[data-species-id]");
          if (button) {
            map.closePopup(popup);
            onSelect.current(button.dataset.speciesId);
          }
        });
      });
      return group;
    }
    merged.current = makeGroup();
    detail.current = makeGroup();

    // Scale bar (feet and meters), bottom right above the map credits.
    const scale = L.control.scale({ position: "bottomright" }).addTo(map);

    // "Find me" and "All of Queens" buttons under the +/- zoom buttons.
    let you = null;
    const Buttons = L.Control.extend({
      onAdd() {
        const box = L.DomUtil.create("div", "leaflet-bar map-buttons");
        box.innerHTML =
          '<button type="button" data-action="locate" title="Show where I am" aria-label="Show where I am">📍</button>' +
          '<button type="button" data-action="home" title="Show all of Queens" aria-label="Show all of Queens">⌂</button>';
        L.DomEvent.disableClickPropagation(box);
        box.addEventListener("click", (e) => {
          const action = e.target.closest("[data-action]")?.dataset.action;
          if (action === "home") map.setView(CENTER, ZOOM);
          if (action === "locate") map.locate({ setView: true, maxZoom: 17 }); // location stays in the browser
        });
        return box;
      },
    });
    const buttons = new Buttons({ position: "topleft" }).addTo(map);
    const onFound = (e) => {
      if (you) map.removeLayer(you);
      you = L.layerGroup([
        L.circle(e.latlng, { radius: e.accuracy, color: "#1a73e8", weight: 1, fillOpacity: 0.1 }),
        L.circleMarker(e.latlng, { radius: 7, color: "#fff", weight: 2, fillColor: "#1a73e8", fillOpacity: 1 }).bindTooltip("You are here"),
      ]).addTo(map);
    };
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
      for (const layer of [merged.current, detail.current, heat.current, you]) if (layer) map.removeLayer(layer);
      scale.remove();
      buttons.remove();
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild the merged markers whenever the (filtered) points change; refresh detail if it's showing.
  useEffect(() => {
    merged.current.clearLayers();
    merged.current.addLayers(points.map(toMarker)); // one batch add is much faster than one by one
    detailFor.current = null; // detail layer is now out of date; rebuilt when needed
    showRightLayer();
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heat-map view: load the plugin when first needed and keep its data current.
  useEffect(() => {
    let cancelled = false;
    async function setUp() {
      if (view === "heat") {
        window.L = L; // the heat plugin expects Leaflet as a global
        await import("leaflet.heat");
        if (cancelled) return;
        const latlngs = sightings.map((s) => [s.latitude, s.longitude, HEAT_INTENSITY]);
        if (heat.current) heat.current.setLatLngs(latlngs);
        else {
          // Blue-purple on purpose: red/orange/yellow are reserved for danger levels.
          heat.current = L.heatLayer(latlngs, {
            radius: 16, blur: 20, maxZoom: 15, max: 1, minOpacity: 0.15,
            gradient: { 0.2: "#c6dbef", 0.45: "#6baed6", 0.65: "#3182bd", 0.85: "#6a51a3", 1: "#3f007d" },
          });
        }
      }
      showRightLayer();
    }
    setUp();
    return () => { cancelled = true; };
  }, [view, sightings]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a species is picked in search ("focus"), zoom the map to its sightings;
  // when focus is cleared, go back to all of Queens.
  const lastFocus = useRef(null);
  useEffect(() => {
    if (focusKey && focusKey !== lastFocus.current && points.length) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])), { padding: [60, 60], maxZoom: 16 });
      lastFocus.current = focusKey;
    } else if (!focusKey && lastFocus.current) {
      map.setView(CENTER, ZOOM);
      lastFocus.current = null;
    }
  }, [focusKey, points, map]);

  return null;
}

export default function MapView({ points, sightings, view, focusKey, onSelectSpecies }) {
  return (
    <MapContainer center={CENTER} zoom={ZOOM} maxZoom={MAX_ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={MAX_ZOOM}
        maxNativeZoom={19}
      />
      <SightingsLayer points={points} sightings={sightings} view={view} focusKey={focusKey} onSelectSpecies={onSelectSpecies} />
    </MapContainer>
  );
}
