"use client";
/**
 * Danger level: a 4-step meter, the label, where it came from, and a
 * "How we score" panel. It only ever shows what the API sent. Nothing is
 * computed or guessed here. (Full explanation: docs/SCORING.md)
 */

import { useState } from "react";

import { DANGER_COLORS } from "@/lib/labels";
import { PART_575_QA_URL, dangerMeaning, legalMeaning } from "@/lib/meanings";

export default function DangerBadge({ danger, nyStatus }) {
  const [showHow, setShowHow] = useState(false);
  const color = DANGER_COLORS[danger.level ?? null];

  return (
    <div>
      <div className="meter" role="img" aria-label={`Danger level: ${danger.label}`}>
        {[1, 2, 3, 4].map((step) => (
          <span key={step} style={danger.level >= step ? { background: color, borderColor: color } : undefined} />
        ))}
      </div>
      <strong>{danger.label}</strong>

      {/* Plain-language meaning, built only from the official definitions (lib/meanings.js) */}
      <p className="meaning">{dangerMeaning(danger)}</p>
      {legalMeaning(nyStatus) && (
        <p className="meaning">
          {legalMeaning(nyStatus)}{" "}
          <a href={PART_575_QA_URL} target="_blank" rel="noreferrer">NYS DEC</a>
        </p>
      )}

      {danger.health_warning && <p className="warning">⚠ {danger.health_warning}</p>}

      <p>
        {danger.source_url && (
          <>
            <a href={danger.source_url} target="_blank" rel="noreferrer">Source</a> ·{" "}
          </>
        )}
        <button onClick={() => setShowHow((s) => !s)} aria-expanded={showHow}>How we score</button>
      </p>

      {showHow && <HowWeScore />}
    </div>
  );
}

function HowWeScore() {
  return (
    <div className="popover">
      <table>
        <thead>
          <tr><th>Level</th><th>Plants (NY rank)</th><th>Animals and others</th></tr>
        </thead>
        <tbody>
          <tr><td>Very High</td><td>Very High (&gt;80)</td><td>—</td></tr>
          <tr><td>High</td><td>High (70–80)</td><td>Prohibited</td></tr>
          <tr><td>Moderate</td><td>Moderate (50–70)</td><td>Regulated</td></tr>
          <tr><td>Low</td><td>Low or Insignificant (&lt;50)</td><td>—</td></tr>
        </tbody>
      </table>
      <p>
        Plant ranks come from the official New York Non-Native Plant Invasiveness Ranking Forms. Other species use
        their category on the NYS DEC Part 575 list. No AI is used. If there is no official rank, we show
        &quot;Not yet ranked&quot;.
      </p>
    </div>
  );
}
