import {
  buildAgentTurns,
  isActiveStatus,
  splitTrailingQuestion,
  toolDisplayName,
  type AgentRunLike,
  type AgentStepLike,
} from "./agentTurns";

export type GraphNodeType = "prompt" | "tool" | "decision" | "output" | "error";

export type GraphOutcome =
  | "succeeded"
  | "failed"
  | "blocked"
  | "active"
  | "waiting"
  | "unknown";

export type GraphEdgeKind = "spine" | "recovery" | "retry";

export type GraphStep = AgentStepLike & {
  created_at?: string;
};

export type RunGraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  outcome: GraphOutcome;
  seq: number;
  lane: "main" | "recovery";
  callId?: string;
  toolName?: string;
  args?: unknown;
  result?: string;
  error?: string;
  durationMs?: number;
  startedAt?: string;
  endedAt?: string;
  recoveryFrom?: string[];
  inferredRetry?: boolean;
  rawEvents: GraphStep[];
};

export type RunGraphEdge = {
  id: string;
  from: string;
  to: string;
  kind: GraphEdgeKind;
  label?: string;
};

export type RunGraph = {
  nodes: RunGraphNode[];
  edges: RunGraphEdge[];
};

export const GRAPH_TYPE_LABELS: Record<GraphNodeType, string> = {
  prompt: "Prompt",
  tool: "Tool",
  decision: "Decision",
  output: "Output",
  error: "Error",
};

export const GRAPH_OUTCOME_LABELS: Record<GraphOutcome, string> = {
  succeeded: "Succeeded",
  failed: "Failed",
  blocked: "Blocked",
  active: "In progress",
  waiting: "Waiting",
  unknown: "Unknown",
};

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && a.trim() === b.trim());
}

function thoughtCovers(thought: string, excerpt: string): boolean {
  if (!excerpt) return false;
  if (sameText(thought, excerpt)) return true;
  const split = splitTrailingQuestion(thought);
  if (split.body && sameText(split.body, excerpt)) return true;
  if (split.question && sameText(split.question, excerpt)) return true;
  return false;
}

export function callIdOf(step: GraphStep): string | undefined {
  const payload = step.payload || {};
  for (const key of ["id", "call_id"] as const) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
}

function isFoldableKind(kind: string): boolean {
  return kind === "status" || kind === "compress" || kind === "memory_retrieve";
}

function isDecisionTool(name: string): boolean {
  return name === "ask_user" || name === "request_approval";
}

function payloadOutcome(payload: Record<string, unknown> | undefined): GraphOutcome | null {
  const raw = payload?.outcome;
  if (raw === "succeeded" || raw === "failed" || raw === "blocked") return raw;
  return null;
}

function inferContentOutcome(content: string): GraphOutcome | null {
  const text = content.trim();
  if (text.startsWith("Error:")) return "failed";
  if (text.startsWith("Refused:")) return "blocked";
  return null;
}

function resolveToolOutcome(
  resultPayload: Record<string, unknown> | undefined,
  hasResult: boolean,
  runStatus: string,
): GraphOutcome {
  if (hasResult && resultPayload) {
    const explicit = payloadOutcome(resultPayload);
    if (explicit) return explicit;
    const inferred = inferContentOutcome(String(resultPayload.content ?? ""));
    if (inferred) return inferred;
    return "unknown";
  }
  return isActiveStatus(runStatus) ? "active" : "unknown";
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function recoveryFromSteps(steps: GraphStep[]): string[] {
  for (const step of steps) {
    const ids = asStringArray(step.payload?.recovery_from);
    if (ids.length > 0) return ids;
  }
  return [];
}

function findByCallId(
  steps: GraphStep[],
  kind: string,
  callId: string | undefined,
  used: Set<string>,
): GraphStep | undefined {
  if (!callId) return undefined;
  return steps.find(
    (step) =>
      step.kind === kind && !used.has(step.id) && callIdOf(step) === callId,
  );
}

function findNextKind(
  steps: GraphStep[],
  kind: string,
  afterSeq: number,
  used: Set<string>,
): GraphStep | undefined {
  return steps.find(
    (step) => step.kind === kind && step.seq > afterSeq && !used.has(step.id),
  );
}

function attachToNearest(nodes: RunGraphNode[], step: GraphStep) {
  if (nodes.length === 0) return;
  let best = nodes[0];
  for (const node of nodes) {
    if (node.seq <= step.seq) best = node;
    else break;
  }
  if (!best.rawEvents.some((event) => event.id === step.id)) {
    best.rawEvents.push(step);
  }
}

/** Every stored seq is represented on a logical node or in its inspector. */
export function uncoveredSeqs(graph: RunGraph, steps: GraphStep[]): number[] {
  const seen = new Set<number>();
  for (const node of graph.nodes) {
    for (const event of node.rawEvents) seen.add(event.seq);
  }
  return steps.filter((step) => !seen.has(step.seq)).map((step) => step.seq);
}

export function buildRunGraph(run: AgentRunLike, steps: GraphStep[]): RunGraph {
  const ordered = [...steps].sort((a, b) => a.seq - b.seq);
  const byId = new Map(ordered.map((step) => [step.id, step]));
  const full = (step: AgentStepLike): GraphStep => byId.get(step.id) ?? step;
  const turns = buildAgentTurns(run, ordered);
  const userMessages = ordered.filter((step) => step.kind === "user_message");
  const used = new Set<string>();
  const nodes: RunGraphNode[] = [];
  let pendingFold: GraphStep[] = [];

  const flushInto = (node: RunGraphNode) => {
    if (pendingFold.length === 0) return;
    node.rawEvents = [...pendingFold, ...node.rawEvents];
    if (!node.recoveryFrom?.length) {
      const inherited = recoveryFromSteps(pendingFold);
      if (inherited.length > 0) node.recoveryFrom = inherited;
    }
    pendingFold = [];
  };

  const emit = (partial: Omit<RunGraphNode, "lane">): RunGraphNode => {
    const node: RunGraphNode = { ...partial, lane: "main" };
    flushInto(node);
    if (!node.recoveryFrom?.length) {
      const inherited = recoveryFromSteps(node.rawEvents);
      if (inherited.length > 0) node.recoveryFrom = inherited;
    }
    nodes.push(node);
    return node;
  };

  for (let index = 0; index < turns.length; index++) {
    const turn = turns[index];
    const userStep = index === 0 ? undefined : userMessages[index - 1];
    if (userStep) used.add(userStep.id);
    emit({
      id: `prompt-${index}`,
      type: "prompt",
      label: turn.prompt || run.goal,
      outcome: "succeeded",
      seq: userStep?.seq ?? 0,
      rawEvents: userStep ? [userStep] : [],
      startedAt: userStep?.created_at,
    });

    const outputText =
      turn.output.kind === "summary" ? turn.output.text.trim() : "";
    const questionText = turn.question?.text.trim() ?? "";
    const turnSteps = turn.steps.map(full).sort((a, b) => a.seq - b.seq);

    for (const step of turnSteps) {
      if (used.has(step.id)) continue;

      if (step.kind === "thought") {
        const text = String(step.payload?.text ?? "").trim();
        if (outputText && thoughtCovers(text, outputText)) continue;
        if (questionText && thoughtCovers(text, questionText)) continue;
        pendingFold.push(step);
        used.add(step.id);
        continue;
      }

      if (isFoldableKind(step.kind)) {
        pendingFold.push(step);
        used.add(step.id);
        continue;
      }

      if (step.kind === "tool_call") {
        used.add(step.id);
        const name = String(step.payload?.name ?? "tool");
        const callId = callIdOf(step);
        if (isDecisionTool(name)) {
          const approval =
            findByCallId(ordered, "approval_request", callId, used) ??
            findNextKind(turnSteps, "approval_request", step.seq, used);
          if (approval) used.add(approval.id);
          const waiting = Boolean(
            turn.isLatest &&
              turn.question?.live &&
              (run.status === "waiting_for_user" || isActiveStatus(run.status)),
          );
          emit({
            id: `decision-${step.seq}`,
            type: "decision",
            label:
              questionText ||
              String(approval?.payload?.question ?? toolDisplayName(name)),
            outcome: waiting ? "waiting" : "succeeded",
            seq: step.seq,
            callId,
            toolName: name,
            args: step.payload?.args ?? approval?.payload?.args,
            recoveryFrom: asStringArray(step.payload?.recovery_from),
            rawEvents: approval ? [step, approval] : [step],
            startedAt: step.created_at,
            endedAt: approval?.created_at,
          });
          continue;
        }

        const result =
          findByCallId(ordered, "tool_result", callId, used) ??
          findNextKind(turnSteps, "tool_result", step.seq, used);
        if (result) used.add(result.id);
        const outcome = resolveToolOutcome(result?.payload, Boolean(result), run.status);
        const errorText =
          typeof result?.payload?.error === "string"
            ? result.payload.error
            : outcome === "failed" || outcome === "blocked"
              ? String(result?.payload?.content ?? "")
              : undefined;
        emit({
          id: `tool-${step.seq}`,
          type: "tool",
          label: toolDisplayName(name),
          outcome,
          seq: step.seq,
          callId,
          toolName: name,
          args: step.payload?.args,
          result: result ? String(result.payload?.content ?? "") : undefined,
          error: errorText,
          durationMs: numberField(result?.payload?.duration_ms),
          recoveryFrom: asStringArray(step.payload?.recovery_from),
          rawEvents: result ? [step, result] : [step],
          startedAt: step.created_at,
          endedAt: result?.created_at,
        });
        continue;
      }

      if (step.kind === "tool_result") {
        used.add(step.id);
        const name = String(step.payload?.name ?? "tool");
        const outcome = resolveToolOutcome(step.payload, true, run.status);
        emit({
          id: `tool-${step.seq}`,
          type: "tool",
          label: toolDisplayName(name),
          outcome,
          seq: step.seq,
          callId: callIdOf(step),
          toolName: name,
          result: String(step.payload?.content ?? ""),
          error:
            typeof step.payload?.error === "string"
              ? step.payload.error
              : undefined,
          durationMs: numberField(step.payload?.duration_ms),
          recoveryFrom: asStringArray(step.payload?.recovery_from),
          rawEvents: [step],
          startedAt: step.created_at,
        });
        continue;
      }

      if (step.kind === "approval_request") {
        used.add(step.id);
        const waiting = Boolean(turn.isLatest && turn.question?.live);
        emit({
          id: `decision-${step.seq}`,
          type: "decision",
          label: String(step.payload?.question ?? "Decision"),
          outcome: waiting ? "waiting" : "succeeded",
          seq: step.seq,
          callId: callIdOf(step),
          toolName: String(step.payload?.tool ?? step.payload?.kind ?? "ask_user"),
          args: step.payload?.args,
          recoveryFrom: asStringArray(step.payload?.recovery_from),
          rawEvents: [step],
          startedAt: step.created_at,
        });
        continue;
      }

      if (step.kind === "error") {
        used.add(step.id);
        emit({
          id: `error-${step.seq}`,
          type: "error",
          label: String(step.payload?.error ?? "Error"),
          outcome: "failed",
          seq: step.seq,
          error: String(step.payload?.error ?? ""),
          recoveryFrom: asStringArray(step.payload?.recovery_from),
          rawEvents: [step],
          startedAt: step.created_at,
        });
        continue;
      }

      pendingFold.push(step);
      used.add(step.id);
    }

    if (outputText) {
      const outputThoughts = turnSteps.filter((step) => {
        if (step.kind !== "thought") return false;
        return thoughtCovers(String(step.payload?.text ?? "").trim(), outputText);
      });
      for (const step of outputThoughts) used.add(step.id);
      const seq =
        outputThoughts[0]?.seq ??
        (turnSteps.at(-1)?.seq ?? nodes.at(-1)?.seq ?? 0) + 0.5;
      emit({
        id: `output-${index}`,
        type: "output",
        label: outputText,
        outcome: "succeeded",
        seq,
        recoveryFrom: recoveryFromSteps(outputThoughts),
        rawEvents: outputThoughts,
        startedAt: outputThoughts[0]?.created_at,
      });
    }
  }

  if (
    run.status === "failed" &&
    run.error?.trim() &&
    !nodes.some((node) => node.type === "error")
  ) {
    emit({
      id: "error-run",
      type: "error",
      label: run.error.trim(),
      outcome: "failed",
      seq: (nodes.at(-1)?.seq ?? 0) + 1,
      error: run.error.trim(),
      rawEvents: [],
    });
  }

  if (pendingFold.length > 0 && nodes.length > 0) {
    const last = nodes[nodes.length - 1];
    last.rawEvents.push(...pendingFold);
    pendingFold = [];
  }

  for (const step of ordered) {
    if (nodes.some((node) => node.rawEvents.some((event) => event.id === step.id))) {
      continue;
    }
    attachToNearest(nodes, step);
  }

  nodes.sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));

  const edges: RunGraphEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `spine-${nodes[i].id}-${nodes[i + 1].id}`,
      from: nodes[i].id,
      to: nodes[i + 1].id,
      kind: "spine",
    });
  }

  const byCallId = new Map<string, RunGraphNode>();
  for (const node of nodes) {
    if (node.callId) byCallId.set(node.callId, node);
  }

  const recoveredFrom = new Set<string>();
  for (const node of nodes) {
    for (const fromCall of node.recoveryFrom ?? []) {
      const source = byCallId.get(fromCall);
      if (!source || source.id === node.id) continue;
      edges.push({
        id: `recovery-${source.id}-${node.id}`,
        from: source.id,
        to: node.id,
        kind: "recovery",
        label: "Recovery",
      });
      recoveredFrom.add(source.id);
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type !== "tool") continue;
    if (node.outcome !== "failed" && node.outcome !== "blocked") continue;
    if (recoveredFrom.has(node.id)) continue;
    for (let j = i + 1; j < nodes.length; j++) {
      const later = nodes[j];
      if (later.type !== "tool") continue;
      if (
        later.toolName === node.toolName &&
        !(later.recoveryFrom && later.recoveryFrom.length > 0)
      ) {
        edges.push({
          id: `retry-${node.id}-${later.id}`,
          from: node.id,
          to: later.id,
          kind: "retry",
          label: "Likely retry",
        });
        later.inferredRetry = true;
        recoveredFrom.add(node.id);
      }
      break;
    }
  }

  for (const node of nodes) {
    node.lane = recoveredFrom.has(node.id) ? "recovery" : "main";
  }

  return { nodes, edges };
}

export function graphStats(graph: RunGraph): {
  logicalSteps: number;
  failures: number;
} {
  return {
    logicalSteps: graph.nodes.length,
    failures: graph.nodes.filter((node) => node.outcome === "failed").length,
  };
}

export function formatElapsed(
  startedAt: string | undefined,
  finishedAt: string | null | undefined,
  nowMs = Date.now(),
): string {
  const start = startedAt ? Date.parse(startedAt) : Number.NaN;
  if (!Number.isFinite(start)) return "—";
  const end = finishedAt ? Date.parse(finishedAt) : nowMs;
  const ms = Math.max(0, (Number.isFinite(end) ? end : nowMs) - start);
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function agentRunGraphPath(runId: string): string {
  return `/app/agents/${encodeURIComponent(runId)}/graph`;
}

export function agentRunConversationPath(runId: string): string {
  return `/app?mode=agent&run=${encodeURIComponent(runId)}`;
}

export function formatDurationMs(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
