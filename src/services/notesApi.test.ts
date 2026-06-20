import { describe, expect, it } from "vitest";
import {
  formatNoteDate,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "./notesApi";

describe("notesApi helpers", () => {
  it("formats note dates", () => {
    const formatted = formatNoteDate("2024-06-15T12:00:00.000Z");
    expect(formatted).toContain("2024");
    expect(formatted).toContain("Jun");
  });

  it("round trips datetime-local values", () => {
    const iso = "2024-06-15T14:30:00.000Z";
    const local = toDatetimeLocalValue(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDatetimeLocalValue(local)).toBe(new Date(local).toISOString());
  });

  it("returns original string for invalid note dates", () => {
    expect(formatNoteDate("not-a-date")).toBe("not-a-date");
  });
});
