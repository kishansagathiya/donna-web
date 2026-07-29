import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { UiMessage } from "../hooks/useChatSession";
import { ChatHero } from "./ChatHero";
import type { MicState } from "./MicButton";
import { MemoryCitations } from "./MemoryCitations";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./MessageContent";
import { AssistantThinkingBlock } from "./ThinkingIndicator";
import { cn } from "../lib/cn";
import { isGeneratingPhase } from "../lib/chatPhaseLabel";
import { formatFirstTokenMs } from "../lib/formatFirstTokenMs";
import { isDonnaThinkingPhase } from "../lib/thinkingPhrases";

/** Distance from bottom (px) that still counts as "following" the stream. */
const NEAR_BOTTOM_PX = 80;

type Props = {
  messages: UiMessage[];
  phase: string | null;
  micState: MicState;
  onMicPress: () => void;
  micDisabled?: boolean;
  sessionLabel?: string | null;
  voicePhaseLabel?: string | null;
  showMic?: boolean;
  busy?: boolean;
  onCopyMessage?: (content: string) => void;
  onRegenerate?: () => void;
  onEditMessage?: (messageId: string, nextText: string) => void;
  onFeedback?: (messageId: string, rating: "up" | "down") => void;
  onSaveAsNote?: (content: string) => void | Promise<void>;
  onRetry?: () => void;
};

export function ChatMessages({
  messages,
  phase,
  micState,
  onMicPress,
  micDisabled,
  sessionLabel,
  voicePhaseLabel,
  showMic = true,
  busy = false,
  onCopyMessage,
  onRegenerate,
  onEditMessage,
  onFeedback,
  onSaveAsNote,
  onRetry,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const [stickToBottom, setStickToBottom] = useState(true);

  const allMessages = messages;
  const hasMessages = allMessages.length > 0;
  const displayPhase = voicePhaseLabel ?? phase;
  const showThinking =
    isDonnaThinkingPhase(displayPhase) ||
    isGeneratingPhase(displayPhase) ||
    (busy &&
      allMessages.some(
        (message) =>
          message.role === "assistant" &&
          message.streaming &&
          !message.content,
      ));
  const hasWaitingBubble = allMessages.some(
    (message) =>
      message.role === "assistant" && message.streaming && !message.content,
  );
  // Concrete status only (browse / read / analyze) — never protocol tokens.
  const statusLabel =
    displayPhase &&
    !isDonnaThinkingPhase(displayPhase) &&
    !isGeneratingPhase(displayPhase)
      ? displayPhase
      : null;

  const latestAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "assistant") {
        return messages[i]!.id;
      }
    }
    return null;
  }, [messages]);

  const lastTextMessage = messages[messages.length - 1];
  const showRetry =
    Boolean(onRetry) &&
    !busy &&
    Boolean(
      lastTextMessage &&
        ((lastTextMessage.role === "assistant" && lastTextMessage.error) ||
          lastTextMessage.role === "user"),
    );

  const enableStickToBottom = () => {
    stickToBottomRef.current = true;
    setStickToBottom(true);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_PX;
    if (nearBottom === stickToBottomRef.current) return;
    stickToBottomRef.current = nearBottom;
    setStickToBottom(nearBottom);
  };

  // New / loaded conversation: always resume follow mode.
  const threadKey = messages[0]?.id ?? "empty";
  useEffect(() => {
    enableStickToBottom();
    prevMessageCountRef.current = allMessages.length;
  }, [threadKey]);

  // User send (or new user bubble): jump back to bottom and resume follow.
  useEffect(() => {
    const count = allMessages.length;
    const grew = count > prevMessageCountRef.current;
    prevMessageCountRef.current = count;
    if (!grew) return;
    const last = allMessages[count - 1];
    if (last?.role === "user") {
      enableStickToBottom();
    }
  }, [allMessages]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom("auto");
  }, [allMessages, displayPhase, stickToBottom]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasMessages ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 md:px-8"
            role="log"
            aria-live="polite"
          >
          {allMessages.map((message) => {
            if (
              message.role === "assistant" &&
              message.streaming &&
              !message.content
            ) {
              return <AssistantThinkingBlock key={message.id} />;
            }

            const isTextMessage = messages.some((m) => m.id === message.id);
            const showActions =
              isTextMessage &&
              Boolean(onCopyMessage) &&
              !message.streaming &&
              Boolean(message.content);

            return (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col",
                  message.role === "user" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "min-w-0 rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed",
                    message.role === "user"
                      ? "max-w-[85%] break-words rounded-br-md bg-donna-primary text-white"
                      : "w-full overflow-x-auto break-words rounded-bl-md border border-donna-border bg-donna-surface text-donna-text",
                    message.streaming && "opacity-95",
                    message.error && "border-donna-destructive/40",
                    message.cancelled && "opacity-80",
                  )}
                >
                  {message.role === "user" &&
                  message.attachments &&
                  message.attachments.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {message.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex max-w-[10rem] items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1 text-xs"
                        >
                          {att.previewUrl ? (
                            <img
                              src={att.previewUrl}
                              alt=""
                              className="h-7 w-7 rounded object-cover"
                            />
                          ) : null}
                          <span className="truncate">{att.filename}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <MessageContent
                    content={
                      message.role === "user" && message.attachments?.length
                        ? message.content.replace(/\n\n📎 .+$/s, "").replace(/^📎 .+$/s, "") ||
                          ""
                        : message.content
                    }
                    variant={message.role === "user" ? "user" : "assistant"}
                  />
                  {message.role === "assistant" &&
                  !message.streaming &&
                  !message.content &&
                  !message.cancelled ? (
                    <p className="text-sm italic text-donna-muted">
                      {message.error
                        ? "No response received. Tap Retry to try again."
                        : "No response received."}
                    </p>
                  ) : null}
                  {message.role === "assistant" &&
                  message.error &&
                  message.content ? (
                    <p className="mt-2 text-xs text-donna-destructive">
                      Tap Retry to try again.
                    </p>
                  ) : null}
                  {message.cancelled && !message.content ? (
                    <p className="text-sm italic text-donna-muted">
                      Generation stopped
                    </p>
                  ) : null}
                </div>

                {message.role === "assistant" &&
                message.firstTokenMs != null &&
                message.content ? (
                  <p className="mt-1 text-xs text-donna-muted">
                    {formatFirstTokenMs(message.firstTokenMs)}
                  </p>
                ) : null}

                {message.role === "assistant" &&
                !message.streaming &&
                message.citations &&
                message.citations.length > 0 ? (
                  <MemoryCitations citations={message.citations} />
                ) : null}

                {showActions ? (
                  <MessageActions
                    message={message}
                    isLatestAssistant={message.id === latestAssistantId}
                    busy={busy}
                    onCopy={onCopyMessage!}
                    onRegenerate={
                      message.id === latestAssistantId ? onRegenerate : undefined
                    }
                    onEdit={onEditMessage}
                    onFeedback={onFeedback}
                    onSaveAsNote={onSaveAsNote}
                  />
                ) : null}

                {message.role === "assistant" &&
                message.error &&
                showRetry &&
                message.id === latestAssistantId ? (
                  <button
                    type="button"
                    className="mt-1 rounded-lg px-2 py-1 text-sm font-medium text-donna-primary hover:bg-donna-surface"
                    onClick={onRetry}
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            );
          })}
          {hasWaitingBubble ? null : showThinking ? (
            <AssistantThinkingBlock />
          ) : statusLabel ? (
            <p className="mr-auto text-sm text-donna-muted">{statusLabel}</p>
          ) : null}
          <div ref={bottomRef} />
          </div>
          {!stickToBottom ? (
            <button
              type="button"
              className={cn(
                "absolute bottom-3 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center",
                "rounded-full border border-donna-border bg-donna-surface text-donna-primary shadow-md",
                "transition-opacity hover:bg-donna-primary-light",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
              )}
              aria-label="Scroll to latest messages"
              onClick={() => {
                enableStickToBottom();
                scrollToBottom("smooth");
              }}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      <ChatHero
        micState={micState}
        onMicPress={onMicPress}
        micDisabled={micDisabled}
        compact={hasMessages}
        showMic={showMic}
        sessionLabel={showMic ? sessionLabel : null}
      />
    </div>
  );
}
