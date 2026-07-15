import { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, ChevronDown, ChevronUp, StickyNote } from "lucide-react";
import type { MemoryCitation } from "../types/citations";
import { cn } from "../lib/cn";

type Props = {
  citations: MemoryCitation[];
  className?: string;
};

export function MemoryCitations({ citations, className }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!citations.length) {
    return null;
  }

  const noteCount = citations.filter((c) => c.source === "note").length;
  const factCount = citations.length - noteCount;
  const labelParts: string[] = [];
  if (factCount > 0) {
    labelParts.push(`${factCount} memor${factCount === 1 ? "y" : "ies"}`);
  }
  if (noteCount > 0) {
    labelParts.push(`${noteCount} note${noteCount === 1 ? "" : "s"}`);
  }
  const chipLabel = `Used ${labelParts.join(" · ")}`;

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
          {citations.map((citation, index) => {
            const key = `${citation.source}-${citation.id ?? index}`;
            const isNote = citation.source === "note" && citation.id;
            const Icon = isNote ? StickyNote : Brain;
            const body = (
              <span className="flex items-start gap-2">
                <Icon
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-donna-gold"
                  aria-hidden
                />
                <span className="min-w-0 leading-relaxed">{citation.text}</span>
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
                ) : (
                  <div className="rounded-lg px-1.5 py-1">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
