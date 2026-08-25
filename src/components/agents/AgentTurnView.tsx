import { MessageContent } from "../MessageContent";
import { AssistantThinkingBlock } from "../ThinkingIndicator";
import { Button } from "../ui/Button";
import { Check } from "lucide-react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/cn";
import type { AgentTurn, AskOption, BookingProposal } from "../../lib/agentTurns";
import {
  shouldCollapseTurnSteps,
  shouldShowAgentThinking,
  timelineSteps,
} from "../../lib/agentTurns";
import { AgentStepsGroup } from "./AgentStepsGroup";
import { BookingProposalCard } from "./BookingProposalCard";

export type AskChoiceProps = {
  options: AskOption[];
  allowMultiple: boolean;
  selected: string[];
  busy: boolean;
  onToggle: (id: string) => void;
};

export type ApprovalChoiceProps = {
  kindLabel: string;
  busy: boolean;
  onApprove: () => void;
  onDeny: () => void;
  proposal?: BookingProposal | null;
};

const optionMarkdown: Components = {
  p: ({ children }) => <>{children}</>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  a: ({ children }) => <>{children}</>,
  code: ({ children }) => (
    <code className="font-mono text-[12px]">{children}</code>
  ),
};

function AskOptions({
  options,
  allowMultiple,
  selected,
  busy,
  onToggle,
}: AskChoiceProps) {
  if (options.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs text-amber-800">
        {allowMultiple ? "Select one or more" : "Select one"}
      </p>
      <div
        className={
          options.length > 1
            ? "grid grid-cols-2 gap-2"
            : "flex flex-col gap-2"
        }
      >
        {options.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={busy}
              aria-pressed={on}
              onClick={() => onToggle(opt.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-[13px] leading-snug transition-colors",
                on
                  ? "border-donna-primary bg-donna-primary text-white"
                  : "border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-400",
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={optionMarkdown}
              >
                {opt.label}
              </ReactMarkdown>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AgentTurnView({
  turn,
  runStatus,
  waitingExtras,
  ask,
  approval,
}: {
  turn: AgentTurn;
  runStatus: string;
  waitingExtras?: {
    onFinish: () => void;
    busy: boolean;
  } | null;
  ask?: AskChoiceProps | null;
  approval?: ApprovalChoiceProps | null;
}) {
  // Prompt → steps → result → follow-up. Collapse this turn's timeline once
  // it has a result, even if a later follow-up is still running. `key` forces
  // a remount on the live → settled transition so the collapsed default sticks.
  const collapseSteps = shouldCollapseTurnSteps(turn, runStatus);
  const steps = timelineSteps(turn);

  return (
    <section className="flex w-full flex-col gap-3">
      <div className="flex justify-end">
        <div className="max-w-[min(100%,42rem)] rounded-2xl bg-donna-primary px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
          {turn.prompt}
        </div>
      </div>

      <div className="flex flex-col gap-3 pl-1 sm:pl-2">
        {turn.isLatest &&
        shouldShowAgentThinking(runStatus, turn.steps.length) ? (
          <AssistantThinkingBlock />
        ) : (
          <AgentStepsGroup
            key={collapseSteps ? "collapsed" : "open"}
            steps={steps}
            activeStepId={turn.activeStepId}
            defaultOpen={!collapseSteps}
          />
        )}

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

        {turn.question ? (
          <div className="rounded-lg border border-donna-border bg-donna-sidebar/50 px-4 py-4">
            <p
              className={
                turn.question.live
                  ? "text-xs font-semibold uppercase tracking-wide text-amber-800"
                  : "text-xs font-semibold uppercase tracking-wide text-donna-muted"
              }
            >
              {turn.question.live
                ? approval
                  ? "Needs your approval"
                  : "Donna needs your reply"
                : approval
                  ? "Approval"
                  : "Question"}
            </p>
            {turn.question.live && approval ? (
              <p className="mt-1 text-xs text-amber-800">
                {approval.kindLabel}
              </p>
            ) : null}
            {turn.question.live && approval?.proposal ? (
              <BookingProposalCard proposal={approval.proposal} />
            ) : null}
            <div className="mt-3 text-sm leading-relaxed text-donna-text">
              <MessageContent
                content={turn.question.text}
                variant="assistant"
                className="text-[0.95rem]"
              />
            </div>
            {turn.question.live && approval ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  className="!w-auto gap-1.5 px-3 py-2 text-sm"
                  disabled={approval.busy}
                  onClick={approval.onApprove}
                >
                  <Check className="h-4 w-4" />
                  Confirm
                </Button>
                <Button
                  variant="secondary"
                  className="!w-auto px-3 py-2 text-sm"
                  disabled={approval.busy}
                  onClick={approval.onDeny}
                >
                  Deny
                </Button>
                <p className="text-xs text-donna-muted">
                  Or tell Donna what to change below.
                </p>
              </div>
            ) : null}
            {turn.question.live && ask ? <AskOptions {...ask} /> : null}
            {turn.question.live && waitingExtras ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-donna-border pt-3">
                <p className="mr-auto text-xs text-donna-muted">
                  Or close this agent without answering.
                </p>
                <Button
                  variant="secondary"
                  className="!w-auto gap-1.5 px-3 py-2 text-sm"
                  disabled={waitingExtras.busy}
                  onClick={waitingExtras.onFinish}
                >
                  <Check className="h-4 w-4" />
                  Mark finished
                </Button>
              </div>
            ) : null}
          </div>
        ) : ask && turn.isLatest ? (
          <AskOptions {...ask} />
        ) : null}
      </div>
    </section>
  );
}

