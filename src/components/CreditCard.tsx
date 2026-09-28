import { CardNetworkMark, parseNetwork } from "./CardNetwork";

/**
 * A card face with the anatomy a real one has: chip, contactless mark, issuer,
 * product line, last four and the network mark.
 *
 * The issuer is LedgerLine throughout. These are fabricated cards for fictional
 * employees, so putting a real bank's name on them would assert something
 * untrue about who issued them — the card *design language* is the point, not
 * anyone's trademark.
 *
 * Every face is dark on purpose: the card text is white, and white only stays
 * legible over a dark field. The silver and white faces this replaced pushed
 * their smallest line down to 2.6:1. Each ramp is checked at its LIGHTEST end,
 * where white has the least to work with — the worst case is 5.88:1.
 */
export type CardProduct = "cash" | "unlimited" | "travel" | "standard" | "platinum";

export const CARD_PRODUCTS: CardProduct[] = ["cash", "unlimited", "travel", "standard", "platinum"];

export function parseProduct(value: string | null | undefined): CardProduct {
  return CARD_PRODUCTS.includes(value as CardProduct) ? (value as CardProduct) : "standard";
}

interface Design {
  name: string;
  /** Layered fields: a base ramp plus two soft diagonal sweeps. */
  art: string;
}

const DESIGNS: Record<CardProduct, Design> = {
  cash: {
    name: "Cash Rewards",
    art: "linear-gradient(116deg, rgba(255,255,255,.20) 0 16%, rgba(255,255,255,.04) 30%, transparent 42%, rgba(255,255,255,.12) 56%, transparent 72%), radial-gradient(130% 150% at 86% 4%, #ec5568 0%, transparent 62%), linear-gradient(145deg, #c8102e 0%, #8d0b23 100%)",
  },
  unlimited: {
    name: "Unlimited Cash",
    art: "linear-gradient(116deg, rgba(255,255,255,.18) 0 16%, rgba(255,255,255,.04) 30%, transparent 42%, rgba(255,255,255,.11) 56%, transparent 72%), radial-gradient(130% 150% at 86% 4%, #129054 0%, transparent 62%), linear-gradient(145deg, #0b6b3f 0%, #053d23 100%)",
  },
  travel: {
    name: "Travel Rewards",
    art: "linear-gradient(116deg, rgba(255,255,255,.18) 0 16%, rgba(255,255,255,.04) 30%, transparent 42%, rgba(255,255,255,.10) 56%, transparent 72%), radial-gradient(130% 150% at 86% 4%, #2258b8 0%, transparent 62%), linear-gradient(145deg, #0d2f6e 0%, #05173b 100%)",
  },
  standard: {
    name: "Standard",
    art: "linear-gradient(116deg, rgba(255,255,255,.16) 0 16%, rgba(255,255,255,.04) 30%, transparent 42%, rgba(255,255,255,.10) 56%, transparent 72%), radial-gradient(130% 150% at 86% 4%, #67717f 0%, transparent 62%), linear-gradient(145deg, #4b5563 0%, #22272f 100%)",
  },
  platinum: {
    name: "Corporate Platinum",
    art: "linear-gradient(116deg, rgba(255,255,255,.13) 0 16%, rgba(255,255,255,.03) 30%, transparent 42%, rgba(255,255,255,.07) 56%, transparent 72%), radial-gradient(130% 150% at 86% 6%, #52525e 0%, transparent 62%), linear-gradient(145deg, #34343e 0%, #101015 100%)",
  },
};

export const productName = (p: CardProduct) => DESIGNS[p].name;

/** The gold contact plate. */
function Chip() {
  return (
    <svg viewBox="0 0 34 26" className="h-[26px] w-[34px]" aria-hidden="true">
      <rect x="0.5" y="0.5" width="33" height="25" rx="4" fill="#d8b45c" />
      <g stroke="#9b7c31" strokeWidth="1.1" fill="none">
        <path d="M11 .5v25M23 .5v25M.5 8.5h33M.5 17.5h33" />
        <rect x="11" y="8.5" width="12" height="9" />
      </g>
    </svg>
  );
}

/** The contactless waves, drawn rotated so they read as radiating sideways. */
function Contactless() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M6.5 5.5a7 7 0 0 1 0 9" />
        <path d="M10 3a10.5 10.5 0 0 1 0 14" opacity="0.75" />
        <path d="M13.5 .8a14 14 0 0 1 0 18.4" opacity="0.5" />
      </g>
    </svg>
  );
}

export function CreditCard({
  product,
  network,
  last4,
  holder,
  footnote,
  className = "",
}: {
  product: CardProduct;
  network: string | null;
  last4: string;
  /** Embossed name line — a person, or the team that holds the card. */
  holder: string;
  footnote?: string;
  className?: string;
}) {
  const design = DESIGNS[product];

  return (
    <div
      className={`relative flex aspect-[1.586/1] w-full flex-col justify-between rounded-[14px] p-[7%] text-white shadow-lg ring-1 ring-black/10 ${className}`}
      style={{ backgroundImage: design.art }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.14em]">LedgerLine</span>
        <span className="opacity-90">
          <Contactless />
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <Chip />
        <span className="text-[11px] font-semibold">{design.name}</span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold tabular-nums tracking-[0.12em]">•••• {last4}</p>
          <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.1em] text-white/90">{holder}</p>
          {footnote && <p className="truncate text-[10px] text-white/80">{footnote}</p>}
        </div>
        {network && (
          <span className="shrink-0">
            <CardNetworkMark network={parseNetwork(network)} height={15} />
          </span>
        )}
      </div>
    </div>
  );
}
