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
import type {
  ChatAttachmentPayload,
  PendingAttachment,
} from "../lib/chatAttachments";
import { revokePendingAttachment } from "../lib/chatAttachments";
import type { MemoryCitation } from "../types/citations";

export type UiAttachment = {
  id: string;
  kind: "file" | "url";
  filename: string;
  mime?: string;
  previewUrl?: string;
};

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Grounded text used for follow-up history (includes extracted attachment content). */
  historyContent?: string;
  attachments?: UiAttachment[];
  attachmentPayloads?: ChatAttachmentPayload[];
  streaming?: boolean;
  error?: boolean;
  cancelled?: boolean;
  feedback?: "up" | "down";
  citations?: MemoryCitation[];
  webSearch?: boolean;
};

export type SendMessageOptions = {
  webSearch?: boolean;
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
    content: m.historyContent ?? m.content,
  }));
}

function displayUserContent(
  text: string,
  attachments: PendingAttachment[],
): string {
  const trimmed = text.trim();
  if (attachments.length === 0) return trimmed;
  const labels = attachments.map((a) => a.filename).join(", ");
  if (!trimmed) return `📎 ${labels}`;
  return `${trimmed}\n\n📎 ${labels}`;
}

function toUiAttachments(attachments: PendingAttachment[]): UiAttachment[] {
  return attachments.map((a) => ({
    id: a.id,
    kind: a.kind,
    filename: a.filename,
    mime: a.mime,
    previewUrl: a.previewUrl,
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
      userMessageId: string,
      activeSessionId: string | undefined,
      attachments?: ChatAttachmentPayload[],
      options: SendMessageOptions = {},
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setError(null);
      setBusy(true);
      setPhase("generating");

      try {
        await streamChatMessage(trimmed, history, activeSessionId, {
          signal: controller.signal,
          attachments,
          webSearch: options.webSearch,
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
              prev.map((m) => (m.id === assistantId ? { ...m, citations } : m)),
            );
          },
          onDone: (reply, newSessionId, meta) => {
            setSessionId(newSessionId);
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === assistantId) {
                  return {
                    ...m,
                    content: reply,
                    streaming: false,
                    error: false,
                    cancelled: false,
                    citations: meta?.citations ?? m.citations,
                  };
                }
                if (m.id === userMessageId && meta?.groundedUserMessage) {
                  return {
                    ...m,
                    historyContent: meta.groundedUserMessage,
                    // Payloads no longer needed once grounded into history.
                    attachmentPayloads: undefined,
                  };
                }
                return m;
              }),
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
                  // Keep any partial tokens; otherwise show the failure reason
                  // in-bubble so it is visible without hunting the banner.
                  content: m.content.trim() ? m.content : message,
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
    async (
      text: string,
      pendingAttachments: PendingAttachment[] = [],
      options: SendMessageOptions = {},
    ) => {
      const trimmed = text.trim();
      if ((!trimmed && pendingAttachments.length === 0) || busyRef.current) {
        return;
      }

      const payloads = pendingAttachments.map((a) => a.payload);
      const userMessage: UiMessage = {
        id: nextId(),
        role: "user",
        content: displayUserContent(trimmed, pendingAttachments),
        attachments: toUiAttachments(pendingAttachments),
        attachmentPayloads: payloads.length > 0 ? payloads : undefined,
        webSearch: options.webSearch,
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

      // Pending previews are owned by the message now; caller should not revoke.
      await runStream(
        trimmed,
        history,
        assistantId,
        userMessage.id,
        sessionIdRef.current,
        payloads.length > 0 ? payloads : undefined,
        options,
      );
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

    if (user.historyContent) {
      await runStream(
        user.historyContent,
        history,
        assistantId,
        user.id,
        activeSessionId,
        undefined,
        { webSearch: user.webSearch },
      );
    } else {
      // Strip the display-only attachment footer from content when re-sending.
      const typed = user.content
        .replace(/\n\n📎 .+$/s, "")
        .replace(/^📎 .+$/s, "");
      await runStream(
        typed === user.content ? user.content : typed.trim(),
        history,
        assistantId,
        user.id,
        activeSessionId,
        user.attachmentPayloads,
        { webSearch: user.webSearch },
      );
    }
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

      const previous = current[userIndex];
      if (previous?.attachments) {
        for (const att of previous.attachments) {
          if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
        }
      }

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
        webSearch: previous?.webSearch,
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

      await runStream(
        trimmed,
        history,
        assistantId,
        userMessage.id,
        activeSessionId,
        undefined,
        {
          webSearch: userMessage.webSearch,
        },
      );
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
      if (user.historyContent) {
        await runStream(
          user.historyContent,
          history,
          assistantId,
          user.id,
          activeSessionId,
          undefined,
          { webSearch: user.webSearch },
        );
      } else {
        const typed = user.content
          .replace(/\n\n📎 .+$/s, "")
          .replace(/^📎 .+$/s, "");
        await runStream(
          typed === user.content ? user.content : typed.trim(),
          history,
          assistantId,
          user.id,
          activeSessionId,
          user.attachmentPayloads,
          { webSearch: user.webSearch },
        );
      }
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
      if (last.historyContent) {
        await runStream(
          last.historyContent,
          history,
          assistantId,
          last.id,
          sessionIdRef.current,
          undefined,
          { webSearch: last.webSearch },
        );
      } else {
        const typed = last.content
          .replace(/\n\n📎 .+$/s, "")
          .replace(/^📎 .+$/s, "");
        await runStream(
          typed === last.content ? last.content : typed.trim(),
          history,
          assistantId,
          last.id,
          sessionIdRef.current,
          last.attachmentPayloads,
          { webSearch: last.webSearch },
        );
      }
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
    for (const message of messagesRef.current) {
      for (const att of message.attachments ?? []) {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      }
    }
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
      for (const message of messagesRef.current) {
        for (const att of message.attachments ?? []) {
          if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
        }
      }
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

// Re-export helper so callers can clean up unused pending chips.
export { revokePendingAttachment };
