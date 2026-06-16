import { AI_DATA_CONSENT_KEY } from "../config";

export function hasAiDataConsent(): boolean {
  return localStorage.getItem(AI_DATA_CONSENT_KEY) === "true";
}

export function grantAiDataConsent(): void {
  localStorage.setItem(AI_DATA_CONSENT_KEY, "true");
}

export function revokeAiDataConsent(): void {
  localStorage.removeItem(AI_DATA_CONSENT_KEY);
}
