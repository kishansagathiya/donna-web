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

  it("uses the black-and-white logo for cream in the app", () => {
    expect(logoForTheme("cream")).toBe(LOGO_BW);
  });

  it("uses the indigo logo for indigo", () => {
    expect(logoForTheme("indigo")).toBe(LOGO_INDIGO);
  });
});

describe("LOGO_LANDING", () => {
  it("is a dedicated colorful landing asset", () => {
    expect(LOGO_LANDING).toContain("donna-logo-landing");
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
