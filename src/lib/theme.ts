import { THEME_STORAGE_KEY } from "../config";

export type AppTheme = "cream" | "indigo";

export const APP_THEMES: Record<
  AppTheme,
  { label: string; description: string }
> = {
  cream: { label: "Cream & gold", description: "Warm, calm palette" },
  indigo: { label: "Indigo", description: "Classic blue accent" },
};

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "cream";
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "indigo" ? "indigo" : "cream";
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
  return theme;
}
