import type { ReactNode } from "react";

export interface LegendItem {
  label: string;
  color: string;
  /** Status series ship with a mark, never colour alone. */
  icon?: ReactNode;
}

/**
 * Card, title, legend and table view. Every chart has a table twin so no value
 * is reachable only by hovering.
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  children,
  table,
}: {
  title: string;
  subtitle?: string;
  /** Omitted for a single series — the title already names it. */
  legend?: LegendItem[];
  children: ReactNode;
  table: { columns: string[]; rows: Array<Array<string | number>> };
}) {
  return (
    <section className="min-w-0 rounded-[10px] border border-ink-800 bg-ink-900 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink-50">{title}</h2>
          {subtitle && <p className="mt-0.5 max-w-[62ch] text-[12px] text-haze-400">{subtitle}</p>}
        </div>
        {legend && legend.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {legend.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5 text-[12px] text-haze-300">
                {l.icon ?? (
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                )}
                {l.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {children}

      <details className="mt-4 border-t border-ink-800 pt-3">
        <summary className="cursor-pointer text-[12px] text-haze-400 transition-colors hover:text-ink-50">
          View as table
        </summary>
        <div className="mt-3 max-h-72 overflow-x-auto overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-ink-900">
              <tr className="border-b border-ink-800">
                {table.columns.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={`whitespace-nowrap px-2 py-1.5 font-semibold text-haze-400 ${
                      i === 0 ? "text-left" : "text-right"
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`whitespace-nowrap px-2 py-1.5 ${
                        ci === 0 ? "text-left text-haze-300" : "text-right tabular-nums text-ink-50"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
