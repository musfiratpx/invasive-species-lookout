/**
 * A one-line photo credit for small photos (Browse thumbnails, the park photo grid):
 * "📷 pak2024 · CC BY-NC", linking to the iNaturalist observation the photo is from.
 * Every photo we show must credit its photographer and license (CLAUDE.md rule 9).
 */

import { photographerOf } from "@/lib/credits";

/** "cc-by-nc" -> "CC BY-NC", "cc0" -> "CC0". */
export function licenseLabel(license) {
  return license === "cc0" ? "CC0" : license.toUpperCase().replace("CC-", "CC ");
}

export default function PhotoCredit({ photo }) {
  const who = photographerOf(photo.attribution) || "Unnamed photographer";
  return (
    <a className="photo-credit" href={photo.observation_url} target="_blank" rel="noreferrer" title={photo.attribution}>
      📷 {who} · {licenseLabel(photo.license)}
    </a>
  );
}
