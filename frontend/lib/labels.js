/**
 * Display text and colors shared by several components.
 * Danger colors point at the CSS variables in app/globals.css (change them there).
 */

export const DANGER_COLORS = {
  4: "var(--danger-4)",
  3: "var(--danger-3)",
  2: "var(--danger-2)",
  1: "var(--danger-1)",
  null: "var(--danger-none)",
};

export const DANGER_LABELS = {
  4: "Very High",
  3: "High",
  2: "Moderate",
  1: "Low",
  null: "Not yet ranked",
};

export const STATUS_LABELS = {
  common_here: "Common here",
  spreading: "Spreading",
  new_arrival: "New arrival",
};

export const NY_STATUS_LABELS = {
  prohibited: "Prohibited in New York",
  regulated: "Regulated in New York",
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
