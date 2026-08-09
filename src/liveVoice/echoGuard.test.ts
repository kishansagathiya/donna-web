import { describe, expect, it } from "vitest";
import { looksLikeEcho } from "./echoGuard";

describe("looksLikeEcho", () => {
  it("detects speaker loopback of Donna's line", () => {
    expect(
      looksLikeEcho("I ready when you are", "I'm ready when you are!"),
    ).toBe(true);
  });

  it("allows a real user follow-up", () => {
    expect(
      looksLikeEcho(
        "Can you remind me about the dentist tomorrow",
        "I'm ready when you are!",
      ),
    ).toBe(false);
  });

  it("ignores very short user fragments", () => {
    expect(looksLikeEcho("ok", "I'm ready when you are!")).toBe(false);
  });
});
