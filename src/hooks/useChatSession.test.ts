import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatSession } from "./useChatSession";

vi.mock("../services/chatApi", () => ({
  streamChatMessage: vi.fn(),
}));

describe("useChatSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends user and assistant messages on successful stream", async () => {
    const { streamChatMessage } = await import("../services/chatApi");
    vi.mocked(streamChatMessage).mockImplementation(
      async (_message, _history, _sessionId, callbacks) => {
        callbacks.onSessionId?.("sess-1");
        callbacks.onChunk?.("Hello");
        callbacks.onDone?.("Hello there", "sess-1");
      },
    );

    const { result } = renderHook(() => useChatSession("talk"));

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    await waitFor(() => {
      expect(result.current.busy).toBe(false);
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[0]).toMatchObject({
      role: "user",
      content: "hi",
    });
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "Hello there",
      streaming: false,
    });
  });

  it("stores only the user message in notes mode", async () => {
    const { streamChatMessage } = await import("../services/chatApi");
    vi.mocked(streamChatMessage).mockImplementation(
      async (_message, _history, _sessionId, callbacks) => {
        callbacks.onDone?.("", "sess-notes");
      },
    );

    const { result } = renderHook(() => useChatSession("notes"));

    await act(async () => {
      await result.current.sendMessage("remember milk");
    });

    await waitFor(() => {
      expect(result.current.busy).toBe(false);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("remember milk");
  });
});
