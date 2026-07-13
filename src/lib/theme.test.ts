import { afterEach, describe, expect, it } from "vitest";
import {
  applyTheme,
  getStoredTheme,
  isAppTheme,
  storeTheme,
  type AppTheme,
  THEME_STORAGE_KEY,
} from "./theme";

describe("isAppTheme", () => {
  it.each(["cream", "indigo", "eink"])('returns true for "%s"', (value) => {
    expect(isAppTheme(value)).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isAppTheme("dark")).toBe(false);
    expect(isAppTheme("")).toBe(false);
    expect(isAppTheme(null)).toBe(false);
  });
});

describe("getStoredTheme", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it.each<[AppTheme]>([["cream"], ["indigo"], ["eink"]])(
    'returns "%s" when it is stored',
    (theme) => {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      expect(getStoredTheme()).toBe(theme);
    },
  );

  it('falls back to "cream" for invalid stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, "neon");
    expect(getStoredTheme()).toBe("cream");
  });

  it('falls back to "cream" when nothing is stored', () => {
    expect(getStoredTheme()).toBe("cream");
  });
});

describe("applyTheme", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it.each<[AppTheme]>([["cream"], ["indigo"], ["eink"]])(
    'sets data-theme to "%s"',
    (theme) => {
      applyTheme(theme);
      expect(document.documentElement.dataset.theme).toBe(theme);
    },
  );
});

describe("storeTheme", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it.each<[AppTheme]>([["cream"], ["indigo"], ["eink"]])(
    'writes "%s" to localStorage',
    (theme) => {
      storeTheme(theme);
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(theme);
    },
  );
});
