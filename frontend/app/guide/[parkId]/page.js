"use client";
/**
 * Printable field guide for one park (/guide/Q024), to take on a walk with no signal.
 * Shows the park's most-reported listed species as cards (openly licensed photo with
 * credit, danger level, sightings here), the rest as a short list, and how to report,
 * word for word from our sources. Print it, or "Save as PDF" from the print dialog.
 * Opened from the "Printable field guide" link in a park's profile.
 * QR codes (the park, and each species card) open the same thing on the live map.
 */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import QrCode from "@/components/QrCode";
import { getHealth, getHowToReport, getPark, getSpecies } from "@/lib/api";
import { formatMonth } from "@/lib/dates";
import { photoAlt } from "@/lib/credits";
import { DANGER_COLORS, NY_STATUS_LABELS } from "@/lib/labels";
import { STEWARDSHIP_URL, VOLUNTEER_EVENTS_URL } from "@/lib/meanings";
import { isLocalOnly, siteUrl } from "@/lib/site";

const CARD_COUNT = 6; // two rows of three: leaves room for everything else on one printed page

/** "inaturalist.org/observations/123" (readable on paper, unlike a full https:// link). */
const shortUrl = (url) => url.replace(/^https?:\/\/(www\.)?/, "");

export default function FieldGuide() {
  const { parkId } = useParams();
  const [guide, setGuide] = useState(null); // { park, details, report, updatedAt }
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [park, report, health] = await Promise.all([
        getPark(parkId),
        getHowToReport().catch(() => null), // the guide still works without it
        getHealth().catch(() => null),
      ]);
      // Full details (photos, danger source) only for the species that get a card.
      const top = park.species.slice(0, CARD_COUNT); // the API sends them most-sighted first
      const details = await Promise.all(top.map((s) => getSpecies(s.species_id).catch(() => null)));
      if (!cancelled) setGuide({ park, details, report, updatedAt: health?.cache_updated_at });
    }
    load().catch(() => !cancelled && setError("Couldn't load this park. Is the backend running?"));
    return () => { cancelled = true; };
  }, [parkId]);

  if (error) return <main className="guide"><p role="alert">{error}</p><a href="/">← Back to the map</a></main>;
  if (!guide) return <main className="guide"><p className="muted">Making the field guide…</p></main>;

  const { park, details, report, updatedAt } = guide;
  const top = park.species.slice(0, CARD_COUNT);
  const rest = park.species.slice(CARD_COUNT);
  const site = siteUrl();
  const parkUrl = `${site}/?park=${encodeURIComponent(park.park_id)}`;

  return (
    <main className="guide">
      <nav className="guide-toolbar no-print">
        <a href={`/?park=${encodeURIComponent(park.park_id)}`}>← Back to the map</a>
        <button onClick={() => window.print()}>🖨️ Print or save as PDF</button>
      </nav>
      {isLocalOnly(site) && (
        <p className="warning no-print" role="note">
          The QR codes point to <strong>{site}</strong>, which only opens on this computer. Before printing for others,
          put the app online and set <code>NEXT_PUBLIC_SITE_URL</code> (and <code>NEXT_PUBLIC_API_URL</code>) in{" "}
          <code>frontend/.env.local</code> to its public address.
        </p>
      )}

      <header className="guide-header">
        <div>
          <p className="muted park-kicker">Invasive species field guide · Kissena Invasive Watch</p>
          <h1>{park.name}</h1>
          <p className="muted">
            {[park.type, park.acres && `${Math.round(park.acres).toLocaleString()} acres`, park.address].filter(Boolean).join(" · ")}
          </p>
          <p>
            <strong>{park.species_count}</strong> New York–listed invasive species reported here in{" "}
            <strong>{park.sightings.toLocaleString()}</strong> iNaturalist sightings
            {park.first_seen && park.last_seen && ` (${formatMonth(park.first_seen)} to ${formatMonth(park.last_seen)})`}.
            These are what people reported, not a full survey.
          </p>
        </div>
        <figure className="guide-qr">
          <QrCode url={parkUrl} label={`QR code: opens ${park.name} on the live map`} />
          <figcaption>Scan for the live map of this park</figcaption>
        </figure>
      </header>

      <h2>Most reported here</h2>
      <ol className="guide-cards">
        {top.map((s, i) => <SpeciesCard key={s.species_id} summary={s} detail={details[i]} site={site} />)}
      </ol>

      {rest.length > 0 && (
        <section>
          <h2>Also reported here</h2>
          <p className="guide-rest">
            {rest.map((s, i) => (
              <span key={s.species_id}>
                {s.common_name || s.scientific_name} <span className="muted">({s.danger_label}, {s.sightings})</span>
                {i < rest.length - 1 && " · "}
              </span>
            ))}
          </p>
          <p className="muted">In brackets: danger level and number of sightings in this park.</p>
        </section>
      )}

      <section className="guide-report">
        <h2>📣 Report it, don&apos;t pull it</h2>
        {report?.text ? (
          <>
            {report.text.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            <p>
              <strong>Want to help remove invasives the right way?</strong> Join an NYC Parks stewardship project (
              {shortUrl(STEWARDSHIP_URL)}) or find a volunteer event ({shortUrl(VOLUNTEER_EVENTS_URL)}).
            </p>
            <p className="muted">
              Sources: {report.sources.map((source) => `${source.title} (${shortUrl(source.url)})`).join("; ")}
            </p>
          </>
        ) : (
          <p>No information in our sources yet.</p>
        )}
      </section>

      <footer className="guide-footer muted">
        <p>
          Danger levels: plants from the New York Non-Native Plant Invasiveness Ranking forms (nyis.info); other species from
          their category on the NYS DEC Part 575 invasive species list. No AI is used to rank them, and species without an
          official rank say “Not yet ranked”. Sightings: research-grade iNaturalist observations
          {updatedAt && `, as of ${new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}.
          Park boundary: NYC Parks Properties (NYC Open Data).
        </p>
      </footer>
    </main>
  );
}

/** One species card. `summary` is the park's row for it; `detail` is the full species (or null if it didn't load). */
function SpeciesCard({ summary, detail, site }) {
  const level = summary.danger_level ?? null;
  // Only openly licensed photos are printed; "all rights reserved" ones (license null) are not.
  const photo = detail?.photos.find((p) => p.license);
  const reserved = !photo && detail?.photos[0];

  return (
    <li className="guide-card">
      {photo ? (
        <figure>
          <img src={photo.url} alt={photoAlt(summary.common_name || summary.scientific_name, photo.attribution)} />
          <figcaption>
            {photo.attribution} ·{" "}
            <a href={photo.observation_url} target="_blank" rel="noreferrer">{shortUrl(photo.observation_url)}</a>
          </figcaption>
        </figure>
      ) : (
        <div className="guide-no-photo">
          {reserved ? (
            <>No openly licensed photo. See it on iNaturalist:{" "}
              <a href={reserved.observation_url} target="_blank" rel="noreferrer">{shortUrl(reserved.observation_url)}</a></>
          ) : (
            "No photo yet."
          )}
        </div>
      )}

      {/* Text on the left, the QR code beside it, so the code doesn't make the card taller. */}
      <div className="guide-card-body">
        <div>
          <h3>{summary.common_name || summary.scientific_name}</h3>
          <p className="scientific-name">{summary.scientific_name}</p>
          <p className="guide-danger">
            <span className="swatch" style={{ background: DANGER_COLORS[level] }} aria-hidden="true" />
            <strong>Danger: {summary.danger_label}</strong>
          </p>
          {detail && <p className="muted">{dangerBasis(detail)}</p>}
          {detail?.danger.health_warning && <p className="warning">⚠ {detail.danger.health_warning}</p>}
          <p className="muted">{summary.sightings.toLocaleString()} sighting{summary.sightings === 1 ? "" : "s"} in this park</p>
        </div>
        <QrCode
          url={`${site}/?species=${encodeURIComponent(summary.species_id)}`}
          label={`QR code: opens ${summary.common_name || summary.scientific_name} on the live map`}
          className="qr-code qr-small"
        />
      </div>
    </li>
  );
}

/** Where the danger level comes from, in a few words (only from what the API sent). */
function dangerBasis(detail) {
  const { danger } = detail;
  if (danger.basis === "ny_plant_rank" && danger.ny_rank) {
    return `NY plant invasiveness rank: ${danger.ny_rank}${danger.score != null ? ` (${Math.round(danger.score)}/100)` : ""}`;
  }
  if (NY_STATUS_LABELS[detail.ny_status]) return `${NY_STATUS_LABELS[detail.ny_status]} (NYS DEC Part 575)`;
  return "No official New York rank yet";
}
