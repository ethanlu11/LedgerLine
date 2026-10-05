import type { BestGuess, GuessStrength } from "@/lib/metrics";
import { WarningIcon } from "./StatusBadge";

/**
 * The best guess, given enough weight that someone scanning the queue lands on
 * it before anything else. The accent rail and tint do the pulling; the
 * confidence label keeps it honest about how much the evidence is worth.
 */
const STRENGTH: Record<GuessStrength, { label: string; pill: string }> = {
  rule: { label: "Your rule", pill: "bg-violet-glow/20 text-violet-glow ring-violet-glow/30" },
  strong: { label: "Strong match", pill: "bg-mint/10 text-mint ring-mint/25" },
  likely: { label: "Likely", pill: "bg-violet-glow/15 text-violet-glow ring-violet-glow/25" },
  weak: { label: "Best available", pill: "bg-ink-800 text-haze-300 ring-ink-700" },
};

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M10 1.5l1.7 4.9 4.8 1.7-4.8 1.7L10 14.7 8.3 9.8 3.5 8.1l4.8-1.7L10 1.5Z" />
      <path d="M15.8 12.6l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" opacity="0.65" />
    </svg>
  );
}

export function GuessCallout({ guess }: { guess: BestGuess | null }) {
  if (!guess) {
    return (
      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-dashed border-ink-700 px-3 py-2.5">
        <span className="mt-px text-haze-400">
          <WarningIcon label="" />
        </span>
        <p className="text-[12px] text-haze-400">
          <span className="font-semibold text-haze-300">No clear owner.</span> Nothing in the ledger points at a
          person or a team — pick one below.
        </p>
      </div>
    );
  }

  const tone = STRENGTH[guess.strength];
  const departed = guess.owner.kind === "person" && guess.owner.departureDate !== null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-violet-glow/25 bg-violet-glow/[0.08]">
      <div className="flex items-start gap-3 border-l-[3px] border-violet-glow px-3 py-2.5">
        <span className="mt-0.5 shrink-0 text-violet-glow">
          <SparkIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[12px] font-medium text-haze-400">Best guess</span>
            <span className="text-[15px] font-extrabold tracking-tight text-ink-50">{guess.owner.name}</span>
            {guess.owner.detail && (
              <span className="text-[12px] text-haze-400">{guess.owner.detail}</span>
            )}
            {departed && (
              <span className="inline-flex items-center gap-1 rounded-[5px] bg-ember/10 px-2 py-0.5 text-[11px] font-semibold text-ember ring-1 ring-inset ring-ember/25">
                <WarningIcon label="" /> Has left
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-haze-300">{guess.reason}</p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-[5px] px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone.pill}`}
        >
          {tone.label}
        </span>
      </div>
    </div>
  );
}
