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
  { id: "other", label: "Other animals", emoji: "🐾", taxa: null }, // everything not listed above
];

/** Which type filter a sighting belongs to. */
export function typeFilterOf(iconicTaxon) {
  const match = TYPE_FILTERS.find((f) => f.taxa && f.taxa.includes(iconicTaxon));
  return match ? match.id : "other";
}

/**
 * Words people might type to find a whole group, e.g. "bird" or "plants", for the search box.
 * Keyed by iNaturalist iconic taxon. Only words that fit every species in the group: "tree"
 * isn't here, since most of our plants aren't trees. ("crab", "snail" and so on already match
 * the species' own names.)
 */
const GROUP_WORDS = {
  Plantae: ["plant", "plants"],
  Aves: ["bird", "birds"],
  Insecta: ["insect", "insects", "bug", "bugs"],
  Arachnida: ["spider", "spiders", "arachnid", "arachnids"],
  Actinopterygii: ["fish", "fishes"],
  Mollusca: ["mollusk", "mollusks", "mollusc", "molluscs", "shellfish"],
  Mammalia: ["mammal", "mammals"],
  Reptilia: ["reptile", "reptiles"],
  Amphibia: ["amphibian", "amphibians"],
  Fungi: ["fungus", "fungi"],
};
const ANIMAL_WORDS = ["animal", "animals"]; // every group except plants and fungi

/**
 * True if the search text names this species' group, e.g. "bird" for a swan. Partial words
 * count from 3 letters ("bir" finds birds as you type). query is already lowercase.
 */
export function matchesGroupWord(iconicTaxon, query) {
  if (query.length < 3) return false;
  const words = [...(GROUP_WORDS[iconicTaxon] || [])];
  if (iconicTaxon !== "Plantae" && iconicTaxon !== "Fungi") words.push(...ANIMAL_WORDS);
  return words.some((word) => word.startsWith(query));
}
