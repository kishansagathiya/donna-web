import { useCallback, useRef, useState } from "react";
import {
  streamChatMessage,
  type ChatMessage,
} from "../services/chatApi";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

function nextId(): string {
  return crypto.randomUUID();
}

export function useChatSession() {
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
      setPhase("generating");

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

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);

      try {
        await streamChatMessage(trimmed, history, sessionId, {
          onSessionId: (id) => setSessionId(id),
          onPhase: (p) => setPhase(p),
          onChunk: (partial) => {
            if (abortRef.current) return;
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
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setBusy(false);
        setPhase(null);
      }
    },
    [busy, messages, sessionId],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearChat,
    busy,
    phase,
    error,
    dismissError: () => setError(null),
  };
}
