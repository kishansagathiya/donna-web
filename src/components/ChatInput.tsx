import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { IconButton } from "./ui/IconButton";
import { cn } from "../lib/cn";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, disabled, placeholder = "Message Donna…" }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  useEffect(() => {
    resize();
  }, [text]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
    <form
      className="shrink-0 border-t border-donna-border bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onSubmit={handleSubmit}
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          className={cn(
            "max-h-32 min-h-11 flex-1 resize-none rounded-[20px] border border-donna-border bg-white px-4 py-3 text-base leading-snug text-donna-text",
            "placeholder:text-donna-muted",
            "focus:border-donna-gold focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30",
            "disabled:opacity-60",
          )}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          aria-label={placeholder}
        />
        <IconButton
          type="submit"
          className="!bg-donna-gold !text-white !border-donna-gold disabled:!opacity-40"
          disabled={disabled || !text.trim()}
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </IconButton>
      </div>
    </form>
  );
}
