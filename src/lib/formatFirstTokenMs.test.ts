import { describe, expect, it } from "vitest";
import { formatFirstTokenMs } from "./formatFirstTokenMs";

describe("formatFirstTokenMs", () => {
  it("formats sub-second latency in milliseconds", () => {
    expect(formatFirstTokenMs(420)).toBe("420ms to first token");
    expect(formatFirstTokenMs(999)).toBe("999ms to first token");
  });

  it("formats seconds with one decimal under 10s", () => {
    expect(formatFirstTokenMs(1000)).toBe("1.0s to first token");
    expect(formatFirstTokenMs(1840)).toBe("1.8s to first token");
  });

  it("formats longer latencies without a decimal", () => {
    expect(formatFirstTokenMs(10_400)).toBe("10s to first token");
  });

  it("returns empty for invalid values", () => {
    expect(formatFirstTokenMs(-1)).toBe("");
    expect(formatFirstTokenMs(Number.NaN)).toBe("");
  });
});
