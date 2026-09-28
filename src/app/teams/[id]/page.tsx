import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryDonut } from "@/components/CategoryDonut";
import { DormantSection } from "@/components/DormantSection";
import { PersonStatusBadge, WarningIcon } from "@/components/StatusBadge";
import { StatusFilter, parseStatusFilter } from "@/components/StatusFilter";
import { TeamCard } from "@/components/TeamCard";
import { EmptyState, Panel, SectionHeading, StatTile, StatTileGrid, Td, Th } from "@/components/ui";
import { formatDate, formatUSD, plural } from "@/lib/format";
import { getOverview, getTeamPage } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isInteger(teamId)) notFound();

  const data = await getTeamPage(teamId);
  if (!data) notFound();
  const { now, team, members, cardLast4, cardNetwork, categories, dormant } = data;

  // The card's colour is its position in the company list, so it matches the Teams page.
  const overview = await getOverview();
  const cardIndex = Math.max(
    overview.rows.findIndex((r) => r.team.id === teamId),
    0,
  );
  const monthShare = overview.rows[cardIndex]?.monthShare ?? 0;

  const status = parseStatusFilter((await searchParams).status);
  const visible = members.filter((m) =>
    status === "all" ? true : status === "active" ? !m.departed : m.departed,
  );
  const counts = {
    all: members.length,
    active: members.filter((m) => !m.departed).length,
    departed: members.filter((m) => m.departed).length,
  };
  const monthTotal = members.reduce((t, m) => t + m.spendThisMonthCents, 0);
  const allTimeTotal = members.reduce((t, m) => t + m.spendAllTimeCents, 0);
  const liveSubs = members.reduce((t, m) => t + m.liveSubscriptions, 0);
  const orphanedSubs = members.reduce((t, m) => t + m.orphanedSubscriptions, 0);
  const orphanedSpend = members.reduce((t, m) => t + m.orphanedSpendCents, 0);

  return (
    <>
      <Breadcrumbs items={[{ label: "Teams", href: "/" }, { label: team.name }]} />

      <div className="mb-6">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{team.name}</h1>
        <p className="mt-1 text-[13px] text-haze-400">
          {plural(members.length, "person", "people")} as of {formatDate(now)}
        </p>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <TeamCard
          href={`/teams/${team.id}`}
          name={team.name}
          amountCents={monthTotal}
          amountLabel="Spent this month"
          last4={cardLast4}
          network={cardNetwork}
          index={cardIndex}
          share={monthShare}
          shareLabel="Share of company spend"
          flagged={orphanedSpend > 0 ? `${formatUSD(orphanedSpend)} orphaned` : undefined}
        />
        <div className="rounded-[20px] border border-ink-800 bg-ink-900 px-5 py-6">
          <CategoryDonut
            slices={categories}
            totalCents={allTimeTotal}
            caption={`${team.name} spend by category, all time`}
            teamId={team.id}
          />
        </div>
      </div>

      <DormantSection roster={dormant} scope={team.name} />

      <StatTileGrid className="mb-8">
        <StatTile label="Spend this month" value={formatUSD(monthTotal)} />
        <StatTile label="Spend all time" value={formatUSD(allTimeTotal)} />
        <StatTile label="People" value={counts.active} sub={`${counts.departed} departed`} />
        <StatTile
          label="Live subscriptions"
          value={liveSubs}
          tone={orphanedSubs > 0 ? "warning" : "default"}
          sub={orphanedSubs > 0 ? `${orphanedSubs} orphaned` : "None orphaned"}
        />
      </StatTileGrid>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SectionHeading>Who spends what</SectionHeading>
        <StatusFilter basePath={`/teams/${team.id}`} current={status} counts={counts} />
      </div>

      {visible.length === 0 ? (
        <EmptyState>No {status} people on this team.</EmptyState>
      ) : (
        <Panel>
          <table className="w-full text-sm">
            <thead className="border-b border-ink-800 bg-ink-800/50">
              <tr>
                <Th>Person</Th>
                <Th>Position</Th>
                <Th>Status</Th>
                <Th right>This month</Th>
                <Th right>All time</Th>
                <Th right>Subscriptions</Th>
                <Th right>Cards</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {visible.map((m) => (
                <tr key={m.person.id} className="transition-colors hover:bg-ink-800/40">
                  <Td middle>
                    <div className="flex items-center gap-3">
                      <Avatar name={m.person.name} photoUrl={m.person.photoUrl} size={36} />
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/people/${m.person.id}`}
                          className="whitespace-nowrap font-bold text-ink-50 hover:underline"
                        >
                          {m.person.name}
                        </Link>
                        {m.departed && m.liveSubscriptions > 0 && (
                          <WarningIcon
                            label={`Departed but still has ${plural(m.liveSubscriptions, "live subscription")}`}
                          />
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td middle muted className="whitespace-nowrap">
                    {m.person.role}
                  </Td>
                  <Td middle>
                    <PersonStatusBadge departureDate={m.person.departureDate} />
                  </Td>
                  <Td middle right>
                    {formatUSD(m.spendThisMonthCents)}
                  </Td>
                  <Td middle right>
                    {formatUSD(m.spendAllTimeCents)}
                  </Td>
                  <Td middle right>
                    {m.liveSubscriptions}
                    <span className="text-ink-600"> / {m.subscriptions.length}</span>
                  </Td>
                  <Td middle right>
                    {m.cards.length}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-haze-400">
        <p>Subscriptions: live in the last 35 days, over the total ever charged.</p>
        <p className="flex items-center gap-1.5">
          <WarningIcon label="Warning" /> Left the company, still being charged.
        </p>
      </div>
    </>
  );
}
