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
  variant?: "hero" | "inline";
};

function coreBackgroundClass(state: MicState): string {
  if (state === "processing") {
    return "bg-donna-muted shadow-donna-muted/25";
  }
  return "bg-donna-primary shadow-donna-primary/25";
}

function ringBackgroundClass(state: MicState): string {
  if (state === "processing") {
    return "bg-donna-muted/15";
  }
  return "bg-donna-primary/15";
}

function innerRingBackgroundClass(state: MicState): string {
  if (state === "processing") {
    return "bg-donna-muted/10";
  }
  return "bg-donna-primary/10";
}

export function MicButton({
  state,
  onPress,
  disabled,
  variant = "hero",
}: Props) {
  const isInline = variant === "inline";
  const pulseEnabled =
    !isInline && (state === "listening" || state === "processing");
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
      className={cn(
        "relative flex items-center justify-center",
        isInline ? "h-9 w-9" : "h-28 w-28",
      )}
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
          "relative flex items-center justify-center rounded-full text-white",
          "transition-opacity hover:opacity-90 active:opacity-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          coreBackgroundClass(state),
          isInline
            ? "h-9 w-9 shadow-none"
            : "h-20 w-20 shadow-lg",
          isRequesting && "animate-mic-requesting",
          state === "error" && "border-[3px] border-donna-destructive",
          isInline && isListening && "ring-2 ring-donna-primary-ring",
        )}
      >
        {isProcessing ? (
          <Spinner
            className={cn(
              "!border-white/30 !border-t-white",
              isInline ? "!h-4 !w-4" : "!h-8 !w-8",
            )}
          />
        ) : isListening ? (
          <Square
            className={cn("fill-current", isInline ? "h-3.5 w-3.5" : "h-7 w-7")}
            strokeWidth={0}
          />
        ) : (
          <Mic
            className={cn(isInline ? "h-4 w-4" : "h-8 w-8")}
            strokeWidth={1.75}
          />
        )}
      </button>
    </div>
  );
}
