import { describe, expect, it } from "vitest";
import {
  agentRunConversationPath,
  agentRunGraphPath,
  buildRunGraph,
  uncoveredSeqs,
  type GraphStep,
} from "./agentGraph";
import { executionGraphFixture } from "./agentGraph.fixture";
import type { AgentRunLike } from "./agentTurns";

function step(
  seq: number,
  kind: string,
  payload: Record<string, unknown> = {},
): GraphStep {
  return { id: `s${seq}`, seq, kind, payload };
}

const run = (status: string, extra: Partial<AgentRunLike> = {}): AgentRunLike => ({
  goal: "Book a flight",
  status,
  ...extra,
});

describe("agent run paths", () => {
  it("builds graph and conversation links", () => {
    expect(agentRunGraphPath("run-1")).toBe("/app/agents/run-1/graph");
    expect(agentRunConversationPath("run-1")).toBe("/app?mode=agent&run=run-1");
  });
});

describe("buildRunGraph", () => {
  it("orders prompt, tools, and output", () => {
    const graph = buildRunGraph(run("succeeded", { result: { summary: "Booked." } }), [
      step(1, "status", { text: "started" }),
      step(2, "tool_call", { id: "c1", name: "search_flights", args: { q: "SFO" } }),
      step(3, "tool_result", {
        id: "c1",
        name: "search_flights",
        content: "3 flights",
        outcome: "succeeded",
      }),
      step(4, "thought", { text: "Booked." }),
    ]);
    expect(graph.nodes.map((n) => n.type)).toEqual([
      "prompt",
      "tool",
      "output",
    ]);
    expect(graph.nodes[0].label).toBe("Book a flight");
    expect(graph.nodes[1].callId).toBe("c1");
    expect(uncoveredSeqs(graph, [
      step(1, "status", { text: "started" }),
      step(2, "tool_call", { id: "c1", name: "search_flights" }),
      step(3, "tool_result", { id: "c1", name: "search_flights", content: "3 flights" }),
      step(4, "thought", { text: "Booked." }),
    ])).toEqual([]);
  });

  it("pairs tool_call and tool_result by call id", () => {
    const steps = [
      step(1, "tool_call", { id: "a", name: "fetch_url", args: { url: "https://a" } }),
      step(2, "tool_call", { id: "b", name: "memory_search", args: { query: "x" } }),
      step(3, "tool_result", { id: "b", name: "memory_search", content: "mem", outcome: "succeeded" }),
      step(4, "tool_result", { id: "a", name: "fetch_url", content: "page", outcome: "succeeded" }),
    ];
    const graph = buildRunGraph(run("succeeded"), steps);
    const tools = graph.nodes.filter((n) => n.type === "tool");
    expect(tools).toHaveLength(2);
    expect(tools[0].callId).toBe("a");
    expect(tools[0].result).toBe("page");
    expect(tools[1].callId).toBe("b");
    expect(tools[1].result).toBe("mem");
    expect(uncoveredSeqs(graph, steps)).toEqual([]);
  });

  it("creates a prompt node for a redirect user_message", () => {
    const steps = [
      step(1, "tool_call", { id: "c1", name: "todo" }),
      step(2, "tool_result", { id: "c1", name: "todo", content: "ok", outcome: "succeeded" }),
      step(3, "user_message", { message: "Try United instead", kind: "redirect" }),
      step(4, "thought", { text: "Switching to United." }),
    ];
    const graph = buildRunGraph(
      run("succeeded", { result: { summary: "Switching to United." } }),
      steps,
    );
    const prompts = graph.nodes.filter((n) => n.type === "prompt");
    expect(prompts).toHaveLength(2);
    expect(prompts[1].label).toBe("Try United instead");
    expect(prompts[1].rawEvents.some((e) => e.kind === "user_message")).toBe(true);
  });

  it("combines ask_user with its approval event", () => {
    const steps = [
      step(1, "tool_call", { id: "ask-1", name: "ask_user", args: { question: "SFO or SJC?" } }),
      step(2, "approval_request", {
        kind: "ask_user",
        call_id: "ask-1",
        question: "SFO or SJC?",
      }),
    ];
    const graph = buildRunGraph(run("waiting_for_user", { result: { kind: "ask_user", question: "SFO or SJC?" } }), steps);
    const decisions = graph.nodes.filter((n) => n.type === "decision");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].outcome).toBe("waiting");
    expect(decisions[0].callId).toBe("ask-1");
    expect(decisions[0].rawEvents.map((e) => e.kind)).toEqual([
      "tool_call",
      "approval_request",
    ]);
    expect(uncoveredSeqs(graph, steps)).toEqual([]);
  });

  it("marks an active call without a result as active", () => {
    const steps = [
      step(1, "tool_call", { id: "live", name: "browse_page", args: { url: "https://x" } }),
    ];
    const graph = buildRunGraph(run("running"), steps);
    const tool = graph.nodes.find((n) => n.type === "tool");
    expect(tool?.outcome).toBe("active");
    expect(tool?.result).toBeUndefined();
  });

  it("renders unmatched or legacy completed tools as unknown, not succeeded", () => {
    const steps = [
      step(1, "tool_result", { id: "legacy", name: "fetch_url", content: "old payload" }),
    ];
    const graph = buildRunGraph(run("succeeded"), steps);
    expect(graph.nodes.find((n) => n.type === "tool")?.outcome).toBe("unknown");
  });

  it("links explicit recovery and offsets the failed attempt", () => {
    const steps = [
      step(1, "tool_call", { id: "f1", name: "fetch_url" }),
      step(2, "tool_result", {
        id: "f1",
        name: "fetch_url",
        content: "Error: no",
        outcome: "failed",
      }),
      step(3, "tool_call", {
        id: "f2",
        name: "fetch_url",
        recovery_from: ["f1"],
      }),
      step(4, "tool_result", {
        id: "f2",
        name: "fetch_url",
        content: "ok",
        outcome: "succeeded",
      }),
    ];
    const graph = buildRunGraph(run("succeeded"), steps);
    const recovery = graph.edges.filter((e) => e.kind === "recovery");
    expect(recovery).toHaveLength(1);
    expect(recovery[0].label).toBe("Recovery");
    const failed = graph.nodes.find((n) => n.callId === "f1");
    const retry = graph.nodes.find((n) => n.callId === "f2");
    expect(failed?.lane).toBe("recovery");
    expect(retry?.lane).toBe("main");
    expect(retry?.recoveryFrom).toEqual(["f1"]);
  });

  it("infers only a same-tool next attempt as Likely retry for legacy runs", () => {
    const sameTool = [
      step(1, "tool_call", { id: "a1", name: "fetch_url" }),
      step(2, "tool_result", {
        id: "a1",
        name: "fetch_url",
        content: "Error: no",
        outcome: "failed",
      }),
      step(3, "tool_call", { id: "a2", name: "fetch_url" }),
      step(4, "tool_result", {
        id: "a2",
        name: "fetch_url",
        content: "ok",
        outcome: "succeeded",
      }),
    ];
    const inferred = buildRunGraph(run("succeeded"), sameTool);
    const retry = inferred.edges.filter((e) => e.kind === "retry");
    expect(retry).toHaveLength(1);
    expect(retry[0].label).toBe("Likely retry");
    expect(inferred.nodes.find((n) => n.callId === "a2")?.inferredRetry).toBe(true);

    const differentTool = [
      step(1, "tool_call", { id: "a1", name: "fetch_url" }),
      step(2, "tool_result", {
        id: "a1",
        name: "fetch_url",
        content: "Error: no",
        outcome: "failed",
      }),
      step(3, "tool_call", { id: "b1", name: "memory_search" }),
      step(4, "tool_result", {
        id: "b1",
        name: "memory_search",
        content: "ok",
        outcome: "succeeded",
      }),
    ];
    const noInfer = buildRunGraph(run("succeeded"), differentTool);
    expect(noInfer.edges.filter((e) => e.kind === "retry" || e.kind === "recovery")).toHaveLength(0);
  });

  it("adds a terminal error node", () => {
    const steps = [
      step(1, "tool_call", { id: "c1", name: "todo" }),
      step(2, "tool_result", { id: "c1", name: "todo", content: "ok", outcome: "succeeded" }),
      step(3, "error", { error: "llm_error: timeout" }),
    ];
    const graph = buildRunGraph(run("failed", { error: "llm_error: timeout" }), steps);
    const errors = graph.nodes.filter((n) => n.type === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].label).toContain("timeout");
    expect(uncoveredSeqs(graph, steps)).toEqual([]);
  });

  it("folds status, compression, memory, and non-output thoughts into inspectors", () => {
    const steps = [
      step(1, "status", { text: "started" }),
      step(2, "memory_retrieve", { query: "prefs" }),
      step(3, "thought", { text: "I will search notes first." }),
      step(4, "tool_call", { id: "c1", name: "search_notes" }),
      step(5, "tool_result", { id: "c1", name: "search_notes", content: "hit", outcome: "succeeded" }),
      step(6, "compress", { text: "Compressed earlier steps" }),
      step(7, "thought", { text: "Final answer." }),
    ];
    const graph = buildRunGraph(
      run("succeeded", { result: { summary: "Final answer." } }),
      steps,
    );
    expect(graph.nodes.some((n) => n.type === "tool")).toBe(true);
    expect(graph.nodes.some((n) => n.label === "I will search notes first.")).toBe(false);
    const tool = graph.nodes.find((n) => n.type === "tool");
    expect(tool?.rawEvents.map((e) => e.kind)).toEqual(
      expect.arrayContaining(["status", "memory_retrieve", "thought", "tool_call", "tool_result"]),
    );
    expect(uncoveredSeqs(graph, steps)).toEqual([]);
  });

  it("covers multiple retries without duplicating logical nodes", () => {
    const steps = [
      step(1, "tool_call", { id: "r1", name: "fetch_url" }),
      step(2, "tool_result", { id: "r1", name: "fetch_url", content: "Error: 1", outcome: "failed" }),
      step(3, "tool_call", { id: "r2", name: "fetch_url", recovery_from: ["r1"] }),
      step(4, "tool_result", { id: "r2", name: "fetch_url", content: "Error: 2", outcome: "failed" }),
      step(5, "tool_call", { id: "r3", name: "fetch_url", recovery_from: ["r2"] }),
      step(6, "tool_result", { id: "r3", name: "fetch_url", content: "ok", outcome: "succeeded" }),
    ];
    const graph = buildRunGraph(run("succeeded"), steps);
    expect(graph.nodes.filter((n) => n.type === "tool")).toHaveLength(3);
    expect(graph.edges.filter((e) => e.kind === "recovery")).toHaveLength(2);
    expect(uncoveredSeqs(graph, steps)).toEqual([]);
  });
});

describe("execution graph fixture", () => {
  it("shows the retry as active while running", () => {
    const { run: live, steps } = executionGraphFixture("running");
    const graph = buildRunGraph(live, steps);
    expect(graph.nodes.map((n) => n.type)).toEqual(["prompt", "tool", "tool", "tool"]);
    expect(graph.nodes[1].outcome).toBe("succeeded");
    expect(graph.nodes[2].outcome).toBe("failed");
    expect(graph.nodes[2].lane).toBe("recovery");
    expect(graph.nodes[3].outcome).toBe("active");
    expect(graph.edges.some((e) => e.kind === "recovery")).toBe(true);
    expect(uncoveredSeqs(graph, steps)).toEqual([]);
  });

  it("adds the successful output after completion without reordering", () => {
    const { run: done, steps } = executionGraphFixture("completed");
    const graph = buildRunGraph(done, steps);
    expect(graph.nodes.map((n) => n.type)).toEqual([
      "prompt",
      "tool",
      "tool",
      "tool",
      "output",
    ]);
    expect(graph.nodes.map((n) => n.id)).toEqual([
      "prompt-0",
      "tool-2",
      "tool-4",
      "tool-6",
      "output-0",
    ]);
    expect(graph.nodes[3].outcome).toBe("succeeded");
    expect(graph.nodes[4].label).toBe("Here is the rooftop dinner photo.");
    expect(uncoveredSeqs(graph, steps)).toEqual([]);
  });
});
