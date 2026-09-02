import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentRunGraph } from "./useAgentRunGraph";
import type { AgentRun, AgentStep } from "../services/agentsApi";

const getAgentRun = vi.fn();
const listAllAgentSteps = vi.fn();

vi.mock("../services/agentsApi", async () => {
  const actual = await vi.importActual<typeof import("../services/agentsApi")>(
    "../services/agentsApi",
  );
  return {
    ...actual,
    getAgentRun: (...args: unknown[]) => getAgentRun(...args),
    listAllAgentSteps: (...args: unknown[]) => listAllAgentSteps(...args),
  };
});

function makeRun(status: string): AgentRun {
  return {
    id: "run-1",
    user_id: "user-1",
    goal: "Find the photo",
    status,
    max_steps: 80,
    step_count: 1,
    created_at: "2026-09-02T10:00:00Z",
    updated_at: "2026-09-02T10:00:01Z",
  };
}

function makeStep(seq: number, kind = "status"): AgentStep {
  return {
    id: `s${seq}`,
    agent_run_id: "run-1",
    user_id: "user-1",
    seq,
    kind,
    payload: { text: `n${seq}` },
    created_at: "2026-09-02T10:00:00Z",
  };
}

describe("useAgentRunGraph", () => {
  beforeEach(() => {
    getAgentRun.mockReset();
    listAllAgentSteps.mockReset();
  });

  it("paginates the initial history load", async () => {
    getAgentRun.mockResolvedValue(makeRun("succeeded"));
    listAllAgentSteps.mockResolvedValue(
      Array.from({ length: 3 }, (_, i) => makeStep(i + 1)),
    );

    const { result } = renderHook(() =>
      useAgentRunGraph("run-1", { pollMs: 60_000 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listAllAgentSteps).toHaveBeenCalledWith("run-1", 0, 200);
    expect(result.current.steps).toHaveLength(3);
    expect(result.current.finished).toBe(true);
    expect(result.current.live).toBe(false);
  });

  it("polls only steps after the highest seq and stops when terminal", async () => {
    getAgentRun
      .mockResolvedValueOnce(makeRun("running"))
      .mockResolvedValueOnce(makeRun("running"))
      .mockResolvedValue(makeRun("succeeded"));
    listAllAgentSteps
      .mockResolvedValueOnce([makeStep(1), makeStep(2)])
      .mockResolvedValueOnce([makeStep(3)])
      .mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAgentRunGraph("run-1", { pollMs: 25 }),
    );
    await waitFor(() =>
      expect(result.current.steps.map((s) => s.seq)).toEqual([1, 2, 3]),
    );
    expect(
      listAllAgentSteps.mock.calls.some((call) => call[1] === 2),
    ).toBe(true);

    await waitFor(() => expect(result.current.finished).toBe(true));
    const calls = listAllAgentSteps.mock.calls.length;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(listAllAgentSteps.mock.calls.length).toBe(calls);
  });

  it("deduplicates overlapping incremental pages", async () => {
    getAgentRun.mockResolvedValue(makeRun("running"));
    listAllAgentSteps
      .mockResolvedValueOnce([makeStep(1), makeStep(2)])
      .mockResolvedValue([makeStep(2), makeStep(3)]);

    const { result } = renderHook(() =>
      useAgentRunGraph("run-1", { pollMs: 25 }),
    );
    await waitFor(() =>
      expect(result.current.steps.map((s) => s.seq)).toEqual([1, 2, 3]),
    );
    expect(result.current.steps).toHaveLength(3);
  });

  it("keeps data after a transient error and retries", async () => {
    getAgentRun.mockResolvedValue(makeRun("running"));
    listAllAgentSteps.mockResolvedValue([makeStep(1)]);

    const { result } = renderHook(() =>
      useAgentRunGraph("run-1", { pollMs: 60_000 }),
    );
    await waitFor(() => expect(result.current.steps).toHaveLength(1));

    getAgentRun.mockRejectedValueOnce(new Error("network"));
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.error).toBe("network"));
    expect(result.current.steps).toHaveLength(1);

    getAgentRun.mockResolvedValue(makeRun("running"));
    listAllAgentSteps.mockResolvedValue([makeStep(2)]);
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.steps).toHaveLength(2));
    expect(result.current.error).toBeNull();
  });

  it("marks missing runs unavailable", async () => {
    getAgentRun.mockRejectedValue(new Error("not_found"));

    const { result } = renderHook(() =>
      useAgentRunGraph("missing", { pollMs: 60_000 }),
    );
    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.loading).toBe(false);
  });
});
