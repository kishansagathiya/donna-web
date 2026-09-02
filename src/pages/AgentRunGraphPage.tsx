import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertBanner } from "../components/ui/AlertBanner";
import { AppPageHeader } from "../components/ui/AppPageHeader";
import { Spinner } from "../components/ui/Spinner";
import {
  AgentRunGraph,
  GraphLegend,
} from "../components/agents/AgentRunGraph";
import { useAgentRunGraph } from "../hooks/useAgentRunGraph";
import {
  agentRunConversationPath,
  formatElapsed,
} from "../lib/agentGraph";

export function AgentRunGraphPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const {
    run,
    graph,
    stats,
    loading,
    error,
    unavailable,
    retry,
    live,
  } = useAgentRunGraph(runId);

  useEffect(() => {
    document.title = run ? `${run.goal.slice(0, 48)} — Flow — Donna` : "Agent flow — Donna";
  }, [run]);

  const backTo = runId ? agentRunConversationPath(runId) : "/app?mode=agent";

  if (loading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-white">
        <AppPageHeader title="Flow" onBack={() => navigate(backTo)} />
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-white">
        <AppPageHeader title="Flow" onBack={() => navigate(backTo)} />
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <p className="text-lg font-semibold text-donna-text">
            Agent unavailable
          </p>
          <p className="mt-2 max-w-md text-sm text-donna-muted">
            This run is missing or you don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-white">
        <AppPageHeader title="Flow" onBack={() => navigate(backTo)} />
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          {error ? (
            <AlertBanner action={{ label: "Retry", onClick: retry }}>
              {error}
            </AlertBanner>
          ) : (
            <p className="text-sm text-donna-muted">Agent unavailable</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="shrink-0 border-b border-donna-border px-4 py-3 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={backTo}
              className="text-sm font-medium text-donna-primary hover:underline"
            >
              Back to run
            </Link>
            <h1 className="mt-1 truncate text-lg font-semibold text-donna-text">
              {run.goal}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-donna-muted">
              <span className="capitalize">{run.status.replaceAll("_", " ")}</span>
              {live ? (
                <span className="inline-flex items-center gap-1 text-blue-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
                  Live
                </span>
              ) : null}
              <span>{stats.logicalSteps} steps</span>
              <span>{stats.failures} failed</span>
              <span>
                {formatElapsed(run.created_at, run.finished_at)}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-3">
          <GraphLegend />
        </div>
      </header>

      {error ? (
        <AlertBanner action={{ label: "Retry", onClick: retry }}>
          {error}
        </AlertBanner>
      ) : null}

      <AgentRunGraph graph={graph} />
    </div>
  );
}
