import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MessageContent } from "../MessageContent";
import { cn } from "../../lib/cn";
import {
  stepBody,
  stepTitle,
  type AgentStepLike,
} from "../../lib/agentTurns";

function StepRow({
  step,
  active,
  defaultOpen,
}: {
  step: AgentStepLike;
  active?: boolean;
  defaultOpen?: boolean;
}) {
  const body = stepBody(step).trim();
  const hasBody = body.length > 0 && body !== stepTitle(step);
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <li
      className={cn(
        "border-b border-donna-border last:border-b-0",
        active && "bg-sky-50/80",
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-donna-sidebar/60"
        onClick={() => hasBody && setOpen((v) => !v)}
        disabled={!hasBody}
      >
        <span className="mt-0.5 shrink-0 text-donna-muted">
          {hasBody ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="inline-block w-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-mono text-[11px] text-donna-muted">#{step.seq}</span>{" "}
          <span
            className={cn(
              "text-xs font-semibold",
              active ? "text-sky-900" : "text-donna-text",
            )}
          >
            {stepTitle(step)}
            {active ? (
              <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-sky-700">
                running
              </span>
            ) : null}
          </span>
          {!open && hasBody ? (
            <span className="mt-0.5 block truncate text-xs text-donna-muted">
              {body.replace(/\s+/g, " ")}
            </span>
          ) : null}
        </span>
      </button>
      {open && hasBody ? (
        <div className="border-t border-donna-border/60 bg-donna-sidebar/40 px-3 py-2.5 pl-9">
          {step.kind === "thought" ||
          step.kind === "tool_result" ||
          step.kind === "approval_request" ? (
            <MessageContent
              content={body}
              variant="assistant"
              className="text-sm leading-relaxed text-donna-text [&_pre]:max-w-full [&_pre]:overflow-x-auto"
            />
          ) : (
            <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-donna-text">
              {body}
            </pre>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function AgentStepsGroup({
  steps,
  activeStepId,
  showEmptyWaiting = false,
  defaultOpen = true,
}: {
  steps: AgentStepLike[];
  activeStepId: string | null;
  showEmptyWaiting?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (steps.length === 0) {
    if (!showEmptyWaiting) return null;
    return (
      <p className="px-1 text-xs text-donna-muted">Waiting for steps…</p>
    );
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="mb-1.5 flex w-full items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wide text-donna-muted hover:text-donna-text"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        Steps ({steps.length})
        {!open ? (
          <span className="ml-1 font-normal normal-case tracking-normal text-donna-muted">
            · show timeline
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="overflow-x-hidden rounded-lg border border-donna-border">
          <ul>
            {steps.map((s) => (
              <StepRow
                key={s.id}
                step={s}
                active={activeStepId === s.id}
                defaultOpen={activeStepId === s.id}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
