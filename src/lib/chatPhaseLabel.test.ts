import { describe, expect, it } from "vitest";
import { chatPhaseLabel } from "./chatPhaseLabel";

describe("chatPhaseLabel", () => {
  it("maps browse phases", () => {
    expect(chatPhaseLabel("fetching")).toBe("Reading page…");
    expect(chatPhaseLabel("browsing")).toBe("Browsing page…");
  });

  it("passes through generating for thinking UI", () => {
    expect(chatPhaseLabel("generating")).toBe("generating");
  });
});
