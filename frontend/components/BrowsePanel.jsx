"use client";
/**
 * "Browse" panel: the same data as the map, as lists. Three tabs:
 *   - All species:    a sortable table of every listed species (works with a keyboard and screen readers);
 *   - Recently seen:  the newest sightings, so you can see what people are finding now;
 *   - Near me:        listed species seen close to you (or to an example place).
 * Tapping a row opens the species panel; its "Back" button returns here.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { DANGER_COLORS, DANGER_LABELS } from "@/lib/labels";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { taxonIcon } from "@/lib/taxa";

const TABS = [
  { id: "species", label: "All species" },
  { id: "recent", label: "Recently seen" },
  { id: "near", label: "Near me" },
];

// A clearly labeled stand-in for "my location", for demos indoors or when location is blocked.
export const EXAMPLE_PLACE = { lat: 40.7365, lng: -73.8203, accuracy: 150, label: "Example place: Queens College" };

const RADII = [250, 500, 1000];
const RECENT_DAYS = 30;
const RECENT_MAX = 40;

export default function BrowsePanel({ tab, onChangeTab, onClose, species, observations, parkNames, userLocation, onLocate, onPickSpecies, onPickSighting }) {
  const closeButton = useRef(null);

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="sidebar browse" aria-label="Browse species and sightings">
      <button ref={closeButton} className="sidebar-close" onClick={onClose} aria-label="Close browse panel">✕</button>
      <h2>Browse</h2>
      <div className="segmented tabs" role="tablist" aria-label="Browse by">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => onChangeTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "species" && <SpeciesTable species={species} onPick={onPickSpecies} />}
      {tab === "recent" && <RecentList observations={observations} parkNames={parkNames} onPick={onPickSighting} />}
      {tab === "near" && (
        <NearMe observations={observations} userLocation={userLocation} onLocate={onLocate} onPick={onPickSighting} />
      )}
    </aside>
  );
}

function DangerCell({ level }) {
  return (
    <span className="danger-cell">
      <span className="swatch" style={{ background: DANGER_COLORS[level ?? null] }} aria-hidden="true" />
      {DANGER_LABELS[level ?? null]}
    </span>
  );
}

function SpeciesTable({ species, onPick }) {
  const [sortBy, setSortBy] = useState("sightings");
  const sorted = useMemo(() => {
    const rows = [...species];
    if (sortBy === "name") rows.sort((a, b) => (a.common_name || a.scientific_name).localeCompare(b.common_name || b.scientific_name));
    if (sortBy === "danger") rows.sort((a, b) => (b.danger_level ?? 0) - (a.danger_level ?? 0) || b.sightings - a.sightings);
    if (sortBy === "sightings") rows.sort((a, b) => b.sightings - a.sightings);
    return rows;
  }, [species, sortBy]);

  // A column header that sorts the table; aria-sort tells screen readers which column is sorted.
  const header = (id, label) => (
    <th aria-sort={sortBy === id ? (id === "name" ? "ascending" : "descending") : "none"}>
      <button className="sort-button" onClick={() => setSortBy(id)}>
        {label} {sortBy === id ? "▾" : ""}
      </button>
    </th>
  );

  return (
    <table className="species-table">
      <caption className="muted">{species.length} New York–listed invasive species seen in Queens. Tap one for details.</caption>
      <thead>
        <tr>
          {header("name", "Species")}
          {header("danger", "Danger")}
          {header("sightings", "Sightings")}
        </tr>
      </thead>
      <tbody>
        {sorted.map((s) => (
          <tr key={s.species_id}>
            <td>
              <button className="row-button" onClick={() => onPick(s.species_id)}>
                <span aria-hidden="true">{taxonIcon(s.iconic_taxon).emoji}</span>{" "}
                <span className="search-name">{s.common_name}<em>{s.scientific_name}</em></span>
              </button>
            </td>
            <td><DangerCell level={s.danger_level} /></td>
            <td className="num">{s.sightings.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "Oct 4, 2026" from "2026-10-04" (read as a local date, so it doesn't shift a day). */
function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SightingRow({ obs, detail, onPick }) {
  return (
    <li>
      <button className="row-button sighting-row" onClick={() => onPick(obs)}>
        <span className="swatch" style={{ background: DANGER_COLORS[obs.danger_level ?? null] }} title={DANGER_LABELS[obs.danger_level ?? null]} />
        <span aria-hidden="true">{taxonIcon(obs.iconic_taxon).emoji}</span>
        <span className="search-name">{obs.common_name || obs.scientific_name}<em>{detail}</em></span>
      </button>
    </li>
  );
}

function RecentList({ observations, parkNames, onPick }) {
  const { recent, lastMonth } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RECENT_DAYS);
    const since = cutoff.toISOString().slice(0, 10);
    const newest = [...observations].sort((a, b) => b.observed_on.localeCompare(a.observed_on) || b.observation_id - a.observation_id);
    return { recent: newest.slice(0, RECENT_MAX), lastMonth: newest.filter((o) => o.observed_on >= since).length };
  }, [observations]);

  return (
    <>
      <p className="muted">
        {lastMonth.toLocaleString()} sighting{lastMonth === 1 ? "" : "s"} in the last {RECENT_DAYS} days. The newest {recent.length} are below; tap one to fly to it.
      </p>
      <ul className="row-list">
        {recent.map((obs) => (
          <SightingRow
            key={obs.observation_id}
            obs={obs}
            detail={[formatDate(obs.observed_on), parkNames[obs.park_id]].filter(Boolean).join(" · ")}
            onPick={onPick}
          />
        ))}
      </ul>
    </>
  );
}

function NearMe({ observations, userLocation, onLocate, onPick }) {
  const [radius, setRadius] = useState(500);
  const [status, setStatus] = useState(null); // null, "finding" or an error message

  function locateMe() {
    if (!navigator.geolocation) return setStatus("This browser can't share its location.");
    setStatus("finding");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus(null);
        onLocate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, label: "You are here" });
      },
      () => setStatus("Couldn't get your location. Check that location access is allowed, or try the example place."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // One row per species seen within the radius: how many sightings, and the nearest one.
  const nearby = useMemo(() => {
    if (!userLocation) return [];
    const bySpecies = {};
    for (const obs of observations) {
      const d = distanceMeters(userLocation.lat, userLocation.lng, obs.latitude, obs.longitude);
      if (d > radius) continue;
      const row = (bySpecies[obs.species_id] ||= { obs, distance: d, count: 0 });
      row.count += 1;
      if (d < row.distance) Object.assign(row, { obs, distance: d });
    }
    return Object.values(bySpecies).sort((a, b) => a.distance - b.distance);
  }, [observations, userLocation, radius]);

  const locateButtons = (
    <p className="near-buttons">
      <button onClick={locateMe} disabled={status === "finding"}>
        {status === "finding" ? "Finding you…" : "📍 Use my location"}
      </button>
      <button onClick={() => onLocate(EXAMPLE_PLACE)}>Try an example place: Queens College</button>
    </p>
  );

  if (!userLocation) {
    return (
      <>
        <p>See which listed invasive species have been seen close to you.</p>
        {locateButtons}
        {status && status !== "finding" && <p role="alert" className="warning">{status}</p>}
        <p className="muted">Your location stays in your browser; it is never sent anywhere.</p>
      </>
    );
  }

  return (
    <>
      <p className="muted">
        Around: <strong>{userLocation.label}</strong>
        {userLocation.label !== "You are here" && (
          <>
            {" · "}
            <button className="link-button" onClick={locateMe}>use my location instead</button>
          </>
        )}
      </p>
      <div className="segmented" role="group" aria-label="How far">
        {RADII.map((r) => (
          <button key={r} aria-pressed={radius === r} onClick={() => setRadius(r)}>within {formatDistance(r)}</button>
        ))}
      </div>
      {nearby.length === 0 ? (
        <p className="muted">
          No listed invasive species have been seen within {formatDistance(radius)}. (This map only covers Queens.)
        </p>
      ) : (
        <>
          <p className="muted">
            {nearby.length} species seen within {formatDistance(radius)}, nearest first. Tap one to fly to its closest sighting.
          </p>
          <ul className="row-list">
            {nearby.map(({ obs, distance, count }) => (
              <SightingRow
                key={obs.species_id}
                obs={obs}
                detail={`${formatDistance(distance)} away · ${count} sighting${count === 1 ? "" : "s"} nearby · ${DANGER_LABELS[obs.danger_level ?? null]}`}
                onPick={onPick}
              />
            ))}
          </ul>
        </>
      )}
      {status && status !== "finding" && <p role="alert" className="warning">{status}</p>}
    </>
  );
}
