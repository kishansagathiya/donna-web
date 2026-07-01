import { useCallback, useRef, useState } from "react";
import {
  streamChatMessage,
  type ChatMessage,
} from "../services/chatApi";
import { createNote } from "../services/notesApi";
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
  const [noteSavedMessage, setNoteSavedMessage] = useState<string | null>(null);
  const abortRef = useRef(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      abortRef.current = false;
      setError(null);
      setNoteSavedMessage(null);
      setBusy(true);

      if (mode === "notes") {
        setPhase("saving");
        try {
          await createNote(trimmed);
          setNoteSavedMessage("Note saved");
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to save note";
          setError(message);
        } finally {
          setBusy(false);
          setPhase(null);
        }
        return;
      }

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
        { id: assistantId, role: "assistant" as const, content: "", streaming: true },
      ]);

      try {
        await streamChatMessage(trimmed, history, sessionId, {
          mode,
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
    [busy, messages, mode, sessionId],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    setError(null);
    setNoteSavedMessage(null);
  }, []);

  const loadConversation = useCallback(
    (nextSessionId: string | undefined, nextMessages: UiMessage[]) => {
      setMessages(nextMessages);
      setSessionId(nextSessionId);
      setError(null);
      setNoteSavedMessage(null);
      setBusy(false);
      setPhase(null);
    },
    [],
  );

  const dismissNoteSaved = useCallback(() => {
    setNoteSavedMessage(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearChat,
    loadConversation,
    busy,
    phase,
    error,
    noteSavedMessage,
    dismissError: () => setError(null),
    dismissNoteSaved,
  };
}
