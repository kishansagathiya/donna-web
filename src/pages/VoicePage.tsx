import { useLiveVoiceSession } from "../hooks/useLiveVoiceSession";
import { cn } from "../lib/cn";
import { Mic, Square } from "lucide-react";

export function VoicePage() {
  const { state, errorMsg, lines, assistantSpeaking, toggle } =
    useLiveVoiceSession();
  const live = state === "live";
  const connecting = state === "connecting";

  const statusLabel = connecting
    ? "Connecting…"
    : live
      ? assistantSpeaking
        ? "Donna is speaking…"
        : "Listening — talk naturally"
      : "Start a realtime conversation with Donna";

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-6 md:px-10">
      <header className="mb-6 max-w-xl">
        <h1 className="text-3xl font-bold text-donna-text">Voice</h1>
        <p className="mt-2 text-sm leading-relaxed text-donna-muted">
          Realtime conversation with Donna — natural turn-taking, like Gemini
          Live. Separate from chat mic dictation.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-donna-border bg-donna-surface/40 p-4">
        {lines.length === 0 ? (
          <p className="mt-16 text-center text-sm text-donna-muted">
            Your conversation captions will appear here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {lines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-3",
                  line.role === "user"
                    ? "ml-auto bg-donna-primary-light"
                    : "mr-auto border border-donna-border bg-white",
                )}
              >
                <p className="mb-1 text-xs font-semibold text-donna-muted">
                  {line.role === "user" ? "You" : "Donna"}
                </p>
                <p className="text-sm leading-relaxed text-donna-text">
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {errorMsg ? (
        <p className="mt-3 text-center text-sm text-red-600">{errorMsg}</p>
      ) : null}
      <p className="mt-3 text-center text-sm text-donna-muted">{statusLabel}</p>

      <div className="mt-4 flex justify-center pb-2">
        <button
          type="button"
          onClick={() => void toggle()}
          className={cn(
            "inline-flex min-w-[10rem] items-center justify-center gap-2 rounded-full px-8 py-4",
            "text-base font-semibold text-white transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring focus-visible:ring-offset-2",
            live
              ? "bg-red-600 hover:bg-red-700"
              : "bg-donna-primary hover:bg-donna-primary-hover",
          )}
          aria-label={live || connecting ? "End Voice" : "Start Voice"}
        >
          {connecting ? (
            <span className="h-5 w-5 animate-pulse rounded-full bg-white/80" />
          ) : live ? (
            <Square className="h-5 w-5 fill-current" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          {connecting ? "Connecting" : live ? "End" : "Voice"}
        </button>
      </div>
    </div>
  );
}
