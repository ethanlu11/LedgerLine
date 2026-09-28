const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatUSD(cents: number): string {
  return usd.format(cents / 100);
}

/** "+$5.00" / "−$2.00" / "$0.00" */
export function formatSignedUSD(cents: number): string {
  if (cents === 0) return usd.format(0);
  return (cents > 0 ? "+" : "−") + usd.format(Math.abs(cents) / 100);
}

/** "+25.0%" / "−10.0%" / "0.0%" */
export function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

// Dates are stored at noon UTC and always displayed in UTC so they never drift a day.
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatMonthYear = (d: Date) => monthFmt.format(d);

export function formatMonths(n: number): string {
  if (n < 1) return "<1 month";
  return n === 1 ? "1 month" : `${n} months`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
