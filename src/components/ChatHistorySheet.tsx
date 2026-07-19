import { useState } from "react";
import {
  getConversation,
  turnsToMessages,
  type ConversationSummary,
} from "../services/conversationsApi";
import type { UiMessage } from "../hooks/useChatSession";
import { ConversationHistoryList } from "./ConversationHistoryList";
import { Sheet } from "./ui/Sheet";
import { AlertBanner } from "./ui/AlertBanner";

type Props = {
  open: boolean;
  onClose: () => void;
  onResume: (
    conversationId: string,
    sessionId: string | undefined,
    messages: UiMessage[],
  ) => void;
};

function nextId(): string {
  return crypto.randomUUID();
}

export function ChatHistorySheet({ open, onClose, onResume }: Props) {
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(conversation: ConversationSummary) {
    setResumingId(conversation.id);
    setError(null);
    try {
      const detail = await getConversation(conversation.id);
      const messages: UiMessage[] = turnsToMessages(detail.turns).map((m) => ({
        id: nextId(),
        role: m.role,
        content: m.content,
        historyContent: m.historyContent,
        attachments: m.attachments,
      }));
      const sessionId =
        detail.channel === "text" ? detail.client_session_id : undefined;
      onResume(conversation.id, sessionId, messages);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open conversation");
    } finally {
      setResumingId(null);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Chat history">
      {error ? (
        <AlertBanner className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      ) : null}

      <ConversationHistoryList
        active={open}
        selectedId={resumingId}
        onSelect={handleSelect}
      />
    </Sheet>
  );
}
