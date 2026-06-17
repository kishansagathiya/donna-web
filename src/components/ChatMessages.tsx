import { useEffect, useRef } from "react";
import { MessageCircle, Ear } from "lucide-react";
import type { UiMessage } from "../hooks/useChatSession";
import type { DonnaMode } from "../types/mode";
import { EmptyState } from "./ui/EmptyState";
import { cn } from "../lib/cn";

type Props = {
  messages: UiMessage[];
  phase: string | null;
  mode: DonnaMode;
};

export function ChatMessages({ messages, phase, mode }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={mode === "listen" ? Ear : MessageCircle}
        title={mode === "listen" ? "Share with Donna" : "Ask Donna anything"}
        description={
          mode === "listen"
            ? "In listen mode, Donna saves what you share without replying."
            : "Donna remembers what you save — links, files, and past conversations. Try: “What did I save last week?”"
        }
      />
    );
  }

  return (
    <div
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
      role="log"
      aria-live="polite"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed break-words",
            message.role === "user"
              ? "ml-auto rounded-br-md bg-donna-gold text-white"
              : "mr-auto rounded-bl-md border border-donna-border bg-donna-surface text-donna-text shadow-sm",
            message.streaming && "opacity-95",
          )}
        >
          <p>{message.content || (message.streaming ? "…" : "")}</p>
        </div>
      ))}
      {phase === "generating" && mode === "talk" && messages[messages.length - 1]?.streaming ? (
        <p className="text-sm text-donna-muted">Donna is thinking…</p>
      ) : null}
      {phase === "saving" && mode === "listen" ? (
        <p className="text-sm text-donna-muted">Saving…</p>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
