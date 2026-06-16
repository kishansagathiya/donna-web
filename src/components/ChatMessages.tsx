import { useEffect, useRef } from "react";
import type { UiMessage } from "../hooks/useChatSession";
import type { DonnaMode } from "../types/mode";
import "./ChatMessages.css";

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
      <div className="chat-empty">
        <p className="chat-empty-title">
          {mode === "listen" ? "Share with Donna" : "Ask Donna anything"}
        </p>
        <p className="chat-empty-sub">
          {mode === "listen"
            ? "In listen mode, Donna saves what you share without replying."
            : "Donna remembers what you save — links, files, and past conversations."}
        </p>
      </div>
    );
  }

  return (
    <div className="chat-messages" role="log" aria-live="polite">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat-bubble chat-bubble--${message.role}${message.streaming ? " chat-bubble--streaming" : ""}`}
        >
          <p>{message.content || (message.streaming ? "…" : "")}</p>
        </div>
      ))}
      {phase === "generating" && mode === "talk" && messages[messages.length - 1]?.streaming ? (
        <p className="chat-status">Donna is thinking…</p>
      ) : null}
      {phase === "saving" && mode === "listen" ? (
        <p className="chat-status">Saving…</p>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
