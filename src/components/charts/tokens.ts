/**
 * Chart tokens. These are CSS variable references, not literals, so a chart
 * rendered on the server follows the theme the moment it is switched — no
 * re-render, no client JS.
 *
 * Both themes were validated with the dataviz validator against their own
 * surface, in one fixed slot order (the order is the colourblind-safety
 * mechanism, so it is never cycled or re-sorted):
 *   violet → pink → blue → amber → teal
 *   light on #ffffff : worst adjacent CVD ΔE 12.5 · normal-vision 24.3 · all ≥3:1
 *   dark  on #12121a : worst adjacent CVD ΔE 12.5 · normal-vision 24.3 · all ≥3:1
 * Actual hex values live in globals.css.
 */
export const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** The aggregate bucket is not a series, so it takes a neutral. */
export const OTHER_COLOR = "var(--chart-other)";

/** A second shade of slot 1, for before→after marks. */
export const SERIES_1_DEEP = "var(--chart-1-deep)";

/** Status is reserved and never used as "series 6". Always shipped with icon + label. */
export const STATUS = {
  critical: "var(--chart-critical)",
} as const;

export const CHART = {
  surface: "var(--chart-surface)",
  gridline: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  inkMuted: "var(--chart-ink-muted)",
  inkSecondary: "var(--chart-ink-secondary)",
} as const;

/** Nice round ceiling plus the tick values under it. */
export function niceScale(max: number, ticks = 4): { max: number; values: number[] } {
  if (max <= 0) return { max: 1, values: [0, 1] };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let v = 0; v <= top + 1e-6; v += step) values.push(v);
  return { max: top, values };
}

/** Compact axis money: $1.2k, $840, $3.4M. */
export function axisMoney(cents: number): string {
  const d = cents / 100;
  if (d === 0) return "$0";
  if (Math.abs(d) >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (Math.abs(d) >= 1_000) return `$${(d / 1_000).toFixed(d < 10_000 ? 1 : 0)}k`;
  return `$${Math.round(d)}`;
}
