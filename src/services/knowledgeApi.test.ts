import { beforeEach, describe, expect, it, vi } from "vitest";
import { ingestMessageForKind, ingestText } from "./knowledgeApi";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

describe("knowledgeApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ingestText posts trimmed text payload", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        source_id: "src-1",
        status: "queued",
        asset_kind: "text",
        title: "My note",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await ingestText("  hello world  ", "My note");
    expect(result.source_id).toBe("src-1");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.text).toBe("hello world");
    expect(body.title).toBe("My note");
  });

  it("maps ingest messages by asset kind", () => {
    expect(ingestMessageForKind("image")).toBe("Saved photo to memory");
    expect(ingestMessageForKind("audio")).toBe("Saved audio to memory");
    expect(ingestMessageForKind("unknown")).toBe("Saved document to memory");
    expect(ingestMessageForKind("link", "twitter")).toBe("Saved tweet to memory");
  });
});
