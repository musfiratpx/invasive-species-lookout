"use client";
/**
 * The Leaflet map with every sighting on it.
 *
 * Zoomed out, nearby sightings are grouped into numbered bubbles (clusters).
 * Clusters loosen as you zoom in, and from zoom 17 every sighting has its own icon.
 * Clicking an icon tells the page which species to show in the sidebar.
 *
 * Why the markers are built "by hand" instead of as <Marker> components:
 * Queens has ~15,000 sightings. Making a React component (plus a tooltip) for each
 * one froze phones for several seconds. Here we create plain Leaflet markers in one
 * batch, reuse one icon per (type, danger level) pair, make tooltips only on hover,
 * and let the cluster plugin draw only what's on screen.
 */

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import { makeMarkerIcon } from "@/components/SpeciesIcon";

const CENTER = (process.env.NEXT_PUBLIC_MAP_CENTER || "40.7282,-73.7949").split(",").map(Number);
const ZOOM = Number(process.env.NEXT_PUBLIC_MAP_ZOOM || 12);

// How far apart (in screen pixels) sightings can be and still be grouped.
// Bigger = fewer, larger bubbles. From zoom 17 almost nothing is grouped.
function clusterRadius(zoom) {
  if (zoom >= 17) return 1;
  if (zoom >= 15) return 35;
  return 70;
}

// One neutral bubble style for every cluster, so color on the map only ever means danger level.
function clusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? "small" : count < 100 ? "medium" : "large";
  const text = count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count);
  return L.divIcon({ html: `<span>${text}</span>`, className: `cluster-bubble cluster-${size}`, iconSize: null });
}

/** Adds the sightings to the map. Lives inside <MapContainer> so it can reach the map. */
function SightingsLayer({ observations, onSelectSpecies }) {
  const map = useMap();
  const group = useRef(null);
  const onSelect = useRef(onSelectSpecies);
  onSelect.current = onSelectSpecies;

  // Create the cluster layer once.
  useEffect(() => {
    const layer = L.markerClusterGroup({
      chunkedLoading: true, // add markers in small batches so the page never freezes for long
      maxClusterRadius: clusterRadius,
      iconCreateFunction: clusterIcon,
      showCoverageOnHover: false, // the outline drawn on hover was distracting and slow
      spiderfyOnMaxZoom: true, // sightings at the exact same spot fan out when clicked
    });
    layer.on("click", (event) => onSelect.current(event.layer.options.speciesId));
    // Tooltips are made the first time you hover a marker, not up front for all 15,000.
    layer.on("mouseover", (event) => {
      const marker = event.layer;
      if (!marker.getTooltip()) marker.bindTooltip(marker.options.label);
      marker.openTooltip();
    });
    map.addLayer(layer);
    group.current = layer;
    return () => map.removeLayer(layer);
  }, [map]);

  // Rebuild the markers whenever the (filtered) sightings change.
  useEffect(() => {
    const layer = group.current;
    if (!layer) return;
    const markers = observations.map((obs) =>
      L.marker([obs.latitude, obs.longitude], {
        icon: makeMarkerIcon({ iconicTaxon: obs.iconic_taxon, dangerLevel: obs.danger_level }),
        keyboard: false, // 15,000 tab stops would make keyboard use impossible
        speciesId: obs.species_id,
        label: `${obs.common_name || obs.scientific_name} · ${obs.observed_on}`,
        title: obs.common_name || obs.scientific_name,
      }),
    );
    layer.clearLayers();
    layer.addLayers(markers); // one batch add is much faster than adding markers one by one
  }, [observations]);

  return null;
}

export default function MapView({ observations, onSelectSpecies }) {
  return (
    <MapContainer center={CENTER} zoom={ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <SightingsLayer observations={observations} onSelectSpecies={onSelectSpecies} />
    </MapContainer>
  );
}
