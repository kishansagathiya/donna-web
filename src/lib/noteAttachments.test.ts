import { describe, expect, it } from "vitest";
import {
  NOTE_IMAGE_ACCEPT,
  filesToNoteImages,
  noteImageAcceptForViewport,
} from "./noteAttachments";

describe("noteImageAcceptForViewport", () => {
  it("omits accept on coarse pointers so iOS can show Photo Library", () => {
    expect(
      noteImageAcceptForViewport((query) => ({
        matches: query === "(pointer: coarse)",
      })),
    ).toBeUndefined();
  });

  it("keeps desktop accept filtering for fine pointers", () => {
    expect(noteImageAcceptForViewport(() => ({ matches: false }))).toBe(
      NOTE_IMAGE_ACCEPT,
    );
  });
});

describe("filesToNoteImages", () => {
  it("rejects non-image files", async () => {
    const pdf = new File(["doc"], "notes.pdf", { type: "application/pdf" });
    await expect(filesToNoteImages([pdf])).rejects.toThrow(
      "Only images can be attached to notes",
    );
  });
});
