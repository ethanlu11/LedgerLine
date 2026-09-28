import type { Team } from "@prisma/client";
import type { MonthPoint } from "@/lib/metrics";
import { formatUSD } from "@/lib/format";
import { CHART, SERIES, axisMoney, niceScale } from "./tokens";
import { ChartFrame } from "./ChartFrame";

const W = 900;
const H = 280;
// Right padding leaves room for the end labels, which four series make mandatory.
const PAD = { top: 12, right: 92, bottom: 26, left: 48 };

/** One line per team. Colour follows the team, fixed by its position in the list. */
export function TeamLines({ series, teams }: { series: MonthPoint[]; teams: Team[] }) {
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const peak = Math.max(...series.flatMap((p) => teams.map((t) => p.byTeam[t.id] ?? 0)), 1);
  const scale = niceScale(peak);
  const x = (i: number) => PAD.left + (i / Math.max(series.length - 1, 1)) * plotW;
  const y = (cents: number) => PAD.top + plotH - (cents / scale.max) * plotH;

  const lines = teams.slice(0, SERIES.length).map((team, si) => {
    const pts = series.map((p, i) => ({ x: x(i), y: y(p.byTeam[team.id] ?? 0) }));
    return {
      team,
      color: SERIES[si],
      d: pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" "),
      end: pts[pts.length - 1],
      endValue: series[series.length - 1]?.byTeam[team.id] ?? 0,
    };
  });

  // Nudge colliding end labels apart so they stay attached to the right line.
  const placed: number[] = [];
  const labelY = (want: number) => {
    let v = want;
    while (placed.some((p) => Math.abs(p - v) < 13)) v += 13;
    placed.push(v);
    return v;
  };
  const ordered = [...lines].sort((a, b) => a.end.y - b.end.y).map((l) => ({ ...l, ly: labelY(l.end.y) }));

  return (
    <ChartFrame
      title="Each team over time"
      subtitle="Monthly spend per team. Colour stays with the team across every chart here."
      legend={lines.map((l) => ({ label: l.team.name, color: l.color }))}
      table={{
        columns: ["Month", ...teams.map((t) => t.name)],
        rows: series.map((p) => [`${p.label} ${p.year}`, ...teams.map((t) => formatUSD(p.byTeam[t.id] ?? 0))]),
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly spend per team">
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

        {lines.map((l) => (
          <path
            key={l.team.id}
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* End dot: ≥8px with a 2px surface ring so overlaps stay legible. A leader
            line keeps a nudged label attached to its own series instead of reading
            as a detached stack. */}
        {ordered.map((l) => (
          <g key={l.team.id}>
            <circle cx={l.end.x} cy={l.end.y} r="4" fill={l.color} stroke={CHART.surface} strokeWidth="2" />
            {Math.abs(l.ly - l.end.y) > 1 && (
              <polyline
                points={`${l.end.x + 6},${l.end.y} ${l.end.x + 16},${l.ly} ${l.end.x + 22},${l.ly}`}
                fill="none"
                stroke={CHART.axis}
                strokeWidth="1"
              />
            )}
            <text x={l.end.x + 26} y={l.ly + 4} fontSize="11" fill={CHART.inkSecondary}>
              {l.team.name}
            </text>
          </g>
        ))}

        {series.map((p, i) =>
          i % 3 === 0 ? (
            <text key={p.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={CHART.inkMuted}>
              {p.label}
              {p.label === "Jan" ? ` ${String(p.year).slice(2)}` : ""}
            </text>
          ) : null,
        )}

        {/* Hit areas are full-height bands, so hovering never needs pixel accuracy. */}
        {series.map((p, i) => (
          <rect
            key={`hit-${p.key}`}
            x={x(i) - plotW / Math.max(series.length - 1, 1) / 2}
            y={PAD.top}
            width={plotW / Math.max(series.length - 1, 1)}
            height={plotH}
            fill="transparent"
          >
            <title>
              {`${p.label} ${p.year}\n` +
                teams.map((t) => `${t.name}: ${formatUSD(p.byTeam[t.id] ?? 0)}`).join("\n")}
            </title>
          </rect>
        ))}
      </svg>
    </ChartFrame>
  );
}
