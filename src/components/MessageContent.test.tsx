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

  it("renders GFM tables for assistant messages", () => {
    render(
      <MessageContent
        variant="assistant"
        content={[
          "| Use case | Model |",
          "| --- | --- |",
          "| **Coding** | Claude |",
          "| Writing | GPT |",
        ].join("\n")}
      />,
    );

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(screen.getByText("Use case").tagName).toBe("TH");
    expect(screen.getByText("Coding").tagName).toBe("STRONG");
    expect(screen.getByText("Claude")).toBeInTheDocument();
    expect(screen.getByText("Writing")).toBeInTheDocument();
  });

  it("renders a copy control on code blocks", async () => {
    render(
      <MessageContent
        variant="assistant"
        content={"```js\nconst x = 1;\n```"}
      />,
    );

    expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("renders markdown images for assistant messages", () => {
    render(
      <MessageContent
        variant="assistant"
        content={"See this:\n\n![Golden Gate](https://example.com/ggb.jpg)"}
      />,
    );

    const img = screen.getByRole("img", { name: "Golden Gate" });
    expect(img).toHaveAttribute("src", "https://example.com/ggb.jpg");
    expect(img.closest("a")).toHaveAttribute(
      "href",
      "https://example.com/ggb.jpg",
    );
  });

  it("does not render non-http image sources", () => {
    render(
      <MessageContent
        variant="assistant"
        content={"![xss](javascript:alert(1))"}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("xss")).toBeInTheDocument();
  });

  it("preserves line breaks for user messages", () => {
    render(<MessageContent variant="user" content={"Line one\nLine two"} />);

    expect(screen.getByText(/Line one/)).toBeInTheDocument();
    expect(screen.getByText(/Line two/)).toBeInTheDocument();
  });
});
