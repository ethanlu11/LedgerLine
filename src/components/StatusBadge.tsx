import type { SubscriptionStatus } from "@/lib/metrics";
import { formatDate } from "@/lib/format";

const pill =
  "inline-flex items-center whitespace-nowrap rounded-[5px] px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset";

/** Active / Departed, derived from departureDate. */
export function PersonStatusBadge({
  departureDate,
  showDate = true,
}: {
  departureDate: Date | null;
  showDate?: boolean;
}) {
  if (!departureDate) {
    return <span className={`${pill} bg-mint/10 text-mint ring-mint/25`}>Active</span>;
  }
  return (
    <span className={`${pill} bg-ink-700 text-haze-300 ring-ink-600`}>
      Departed{showDate ? ` · ${formatDate(departureDate)}` : ""}
    </span>
  );
}

const SUB_STYLES: Record<SubscriptionStatus, string> = {
  Active: "bg-mint/10 text-mint ring-mint/25",
  Cancelled: "bg-ink-700 text-haze-300 ring-ink-600",
  Orphaned: "bg-ember/10 text-ember ring-ember/30",
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <span className={`${pill} ${SUB_STYLES[status]}`}>{status}</span>;
}

export function WarningIcon({ label }: { label: string }) {
  return (
    <span title={label} className="inline-flex text-ember">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" role="img" aria-label={label}>
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
