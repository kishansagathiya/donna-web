import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Code2, FileText, Mail, Mic, Paperclip, Send, Square } from "lucide-react";
import { cn } from "../lib/cn";
import type { MicState } from "./MicButton";
import { Spinner } from "./ui/Spinner";

type QuickAction = {
  label: string;
  onClick: () => void;
};

type Props = {
  onSend: (text: string) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
  quickActions?: QuickAction[];
  showMic?: boolean;
  micState?: MicState;
  onMicPress?: () => void;
  micDisabled?: boolean;
  sessionLabel?: string | null;
};

const quickActionIcons: Record<string, typeof FileText> = {
  "Summarize PDF": FileText,
  "Debug code": Code2,
  "Draft email": Mail,
};

export function ChatInput({
  onSend,
  onFileSelect,
  disabled,
  placeholder = "Type your message here...",
  quickActions,
  showMic = false,
  micState = "idle",
  onMicPress,
  micDisabled,
  sessionLabel,
}: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasText = text.trim().length > 0;
  const showInlineMic = showMic && !hasText && onMicPress;
  const isListening = micState === "listening";
  const isProcessing = micState === "processing";
  const isRequesting = micState === "requesting";

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
    <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
      {sessionLabel ? (
        <p
          className="mb-2 text-center text-[0.8125rem] font-semibold leading-snug text-donna-muted"
          aria-live="polite"
        >
          {sessionLabel}
        </p>
      ) : null}
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-donna-border bg-white px-3 py-2 shadow-sm",
            "focus-within:border-donna-primary focus-within:ring-2 focus-within:ring-donna-primary-ring/20",
          )}
        >
          <textarea
            ref={textareaRef}
            className={cn(
              "max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[0.9375rem] leading-snug text-donna-text",
              "placeholder:text-donna-muted",
              "focus:outline-none",
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

          {onFileSelect ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                aria-label="Attach file"
                className={cn(
                  "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-donna-muted",
                  "transition-colors hover:bg-donna-surface hover:text-donna-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Paperclip className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onFileSelect(file);
                }}
              />
            </>
          ) : null}

          {showInlineMic ? (
            <button
              type="button"
              onClick={onMicPress}
              disabled={micDisabled}
              aria-label={
                isListening || isProcessing
                  ? "Stop listening"
                  : "Start listening"
              }
              aria-busy={isRequesting}
              className={cn(
                "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-donna-primary text-white",
                "transition-colors hover:bg-donna-primary-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isListening && "ring-2 ring-donna-primary-ring",
                micState === "error" && "border-[3px] border-donna-destructive",
              )}
            >
              {isProcessing ? (
                <Spinner className="!h-4 !w-4 !border-white/30 !border-t-white" />
              ) : isListening ? (
                <Square className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
              ) : (
                <Mic className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !hasText}
              aria-label="Send message"
              className={cn(
                "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-donna-primary text-white",
                "transition-colors hover:bg-donna-primary-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </form>

      {quickActions && quickActions.length > 0 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {quickActions.map((action) => {
            const Icon = quickActionIcons[action.label] ?? FileText;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-donna-border bg-donna-surface px-3 py-1.5",
                  "text-xs font-medium text-donna-muted transition-colors",
                  "hover:border-donna-primary/30 hover:text-donna-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
