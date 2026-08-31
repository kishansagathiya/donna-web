import { beforeEach, describe, expect, it } from "vitest";
import {
  isSafeNextPath,
  rememberLoginNext,
  resolvePostLoginPath,
  takeLoginNext,
} from "./loginNext";

describe("isSafeNextPath", () => {
  it("allows internal paths", () => {
    expect(isSafeNextPath("/blog/custom-coding-harnesses")).toBe(true);
    expect(isSafeNextPath("/app")).toBe(true);
  });

  it("rejects open redirects", () => {
    expect(isSafeNextPath("https://evil.example")).toBe(false);
    expect(isSafeNextPath("//evil.example")).toBe(false);
    expect(isSafeNextPath("/\\evil.example")).toBe(false);
    expect(isSafeNextPath("blog")).toBe(false);
  });
});

describe("login next storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("remembers and consumes a safe path", () => {
    rememberLoginNext("/blog/foo");
    expect(takeLoginNext()).toBe("/blog/foo");
    expect(takeLoginNext()).toBeNull();
  });

  it("ignores unsafe paths", () => {
    rememberLoginNext("//evil.example");
    expect(takeLoginNext()).toBeNull();
  });
});

describe("resolvePostLoginPath", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("prefers a safe query param", () => {
    rememberLoginNext("/blog/stored");
    expect(resolvePostLoginPath("/blog/query", true)).toBe("/blog/query");
  });

  it("falls back to stored next, then the app", () => {
    rememberLoginNext("/blog/stored");
    expect(resolvePostLoginPath(null, true)).toBe("/blog/stored");
    expect(resolvePostLoginPath(null, true)).toBe("/app");
    expect(resolvePostLoginPath(null, false)).toBe("/consent");
  });
});
