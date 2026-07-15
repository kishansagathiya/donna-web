import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Code2,
  FileText,
  Globe2,
  Link2,
  Mail,
  Mic,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react";
import { cn } from "../lib/cn";
import {
  assertAttachmentBudget,
  fileToChatAttachment,
  isImageMime,
  revokePendingAttachment,
  type PendingAttachment,
} from "../lib/chatAttachments";
import { isDonnaThinkingPhase } from "../lib/thinkingPhrases";
import type { MicState } from "./MicButton";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { Spinner } from "./ui/Spinner";

type QuickAction = {
  label: string;
  onClick: () => void;
};

type Props = {
  onSend: (
    text: string,
    attachments: PendingAttachment[],
    options?: { webSearch?: boolean },
  ) => void;
  onStop?: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  busy?: boolean;
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
  onStop,
  onError,
  disabled,
  busy = false,
  placeholder = "Type your message here...",
  quickActions,
  showMic = false,
  micState = "idle",
  onMicPress,
  micDisabled,
  sessionLabel,
}: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [webSearch, setWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const hasText = text.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const canSend = hasText || hasAttachments;
  const showStop = busy && Boolean(onStop);
  const showInlineMic =
    showMic && !hasText && !hasAttachments && onMicPress && !showStop;
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

  useEffect(() => {
    return () => {
      for (const att of attachments) {
        revokePendingAttachment(att);
      }
    };
    // Only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit() {
    if (disabled || !canSend) return;
    const trimmed = text.trim();
    const pending = attachments;
    onSend(trimmed, pending, { webSearch });
    setText("");
    setAttachments([]);
    setWebSearch(false);
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

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    try {
      assertAttachmentBudget(attachments.length, list.length);
      const next: PendingAttachment[] = [];
      for (const file of list) {
        next.push(await fileToChatAttachment(file));
      }
      setAttachments((prev) => [...prev, ...next]);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Could not attach file");
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) revokePendingAttachment(target);
      return prev.filter((a) => a.id !== id);
    });
  }

  async function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length === 0) return;
    e.preventDefault();
    await addFiles(imageFiles);
  }

  return (
    <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
      {isDonnaThinkingPhase(sessionLabel) ? (
        <ThinkingIndicator className="mb-2 text-[0.8125rem] font-semibold" />
      ) : sessionLabel ? (
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
            "rounded-2xl border border-donna-border bg-white px-3 py-2 shadow-sm",
            "focus-within:border-donna-primary focus-within:ring-2 focus-within:ring-donna-primary-ring/20",
          )}
        >
          {attachments.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="group relative flex max-w-[11rem] items-center gap-2 rounded-xl border border-donna-border bg-donna-surface px-2 py-1.5"
                >
                  {att.previewUrl && isImageMime(att.mime) ? (
                    <img
                      src={att.previewUrl}
                      alt=""
                      className="h-8 w-8 rounded-md object-cover"
                    />
                  ) : att.kind === "url" ? (
                    <Link2 className="h-4 w-4 shrink-0 text-donna-muted" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-donna-muted" />
                  )}
                  <span className="truncate text-xs font-medium text-donna-text">
                    {att.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    aria-label={`Remove ${att.filename}`}
                    className="rounded p-0.5 text-donna-muted hover:bg-white hover:text-donna-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
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
              onPaste={(e) => void handlePaste(e)}
              placeholder={placeholder}
              rows={1}
              disabled={disabled}
              aria-label={placeholder}
            />

            <div className="mb-0.5">
              <button
                type="button"
                onClick={() => setWebSearch((enabled) => !enabled)}
                disabled={disabled}
                aria-label="Use web search"
                aria-pressed={webSearch}
                title={webSearch ? "Web search on" : "Web search off"}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  webSearch
                    ? "bg-donna-primary-light text-donna-primary hover:bg-donna-primary-light/80"
                    : "text-donna-muted hover:bg-donna-surface hover:text-donna-text",
                )}
              >
                <Globe2 className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mb-0.5">
              <button
                type="button"
                onClick={() => attachInputRef.current?.click()}
                disabled={disabled}
                aria-label="Attach to message"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-donna-muted",
                  "transition-colors hover:bg-donna-surface hover:text-donna-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Paperclip className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <input
                ref={attachInputRef}
                type="file"
                hidden
                multiple
                accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json,.html"
                onChange={(e) => {
                  const files = e.target.files;
                  e.target.value = "";
                  if (files) void addFiles(files);
                }}
              />
            </div>

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
                  micState === "error" &&
                    "border-[3px] border-donna-destructive",
                )}
              >
                {isProcessing ? (
                  <Spinner className="!h-4 !w-4 !border-white/30 !border-t-white" />
                ) : isListening ? (
                  <Square
                    className="h-3.5 w-3.5 fill-current"
                    strokeWidth={0}
                  />
                ) : (
                  <Mic className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            ) : showStop ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                className={cn(
                  "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-donna-primary text-white",
                  "transition-colors hover:bg-donna-primary-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
                )}
              >
                <Square className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={disabled || !canSend}
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
