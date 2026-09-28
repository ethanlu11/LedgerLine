import type { SubscriptionRow, SubscriptionStatus } from "@/lib/metrics";
import { formatDate, formatMonths, formatPct, formatSignedUSD, formatUSD } from "@/lib/format";
import { SubscriptionStatusBadge } from "./StatusBadge";
import { EmptyState, Panel, Td, Th } from "./ui";

const STATUS_ORDER: Record<SubscriptionStatus, number> = { Orphaned: 0, Active: 1, Cancelled: 2 };

function PriceChange({ row }: { row: SubscriptionRow }) {
  if (row.changeCents === 0) return <span className="text-haze-400">No change</span>;
  // A price increase is a cost increase, so it reads as a caution colour.
  const tone = row.changeCents > 0 ? "text-amber-soft" : "text-mint";
  return (
    <span className={tone}>
      {formatSignedUSD(row.changeCents)} ({formatPct(row.changePct)})
    </span>
  );
}

export function SubscriptionsTable({ rows }: { rows: SubscriptionRow[] }) {
  if (rows.length === 0) return <EmptyState>No subscriptions.</EmptyState>;

  const sorted = [...rows].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.vendor.localeCompare(b.vendor),
  );
  const totalSpent = sorted.reduce((t, r) => t + r.totalCents, 0);

  return (
    <Panel>
      <table className="w-full text-sm">
        <thead className="border-b border-ink-800 bg-ink-800/50">
          <tr>
            <Th>Vendor</Th>
            <Th>Status</Th>
            <Th right>Current price</Th>
            <Th right>Starting price</Th>
            <Th right>Price change</Th>
            <Th>Started</Th>
            <Th right>Duration</Th>
            <Th right>Total spent</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-800">
          {sorted.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-ink-800/40">
              <Td>
                <div className="font-medium text-ink-50">{r.vendor}</div>
                <div className="whitespace-nowrap text-xs text-haze-400">
                  {r.category}
                  {r.cardLast4 ? ` · •••• ${r.cardLast4}` : ""}
                </div>
              </Td>
              <Td>
                <SubscriptionStatusBadge status={r.status} />
                {r.status === "Orphaned" && r.postDepartureCents > 0 && (
                  <div className="mt-1 text-xs text-ember">{formatUSD(r.postDepartureCents)} since departure</div>
                )}
              </Td>
              <Td right>{formatUSD(r.currentCents)}</Td>
              <Td right muted>
                {formatUSD(r.startingCents)}
              </Td>
              <Td right>
                <PriceChange row={r} />
              </Td>
              <Td muted className="whitespace-nowrap">
                {formatDate(r.started)}
              </Td>
              <Td right className="whitespace-nowrap">
                {formatMonths(r.durationMonths)}
              </Td>
              <Td right className="font-medium text-ink-50">
                {formatUSD(r.totalCents)}
              </Td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-ink-800 bg-ink-800/50">
          <tr>
            <Td className="font-medium text-ink-50">Total</Td>
            <Td />
            <Td />
            <Td />
            <Td />
            <Td />
            <Td />
            <Td right className="font-semibold text-ink-50">
              {formatUSD(totalSpent)}
            </Td>
          </tr>
        </tfoot>
      </table>
    </Panel>
  );
}
