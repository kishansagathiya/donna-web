import { useEffect, useRef } from "react";
import type { UiMessage } from "../hooks/useChatSession";
import "./ChatMessages.css";

type Props = {
  messages: UiMessage[];
  phase: string | null;
};

export function ChatMessages({ messages, phase }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  if (messages.length === 0) {
    return (
      <div className="chat-empty">
        <p className="chat-empty-title">Ask Donna anything</p>
        <p className="chat-empty-sub">
          Donna remembers what you save — links, files, and past conversations.
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
      {phase === "generating" && messages[messages.length - 1]?.streaming ? (
        <p className="chat-status">Donna is thinking…</p>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
