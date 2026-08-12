import { MessageContent } from "../MessageContent";
import { Button } from "../ui/Button";
import { Check } from "lucide-react";
import type { AgentTurn } from "../../lib/agentTurns";
import { isActiveStatus } from "../../lib/agentTurns";
import { AgentStepsGroup } from "./AgentStepsGroup";

export function AgentTurnView({
  turn,
  runStatus,
  waitingExtras,
}: {
  turn: AgentTurn;
  runStatus: string;
  waitingExtras?: {
    onFinish: () => void;
    busy: boolean;
  } | null;
}) {
  return (
    <section className="flex w-full flex-col gap-3">
      <div className="flex justify-end">
        <div className="max-w-[min(100%,42rem)] rounded-2xl bg-donna-primary px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
          {turn.prompt}
        </div>
      </div>

      <div className="flex flex-col gap-3 pl-1 sm:pl-2">
        <AgentStepsGroup
          steps={turn.steps}
          activeStepId={turn.activeStepId}
          showEmptyWaiting={turn.isLatest && isActiveStatus(runStatus)}
        />

        {turn.output.kind === "question" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Donna needs your reply
            </p>
            <div className="mt-3 text-sm leading-relaxed text-amber-950">
              <MessageContent
                content={turn.output.text}
                variant="assistant"
                className="text-[0.95rem]"
              />
            </div>
            {waitingExtras ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-amber-200/80 pt-3">
                <p className="mr-auto text-xs text-amber-900/80">
                  Or close this agent without answering.
                </p>
                <Button
                  variant="secondary"
                  className="!w-auto gap-1.5 border-amber-300 bg-white px-3 py-2 text-sm text-amber-950 hover:border-amber-400"
                  disabled={waitingExtras.busy}
                  onClick={waitingExtras.onFinish}
                >
                  <Check className="h-4 w-4" />
                  Mark finished
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {turn.output.kind === "summary" ? (
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-donna-muted">
              Output
            </p>
            <div className="overflow-x-hidden rounded-lg border border-donna-border bg-donna-sidebar/50 px-4 py-4">
              <MessageContent
                content={turn.output.text}
                variant="assistant"
                className="text-[0.95rem] leading-relaxed text-donna-text [&_pre]:max-w-full [&_pre]:overflow-x-auto"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
