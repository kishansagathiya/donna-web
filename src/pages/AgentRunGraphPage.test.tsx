import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AgentRunGraphPage } from "./AgentRunGraphPage";
import { buildRunGraph } from "../lib/agentGraph";
import { executionGraphFixture } from "../lib/agentGraph.fixture";

const useAgentRunGraph = vi.fn();

vi.mock("../hooks/useAgentRunGraph", () => ({
  useAgentRunGraph: (...args: unknown[]) => useAgentRunGraph(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/agents/run-1/graph"]}>
      <Routes>
        <Route path="/app/agents/:runId/graph" element={<AgentRunGraphPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AgentRunGraphPage", () => {
  it("shows the standard unavailable state", () => {
    useAgentRunGraph.mockReturnValue({
      run: null,
      graph: { nodes: [], edges: [] },
      stats: { logicalSteps: 0, failures: 0 },
      loading: false,
      error: null,
      unavailable: true,
      retry: () => {},
      live: false,
    });
    renderPage();
    expect(screen.getByText("Agent unavailable")).toBeInTheDocument();
  });

  it("links back to the conversation run", () => {
    const { run, steps } = executionGraphFixture("completed");
    useAgentRunGraph.mockReturnValue({
      run: {
        ...run,
        id: "run-1",
        user_id: "u",
        max_steps: 80,
        step_count: steps.length,
        created_at: "2026-09-02T10:00:00Z",
        updated_at: "2026-09-02T10:01:00Z",
        finished_at: "2026-09-02T10:01:00Z",
      },
      graph: buildRunGraph(run, steps),
      stats: { logicalSteps: 5, failures: 1 },
      loading: false,
      error: null,
      unavailable: false,
      retry: () => {},
      live: false,
    });
    renderPage();
    expect(screen.getByRole("link", { name: "Back to run" })).toHaveAttribute(
      "href",
      "/app?mode=agent&run=run-1",
    );
    expect(screen.getByText("5 steps")).toBeInTheDocument();
    expect(screen.getByText("1 failed")).toBeInTheDocument();
  });

  it("shows a live indicator while the run is active", () => {
    const { run, steps } = executionGraphFixture("running");
    useAgentRunGraph.mockReturnValue({
      run: {
        ...run,
        id: "run-1",
        user_id: "u",
        max_steps: 80,
        step_count: steps.length,
        created_at: "2026-09-02T10:00:00Z",
        updated_at: "2026-09-02T10:00:10Z",
      },
      graph: buildRunGraph(run, steps),
      stats: { logicalSteps: 4, failures: 1 },
      loading: false,
      error: null,
      unavailable: false,
      retry: () => {},
      live: true,
    });
    renderPage();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });
});
