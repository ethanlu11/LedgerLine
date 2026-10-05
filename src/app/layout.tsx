import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DEFAULT_THEME, THEME_KEY, THEMES } from "@/lib/theme";
import { getUnassignedSummary } from "@/lib/metrics";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "LedgerLine",
  description: "Company spend by team, by person, by subscription.",
};

// Runs before first paint, so a light-mode viewer never sees a dark flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});document.documentElement.dataset.theme=${JSON.stringify(
  THEMES,
)}.indexOf(t)>-1?t:${JSON.stringify(DEFAULT_THEME)}}catch(e){document.documentElement.dataset.theme=${JSON.stringify(
  DEFAULT_THEME,
)}}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let waiting = 0;
  try {
    waiting = (await getUnassignedSummary()).groupCount;
  } catch {
    waiting = 0;
  }

  return (
    // data-theme is deliberately not rendered here: the inline script below owns
    // it, and React would otherwise reassert "dark" during hydration.
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-ink-950 font-[family-name:var(--font-manrope)] text-ink-50 antialiased">
        {/* First thing in the body so the theme is set before anything paints.
            Next strips raw <script> from a root layout's <head>, so it lives here. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <header className="sticky top-0 z-10 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-5">
              {/* The mascot stands on the baseline next to the wordmark rather
                  than sitting in a box, so the lockup reads as one thing. The
                  negative margin lets him overhang the header without growing it. */}
              <Link href="/" className="flex shrink-0 items-end gap-2" aria-label="LedgerLine, home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-mark.png"
                  alt=""
                  width={52}
                  height={52}
                  className="logo-mark -my-2 -mb-1.5 h-[42px] w-[42px] shrink-0 sm:h-[52px] sm:w-[52px]"
                />
                {/* On a phone the mascot carries the brand on his own; the
                    wordmark would push the nav off the edge. */}
                <span className="hidden pb-0.5 text-[18px] font-extrabold tracking-tight sm:inline">
                  LedgerLine
                </span>
              </Link>
              <nav className="flex items-center gap-1 text-[13px] font-semibold">
                <Link href="/" className="rounded-lg px-2.5 py-1.5 text-haze-400 transition-colors hover:text-ink-50">
                  Teams
                </Link>
                <Link
                  href="/review"
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-haze-400 transition-colors hover:text-ink-50"
                >
                  Review
                  {waiting > 0 && (
                    <span
                      className="rounded-full bg-ember px-1.5 py-0.5 text-[11px] font-bold leading-none text-ink-950"
                      aria-label={`${waiting} waiting for review`}
                    >
                      {waiting}
                    </span>
                  )}
                </Link>
                <Link
                  href="/data"
                  className="rounded-lg px-2.5 py-1.5 text-haze-400 transition-colors hover:text-ink-50"
                >
                  Data
                </Link>
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-5">
              <span className="hidden text-xs text-haze-400 sm:block">Mock data · no bank connection</span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
