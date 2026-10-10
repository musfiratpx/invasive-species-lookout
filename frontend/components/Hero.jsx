/**
 * Top of the page (layout from Moses's SAIL field-guide mockup, moses-panel branch): a nav bar
 * and a big welcome banner about invasive species. The map app sits below, in "Explore".
 *
 * Every number and species name here comes from the loaded data (the species and park
 * lists), never typed in by hand, so it stays true when the data is refreshed. While the
 * lists load, the banner simply leaves the numbers out.
 *
 * The banner photo (public/images/hero.jpg, set as --hero-photo in globals.css) is a real
 * iNaturalist photo of common reed (Phragmites) with an open CC BY license, saved into the app
 * so the offline demo shows it. Its credit sits in the banner's corner (HERO_PHOTO below).
 */

import { REPORT_URL } from "@/lib/meanings";

// The banner photo's credit, copied from backend/data/cache/media.json (photo 99887280).
const HERO_PHOTO = {
  species: "Common reed (Phragmites australis)",
  attribution: "(c) Steven Bodzin, some rights reserved (CC BY)",
  observation_url: "https://www.inaturalist.org/observations/62352603",
};

/** "mugwort, lesser celandine, garlic mustard and 80 more" from the most-sighted species. */
function topSpeciesText(species) {
  const names = species.slice(0, 3).map((s) => (s.common_name || s.scientific_name).toLowerCase());
  const more = species.length - names.length;
  return `${names.join(", ")}${more > 0 ? ` and ${more} more` : ""}`;
}

/**
 * A nav link that opens part of the map app without reloading the page.
 * It's still a real link (href), so "open in new tab" and screen readers work as usual.
 */
function AppLink({ href, onOpen, children }) {
  return (
    <a href={href} onClick={(e) => { e.preventDefault(); onOpen(); }}>{children}</a>
  );
}

export default function Hero({ species, parks, updatedAt, onOpenQuiz, onOpenParks }) {
  const loaded = species.length > 0;
  const sightings = species.reduce((sum, s) => sum + s.sightings, 0);

  return (
    <>
      <nav className="site-nav" aria-label="Site">
        <a className="logo" href="#about"><span aria-hidden="true">🌿</span> Invasive Species Lookout</a>
        <div className="site-nav-links">
          <a href="#explore">Map</a>
          <AppLink href="?quiz=1" onOpen={onOpenQuiz}>Quiz</AppLink>
          {/* Each park's profile has a "Printable field guide" link, so this opens the parks list. */}
          <AppLink href="?browse=parks" onOpen={onOpenParks}>Field guides</AppLink>
          <a href={REPORT_URL} target="_blank" rel="noreferrer">Report ↗</a>
        </div>
      </nav>

      <section className="hero" id="about">
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
        <a className="hero-credit" href={HERO_PHOTO.observation_url} target="_blank" rel="noreferrer">
          Photo: {HERO_PHOTO.species}, {HERO_PHOTO.attribution}, on iNaturalist
        </a>
      </section>
    </>
  );
}
