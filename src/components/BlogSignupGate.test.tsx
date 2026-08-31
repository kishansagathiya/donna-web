import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { BlogSignupGate } from "./BlogSignupGate";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

function renderGate() {
  return render(
    <MemoryRouter initialEntries={["/blog/custom-coding-harnesses"]}>
      <BlogSignupGate>
        <p>Secret paragraph.</p>
      </BlogSignupGate>
    </MemoryRouter>,
  );
}

describe("BlogSignupGate", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      isAuthenticated: false,
      userId: null,
    });
  });

  it("blurs the post and asks the reader to sign up", () => {
    renderGate();

    expect(screen.getByText("Secret paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Secret paragraph.").closest(".blog-post-body")).toHaveClass(
      "blog-post-body--gated",
    );
    expect(
      screen.getByRole("region", { name: "Sign up to read the post" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/login?next=%2Fblog%2Fcustom-coding-harnesses",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=%2Fblog%2Fcustom-coding-harnesses",
    );
  });

  it("skips the gate for a signed-in Donna account", () => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      isAuthenticated: true,
      userId: "user-1",
    });
    renderGate();

    expect(
      screen.queryByRole("region", { name: "Sign up to read the post" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Secret paragraph.").closest(".blog-post-body")).not.toHaveClass(
      "blog-post-body--gated",
    );
  });
});
