/**
 * Shared by the server layout and the client toggle. It lives in its own plain
 * module on purpose: exporting it from a "use client" file hands the server a
 * client-reference proxy rather than the string, which silently becomes
 * `localStorage.getItem(undefined)`.
 */
export const THEME_KEY = "ledgerline-theme";

/** The pull cord walks this list in order and wraps around. */
export const THEMES = ["blue", "dark", "light"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "blue";

export const THEME_LABEL: Record<Theme, string> = {
  blue: "blue",
  dark: "black",
  light: "white",
};

export function nextTheme(current: Theme): Theme {
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
}

export function parseTheme(value: string | null | undefined): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}
