import type { MonthPoint } from "@/lib/metrics";
import { formatUSD } from "@/lib/format";
import { CHART, STATUS, axisMoney, niceScale } from "./tokens";
import { ChartFrame } from "./ChartFrame";

const W = 900;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 26, left: 48 };

/**
 * Money charged to people after they left, month by month. This series *means*
 * bad, so it wears the reserved status colour — with an icon and label beside
 * it, never colour alone. One series, so no legend box: the title names it.
 */
export function OrphanedArea({ series }: { series: MonthPoint[] }) {
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const scale = niceScale(Math.max(...series.map((p) => p.orphanedCents), 1));
  const x = (i: number) => PAD.left + (i / Math.max(series.length - 1, 1)) * plotW;
  const y = (cents: number) => PAD.top + plotH - (cents / scale.max) * plotH;

  const pts = series.map((p, i) => ({ x: x(i), y: y(p.orphanedCents), p }));
  const line = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${y(0)} L${pts[0].x.toFixed(1)},${y(0)} Z`;

  const peak = pts.reduce((a, b) => (b.p.orphanedCents > a.p.orphanedCents ? b : a), pts[0]);
  const last = pts[pts.length - 1];
  const total = series.reduce((t, p) => t + p.orphanedCents, 0);

  return (
    <ChartFrame
      title="Money spent on people who had already left"
      subtitle={`${formatUSD(total)} over this window. Every dollar here was avoidable.`}
      table={{
        columns: ["Month", "Orphaned spend"],
        rows: series.map((p) => [`${p.label} ${p.year}`, formatUSD(p.orphanedCents)]),
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Orphaned spend per month">
        {scale.values.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? CHART.axis : CHART.gridline}
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={CHART.inkMuted}>
              {axisMoney(v)}
            </text>
          </g>
        ))}

        {/* Area fill is a ~10% wash, never a saturated block. */}
        <path d={area} fill={STATUS.critical} fillOpacity="0.12" />
        <path d={line} fill="none" stroke={STATUS.critical} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {peak.p.orphanedCents > 0 && (
          <>
            <circle cx={peak.x} cy={peak.y} r="4" fill={STATUS.critical} stroke={CHART.surface} strokeWidth="2" />
            <text
              x={Math.min(peak.x, W - PAD.right - 60)}
              y={peak.y - 10}
              fontSize="11"
              fill={CHART.inkSecondary}
              textAnchor="middle"
            >
              peak {formatUSD(peak.p.orphanedCents)}
            </text>
          </>
        )}
        {last.p.orphanedCents > 0 && (
          <circle cx={last.x} cy={last.y} r="4" fill={STATUS.critical} stroke={CHART.surface} strokeWidth="2" />
        )}

        {series.map((p, i) =>
          i % 3 === 0 ? (
            <text key={p.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={CHART.inkMuted}>
              {p.label}
              {p.label === "Jan" ? ` ${String(p.year).slice(2)}` : ""}
            </text>
          ) : null,
        )}

        {pts.map(({ p, x: px }) => (
          <rect
            key={p.key}
            x={px - plotW / Math.max(series.length - 1, 1) / 2}
            y={PAD.top}
            width={plotW / Math.max(series.length - 1, 1)}
            height={plotH}
            fill="transparent"
          >
            <title>{`${p.label} ${p.year}: ${formatUSD(p.orphanedCents)}`}</title>
          </rect>
        ))}
      </svg>
    </ChartFrame>
  );
}
