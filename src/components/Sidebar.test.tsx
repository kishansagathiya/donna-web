import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../hooks/useTheme";
import { SettingsPage } from "../pages/SettingsPage";
import { Sidebar } from "./Sidebar";

function renderSidebar(path = "/app") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("Sidebar", () => {
  it("shows chat and settings, and hides feature pages", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "Chat" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Help" })).toBeInTheDocument();

    for (const label of [
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
    ]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });
});

describe("SettingsPage", () => {
  it("lists the pages removed from the main menu", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/app/settings"]}>
          <SettingsPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    for (const label of [
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
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
