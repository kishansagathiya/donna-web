import { useCallback, useRef, useState } from "react";
import {
  isChatAbortError,
  streamChatMessage,
  type ChatMessage,
} from "../services/chatApi";
import {
  submitTurnFeedback,
  truncateConversationTurns,
} from "../services/conversationsApi";

import type { MemoryCitation } from "../types/citations";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  error?: boolean;
  cancelled?: boolean;
  feedback?: "up" | "down";
  citations?: MemoryCitation[];
};

function nextId(): string {
  return crypto.randomUUID();
}

function userTurnIndex(messages: UiMessage[], userMessageId: string): number {
  let index = 0;
  for (const message of messages) {
    if (message.role !== "user") continue;
    if (message.id === userMessageId) return index;
    index += 1;
  }
  return -1;
}

function toHistory(messages: UiMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export function useChatSession() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const sessionIdRef = useRef(sessionId);
  const busyRef = useRef(busy);

  messagesRef.current = messages;
  sessionIdRef.current = sessionId;
  busyRef.current = busy;

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const runStream = useCallback(
    async (
      trimmed: string,
      history: ChatMessage[],
      assistantId: string,
      activeSessionId: string | undefined,
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setError(null);
      setBusy(true);
      setPhase("generating");

      try {
        await streamChatMessage(trimmed, history, activeSessionId, {
          signal: controller.signal,
          onSessionId: (id) => setSessionId(id),
          onPhase: (p) => setPhase(p),
          onChunk: (partial) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: partial,
                      streaming: true,
                      error: false,
                      cancelled: false,
                    }
                  : m,
              ),
            );
          },
          onCitations: (citations) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, citations } : m,
              ),
            );
          },
          onDone: (reply, newSessionId, citations) => {
            setSessionId(newSessionId);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: reply,
                      streaming: false,
                      error: false,
                      cancelled: false,
                      citations: citations ?? m.citations,
                    }
                  : m,
              ),
            );
          },
          onError: (message) => setError(message),
        });
      } catch (err) {
        if (isChatAbortError(err)) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              if (!m.content.trim()) {
                return { ...m, streaming: false, cancelled: true };
              }
              return {
                ...m,
                streaming: false,
                cancelled: true,
                error: false,
              };
            }),
          );
          return;
        }

        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  error: true,
                  cancelled: false,
                }
              : m,
          ),
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setBusy(false);
        setPhase(null);
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return;

      const userMessage: UiMessage = {
        id: nextId(),
        role: "user",
        content: trimmed,
      };
      const assistantId = nextId();
      const history = toHistory(messagesRef.current);

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
        },
      ]);

      await runStream(trimmed, history, assistantId, sessionIdRef.current);
    },
    [runStream],
  );

  const regenerate = useCallback(async () => {
    if (busyRef.current) return;

    const current = messagesRef.current;
    let assistantIndex = -1;
    for (let i = current.length - 1; i >= 0; i -= 1) {
      if (current[i]?.role === "assistant") {
        assistantIndex = i;
        break;
      }
    }
    if (assistantIndex <= 0) return;

    const assistant = current[assistantIndex];
    const user = current[assistantIndex - 1];
    if (!assistant || !user || user.role !== "user") return;

    const turnIndex = userTurnIndex(current, user.id);
    if (turnIndex < 0) return;

    const activeSessionId = sessionIdRef.current;
    if (activeSessionId) {
      try {
        await truncateConversationTurns(activeSessionId, turnIndex);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to prepare regenerate";
        setError(message);
        return;
      }
    }

    const kept = current.slice(0, assistantIndex);
    const history = toHistory(kept.slice(0, -1));
    const assistantId = nextId();

    setMessages([
      ...kept,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      },
    ]);

    await runStream(user.content, history, assistantId, activeSessionId);
  }, [runStream]);

  const editAndResend = useCallback(
    async (userMessageId: string, nextText: string) => {
      const trimmed = nextText.trim();
      if (!trimmed || busyRef.current) return;

      const current = messagesRef.current;
      const userIndex = current.findIndex(
        (m) => m.id === userMessageId && m.role === "user",
      );
      if (userIndex < 0) return;

      const turnIndex = userTurnIndex(current, userMessageId);
      if (turnIndex < 0) return;

      const activeSessionId = sessionIdRef.current;
      if (activeSessionId) {
        try {
          await truncateConversationTurns(activeSessionId, turnIndex);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to edit message";
          setError(message);
          return;
        }
      }

      const kept = current.slice(0, userIndex);
      const history = toHistory(kept);
      const assistantId = nextId();
      const userMessage: UiMessage = {
        id: nextId(),
        role: "user",
        content: trimmed,
      };

      setMessages([
        ...kept,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
        },
      ]);

      await runStream(trimmed, history, assistantId, activeSessionId);
    },
    [runStream],
  );

  const retryFailed = useCallback(async () => {
    if (busyRef.current) return;

    const current = messagesRef.current;
    const last = current[current.length - 1];
    if (!last) return;

    if (last.role === "assistant" && last.error) {
      const user = current[current.length - 2];
      if (!user || user.role !== "user") return;

      const turnIndex = userTurnIndex(current, user.id);
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId && turnIndex >= 0) {
        try {
          await truncateConversationTurns(activeSessionId, turnIndex);
        } catch {
          // Best-effort; retry can still work for never-persisted failures.
        }
      }

      const kept = current.slice(0, -1);
      const history = toHistory(kept.slice(0, -1));
      const assistantId = nextId();
      setMessages([
        ...kept.slice(0, -1),
        kept[kept.length - 1]!,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
        },
      ]);
      setError(null);
      await runStream(user.content, history, assistantId, activeSessionId);
      return;
    }

    if (last.role === "user") {
      const history = toHistory(current.slice(0, -1));
      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
        },
      ]);
      setError(null);
      await runStream(last.content, history, assistantId, sessionIdRef.current);
    }
  }, [runStream]);

  const setMessageFeedback = useCallback(
    async (assistantMessageId: string, rating: "up" | "down") => {
      const current = messagesRef.current;
      const assistantIndex = current.findIndex(
        (m) => m.id === assistantMessageId && m.role === "assistant",
      );
      if (assistantIndex <= 0) return;

      const user = current[assistantIndex - 1];
      if (!user || user.role !== "user") return;

      const turnIndex = userTurnIndex(current, user.id);
      const activeSessionId = sessionIdRef.current;
      if (turnIndex < 0 || !activeSessionId) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, feedback: rating } : m,
        ),
      );

      try {
        await submitTurnFeedback(activeSessionId, turnIndex, rating);
      } catch {
        // Do not block chat if feedback write fails; revert selection.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, feedback: undefined } : m,
          ),
        );
      }
    },
    [],
  );

  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setMessages([]);
    setSessionId(undefined);
    setError(null);
    setBusy(false);
    setPhase(null);
  }, []);

  const loadConversation = useCallback(
    (nextSessionId: string | undefined, nextMessages: UiMessage[]) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setMessages(nextMessages);
      setSessionId(nextSessionId);
      setError(null);
      setBusy(false);
      setPhase(null);
    },
    [],
  );

  return {
    messages,
    sessionId,
    sendMessage,
    stopGeneration,
    regenerate,
    editAndResend,
    retryFailed,
    setMessageFeedback,
    clearChat,
    loadConversation,
    busy,
    phase,
    error,
    dismissError: () => setError(null),
  };
}
