import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  History,
  PanelRightOpen,
  Square,
} from "lucide-react";
import { AgentRunsSheet } from "../components/AgentRunsSheet";
import { AgentRunsSidebar } from "../components/AgentRunsSidebar";
import { AgentTurnView } from "../components/agents/AgentTurnView";
import { ChatHero } from "../components/ChatHero";
import { ChatInput } from "../components/ChatInput";
import { AlertBanner } from "../components/ui/AlertBanner";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import { useVoiceSession } from "../hooks/useVoiceSession";
import type { PendingAttachment } from "../lib/chatAttachments";
import { cn } from "../lib/cn";
import {
  buildAgentTurns,
  canReply,
  parseOptions,
} from "../lib/agentTurns";
import {
  cancelAgentRun,
  createAgentRun,
  finishAgentRun,
  listAgentRuns,
  listAgentSteps,
  redirectAgentRun,
  type AgentRun,
  type AgentStep,
} from "../services/agentsApi";

const HISTORY_PANEL_KEY = "donna.agentHistory.panelOpen";

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

function attachmentPayloads(attachments: PendingAttachment[]) {
  return attachments.map((a) => a.payload);
}

export function AgentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(() => {
    try {
      return localStorage.getItem(HISTORY_PANEL_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const bumpRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const refreshRuns = useCallback(async () => {
    try {
      const list = await listAgentRuns();
      setRuns(list);
      if (selectedIdRef.current && !list.some((r) => r.id === selectedIdRef.current)) {
        setSelectedId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    }
  }, []);

  const refreshSteps = useCallback(async (id: string) => {
    try {
      const list = await listAgentSteps(id);
      setSteps(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load steps");
    }
  }, []);

  useEffect(() => {
    void refreshRuns();
  }, [refreshRuns, refreshKey]);

  useEffect(() => {
    if (!selectedId) {
      setSteps([]);
      return;
    }
    void refreshSteps(selectedId);
    const t = window.setInterval(() => {
      void refreshRuns();
      void refreshSteps(selectedId);
    }, 2500);
    return () => window.clearInterval(t);
  }, [selectedId, refreshRuns, refreshSteps]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_PANEL_KEY, historyPanelOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }, [historyPanelOpen]);

  const active = runs.find((r) => r.id === selectedId) ?? null;
  const turns = useMemo(
    () => (active ? buildAgentTurns(active, steps) : []),
    [active, steps],
  );
  const options = useMemo(
    () => (active?.status === "waiting_for_user" ? parseOptions(active.result) : []),
    [active?.status, active?.result],
  );
  const allowMultiple = Boolean(
    active?.status === "waiting_for_user" &&
      (active.result?.allow_multiple === true ||
        (active.result?.args as { allow_multiple?: boolean } | undefined)?.allow_multiple === true),
  );
  const waitingWithOptions = Boolean(
    active?.status === "waiting_for_user" && options.length > 0,
  );
  const showInput = !active || (canReply(active.status) && active.status !== "cancelled");

  const optionKey = options.map((o) => o.id).join("|");
  useEffect(() => {
    setSelectedOptions([]);
  }, [optionKey, selectedId]);

  useEffect(() => {
    if (!active) return;
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.id, steps.length, turns.length, active?.status]);

  async function createRun(goal: string, attachments: PendingAttachment[] = []) {
    const g = goal.trim();
    if ((!g && attachments.length === 0) || busyRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const run = await createAgentRun(
        g || "See attached",
        attachments.length > 0 ? attachmentPayloads(attachments) : undefined,
      );
      setSelectedId(run.id);
      bumpRefresh();
      await refreshRuns();
      await refreshSteps(run.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start agent");
    } finally {
      setBusy(false);
    }
  }

  async function replyToRun(
    id: string,
    message: string,
    attachments: PendingAttachment[] = [],
  ) {
    const msg = message.trim();
    if ((!msg && attachments.length === 0) || busyRef.current) return;
    setBusy(true);
    setError(null);
    try {
      await redirectAgentRun(
        id,
        msg || "See attached",
        attachments.length > 0 ? attachmentPayloads(attachments) : undefined,
      );
      setSelectedOptions([]);
      bumpRefresh();
      await refreshRuns();
      await refreshSteps(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  }

  function composeWithOptions(text: string): string {
    const labels = options.filter((o) => selectedOptions.includes(o.id)).map((o) => o.label);
    if (labels.length === 0) return text.trim();
    const choice = labels.join(", ");
    const extra = text.trim();
    return extra ? `${choice}\n\n${extra}` : choice;
  }

  async function handleSend(text: string, attachments: PendingAttachment[]) {
    const composed = composeWithOptions(text);
    if (selectedId) {
      await replyToRun(selectedId, composed, attachments);
    } else {
      await createRun(composed, attachments);
    }
  }

  const {
    state: micState,
    toggleTalk,
    sessionLabel,
    errorMsg: voiceError,
    disabled: micDisabled,
    sessionActive,
    dismissError: dismissVoiceError,
  } = useVoiceSession({
    onTranscript: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (selectedIdRef.current) {
        void replyToRun(selectedIdRef.current, trimmed);
      } else {
        void createRun(trimmed);
      }
    },
  });

  const activeError = voiceError ?? error;
  function dismissActiveError() {
    if (voiceError) dismissVoiceError();
    else setError(null);
  }

  async function onCancel(id: string) {
    setBusy(true);
    try {
      await cancelAgentRun(id);
      bumpRefresh();
      await refreshRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFinish(id: string) {
    setBusy(true);
    try {
      await finishAgentRun(id);
      bumpRefresh();
      await refreshRuns();
      await refreshSteps(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark finished");
    } finally {
      setBusy(false);
    }
  }

  const handleNewRun = useCallback(() => {
    setSelectedId(null);
    setSteps([]);
    setSelectedOptions([]);
    setError(null);
  }, []);

  useEffect(() => {
    const state = location.state as { newAgent?: number } | null;
    if (!state?.newAgent) return;
    handleNewRun();
    navigate("/app/agents", { replace: true, state: null });
  }, [location.state, navigate, handleNewRun]);

  function toggleOption(id: string) {
    setSelectedOptions((prev) => {
      if (allowMultiple) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return prev[0] === id ? [] : [id];
    });
  }

  const inputDisabled = busy || micDisabled || sessionActive;
  const allowEmptySend = waitingWithOptions && selectedOptions.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 px-5 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-donna-text">Agents</h1>
            {active ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    statusTone(active.status),
                  )}
                >
                  {active.status === "waiting_for_user" ? "needs reply" : active.status}
                </span>
                {active.error ? (
                  <span className="text-xs text-rose-700">{active.error}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {active &&
            (active.status === "running" ||
              active.status === "queued" ||
              active.status === "waiting_for_user") ? (
              <>
                <Button
                  variant="secondary"
                  className="!w-auto gap-1 px-3 py-2 text-sm"
                  disabled={busy}
                  onClick={() => void onFinish(active.id)}
                >
                  <Check className="h-4 w-4" />
                  Mark finished
                </Button>
                <Button
                  variant="ghost"
                  className="!w-auto gap-1 px-3 py-2 text-sm"
                  disabled={busy}
                  onClick={() => void onCancel(active.id)}
                >
                  <Square className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : null}
            <IconButton
              onClick={() => setHistorySheetOpen(true)}
              aria-label="Agent history"
              className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface lg:!hidden"
            >
              <History className="h-5 w-5" strokeWidth={1.75} />
            </IconButton>
            <IconButton
              onClick={() => setHistoryPanelOpen((open) => !open)}
              aria-label={
                historyPanelOpen ? "Close agent history" : "Open agent history"
              }
              aria-pressed={historyPanelOpen}
              className={cn(
                "!h-9 !w-9 !border-transparent !bg-transparent hover:!bg-donna-surface !hidden lg:!inline-flex",
                historyPanelOpen ? "!text-donna-primary" : "!text-donna-muted",
              )}
            >
              {historyPanelOpen ? (
                <History className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <PanelRightOpen className="h-5 w-5" strokeWidth={1.75} />
              )}
            </IconButton>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {!active ? (
            <ChatHero
              micState={micState}
              onMicPress={() => void toggleTalk()}
              micDisabled={micDisabled || busy}
              showMic
              sessionLabel={sessionLabel}
              title="Start a cloud agent goal…"
              description="Background goals on Donna cloud — your phone can lock while it works."
            />
          ) : (
            <div className="flex w-full flex-col gap-8 px-5 py-5 md:px-8 lg:px-10">
              {turns.map((turn) => (
                <AgentTurnView
                  key={turn.id}
                  turn={turn}
                  runStatus={active.status}
                  waitingExtras={
                    turn.isLatest && active.status === "waiting_for_user"
                      ? {
                          busy,
                          onFinish: () => void onFinish(active.id),
                        }
                      : null
                  }
                />
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {activeError ? (
          <AlertBanner onDismiss={dismissActiveError}>{activeError}</AlertBanner>
        ) : null}

        {waitingWithOptions ? (
          <div className="shrink-0 border-t border-donna-border px-4 pb-2 pt-3 md:px-6">
            <p className="mb-2 text-xs text-donna-muted">
              {allowMultiple ? "Select one or more options" : "Select an option"}
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const on = selectedOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleOption(opt.id)}
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
            {selectedOptions.length > 0 ? (
              <div className="mt-3 flex justify-end">
                <Button
                  className="!w-auto px-4 py-2 text-sm"
                  disabled={busy}
                  onClick={() => void handleSend(composeWithOptions(""), [])}
                >
                  Confirm
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {showInput ? (
          <ChatInput
            onSend={(text, attachments) => void handleSend(text, attachments)}
            disabled={inputDisabled}
            busy={busy}
            placeholder={
              !active
                ? "Describe a cloud agent goal…"
                : waitingWithOptions
                  ? allowMultiple
                    ? "Optional note to add with your selection…"
                    : "Or type a different answer…"
                  : active.status === "waiting_for_user"
                    ? "Write your answer…"
                    : "Add a follow-up or correction…"
            }
            showMic={Boolean(active)}
            micState={micState}
            onMicPress={() => void toggleTalk()}
            micDisabled={micDisabled}
            sessionLabel={sessionLabel}
            showWebSearch={false}
            allowEmptySend={allowEmptySend}
          />
        ) : null}

        <AgentRunsSheet
          open={historySheetOpen}
          onClose={() => setHistorySheetOpen(false)}
          selectedId={selectedId}
          onSelect={(run) => setSelectedId(run.id)}
          refreshKey={refreshKey}
          runs={runs}
        />
      </div>

      <AgentRunsSidebar
        open={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        selectedId={selectedId}
        onNewRun={handleNewRun}
        onSelect={(run) => setSelectedId(run.id)}
        refreshKey={refreshKey}
        runs={runs}
      />
    </div>
  );
}
