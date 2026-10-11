"use client";
/**
 * Credits dialog (opened from the footer): every data source, with links.
 * Photo and sound credits are shown next to each photo/sound in the species panel.
 */

import { useEffect, useRef } from "react";

import { useReturnFocus } from "@/lib/useReturnFocus";

const CREDITS = [
  ["Sightings, photos and sounds", "iNaturalist and its observers (research-grade observations; each photo and sound is credited with its license where it's shown)", "https://www.inaturalist.org"],
  ["Invasive status", "NYS DEC, 6 NYCRR Part 575 Prohibited and Regulated Invasive Species list", "https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf"],
  ["Plant danger ranks", "New York Non-Native Plant Invasiveness Ranking forms (nyis.info)", "https://nyis.info"],
  ["Park boundaries", "NYC Parks Properties, NYC Department of Parks and Recreation (NYC Open Data)", "https://data.cityofnewyork.us/d/enfh-gkve"],
  ["Park photos", "Wikimedia Commons photographers (openly licensed; each photo is credited with its license in the park profile)", "https://commons.wikimedia.org"],
  ["Species fact sheets", "NYIS (Cornell / NY Sea Grant), NYS DEC, USGS, WNY PRISM, NY iMapInvasives (linked under Sources in each species panel)", null],
  ["Reporting", "NY iMapInvasives, New York's official invasive species database", "https://www.nyimapinvasives.org/report"],
  ["Park rules and volunteering", "NYC Parks Rules (56 RCNY §1-04) and NYC Parks Stewardship volunteer projects", "https://www.nycgovparks.org/reg/stewardship"],
  ["Map", "© OpenStreetMap contributors", "https://www.openstreetmap.org/copyright"],
  ["Background music", "Generated with ElevenLabs", null],
];

export default function Credits({ onClose }) {
  const closeButton = useRef(null);
  useReturnFocus();

  useEffect(() => closeButton.current?.focus(), []);

  // Escape closes only this dialog (stopPropagation keeps an open side panel behind it from closing too).
  function onKeyDown(event) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onClose();
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} onKeyDown={onKeyDown}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="credits-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close credits">✕</button>
        <h2 id="credits-title">Credits &amp; sources</h2>
        <dl>
          {CREDITS.map(([what, who, url]) => (
            <div key={what}>
              <dt>{what}</dt>
              <dd>{url ? <a href={url} target="_blank" rel="noreferrer">{who}</a> : who}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">Built at HackKnight 2026, Queens College.</p>
      </div>
    </div>
  );
}
