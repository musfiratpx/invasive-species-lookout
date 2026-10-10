"use client";
/**
 * Faint outlines of every park with sightings, so people can discover parks on the map
 * instead of only through search or Browse. Tapping a park opens its profile; hovering
 * shows its name.
 *
 * Only shown at mid zoom: zoomed all the way out they'd be clutter, and at street level
 * people are tapping individual sightings. The focused park is left out here, because
 * MapView draws it with a bolder outline.
 *
 * outlines: the GeoJSON FeatureCollection from GET /api/parks/outlines (or null while loading).
 */

import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

const FROM_ZOOM = 13;
const UNTIL_ZOOM = 18; // street level, where every sighting is shown separately

const FAINT = { color: "#2e7d32", weight: 1, opacity: 0.45, fillColor: "#2e7d32", fillOpacity: 0.04 };
const HOVER = { weight: 2, opacity: 0.8, fillOpacity: 0.1 };

export default function ParkOutlines({ outlines, focusedParkId, onSelectPark }) {
  const map = useMap();
  const onSelect = useRef(onSelectPark);
  onSelect.current = onSelectPark;

  useEffect(() => {
    if (!outlines) return;
    const layer = L.geoJSON(outlines, {
      filter: (feature) => feature.properties.park_id !== focusedParkId,
      style: FAINT,
      onEachFeature: (feature, shape) => {
        shape.bindTooltip(`🌳 ${feature.properties.name}`, { sticky: true });
        shape.on("mouseover", () => shape.setStyle(HOVER));
        shape.on("mouseout", () => shape.setStyle(FAINT));
        shape.on("click", () => onSelect.current(feature.properties.park_id));
      },
    });

    const showAtMidZoom = () => {
      const zoom = map.getZoom();
      const wanted = zoom >= FROM_ZOOM && zoom < UNTIL_ZOOM;
      if (wanted && !map.hasLayer(layer)) {
        layer.addTo(map);
        layer.bringToBack(); // below the bold outline of the focused park
      }
      if (!wanted && map.hasLayer(layer)) map.removeLayer(layer);
    };
    map.on("zoomend", showAtMidZoom);
    showAtMidZoom();
    return () => {
      map.off("zoomend", showAtMidZoom);
      map.removeLayer(layer);
    };
  }, [outlines, focusedParkId, map]);

  return null;
}
