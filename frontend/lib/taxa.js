/**
 * Which emoji/label each iNaturalist "iconic taxon" group gets, and which filter
 * group it belongs to. Emoji are placeholders until the Designer makes real icons.
 * (Kept separate from SpeciesIcon.js because that file loads Leaflet, which
 * only works in the browser, while the legend also renders on the server.)
 */

export const TAXON_ICONS = {
  Plantae: { emoji: "🌿", label: "Plant" },
  Insecta: { emoji: "🐛", label: "Insect" },
  Aves: { emoji: "🐦", label: "Bird" },
  Reptilia: { emoji: "🐢", label: "Reptile" },
  Mammalia: { emoji: "🐾", label: "Mammal" },
  Actinopterygii: { emoji: "🐟", label: "Fish" },
  Mollusca: { emoji: "🐚", label: "Mollusk" },
  Fungi: { emoji: "🍄", label: "Fungus" },
  Amphibia: { emoji: "🐸", label: "Amphibian" },
  Arachnida: { emoji: "🕷️", label: "Spider" },
  Animalia: { emoji: "🦀", label: "Other animal" }, // e.g. crabs, worms
};
const DEFAULT_ICON = { emoji: "📍", label: "Other" };

export function taxonIcon(iconicTaxon) {
  return TAXON_ICONS[iconicTaxon] || DEFAULT_ICON;
}

/** The type filters shown in the legend. Each covers one or more iconic taxa. */
export const TYPE_FILTERS = [
  { id: "plants", label: "Plants", emoji: "🌿", taxa: ["Plantae"] },
  { id: "birds", label: "Birds", emoji: "🐦", taxa: ["Aves"] },
  { id: "insects", label: "Insects", emoji: "🐛", taxa: ["Insecta", "Arachnida"] },
  { id: "water", label: "Fish & shellfish", emoji: "🐟", taxa: ["Actinopterygii", "Mollusca"] },
  { id: "other", label: "Other animals", emoji: "🦀", taxa: null }, // everything not listed above
];

/** Which type filter a sighting belongs to. */
export function typeFilterOf(iconicTaxon) {
  const match = TYPE_FILTERS.find((f) => f.taxa && f.taxa.includes(iconicTaxon));
  return match ? match.id : "other";
}
