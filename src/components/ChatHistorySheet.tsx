import { useCallback, useEffect, useState } from "react";
import { History, MessageSquare, Mic } from "lucide-react";
import {
  formatConversationDate,
  getConversation,
  listConversations,
  turnsToMessages,
  type ConversationSummary,
} from "../services/conversationsApi";
import type { UiMessage } from "../hooks/useChatSession";
import { Sheet } from "./ui/Sheet";
import { EmptyState } from "./ui/EmptyState";
import { Spinner } from "./ui/Spinner";
import { AlertBanner } from "./ui/AlertBanner";
import { cn } from "../lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  onResume: (sessionId: string | undefined, messages: UiMessage[]) => void;
};

function nextId(): string {
  return crypto.randomUUID();
}

export function ChatHistorySheet({ open, onClose, onResume }: Props) {
  const [loading, setLoading] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConversations(await listConversations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  async function handleSelect(conversation: ConversationSummary) {
    setResumingId(conversation.id);
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
      onResume(sessionId, messages);
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

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={History}
          title="No conversations yet"
          description="Your past chats will appear here once you start talking with Donna."
          className="py-6"
        />
      ) : (
        <ul className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto">
          {conversations.map((conversation) => {
            const Icon = conversation.channel === "voice" ? Mic : MessageSquare;
            const title =
              conversation.preview ||
              (conversation.channel === "voice" ? "Voice conversation" : "New chat");
            const busy = resumingId === conversation.id;

            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  disabled={busy || resumingId !== null}
                  onClick={() => void handleSelect(conversation)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border border-donna-border px-4 py-3 text-left",
                    "transition-colors hover:border-donna-primary/30 hover:bg-donna-surface",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      conversation.channel === "voice"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-donna-primary-light text-donna-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-donna-text">
                      {title}
                    </p>
                    <p className="mt-0.5 text-xs text-donna-muted">
                      {formatConversationDate(conversation.updated_at)}
                      {conversation.turn_count > 0
                        ? ` · ${conversation.turn_count} turn${conversation.turn_count === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  {busy ? <Spinner className="mt-2 h-4 w-4" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
