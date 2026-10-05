import type { ReactNode } from "react";

/** Raised dark surface that scrolls horizontally on narrow screens. */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-[10px] border border-ink-800 bg-ink-900 ${className}`}>
      {children}
    </div>
  );
}

export function Th({ children, right = false }: { children?: ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 text-[12px] font-semibold text-haze-400 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right = false,
  muted = false,
  middle = false,
  className = "",
}: {
  children?: ReactNode;
  right?: boolean;
  muted?: boolean;
  /** Vertically centre the cell (for rows that contain an avatar). */
  middle?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 text-[14px] ${middle ? "align-middle" : "align-top"} ${
        right ? "text-right tabular-nums" : "text-left"
      } ${muted ? "text-haze-400" : "text-haze-300"} ${className}`}
    >
      {children}
    </td>
  );
}

export function SectionHeading({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-[19px] font-extrabold tracking-tight text-ink-50">{children}</h2>
      {note ? <p className="text-xs text-haze-400">{note}</p> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-ink-700 bg-ink-900/60 px-6 py-10 text-center text-sm text-haze-400">
      {children}
    </div>
  );
}

/** Responsive grid for a row of StatTiles. */
export function StatTileGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>{children}</div>;
}

/**
 * Small metric card. `bar` draws the progress rail from the reference cards —
 * pass it only when the value is genuinely a share of something.
 */
export function StatTile({
  label,
  value,
  sub,
  tone = "default",
  bar,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "accent" | "warning";
  bar?: { share: number; color?: string };
}) {
  const valueTone =
    tone === "accent" ? "text-mint" : tone === "warning" ? "text-ember" : "text-ink-50";
  const pct = bar ? Math.round(bar.share * 100) : 0;

  return (
    <div className="rounded-[10px] border border-ink-800 bg-ink-900 px-4 py-3.5">
      <p className="text-[12px] font-medium text-haze-400">{label}</p>
      <p className={`mt-1 text-[22px] font-extrabold leading-tight tracking-tight tabular-nums ${valueTone}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[12px] text-haze-400">{sub}</p> : null}
      {bar && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-haze-300">{pct}%</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: bar.color ?? "var(--c-good)" }}
            />
          </span>
        </div>
      )}
    </div>
  );
}
