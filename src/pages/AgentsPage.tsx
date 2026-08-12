import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, ChevronDown, ChevronRight, RefreshCw, Send, Square } from "lucide-react";
import {
  cancelAgentRun,
  createAgentRun,
  listAgentRuns,
  listAgentSteps,
  redirectAgentRun,
  type AgentRun,
  type AgentStep,
} from "../services/agentsApi";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { MessageContent } from "../components/MessageContent";
import { cn } from "../lib/cn";

type AskOption = { id: string; label: string };

function statusTone(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "failed":
    case "cancelled":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "waiting_for_user":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "running":
    case "queued":
      return "bg-sky-50 text-sky-800 border-sky-200";
    default:
      return "bg-donna-surface text-donna-muted border-donna-border";
  }
}

function resultSummary(result: Record<string, unknown> | null | undefined): string {
  if (!result) return "";
  if (typeof result.summary === "string" && result.summary.trim()) {
    return result.summary;
  }
  if (typeof result.question === "string" && result.question.trim()) {
    return result.question;
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function pendingQuestion(result: Record<string, unknown> | null | undefined): string | null {
  if (!result) return null;
  if (typeof result.question === "string" && result.question.trim()) {
    return result.question.trim();
  }
  if (result.kind === "ask_user" && typeof result.summary === "string" && result.summary.trim()) {
    return result.summary.trim();
  }
  if (typeof result.summary === "string" && result.summary.trim() && String(result.kind ?? "").includes("ask")) {
    return result.summary.trim();
  }
  return null;
}

function parseOptions(result: Record<string, unknown> | null | undefined): AskOption[] {
  if (!result) return [];
  const raw = result.options ?? (result.args as { options?: unknown } | undefined)?.options;
  if (!Array.isArray(raw)) return [];
  const out: AskOption[] = [];
  raw.forEach((item, i) => {
    if (typeof item === "string" && item.trim()) {
      out.push({ id: `opt_${i + 1}`, label: item.trim() });
      return;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const label = String(obj.label ?? obj.text ?? "").trim();
      if (!label) return;
      const id = String(obj.id ?? `opt_${i + 1}`).trim() || `opt_${i + 1}`;
      out.push({ id, label });
    }
  });
  return out;
}

function canReply(status: string): boolean {
  return (
    status === "waiting_for_user" ||
    status === "running" ||
    status === "queued" ||
    status === "succeeded" ||
    status === "failed"
  );
}

function stepTitle(step: AgentStep): string {
  const p = step.payload || {};
  switch (step.kind) {
    case "status":
      return String(p.text ?? "status");
    case "thought":
      return "Thought";
    case "tool_call":
      return `Tool → ${String(p.name ?? "tool")}`;
    case "tool_result":
      return `Result ← ${String(p.name ?? "tool")}`;
    case "user_message":
      return "Reply";
    case "approval_request":
      return p.kind === "ask_user" || p.tool === "ask_user" ? "Question for you" : "Approval requested";
    case "error":
      return "Error";
    case "compress":
      return "Context compressed";
    case "memory_retrieve":
      return "Memory";
    default:
      return step.kind;
  }
}

function stepBody(step: AgentStep): string {
  const p = step.payload || {};
  switch (step.kind) {
    case "status":
      return String(p.text ?? "");
    case "thought":
      return String(p.text ?? "");
    case "tool_call": {
      const args = p.args;
      if (args == null) return "";
      if (typeof args === "string") return args;
      try {
        return JSON.stringify(args, null, 2);
      } catch {
        return String(args);
      }
    }
    case "tool_result":
      return String(p.content ?? "");
    case "user_message":
      return String(p.message ?? "");
    case "approval_request":
      if (typeof p.question === "string" && p.question.trim()) {
        return p.question;
      }
      try {
        return JSON.stringify(p, null, 2);
      } catch {
        return String(p);
      }
    case "error":
      return String(p.error ?? "");
    default:
      try {
        return JSON.stringify(p, null, 2);
      } catch {
        return "";
      }
  }
}

function StepRow({ step, defaultOpen }: { step: AgentStep; defaultOpen?: boolean }) {
  const body = stepBody(step).trim();
  const hasBody = body.length > 0 && body !== stepTitle(step);
  const [open, setOpen] = useState(Boolean(defaultOpen || step.kind === "thought" || step.kind === "error"));

  return (
    <li className="border-b border-donna-border last:border-b-0">
      <button
        type="button"
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-donna-sidebar/60"
        onClick={() => hasBody && setOpen((v) => !v)}
        disabled={!hasBody}
      >
        <span className="mt-0.5 shrink-0 text-donna-muted">
          {hasBody ? (
            open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="inline-block w-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-mono text-[11px] text-donna-muted">#{step.seq}</span>{" "}
          <span className="text-xs font-semibold text-donna-text">{stepTitle(step)}</span>
          {!open && hasBody ? (
            <span className="mt-0.5 block truncate text-xs text-donna-muted">{body.replace(/\s+/g, " ")}</span>
          ) : null}
        </span>
      </button>
      {open && hasBody ? (
        <div className="border-t border-donna-border/60 bg-donna-sidebar/40 px-3 py-2.5 pl-9">
          {step.kind === "thought" || step.kind === "tool_result" || step.kind === "approval_request" ? (
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

function ReplyComposer({
  waiting,
  options,
  allowMultiple,
  busy,
  value,
  onChange,
  onSend,
}: {
  waiting: boolean;
  options: AskOption[];
  allowMultiple: boolean;
  busy: boolean;
  value: string;
  onChange: (v: string) => void;
  onSend: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const optionKey = options.map((o) => o.id).join("|");
  useEffect(() => {
    setSelected([]);
  }, [optionKey]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (allowMultiple) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return prev[0] === id ? [] : [id];
    });
  }

  function composeFromSelection(): string {
    const labels = options.filter((o) => selected.includes(o.id)).map((o) => o.label);
    if (labels.length === 0) return value.trim();
    const choice = labels.join(", ");
    const extra = value.trim();
    return extra ? `${choice}\n\n${extra}` : choice;
  }

  const canSend = Boolean(composeFromSelection());

  return (
    <div className="rounded-lg border border-donna-border bg-donna-surface/60 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-donna-muted">
        {waiting ? "Your reply" : "Continue / reply"}
      </p>

      {options.length > 0 ? (
        <div className="mb-3">
          <p className="mb-2 text-xs text-donna-muted">
            {allowMultiple ? "Select one or more options" : "Select an option"}
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const on = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(opt.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    on
                      ? "border-donna-primary bg-donna-primary text-white"
                      : "border-donna-border bg-white text-donna-text hover:border-donna-primary/50",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <textarea
        className="min-h-[7.5rem] w-full resize-y rounded-xl border border-donna-border bg-white px-3 py-3 text-sm leading-relaxed text-donna-text outline-none focus:ring-2 focus:ring-donna-primary-ring"
        placeholder={
          options.length > 0
            ? allowMultiple
              ? "Optional note to add with your selection…"
              : "Or type a different answer…"
            : waiting
              ? "Write your answer…"
              : "Add a follow-up or correction…"
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend && !busy) {
            e.preventDefault();
            onSend(composeFromSelection());
          }
        }}
        autoFocus={waiting && options.length === 0}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] text-donna-muted">
          {options.length > 0
            ? "⌘/Ctrl+Enter to send"
            : "Markdown ok · ⌘/Ctrl+Enter to send"}
        </p>
        <Button
          className="!w-auto gap-2 px-4 py-2.5 text-sm"
          disabled={busy || !canSend}
          onClick={() => onSend(composeFromSelection())}
        >
          <Send className="h-4 w-4" />
          {options.length > 0 && selected.length > 0 && !value.trim() ? "Confirm" : "Reply"}
        </Button>
      </div>
    </div>
  );
}

export function AgentsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [goal, setGoal] = useState("");
  const [redirect, setRedirect] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const list = await listAgentRuns();
      setRuns(list);
      if (selected && !list.some((r) => r.id === selected) && list[0]) {
        setSelected(list[0].id);
      } else if (!selected && list[0]) {
        setSelected(list[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const refreshSteps = useCallback(async (id: string) => {
    try {
      const list = await listAgentSteps(id);
      setSteps(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load steps");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selected) {
      setSteps([]);
      return;
    }
    void refreshSteps(selected);
    const t = window.setInterval(() => {
      void refresh();
      void refreshSteps(selected);
    }, 2500);
    return () => window.clearInterval(t);
  }, [selected, refresh, refreshSteps]);

  useEffect(() => {
    setRedirect("");
  }, [selected]);

  async function onStart() {
    const g = goal.trim();
    if (!g || busy) return;
    setBusy(true);
    setError(null);
    try {
      const run = await createAgentRun(g);
      setGoal("");
      setSelected(run.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start agent");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(id: string) {
    setBusy(true);
    try {
      await cancelAgentRun(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReply(id: string, message: string) {
    const msg = message.trim();
    if (!msg) return;
    setBusy(true);
    try {
      await redirectAgentRun(id, msg);
      setRedirect("");
      await refresh();
      await refreshSteps(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  }

  const active = runs.find((r) => r.id === selected) ?? null;
  const summary = active ? resultSummary(active.result) : "";
  const question =
    active?.status === "waiting_for_user" ? pendingQuestion(active.result) ?? summary : null;
  const options = useMemo(
    () => (active?.status === "waiting_for_user" ? parseOptions(active.result) : []),
    [active?.status, active?.result],
  );
  const allowMultiple = Boolean(
    active?.status === "waiting_for_user" &&
      (active.result?.allow_multiple === true ||
        (active.result?.args as { allow_multiple?: boolean } | undefined)?.allow_multiple === true),
  );
  const showReply = active ? canReply(active.status) && active.status !== "cancelled" : false;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 flex-col gap-3 border-b border-donna-border px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h1 className="text-xl font-semibold text-donna-text">Cloud agents</h1>
          <p className="mt-0.5 text-sm text-donna-muted">
            Background goals on Donna cloud — phone can lock while it works.
          </p>
        </div>
        <Button
          variant="ghost"
          className="!w-auto gap-2 px-3 py-2 text-sm"
          onClick={() => void refresh()}
          disabled={busy}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex w-full flex-col gap-5 px-5 py-5 md:px-8 lg:px-10">
          {error ? <AlertBanner>{error}</AlertBanner> : null}

          <section className="rounded-donna border border-donna-border bg-white p-4">
            <label className="block text-sm font-medium text-donna-text">Start a goal</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                className="min-w-0 flex-1 rounded-xl border border-donna-border bg-donna-surface px-3 py-2.5 text-sm text-donna-text outline-none focus:ring-2 focus:ring-donna-primary-ring"
                placeholder="Find the Lisbon rooftop dinner photo in my notes…"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onStart();
                }}
              />
              <Button
                className="!w-auto gap-2 px-4 py-2.5 text-sm"
                onClick={() => void onStart()}
                disabled={busy || !goal.trim()}
              >
                <Send className="h-4 w-4" />
                Run
              </Button>
            </div>
          </section>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : runs.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No agent runs yet"
              description="Start a background goal above. Donna will search memory and the web while you do other things."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
              <div className="flex max-h-[min(80vh,48rem)] flex-col gap-2 overflow-y-auto pr-1">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelected(run.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      selected === run.id
                        ? "border-donna-primary bg-donna-primary/5"
                        : "border-donna-border bg-donna-surface hover:bg-donna-sidebar",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          statusTone(run.status),
                        )}
                      >
                        {run.status === "waiting_for_user" ? "needs reply" : run.status}
                      </span>
                      <span className="text-[11px] text-donna-muted">{run.step_count} steps</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-donna-text">{run.goal}</p>
                  </button>
                ))}
              </div>

              <section className="min-w-0 rounded-donna border border-donna-border bg-white p-4">
                {!active ? (
                  <p className="text-sm text-donna-muted">Select a run</p>
                ) : (
                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="whitespace-pre-wrap break-words text-sm font-semibold text-donna-text">
                          {active.goal}
                        </p>
                        <p className="mt-1 text-xs text-donna-muted">
                          {active.status}
                          {active.error ? ` · ${active.error}` : ""}
                        </p>
                      </div>
                      {(active.status === "running" ||
                        active.status === "queued" ||
                        active.status === "waiting_for_user") && (
                        <Button
                          variant="ghost"
                          className="!w-auto shrink-0 gap-1 px-3 py-2 text-sm"
                          disabled={busy}
                          onClick={() => void onCancel(active.id)}
                        >
                          <Square className="h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>

                    {active.status === "waiting_for_user" ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                          Donna needs your reply
                        </p>
                        {question ? (
                          <div className="mt-3 min-h-[8rem] max-h-[min(55vh,28rem)] overflow-y-auto text-sm leading-relaxed text-amber-950">
                            <MessageContent content={question} variant="assistant" className="text-[0.95rem]" />
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-amber-900">
                            Answer below to continue this agent.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {summary && active.status !== "waiting_for_user" ? (
                      <div className="min-w-0">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-donna-muted">
                          Output
                        </p>
                        <div className="min-h-[16rem] max-h-[min(70vh,40rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-donna-border bg-donna-sidebar/50 px-4 py-4">
                          <MessageContent
                            content={summary}
                            variant="assistant"
                            className="text-[0.95rem] leading-relaxed text-donna-text [&_pre]:max-w-full [&_pre]:overflow-x-auto"
                          />
                        </div>
                      </div>
                    ) : null}

                    {showReply ? (
                      <ReplyComposer
                        waiting={active.status === "waiting_for_user"}
                        options={options}
                        allowMultiple={allowMultiple}
                        busy={busy}
                        value={redirect}
                        onChange={setRedirect}
                        onSend={(message) => void onReply(active.id, message)}
                      />
                    ) : null}

                    <div className="min-w-0">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-donna-muted">
                        Steps ({steps.length})
                      </p>
                      <div className="max-h-[min(45vh,24rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-donna-border">
                        {steps.length === 0 ? (
                          <p className="p-3 text-xs text-donna-muted">Waiting for steps…</p>
                        ) : (
                          <ul>
                            {steps.map((s) => (
                              <StepRow
                                key={s.id}
                                step={s}
                                defaultOpen={
                                  s.kind === "thought" ||
                                  s.kind === "approval_request" ||
                                  (s.kind === "tool_result" && s.seq === steps[steps.length - 1]?.seq)
                                }
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
