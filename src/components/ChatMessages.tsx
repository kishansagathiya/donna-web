import { useEffect, useMemo, useRef } from "react";
import type { UiMessage } from "../hooks/useChatSession";
import type { VoiceTurn } from "../hooks/useVoiceSession";
import { ChatHero } from "./ChatHero";
import type { MicState } from "./MicButton";
import { MemoryCitations } from "./MemoryCitations";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./MessageContent";
import { AssistantThinkingBlock } from "./ThinkingIndicator";
import { cn } from "../lib/cn";
import { isDonnaThinkingPhase } from "../lib/thinkingPhrases";

type Props = {
  messages: UiMessage[];
  phase: string | null;
  micState: MicState;
  onMicPress: () => void;
  micDisabled?: boolean;
  sessionLabel?: string | null;
  voiceTurns?: VoiceTurn[];
  liveTranscript?: string | null;
  liveReply?: string | null;
  voicePhaseLabel?: string | null;
  showMic?: boolean;
  busy?: boolean;
  onCopyMessage?: (content: string) => void;
  onRegenerate?: () => void;
  onEditMessage?: (messageId: string, nextText: string) => void;
  onFeedback?: (messageId: string, rating: "up" | "down") => void;
  onRetry?: () => void;
};

function voiceTurnsToMessages(turns: VoiceTurn[]): UiMessage[] {
  const out: UiMessage[] = [];
  for (const turn of turns) {
    if (turn.user) {
      out.push({
        id: `${turn.id}-user`,
        role: "user",
        content: turn.user,
      });
    }
    if (turn.assistant) {
      out.push({
        id: `${turn.id}-assistant`,
        role: "assistant",
        content: turn.assistant,
      });
    }
  }
  return out;
}

export function ChatMessages({
  messages,
  phase,
  micState,
  onMicPress,
  micDisabled,
  sessionLabel,
  voiceTurns = [],
  liveTranscript,
  liveReply,
  voicePhaseLabel,
  showMic = true,
  busy = false,
  onCopyMessage,
  onRegenerate,
  onEditMessage,
  onFeedback,
  onRetry,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const allMessages = useMemo(() => {
    const voiceMessages = voiceTurnsToMessages(voiceTurns);
    const merged = [...messages, ...voiceMessages];
    if (liveTranscript) {
      merged.push({
        id: "live-transcript",
        role: "user",
        content: liveTranscript,
      });
    }
    if (liveReply) {
      merged.push({
        id: "live-reply",
        role: "assistant",
        content: liveReply,
        streaming: true,
      });
    }
    return merged;
  }, [liveReply, liveTranscript, messages, voiceTurns]);

  const hasMessages = allMessages.length > 0;
  const displayPhase = voicePhaseLabel ?? phase;
  const showThinking =
    isDonnaThinkingPhase(displayPhase) ||
    (displayPhase === "generating" &&
      allMessages[allMessages.length - 1]?.streaming);
  const hasWaitingBubble = allMessages.some(
    (message) =>
      message.role === "assistant" && message.streaming && !message.content,
  );

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, displayPhase]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasMessages ? (
        <div
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
                    "max-w-[85%] min-w-0 rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed",
                    message.role === "user"
                      ? "break-words rounded-br-md bg-donna-primary text-white"
                      : "overflow-x-auto break-words rounded-bl-md border border-donna-border bg-donna-surface text-donna-text",
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
                  {message.cancelled && !message.content ? (
                    <p className="text-sm italic text-donna-muted">
                      Generation stopped
                    </p>
                  ) : null}
                </div>

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
          {showThinking && !hasWaitingBubble ? (
            <AssistantThinkingBlock />
          ) : displayPhase && !showThinking ? (
            <p className="mr-auto text-sm text-donna-muted">{displayPhase}</p>
          ) : null}
          <div ref={bottomRef} />
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
