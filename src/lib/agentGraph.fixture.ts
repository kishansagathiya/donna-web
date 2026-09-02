import type { AgentRunLike } from "./agentTurns";
import type { GraphStep } from "./agentGraph";

function step(
  seq: number,
  kind: string,
  payload: Record<string, unknown>,
): GraphStep {
  return {
    id: `s${seq}`,
    seq,
    kind,
    payload,
    created_at: `2026-09-02T10:00:${String(seq).padStart(2, "0")}Z`,
  };
}

/** prompt → successful tool → failed tool → corrected retry → successful output */
export function executionGraphFixture(mode: "running" | "completed"): {
  run: AgentRunLike;
  steps: GraphStep[];
} {
  const steps: GraphStep[] = [
    step(1, "status", { text: "started" }),
    step(2, "tool_call", {
      id: "search-1",
      name: "search_notes",
      args: { query: "Lisbon rooftop" },
    }),
    step(3, "tool_result", {
      id: "search-1",
      name: "search_notes",
      content: "Found two notes.",
      outcome: "succeeded",
      duration_ms: 120,
    }),
    step(4, "tool_call", {
      id: "fetch-1",
      name: "fetch_url",
      args: { url: "https://example.com/broken" },
    }),
    step(5, "tool_result", {
      id: "fetch-1",
      name: "fetch_url",
      content: "Error: 404",
      outcome: "failed",
      error: "Error: 404",
      duration_ms: 80,
    }),
    step(6, "tool_call", {
      id: "fetch-2",
      name: "fetch_url",
      args: { url: "https://example.com/photo" },
      recovery_from: ["fetch-1"],
    }),
  ];

  if (mode === "running") {
    return {
      run: { goal: "Find the Lisbon rooftop photo", status: "running" },
      steps,
    };
  }

  return {
    run: {
      goal: "Find the Lisbon rooftop photo",
      status: "succeeded",
      result: { summary: "Here is the rooftop dinner photo." },
    },
    steps: [
      ...steps,
      step(7, "tool_result", {
        id: "fetch-2",
        name: "fetch_url",
        content: "Photo located.",
        outcome: "succeeded",
        duration_ms: 90,
      }),
      step(8, "thought", { text: "Here is the rooftop dinner photo." }),
    ],
  };
}
