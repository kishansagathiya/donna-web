import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";
import type { DonnaMode } from "../types/mode";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatReply = {
  reply: string;
  sessionId: string;
};

export class ChatAbortedError extends Error {
  constructor(message = "Generation stopped") {
    super(message);
    this.name = "ChatAbortedError";
  }
}

export function isChatAbortError(err: unknown): boolean {
  if (err instanceof ChatAbortedError) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  return false;
}

async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  sessionId?: string,
  mode: DonnaMode = "talk",
): Promise<ChatReply> {
  const res = await authorizedFetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: history.filter((m) => m.role === "user" || m.role === "assistant"),
      session_id: sessionId,
      mode,
    }),
  });

  const body = (await res.json()) as ChatReply & {
    session_id?: string;
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Chat failed (${res.status})`,
    );
  }

  return {
    reply: body.reply,
    sessionId: body.sessionId ?? body.session_id ?? sessionId ?? "",
  };
}

export async function streamChatMessage(
  message: string,
  history: ChatMessage[],
  sessionId: string | undefined,
  callbacks: {
    mode?: DonnaMode;
    signal?: AbortSignal;
    onSessionId?: (id: string) => void;
    onChunk?: (partial: string) => void;
    onPhase?: (phase: string) => void;
    onDone?: (reply: string, sessionId: string) => void;
    onError?: (message: string) => void;
  },
): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }

  if (callbacks.signal?.aborted) {
    throw new ChatAbortedError();
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/chat?stream=1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message,
        history: history.filter((m) => m.role === "user" || m.role === "assistant"),
        session_id: sessionId,
        mode: callbacks.mode ?? "talk",
      }),
      signal: callbacks.signal,
    });
  } catch (err) {
    if (isChatAbortError(err)) {
      throw new ChatAbortedError();
    }
    throw err;
  }

  if (!res.ok) {
    const body = (await res.json()) as { message?: string; error?: string };
    throw new Error(
      body.message ?? body.error ?? `Chat failed (${res.status})`,
    );
  }

  if (!res.body) {
    throw new Error("Streaming not supported");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError: string | null = null;

  try {
    while (true) {
      if (callbacks.signal?.aborted) {
        await reader.cancel().catch(() => undefined);
        throw new ChatAbortedError();
      }

      let done: boolean;
      let value: Uint8Array | undefined;
      try {
        ({ done, value } = await reader.read());
      } catch (err) {
        if (isChatAbortError(err) || callbacks.signal?.aborted) {
          throw new ChatAbortedError();
        }
        throw err;
      }
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.trim()) continue;

        let event = "message";
        let data = "";

        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) {
            event = line.slice(7);
          } else if (line.startsWith("data: ")) {
            data = line.slice(6);
          }
        }

        if (!data) continue;

        try {
          const parsed = JSON.parse(data) as Record<string, string>;

          switch (event) {
            case "session":
              if (parsed.session_id) {
                callbacks.onSessionId?.(parsed.session_id);
              }
              break;
            case "phase":
              callbacks.onPhase?.(data.replace(/"/g, ""));
              break;
            case "chunk":
              if (parsed.text) {
                callbacks.onChunk?.(parsed.text);
              }
              break;
            case "done": {
              const doneBody = JSON.parse(data) as {
                reply: string;
                session_id: string;
              };
              callbacks.onDone?.(doneBody.reply, doneBody.session_id);
              break;
            }
            case "error":
              streamError = parsed.message ?? "Chat failed";
              callbacks.onError?.(streamError);
              break;
          }
        } catch {
          // ignore malformed SSE frames
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (streamError) {
    throw new Error(streamError);
  }
}
