import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryDonut } from "@/components/CategoryDonut";
import { DormantSection } from "@/components/DormantSection";
import { TeamCard } from "@/components/TeamCard";
import { EmptyState, Panel, SectionHeading, StatTile, StatTileGrid, Td, Th } from "@/components/ui";
import { formatMonthYear, formatUSD, formatDate, plural } from "@/lib/format";
import { getOverview } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const { now, rows, companyCategories, companyAllTimeCents, chargeCount, dormant, unassigned } =
    await getOverview();

  const total = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((t, r) => t + pick(r), 0);
  const monthTotal = total((r) => r.spendThisMonthCents);
  // Company figures count unassigned spend too — it left the bank either way.
  const companyMonth = monthTotal + unassigned.thisMonthCents;
  const companyAllTime = total((r) => r.spendAllTimeCents) + unassigned.allTimeCents;
  const orphanedSpend = total((r) => r.orphanedSpendCents);
  const orphanedSubs = total((r) => r.orphanedSubscriptions);

  return (
    <>
      <Breadcrumbs items={[{ label: "Teams" }]} />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Teams</h1>
          <p className="mt-1 text-[13px] text-haze-400">
            Four cards, four budgets. Spend as of {formatDate(now)}, with {formatMonthYear(now)} to date.
          </p>
        </div>
        <p className="text-[13px] text-haze-400">
          <span className="text-[22px] font-extrabold tracking-tight tabular-nums text-ink-50">
            {formatUSD(companyMonth)}
          </span>{" "}
          this month
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          No data yet. Run <code className="rounded bg-ink-800 px-1.5 py-0.5 text-ink-50">npm run seed</code> and
          refresh.
        </EmptyState>
      ) : (
        <>
          {/* The cards are the hero: one per team, sized so all four read at a glance. */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((r, i) => (
              <TeamCard
                key={r.team.id}
                href={`/teams/${r.team.id}`}
                name={r.team.name}
                amountCents={r.spendThisMonthCents}
                amountLabel="Spent this month"
                last4={r.cardLast4}
                network={r.cardNetwork}
                index={i}
                share={r.monthShare}
                shareLabel="Share of company spend"
                flagged={
                  r.orphanedSpendCents > 0 ? `${formatUSD(r.orphanedSpendCents)} orphaned` : undefined
                }
              />
            ))}
          </div>

          {unassigned.chargeCount > 0 && (
            <Link
              href="/review"
              className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[20px] border border-violet-glow/30 bg-violet-glow/10 px-5 py-4 transition-colors hover:border-violet-glow/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow"
            >
              <p className="text-[14px] text-haze-300">
                <span className="font-bold text-ink-50">
                  {formatUSD(unassigned.allTimeCents)} is sitting on shared cards
                </span>{" "}
                with nobody attached — {plural(unassigned.chargeCount, "charge")} in{" "}
                {plural(unassigned.groupCount, "group")}.
              </p>
              <span className="whitespace-nowrap rounded-xl bg-accent-solid px-3.5 py-1.5 text-[13px] font-bold text-accent-ink">
                Sort it out
              </span>
            </Link>
          )}

          <DormantSection roster={dormant} scope="the company" />

          <StatTileGrid className="mb-8">
            <StatTile label="Spend this month" value={formatUSD(companyMonth)} />
            <StatTile label="Spend all time" value={formatUSD(companyAllTime)} />
            <StatTile
              label="People"
              value={total((r) => r.activeHeadcount)}
              sub={`${total((r) => r.departedHeadcount)} departed`}
            />
            <StatTile
              label="Orphaned spend"
              value={formatUSD(orphanedSpend)}
              tone={orphanedSpend > 0 ? "warning" : "default"}
              sub={orphanedSpend > 0 ? plural(orphanedSubs, "subscription") : "Nothing leaking"}
            />
          </StatTileGrid>

          <section className="mb-8">
            <SectionHeading note="Every charge, all time">Where the money goes</SectionHeading>
            <div className="rounded-[20px] border border-ink-800 bg-ink-900 px-5 py-6">
              <CategoryDonut
                slices={companyCategories}
                totalCents={companyAllTimeCents}
                caption="Company spend by category"
              />
            </div>
          </section>

          <SectionHeading>Team by team</SectionHeading>
          <Panel>
            <table className="w-full text-sm">
              <thead className="border-b border-ink-800 bg-ink-800/50">
                <tr>
                  <Th>Team</Th>
                  <Th right>This month</Th>
                  <Th right>All time</Th>
                  <Th right>Active / departed</Th>
                  <Th right>Live subscriptions</Th>
                  <Th right>Orphaned spend</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {rows.map((r) => (
                  <tr key={r.team.id} className="transition-colors hover:bg-ink-800/40">
                    <Td>
                      <Link href={`/teams/${r.team.id}`} className="font-bold text-ink-50 hover:underline">
                        {r.team.name}
                      </Link>
                      {r.cardLast4 && (
                        <span className="ml-2 text-[12px] tabular-nums text-haze-400">···· {r.cardLast4}</span>
                      )}
                    </Td>
                    <Td right>{formatUSD(r.spendThisMonthCents)}</Td>
                    <Td right>{formatUSD(r.spendAllTimeCents)}</Td>
                    <Td right>
                      {r.activeHeadcount}
                      <span className="text-ink-600"> / </span>
                      <span className={r.departedHeadcount > 0 ? "" : "text-ink-600"}>{r.departedHeadcount}</span>
                    </Td>
                    <Td right>{r.activeSubscriptions}</Td>
                    <Td right>
                      {r.orphanedSpendCents > 0 ? (
                        <>
                          <span className="font-semibold text-ember">{formatUSD(r.orphanedSpendCents)}</span>
                          <div className="text-[12px] text-haze-400">
                            {plural(r.orphanedSubscriptions, "subscription")}
                          </div>
                        </>
                      ) : (
                        <span className="text-ink-600">{formatUSD(0)}</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-ink-800 bg-ink-800/50 font-bold text-ink-50">
                {/* Unassigned belongs to no team, so it gets its own line and the
                    company total still equals the sum of the column. */}
                {unassigned.chargeCount > 0 && (
                  <tr className="font-normal">
                    <Td>
                      <Link href="/review" className="font-semibold text-haze-300 hover:text-ink-50">
                        Unassigned
                      </Link>
                      <span className="ml-2 text-[12px] text-haze-400">needs review</span>
                    </Td>
                    <Td right className="text-haze-300">
                      {formatUSD(unassigned.thisMonthCents)}
                    </Td>
                    <Td right className="text-haze-300">
                      {formatUSD(unassigned.allTimeCents)}
                    </Td>
                    <Td right className="text-ink-600">
                      —
                    </Td>
                    <Td right className="text-ink-600">
                      —
                    </Td>
                    <Td right className="text-ink-600">
                      —
                    </Td>
                  </tr>
                )}
                <tr>
                  <Td className="text-ink-50">Company total</Td>
                  <Td right>{formatUSD(companyMonth)}</Td>
                  <Td right>{formatUSD(companyAllTime)}</Td>
                  <Td right>
                    {total((r) => r.activeHeadcount)}
                    <span className="font-normal text-ink-600"> / </span>
                    {total((r) => r.departedHeadcount)}
                  </Td>
                  <Td right>{total((r) => r.activeSubscriptions)}</Td>
                  <Td right className="text-ember">
                    {formatUSD(orphanedSpend)}
                  </Td>
                </tr>
              </tfoot>
            </table>
          </Panel>
          <p className="mt-3 max-w-[70ch] text-[12px] text-haze-400">
            A subscription counts as live when it was charged in the last 35 days. Orphaned spend is what kept being
            charged after someone left.
          </p>

          {/* Closing band. The mascot is detailed, so it gets room to actually read. */}
          <section className="mt-10 flex flex-col items-center gap-5 rounded-[24px] border border-ink-800 bg-ink-900 px-6 py-8 text-center sm:flex-row sm:text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.png"
              alt=""
              width={132}
              height={132}
              className="logo-mark -my-4 h-[132px] w-[132px] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[20px] font-extrabold tracking-tight text-ink-50">LedgerLine</p>
              <p className="mt-1 max-w-[62ch] text-[13px] text-haze-300">
                Every figure here is added up from {chargeCount.toLocaleString("en-US")} individual charges — no
                stored totals, no estimates. Follow a team card down to a person, and down to the subscription
                still billing them.
              </p>
              <p className="mt-2 text-[12px] text-haze-400">
                Seeded demo data. Nothing is connected to a real bank.
              </p>
            </div>
          </section>
        </>
      )}
    </>
  );
}
