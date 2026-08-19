export const COMPOSER_MODE_STORAGE_KEY = "donna.composerMode";

export type ComposerMode = "chat" | "agent";

export function isComposerMode(value: unknown): value is ComposerMode {
  return value === "chat" || value === "agent";
}

export function parseComposerMode(value: unknown): ComposerMode {
  return isComposerMode(value) ? value : "chat";
}

export function getStoredComposerMode(): ComposerMode {
  try {
    return parseComposerMode(localStorage.getItem(COMPOSER_MODE_STORAGE_KEY));
  } catch {
    return "chat";
  }
}

export function storeComposerMode(mode: ComposerMode): void {
  try {
    localStorage.setItem(COMPOSER_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore quota / private-mode failures; toggle still works in-session.
  }
}
