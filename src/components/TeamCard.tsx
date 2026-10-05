import Link from "next/link";
import { formatUSD } from "@/lib/format";
import { CardNetworkMark, parseNetwork } from "./CardNetwork";
import { Chip, Contactless } from "./CreditCard";

/**
 * One payment card per team. The mesh is built from overlapping radial fields
 * rather than a single linear ramp, which is what gives the reference cards
 * their soft foil look.
 */
const FACES = [
  // Premium card finishes: brushed platinum, graphite, navy and forest. The
  // fine repeating gradient is the brushed-metal striation; the broad radial is
  // the sheen rolling across the face. Inks are checked at the end of each ramp
  // where they have least to work with — worst case across the four is 8.23:1.
  {
    name: "Platinum",
    art:
      "repeating-linear-gradient(104deg, rgba(255,255,255,.55) 0 1px, rgba(120,126,140,.16) 1px 3px)," +
      "radial-gradient(130% 150% at 18% 0%, #ffffff 0%, transparent 58%)," +
      "linear-gradient(142deg, #f2f3f5 0%, #d2d5db 48%, #b9bcc4 100%)",
    ink: "dark" as const,
  },
  {
    name: "Graphite",
    art:
      "repeating-linear-gradient(104deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.18) 1px 3px)," +
      "radial-gradient(130% 150% at 16% 0%, #6b717c 0%, transparent 60%)," +
      "linear-gradient(142deg, #4a4f58 0%, #2a2e36 52%, #1c1f26 100%)",
    ink: "light" as const,
  },
  {
    name: "Sapphire",
    art:
      "repeating-linear-gradient(104deg, rgba(255,255,255,.06) 0 1px, rgba(0,0,0,.16) 1px 3px)," +
      "radial-gradient(130% 150% at 16% 0%, #2f5fa8 0%, transparent 60%)," +
      "linear-gradient(142deg, #1b3a6b 0%, #102a52 52%, #081a38 100%)",
    ink: "light" as const,
  },
  {
    name: "Emerald",
    art:
      "repeating-linear-gradient(104deg, rgba(255,255,255,.06) 0 1px, rgba(0,0,0,.16) 1px 3px)," +
      "radial-gradient(130% 150% at 16% 0%, #2a7f5a 0%, transparent 60%)," +
      "linear-gradient(142deg, #17543a 0%, #0e3b28 52%, #06251a 100%)",
    ink: "light" as const,
  },
];

export function teamFace(index: number) {
  return FACES[index % FACES.length];
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
  const face = teamFace(index);
  // Pale faces need ink; deep ones need white. Fixed per face, never per theme —
  // the card art is the same in dark and light.
  const light = face.ink === "light";
  const ink = light ? "text-white" : "text-[#0b1220]";
  const dim = light ? "text-white/70" : "text-[#0b1220]/65";
  const dimmer = light ? "text-white/75" : "text-[#0b1220]/70";
  const chip = light
    ? "bg-white/20 text-white ring-white/25"
    : "bg-[#0b1220]/10 text-[#0b1220] ring-[#0b1220]/15";
  const chipFlag = light
    ? "bg-black/25 text-white ring-white/25"
    : "bg-[#0b1220]/12 text-[#0b1220] ring-[#0b1220]/20";
  const rail = light ? "bg-black/25" : "bg-[#0b1220]/15";
  const railFill = light ? "bg-white/90" : "bg-[#0b1220]/75";

  return (
    <Link
      href={href}
      className="group block rounded-[26px] p-px focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      style={{ background: "linear-gradient(160deg, rgba(255,255,255,.34), rgba(255,255,255,.04) 45%)" }}
    >
      <article
        className={`card-face flex h-full min-h-[210px] flex-col justify-between rounded-[25px] px-5 py-4 ${ink}`}
        style={{ ["--mesh" as string]: face.art }}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-extrabold leading-tight tracking-tight">{name}</h3>
            <p className={`mt-0.5 text-[11px] font-medium ${dim}`}>
              {last4 ? `Team card •••• ${last4}` : "Team card"}
            </p>
          </div>
          {flagged ? (
            <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${chipFlag}`}>
              {flagged}
            </span>
          ) : (
            <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${chip}`}>
              Active
            </span>
          )}
        </header>

        {/* Chip and contactless mark, where they sit on a real card. */}
        <div className="flex items-center gap-3">
          <Chip />
          <span className={dim}>
            <Contactless />
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums">
              {formatUSD(amountCents)}
            </p>
            <p className={`mt-1 text-[11px] font-medium ${dim}`}>{amountLabel}</p>
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
              <span className={dimmer}>{shareLabel}</span>
              <span className="font-semibold tabular-nums">{pct}%</span>
            </div>
            <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${rail}`}>
              <div className={`h-full rounded-full ${railFill}`} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        )}
      </article>
    </Link>
  );
}
