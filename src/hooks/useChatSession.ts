import { useCallback, useRef, useState } from "react";
import {
  streamChatMessage,
  type ChatMessage,
} from "../services/chatApi";
import type { DonnaMode } from "../types/mode";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

function nextId(): string {
  return crypto.randomUUID();
}

export function useChatSession(mode: DonnaMode) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      abortRef.current = false;
      setError(null);
      setBusy(true);
      setPhase(mode === "notes" ? "saving" : "generating");

      const userMessage: UiMessage = {
        id: nextId(),
        role: "user",
        content: trimmed,
      };

      const assistantId = nextId();
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const isNotesMode = mode === "notes";

      setMessages((prev) => [
        ...prev,
        userMessage,
        ...(isNotesMode
          ? []
          : [{ id: assistantId, role: "assistant" as const, content: "", streaming: true }]),
      ]);

      try {
        await streamChatMessage(trimmed, history, sessionId, {
          mode,
          onSessionId: (id) => setSessionId(id),
          onPhase: (p) => setPhase(p),
          onChunk: (partial) => {
            if (abortRef.current || isNotesMode) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: partial, streaming: true }
                  : m,
              ),
            );
          },
          onDone: (reply, newSessionId) => {
            setSessionId(newSessionId);
            if (isNotesMode) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: reply, streaming: false }
                  : m,
              ),
            );
          },
          onError: (message) => setError(message),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        if (!isNotesMode) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
      } finally {
        setBusy(false);
        setPhase(null);
      }
    },
    [busy, messages, mode, sessionId],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    setError(null);
  }, []);

  const loadConversation = useCallback(
    (nextSessionId: string | undefined, nextMessages: UiMessage[]) => {
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
    sendMessage,
    clearChat,
    loadConversation,
    busy,
    phase,
    error,
    dismissError: () => setError(null),
  };
}
