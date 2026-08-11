import { useCallback, useEffect, useState } from "react";
import { Bot, RefreshCw, Send, Square, X } from "lucide-react";
import {
  cancelAgentRun,
  createAgentRun,
  listAgentRuns,
  listAgentSteps,
  redirectAgentRun,
  type AgentRun,
  type AgentStep,
} from "../services/agentsApi";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
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

function stepLabel(step: AgentStep): string {
  const p = step.payload || {};
  switch (step.kind) {
    case "status":
      return String(p.text ?? "status");
    case "thought":
      return String(p.text ?? "thinking");
    case "tool_call":
      return `→ ${p.name ?? "tool"}`;
    case "tool_result":
      return `← ${p.name ?? "tool"}: ${String(p.content ?? "").slice(0, 120)}`;
    case "user_message":
      return `user: ${String(p.message ?? "")}`;
    case "approval_request":
      return `approval: ${JSON.stringify(p).slice(0, 120)}`;
    case "error":
      return `error: ${String(p.error ?? "")}`;
    default:
      return step.kind;
  }
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-donna-text">Cloud agents</h1>
          <p className="mt-1 text-sm text-donna-muted">
            Hermes-grade harness on Donna cloud — phone can lock while it works.
          </p>
        </div>
        <Button variant="ghost" className="px-3 py-2 text-sm" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      <Card>
        <label className="block text-sm font-medium text-donna-text">Start a goal</label>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-donna-border bg-donna-surface px-3 py-2 text-sm text-donna-text outline-none focus:ring-2 focus:ring-donna-primary-ring"
            placeholder="Find the Lisbon rooftop dinner photo in my notes…"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onStart();
            }}
          />
          <Button onClick={() => void onStart()} disabled={busy || !goal.trim()}>
            <Send className="h-4 w-4" />
            Run
          </Button>
        </div>
      </Card>

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
        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-2">
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

          <Card>
            {!active ? (
              <p className="text-sm text-donna-muted">Select a run</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-donna-text">{active.goal}</p>
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
                      className="px-3 py-2 text-sm"
                      disabled={busy}
                      onClick={() => void onCancel(active.id)}
                    >
                      <Square className="h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </div>

                {active.result && active.status === "succeeded" ? (
                  <div className="rounded-lg border border-donna-border bg-donna-sidebar px-3 py-2 text-sm text-donna-text">
                    {String((active.result as { summary?: string }).summary ?? JSON.stringify(active.result))}
                  </div>
                ) : null}

                <div className="max-h-80 overflow-y-auto rounded-lg border border-donna-border">
                  {steps.length === 0 ? (
                    <p className="p-3 text-xs text-donna-muted">Waiting for steps…</p>
                  ) : (
                    <ul className="divide-y divide-donna-border">
                      {steps.map((s) => (
                        <li key={s.id} className="px-3 py-2 text-xs text-donna-text">
                          <span className="font-mono text-donna-muted">#{s.seq}</span>{" "}
                          <span className="font-medium">{s.kind}</span> — {stepLabel(s)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {(active.status === "running" ||
                  active.status === "queued" ||
                  active.status === "waiting_for_user") && (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-donna-border bg-donna-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-donna-primary-ring"
                      placeholder="Redirect: prefer United, aisle…"
                      value={redirect}
                      onChange={(e) => setRedirect(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void onRedirect(active.id);
                      }}
                    />
                    <Button
                      variant="secondary"
                      disabled={busy || !redirect.trim()}
                      onClick={() => void onRedirect(active.id)}
                    >
                      <X className="h-4 w-4 rotate-45" />
                      Steer
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
