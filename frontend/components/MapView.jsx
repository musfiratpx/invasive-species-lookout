"use client";
/**
 * The Leaflet map. Zoomed out (below zoom 15), nearby sightings are grouped
 * into numbered clusters. At zoom 15 and closer, every sighting gets its own icon.
 *
 * Why not just turn clustering off at zoom 15? Then Leaflet draws ALL ~15,000
 * Queens sightings at once (slow on phones). Keeping the cluster engine on with a
 * 1-pixel radius looks the same but only draws the icons currently on screen.
 * Clicking an icon tells the page which species to show in the sidebar.
 */

import { useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { makeMarkerIcon } from "@/components/SpeciesIcon";

const CENTER = (process.env.NEXT_PUBLIC_MAP_CENTER || "40.7282,-73.7949").split(",").map(Number);
const ZOOM = Number(process.env.NEXT_PUBLIC_MAP_ZOOM || 12);
const ICONS_FROM_ZOOM = 15;
const clusterRadius = (zoom) => (zoom >= ICONS_FROM_ZOOM ? 1 : 80); // 80 px is the plugin's default

export default function MapView({ observations, onSelectSpecies }) {
  // Build each marker once per data load, not on every re-render.
  const markers = useMemo(
    () =>
      observations.map((obs) => (
        <Marker
          key={obs.observation_id}
          position={[obs.latitude, obs.longitude]}
          icon={makeMarkerIcon({
            iconicTaxon: obs.iconic_taxon,
            dangerLevel: obs.danger_level,
            obscured: obs.obscured,
          })}
          keyboard={true}
          title={obs.common_name || obs.scientific_name}
          alt={obs.common_name || obs.scientific_name}
          eventHandlers={{ click: () => onSelectSpecies(obs.species_id) }}
        >
          <Tooltip>
            {obs.common_name || obs.scientific_name} · {obs.observed_on}
            {obs.obscured && " · approximate location"}
          </Tooltip>
        </Marker>
      )),
    [observations, onSelectSpecies],
  );

  return (
    <MapContainer center={CENTER} zoom={ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup maxClusterRadius={clusterRadius} chunkedLoading>
        {markers}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
