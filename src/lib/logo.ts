import type { AppTheme } from "./theme";

export const LOGO_BW = "/donna-logo-bw.png?v=5";
/** App + landing brand mark — black-and-white stencil. */
export const LOGO_LANDING = "/donna-logo-bw.png?v=5";

export type LogoSurface = "app";

export type ThemeFavicons = {
  icon32: string;
  icon64: string;
  apple: string;
};

const FAVICON_BW: ThemeFavicons = {
  icon32: "/favicon-32.png?v=5",
  icon64: "/favicon-64.png?v=5",
  apple: "/apple-touch-icon.png?v=5",
};

const FAVICON_INDIGO: ThemeFavicons = {
  icon32: "/favicon-indigo-32.png?v=2",
  icon64: "/favicon-indigo-64.png?v=2",
  apple: "/apple-touch-icon-indigo.png?v=2",
};

/** App logo is always the black-and-white mark. */
export function logoForTheme(
  _theme: AppTheme,
  _surface: LogoSurface = "app",
): string {
  return LOGO_BW;
}

export function faviconsForTheme(theme: AppTheme): ThemeFavicons {
  return theme === "indigo" ? FAVICON_INDIGO : FAVICON_BW;
}

export function applyFaviconForTheme(theme: AppTheme): void {
  if (typeof document === "undefined") return;

  const favicons = faviconsForTheme(theme);

  function setIcon(rel: string, href: string, sizes?: string) {
    const selector = sizes
      ? `link[rel="${rel}"][sizes="${sizes}"]`
      : `link[rel="${rel}"]:not([sizes])`;

    let link = document.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      if (sizes) link.sizes = sizes;
      document.head.appendChild(link);
    }

    link.href = href;
    if (rel === "icon") link.type = "image/png";
  }

  setIcon("icon", favicons.icon32, "32x32");
  setIcon("icon", favicons.icon64, "64x64");
  setIcon("apple-touch-icon", favicons.apple);
}
