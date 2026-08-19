import { useState } from "react";
import { History, PanelRightClose, Plus } from "lucide-react";
import type { AgentRun } from "../services/agentsApi";
import {
  getConversation,
  turnsToMessages,
  type ConversationSummary,
} from "../services/conversationsApi";
import type { UiMessage } from "../hooks/useChatSession";
import { ConversationHistoryList } from "./ConversationHistoryList";
import { AlertBanner } from "./ui/AlertBanner";
import { IconButton } from "./ui/IconButton";
import { cn } from "../lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedChatId?: string | null;
  selectedAgentId?: string | null;
  onNewChat: () => void;
  onResume: (
    conversationId: string,
    sessionId: string | undefined,
    messages: UiMessage[],
  ) => void;
  onSelectAgent: (run: AgentRun) => void;
  className?: string;
};

function nextId(): string {
  return crypto.randomUUID();
}

/** Desktop-only right-side chat history panel. Hidden until opened via expand. */
export function ChatHistorySidebar({
  open,
  onClose,
  selectedChatId = null,
  selectedAgentId = null,
  onNewChat,
  onResume,
  onSelectAgent,
  className,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resumingId, setResumingId] = useState<string | null>(null);

  async function handleSelect(conversation: ConversationSummary) {
    setError(null);
    setResumingId(conversation.id);
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
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open conversation");
    } finally {
      setResumingId(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <aside
      className={cn(
        "hidden h-full w-80 shrink-0 flex-col border-l border-donna-border bg-donna-sidebar lg:flex",
        className,
      )}
      aria-label="History"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-donna-border px-3 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-donna-text">
          <History className="h-4 w-4 text-donna-primary" strokeWidth={1.75} />
          History
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            onClick={onNewChat}
            aria-label="New chat"
            className="!h-8 !w-8 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            onClick={onClose}
            aria-label="Close history"
            className="!h-8 !w-8 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
          >
            <PanelRightClose className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>

      {error ? (
        <AlertBanner className="mx-3 mb-2 mt-2" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      ) : null}

      <ConversationHistoryList
        active={open}
        compact
        selectedChatId={selectedChatId}
        selectedAgentId={selectedAgentId}
        busyChatId={resumingId}
        refreshKey={refreshKey}
        onSelect={handleSelect}
        onSelectAgent={onSelectAgent}
        className="min-h-0 pt-2"
      />
    </aside>
  );
}
