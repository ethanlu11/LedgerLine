import Link from "next/link";
import type { CategorySlice } from "@/lib/metrics";
import { OTHER_BUCKET, categorySlug } from "@/lib/metrics";
import { formatUSD } from "@/lib/format";
import { CHART, OTHER_COLOR, SERIES } from "./charts/tokens";

// The app-wide validated slot order. "Other" is a bucket, not a series, so it
// takes the neutral and sits outside the categorical set.
const SLICE_COLORS = SERIES;

const R = 52;
const CIRC = 2 * Math.PI * R;

/**
 * Spend by category. Every real category links through to its own breakdown;
 * "Other" is an aggregate, so it stays inert and names what it contains.
 */
export function CategoryDonut({
  slices,
  totalCents,
  caption,
  teamId,
}: {
  slices: CategorySlice[];
  totalCents: number;
  caption: string;
  /** Keeps the drill-down scoped to one team. */
  teamId?: number;
}) {
  if (slices.length === 0) return null;

  const hrefFor = (category: string) =>
    category === OTHER_BUCKET
      ? undefined
      : `/categories/${categorySlug(category)}${teamId ? `?team=${teamId}` : ""}`;

  let offset = 0;
  const arcs = slices.map((slice, i) => {
    const len = slice.share * CIRC;
    // "Other" is a bucket, not a category, so it gets the grey at the end.
    const color = slice.category === OTHER_BUCKET ? OTHER_COLOR : SLICE_COLORS[i % SLICE_COLORS.length];
    const arc = { slice, color, len, offset, href: hrefFor(slice.category) };
    offset += len;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
      <svg viewBox="0 0 140 140" className="h-[168px] w-[168px] shrink-0 -rotate-90" role="img" aria-label={caption}>
        <circle cx="70" cy="70" r={R} fill="none" stroke={CHART.gridline} strokeWidth="18" />
        {arcs.map(({ slice, color, len, offset: o, href }) => {
          const ring = (
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth="18"
              strokeLinecap="round"
              // 3px shaved off each arc leaves the gap between slices.
              strokeDasharray={`${Math.max(len - 3, 1)} ${CIRC - Math.max(len - 3, 1)}`}
              strokeDashoffset={-o}
              className={href ? "cursor-pointer" : undefined}
            />
          );
          return href ? (
            <Link key={slice.category} href={href} aria-label={`${slice.category} breakdown`}>
              {ring}
            </Link>
          ) : (
            <g key={slice.category}>{ring}</g>
          );
        })}
      </svg>

      <div className="min-w-0 flex-1">
        <p className="text-[22px] font-extrabold leading-none tracking-tight tabular-nums text-ink-50">
          {formatUSD(totalCents)}
        </p>
        <p className="mt-1 text-[13px] text-haze-400">{caption}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {arcs.map(({ slice, color, href }) => {
            const inner = (
              <>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-semibold tabular-nums text-ink-50">{Math.round(slice.share * 100)}%</span>
                <span className="text-haze-400">{slice.category}</span>
              </>
            );
            const shell =
              "flex items-center gap-2 rounded-full bg-ink-800 py-1 pl-2 pr-3 text-[12px] ring-1 ring-inset ring-ink-700";
            return (
              <li key={slice.category}>
                {href ? (
                  <Link
                    href={href}
                    className={`${shell} transition-colors hover:bg-ink-700 hover:ring-violet-glow/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <span className={shell} title="Everything outside the top categories">
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] text-haze-400">Pick a category to see who spent it and on what.</p>
      </div>
    </div>
  );
}
