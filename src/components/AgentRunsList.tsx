import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Search } from "lucide-react";
import { listAgentRuns, type AgentRun } from "../services/agentsApi";
import { EmptyState } from "./ui/EmptyState";
import { Spinner } from "./ui/Spinner";
import { AlertBanner } from "./ui/AlertBanner";
import { TextInput } from "./ui/TextInput";
import { cn } from "../lib/cn";

export type AgentRunsListProps = {
  active?: boolean;
  selectedId?: string | null;
  compact?: boolean;
  className?: string;
  onSelect: (run: AgentRun) => void;
  refreshKey?: number;
  runs?: AgentRun[];
};

function statusLabel(status: string) {
  return status === "waiting_for_user" ? "needs reply" : status;
}

function statusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "failed":
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "waiting_for_user":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "running":
    case "queued":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-donna-border bg-donna-surface text-donna-muted";
  }
}

export function AgentRunsList({
  active = true,
  selectedId = null,
  compact = false,
  className,
  onSelect,
  refreshKey = 0,
  runs: runsProp,
}: AgentRunsListProps) {
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState<AgentRun[]>(runsProp ?? []);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (runsProp) {
      setRuns(runsProp);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRuns(await listAgentRuns());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [runsProp]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load, refreshKey]);

  useEffect(() => {
    if (runsProp) setRuns(runsProp);
  }, [runsProp]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return runs;
    return runs.filter(
      (r) =>
        r.goal.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        statusLabel(r.status).includes(q),
    );
  }, [runs, query]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="shrink-0 px-3 pb-2 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-donna-muted" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search runs…"
            className="!py-2 !pl-9 !text-sm"
            aria-label="Search agent runs"
          />
        </div>
      </div>

      {error ? (
        <AlertBanner className="mx-3 mb-2" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loading && runs.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={query ? "No matching runs" : "No agent runs yet"}
            description={
              query
                ? "Try a different search."
                : "Start a goal to run a cloud agent in the background."
            }
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {filtered.map((run) => {
              const selected = selectedId === run.id;
              return (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(run)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-donna-primary bg-donna-primary/5"
                        : "border-transparent bg-transparent hover:bg-donna-surface",
                      compact && "py-2",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          statusClass(run.status),
                        )}
                      >
                        {statusLabel(run.status)}
                      </span>
                      <span className="text-[11px] text-donna-muted">
                        {run.step_count} steps
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-donna-text">{run.goal}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
