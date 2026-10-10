/**
 * Friendly dates for people, from the API's "2026-10-04" style dates.
 * The date is read as a local date (not UTC midnight), so it never shows a day early.
 */

const asLocalDate = (isoDate) => new Date(`${isoDate}T00:00:00`);

// Made once and reused. toLocaleDateString() builds a new formatter on every call, which
// is slow enough to freeze the page when it runs for tens of thousands of map markers.
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/** "Oct 4, 2026" */
export function formatDay(isoDate) {
  return DAY.format(asLocalDate(isoDate));
}

/** "Jul 2005" */
export function formatMonth(isoDate) {
  return MONTH.format(asLocalDate(isoDate));
}

/** Today's date N months ago, in the API's "2026-10-04" style, so it compares directly with sighting dates. */
export function isoDateMonthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
