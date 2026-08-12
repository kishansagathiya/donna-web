import { useCallback, useEffect, useState } from "react";
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
      return "Redirect";
    case "approval_request":
      return "Approval requested";
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
          {step.kind === "thought" || step.kind === "tool_result" ? (
            <MessageContent
              content={body}
              variant="assistant"
              className="text-xs leading-relaxed text-donna-text [&_pre]:max-w-full [&_pre]:overflow-x-auto"
            />
          ) : (
            <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-donna-text">
              {body}
            </pre>
          )}
        </div>
      ) : null}
    </li>
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

  async function onRedirect(id: string) {
    const msg = redirect.trim();
    if (!msg) return;
    setBusy(true);
    try {
      await redirectAgentRun(id, msg);
      setRedirect("");
      await refresh();
      await refreshSteps(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redirect failed");
    } finally {
      setBusy(false);
    }
  }

  const active = runs.find((r) => r.id === selected) ?? null;
  const summary = active ? resultSummary(active.result) : "";
  const question =
    active?.status === "waiting_for_user" ? pendingQuestion(active.result) ?? summary : null;
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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-5 md:px-8">
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
            <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
              <div className="flex max-h-[min(70vh,36rem)] flex-col gap-2 overflow-y-auto pr-1">
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
                        {run.status}
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
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                          Donna needs your reply
                        </p>
                        {question ? (
                          <div className="mt-2 max-h-48 overflow-y-auto text-sm leading-relaxed text-amber-950">
                            <MessageContent content={question} variant="assistant" className="text-sm" />
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-amber-900">
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
                        <div className="max-h-[min(50vh,28rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-donna-border bg-donna-sidebar/50 px-3 py-3">
                          <MessageContent
                            content={summary}
                            variant="assistant"
                            className="text-sm leading-relaxed text-donna-text [&_pre]:max-w-full [&_pre]:overflow-x-auto"
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="min-w-0">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-donna-muted">
                        Steps ({steps.length})
                      </p>
                      <div className="max-h-[min(55vh,32rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-donna-border">
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
                                  (s.kind === "tool_result" && s.seq === steps[steps.length - 1]?.seq)
                                }
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {showReply ? (
                      <div className="rounded-lg border border-donna-border bg-donna-surface/60 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-donna-muted">
                          {active.status === "waiting_for_user" ? "Your reply" : "Continue / reply"}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            className="min-w-0 flex-1 rounded-xl border border-donna-border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-donna-primary-ring"
                            placeholder={
                              active.status === "waiting_for_user"
                                ? "Type your answer…"
                                : "Add a follow-up or correction…"
                            }
                            value={redirect}
                            onChange={(e) => setRedirect(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void onRedirect(active.id);
                            }}
                            autoFocus={active.status === "waiting_for_user"}
                          />
                          <Button
                            className="!w-auto gap-2 px-4 py-2.5 text-sm"
                            disabled={busy || !redirect.trim()}
                            onClick={() => void onRedirect(active.id)}
                          >
                            <Send className="h-4 w-4" />
                            Reply
                          </Button>
                        </div>
                      </div>
                    ) : null}
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
