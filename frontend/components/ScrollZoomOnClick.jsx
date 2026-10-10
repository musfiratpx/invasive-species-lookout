"use client";
/**
 * Stops the map from trapping the page scroll. The map sits in the middle of a long page,
 * so scrolling over it should move the page, not zoom the map. Scroll-zoom turns on once
 * someone clicks (or tabs into) the map, and off again when the mouse leaves it.
 * While it's off, scrolling over the map shows a short hint saying how to zoom.
 * (The +/- buttons, pinch-zoom and double-click always work.)
 */

import { useEffect } from "react";
import { useMap } from "react-leaflet";

const HINT_MS = 1500;

export default function ScrollZoomOnClick() {
  const map = useMap();

  useEffect(() => {
    const box = map.getContainer();
    const hint = document.createElement("div");
    hint.className = "scroll-hint";
    hint.setAttribute("aria-hidden", "true"); // mouse-only hint; keyboard users have +/- keys
    hint.textContent = "Click the map to zoom with the scroll wheel";
    box.appendChild(hint);
    let timer = null;

    const turnOn = () => { map.scrollWheelZoom.enable(); hint.classList.remove("show"); };
    const turnOff = () => map.scrollWheelZoom.disable();
    const showHint = () => {
      if (map.scrollWheelZoom.enabled()) return;
      hint.classList.add("show");
      clearTimeout(timer);
      timer = setTimeout(() => hint.classList.remove("show"), HINT_MS);
    };

    map.on("click focus", turnOn);
    box.addEventListener("mouseleave", turnOff);
    box.addEventListener("wheel", showHint, { passive: true });
    return () => {
      map.off("click focus", turnOn);
      box.removeEventListener("mouseleave", turnOff);
      box.removeEventListener("wheel", showHint);
      clearTimeout(timer);
      hint.remove();
    };
  }, [map]);

  return null;
}
