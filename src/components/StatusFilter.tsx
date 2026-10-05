import Link from "next/link";

export type StatusFilterValue = "all" | "active" | "departed";

export function parseStatusFilter(value: string | string[] | undefined): StatusFilterValue {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "active" || v === "departed" ? v : "all";
}

/** All / Active / Departed tabs, driven by the ?status= query param. */
export function StatusFilter({
  basePath,
  current,
  counts,
}: {
  basePath: string;
  current: StatusFilterValue;
  counts: Record<StatusFilterValue, number>;
}) {
  const tabs: Array<{ value: StatusFilterValue; label: string }> = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "departed", label: "Departed" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter people by status"
      className="inline-flex rounded-full border border-ink-800 bg-ink-900 p-1 text-[13px]"
    >
      {tabs.map((tab) => {
        const selected = tab.value === current;
        return (
          <Link
            key={tab.value}
            role="tab"
            aria-selected={selected}
            href={tab.value === "all" ? basePath : `${basePath}?status=${tab.value}`}
            className={`rounded-[5px] px-3.5 py-1 font-semibold transition-colors ${
              selected ? "bg-ink-50 text-ink-950" : "text-haze-400 hover:text-ink-50"
            }`}
          >
            {tab.label}{" "}
            <span className={selected ? "text-ink-600" : "text-ink-600"}>{counts[tab.value]}</span>
          </Link>
        );
      })}
    </div>
  );
}
