import type { AppTheme } from "./theme";

export const LOGO_BW = "/donna-logo-bw.png?v=3";
export const LOGO_COLOR = "/donna-logo-color.png?v=3";

export type LogoSurface = "app" | "marketing";

/** eink: B&W everywhere. cream: B&W in app, colorful on marketing. indigo: colorful everywhere. */
export function logoForTheme(
  theme: AppTheme,
  surface: LogoSurface = "app",
): string {
  if (theme === "eink") return LOGO_BW;
  if (theme === "indigo") return LOGO_COLOR;
  return surface === "marketing" ? LOGO_COLOR : LOGO_BW;
}
