import { useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "../lib/cn";
import {
  formatSpeakTime,
  getSpeakSnapshot,
  seekSpeak,
  speakText,
  subscribeSpeaking,
  unlockAudio,
} from "../lib/speak";

type Props = {
  messageId: string;
  content: string;
  busy?: boolean;
  onError?: (message: string) => void;
  actionClass: string;
};

export function ReplyAudioControls({
  messageId,
  content,
  busy = false,
  onError,
  actionClass,
}: Props) {
  const snapshot = useSyncExternalStore(
    subscribeSpeaking,
    getSpeakSnapshot,
    () => ({
      id: null,
      status: "idle" as const,
      currentTime: 0,
      duration: 0,
    }),
  );

  const isActive = snapshot.id === messageId && snapshot.status !== "idle";
  const isPlaying = isActive && snapshot.status === "playing";
  const isLoading = isActive && snapshot.status === "loading";
  const progress =
    isActive && snapshot.duration > 0
      ? Math.min(1, snapshot.currentTime / snapshot.duration)
      : 0;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1",
        isActive && "max-w-full flex-1 sm:max-w-xs",
      )}
    >
      <button
        type="button"
        className={cn(actionClass, isActive && "text-donna-primary")}
        aria-label={
          isLoading
            ? "Loading audio"
            : isPlaying
              ? "Pause"
              : isActive
                ? "Play"
                : "Read aloud"
        }
        aria-pressed={isPlaying}
        disabled={busy || isLoading}
        onClick={() => {
          unlockAudio();
          void speakText(messageId, content).catch((err: unknown) => {
            onError?.(
              err instanceof Error ? err.message : "Could not speak reply",
            );
          });
        }}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" strokeWidth={1.75} fill="currentColor" />
        ) : (
          <Play className="h-3.5 w-3.5" strokeWidth={1.75} fill="currentColor" />
        )}
      </button>

      {isActive ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 pr-1">
          <input
            type="range"
            min={0}
            max={snapshot.duration || 0}
            step={0.05}
            value={snapshot.currentTime}
            disabled={isLoading || snapshot.duration <= 0}
            aria-label="Audio position"
            className={cn(
              "h-1 w-full min-w-[5rem] flex-1 cursor-pointer appearance-none rounded-full",
              "bg-donna-border accent-donna-primary",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
            style={{
              background: `linear-gradient(to right, var(--color-donna-primary) ${progress * 100}%, var(--color-donna-border) ${progress * 100}%)`,
            }}
            onChange={(e) => {
              seekSpeak(Number(e.target.value));
            }}
          />
          <span className="shrink-0 tabular-nums text-[11px] text-donna-muted">
            {formatSpeakTime(snapshot.currentTime)}
            {snapshot.duration > 0
              ? ` / ${formatSpeakTime(snapshot.duration)}`
              : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}
