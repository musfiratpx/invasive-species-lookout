"use client";
/**
 * The background map under the sightings: a simplified, green-themed OpenFreeMap map
 * (lib/basemapStyle.js), drawn with MapLibre inside Leaflet.
 *
 * MapLibre needs WebGL (graphics in the browser). If a device doesn't have it, or the style
 * can't be loaded, we fall back to the standard OpenStreetMap images so the map still works.
 */

import "@maplibre/maplibre-gl-leaflet"; // adds L.maplibreGL
import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

import { ATTRIBUTION, STYLE_URL, simplifyStyle } from "@/lib/basemapStyle";

const MAX_ZOOM = 20;

/** True if this browser can draw WebGL graphics, which MapLibre needs. */
function webglWorks() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** The standard OpenStreetMap images, used only as a fallback. */
function osmLayer() {
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: MAX_ZOOM,
    maxNativeZoom: 19,
  });
}

export default function Basemap() {
  const map = useMap();

  useEffect(() => {
    let layer = null;
    let cancelled = false;
    const show = (newLayer) => {
      if (cancelled) return;
      layer = newLayer.addTo(map);
    };

    if (!webglWorks()) {
      show(osmLayer());
    } else {
      fetch(STYLE_URL)
        .then((response) => response.json())
        .then((style) => show(L.maplibreGL({ style: simplifyStyle(style), attribution: ATTRIBUTION })))
        .catch(() => show(osmLayer())); // no connection to OpenFreeMap: use the standard map
    }

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
