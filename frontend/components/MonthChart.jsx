/**
 * A small 12-month bar chart (January to December), drawn with plain SVG.
 * Shared by the species season chart and the park profile.
 * format turns a value into text for hover and screen readers (default: "1,234").
 */

import { MONTHS } from "@/lib/labels";

const WIDTH = 300;
const BOTTOM = 14; // room for month labels
const BAR_GAP = 4;

export default function MonthChart({ counts, label, height = 110, format = (n) => n.toLocaleString() }) {
  const max = Math.max(...counts, 1);
  const barWidth = WIDTH / 12 - BAR_GAP;
  return (
    <div className="season-chart">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img"
           aria-label={`${label}: ${MONTHS.map((m, i) => `${m} ${format(counts[i])}`).join(", ")}`}>
        {counts.map((count, i) => {
          const h = ((height - BOTTOM) * count) / max;
          const x = i * (barWidth + BAR_GAP) + BAR_GAP / 2;
          return (
            <g key={MONTHS[i]}>
              <rect className="bar" x={x} y={height - BOTTOM - h} width={barWidth} height={h}>
                <title>{`${MONTHS[i]}: ${format(count)}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={height - 3} textAnchor="middle">{MONTHS[i][0]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
