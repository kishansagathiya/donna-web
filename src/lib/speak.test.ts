import { describe, expect, it } from "vitest";
import { prepareTextForSpeech } from "./speak";

describe("prepareTextForSpeech", () => {
  it("strips https urls", () => {
    expect(prepareTextForSpeech("Check https://example.com/docs for details.")).toBe(
      "Check for details.",
    );
  });

  it("speaks image alt text instead of the url", () => {
    expect(
      prepareTextForSpeech(
        "Here is the bridge:\n\n![Golden Gate Bridge](https://example.com/ggb.jpg)",
      ),
    ).toBe("Here is the bridge: Golden Gate Bridge");
  });

  it("keeps markdown link labels", () => {
    expect(
      prepareTextForSpeech("Open [the guide](https://example.com/guide) when ready."),
    ).toBe("Open the guide when ready.");
  });

  it("speaks slash alternatives as or", () => {
    expect(prepareTextForSpeech("Would you like tea/coffee?")).toBe(
      "Would you like tea or coffee?",
    );
  });

  it("strips markdown emphasis and headings", () => {
    expect(prepareTextForSpeech("## Hello **world** and `code`")).toBe(
      "Hello world and code",
    );
  });
});
