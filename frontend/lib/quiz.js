/**
 * Questions for the "Spot the species" photo quiz.
 * One question = one openly licensed photo + three species to choose from.
 * Wrong answers are picked to look alike where we can: a species from the same genus
 * first (e.g. another honeysuckle), then the same group (plant, bird, fish...),
 * so the quiz teaches real identification instead of "mugwort or swan?".
 */

export const ROUND_LENGTH = 10;

/** A random item from a list. */
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

/** A shuffled copy of a list (Fisher–Yates). */
function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const genusOf = (species) => species.scientific_name.split(" ")[0];
const isPlant = (species) => species.iconic_taxon === "Plantae";

/**
 * A new question. allSpecies comes from /api/quiz; askedIds are the species already asked
 * this round, so a round doesn't repeat one. Every species is equally likely, however
 * many photos it has, so rare species come up too.
 */
export function makeQuestion(allSpecies, askedIds) {
  const fresh = allSpecies.filter((s) => !askedIds.has(s.species_id));
  const answer = pickOne(fresh.length ? fresh : allSpecies);
  const others = allSpecies.filter((s) => s.species_id !== answer.species_id);

  // Most alike first. At most one from the same genus, so the question stays fair.
  const candidates = [
    ...shuffled(others.filter((s) => genusOf(s) === genusOf(answer))).slice(0, 1),
    ...shuffled(others.filter((s) => s.iconic_taxon === answer.iconic_taxon)),
    ...shuffled(others.filter((s) => isPlant(s) === isPlant(answer))),
    ...shuffled(others),
  ];
  const wrong = [];
  for (const s of candidates) {
    // Skip duplicates, and species whose name would read the same as one already shown.
    const shown = [answer, ...wrong];
    if (wrong.length < 2 && !shown.some((x) => x.species_id === s.species_id || sameName(x, s))) wrong.push(s);
  }

  return { answer, photo: pickOne(answer.photos), choices: shuffled([answer, ...wrong]) };
}

/** True when two species would show the same common name. */
function sameName(a, b) {
  return (a.common_name || "").toLowerCase() === (b.common_name || "").toLowerCase();
}
