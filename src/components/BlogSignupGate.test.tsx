import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { saveBlogSignupEmail } from "../lib/blogGate";
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
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      loading: false,
      isAuthenticated: false,
      userId: null,
    });
  });

  it("blurs the post and shows the sign-up card when locked", () => {
    renderGate();

    expect(screen.getByText("Secret paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Secret paragraph.").closest(".blog-post-body")).toHaveClass(
      "blog-post-body--gated",
    );
    expect(
      screen.getByRole("region", { name: "Sign up to read the post" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=%2Fblog%2Fcustom-coding-harnesses",
    );
  });

  it("unlocks after a valid email", () => {
    renderGate();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "founder@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock post" }));

    expect(
      screen.queryByRole("region", { name: "Sign up to read the post" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Secret paragraph.").closest(".blog-post-body")).not.toHaveClass(
      "blog-post-body--gated",
    );
  });

  it("stays unlocked after a previous sign-up on this browser", () => {
    saveBlogSignupEmail("founder@example.com");
    renderGate();

    expect(
      screen.queryByRole("region", { name: "Sign up to read the post" }),
    ).not.toBeInTheDocument();
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
