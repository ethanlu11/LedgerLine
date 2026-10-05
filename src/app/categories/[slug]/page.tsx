import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SpendBars } from "@/components/SpendBars";
import { SERIES } from "@/components/charts/tokens";
import { EmptyState, Panel, SectionHeading, StatTile, StatTileGrid, Td, Th } from "@/components/ui";
import { formatDate, formatUSD, plural } from "@/lib/format";
import { getCategoryPage } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ team?: string | string[] }>;
}) {
  const { slug } = await params;
  const rawTeam = (await searchParams).team;
  const teamParam = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam;
  const teamId = teamParam !== undefined && /^\d+$/.test(teamParam) ? Number(teamParam) : undefined;

  const data = await getCategoryPage(slug, teamId);
  if (!data) notFound();

  const {
    category,
    team,
    totalCents,
    chargeCount,
    shareOfCompany,
    subscriptionCents,
    oneOffCents,
    orphanedCents,
    byTeam,
    byVendor,
    byPerson,
    recent,
  } = data;

  const recurringShare = totalCents > 0 ? subscriptionCents / totalCents : 0;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Teams", href: "/" },
          ...(team ? [{ label: team.name, href: `/teams/${team.id}` }] : []),
          { label: category },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{category}</h1>
          <p className="mt-1 text-[13px] text-haze-400">
            {plural(chargeCount, "charge")} {team ? `from ${team.name}` : "across the company"} ·{" "}
            {Math.round(shareOfCompany * 100)}% of all company spend
          </p>
        </div>
        <p className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums">
          {formatUSD(totalCents)}
        </p>
      </div>

      {totalCents === 0 ? (
        <EmptyState>No spend recorded in {category}.</EmptyState>
      ) : (
        <>
          <StatTileGrid className="mb-8">
            <StatTile
              label="Recurring"
              value={formatUSD(subscriptionCents)}
              sub="Subscriptions"
              bar={{ share: recurringShare }}
            />
            <StatTile
              label="One-off"
              value={formatUSD(oneOffCents)}
              sub="Single purchases"
              bar={{ share: 1 - recurringShare, color: SERIES[3] }}
            />
            <StatTile label="Charges" value={chargeCount} sub={`${plural(byVendor.length, "vendor")}`} />
            <StatTile
              label="Orphaned"
              value={formatUSD(orphanedCents)}
              tone={orphanedCents > 0 ? "warning" : "default"}
              sub={orphanedCents > 0 ? "Billed after someone left" : "None"}
            />
          </StatTileGrid>

          {/* items-start so a short panel doesn't stretch to match a tall one. */}
          <div className="mb-8 grid items-start gap-4 lg:grid-cols-2">
            {!team && (
              <section className="min-w-0 rounded-[10px] border border-ink-800 bg-ink-900 px-5 py-5">
                <SectionHeading>By team</SectionHeading>
                <SpendBars slices={byTeam} />
              </section>
            )}
            <section className="min-w-0 rounded-[10px] border border-ink-800 bg-ink-900 px-5 py-5">
              <SectionHeading note={byVendor.length > 8 ? `Top 8 of ${byVendor.length}` : undefined}>
                By vendor
              </SectionHeading>
              <SpendBars slices={byVendor} limit={8} color={SERIES[1]} />
            </section>
            <section className="min-w-0 rounded-[10px] border border-ink-800 bg-ink-900 px-5 py-5 lg:col-span-2">
              <SectionHeading note={byPerson.length > 8 ? `Top 8 of ${byPerson.length}` : undefined}>
                By person
              </SectionHeading>
              <SpendBars slices={byPerson} limit={8} color={SERIES[2]} />
            </section>
          </div>

          <SectionHeading note={`Newest ${recent.length} of ${chargeCount}`}>Latest charges</SectionHeading>
          <Panel>
            <table className="w-full text-sm">
              <thead className="border-b border-ink-800 bg-ink-800/50">
                <tr>
                  <Th>Date</Th>
                  <Th>Vendor</Th>
                  <Th>Type</Th>
                  <Th>Card</Th>
                  <Th right>Amount</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {recent.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-ink-800/40">
                    <Td muted className="whitespace-nowrap">
                      {formatDate(t.date)}
                    </Td>
                    <Td className="font-medium text-ink-50">{t.vendor}</Td>
                    <Td muted>{t.isSubscription ? "Subscription" : "One-off"}</Td>
                    <Td muted>{t.cardLast4 ? `•••• ${t.cardLast4}` : "—"}</Td>
                    <Td right>{formatUSD(t.amountCents)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </>
  );
}
