import Link from "next/link";
import { formatUSD } from "@/lib/format";
import { CardNetworkMark, parseNetwork } from "./CardNetwork";

/**
 * One payment card per team. The mesh is built from overlapping radial fields
 * rather than a single linear ramp, which is what gives the reference cards
 * their soft foil look.
 */
const MESHES = [
  // violet → indigo
  "radial-gradient(120% 120% at 8% 12%, #a78bfa 0%, transparent 55%), radial-gradient(110% 110% at 92% 18%, #6366f1 0%, transparent 60%), radial-gradient(130% 130% at 70% 95%, #4c1d95 0%, transparent 65%), linear-gradient(135deg, #7c5cff 0%, #4f46e5 100%)",
  // rose → peach
  "radial-gradient(120% 120% at 10% 15%, #f9a8d4 0%, transparent 55%), radial-gradient(110% 110% at 88% 25%, #fdba74 0%, transparent 60%), radial-gradient(130% 130% at 60% 95%, #fb7185 0%, transparent 60%), linear-gradient(135deg, #f472b6 0%, #fb923c 100%)",
  // sky → violet
  "radial-gradient(120% 120% at 12% 10%, #7dd3fc 0%, transparent 55%), radial-gradient(110% 110% at 90% 30%, #818cf8 0%, transparent 60%), radial-gradient(130% 130% at 65% 98%, #4338ca 0%, transparent 60%), linear-gradient(135deg, #38bdf8 0%, #6d28d9 100%)",
  // ember → rose
  "radial-gradient(120% 120% at 10% 18%, #fdba74 0%, transparent 55%), radial-gradient(110% 110% at 92% 12%, #fb7185 0%, transparent 60%), radial-gradient(130% 130% at 72% 96%, #9f1239 0%, transparent 65%), linear-gradient(135deg, #fb923c 0%, #e11d48 100%)",
];

export function teamMesh(index: number) {
  return MESHES[index % MESHES.length];
}

export function TeamCard({
  href,
  name,
  amountCents,
  amountLabel,
  last4,
  network,
  index,
  share,
  shareLabel,
  flagged,
}: {
  href: string;
  name: string;
  amountCents: number;
  amountLabel: string;
  last4: string | null;
  network: string | null;
  index: number;
  /** 0–1, drawn as the bar along the bottom. */
  share?: number;
  shareLabel?: string;
  /** Shown when the team is leaking money on departed people. */
  flagged?: string;
}) {
  const pct = Math.round((share ?? 0) * 100);

  return (
    <Link
      href={href}
      className="group block rounded-[26px] p-px focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      style={{ background: "linear-gradient(160deg, rgba(255,255,255,.34), rgba(255,255,255,.04) 45%)" }}
    >
      <article
        className="card-face flex h-full min-h-[190px] flex-col justify-between rounded-[25px] px-5 py-4 text-white"
        style={{ ["--mesh" as string]: teamMesh(index) }}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-extrabold leading-tight tracking-tight">{name}</h3>
            <p className="mt-0.5 text-[11px] font-medium text-white/70">
              {last4 ? `Team card •••• ${last4}` : "Team card"}
            </p>
          </div>
          {flagged ? (
            <span className="whitespace-nowrap rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/25">
              {flagged}
            </span>
          ) : (
            <span className="whitespace-nowrap rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/25">
              Active
            </span>
          )}
        </header>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums">
              {formatUSD(amountCents)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-white/70">{amountLabel}</p>
          </div>
          {network && (
            <span className="shrink-0 pb-0.5">
              <CardNetworkMark network={parseNetwork(network)} height={20} />
            </span>
          )}
        </div>

        {share !== undefined && (
          <div>
            <div className="flex items-baseline justify-between text-[11px] font-medium">
              <span className="text-white/75">{shareLabel}</span>
              <span className="font-semibold tabular-nums">{pct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/25">
              <div className="h-full rounded-full bg-white/90" style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        )}
      </article>
    </Link>
  );
}
