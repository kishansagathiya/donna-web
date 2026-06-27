import { Mic, Square } from "lucide-react";
import { cn } from "../lib/cn";
import { Spinner } from "./ui/Spinner";

export type MicState =
  | "idle"
  | "requesting"
  | "listening"
  | "processing"
  | "error";

type Props = {
  state: MicState;
  onPress: () => void;
  disabled?: boolean;
};

function coreBackgroundClass(state: MicState): string {
  switch (state) {
    case "listening":
      return "bg-donna-destructive shadow-donna-destructive/25";
    case "processing":
      return "bg-donna-muted shadow-donna-muted/25";
    default:
      return "bg-donna-primary shadow-donna-primary/25";
  }
}

function ringBackgroundClass(state: MicState): string {
  switch (state) {
    case "listening":
      return "bg-donna-destructive/15";
    case "processing":
      return "bg-donna-muted/15";
    default:
      return "bg-donna-primary/15";
  }
}

function innerRingBackgroundClass(state: MicState): string {
  switch (state) {
    case "listening":
      return "bg-donna-destructive/10";
    case "processing":
      return "bg-donna-muted/10";
    default:
      return "bg-donna-primary/10";
  }
}

export function MicButton({ state, onPress, disabled }: Props) {
  const pulseEnabled = state === "listening" || state === "processing";
  const isRequesting = state === "requesting";
  const isListening = state === "listening";
  const isProcessing = state === "processing";
  const accessibilityLabel =
    state === "listening" || state === "processing"
      ? "Stop listening"
      : "Start listening";

  const pulseClass =
    state === "listening"
      ? "animate-pulse-ring-listening"
      : "animate-pulse-ring-processing";

  return (
    <div
      className="relative flex h-28 w-28 items-center justify-center"
      data-testid="mic-toggle"
    >
      {pulseEnabled ? (
        <>
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              ringBackgroundClass(state),
              pulseClass,
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              "absolute inset-2 rounded-full [animation-delay:0.4s]",
              innerRingBackgroundClass(state),
              pulseClass,
            )}
            aria-hidden="true"
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        aria-label={accessibilityLabel}
        aria-busy={isRequesting}
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg",
          "transition-opacity hover:opacity-90 active:opacity-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          coreBackgroundClass(state),
          isRequesting && "animate-mic-requesting",
          state === "error" && "border-[3px] border-donna-destructive",
        )}
      >
        {isProcessing ? (
          <Spinner className="!h-8 !w-8 !border-white/30 !border-t-white" />
        ) : isListening ? (
          <Square className="h-7 w-7 fill-current" strokeWidth={0} />
        ) : (
          <Mic className="h-8 w-8" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
