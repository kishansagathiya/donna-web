import { describe, expect, it } from "vitest";
import {
  chatAttachAcceptForViewport,
  CHAT_ATTACH_ACCEPT,
  resolveChatMime,
  rewriteImageFilename,
  scaledImageSize,
  takeSelectedFiles,
  urlToChatAttachment,
} from "./chatAttachments";

describe("scaledImageSize", () => {
  it("leaves small images unchanged", () => {
    expect(scaledImageSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("scales the long edge down to 1568", () => {
    expect(scaledImageSize(4032, 3024)).toEqual({ width: 1568, height: 1176 });
  });

  it("scales portrait photos by height", () => {
    expect(scaledImageSize(3024, 4032)).toEqual({ width: 1176, height: 1568 });
  });
});

describe("rewriteImageFilename", () => {
  it("swaps the extension to match the encoded mime", () => {
    expect(rewriteImageFilename("IMG_1234.HEIC", "image/jpeg")).toBe("IMG_1234.jpg");
    expect(rewriteImageFilename("shot.png", "image/png")).toBe("shot.png");
  });
});

describe("urlToChatAttachment", () => {
  it("keeps http(s) URLs", () => {
    const att = urlToChatAttachment("https://example.com/doc");
    expect(att.payload).toEqual({ kind: "url", url: "https://example.com/doc" });
    expect(att.filename).toBe("example.com");
  });
});

describe("resolveChatMime", () => {
  it("uses the browser type when present", () => {
    expect(
      resolveChatMime({ type: "image/jpeg", name: "IMG_1234.HEIC" }),
    ).toBe("image/jpeg");
  });

  it("guesses HEIC from filename when iOS omits file.type", () => {
    expect(resolveChatMime({ type: "", name: "IMG_1234.HEIC" })).toBe(
      "image/heic",
    );
    expect(resolveChatMime({ type: "", name: "photo.heif" })).toBe("image/heif");
  });
});

describe("takeSelectedFiles", () => {
  it("snapshots files before a live FileList is cleared", () => {
    const photo = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    let selected: File[] = [photo];
    const input = {
      get files() {
        return selected as unknown as FileList;
      },
      set value(_next: string) {
        selected = [];
      },
    } as HTMLInputElement;

    expect(takeSelectedFiles(input)).toEqual([photo]);
    expect(selected).toEqual([]);
  });
});

describe("chatAttachAcceptForViewport", () => {
  it("omits accept on coarse pointers so iOS can show Photo Library", () => {
    expect(
      chatAttachAcceptForViewport((query) => ({
        matches: query === "(pointer: coarse)",
      })),
    ).toBeUndefined();
  });

  it("keeps desktop accept filtering for fine pointers", () => {
    expect(chatAttachAcceptForViewport(() => ({ matches: false }))).toBe(
      CHAT_ATTACH_ACCEPT,
    );
  });
});
