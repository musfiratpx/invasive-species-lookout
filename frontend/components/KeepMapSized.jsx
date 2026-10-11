"use client";
/**
 * Tells Leaflet when the map's box changes size (full screen on/off, the page resizing).
 * Leaflet only notices window resizes by itself; without this, a map that grows to full
 * screen keeps drawing tiles only in its old, smaller area.
 */

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function KeepMapSized() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
