import { useEffect, useMemo, useRef } from "react";
import type { UiMessage } from "../hooks/useChatSession";
import type { VoiceTurn } from "../hooks/useVoiceSession";
import { ChatHero } from "./ChatHero";
import type { MicState } from "./MicButton";
import { MessageContent } from "./MessageContent";
import { ThinkingIndicator } from "./ThinkingIndicator";
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
          {allMessages.map((message) => (
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
          {showThinking ? (
            <ThinkingIndicator />
          ) : displayPhase ? (
            <p className="text-sm text-donna-muted">{displayPhase}</p>
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
