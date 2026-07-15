import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Mic, Pin } from "lucide-react";
import {
  formatConversationDate,
  listConversations,
  type ConversationSummary,
} from "../services/conversationsApi";
import { Spinner } from "./ui/Spinner";
import { cn } from "../lib/cn";

type Props = {
  selectedId?: string | null;
  onSelect: (conversation: ConversationSummary) => void;
  /** Increment to force a reload (e.g. after new chat). */
  refreshKey?: number;
  className?: string;
};

export function SidebarRecentChats({
  selectedId = null,
  onSelect,
  refreshKey = 0,
  className,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listConversations({ limit: 25 });
      setConversations(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        void load();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-donna-muted">
          Recent
        </p>
      </div>

      {loading && conversations.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <Spinner className="h-5 w-5" />
        </div>
      ) : error ? (
        <p className="px-3 py-2 text-xs text-donna-muted">{error}</p>
      ) : conversations.length === 0 ? (
        <p className="px-3 py-2 text-xs leading-relaxed text-donna-muted">
          Past chats will show up here.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {conversations.map((conversation) => {
            const Icon =
              conversation.channel === "voice" ? Mic : MessageSquare;
            const selected = selectedId === conversation.id;
            const pinned = Boolean(conversation.pinned_at);

            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                    selected
                      ? "bg-donna-primary-light text-donna-primary"
                      : "text-donna-text hover:bg-donna-surface",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      selected ? "text-donna-primary" : "text-donna-muted",
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      {pinned ? (
                        <Pin
                          className="h-3 w-3 shrink-0 text-donna-primary"
                          strokeWidth={2}
                        />
                      ) : null}
                      <span className="truncate text-sm font-medium">
                        {conversation.title}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-[11px]",
                        selected ? "text-donna-primary/70" : "text-donna-muted",
                      )}
                    >
                      {formatConversationDate(conversation.updated_at)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
