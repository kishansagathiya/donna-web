import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Check, Inbox, RefreshCw, X } from "lucide-react";
import type { Intent } from "../services/intentsApi";
import {
  listAgentRuns,
  redirectAgentRun,
  type AgentRun,
} from "../services/agentsApi";
import {
  approvalKindLabel,
  isApprovalPause,
  resultSummary,
} from "../lib/agentTurns";
import { useIntentActions, useOpenIntents } from "../hooks/useIntents";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { cn } from "../lib/cn";

function kindLabel(kind: string) {
  return kind.replace(/_/g, " ");
}

function riskLabel(risk?: string | null) {
  if (!risk) return null;
  if (risk === "internal") return { label: "Internal", className: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  if (risk === "external") return { label: "Needs confirm", className: "bg-amber-50 text-amber-800 border-amber-200" };
  if (risk === "irreversible") return { label: "Sends for real", className: "bg-rose-50 text-rose-800 border-rose-200" };
  return { label: risk, className: "bg-donna-surface text-donna-muted border-donna-border" };
}

function integrationHint(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes("google_api_not_enabled:calendar")) {
    return "Enable Google Calendar API in Google Cloud Console for this project, then try again.";
  }
  if (lower.includes("google_api_not_enabled:gmail")) {
    return "Enable Gmail API in Google Cloud Console for this project, then try again.";
  }
  if (lower.includes("needs_integration:google") || lower.includes("reauth_required")) {
    return "Disconnect and reconnect Google in Profile → Integrations so Calendar/Gmail scopes are granted, then confirm again.";
  }
  if (lower.includes("timezone_required") || lower.includes("invalid_timezone")) {
    return "Set your timezone in Profile, then confirm again.";
  }
  return null;
}

function IntentCard({
  intent,
  busy,
  onConfirm,
  onDismiss,
  onCancel,
}: {
  intent: Intent;
  busy: boolean;
  onConfirm: (runId: string) => void;
  onDismiss: (intentId: string) => void;
  onCancel: (runId: string) => void;
}) {
  const risk = riskLabel(intent.run?.action_risk);
  const actionName = intent.run?.action_name ?? intent.run?.action_slug ?? "Proposed action";

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-donna-border bg-donna-surface px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-donna-muted">
            {kindLabel(intent.kind)}
          </span>
          {risk ? (
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                risk.className,
              )}
            >
              {risk.label}
            </span>
          ) : null}
          <span className="text-xs text-donna-muted">
            from {intent.source_type === "note" ? "note" : "chat"}
          </span>
        </div>

        <div>
          <p className="text-base font-semibold text-donna-text">{intent.summary}</p>
          {intent.run ? (
            <p className="mt-1 text-sm text-donna-muted">
              {actionName}
              {intent.run.status !== "proposed" ? ` · ${intent.run.status}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-donna-muted">No matching action yet</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {intent.run && intent.run.status === "proposed" ? (
            <>
              <Button
                className="!w-auto gap-2 px-4 py-2 text-sm"
                disabled={busy}
                onClick={() => onConfirm(intent.run!.id)}
              >
                <Check className="h-4 w-4" />
                Confirm
              </Button>
              <Button
                variant="secondary"
                className="!w-auto gap-2 px-4 py-2 text-sm"
                disabled={busy}
                onClick={() => onCancel(intent.run!.id)}
              >
                Cancel run
              </Button>
            </>
          ) : null}
          <Button
            variant="secondary"
            className="!w-auto gap-2 px-4 py-2 text-sm"
            disabled={busy}
            onClick={() => onDismiss(intent.id)}
          >
            <X className="h-4 w-4" />
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AgentApprovalCard({
  run,
  busy,
  tellValue,
  onTellChange,
  onApprove,
  onDeny,
  onTell,
  onOpen,
}: {
  run: AgentRun;
  busy: boolean;
  tellValue: string;
  onTellChange: (v: string) => void;
  onApprove: () => void;
  onDeny: () => void;
  onTell: () => void;
  onOpen: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-amber-800">
            Agent approval
          </span>
          <span className="text-xs text-donna-muted">
            {approvalKindLabel(run.result)}
          </span>
        </div>
        <div>
          <p className="text-base font-semibold text-donna-text">{run.goal}</p>
          <p className="mt-1 text-sm text-donna-muted">
            {resultSummary(run.result) || "Donna needs approval to continue."}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={tellValue}
            onChange={(e) => onTellChange(e.target.value)}
            placeholder="Tell Donna…"
            className="min-w-0 flex-1 rounded-lg border border-donna-border bg-white px-3 py-2 text-sm text-donna-text placeholder:text-donna-muted focus:border-donna-primary focus:outline-none"
            disabled={busy}
          />
          <Button
            variant="secondary"
            className="!w-auto px-3 py-2 text-sm"
            disabled={busy || !tellValue.trim()}
            onClick={onTell}
          >
            Send
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="!w-auto gap-2 px-4 py-2 text-sm"
            disabled={busy}
            onClick={onApprove}
          >
            <Check className="h-4 w-4" />
            Confirm
          </Button>
          <Button
            variant="secondary"
            className="!w-auto px-4 py-2 text-sm"
            disabled={busy}
            onClick={onDeny}
          >
            Deny
          </Button>
          <Button
            variant="secondary"
            className="!w-auto gap-2 px-4 py-2 text-sm"
            disabled={busy}
            onClick={onOpen}
          >
            <Bot className="h-4 w-4" />
            Open agent
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function IntentsInboxPage() {
  const navigate = useNavigate();
  const { data: intents = [], isLoading, isFetching, error: queryError, refetch } = useOpenIntents();
  const { confirmMutation, cancelMutation, dismissMutation } = useIntentActions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [agentApprovals, setAgentApprovals] = useState<AgentRun[]>([]);
  const [tellById, setTellById] = useState<Record<string, string>>({});

  const error =
    actionError ??
    (queryError instanceof Error ? queryError.message : queryError ? "Failed to load intents" : null);
  const hint = error ? integrationHint(error) : null;

  const handleConfirm = async (runId: string) => {
    setBusyId(runId);
    setActionError(null);
    try {
      await confirmMutation.mutateAsync(runId);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (intentId: string) => {
    setBusyId(intentId);
    setActionError(null);
    try {
      await dismissMutation.mutateAsync(intentId);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Dismiss failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (runId: string) => {
    setBusyId(runId);
    setActionError(null);
    try {
      await cancelMutation.mutateAsync(runId);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  const refreshApprovals = async () => {
    try {
      const runs = await listAgentRuns("waiting_for_user");
      setAgentApprovals(runs.filter((run) => isApprovalPause(run.result)));
    } catch {
      // Intents still load independently.
    }
  };

  useEffect(() => {
    void refreshApprovals();
    const timer = window.setInterval(() => {
      void refreshApprovals();
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const handleAgentReply = async (id: string, message: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await redirectAgentRun(id, message);
      setTellById((prev) => ({ ...prev, [id]: "" }));
      await refreshApprovals();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Could not resume agent");
    } finally {
      setBusyId(null);
    }
  };

  const empty = !isLoading && intents.length === 0 && agentApprovals.length === 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 flex-col gap-3 border-b border-donna-border px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h1 className="text-xl font-semibold text-donna-text">Actions</h1>
          <p className="mt-0.5 text-sm text-donna-muted">
            Confirm irreversible agent steps, plus intents from notes and chat
          </p>
        </div>
        <Button
          className="!w-auto gap-2 px-4 py-2.5 text-sm"
          onClick={() => {
            void refetch();
            void refreshApprovals();
          }}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {error ? (
          <AlertBanner className="mx-5 mt-3">
            <span>{error}</span>
            {hint ? (
              <span className="mt-1 block text-sm">
                {hint}{" "}
                <Link to="/app/profile" className="underline">
                  Open Profile
                </Link>
              </span>
            ) : null}
          </AlertBanner>
        ) : null}

        {isLoading && intents.length === 0 && agentApprovals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Spinner />
          </div>
        ) : null}

        {empty ? (
          <EmptyState
            icon={Inbox}
            title="Inbox clear"
            description="Agent approvals and note/chat proposals show up here to confirm or dismiss."
          />
        ) : null}

        {agentApprovals.length > 0 ? (
          <section className="px-5 py-4 md:px-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-donna-muted">
              Agent approvals ({agentApprovals.length})
            </h2>
            <ul className="flex flex-col gap-3">
              {agentApprovals.map((run) => (
                <li key={run.id}>
                  <AgentApprovalCard
                    run={run}
                    busy={busyId !== null}
                    tellValue={tellById[run.id] ?? ""}
                    onTellChange={(v) =>
                      setTellById((prev) => ({ ...prev, [run.id]: v }))
                    }
                    onApprove={() => void handleAgentReply(run.id, "Approved.")}
                    onDeny={() => void handleAgentReply(run.id, "Denied.")}
                    onTell={() => {
                      const note = (tellById[run.id] ?? "").trim();
                      if (note) void handleAgentReply(run.id, note);
                    }}
                    onOpen={() =>
                      navigate(`/app?mode=agent&run=${encodeURIComponent(run.id)}`)
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {intents.length > 0 ? (
          <section className="px-5 py-4 md:px-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-donna-muted">
              Open ({intents.length})
            </h2>
            <ul className="flex flex-col gap-3">
              {intents.map((intent) => (
                <li key={intent.id}>
                  <IntentCard
                    intent={intent}
                    busy={busyId !== null}
                    onConfirm={(id) => void handleConfirm(id)}
                    onDismiss={(id) => void handleDismiss(id)}
                    onCancel={(id) => void handleCancel(id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
