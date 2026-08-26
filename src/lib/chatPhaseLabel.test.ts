import { describe, expect, it } from "vitest";
import {
  chatPhaseLabel,
  coerceChatPhase,
  isGeneratingPhase,
} from "./chatPhaseLabel";

describe("chatPhaseLabel", () => {
  it("maps concrete browse / fetch / image phases", () => {
    expect(chatPhaseLabel("fetching")).toBe("Reading this page…");
    expect(chatPhaseLabel("fetching", "example.com")).toBe(
      "Reading example.com…",
    );
    expect(chatPhaseLabel("browsing")).toBe("Browsing this site…");
    expect(chatPhaseLabel("browsing", "news.ycombinator.com")).toBe(
      "Browsing news.ycombinator.com…",
    );
    expect(chatPhaseLabel("analyzing")).toBe("Analyzing images…");
    expect(chatPhaseLabel("loading_image")).toBe("Loading image…");
    expect(chatPhaseLabel("loading_image", "upload.wikimedia.org")).toBe(
      "Loading image from upload.wikimedia.org…",
    );
  });

  it("hides vague phases", () => {
    expect(chatPhaseLabel("generating")).toBeNull();
    expect(chatPhaseLabel("finishing")).toBeNull();
    expect(chatPhaseLabel('{"phase":"generating"}')).toBeNull();
    expect(isGeneratingPhase('{"phase":"generating"}')).toBe(true);
  });

  it("unwraps JSON browse payloads", () => {
    expect(coerceChatPhase('{"phase":"browsing","host":"example.com"}')).toEqual(
      {
        phase: "browsing",
        host: "example.com",
      },
    );
    expect(chatPhaseLabel('{"phase":"browsing","host":"example.com"}')).toBe(
      "Browsing example.com…",
    );
  });
});
