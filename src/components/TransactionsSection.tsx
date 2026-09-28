import Link from "next/link";
import type { TransactionFilters, TransactionRow } from "@/lib/metrics";
import { formatDate, formatUSD, plural } from "@/lib/format";
import { EmptyState, Panel, SectionHeading, Td, Th } from "./ui";

const field =
  "rounded-xl border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-[13px] text-ink-50 focus:border-violet-glow focus:outline-none focus:ring-1 focus:ring-violet-glow/50";

/** Filterable transaction list. Filters are a plain GET form, so no client JS is needed. */
export function TransactionsSection({
  personId,
  transactions,
  totalCents,
  vendors,
  categories,
  filters,
}: {
  personId: number;
  transactions: TransactionRow[];
  totalCents: number;
  vendors: string[];
  categories: string[];
  filters: TransactionFilters;
}) {
  const filtered = Boolean(filters.vendor || filters.category || filters.from || filters.to);

  return (
    <section id="transactions" className="scroll-mt-6">
      <SectionHeading
        note={`${plural(transactions.length, "transaction")} · ${formatUSD(totalCents)}${filtered ? " (filtered)" : ""}`}
      >
        Transactions
      </SectionHeading>

      <form
        method="get"
        action={`/people/${personId}#transactions`}
        className="mb-3 flex flex-wrap items-end gap-3 rounded-[20px] border border-ink-800 bg-ink-900 p-3 text-sm"
      >
        <label className="flex flex-col gap-1 text-[12px] font-medium text-haze-400">
          Vendor
          <select name="vendor" defaultValue={filters.vendor ?? ""} className={field}>
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-haze-400">
          Category
          <select name="category" defaultValue={filters.category ?? ""} className={field}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-haze-400">
          From
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-haze-400">
          To
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={field} />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-accent-solid px-4 py-1.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110"
        >
          Apply
        </button>
        {filtered && (
          <Link href={`/people/${personId}#transactions`} className="py-1.5 text-[13px] text-haze-400 hover:text-ink-50">
            Reset
          </Link>
        )}
      </form>

      {transactions.length === 0 ? (
        <EmptyState>No transactions match these filters.</EmptyState>
      ) : (
        <Panel>
          <table className="w-full text-sm">
            <thead className="border-b border-ink-800 bg-ink-800/50">
              <tr>
                <Th>Date</Th>
                <Th>Vendor</Th>
                <Th>Category</Th>
                <Th>Type</Th>
                <Th>Card</Th>
                <Th right>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {transactions.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-ink-800/40">
                  <Td muted className="whitespace-nowrap">
                    {formatDate(t.date)}
                  </Td>
                  <Td className="font-medium text-ink-50">{t.vendor}</Td>
                  <Td muted>{t.category}</Td>
                  <Td muted>{t.isSubscription ? "Subscription" : "One-off"}</Td>
                  <Td muted>{t.cardLast4 ? `•••• ${t.cardLast4}` : "—"}</Td>
                  <Td right>{formatUSD(t.amountCents)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </section>
  );
}
