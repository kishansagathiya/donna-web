import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "./ChatInput";

describe("ChatInput attachments", () => {
  it("keeps a selected photo after the file input is reset", async () => {
    if (typeof URL.createObjectURL !== "function") {
      URL.createObjectURL = () => "blob:photo";
    }
    if (typeof URL.revokeObjectURL !== "function") {
      URL.revokeObjectURL = () => {};
    }

    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByLabelText("Attach to message") as HTMLInputElement;
    expect(input).not.toHaveAttribute("hidden");
    expect(input.getAttribute("class")).toContain("opacity-0");
    const photo = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    let selected: File[] = [photo];
    Object.defineProperty(input, "files", {
      configurable: true,
      get: () => selected as unknown as FileList,
    });
    const nativeValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => nativeValue?.get?.call(input) ?? "",
      set: (next: string) => {
        nativeValue?.set?.call(input, next);
        if (next === "") selected = [];
      },
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });
  });
});
