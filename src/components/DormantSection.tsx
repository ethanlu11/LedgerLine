import Link from "next/link";
import type { DormantRoster } from "@/lib/metrics";
import { formatDate, formatUSD, plural } from "@/lib/format";
import { Avatar } from "./Avatar";
import { WarningIcon } from "./StatusBadge";

/**
 * The people who left and are still costing money. This is the dashboard's
 * reason to exist, so it gets the loudest treatment on the page.
 */
export function DormantSection({
  roster,
  scope,
}: {
  roster: DormantRoster;
  /** "company" on the overview, or the team name on a team page. */
  scope: string;
}) {
  const { people, monthlyCents, chargedSinceCents, cleanlyOffboarded } = roster;

  if (people.length === 0) {
    // No departures at all reads differently from departures that were handled well.
    const nobodyLeft = cleanlyOffboarded === 0;
    return (
      <section className="mb-8">
        <div className="rounded-[20px] border border-mint/20 bg-mint/[0.06] px-5 py-6">
          <h2 className="text-[19px] font-extrabold tracking-tight text-ink-50">
            {nobodyLeft ? "No departures" : "Nothing dormant"}
          </h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-haze-300">
            {nobodyLeft
              ? `Nobody has left ${scope}, so there is no orphaned spend to clean up.`
              : `${plural(cleanlyOffboarded, "person", "people")} left ${scope}, and every subscription stopped billing with them.`}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="rounded-[24px] border border-ember/25 bg-ember/[0.07] p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className="flex items-center gap-2 text-[19px] font-extrabold tracking-tight text-ink-50">
              <WarningIcon label="" />
              Dormant employees
            </h2>
            <p className="mt-1 max-w-[70ch] text-[13px] text-haze-300">
              Gone from {scope}, still being charged. Cancel these and the bleeding stops.
              {cleanlyOffboarded > 0 &&
                ` ${plural(cleanlyOffboarded, "other person", "others")} offboarded cleanly.`}
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums text-ember">
                {formatUSD(monthlyCents)}
              </p>
              <p className="mt-1 text-[12px] text-haze-400">Bleeding per month</p>
            </div>
            <div>
              <p className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums text-ink-50">
                {formatUSD(chargedSinceCents)}
              </p>
              <p className="mt-1 text-[12px] text-haze-400">Wasted so far</p>
            </div>
          </div>
        </div>

        <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {people.map((d) => (
            <li key={d.person.id}>
              <Link
                href={`/people/${d.person.id}`}
                className="flex h-full flex-col gap-3 rounded-[18px] border border-ink-700 bg-ink-900 p-4 transition-colors hover:border-ember/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={d.person.name} photoUrl={d.person.photoUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-ink-50">{d.person.name}</p>
                    <p className="truncate text-[12px] text-haze-400">
                      {d.person.role} · {d.team.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[20px] font-extrabold leading-none tracking-tight tabular-nums text-ember">
                      {formatUSD(d.monthlyCents)}
                      <span className="text-[12px] font-semibold text-haze-400">/mo</span>
                    </p>
                    <p className="mt-1 text-[12px] text-haze-400">
                      {formatUSD(d.chargedSinceCents)} since {formatDate(d.departureDate)}
                      {d.otherPostDepartureCents > 0 &&
                        ` · incl. ${formatUSD(d.otherPostDepartureCents)} booked to them later`}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-right text-[12px] text-haze-400">
                    {d.daysSinceDeparture} days gone
                  </p>
                </div>

                <ul className="flex flex-wrap gap-1.5">
                  {d.vendors.map((v) => (
                    <li
                      key={v}
                      className="rounded-full bg-ink-800 px-2.5 py-1 text-[11px] font-semibold text-haze-300 ring-1 ring-inset ring-ink-700"
                    >
                      {v}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
