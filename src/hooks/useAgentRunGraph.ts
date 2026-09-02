import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildRunGraph, graphStats, type RunGraph } from "../lib/agentGraph";
import { isActiveStatus, isFinishedStatus } from "../lib/agentTurns";
import {
  AGENT_STEP_PAGE_SIZE,
  getAgentRun,
  listAllAgentSteps,
  type AgentRun,
  type AgentStep,
} from "../services/agentsApi";

const DEFAULT_POLL_MS = 2500;

function mergeSteps(current: AgentStep[], incoming: AgentStep[] | null | undefined): AgentStep[] {
  if (!incoming || incoming.length === 0) return current;
  const bySeq = new Map<number, AgentStep>();
  for (const step of current) bySeq.set(step.seq, step);
  for (const step of incoming) bySeq.set(step.seq, step);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

function isUnavailable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return message === "not_found" || /not found/i.test(message);
}

export function useAgentRunGraph(
  runId: string | undefined,
  opts?: { pollMs?: number },
) {
  const pollMs = opts?.pollMs ?? DEFAULT_POLL_MS;
  const [run, setRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const stepsRef = useRef<AgentStep[]>([]);
  const runRef = useRef<AgentRun | null>(null);
  const highestSeq = useRef(0);

  const applySteps = useCallback((incoming: AgentStep[]) => {
    setSteps((prev) => {
      const next = mergeSteps(prev, incoming);
      stepsRef.current = next;
      highestSeq.current = next.at(-1)?.seq ?? 0;
      return next;
    });
  }, []);

  const load = useCallback(
    async (mode: "initial" | "incremental") => {
      if (!runId) return;
      try {
        const nextRun = await getAgentRun(runId);
        runRef.current = nextRun;
        setRun(nextRun);
        setUnavailable(false);
        const after = mode === "incremental" ? highestSeq.current : 0;
        const page = await listAllAgentSteps(
          runId,
          after,
          AGENT_STEP_PAGE_SIZE,
        );
        if (mode === "initial") {
          setSteps(() => {
            const next = mergeSteps([], page);
            stepsRef.current = next;
            highestSeq.current = next.at(-1)?.seq ?? 0;
            return next;
          });
        } else {
          applySteps(page);
        }
        setError(null);
      } catch (err) {
        if (isUnavailable(err)) {
          setUnavailable(true);
          setError(null);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load run");
      } finally {
        setLoading(false);
      }
    },
    [applySteps, runId],
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    stepsRef.current = [];
    runRef.current = null;
    highestSeq.current = 0;
    setRun(null);
    setSteps([]);
    setError(null);
    setUnavailable(false);
    if (!runId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadRef.current("initial");
  }, [runId]);

  useEffect(() => {
    if (!runId || !run || unavailable) return;
    if (!isActiveStatus(run.status)) return;
    const timer = window.setInterval(() => {
      void loadRef.current("incremental");
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, run, runId, unavailable]);

  const retry = useCallback(() => {
    setError(null);
    const hasData = stepsRef.current.length > 0 || Boolean(runRef.current);
    setLoading(!hasData);
    void loadRef.current(hasData ? "incremental" : "initial");
  }, []);

  const graph: RunGraph = useMemo(
    () => (run ? buildRunGraph(run, steps) : { nodes: [], edges: [] }),
    [run, steps],
  );
  const stats = useMemo(() => graphStats(graph), [graph]);

  return {
    run,
    steps,
    graph,
    stats,
    loading,
    error,
    unavailable,
    retry,
    live: Boolean(run && isActiveStatus(run.status)),
    finished: Boolean(run && isFinishedStatus(run.status)),
  };
}
