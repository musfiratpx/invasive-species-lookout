/**
 * What's open is kept in the address bar, so the browser's Back button closes panels
 * one step at a time, and a link (or QR code) opens the app on the same thing:
 *   ?park=Q024                Kissena Park, outlined, with its profile open
 *   ?species=6921             Mute Swan: only its sightings on the map, with its panel open
 *   ?park=Q024&species=6921   a species opened from inside a park's profile
 *   &browse=species / parks   the Browse list is open (underneath, if something else is too)
 *   ?quiz=1                   the photo quiz is open (the link in a shared quiz score)
 * Used by app/page.js. If you add a kind of link, change both functions.
 */

/** Read the address bar into the page's state. */
export function stateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const park = params.get("park");
  const species = params.get("species");
  const browse = params.get("browse");
  return {
    focus: park ? { kind: "park", id: park } : species ? { kind: "species", id: species } : null,
    selectedSpeciesId: species,
    parkPanelOpen: Boolean(park && !species), // a species opened from a park sits on top of the profile
    browseTab: ["species", "parks", "new"].includes(browse) ? browse : null,
    quiz: params.has("quiz") ? "open" : "closed",
  };
}

/** The address-bar query for the current state ("?..." or just the page's path when nothing is open). */
export function urlFromState({ focus, selectedSpeciesId, browseTab, quiz }) {
  const params = new URLSearchParams();
  if (focus?.kind === "park") params.set("park", focus.id);
  const species = selectedSpeciesId || (focus?.kind === "species" ? focus.id : null);
  if (species) params.set("species", species);
  if (browseTab) params.set("browse", browseTab);
  if (quiz !== "closed") params.set("quiz", "1");
  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
}
