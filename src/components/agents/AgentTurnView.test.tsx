import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentTurnView } from "./AgentTurnView";
import type { AgentTurn } from "../../lib/agentTurns";

function makeTurn(overrides: Partial<AgentTurn> = {}): AgentTurn {
  return {
    id: "turn-0",
    index: 0,
    prompt: "Find the best flight to Lisbon",
    steps: [
      {
        id: "s1",
        seq: 1,
        kind: "tool_call",
        payload: { name: "search", args: { q: "flights" } },
      },
    ],
    output: { kind: "none" },
    question: null,
    isLatest: true,
    activeStepId: null,
    ...overrides,
  };
}

describe("AgentTurnView steps collapse", () => {
  it("collapses steps when a live run finishes and shows output", () => {
    const { rerender } = render(
      <AgentTurnView turn={makeTurn()} runStatus="running" />,
    );
    expect(screen.getByText(/Tool → search/)).toBeInTheDocument();

    rerender(
      <AgentTurnView
        turn={makeTurn({
          output: { kind: "summary", text: "Found three flights." },
        })}
        runStatus="succeeded"
      />,
    );

    expect(screen.getByText("Found three flights.")).toBeInTheDocument();
    expect(screen.getByText(/show timeline/)).toBeInTheDocument();
    expect(screen.queryByText(/Tool → search/)).not.toBeInTheDocument();
  });

  it("renders live options after the question, capping display to the provided list", () => {
    render(
      <AgentTurnView
        turn={makeTurn({
          output: { kind: "summary", text: "Found three flights." },
          question: { text: "Which one should I book?", live: true },
        })}
        runStatus="waiting_for_user"
        ask={{
          options: [
            { id: "a", label: "Morning" },
            { id: "b", label: "Afternoon" },
            { id: "c", label: "Evening" },
            { id: "d", label: "Red-eye" },
          ],
          allowMultiple: false,
          selected: ["a"],
          busy: false,
          onToggle: () => {},
        }}
      />,
    );

    expect(screen.getByText("Found three flights.")).toBeInTheDocument();
    expect(screen.getByText("Select one")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Morning" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Afternoon" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps steps expanded while the run is active", () => {
    render(<AgentTurnView turn={makeTurn()} runStatus="running" />);

    expect(screen.getByText(/Steps \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tool → search/)).toBeInTheDocument();
  });

  it("collapses steps when the run waits for a reply with output shown", () => {
    render(
      <AgentTurnView
        turn={makeTurn({
          output: { kind: "summary", text: "Found three flights." },
          question: { text: "Which one should I book?", live: true },
        })}
        runStatus="waiting_for_user"
      />,
    );

    expect(screen.getByText("Found three flights.")).toBeInTheDocument();
    expect(screen.getByText(/show timeline/)).toBeInTheDocument();
    expect(screen.queryByText(/Tool → search/)).not.toBeInTheDocument();
  });

  it("keeps steps expanded on an active run even with a live question", () => {
    render(
      <AgentTurnView
        turn={makeTurn({
          output: { kind: "summary", text: "Partial findings so far." },
        })}
        runStatus="running"
      />,
    );

    expect(screen.getByText(/Tool → search/)).toBeInTheDocument();
    expect(screen.queryByText(/show timeline/)).not.toBeInTheDocument();
  });

  it("collapses steps once the run is finished and the output is shown", () => {
    render(
      <AgentTurnView
        turn={makeTurn({
          output: { kind: "summary", text: "Found three flights." },
        })}
        runStatus="succeeded"
      />,
    );

    expect(screen.getByText("Found three flights.")).toBeInTheDocument();
    expect(screen.getByText(/show timeline/)).toBeInTheDocument();
    expect(screen.queryByText(/Tool → search/)).not.toBeInTheDocument();
  });

  it("keeps steps expanded on a finished run without output", () => {
    render(<AgentTurnView turn={makeTurn()} runStatus="succeeded" />);

    expect(screen.getByText(/Tool → search/)).toBeInTheDocument();
    expect(screen.queryByText(/show timeline/)).not.toBeInTheDocument();
  });
});
