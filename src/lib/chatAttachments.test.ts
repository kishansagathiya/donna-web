import { describe, expect, it } from "vitest";
import {
  rewriteImageFilename,
  scaledImageSize,
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
