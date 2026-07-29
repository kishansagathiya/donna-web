import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_STACK_LENGTH = 8000;
const MAX_ROUTE_LENGTH = 200;
const MAX_REPORTS_PER_SESSION = 20;

/**
 * Client-side error reporting. Reports are POSTed to the Donna backend, which
 * turns them into GitHub issues. Everything here is fire-and-forget: reporting
 * must never throw, reject, or surface anything to the caller (no console).
 */

/** Fingerprints (message + route) already reported this page session. */
const reportedFingerprints = new Set<string>();
let reportCount = 0;
let initialized = false;

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name || "Unknown error";
  }
  if (typeof error === "string" && error) {
    return error;
  }
  try {
    return String(error) || "Unknown error";
  } catch {
    return "Unknown error";
  }
}

function errorStack(error: unknown): string | undefined {
  if (error instanceof Error && typeof error.stack === "string") {
    return error.stack;
  }
  return undefined;
}

export function reportError(
  error: unknown,
  context?: Record<string, string>,
): void {
  try {
    const message = errorMessage(error).slice(0, MAX_MESSAGE_LENGTH);
    const route = window.location.pathname.slice(0, MAX_ROUTE_LENGTH);
    const fingerprint = `${route}::${message}`;

    // Throttle: each unique error once per page session, hard cap overall.
    if (reportedFingerprints.has(fingerprint)) {
      return;
    }
    if (reportCount >= MAX_REPORTS_PER_SESSION) {
      return;
    }
    reportedFingerprints.add(fingerprint);
    reportCount += 1;

    const stack = errorStack(error)?.slice(0, MAX_STACK_LENGTH);
    const appVersion = import.meta.env.VITE_APP_VERSION as string | undefined;

    void (async () => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      try {
        const token = await getAccessToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Report without auth — never block reporting on token lookup.
      }

      await fetch(`${API_BASE_URL}/errors`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          source: "web",
          message,
          ...(stack ? { stack } : {}),
          route,
          ...(appVersion ? { appVersion } : {}),
          ...(context && Object.keys(context).length > 0 ? { context } : {}),
        }),
      });
    })().catch(() => {
      // Swallow every failure — reporting must never break the app.
    });
  } catch {
    // Swallow every failure — reporting must never break the app.
  }
}

export function initErrorReporting(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  window.onerror = (message, _source, _lineno, _colno, error) => {
    reportError(error ?? message, { userAgent: navigator.userAgent });
  };

  window.onunhandledrejection = (event) => {
    reportError(event.reason, { userAgent: navigator.userAgent });
  };
}
