/**
 * Tidy common names for display. iNaturalist's names come in mixed styles ("Mute Swan",
 * "Water caltrop", "common mugwort"), which looks unfinished side by side, so we show them
 * all in sentence case: "Mute swan", "Water caltrop", "Common mugwort".
 * Words for places, peoples and people's names stay capitalized ("Japanese barberry",
 * "European green crab"). The data itself is never changed, only how it's shown.
 */

// Lowercase, without a trailing "'s". Add to this list if a new name loses a capital it needs.
const PROPER_WORDS = new Set([
  "african", "american", "amur", "asian", "asiatic", "atlantic", "australian", "bell", "brazilian",
  "british", "canada", "carolina", "chilean", "chinese", "dutch", "english", "eurasian", "european",
  "florida", "fortune", "french", "german", "himalayan", "indian", "italian", "japanese", "korean",
  "mexican", "morrow", "nile", "norway", "oriental", "pacific", "persian", "russian", "siberian",
  "siebold", "spanish", "tatarian", "turkish",
]);

function tidyWord(word) {
  if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word; // an acronym
  const lower = word.toLowerCase();
  if (PROPER_WORDS.has(lower.replace(/['’]s$/, ""))) return lower.charAt(0).toUpperCase() + lower.slice(1);
  return lower;
}

/** "Asian Shore Crab" -> "Asian shore crab"; "common mugwort" -> "Common mugwort". */
export function sentenceCase(name) {
  if (!name) return name;
  const tidy = name.split(" ").map(tidyWord).join(" ");
  return tidy.charAt(0).toUpperCase() + tidy.slice(1);
}

/** Sentence-case every "common_name" in an API response, however deeply nested. Changes it in place. */
export function tidyCommonNames(value) {
  if (Array.isArray(value)) {
    value.forEach(tidyCommonNames);
  } else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key === "common_name" && typeof value[key] === "string") value[key] = sentenceCase(value[key]);
      else tidyCommonNames(value[key]);
    }
  }
  return value;
}
