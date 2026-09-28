import Link from "next/link";
import { AssignForm } from "@/components/AssignForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardNetworkMark, parseNetwork } from "@/components/CardNetwork";
import { GuessCallout } from "@/components/GuessCallout";
import { StatTile, StatTileGrid } from "@/components/ui";
import { formatDate, formatMonthYear, formatUSD, plural } from "@/lib/format";
import { getReviewQueue } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const { now, groups, chargeCount, totalCents, thisMonthCents, owners } = await getReviewQueue();

  return (
    <>
      <Breadcrumbs items={[{ label: "Teams", href: "/" }, { label: "Review" }]} />

      <div className="mb-6">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Review</h1>
        <p className="mt-1 max-w-[70ch] text-[13px] text-haze-400">
          These charges landed on shared cards, so nobody is named on them. Say who each one belongs to and it
          joins their spend everywhere else.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[24px] border border-mint/25 bg-mint/[0.07] px-6 py-12 text-center">
          <p className="text-[19px] font-extrabold tracking-tight text-ink-50">Everything is assigned</p>
          <p className="mx-auto mt-2 max-w-[54ch] text-[14px] text-haze-300">
            Every charge on file belongs to a person or a team. Anything new that lands on a shared card will
            show up here.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-accent-solid px-4 py-2 text-[13px] font-bold text-accent-ink transition hover:brightness-110"
          >
            Back to teams
          </Link>
        </div>
      ) : (
        <>
          <StatTileGrid className="mb-8">
            <StatTile
              label={`Unassigned in ${formatMonthYear(now)}`}
              value={formatUSD(thisMonthCents)}
              tone="warning"
            />
            <StatTile label="Unassigned all time" value={formatUSD(totalCents)} tone="warning" />
            <StatTile label="Charges waiting" value={chargeCount} sub={plural(groups.length, "group")} />
            {/* Recurring groups matter more: they keep billing until someone acts. */}
            <StatTile
              label="Still billing monthly"
              value={groups.filter((g) => g.recurring).length}
              sub={`of ${plural(groups.length, "group")}`}
            />
          </StatTileGrid>

          <ul className="space-y-3">
            {groups.map((g) => (
              <li
                key={g.key}
                className="rounded-[20px] border border-ink-800 bg-ink-900 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <h2 className="text-[17px] font-extrabold tracking-tight text-ink-50">{g.vendor}</h2>
                      <span className="rounded-full bg-ink-800 px-2.5 py-0.5 text-[11px] font-semibold text-haze-300 ring-1 ring-inset ring-ink-700">
                        {g.recurring ? "Monthly" : "One-off"}
                      </span>
                      <span className="text-[12px] text-haze-400">{g.category}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-haze-400">
                      {g.cardNetwork && (
                        <span className="flex h-[20px] w-[30px] items-center justify-center rounded bg-ink-700">
                          <CardNetworkMark network={parseNetwork(g.cardNetwork)} height={10} />
                        </span>
                      )}
                      <span className="tabular-nums">•••• {g.cardLast4}</span>
                      <span aria-hidden="true" className="text-ink-600">
                        ·
                      </span>
                      <span>{g.accountName}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                      <p className="text-[22px] font-extrabold leading-none tracking-tight tabular-nums text-ink-50">
                        {formatUSD(g.totalCents)}
                      </p>
                      <p className="text-[12px] text-haze-400">
                        {plural(g.chargeCount, "charge")} · {formatDate(g.firstDate)} to{" "}
                        {formatDate(g.lastDate)}
                        {g.thisMonthCents > 0 && ` · ${formatUSD(g.thisMonthCents)} this month`}
                      </p>
                    </div>

                    <GuessCallout guess={g.guess} />
                  </div>

                  <div className="w-full shrink-0 lg:max-w-[340px]">
                    <AssignForm group={g} owners={owners} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
