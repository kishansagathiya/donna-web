import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatSession } from "./useChatSession";

vi.mock("../services/chatApi", () => ({
  streamChatMessage: vi.fn(),
}));

vi.mock("../services/notesApi", () => ({
  createNote: vi.fn(),
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

  it("saves notes without adding chat messages", async () => {
    const { createNote } = await import("../services/notesApi");
    vi.mocked(createNote).mockResolvedValue({
      id: "note-1",
      title: "remember milk",
      preview: "",
      note_date: "2024-01-01T00:00:00.000Z",
      is_important: false,
      is_urgent: false,
      source_type: "manual",
      keywords: [],
      category: null,
      user_id: "user-1",
      source_id: null,
      content: "remember milk",
      user_last_modified: null,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useChatSession("notes"));

    await act(async () => {
      await result.current.sendMessage("remember milk");
    });

    await waitFor(() => {
      expect(result.current.busy).toBe(false);
    });

    expect(createNote).toHaveBeenCalledWith("remember milk");
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.noteSavedMessage).toBe("Note saved");
  });
});
