const EXPERIMENTAL_UI_KEY = "donna.experimental_ui.v1";

/** Master Profile toggle — only controls whether experimental features are shown. */
export function getExperimentalUiEnabled(): boolean {
  try {
    return localStorage.getItem(EXPERIMENTAL_UI_KEY) === "true";
  } catch {
    return false;
  }
}

export function setExperimentalUiEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(EXPERIMENTAL_UI_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore quota / private-mode failures; toggle still works in-session.
  }
}
