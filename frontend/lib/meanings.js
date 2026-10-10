/**
 * Plain-language explanations of danger levels and legal status.
 *
 * Every sentence here is built ONLY from what our official sources define, so it
 * stays true to the ground rules (no invented claims):
 *   - Plant ranks: the New York Non-Native Plant Invasiveness Ranking Form scores
 *     four things (ecological impact; biological characteristics and dispersal;
 *     ecological amplitude and distribution; difficulty of control) and sets the
 *     score ranges for each rank.
 *   - Legal status: NYS DEC's Part 575 Q&A defines "prohibited" and "regulated".
 * If you change the wording, keep it faithful to those definitions.
 */

export const PART_575_QA_URL = "https://dec.ny.gov/docs/lands_forests_pdf/islist.pdf";
export const REPORT_URL = "https://www.nyimapinvasives.org/report";

// NYC Parks volunteer pages for the "Report it, don't pull it" box (checked 2026-10-10).
// "Stewardship Registration": upcoming stewardship projects, filterable by borough.
export const STEWARDSHIP_URL = "https://www.nycgovparks.org/reg/stewardship";
// NYC Parks volunteer events calendar (some events remove invasive plants, led by Parks or partner groups).
export const VOLUNTEER_EVENTS_URL = "https://www.nycgovparks.org/events/volunteer";

// Score ranges printed on every New York ranking form.
const RANK_RANGES = {
  "Very High": "a score above 80",
  High: "a score of 70 to 80",
  Moderate: "a score of 50 to 69.99",
  Low: "a score of 40 to 49.99",
  Insignificant: "a score below 40",
};

/** One sentence explaining what the danger level means for this species. */
export function dangerMeaning(danger) {
  if (danger.basis === "ny_plant_rank" && danger.ny_rank) {
    const score = danger.score != null ? `${Math.round(danger.score)} out of 100` : "on a 100-point scale";
    return (
      `New York experts scored this plant ${score} for harm to natural areas, how well it spreads, ` +
      `how widespread it is, and how hard it is to control. ${danger.ny_rank} = ${RANK_RANGES[danger.ny_rank] || "see the form"}.`
    );
  }
  if (danger.basis === "ny_part575_status") {
    return "Its level comes from its legal status in New York (below).";
  }
  return "No official New York rank found yet, so we don't guess.";
}

/** One sentence explaining the species' legal status in New York (NYS DEC Part 575). */
export function legalMeaning(nyStatus) {
  if (nyStatus === "prohibited") {
    return "Prohibited in New York: it is illegal to sell, buy, import, transport, release, grow or breed it.";
  }
  if (nyStatus === "regulated") {
    return "Regulated in New York: it may be owned and sold, but it is illegal to release it into the wild.";
  }
  return null;
}
