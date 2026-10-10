/**
 * "Report a sighting" link to New York's official invasive species database
 * (NY iMapInvasives). Shown in the species panel and the park profile.
 */

import { REPORT_URL } from "@/lib/meanings";

export default function ReportButton() {
  return (
    <p className="report">
      <a className="report-button" href={REPORT_URL} target="_blank" rel="noreferrer">
        📣 Report a sighting
      </a>
      <span className="muted"> on NY iMapInvasives (free; no account needed)</span>
    </p>
  );
}
