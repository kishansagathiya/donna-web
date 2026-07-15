import { useState } from "react";
import { History, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
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
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  selectedId?: string | null;
  onNewChat: () => void;
  onResume: (
    conversationId: string,
    sessionId: string | undefined,
    messages: UiMessage[],
  ) => void;
  className?: string;
};

function nextId(): string {
  return crypto.randomUUID();
}

export function ChatHistorySidebar({
  collapsed = false,
  onToggleCollapsed,
  selectedId = null,
  onNewChat,
  onResume,
  className,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleSelect(conversation: ConversationSummary) {
    setError(null);
    try {
      const detail = await getConversation(conversation.id);
      const messages: UiMessage[] = turnsToMessages(detail.turns).map((m) => ({
        id: nextId(),
        role: m.role,
        content: m.content,
      }));
      const sessionId =
        detail.channel === "text" ? detail.client_session_id : undefined;
      onResume(conversation.id, sessionId, messages);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open conversation");
    }
  }

  if (collapsed) {
    return (
      <aside
        className={cn(
          "hidden h-full w-12 shrink-0 flex-col items-center border-r border-donna-border bg-donna-sidebar py-3 lg:flex",
          className,
        )}
      >
        <IconButton
          onClick={onToggleCollapsed}
          aria-label="Expand chat history"
          className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
        >
          <PanelLeftOpen className="h-5 w-5" strokeWidth={1.75} />
        </IconButton>
        <IconButton
          onClick={onNewChat}
          aria-label="New chat"
          className="mt-2 !h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
        >
          <Plus className="h-5 w-5" strokeWidth={1.75} />
        </IconButton>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "hidden h-full w-72 shrink-0 flex-col border-r border-donna-border bg-donna-sidebar lg:flex",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-donna-text">
          <History className="h-4 w-4 text-donna-primary" strokeWidth={1.75} />
          Chats
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            onClick={onNewChat}
            aria-label="New chat"
            className="!h-8 !w-8 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
          {onToggleCollapsed ? (
            <IconButton
              onClick={onToggleCollapsed}
              aria-label="Collapse chat history"
              className="!h-8 !w-8 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </IconButton>
          ) : null}
        </div>
      </div>

      {error ? (
        <AlertBanner className="mx-3 mb-2" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      ) : null}

      <ConversationHistoryList
        active
        compact
        selectedId={selectedId}
        refreshKey={refreshKey}
        onSelect={handleSelect}
        className="min-h-0"
      />
    </aside>
  );
}
