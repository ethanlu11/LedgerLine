import Link from "next/link";
import type { SpendSlice } from "@/lib/metrics";
import { formatUSD } from "@/lib/format";
import { WarningIcon } from "./StatusBadge";

/** Ranked list with a proportional rail behind each row. */
export function SpendBars({
  slices,
  limit,
  color = "var(--chart-1)",
  emptyLabel = "Nothing here.",
}: {
  slices: SpendSlice[];
  limit?: number;
  color?: string;
  emptyLabel?: string;
}) {
  const rows = limit ? slices.slice(0, limit) : slices;
  if (rows.length === 0) return <p className="text-[13px] text-haze-400">{emptyLabel}</p>;

  // Bars are scaled against the biggest row so the smallest stay visible.
  const top = Math.max(...rows.map((r) => r.cents), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[14px] font-semibold text-ink-50">{r.label}</span>
                {r.flagged && <WarningIcon label="This person has left" />}
                {r.detail && <span className="shrink-0 text-[12px] text-haze-400">{r.detail}</span>}
              </span>
              <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink-50">
                {formatUSD(r.cents)}
                <span className="ml-1.5 text-[12px] font-medium text-haze-400">
                  {Math.round(r.share * 100)}%
                </span>
              </span>
            </div>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink-800">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max((r.cents / top) * 100, 2)}%`, backgroundColor: color }}
              />
            </span>
          </>
        );

        return (
          <li key={r.label}>
            {r.href ? (
              <Link
                href={r.href}
                className="block rounded-lg px-1 py-0.5 transition-colors hover:bg-ink-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow"
              >
                {body}
              </Link>
            ) : (
              <div className="px-1 py-0.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
