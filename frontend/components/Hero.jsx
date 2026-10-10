/**
 * Top of the page (layout from Moses's SAIL field-guide mockup, moses-panel branch): a nav bar
 * and a big welcome banner about invasive species. The map app sits below, in "Explore".
 *
 * Every number and species name here comes from the loaded data (the species and park
 * lists), never typed in by hand, so it stays true when the data is refreshed. While the
 * lists load, the banner simply leaves the numbers out.
 *
 * The banner background slowly fades between a few real iNaturalist photos of listed species
 * (HERO_PHOTOS below), all openly licensed (CC BY or CC0) and saved in public/images/ so the
 * offline demo shows them. The credit in the corner always matches the photo on screen.
 * People who turned on "reduce motion" just see the first photo.
 */

import { useEffect, useState } from "react";

import { REPORT_URL } from "@/lib/meanings";

// Credits copied from backend/data/cache/media.json. To add a photo: pick an openly licensed
// one there, save its large version in public/images/, and copy its credit here.
const HERO_PHOTOS = [
  {
    file: "/images/hero-common-reed.jpg",
    species: "Common reed (Phragmites australis)",
    attribution: "(c) Steven Bodzin, some rights reserved (CC BY)",
    observation_url: "https://www.inaturalist.org/observations/62352603",
  },
  {
    file: "/images/hero-knotweed.jpg",
    species: "Bohemian knotweed (Reynoutria × bohemica)",
    attribution: "no rights reserved (CC0)",
    observation_url: "https://www.inaturalist.org/observations/61601606",
  },
  {
    file: "/images/hero-multiflora-rose.jpg",
    species: "Multiflora rose (Rosa multiflora)",
    attribution: "(c) Steven Bodzin, some rights reserved (CC BY)",
    observation_url: "https://www.inaturalist.org/observations/74756891",
  },
  {
    file: "/images/hero-lesser-celandine.jpg",
    species: "Lesser celandine (Ficaria verna)",
    attribution: "(c) Steven Bodzin, some rights reserved (CC BY)",
    observation_url: "https://www.inaturalist.org/observations/74756892",
  },
];
const SECONDS_PER_PHOTO = 8;

/** "mugwort, lesser celandine, garlic mustard and 80 more" from the most-sighted species. */
function topSpeciesText(species) {
  const names = species.slice(0, 3).map((s) => (s.common_name || s.scientific_name).toLowerCase());
  const more = species.length - names.length;
  return `${names.join(", ")}${more > 0 ? ` and ${more} more` : ""}`;
}

export default function Hero({ species, parks, updatedAt }) {
  const loaded = species.length > 0;
  const sightings = species.reduce((sum, s) => sum + s.sightings, 0);

  // Which background photo is showing. Moves on every few seconds, unless the person asked
  // their device for less motion.
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setCurrent((i) => (i + 1) % HERO_PHOTOS.length), SECONDS_PER_PHOTO * 1000);
    return () => clearInterval(timer);
  }, []);
  const photo = HERO_PHOTOS[current];

  return (
    <>
      <nav className="site-nav" aria-label="Site">
        <a className="logo" href="#about"><span aria-hidden="true">♧</span> Invasive Species Lookout</a>
        {/* Just the map: Report and Quiz already have buttons in the banner and the map toolbar. */}
        <div className="site-nav-links">
          <a href="#explore">Map</a>
        </div>
      </nav>

      <section className="hero" id="about">
        {/* Background photos, stacked; the current one fades in. Decorative, so hidden from screen readers. */}
        {HERO_PHOTOS.map((p, i) => (
          <div key={p.file} className={i === current ? "hero-slide active" : "hero-slide"}
               style={{ backgroundImage: `url(${p.file})` }} aria-hidden="true" />
        ))}
        <div className="hero-fade" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">ALL FIVE BOROUGHS OF NEW YORK CITY · BUILT AT QUEENS COLLEGE</p>
          <h1>There are more invasive species in NYC than you think.</h1>
          <p className="hero-description">
            {loaded
              ? `Plants and animals on New York's official invasive species list have been spotted across all five boroughs, including ${topSpeciesText(species)}. See where, learn to tell them apart, and report what you find.`
              : "Plants and animals on New York's official invasive species list have been spotted across all five boroughs. See where, learn to tell them apart, and report what you find."}
          </p>
          <div className="hero-buttons">
            <a className="hero-button" href="#explore">Explore the map ↓</a>
            <a className="hero-button secondary" href={REPORT_URL} target="_blank" rel="noreferrer">Report a sighting ↗</a>
          </div>
          {loaded && (
            <>
              <dl className="hero-stats">
                <div><dt>Sightings</dt><dd>{sightings.toLocaleString()}</dd></div>
                <div><dt>Listed species</dt><dd>{species.length}</dd></div>
                <div><dt>Parks with sightings</dt><dd>{parks.length}</dd></div>
              </dl>
              {/* When the sightings were last fetched, so the numbers above don't look timeless. */}
              {updatedAt && (
                <p className="hero-date">
                  iNaturalist sightings through {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </>
          )}
        </div>
        <a className="hero-credit" href={photo.observation_url} target="_blank" rel="noreferrer">
          Photo: {photo.species}, {photo.attribution}, on iNaturalist
        </a>
      </section>
    </>
  );
}
