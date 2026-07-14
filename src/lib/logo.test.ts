import { describe, expect, it } from "vitest";
import {
  LOGO_BW,
  LOGO_INDIGO,
  LOGO_LANDING,
  faviconsForTheme,
  logoForTheme,
} from "./logo";

describe("logoForTheme", () => {
  it("uses the black-and-white logo for e-ink", () => {
    expect(logoForTheme("eink")).toBe(LOGO_BW);
  });

  it("uses the indigo logo for indigo", () => {
    expect(logoForTheme("indigo")).toBe(LOGO_INDIGO);
  });
});

describe("LOGO_LANDING", () => {
  it("points at a landing logo asset", () => {
    expect(LOGO_LANDING).toMatch(/donna-logo/);
  });
});

describe("faviconsForTheme", () => {
  it("uses indigo favicons for the indigo theme", () => {
    expect(faviconsForTheme("indigo").icon32).toContain("favicon-indigo-32");
  });

  it("uses default favicons for e-ink", () => {
    expect(faviconsForTheme("eink").icon32).toContain("favicon-32");
  });
});
