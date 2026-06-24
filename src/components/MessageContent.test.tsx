import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageContent } from "./MessageContent";

describe("MessageContent", () => {
  it("renders assistant markdown with lists and emphasis", () => {
    render(
      <MessageContent
        variant="assistant"
        content={"Here is a plan:\n\n- First step\n- Second step\n\n**Done.**"}
      />,
    );

    expect(screen.getByText("Here is a plan:")).toBeInTheDocument();
    expect(screen.getByText("First step")).toBeInTheDocument();
    expect(screen.getByText("Second step")).toBeInTheDocument();
    expect(screen.getByText("Done.")).toBeInTheDocument();
    expect(screen.getByText("Done.").tagName).toBe("STRONG");
  });

  it("preserves line breaks for user messages", () => {
    render(<MessageContent variant="user" content={"Line one\nLine two"} />);

    expect(screen.getByText(/Line one/)).toBeInTheDocument();
    expect(screen.getByText(/Line two/)).toBeInTheDocument();
  });
});
