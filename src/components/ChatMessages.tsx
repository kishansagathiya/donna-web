import { useEffect, useRef } from "react";
import { Mic } from "lucide-react";
import type { UiMessage } from "../hooks/useChatSession";
import { MessageContent } from "./MessageContent";
import { cn } from "../lib/cn";

type Props = {
  messages: UiMessage[];
  phase: string | null;
};

function ChatHero() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <span
          className="animate-pulse-ring absolute inset-0 rounded-full bg-donna-primary/15"
          aria-hidden="true"
        />
        <span
          className="animate-pulse-ring absolute inset-2 rounded-full bg-donna-primary/10 [animation-delay:0.8s]"
          aria-hidden="true"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-donna-primary text-white shadow-lg shadow-donna-primary/25">
          <Mic className="h-8 w-8" strokeWidth={1.75} />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-donna-text sm:text-4xl">
        Ask Donna anything
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-donna-muted">
        Donna remembers what you save — links, files, and past conversations.
      </p>
    </div>
  );
}

export function ChatMessages({ messages, phase }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  if (messages.length === 0) {
    return <ChatHero />;
  }

  return (
    <div
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 md:px-8"
      role="log"
      aria-live="polite"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed break-words",
            message.role === "user"
              ? "ml-auto rounded-br-md bg-donna-primary text-white"
              : "mr-auto rounded-bl-md border border-donna-border bg-donna-surface text-donna-text",
            message.streaming && "opacity-95",
          )}
        >
          <MessageContent
            content={message.content || (message.streaming ? "…" : "")}
            variant={message.role === "user" ? "user" : "assistant"}
          />
        </div>
      ))}
      {phase === "generating" && messages[messages.length - 1]?.streaming ? (
        <p className="text-sm text-donna-muted">Donna is thinking…</p>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
