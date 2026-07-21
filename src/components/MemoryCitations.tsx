import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Globe2,
  StickyNote,
} from "lucide-react";
import type { MemoryCitation } from "../types/citations";
import { postMemoryFeedback } from "../services/memoryApi";
import { cn } from "../lib/cn";

type Props = {
  citations: MemoryCitation[];
  className?: string;
};

export function MemoryCitations({ citations, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState<string | null>(null);
  const [feedbackDone, setFeedbackDone] = useState<Record<string, string>>({});
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  if (!citations.length) {
    return null;
  }

  const webCount = citations.filter((c) => c.source === "web").length;
  const noteCount = citations.filter((c) => c.source === "note").length;
  const granolaCount = citations.filter((c) => c.source === "granola").length;
  const factCount = citations.length - noteCount - webCount - granolaCount;
  const labelParts: string[] = [];
  if (webCount > 0) {
    labelParts.push(`${webCount} web source${webCount === 1 ? "" : "s"}`);
  }
  if (factCount > 0) {
    labelParts.push(`${factCount} memor${factCount === 1 ? "y" : "ies"}`);
  }
  if (noteCount > 0) {
    labelParts.push(`${noteCount} note${noteCount === 1 ? "" : "s"}`);
  }
  if (granolaCount > 0) {
    labelParts.push(
      `${granolaCount} Granola source${granolaCount === 1 ? "" : "s"}`,
    );
  }
  const chipLabel = `Used ${labelParts.join(" · ")}`;

  const sendFeedback = async (
    citation: MemoryCitation,
    action: "not_relevant" | "outdated",
  ) => {
    if (!citation.id || citation.source === "web" || citation.source === "note") {
      return;
    }
    const key = `${citation.id}:${action}`;
    setFeedbackBusy(key);
    setFeedbackError(null);
    try {
      await postMemoryFeedback({ fact_id: citation.id, action });
      setFeedbackDone((prev) => ({ ...prev, [citation.id!]: action }));
    } catch (err: unknown) {
      setFeedbackError(
        err instanceof Error ? err.message : "Feedback failed",
      );
    } finally {
      setFeedbackBusy(null);
    }
  };

  return (
    <div className={cn("mt-1.5 max-w-[85%]", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-donna-border bg-donna-surface/80",
          "px-2.5 py-1 text-xs font-medium text-donna-muted",
          "transition hover:border-donna-gold/40 hover:text-donna-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold/40",
        )}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <Brain className="h-3.5 w-3.5 text-donna-gold" aria-hidden />
        <span>{chipLabel}</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden />
        )}
      </button>

      {expanded ? (
        <ul className="mt-2 space-y-1.5 rounded-xl border border-donna-border bg-donna-surface p-2.5 text-xs text-donna-text">
          {feedbackError ? (
            <li className="px-1.5 text-donna-destructive">{feedbackError}</li>
          ) : null}
          {citations.map((citation, index) => {
            const key = `${citation.source}-${citation.id ?? index}`;
            const isNote = citation.source === "note" && citation.id;
            const isWeb = citation.source === "web" && citation.url;
            const isGranola = citation.source === "granola";
            const isMemoryFact =
              Boolean(citation.id) &&
              !isNote &&
              !isWeb &&
              citation.source !== "granola";
            const Icon = isWeb
              ? Globe2
              : isNote
                ? StickyNote
                : isGranola
                  ? CalendarDays
                  : Brain;
            const body = (
              <span className="flex items-start gap-2">
                <Icon
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-donna-gold"
                  aria-hidden
                />
                <span className="min-w-0 leading-relaxed">
                  {isGranola ? (
                    <span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-wide text-donna-muted">
                      Granola
                    </span>
                  ) : null}
                  {citation.text}
                </span>
              </span>
            );

            return (
              <li key={key}>
                {isNote ? (
                  <Link
                    to={`/app/notes/${citation.id}`}
                    className="block rounded-lg px-1.5 py-1 hover:bg-black/[0.04]"
                  >
                    {body}
                  </Link>
                ) : isWeb ? (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg px-1.5 py-1 hover:bg-black/[0.04]"
                  >
                    {body}
                  </a>
                ) : (
                  <div className="rounded-lg px-1.5 py-1">{body}</div>
                )}
                {isMemoryFact && citation.id ? (
                  <div className="mt-1 flex flex-wrap gap-2 px-1.5 pb-1">
                    {feedbackDone[citation.id] ? (
                      <span className="text-[0.6875rem] text-donna-muted">
                        Marked {feedbackDone[citation.id].replace("_", " ")}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="text-[0.6875rem] font-medium text-donna-muted underline-offset-2 hover:underline disabled:opacity-50"
                          disabled={feedbackBusy !== null}
                          onClick={() =>
                            void sendFeedback(citation, "not_relevant")
                          }
                        >
                          Not relevant
                        </button>
                        <button
                          type="button"
                          className="text-[0.6875rem] font-medium text-donna-muted underline-offset-2 hover:underline disabled:opacity-50"
                          disabled={feedbackBusy !== null}
                          onClick={() => void sendFeedback(citation, "outdated")}
                        >
                          Outdated
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
