import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CreditCard, parseProduct } from "@/components/CreditCard";
import { PersonStatusBadge, WarningIcon } from "@/components/StatusBadge";
import { SubscriptionsTable } from "@/components/SubscriptionsTable";
import { TransactionsSection } from "@/components/TransactionsSection";
import { SectionHeading, StatTile, StatTileGrid } from "@/components/ui";
import { formatDate, formatUSD, plural } from "@/lib/format";
import { getPersonPage } from "@/lib/metrics";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
/** Only accept real yyyy-mm-dd dates; anything else is treated as "not set". */
const day = (v: string | string[] | undefined) => {
  const s = first(v);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : undefined;
};

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const personId = Number(id);
  if (!Number.isInteger(personId)) notFound();

  const sp = await searchParams;
  const filters = {
    vendor: first(sp.vendor),
    category: first(sp.category),
    from: day(sp.from),
    to: day(sp.to),
  };

  const data = await getPersonPage(personId, filters);
  if (!data) notFound();
  const { team, metrics, cardRows, transactions, transactionsTotalCents, vendors, categories } = data;
  const { person } = metrics;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Teams", href: "/" },
          { label: team.name, href: `/teams/${team.id}` },
          { label: person.name },
        ]}
      />

      <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={person.name} photoUrl={person.photoUrl} size={88} alt={`Photo of ${person.name}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{person.name}</h1>
            <PersonStatusBadge departureDate={person.departureDate} />
          </div>
          <p className="mt-0.5 text-[15px] text-haze-300">{person.role}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-haze-400">
            <Link href={`/teams/${team.id}`} className="font-semibold text-haze-300 hover:text-ink-50">
              {team.name}
            </Link>
            <span aria-hidden="true" className="text-ink-600">
              ·
            </span>
            <span>Started {formatDate(person.startDate)}</span>
            {person.departureDate && (
              <>
                <span aria-hidden="true" className="text-ink-600">
                  ·
                </span>
                <span>Left {formatDate(person.departureDate)}</span>
              </>
            )}
          </p>
        </div>
      </header>

      <StatTileGrid className="mb-8">
        <StatTile label="Spend this month" value={formatUSD(metrics.spendThisMonthCents)} />
        <StatTile label="Spend all time" value={formatUSD(metrics.spendAllTimeCents)} />
        <StatTile
          label="Live subscriptions"
          value={metrics.liveSubscriptions}
          tone={metrics.orphanedSubscriptions > 0 ? "warning" : "default"}
          sub={metrics.orphanedSubscriptions > 0 ? `${metrics.orphanedSubscriptions} orphaned` : undefined}
        />
        <StatTile label="Cards" value={metrics.cards.length} />
      </StatTileGrid>

      {metrics.orphanedSubscriptions > 0 && (
        <div className="mb-8 flex items-start gap-3 rounded-[20px] border border-ember/25 bg-ember/10 px-4 py-3.5 text-[14px] text-haze-300">
          <span className="mt-0.5">
            <WarningIcon label="Warning" />
          </span>
          <p className="max-w-[80ch]">
            {person.name} left on {formatDate(person.departureDate!)} and{" "}
            {plural(metrics.orphanedSubscriptions, "subscription")} kept billing, at{" "}
            <strong className="font-bold tabular-nums text-ink-50">
              {formatUSD(metrics.orphanedMonthlyCents)}
            </strong>{" "}
            a month. That is{" "}
            <strong className="font-bold tabular-nums text-ink-50">{formatUSD(metrics.orphanedSpendCents)}</strong>{" "}
            charged since.
          </p>
        </div>
      )}

      <section className="mb-8">
        <SectionHeading note={plural(cardRows.length, "card")}>Cards and accounts</SectionHeading>
        {cardRows.length === 0 ? (
          <p className="text-[14px] text-haze-400">No cards linked.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cardRows.map((r) => (
              <li key={r.card.id} className="min-w-0">
                <CreditCard
                  product={parseProduct(r.card.product)}
                  network={r.card.network}
                  last4={r.card.last4}
                  holder={person.name}
                  footnote={r.card.account.name}
                />
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-ink-800 bg-ink-900 px-2 py-2">
                    <dt className="text-[11px] text-haze-400">Live subs</dt>
                    <dd className="text-[15px] font-bold tabular-nums text-ink-50">{r.liveSubscriptions}</dd>
                  </div>
                  <div className="rounded-xl border border-ink-800 bg-ink-900 px-2 py-2">
                    <dt className="text-[11px] text-haze-400">Charges</dt>
                    <dd className="text-[15px] font-bold tabular-nums text-ink-50">{r.chargeCount}</dd>
                  </div>
                  <div className="rounded-xl border border-ink-800 bg-ink-900 px-2 py-2">
                    <dt className="text-[11px] text-haze-400">All time</dt>
                    <dd className="text-[15px] font-bold tabular-nums text-ink-50">{formatUSD(r.spendCents)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <SectionHeading note="Built from real charges. Live means charged in the last 35 days.">
          Subscriptions
        </SectionHeading>
        <SubscriptionsTable rows={metrics.subscriptions} />
      </section>

      <TransactionsSection
        personId={person.id}
        transactions={transactions}
        totalCents={transactionsTotalCents}
        vendors={vendors}
        categories={categories}
        filters={filters}
      />
    </>
  );
}
