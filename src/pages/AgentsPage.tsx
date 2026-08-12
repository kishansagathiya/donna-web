import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  History,
  PanelRightOpen,
  Square,
} from "lucide-react";
import { AgentRunsSheet } from "../components/AgentRunsSheet";
import { AgentRunsSidebar } from "../components/AgentRunsSidebar";
import { ChatHero } from "../components/ChatHero";
import { ChatInput } from "../components/ChatInput";
import { MessageContent } from "../components/MessageContent";
import { AlertBanner } from "../components/ui/AlertBanner";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import { useVoiceSession } from "../hooks/useVoiceSession";
import type { PendingAttachment } from "../lib/chatAttachments";
import { cn } from "../lib/cn";
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

function isFinishedStatus(status: string): boolean {
  return (
    status === "succeeded" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "expired"
  );
}

function isLiveStatus(status: string): boolean {
  return status === "queued" || status === "running";
}

function liveActivityLabel(step: AgentStep | undefined, status: string): string {
  if (!step) {
    return status === "queued" ? "Queued — starting soon…" : "Working…";
  }
  return stepTitle(step);
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

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen, step.seq]);

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

function attachmentPayloads(attachments: PendingAttachment[]) {
  return attachments.map((a) => a.payload);
}

export function AgentsPage() {
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
  const [stepsOpen, setStepsOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

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
  const waitingWithOptions = Boolean(
    active?.status === "waiting_for_user" && options.length > 0,
  );
  const showInput = !active || (canReply(active.status) && active.status !== "cancelled");
  const stepsNewestFirst = useMemo(
    () => [...steps].sort((a, b) => b.seq - a.seq),
    [steps],
  );
  const latestStepSeq = stepsNewestFirst[0]?.seq;

  const optionKey = options.map((o) => o.id).join("|");
  useEffect(() => {
    setSelectedOptions([]);
  }, [optionKey, selectedId]);

  useEffect(() => {
    if (!active) {
      setStepsOpen(true);
      return;
    }
    setStepsOpen(!isFinishedStatus(active.status));
  }, [active?.id, active?.status]);

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

  function handleNewRun() {
    setSelectedId(null);
    setSteps([]);
    setSelectedOptions([]);
    setError(null);
  }

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

  const latestStep = stepsNewestFirst[0];
  const finished = active ? isFinishedStatus(active.status) : false;
  const live = active ? isLiveStatus(active.status) : false;
  const dockLabel = !active
    ? "New goal"
    : active.status === "waiting_for_user"
      ? "Your reply"
      : finished
        ? "Follow up"
        : "Message agent";

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-donna-border/70 px-5 py-3">
          <h1 className="text-lg font-semibold text-donna-text">Agents</h1>
          <div className="flex items-center gap-2">
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
            <div className="flex w-full flex-col gap-5 px-5 py-5 md:px-8">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-words text-base font-semibold text-donna-text">
                    {active.goal}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                </div>
                {(active.status === "running" ||
                  active.status === "queued" ||
                  active.status === "waiting_for_user") && (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
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
                  </div>
                )}
              </div>

              {/* Finished: output first */}
              {summary && finished ? (
                <div className="min-w-0">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-donna-muted">
                    Output
                  </p>
                  <div className="min-h-[12rem] max-h-[min(65vh,36rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-donna-border bg-white px-4 py-4 shadow-sm">
                    <MessageContent
                      content={summary}
                      variant="assistant"
                      className="text-[0.95rem] leading-relaxed text-donna-text [&_pre]:max-w-full [&_pre]:overflow-x-auto"
                    />
                  </div>
                </div>
              ) : null}

              {/* Waiting: question first */}
              {active.status === "waiting_for_user" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Donna needs your reply
                  </p>
                  {question ? (
                    <div className="mt-3 min-h-[6rem] max-h-[min(50vh,24rem)] overflow-y-auto text-sm leading-relaxed text-amber-950">
                      <MessageContent content={question} variant="assistant" className="text-[0.95rem]" />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-amber-900">
                      Answer below to continue this agent.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-amber-200/80 pt-3">
                    <p className="mr-auto text-xs text-amber-900/80">
                      Or close this agent without answering.
                    </p>
                    <Button
                      variant="secondary"
                      className="!w-auto gap-1.5 border-amber-300 bg-white px-3 py-2 text-sm text-amber-950 hover:border-amber-400"
                      disabled={busy}
                      onClick={() => void onFinish(active.id)}
                    >
                      <Check className="h-4 w-4" />
                      Mark finished
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Live: show activity as it happens */}
              {live ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                      Live
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-medium text-sky-950" aria-live="polite">
                    {liveActivityLabel(latestStep, active.status)}
                  </p>
                  {latestStep ? (
                    <p className="mt-1 line-clamp-2 text-xs text-sky-900/80">
                      {stepBody(latestStep).replace(/\s+/g, " ").trim() || "…"}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Non-finished partial summary (e.g. mid-run result payload) */}
              {summary && !finished && active.status !== "waiting_for_user" ? (
                <div className="min-w-0">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-donna-muted">
                    So far
                  </p>
                  <div className="max-h-[min(40vh,20rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-donna-border bg-donna-sidebar/40 px-4 py-3">
                    <MessageContent
                      content={summary}
                      variant="assistant"
                      className="text-sm leading-relaxed text-donna-text"
                    />
                  </div>
                </div>
              ) : null}

              {/* Steps: open while live, collapsed when finished */}
              <div className="min-w-0">
                <button
                  type="button"
                  className="mb-1.5 flex w-full items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wide text-donna-muted hover:text-donna-text"
                  onClick={() => setStepsOpen((v) => !v)}
                  aria-expanded={stepsOpen}
                >
                  {stepsOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  Steps ({steps.length})
                  {!stepsOpen && finished ? (
                    <span className="ml-1 font-normal normal-case tracking-normal text-donna-muted">
                      · show timeline
                    </span>
                  ) : null}
                </button>
                {stepsOpen ? (
                  <div className="max-h-[min(45vh,24rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-donna-border bg-white">
                    {stepsNewestFirst.length === 0 ? (
                      <p className="p-3 text-xs text-donna-muted">
                        {live ? "Waiting for the first step…" : "No steps yet."}
                      </p>
                    ) : (
                      <ul>
                        {stepsNewestFirst.map((s) => (
                          <StepRow
                            key={s.id}
                            step={s}
                            defaultOpen={
                              live
                                ? s.seq === latestStepSeq
                                : s.kind === "thought" ||
                                  s.kind === "approval_request" ||
                                  (s.kind === "tool_result" && s.seq === latestStepSeq)
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {activeError ? (
          <AlertBanner onDismiss={dismissActiveError}>{activeError}</AlertBanner>
        ) : null}

        {waitingWithOptions ? (
          <div className="shrink-0 border-t border-donna-border bg-donna-sidebar/60 px-4 pb-2 pt-3 md:px-6">
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
            variant="dock"
            dockLabel={dockLabel}
            placeholder={
              !active
                ? "Describe a cloud agent goal…"
                : waitingWithOptions
                  ? allowMultiple
                    ? "Optional note to add with your selection…"
                    : "Or type a different answer…"
                  : active.status === "waiting_for_user"
                    ? "Write your answer…"
                    : finished
                      ? "Ask a follow-up or redirect the agent…"
                      : "Steer the agent while it works…"
            }
            showMic={Boolean(active) || !active}
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
