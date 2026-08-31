import { beforeEach, describe, expect, it } from "vitest";
import {
  getBlogSignupEmail,
  isBlogUnlocked,
  isValidSignupEmail,
  saveBlogSignupEmail,
} from "./blogGate";

describe("isValidSignupEmail", () => {
  it("accepts a normal address", () => {
    expect(isValidSignupEmail("founder@example.com")).toBe(true);
    expect(isValidSignupEmail("  founder@example.com  ")).toBe(true);
  });

  it("rejects empty or malformed values", () => {
    expect(isValidSignupEmail("")).toBe(false);
    expect(isValidSignupEmail("nope")).toBe(false);
    expect(isValidSignupEmail("a@b")).toBe(false);
    expect(isValidSignupEmail("a@b.")).toBe(false);
  });
});

describe("blog signup storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts locked", () => {
    expect(isBlogUnlocked()).toBe(false);
    expect(getBlogSignupEmail()).toBeNull();
  });

  it("saves a normalized email and unlocks", () => {
    saveBlogSignupEmail("  Founder@Example.COM ");
    expect(getBlogSignupEmail()).toBe("founder@example.com");
    expect(isBlogUnlocked()).toBe(true);
  });

  it("does not save an invalid email", () => {
    expect(() => saveBlogSignupEmail("nope")).toThrow(/valid email/i);
    expect(isBlogUnlocked()).toBe(false);
  });
});
