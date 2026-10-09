"use client";
/**
 * The Leaflet map with every sighting on it.
 *
 * - Points: repeat sightings of the same species within ~100 m are merged into one
 *   icon with a "×N" badge (see lib/aggregate.js).
 * - Bubbles: nearby points are grouped into numbered bubbles. The grouping distance is
 *   always bigger than the bubbles, so bubbles don't overlap. From zoom 17, points
 *   are shown one by one.
 * - Crowded spots: clicking a bubble zooms in; once you're zoomed in close (16+),
 *   it opens a list of the species there instead.
 * - Heat map (optional view): a soft glow shows where sightings are dense when zoomed
 *   out; icons take over from zoom 15.
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
const LIST_FROM_ZOOM = 16; // clicking a bubble at this zoom or closer shows a list instead of zooming
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

// One neutral bubble style, sized gently by how many sightings it holds (26-46 px).
function clusterIcon(cluster) {
  const total = sightingsIn(cluster);
  const size = Math.round(26 + Math.min(20, Math.sqrt(total) * 0.6));
  const text = total >= 1000 ? `${Math.round(total / 100) / 10}k` : String(total);
  return L.divIcon({ html: `<span>${text}</span>`, className: "cluster-bubble", iconSize: [size, size] });
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** HTML for the "what's here" popup: one row per species, most sightings first. */
function speciesListHtml(cluster) {
  const bySpecies = new Map();
  for (const marker of cluster.getAllChildMarkers()) {
    const o = marker.options;
    const row = bySpecies.get(o.speciesId) || { name: o.name, level: o.dangerLevel, count: 0 };
    row.count += o.count;
    bySpecies.set(o.speciesId, row);
  }
  const rows = [...bySpecies.entries()].sort((a, b) => b[1].count - a[1].count);
  const shown = rows.slice(0, 12);
  const items = shown
    .map(
      ([id, r]) =>
        `<li><button type="button" data-species-id="${escapeHtml(id)}">` +
        `<span class="swatch" style="background:${DANGER_COLORS[r.level ?? null]}"></span>` +
        `${escapeHtml(r.name)}<span class="chip-count">×${r.count}</span></button></li>`,
    )
    .join("");
  const more = rows.length > shown.length ? `<p class="muted">…and ${rows.length - shown.length} more species. Zoom in to see them.</p>` : "";
  return `<div class="spot-list"><strong>${sightingsIn(cluster)} sightings here</strong><ul>${items}</ul>${more}</div>`;
}

/** Adds the sightings (bubbles/icons, and optionally the heat map) to the map. */
function SightingsLayer({ points, sightings, view, onSelectSpecies }) {
  const map = useMap();
  const clusters = useRef(null);
  const heat = useRef(null);
  const onSelect = useRef(onSelectSpecies);
  onSelect.current = onSelectSpecies;

  // Create the bubble/icon layer once.
  useEffect(() => {
    const layer = L.markerClusterGroup({
      chunkedLoading: true, // add markers in small batches so the page never freezes for long
      maxClusterRadius: clusterRadius,
      iconCreateFunction: clusterIcon,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false, // we decide below: zoom in, or show a list
      spiderfyOnMaxZoom: false, // the fan-out was hard to read; crowded spots get a list instead
    });
    layer.on("click", (event) => {
      const id = event.layer.options.speciesId; // undefined for bubbles (they use "clusterclick")
      if (id) onSelect.current(id);
    });
    layer.on("mouseover", (event) => {
      const marker = event.layer;
      if (!marker.getTooltip()) marker.bindTooltip(marker.options.label); // made on first hover only
      marker.openTooltip();
    });
    layer.on("clusterclick", (event) => {
      const cluster = event.layer;
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
    clusters.current = layer;
    return () => {
      map.removeLayer(layer);
      if (heat.current) map.removeLayer(heat.current);
    };
  }, [map]);

  // Rebuild the markers whenever the (filtered, merged) points change.
  useEffect(() => {
    const layer = clusters.current;
    const markers = points.map((p) => {
      const name = p.common_name || p.scientific_name;
      return L.marker([p.latitude, p.longitude], {
        icon: makeMarkerIcon({ iconicTaxon: p.iconic_taxon, dangerLevel: p.danger_level, count: p.count }),
        keyboard: false, // thousands of tab stops would make keyboard use impossible
        speciesId: p.species_id,
        name,
        dangerLevel: p.danger_level,
        count: p.count,
        label: p.count > 1 ? `${name} · ${p.count} sightings here, latest ${p.observed_on}` : `${name} · ${p.observed_on}`,
        title: name,
      });
    });
    layer.clearLayers();
    layer.addLayers(markers); // one batch add is much faster than adding markers one by one
  }, [points]);

  // Heat-map view: show the glow when zoomed out and the icons when zoomed in.
  useEffect(() => {
    let cancelled = false;
    const layer = clusters.current;

    function showRightLayer() {
      const useHeat = view === "heat" && heat.current && map.getZoom() < HEAT_UNTIL_ZOOM;
      if (useHeat) {
        if (map.hasLayer(layer)) map.removeLayer(layer);
        if (!map.hasLayer(heat.current)) map.addLayer(heat.current);
      } else {
        if (heat.current && map.hasLayer(heat.current)) map.removeLayer(heat.current);
        if (!map.hasLayer(layer)) map.addLayer(layer);
      }
    }

    async function setUp() {
      if (view === "heat") {
        // The heat plugin expects Leaflet as a global, so load it only when needed.
        window.L = L;
        await import("leaflet.heat");
        if (cancelled) return;
        const latlngs = sightings.map((s) => [s.latitude, s.longitude, HEAT_INTENSITY]);
        if (heat.current) {
          heat.current.setLatLngs(latlngs);
        } else {
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
    map.on("zoomend", showRightLayer);
    return () => {
      cancelled = true;
      map.off("zoomend", showRightLayer);
    };
  }, [map, view, sightings]);

  return null;
}

export default function MapView({ points, sightings, view, onSelectSpecies }) {
  return (
    <MapContainer center={CENTER} zoom={ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <SightingsLayer points={points} sightings={sightings} view={view} onSelectSpecies={onSelectSpecies} />
    </MapContainer>
  );
}
