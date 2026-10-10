/**
 * "How it works": a short section under the map that explains, in plain words, the rules
 * the app follows (see CLAUDE.md): what counts as invasive, where sightings and danger
 * levels come from, and why we say "report it, don't pull it". The nav's "How it works"
 * link jumps here. Keep every sentence true to what the app actually does.
 */

import { PART_575_QA_URL, REPORT_URL } from "@/lib/meanings";

export default function HowItWorks() {
  return (
    <section className="approach" id="approach">
      <div className="section-heading">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2>Honest data, official sources.</h2>
      </div>
      <div className="approach-grid">
        <article className="approach-card">
          <p className="eyebrow">01 · THE LIST</p>
          <h3>Only official invasives</h3>
          <p>
            A species counts as invasive here only if it is on New York State&apos;s official list of prohibited and
            regulated invasive species (<a href={PART_575_QA_URL} target="_blank" rel="noreferrer">NYS DEC, 6 NYCRR Part 575</a>).
            Being non-native isn&apos;t enough.
          </p>
        </article>
        <article className="approach-card">
          <p className="eyebrow">02 · THE SIGHTINGS</p>
          <h3>Real observations</h3>
          <p>
            Every point is a research-grade iNaturalist sighting, credited to the person who posted it. Sightings show
            where people looked and posted, not everywhere a species grows.
          </p>
        </article>
        <article className="approach-card">
          <p className="eyebrow">03 · THE RISK</p>
          <h3>Danger from official rankings</h3>
          <p>
            Danger levels come from New York&apos;s invasiveness rankings for plants and from the state list&apos;s
            category for animals, never from AI. A species without a ranking says &ldquo;Not yet ranked&rdquo;. Fact
            sheets are drafted with AI help from official sources, and each one lists its sources.
          </p>
        </article>
        <article className="approach-card">
          <p className="eyebrow">04 · WHAT TO DO</p>
          <h3>Report it, don&apos;t pull it</h3>
          <p>
            In New York City parks, report what you find instead of removing it yourself. Sightings go to NY
            iMapInvasives, the state&apos;s official invasive species database.
          </p>
          <a className="hero-button" href={REPORT_URL} target="_blank" rel="noreferrer">Report a sighting ↗</a>
        </article>
      </div>
    </section>
  );
}
