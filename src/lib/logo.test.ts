import { describe, expect, it } from "vitest";
import {
  LOGO_BW,
  LOGO_COLOR,
  LOGO_INDIGO,
  faviconsForTheme,
  logoForTheme,
} from "./logo";

describe("logoForTheme", () => {
  it("uses the black-and-white logo for e-ink everywhere", () => {
    expect(logoForTheme("eink", "app")).toBe(LOGO_BW);
    expect(logoForTheme("eink", "marketing")).toBe(LOGO_BW);
  });

  it("uses the black-and-white logo for cream in the app", () => {
    expect(logoForTheme("cream", "app")).toBe(LOGO_BW);
  });

  it("uses the warm colorful logo for cream on marketing pages", () => {
    expect(logoForTheme("cream", "marketing")).toBe(LOGO_COLOR);
  });

  it("uses the indigo logo for indigo everywhere", () => {
    expect(logoForTheme("indigo", "app")).toBe(LOGO_INDIGO);
    expect(logoForTheme("indigo", "marketing")).toBe(LOGO_INDIGO);
  });
});

describe("faviconsForTheme", () => {
  it("uses indigo favicons for the indigo theme", () => {
    expect(faviconsForTheme("indigo").icon32).toContain("favicon-indigo-32");
  });

  it("uses default favicons for cream and e-ink", () => {
    expect(faviconsForTheme("cream").icon32).toContain("favicon-32");
    expect(faviconsForTheme("eink").icon32).toContain("favicon-32");
  });
});
