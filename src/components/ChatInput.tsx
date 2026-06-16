import { useState, type FormEvent, type KeyboardEvent } from "react";
import "./ChatInput.css";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, disabled, placeholder = "Message Donna…" }: Props) {
  const [text, setText] = useState("");

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form className="chat-input-bar" onSubmit={handleSubmit}>
      <textarea
        className="chat-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        aria-label={placeholder}
      />
      <button
        type="submit"
        className="chat-send"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
      >
        ↑
      </button>
    </form>
  );
}
