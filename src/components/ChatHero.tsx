import { MicButton, type MicState } from "./MicButton";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { cn } from "../lib/cn";
import { isDonnaThinkingPhase } from "../lib/thinkingPhrases";

type Props = {
  micState: MicState;
  onMicPress: () => void;
  micDisabled?: boolean;
  compact?: boolean;
  showMic?: boolean;
  sessionLabel?: string | null;
};

export function ChatHero({
  micState,
  onMicPress,
  micDisabled,
  compact = false,
  showMic = true,
  sessionLabel,
}: Props) {
  if (compact && !showMic && !sessionLabel) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-4" : "flex-1 py-8",
      )}
    >
      {showMic ? (
        <MicButton
          state={micState}
          onPress={onMicPress}
          disabled={micDisabled}
        />
      ) : null}

      {isDonnaThinkingPhase(sessionLabel) ? (
        <ThinkingIndicator className="mt-4 text-[0.9375rem] font-semibold" />
      ) : sessionLabel ? (
        <p
          className="mt-4 text-[0.9375rem] font-semibold leading-snug text-donna-muted"
          aria-live="polite"
        >
          {sessionLabel}
        </p>
      ) : null}

      {compact || sessionLabel || !showMic ? null : (
        <>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-donna-text sm:text-4xl">
            Ask Donna anything
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-donna-muted">
            Donna remembers what you save — links, files, and past conversations.
          </p>
        </>
      )}
    </div>
  );
}
