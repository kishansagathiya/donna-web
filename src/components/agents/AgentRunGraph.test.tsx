import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentRunGraph } from "./AgentRunGraph";
import { buildRunGraph } from "../../lib/agentGraph";
import { executionGraphFixture } from "../../lib/agentGraph.fixture";

describe("AgentRunGraph", () => {
  it("renders colors, icons, and accessible type labels", () => {
    const { run, steps } = executionGraphFixture("completed");
    render(
      <AgentRunGraph
        graph={buildRunGraph(run, steps)}
        inspectorPlacement="side"
      />,
    );

    expect(screen.getByRole("button", { name: /Prompt: Find the Lisbon rooftop photo/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Tool: Fetch page/i })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Failed/i })).toHaveClass("bg-red-50");
    expect(screen.getByRole("button", { name: /Output: Here is the rooftop dinner photo/i })).toHaveClass("bg-emerald-50");
    expect(screen.getByText(/Recovery/)).toBeInTheDocument();
  });

  it("opens inspector contents on select", () => {
    const { run, steps } = executionGraphFixture("completed");
    render(
      <AgentRunGraph
        graph={buildRunGraph(run, steps)}
        inspectorPlacement="side"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Failed/i }));
    expect(screen.getByText("Arguments")).toBeInTheDocument();
    expect(screen.getAllByText(/example.com\/broken/).length).toBeGreaterThan(0);
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Raw events (2)")).toBeInTheDocument();
  });

  it("uses a bottom sheet inspector on mobile", () => {
    const { run, steps } = executionGraphFixture("completed");
    render(
      <AgentRunGraph
        graph={buildRunGraph(run, steps)}
        inspectorPlacement="sheet"
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Output/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Raw events (1)")).toBeInTheDocument();
  });

  it("applies live updates without duplicating or reordering nodes", () => {
    const running = executionGraphFixture("running");
    const { rerender } = render(
      <AgentRunGraph
        graph={buildRunGraph(running.run, running.steps)}
        inspectorPlacement="side"
      />,
    );
    const runningLabels = screen.getAllByRole("button").map((el) => el.getAttribute("aria-label"));
    expect(runningLabels?.some((label) => label?.includes("In progress"))).toBe(true);

    const done = executionGraphFixture("completed");
    rerender(
      <AgentRunGraph
        graph={buildRunGraph(done.run, done.steps)}
        inspectorPlacement="side"
      />,
    );
    const doneButtons = screen.getAllByRole("button");
    const labels = doneButtons.map((el) => el.getAttribute("aria-label"));
    expect(labels.filter((label) => label?.startsWith("Prompt"))).toHaveLength(1);
    expect(labels.filter((label) => label?.startsWith("Tool"))).toHaveLength(3);
    expect(labels.filter((label) => label?.startsWith("Output"))).toHaveLength(1);
    expect(labels[0]).toMatch(/Prompt/);
    expect(labels.at(-1)).toMatch(/Output/);
  });
});
