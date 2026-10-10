/**
 * Top of the page, from Moses's SAIL field-guide mockup (moses-panel branch): a nav bar
 * and a big welcome banner. The map app sits below it, in the "Explore" section.
 *
 * The banner photo is blank on purpose: the team will add one later. To add it, set
 * --hero-photo in globals.css (see the comment there). Text is the mockup's for now.
 */

export default function Hero() {
  return (
    <>
      <nav className="site-nav" aria-label="Site">
        <a className="logo" href="#about">♧ Kissena Invasive Watch</a>
        <div className="site-nav-links">
          <a href="#explore">Explore the map</a>
          <a href="#about">Our approach</a>
        </div>
      </nav>

      <section className="hero" id="about">
        <div className="hero-content">
          <p className="eyebrow">A LIVING FIELD GUIDE · QUEENS COLLEGE, NEW YORK</p>
          <h1>
            The wild is closer
            <br />
            than you think.
          </h1>
          <p className="hero-description">
            Discover the environment around you: the species, sounds and seasonal stories of a remarkable
            living landscape.
          </p>
          <a className="hero-button" href="#explore">Meet the species ↗</a>
        </div>
      </section>
    </>
  );
}
