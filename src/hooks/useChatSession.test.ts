import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatSession } from "./useChatSession";

const streamChatMessage = vi.fn();
const truncateConversationTurns = vi.fn();
const submitTurnFeedback = vi.fn();

vi.mock("../services/chatApi", async () => {
  const actual = await vi.importActual<typeof import("../services/chatApi")>(
    "../services/chatApi",
  );
  return {
    ...actual,
    streamChatMessage: (...args: unknown[]) => streamChatMessage(...args),
  };
});

vi.mock("../services/conversationsApi", () => ({
  truncateConversationTurns: (...args: unknown[]) =>
    truncateConversationTurns(...args),
  submitTurnFeedback: (...args: unknown[]) => submitTurnFeedback(...args),
}));

describe("useChatSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    truncateConversationTurns.mockResolvedValue(undefined);
    submitTurnFeedback.mockResolvedValue(undefined);
  });

  it("appends user and assistant messages on successful stream", async () => {
    streamChatMessage.mockImplementation(
      async (_message, _history, _sessionId, callbacks) => {
        callbacks.onSessionId?.("sess-1");
        callbacks.onChunk?.("Hello");
        callbacks.onDone?.("Hello there", "sess-1");
      },
    );

    const { result } = renderHook(() => useChatSession());

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

  it("stops an in-flight stream and keeps partial content", async () => {
    streamChatMessage.mockImplementation(
      async (_message, _history, _sessionId, callbacks) => {
        callbacks.onChunk?.("partial");
        await new Promise((_, reject) => {
          callbacks.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      },
    );

    const { result } = renderHook(() => useChatSession());

    let sendPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      sendPromise = result.current.sendMessage("hi");
    });

    await waitFor(() => {
      expect(result.current.messages[1]?.content).toBe("partial");
    });

    await act(async () => {
      result.current.stopGeneration();
      await sendPromise;
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "partial",
      streaming: false,
      cancelled: true,
    });
  });

  it("regenerates the latest assistant reply in place", async () => {
    streamChatMessage
      .mockImplementationOnce(async (_m, _h, _s, callbacks) => {
        callbacks.onSessionId?.("sess-1");
        callbacks.onDone?.("first reply", "sess-1");
      })
      .mockImplementationOnce(async (_m, _h, _s, callbacks) => {
        callbacks.onDone?.("second reply", "sess-1");
      });

    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    await act(async () => {
      await result.current.regenerate();
    });

    expect(truncateConversationTurns).toHaveBeenCalledWith("sess-1", 0);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "second reply",
      streaming: false,
    });
  });

  it("retries a failed assistant turn", async () => {
    streamChatMessage
      .mockImplementationOnce(async () => {
        throw new Error("boom");
      })
      .mockImplementationOnce(async (_m, _h, _s, callbacks) => {
        callbacks.onSessionId?.("sess-1");
        callbacks.onDone?.("recovered", "sess-1");
      });

    const { result } = renderHook(() => useChatSession());

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      error: true,
    });

    await act(async () => {
      await result.current.retryFailed();
    });

    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "recovered",
      error: false,
    });
  });
});
