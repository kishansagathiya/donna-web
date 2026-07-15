import { useState } from "react";
import {
  Check,
  Copy,
  Pencil,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "../lib/cn";
import type { UiMessage } from "../hooks/useChatSession";

type Props = {
  message: UiMessage;
  isLatestAssistant: boolean;
  busy: boolean;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, nextText: string) => void;
  onFeedback?: (messageId: string, rating: "up" | "down") => void;
};

export function MessageActions({
  message,
  isLatestAssistant,
  busy,
  onCopy,
  onRegenerate,
  onEdit,
  onFeedback,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  if (message.streaming) {
    return null;
  }

  if (editing && message.role === "user") {
    return (
      <div className="mt-2 w-full max-w-[85%] space-y-2 self-end">
        <textarea
          className={cn(
            "min-h-20 w-full rounded-xl border border-donna-border bg-white px-3 py-2",
            "text-[0.9375rem] leading-relaxed text-donna-text",
            "focus:outline-none focus:ring-2 focus:ring-donna-primary-ring/30",
          )}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Edit message"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-donna-muted hover:bg-donna-surface"
            onClick={() => {
              setDraft(message.content);
              setEditing(false);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !draft.trim()}
            className={cn(
              "rounded-lg bg-donna-primary px-3 py-1.5 text-sm font-medium text-white",
              "hover:bg-donna-primary-hover disabled:cursor-not-allowed disabled:opacity-40",
            )}
            onClick={() => {
              onEdit?.(message.id, draft);
              setEditing(false);
            }}
          >
            Save & send
          </button>
        </div>
      </div>
    );
  }

  const actionClass = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-donna-muted",
    "transition-colors hover:bg-donna-surface hover:text-donna-text",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
    "disabled:cursor-not-allowed disabled:opacity-40",
  );

  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-0.5",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      <button
        type="button"
        className={actionClass}
        aria-label={copied ? "Copied" : "Copy message"}
        onClick={async () => {
          onCopy(message.content);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
      </button>

      {message.role === "user" && onEdit ? (
        <button
          type="button"
          className={actionClass}
          aria-label="Edit message"
          disabled={busy}
          onClick={() => {
            setDraft(message.content);
            setEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      ) : null}

      {message.role === "assistant" && isLatestAssistant && onRegenerate ? (
        <button
          type="button"
          className={actionClass}
          aria-label="Regenerate reply"
          disabled={busy}
          onClick={onRegenerate}
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      ) : null}

      {message.role === "assistant" && onFeedback ? (
        <>
          <button
            type="button"
            className={cn(
              actionClass,
              message.feedback === "up" && "text-donna-primary",
            )}
            aria-label="Thumbs up"
            aria-pressed={message.feedback === "up"}
            onClick={() => onFeedback(message.id, "up")}
          >
            <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={cn(
              actionClass,
              message.feedback === "down" && "text-donna-primary",
            )}
            aria-label="Thumbs down"
            aria-pressed={message.feedback === "down"}
            onClick={() => onFeedback(message.id, "down")}
          >
            <ThumbsDown className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </>
      ) : null}
    </div>
  );
}
