"use client";
/**
 * "Near you": a photo grid of the listed species that people have reported near where you
 * are, most-reported first. Opened by the "📍 Near me" button in the toolbar,
 * once the browser shares your location.
 *
 * - A 500 m / 1 km / 2 km switch sets how far to look (the map's dashed circle follows it).
 * - The 12 most-reported species show first; "Show all" reveals the rest.
 * - Outside New York City we have no data, so it says that instead of an empty list
 *   (an empty list would wrongly suggest there are no invasive species there).
 *
 * Privacy: your location is only used here, in your browser. It is never sent to our server
 * and never put in the page's address (so a shared link can't reveal where someone was).
 * Everything is worked out from the sightings the page has already loaded.
 *
 * Honesty: these are past iNaturalist reports, not a survey, so a species missing from the
 * list may still grow nearby; the panel says so.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import PhotoCredit from "@/components/PhotoCredit";
import { formatDay } from "@/lib/dates";
import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { RADII_M, distanceText, metersBetween, radiusText } from "@/lib/nearby";
import { taxonIcon } from "@/lib/taxa";
import { useReturnFocus } from "@/lib/useReturnFocus";

const FIRST_SHOWN = 12;

export default function NearMePanel({ location, outside, radius, onChangeRadius, sightings, species, covered, onPickSpecies, onClose }) {
  const closeButton = useRef(null);
  const [showAll, setShowAll] = useState(false);
  useReturnFocus();

  useEffect(() => closeButton.current?.focus(), []);
  useEffect(() => setShowAll(false), [radius, location]); // a new search starts short again

  // Escape closes the panel, but only while it's the one you can see.
  useEffect(() => {
    if (covered) return;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [covered, onClose]);

  // One row per species seen within the radius: how many times, how close, how recently.
  const nearby = useMemo(() => {
    if (!location) return [];
    const bySpecies = new Map();
    for (const obs of sightings) {
      const m = metersBetween(location.lat, location.lng, obs.latitude, obs.longitude);
      if (m > radius) continue;
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
  }, [location, radius, sightings, species]);

  const total = nearby.reduce((sum, row) => sum + row.count, 0);
  const shown = showAll ? nearby : nearby.slice(0, FIRST_SHOWN);

  return (
    <aside className={covered ? "sidebar covered" : "sidebar"} aria-label="Species near you">
      <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close near you panel">✕</button>
      <h2>Near you</h2>

      {outside ? (
        <p>
          Near you only works inside New York City, where our sightings are. Your location looks like it&apos;s
          outside the city. Try searching for a park or species instead.
        </p>
      ) : (
        <>
          <div className="segmented near-radius" role="group" aria-label="How far to look">
            {RADII_M.map((m) => (
              <button key={m} aria-pressed={radius === m} onClick={() => onChangeRadius(m)}>Within {radiusText(m)}</button>
            ))}
          </div>

          {nearby.length === 0 ? (
            <p>
              No sightings of listed invasive species within {radiusText(radius)} yet.
              {radius < RADII_M[RADII_M.length - 1] && " Try a bigger area above."} That may just mean nobody has posted
              one here. If you spot one, please report it.
            </p>
          ) : (
            <>
              {/* Read out by screen readers when the radius changes. */}
              <p className="muted" role="status">
                {nearby.length} species, {total.toLocaleString()} sighting{total === 1 ? "" : "s"} reported within{" "}
                {radiusText(radius)} on iNaturalist. These are past reports, not a survey: others may grow here too.
              </p>
              <ul className="park-species">
                {shown.map(({ id, s, count, closest, latest }) => (
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
              {nearby.length > FIRST_SHOWN && (
                <button className="near-more" onClick={() => setShowAll((all) => !all)}>
                  {showAll ? `Show the top ${FIRST_SHOWN}` : `Show all ${nearby.length} species`}
                </button>
              )}
            </>
          )}
        </>
      )}
      <p className="muted near-privacy">🔒 Your location stays in your browser. It isn&apos;t sent anywhere or saved.</p>
    </aside>
  );
}
