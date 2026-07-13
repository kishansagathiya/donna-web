import { THEME_STORAGE_KEY } from "../config";
import { applyFaviconForTheme } from "./logo";

export { THEME_STORAGE_KEY };

export type AppTheme = "cream" | "indigo" | "eink";

export const APP_THEMES: Record<
  AppTheme,
  { label: string; description: string }
> = {
  cream: { label: "Cream & gold", description: "Warm, calm palette" },
  indigo: { label: "Indigo", description: "Classic blue accent" },
  eink: { label: "E-ink", description: "Black & white reader" },
};

export function isAppTheme(value: string | null): value is AppTheme {
  return value === "cream" || value === "indigo" || value === "eink";
}

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "cream";
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isAppTheme(stored) ? stored : "cream";
}

export function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function storeTheme(theme: AppTheme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function initTheme(): AppTheme {
  const theme = getStoredTheme();
  applyTheme(theme);
  applyFaviconForTheme(theme);
  return theme;
}
