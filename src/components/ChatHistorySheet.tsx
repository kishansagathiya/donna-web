import { useState } from "react";
import type { AgentRun } from "../services/agentsApi";
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
  selectedChatId?: string | null;
  selectedAgentId?: string | null;
  onResume: (
    conversationId: string,
    sessionId: string | undefined,
    messages: UiMessage[],
  ) => void;
  onSelectAgent: (run: AgentRun) => void;
};

function nextId(): string {
  return crypto.randomUUID();
}

export function ChatHistorySheet({
  open,
  onClose,
  selectedChatId = null,
  selectedAgentId = null,
  onResume,
  onSelectAgent,
}: Props) {
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
    <Sheet open={open} onClose={onClose} title="History">
      {error ? (
        <AlertBanner className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      ) : null}

      <ConversationHistoryList
        active={open}
        selectedChatId={resumingId ?? selectedChatId}
        selectedAgentId={selectedAgentId}
        onSelect={handleSelect}
        onSelectAgent={(run) => {
          onSelectAgent(run);
          onClose();
        }}
      />
    </Sheet>
  );
}
