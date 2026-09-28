import type { PriceDrift as PriceDriftRow } from "@/lib/metrics";
import { formatPct, formatUSD } from "@/lib/format";
import { CHART, SERIES, SERIES_1_DEEP, axisMoney, niceScale } from "./tokens";
import { ChartFrame } from "./ChartFrame";

// Sized for the half-width column it sits in, so the viewBox renders close to
// 1:1 and the row labels stay readable instead of being scaled down.
const W = 560;
const ROW = 38;
const PAD = { top: 10, right: 64, bottom: 28, left: 176 };

// Before → after per item: one hue, two shades.
const WAS = SERIES_1_DEEP;
const NOW = SERIES[0];

/** Longest vendor name the left gutter can hold at 12.5px. */
const fit = (name: string) => (name.length > 16 ? `${name.slice(0, 15).trimEnd()}…` : name);

/** What each subscription cost at signup against what it costs now. */
export function PriceDrift({ rows }: { rows: PriceDriftRow[] }) {
  if (rows.length === 0) return null;

  const H = PAD.top + rows.length * ROW + PAD.bottom;
  const plotW = W - PAD.left - PAD.right;
  const scale = niceScale(Math.max(...rows.flatMap((r) => [r.startingCents, r.currentCents]), 1));
  const x = (cents: number) => PAD.left + (cents / scale.max) * plotW;
  const rowY = (i: number) => PAD.top + i * ROW + ROW / 2;

  return (
    <ChartFrame
      title="Prices that moved"
      subtitle="Where a subscription costs more now than the day it started. The gap is the increase."
      legend={[
        { label: "At signup", color: WAS },
        { label: "Now", color: NOW },
      ]}
      table={{
        columns: ["Subscription", "At signup", "Now", "Change"],
        rows: rows.map((r) => [
          `${r.vendor} · ${r.who}`,
          formatUSD(r.startingCents),
          formatUSD(r.currentCents),
          `${formatUSD(r.changeCents)} (${formatPct(r.changePct)})`,
        ]),
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Subscription price change since signup">
        {scale.values.map((v) => (
          <g key={v}>
            <line
              x1={x(v)}
              x2={x(v)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke={v === 0 ? CHART.axis : CHART.gridline}
              strokeWidth="1"
            />
            <text x={x(v)} y={H - 8} textAnchor="middle" fontSize="11" fill={CHART.inkMuted}>
              {axisMoney(v)}
            </text>
          </g>
        ))}

        {rows.map((r, i) => {
          const y = rowY(i);
          return (
            <g key={`${r.vendor}-${r.personId}`}>
              <title>{`${r.vendor} · ${r.who}: ${formatUSD(r.startingCents)} → ${formatUSD(
                r.currentCents,
              )} (${formatPct(r.changePct)})`}</title>

              {/* Truncated to fit the gutter rather than clipped by it. The full
                  name stays in the tooltip and the table view. */}
              <text x={PAD.left - 14} y={y + 4} textAnchor="end" fontSize="12.5" fill={CHART.inkSecondary}>
                {fit(r.vendor)}
                <tspan fill={CHART.inkMuted}> · {r.who.split(" ")[0]}</tspan>
              </text>

              <line
                x1={x(r.startingCents)}
                x2={x(r.currentCents)}
                y1={y}
                y2={y}
                stroke={NOW}
                strokeWidth="2"
                strokeOpacity="0.35"
                strokeLinecap="round"
              />
              <circle cx={x(r.startingCents)} cy={y} r="4.5" fill={WAS} stroke={CHART.surface} strokeWidth="2" />
              <circle cx={x(r.currentCents)} cy={y} r="4.5" fill={NOW} stroke={CHART.surface} strokeWidth="2" />

              <text x={x(r.currentCents) + 12} y={y + 4} fontSize="11" fill={CHART.inkSecondary}>
                {formatPct(r.changePct)}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
