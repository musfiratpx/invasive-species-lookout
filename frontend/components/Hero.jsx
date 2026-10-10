/**
 * Top of the page (layout from Moses's SAIL field-guide mockup, moses-panel branch): a nav bar
 * and a big welcome banner about invasive species. The map app sits below, in "Explore".
 *
 * Every number and species name here comes from the loaded data (the species and park
 * lists), never typed in by hand, so it stays true when the data is refreshed. While the
 * lists load, the banner simply leaves the numbers out.
 *
 * The banner photo is blank on purpose: the team will add one later (set --hero-photo in
 * globals.css).
 */

import { REPORT_URL } from "@/lib/meanings";

/** "mugwort, lesser celandine, garlic mustard and 80 more" from the most-sighted species. */
function topSpeciesText(species) {
  const names = species.slice(0, 3).map((s) => (s.common_name || s.scientific_name).toLowerCase());
  const more = species.length - names.length;
  return `${names.join(", ")}${more > 0 ? ` and ${more} more` : ""}`;
}

export default function Hero({ species, parks }) {
  const loaded = species.length > 0;
  const sightings = species.reduce((sum, s) => sum + s.sightings, 0);

  return (
    <>
      <nav className="site-nav" aria-label="Site">
        <a className="logo" href="#about">♧ Invasive Species Lookout</a>
        <div className="site-nav-links">
          <a href="#explore">Explore the map</a>
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
            <a className="hero-button" href="#explore">Explore the map ↗</a>
            <a className="hero-button secondary" href={REPORT_URL} target="_blank" rel="noreferrer">Report a sighting</a>
          </div>
          {loaded && (
            <dl className="hero-stats">
              <div><dt>Sightings</dt><dd>{sightings.toLocaleString()}</dd></div>
              <div><dt>Listed species</dt><dd>{species.length}</dd></div>
              <div><dt>Parks with sightings</dt><dd>{parks.length}</dd></div>
            </dl>
          )}
        </div>
      </section>
    </>
  );
}
