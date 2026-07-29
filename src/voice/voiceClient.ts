import type { ClientMessage, ServerMessage } from "./protocol";
import { parseServerMessage } from "./protocol";
import { reportError } from "../services/errorReporting";

function connectionErrorMessage(url: string): string {
  const base = `Cannot reach Donna server at ${url}.`;
  if (import.meta.env.DEV) {
    return (
      `${base} Start it with npm run dev:server. ` +
      "Ensure the voice WebSocket proxy is configured in vite.config.ts."
    );
  }
  return `${base} Check your internet connection and try again in a moment.`;
}

export type VoiceClientHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (message: string) => void;
  onMessage?: (message: ServerMessage) => void;
};

export class VoiceClient {
  private ws: WebSocket | null = null;
  private handlers: VoiceClientHandlers = {};

  constructor(private readonly url: string) {}

  setHandlers(handlers: VoiceClientHandlers): void {
    this.handlers = handlers;
  }

  connect(accessToken?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        this.handlers.onError?.(message);
        reject(new Error(message));
      };

      const url = accessToken
        ? `${this.url}${this.url.includes("?") ? "&" : "?"}token=${encodeURIComponent(accessToken)}`
        : this.url;

      // One stable message so a failure's error + close events dedup into a
      // single report. Server-initiated closes (e.g. 4401 auth) are not
      // reported — the server reports those itself.
      const reportConnectionFailure = () => {
        reportError(new Error(`Voice WebSocket connection failed: ${this.url}`), {
          endpoint: this.url,
        });
      };

      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        if (settled) return;
        settled = true;
        this.handlers.onOpen?.();
        resolve();
      };

      ws.onerror = () => {
        reportConnectionFailure();
        fail(connectionErrorMessage(this.url));
      };

      ws.onclose = (event) => {
        const reason = event.reason?.trim();
        let message: string | null = null;
        if (event.code === 4401) {
          const authMessages: Record<string, string> = {
            missing_token: "Not signed in. Please sign in to continue.",
            token_expired: "Your session expired. Please sign in again.",
            invalid_token: "Invalid session. Please sign in again.",
          };
          message =
            authMessages[reason] ??
            (reason || "Authentication failed. Please sign in again.");
        } else if (!settled) {
          message = import.meta.env.DEV
            ? `Voice socket closed before connect (${this.url}, code ${event.code}). Is the voice server running?`
            : "Could not connect to Donna. Please try again.";
        }

        if (message) {
          if (!settled) {
            fail(message);
          } else {
            this.handlers.onError?.(message);
          }
        }
        if (event.code === 1006) {
          // Abnormal closure — the connection died unexpectedly.
          reportConnectionFailure();
        }
        this.handlers.onClose?.();
        this.ws = null;
      };

      ws.onmessage = (event) => {
        try {
          const message = parseServerMessage(String(event.data));
          this.handlers.onMessage?.(message);
        } catch {
          this.handlers.onError?.("Invalid server message");
        }
      };
    });
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error("Voice socket is not connected");
    }
    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
