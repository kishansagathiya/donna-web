import { describe, expect, it } from "vitest";
import {
  LOGO_BW,
  LOGO_LANDING,
  faviconsForTheme,
  logoForTheme,
} from "./logo";

describe("logoForTheme", () => {
  it("uses the black-and-white logo for every theme", () => {
    expect(logoForTheme("eink")).toBe(LOGO_BW);
    expect(logoForTheme("indigo")).toBe(LOGO_BW);
  });
});

describe("LOGO_LANDING", () => {
  it("points at the black-and-white logo asset", () => {
    expect(LOGO_LANDING).toContain("donna-logo-bw");
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
