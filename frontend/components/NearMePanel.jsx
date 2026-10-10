"use client";
/**
 * "Near you": a photo grid of the listed species that people have reported within 1 km of
 * where you are, most-reported first. Opened by the 📍 button on the map or "Near me" in the
 * toolbar, once the browser shares your location.
 *
 * Privacy: your location is only used here, in your browser. It is never sent to our server
 * and never put in the page's address (so a shared link can't reveal where someone was).
 * Everything is worked out from the sightings the page has already loaded.
 *
 * Honesty: these are past iNaturalist reports, not a survey, so a species missing from the
 * list may still grow nearby; the panel says so.
 */

import { useEffect, useMemo, useRef } from "react";

import PhotoCredit from "@/components/PhotoCredit";
import { formatDay } from "@/lib/dates";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { taxonIcon } from "@/lib/taxa";
import { useReturnFocus } from "@/lib/useReturnFocus";

export const NEAR_RADIUS_M = 1000;

/** Distance in meters between two points on Earth (the "haversine" formula). */
function metersBetween(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

/** "300 m" or "1.2 km" */
const distanceText = (m) => (m < 950 ? `${Math.round(m / 50) * 50 || 50} m` : `${(m / 1000).toFixed(1)} km`);

export default function NearMePanel({ location, sightings, species, covered, onPickSpecies, onClose }) {
  const closeButton = useRef(null);
  useReturnFocus();

  useEffect(() => closeButton.current?.focus(), []);

  // Escape closes the panel, but only while it's the one you can see.
  useEffect(() => {
    if (covered) return;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [covered, onClose]);

  // One row per species seen within the radius: how many times, how close, how recently.
  const nearby = useMemo(() => {
    const bySpecies = new Map();
    for (const obs of sightings) {
      const m = metersBetween(location.lat, location.lng, obs.latitude, obs.longitude);
      if (m > NEAR_RADIUS_M) continue;
      const row = bySpecies.get(obs.species_id) || { id: obs.species_id, count: 0, closest: Infinity, latest: "" };
      row.count += 1;
      row.closest = Math.min(row.closest, m);
      if (obs.observed_on > row.latest) row.latest = obs.observed_on;
      bySpecies.set(obs.species_id, row);
    }
    const info = new Map(species.map((s) => [s.species_id, s]));
    return [...bySpecies.values()]
      .filter((row) => info.has(row.id))
      .map((row) => ({ ...row, s: info.get(row.id) }))
      .sort((a, b) => b.count - a.count);
  }, [location, sightings, species]);

  const total = nearby.reduce((sum, row) => sum + row.count, 0);

  return (
    <aside className={covered ? "sidebar covered" : "sidebar"} aria-label="Species near you">
      <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close near you panel">✕</button>
      <p className="park-kicker">Within {NEAR_RADIUS_M / 1000} km of you</p>
      <h2>Near you</h2>
      {nearby.length === 0 ? (
        <p>
          No sightings of listed invasive species within {NEAR_RADIUS_M / 1000} km yet. That may just mean nobody has
          posted one here. If you spot one, please report it.
        </p>
      ) : (
        <>
          <p className="muted">
            {nearby.length} species, {total.toLocaleString()} sighting{total === 1 ? "" : "s"} reported nearby on
            iNaturalist. These are past reports, not a survey: others may grow here too.
          </p>
          <ul className="park-species">
            {nearby.map(({ id, s, count, closest, latest }) => (
              <li key={id}>
                <button onClick={() => onPickSpecies(id)}>
                  {s.thumb
                    ? <img src={s.thumb.url} alt="" loading="lazy" />
                    : <span className="park-species-empty" aria-hidden="true">{taxonIcon(s.iconic_taxon).emoji}</span>}
                  <span className="park-species-name">{s.common_name || s.scientific_name}</span>
                  <span className="park-species-detail">
                    <span className="swatch" style={{ background: DANGER_COLORS[s.danger_level ?? null] }} aria-hidden="true" />
                    {DANGER_LABELS[s.danger_level ?? null]}
                  </span>
                  <span className="park-species-detail">
                    {count} seen · closest {distanceText(closest)} · last {formatDay(latest)}
                  </span>
                </button>
                {s.thumb && <PhotoCredit photo={s.thumb} />}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted near-privacy">🔒 Your location stays in your browser. It isn&apos;t sent anywhere or saved.</p>
    </aside>
  );
}
