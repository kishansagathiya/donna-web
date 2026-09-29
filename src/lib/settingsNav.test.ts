import { describe, expect, it } from "vitest";
import { isSettingsPath, settingsNavItems } from "./settingsNav";

describe("settingsNav", () => {
  it("keeps chat out of the settings list", () => {
    expect(settingsNavItems.map((item) => item.label)).toEqual([
      "Voice",
      "Notes",
      "Employees",
      "Schedules",
      "Actions",
      "Reminders",
      "Today",
      "Memory",
      "Profile",
      "Desktop",
    ]);
    expect(isSettingsPath("/app")).toBe(false);
  });

  it("treats settings destinations as the settings section", () => {
    expect(isSettingsPath("/app/settings")).toBe(true);
    expect(isSettingsPath("/app/voice")).toBe(true);
    expect(isSettingsPath("/app/notes/abc")).toBe(true);
    expect(isSettingsPath("/app/profile")).toBe(true);
    expect(isSettingsPath("/app/skills")).toBe(true);
    expect(isSettingsPath("/support")).toBe(false);
  });
});
