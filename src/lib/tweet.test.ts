import { describe, expect, it } from "vitest";
import { parseTweetUrl } from "./tweet";

describe("parseTweetUrl", () => {
  it("parses x.com and twitter.com status URLs", () => {
    expect(
      parseTweetUrl("https://x.com/jackyk02/status/2089421448784023553"),
    ).toEqual({
      url: "https://x.com/jackyk02/status/2089421448784023553",
      handle: "jackyk02",
      id: "2089421448784023553",
    });
    expect(
      parseTweetUrl(
        "https://twitter.com/jackyk02/status/2074969820739805275?s=20",
      ),
    ).toEqual({
      url: "https://x.com/jackyk02/status/2074969820739805275",
      handle: "jackyk02",
      id: "2074969820739805275",
    });
  });

  it("rejects non-tweet URLs", () => {
    expect(parseTweetUrl("https://x.com/jackyk02")).toBeNull();
    expect(parseTweetUrl("https://arxiv.org/abs/2607.05391")).toBeNull();
    expect(parseTweetUrl(undefined)).toBeNull();
  });
});
