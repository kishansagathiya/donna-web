import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage } from "./chatApi";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

describe("sendChatMessage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts chat payload with auth header", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        reply: "Hello!",
        sessionId: "sess-1",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const reply = await sendChatMessage("hi", [], undefined, "talk");

    expect(reply).toEqual({ reply: "Hello!", sessionId: "sess-1" });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/chat");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-token",
    );

    const body = JSON.parse(String(init.body));
    expect(body.message).toBe("hi");
    expect(body.mode).toBe("talk");
    expect(body.history).toEqual([]);
  });

  it("throws when not signed in", async () => {
    const { getAccessToken } = await import("./auth");
    vi.mocked(getAccessToken).mockResolvedValueOnce(null);

    await expect(sendChatMessage("hi", [])).rejects.toThrow("Not signed in");
  });
});
