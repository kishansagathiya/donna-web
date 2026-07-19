import { describe, expect, it } from "vitest";
import { chatPhaseLabel } from "./chatPhaseLabel";

describe("chatPhaseLabel", () => {
  it("maps browse phases with optional host", () => {
    expect(chatPhaseLabel("fetching")).toBe("Reading the page…");
    expect(chatPhaseLabel("fetching", "example.com")).toBe("Reading example.com…");
    expect(chatPhaseLabel("browsing")).toBe("Scraping the page…");
    expect(chatPhaseLabel("browsing", "news.ycombinator.com")).toBe(
      "Scraping news.ycombinator.com…",
    );
  });

  it("maps analyzing and finishing", () => {
    expect(chatPhaseLabel("analyzing")).toBe("Looking at your image…");
    expect(chatPhaseLabel("finishing")).toBe("Putting finishing touches…");
  });

  it("passes through generating for thinking UI", () => {
    expect(chatPhaseLabel("generating")).toBe("generating");
  });
});
