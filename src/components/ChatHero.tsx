import { MicButton, type MicState } from "./MicButton";
import { cn } from "../lib/cn";

type Props = {
  micState: MicState;
  onMicPress: () => void;
  micDisabled?: boolean;
  compact?: boolean;
  sessionLabel?: string | null;
};

export function ChatHero({
  micState,
  onMicPress,
  micDisabled,
  compact = false,
  sessionLabel,
}: Props) {
  const isListening = micState === "listening";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-4" : "flex-1 py-8",
      )}
    >
      <MicButton
        state={micState}
        onPress={onMicPress}
        disabled={micDisabled}
      />

      {sessionLabel ? (
        <p
          className={cn(
            "mt-4 text-[0.9375rem] font-semibold leading-snug",
            isListening ? "text-donna-destructive" : "text-donna-muted",
          )}
          aria-live="polite"
        >
          {sessionLabel}
        </p>
      ) : null}

      {compact || sessionLabel ? null : (
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
