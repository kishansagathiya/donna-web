import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteComposeBar } from "./NoteComposeBar";

function renderCompose(
  onSave = vi.fn().mockResolvedValue(undefined),
) {
  return render(
    <NoteComposeBar
      onSave={onSave}
      saving={false}
      onAddLink={vi.fn()}
      onSaveToMemory={vi.fn()}
      ingestBusy={false}
      linkOpen={false}
      linkValue=""
      onLinkValueChange={vi.fn()}
      onSubmitLink={vi.fn()}
      onCancelLink={vi.fn()}
      micState="idle"
      onMicPress={vi.fn()}
    />,
  );
}

function mockFileInput(input: HTMLInputElement, photo: File) {
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
}

describe("NoteComposeBar attachments", () => {
  it("shows an Add photo control", () => {
    renderCompose();
    const input = screen.getByLabelText("Add photo") as HTMLInputElement;
    expect(input).not.toHaveAttribute("hidden");
    expect(input.getAttribute("class")).toContain("opacity-0");
    expect(screen.getByText("Add photo")).toBeInTheDocument();
  });

  it("keeps a selected photo after the file input is reset", async () => {
    if (typeof URL.createObjectURL !== "function") {
      URL.createObjectURL = () => "blob:photo";
    }
    if (typeof URL.revokeObjectURL !== "function") {
      URL.revokeObjectURL = () => {};
    }

    renderCompose();

    const input = screen.getByLabelText("Add photo") as HTMLInputElement;
    mockFileInput(input, new File(["img"], "photo.jpg", { type: "image/jpeg" }));
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });
  });
});
