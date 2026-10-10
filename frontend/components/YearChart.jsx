/**
 * A small bar chart of sightings per year (the last 10 years), drawn with plain SVG.
 * These are iNaturalist reports, not a survey, so the caption under it always says so:
 * a tall bar can mean more people were out posting, not more of the species.
 *
 * byYear: [{ year: 2017, count: 12 }, ...] from the species API (oldest first). The newest year
 * is only part of a year, so its bar is lighter and the caption says so.
 */

const WIDTH = 300;
const HEIGHT = 100;
const BOTTOM = 14; // room for year labels
const BAR_GAP = 4;

export default function YearChart({ byYear, speciesName }) {
  if (!byYear || byYear.length === 0) return null;
  const max = Math.max(...byYear.map((r) => r.count), 1);
  const barWidth = WIDTH / byYear.length - BAR_GAP;
  const newest = byYear[byYear.length - 1].year;
  return (
    <div className="season-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img"
           aria-label={`Sightings of ${speciesName} per year: ${byYear.map((r) => `${r.year} ${r.count.toLocaleString()}`).join(", ")}`}>
        {byYear.map((r, i) => {
          const h = ((HEIGHT - BOTTOM) * r.count) / max;
          const x = i * (barWidth + BAR_GAP) + BAR_GAP / 2;
          return (
            <g key={r.year}>
              <rect className={r.year === newest ? "bar partial" : "bar"} x={x} y={HEIGHT - BOTTOM - h} width={barWidth} height={h}>
                <title>{`${r.year}: ${r.count.toLocaleString()}${r.year === newest ? " (so far)" : ""}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={HEIGHT - 3} textAnchor="middle">’{String(r.year).slice(2)}</text>
            </g>
          );
        })}
      </svg>
      <p className="muted">
        These count iNaturalist reports, not a field survey: a tall bar can mean more people were out posting (for
        example during a big community event), not more of the species. {newest} is only part of a year (lighter bar).
      </p>
    </div>
  );
}
