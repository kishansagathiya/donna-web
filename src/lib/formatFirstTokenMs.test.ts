import { describe, expect, it } from "vitest";
import {
  formatChatTiming,
  formatFirstTokenMs,
  formatLatencyMs,
} from "./formatFirstTokenMs";

describe("formatLatencyMs", () => {
  it("formats sub-second latency in milliseconds", () => {
    expect(formatLatencyMs(420)).toBe("420ms");
    expect(formatLatencyMs(999)).toBe("999ms");
  });

  it("formats seconds with one decimal under 10s", () => {
    expect(formatLatencyMs(1000)).toBe("1.0s");
    expect(formatLatencyMs(1840)).toBe("1.8s");
  });

  it("formats longer latencies without a decimal", () => {
    expect(formatLatencyMs(10_400)).toBe("10s");
  });

  it("returns empty for invalid values", () => {
    expect(formatLatencyMs(-1)).toBe("");
    expect(formatLatencyMs(Number.NaN)).toBe("");
  });
});

describe("formatFirstTokenMs", () => {
  it("labels first-token latency", () => {
    expect(formatFirstTokenMs(420)).toBe("420ms to first token");
    expect(formatFirstTokenMs(1840)).toBe("1.8s to first token");
  });
});

describe("formatChatTiming", () => {
  it("combines first-token and total latency", () => {
    expect(
      formatChatTiming({ firstTokenMs: 420, totalMs: 2100 }),
    ).toBe("420ms to first token · 2.1s total");
  });

  it("shows only the available timing fields", () => {
    expect(formatChatTiming({ firstTokenMs: 420 })).toBe(
      "420ms to first token",
    );
    expect(formatChatTiming({ totalMs: 2100 })).toBe("2.1s total");
    expect(formatChatTiming({})).toBe("");
  });
});
