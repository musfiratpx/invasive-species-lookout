/**
 * Which emoji/label each iNaturalist "iconic taxon" group gets.
 * Emoji are placeholders until the Designer makes real icons.
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
  Animalia: { emoji: "🦀", label: "Other animal" }, // e.g. crabs
};
const DEFAULT_ICON = { emoji: "📍", label: "Other" };

export function taxonIcon(iconicTaxon) {
  return TAXON_ICONS[iconicTaxon] || DEFAULT_ICON;
}
