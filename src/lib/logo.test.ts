import { describe, expect, it } from "vitest";
import { LOGO_BW, LOGO_COLOR, logoForTheme } from "./logo";

describe("logoForTheme", () => {
  it("uses the black-and-white logo for e-ink everywhere", () => {
    expect(logoForTheme("eink", "app")).toBe(LOGO_BW);
    expect(logoForTheme("eink", "marketing")).toBe(LOGO_BW);
  });

  it("uses the black-and-white logo for cream in the app", () => {
    expect(logoForTheme("cream", "app")).toBe(LOGO_BW);
  });

  it("uses the colorful logo for cream on marketing pages", () => {
    expect(logoForTheme("cream", "marketing")).toBe(LOGO_COLOR);
  });

  it("uses the colorful logo for indigo everywhere", () => {
    expect(logoForTheme("indigo", "app")).toBe(LOGO_COLOR);
    expect(logoForTheme("indigo", "marketing")).toBe(LOGO_COLOR);
  });
});
