"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_KEY, nextTheme, parseTheme, type Theme } from "@/lib/theme";

/**
 * Switches between the black and white themes.
 *
 * The icon shows what a click will give you, not what you are on: a sun while
 * the lights are off, a moon while they are on. Showing the current state
 * instead leaves people guessing what the button does.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  // The inline script in the document has already set the attribute; read it
  // back so the button starts correct without a hydration mismatch.
  useEffect(() => {
    setTheme(parseTheme(document.documentElement.dataset.theme));
  }, []);

  function toggle() {
    const next = nextTheme(theme);
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode: the choice just won't outlive the tab.
    }
  }

  const goingToLight = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={goingToLight ? "Switch to light theme" : "Switch to dark theme"}
      title={goingToLight ? "Light theme" : "Dark theme"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-ink-700 bg-ink-900 text-haze-300 transition-colors hover:border-haze-400 hover:text-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow"
    >
      {goingToLight ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2.6v2.3M12 19.1v2.3M21.4 12h-2.3M4.9 12H2.6" />
            <path d="M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6L17 17M7 7L5.4 5.4" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <path
            d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
