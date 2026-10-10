/**
 * "Report a sighting" link to New York's official invasive species database
 * (NY iMapInvasives). Shown inside the "Report it, don't pull it" box (ReportDontPull.jsx).
 */

import { REPORT_URL } from "@/lib/meanings";

export default function ReportButton() {
  return (
    <p className="report">
      <a className="report-button" href={REPORT_URL} target="_blank" rel="noreferrer">
        Report a sighting
      </a>
      {/* No 📣 here: the box title above already has one. */}
      <span className="muted report-where">On NY iMapInvasives. Free, no account needed.</span>
    </p>
  );
}
