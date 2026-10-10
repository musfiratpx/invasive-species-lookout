"use client";
/**
 * "Report it, don't pull it": the one place the app explains reporting and the park rule.
 * Short on purpose, because it's on every species: a lead sentence quoted word for word
 * from our sources, the "Report a sighting" button, this species' own reporting advice (if any),
 * ways to help as a volunteer, and the full reporting text and park rule (56 RCNY §1-04)
 * folded away underneath. (The button used to sit separately above this box; one box is shorter.)
 *
 * The general text comes from GET /api/how-to-report (knowledge/how-to-report.md), the same
 * for every species and park, so it's loaded once and shared.
 *
 * kind: "plant", "animal" or "any" (the park profile), only for the title's wording.
 * note: this species' own reporting note (e.g. collared mute swans), or null.
 */

import { useEffect, useState } from "react";

import InsightSection from "@/components/InsightSection";
import ReportButton from "@/components/ReportButton";
import { getHowToReport } from "@/lib/api";
import { STEWARDSHIP_URL, VOLUNTEER_EVENTS_URL } from "@/lib/meanings";

let generalReport = null; // one request for the whole page, however many panels open

function loadGeneralReport() {
  generalReport ||= getHowToReport().catch(() => {
    generalReport = null; // try again next time
    return { text: null, sources: [] };
  });
  return generalReport;
}

/**
 * The first sentence of the park-rule paragraph, word for word
 * ("In New York City parks, report what you find instead of removing it yourself.").
 */
function leadSentence(details) {
  const paragraph = (details || "").split(/\n\s*\n/).find((p) => p.startsWith("In New York City parks"));
  return paragraph ? paragraph.slice(0, paragraph.indexOf(".") + 1) : null;
}

export default function ReportDontPull({ kind = "any", note }) {
  const [general, setGeneral] = useState({ text: null, sources: [] });
  useEffect(() => {
    let cancelled = false;
    loadGeneralReport().then((g) => !cancelled && setGeneral(g));
    return () => { cancelled = true; };
  }, []);
  const details = general.text;
  const lead = leadSentence(details);
  return (
    <div className="act-box">
      <p className="act-title">📣 Report it, don&apos;t {kind === "plant" ? "pull" : "remove"} it</p>
      {lead && <p>{lead}</p>}
      <ReportButton />
      {note && <p className="act-note">{note}</p>}
      <ul>
        <li>
          <a href={STEWARDSHIP_URL} target="_blank" rel="noreferrer">Join an NYC Parks stewardship project</a>: volunteers
          help restore natural areas, plant and care for trees, and monitor wildlife.
        </li>
        <li>
          <a href={VOLUNTEER_EVENTS_URL} target="_blank" rel="noreferrer">Find NYC Parks volunteer events</a>. Some remove
          invasive plants, led by Parks staff or partner groups.
        </li>
      </ul>
      {details && (
        <details className="act-more">
          <summary>How reporting works, and the park rule</summary>
          <InsightSection text={details} />
          <p className="muted">
            Sources:{" "}
            {general.sources.map((source, i) => (
              <span key={source.url}>
                {i > 0 && "; "}
                <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              </span>
            ))}
          </p>
        </details>
      )}
    </div>
  );
}
