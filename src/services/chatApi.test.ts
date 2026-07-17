import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage, streamChatMessage } from "./chatApi";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

function sseResponse(frames: string[]): Response {
  const body = frames.join("");
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

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

  it("posts web search flag when requested", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        reply: "Hello!",
        sessionId: "sess-1",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendChatMessage("latest news", [], undefined, "talk", undefined, {
      webSearch: true,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.web_search).toBe(true);
  });

  it("throws when not signed in", async () => {
    const { getAccessToken } = await import("./auth");
    vi.mocked(getAccessToken).mockResolvedValueOnce(null);

    await expect(sendChatMessage("hi", [])).rejects.toThrow("Not signed in");
  });
});

describe("streamChatMessage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requires a done event with non-empty reply", async () => {
    const onDone = vi.fn();
    const onChunk = vi.fn();
    const fetchMock = vi.fn(async () =>
      sseResponse([
        'event: session\ndata: {"session_id":"sess-1"}\n\n',
        'event: phase\ndata: "generating"\n\n',
        'event: chunk\ndata: {"text":"Hello"}\n\n',
        'event: done\ndata: {"reply":"Hello","session_id":"sess-1"}\n\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await streamChatMessage("hi", [], undefined, { onDone, onChunk });

    expect(onChunk).toHaveBeenCalledWith("Hello");
    expect(onDone).toHaveBeenCalledWith("Hello", "sess-1", expect.any(Object));
  });

  it("throws when the stream ends without done", async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse(['event: session\ndata: {"session_id":"sess-1"}\n\n']),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      streamChatMessage("hi", [], undefined, {}),
    ).rejects.toThrow("Connection closed before Donna finished responding");
  });

  it("throws when done reply is empty", async () => {
    const onError = vi.fn();
    const fetchMock = vi.fn(async () =>
      sseResponse([
        'event: session\ndata: {"session_id":"sess-1"}\n\n',
        'event: done\ndata: {"reply":"","session_id":"sess-1"}\n\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      streamChatMessage("hi", [], undefined, { onError }),
    ).rejects.toThrow("empty reply");
    expect(onError).toHaveBeenCalled();
  });

  it("accepts raw phase payloads", async () => {
    const onPhase = vi.fn();
    const fetchMock = vi.fn(async () =>
      sseResponse([
        'event: session\ndata: {"session_id":"sess-1"}\n\n',
        "event: phase\ndata: generating\n\n",
        'event: chunk\ndata: {"text":"ok"}\n\n',
        'event: done\ndata: {"reply":"ok","session_id":"sess-1"}\n\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await streamChatMessage("hi", [], undefined, { onPhase });
    expect(onPhase).toHaveBeenCalledWith("generating");
  });
});
