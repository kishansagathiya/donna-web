import { afterEach, describe, expect, it } from "vitest";
import {
  COMPOSER_MODE_STORAGE_KEY,
  getStoredComposerMode,
  isComposerMode,
  parseComposerMode,
  storeComposerMode,
} from "./composerMode";

describe("isComposerMode", () => {
  it("accepts chat and agent", () => {
    expect(isComposerMode("chat")).toBe(true);
    expect(isComposerMode("agent")).toBe(true);
  });

  it("rejects other values", () => {
    expect(isComposerMode("voice")).toBe(false);
    expect(isComposerMode("")).toBe(false);
    expect(isComposerMode(null)).toBe(false);
  });
});

describe("parseComposerMode", () => {
  it("falls back to chat", () => {
    expect(parseComposerMode("agent")).toBe("agent");
    expect(parseComposerMode("nope")).toBe("chat");
  });
});

describe("composer mode storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("reads the stored mode", () => {
    localStorage.setItem(COMPOSER_MODE_STORAGE_KEY, "agent");
    expect(getStoredComposerMode()).toBe("agent");
  });

  it("falls back to chat for invalid stored values", () => {
    localStorage.setItem(COMPOSER_MODE_STORAGE_KEY, "voice");
    expect(getStoredComposerMode()).toBe("chat");
  });

  it("persists the mode", () => {
    storeComposerMode("agent");
    expect(localStorage.getItem(COMPOSER_MODE_STORAGE_KEY)).toBe("agent");
    expect(getStoredComposerMode()).toBe("agent");
  });
});
