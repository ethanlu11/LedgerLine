"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_KEY, THEME_LABEL, nextTheme, parseTheme, type Theme } from "@/lib/theme";

/**
 * A pull cord hanging from the top of the page. Each pull draws the string down
 * and advances the theme: blue → black → white → blue.
 *
 * The cord is absolutely positioned so it can hang past the header without
 * making the header taller; the button keeps a small box in the flex row.
 */
export function LampToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [pulling, setPulling] = useState(false);

  // The inline script in the document has already set the attribute; read it
  // back so the button starts in the right state without a hydration mismatch.
  useEffect(() => {
    setTheme(parseTheme(document.documentElement.dataset.theme));
  }, []);

  function pull() {
    const next = nextTheme(theme);
    setPulling(true);
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode: the choice just won't outlive the tab.
    }
    // Held just past the 230ms draw, so the cord reaches full stretch before
    // it is released into the springy return.
    window.setTimeout(() => setPulling(false), 300);
  }

  // The bulb fills in on white and glows on blue, so the bead itself says which
  // of the three you are on rather than only what comes next.
  const bead: Record<Theme, string> = {
    blue: "border-violet-glow/60 bg-violet-glow/20 text-violet-glow",
    dark: "border-ink-600 bg-ink-800 text-haze-300 group-hover:border-haze-400 group-hover:text-ink-50",
    light: "border-amber-soft/50 bg-amber-soft/15 text-amber-soft",
  };

  return (
    <button
      type="button"
      onClick={pull}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[nextTheme(theme)]}.`}
      title={`${THEME_LABEL[theme]} — click for ${THEME_LABEL[nextTheme(theme)]}`}
      data-pulling={pulling}
      className="group relative h-9 w-7 shrink-0 cursor-pointer focus:outline-none"
    >
      <span className="absolute left-1/2 top-[-15px] flex -translate-x-1/2 flex-col items-center">
        {/* The string. Runs up out of the header so it reads as hanging. */}
        <span
          aria-hidden="true"
          className="cord-line h-[64px] w-[2px] rounded-full bg-ink-600 transition-colors group-hover:bg-haze-400"
        />
        <span
          aria-hidden="true"
          className={`cord-bead flex h-[26px] w-[26px] items-center justify-center rounded-full border transition-colors group-focus-visible:ring-2 group-focus-visible:ring-violet-glow ${bead[theme]}`}
        >
          <svg viewBox="0 0 16 16" className="h-[15px] w-[15px]" fill="none">
            <path
              d="M8 1.6a4.2 4.2 0 0 0-2.5 7.6c.4.3.6.7.7 1.2h3.6c.1-.5.3-.9.7-1.2A4.2 4.2 0 0 0 8 1.6Z"
              fill={theme === "dark" ? "none" : "currentColor"}
              fillOpacity={theme === "dark" ? 0 : 0.35}
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path d="M6.4 12.4h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
      </span>
    </button>
  );
}
