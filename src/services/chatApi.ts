import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatReply = {
  reply: string;
  sessionId: string;
};

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
): Promise<ChatReply> {
  const res = await authorizedFetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: history.filter((m) => m.role === "user" || m.role === "assistant"),
      session_id: sessionId,
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

  const res = await fetch(`${API_BASE_URL}/chat?stream=1`, {
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
    }),
  });

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

  while (true) {
    const { done, value } = await reader.read();
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
            callbacks.onError?.(parsed.message ?? "Chat failed");
            break;
        }
      } catch {
        // ignore malformed SSE frames
      }
    }
  }
}
