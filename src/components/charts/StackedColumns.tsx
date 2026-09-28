import type { MonthPoint } from "@/lib/metrics";
import { formatUSD } from "@/lib/format";
import { CHART, SERIES, axisMoney, niceScale } from "./tokens";
import { ChartFrame } from "./ChartFrame";

const W = 900;
const H = 260;
const PAD = { top: 12, right: 12, bottom: 26, left: 48 };
const GAP = 2; // surface gap between stacked segments
const MAX_BAR = 24;

/** Monthly spend split into recurring and one-off. Part-to-whole over time. */
export function StackedColumns({ series }: { series: MonthPoint[] }) {
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const scale = niceScale(Math.max(...series.map((p) => p.totalCents), 1));
  const y = (cents: number) => PAD.top + plotH - (cents / scale.max) * plotH;
  const band = plotW / series.length;
  const barW = Math.min(band * 0.62, MAX_BAR);

  return (
    <ChartFrame
      title="Spend each month"
      subtitle="Recurring subscriptions against one-off purchases, over the last two years."
      legend={[
        { label: "Recurring", color: SERIES[0] },
        { label: "One-off", color: SERIES[1] },
      ]}
      table={{
        columns: ["Month", "Recurring", "One-off", "Total"],
        rows: series.map((p) => [
          `${p.label} ${p.year}`,
          formatUSD(p.recurringCents),
          formatUSD(p.oneOffCents),
          formatUSD(p.totalCents),
        ]),
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly spend, recurring and one-off">
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

        {series.map((p, i) => {
          const cx = PAD.left + band * i + band / 2;
          const x = cx - barW / 2;
          // Recurring is the stable base; one-off is what varies, so it rides on top.
          const recurTop = y(p.recurringCents);
          const recurH = Math.max(PAD.top + plotH - recurTop, 0);
          const oneOffTop = y(p.totalCents);
          const oneOffH = Math.max(y(p.recurringCents) - oneOffTop - (p.recurringCents > 0 ? GAP : 0), 0);
          const topmostIsOneOff = p.oneOffCents > 0;

          return (
            <g key={p.key}>
              <title>{`${p.label} ${p.year}: ${formatUSD(p.totalCents)} — recurring ${formatUSD(
                p.recurringCents,
              )}, one-off ${formatUSD(p.oneOffCents)}`}</title>
              {p.recurringCents > 0 &&
                (topmostIsOneOff ? (
                  <rect x={x} y={recurTop} width={barW} height={recurH} fill={SERIES[0]} />
                ) : (
                  // 4px rounded data-end, square at the baseline.
                  <path d={roundedTop(x, recurTop, barW, recurH, 4)} fill={SERIES[0]} />
                ))}
              {topmostIsOneOff && (
                <path d={roundedTop(x, oneOffTop, barW, oneOffH, 4)} fill={SERIES[1]} />
              )}
            </g>
          );
        })}

        {series.map((p, i) =>
          // Quarterly ticks only, so the axis never collides with itself.
          i % 3 === 0 ? (
            <text
              key={p.key}
              x={PAD.left + band * i + band / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill={CHART.inkMuted}
            >
              {p.label}
              {p.label === "Jan" ? ` ${String(p.year).slice(2)}` : ""}
            </text>
          ) : null,
        )}
      </svg>
    </ChartFrame>
  );
}

/** Rect with only the top corners rounded. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${
    x + w
  },${y + rr} L${x + w},${y + h} Z`;
}
