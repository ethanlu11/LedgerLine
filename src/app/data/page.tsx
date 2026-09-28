import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SpendBars } from "@/components/SpendBars";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { OrphanedArea } from "@/components/charts/OrphanedArea";
import { PriceDrift } from "@/components/charts/PriceDrift";
import { StackedColumns } from "@/components/charts/StackedColumns";
import { TeamLines } from "@/components/charts/TeamLines";
import { SERIES } from "@/components/charts/tokens";
import { EmptyState, StatTile, StatTileGrid } from "@/components/ui";
import { formatDate, formatUSD } from "@/lib/format";
import { getDataPage } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const { now, teams, series, topVendors, priceDrift, monthlyRunRateCents, totalCents } =
    await getDataPage();

  if (totalCents === 0) {
    return (
      <>
        <Breadcrumbs items={[{ label: "Teams", href: "/" }, { label: "Data" }]} />
        <EmptyState>
          Nothing to plot yet. Run <code className="rounded bg-ink-800 px-1.5 py-0.5 text-ink-50">npm run seed</code>{" "}
          and refresh.
        </EmptyState>
      </>
    );
  }

  const thisMonth = series[series.length - 1];
  const lastMonth = series[series.length - 2];
  const delta =
    lastMonth && lastMonth.totalCents > 0
      ? (thisMonth.totalCents - lastMonth.totalCents) / lastMonth.totalCents
      : 0;
  const orphanedTotal = series.reduce((t, p) => t + p.orphanedCents, 0);

  return (
    <>
      <Breadcrumbs items={[{ label: "Teams", href: "/" }, { label: "Data" }]} />

      <div className="mb-6">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Data</h1>
        <p className="mt-1 max-w-[70ch] text-[13px] text-haze-400">
          Two years of charges, plotted. Everything below is drawn from the same ledger as the rest of the app, as
          of {formatDate(now)}.
        </p>
      </div>

      <StatTileGrid className="mb-6">
        <StatTile
          label="Committed each month"
          value={formatUSD(monthlyRunRateCents)}
          sub="Live subscriptions at today's prices"
        />
        <StatTile label="This month so far" value={formatUSD(thisMonth.totalCents)} />
        <StatTile
          label="Against last month"
          value={`${delta >= 0 ? "+" : "−"}${Math.abs(delta * 100).toFixed(0)}%`}
          tone={delta > 0 ? "warning" : "accent"}
          sub={lastMonth ? `${formatUSD(lastMonth.totalCents)} in ${lastMonth.label}` : undefined}
        />
        <StatTile
          label="Spent on people who left"
          value={formatUSD(orphanedTotal)}
          tone={orphanedTotal > 0 ? "warning" : "default"}
          sub="Across this window"
        />
      </StatTileGrid>

      <div className="space-y-4">
        <StackedColumns series={series} />
        <TeamLines series={series} teams={teams} />
        <OrphanedArea series={series} />

        <div className="grid items-start gap-4 xl:grid-cols-2 [&>*]:min-w-0">
          <ChartFrame
            title="Where the money concentrates"
            subtitle="Top ten vendors by total spend, all time."
            table={{
              columns: ["Vendor", "Total", "Share"],
              rows: topVendors.map((v) => [
                v.label,
                formatUSD(v.cents),
                `${Math.round(v.share * 100)}%`,
              ]),
            }}
          >
            {/* Nominal categories, so every bar takes the same slot-1 hue. */}
            <SpendBars slices={topVendors} color={SERIES[0]} />
          </ChartFrame>

          <PriceDrift rows={priceDrift} />
        </div>
      </div>
    </>
  );
}
