import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";
import type { DonnaMode } from "../types/mode";
import type { MemoryCitation } from "../types/citations";
import type { ChatAttachmentPayload } from "../lib/chatAttachments";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatReply = {
  reply: string;
  sessionId: string;
  citations?: MemoryCitation[];
  groundedUserMessage?: string;
  attachmentLabels?: string[];
};

export type ChatStreamDoneMeta = {
  citations?: MemoryCitation[];
  groundedUserMessage?: string;
  attachmentLabels?: string[];
};

export type ChatRequestOptions = {
  webSearch?: boolean;
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

type ChatRequestBody = {
  message: string;
  history: ChatMessage[];
  session_id?: string;
  mode: DonnaMode;
  attachments?: ChatAttachmentPayload[];
  web_search?: boolean;
};

function buildBody(
  message: string,
  history: ChatMessage[],
  sessionId: string | undefined,
  mode: DonnaMode,
  attachments?: ChatAttachmentPayload[],
  options: ChatRequestOptions = {},
): ChatRequestBody {
  const body: ChatRequestBody = {
    message,
    history: history.filter((m) => m.role === "user" || m.role === "assistant"),
    session_id: sessionId,
    mode,
  };
  if (attachments && attachments.length > 0) {
    body.attachments = attachments;
  }
  if (options.webSearch) {
    body.web_search = true;
  }
  return body;
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

function parseCitations(raw: unknown): MemoryCitation[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const text = typeof row.text === "string" ? row.text.trim() : "";
      if (!text) return null;
      return {
        source: typeof row.source === "string" ? row.source : "fact",
        id: typeof row.id === "string" ? row.id : undefined,
        text,
        score: typeof row.score === "number" ? row.score : undefined,
        url: typeof row.url === "string" ? row.url : undefined,
        title: typeof row.title === "string" ? row.title : undefined,
      } satisfies MemoryCitation;
    })
    .filter((c): c is MemoryCitation => c !== null);
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  sessionId?: string,
  mode: DonnaMode = "talk",
  attachments?: ChatAttachmentPayload[],
  options?: ChatRequestOptions,
): Promise<ChatReply> {
  const res = await authorizedFetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      buildBody(message, history, sessionId, mode, attachments, options),
    ),
  });

  const body = (await res.json()) as ChatReply & {
    session_id?: string;
    citations?: unknown;
    grounded_user_message?: string;
    attachment_labels?: string[];
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
    citations: parseCitations(body.citations),
    groundedUserMessage: body.groundedUserMessage ?? body.grounded_user_message,
    attachmentLabels: body.attachmentLabels ?? body.attachment_labels,
  };
}

export async function streamChatMessage(
  message: string,
  history: ChatMessage[],
  sessionId: string | undefined,
  callbacks: {
    mode?: DonnaMode;
    attachments?: ChatAttachmentPayload[];
    webSearch?: boolean;
    signal?: AbortSignal;
    onSessionId?: (id: string) => void;
    onChunk?: (partial: string) => void;
    onPhase?: (phase: string) => void;
    onCitations?: (citations: MemoryCitation[]) => void;
    onDone?: (
      reply: string,
      sessionId: string,
      meta?: ChatStreamDoneMeta,
    ) => void;
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
      body: JSON.stringify(
        buildBody(
          message,
          history,
          sessionId,
          callbacks.mode ?? "talk",
          callbacks.attachments,
          { webSearch: callbacks.webSearch },
        ),
      ),
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
  let latestCitations: MemoryCitation[] | undefined;

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
          const parsed = JSON.parse(data) as Record<string, unknown>;

          switch (event) {
            case "session":
              if (typeof parsed.session_id === "string") {
                callbacks.onSessionId?.(parsed.session_id);
              }
              break;
            case "phase":
              callbacks.onPhase?.(data.replace(/"/g, ""));
              break;
            case "chunk":
              if (typeof parsed.text === "string") {
                callbacks.onChunk?.(parsed.text);
              }
              break;
            case "citations": {
              const cites = parseCitations(parsed.citations);
              if (cites?.length) {
                latestCitations = cites;
                callbacks.onCitations?.(cites);
              }
              break;
            }
            case "done": {
              const doneBody = parsed as {
                reply?: string;
                session_id?: string;
                citations?: unknown;
                grounded_user_message?: string;
                attachment_labels?: string[];
              };
              const cites =
                parseCitations(doneBody.citations) ?? latestCitations;
              if (cites?.length) {
                latestCitations = cites;
                callbacks.onCitations?.(cites);
              }
              callbacks.onDone?.(
                doneBody.reply ?? "",
                doneBody.session_id ?? sessionId ?? "",
                {
                  citations: cites,
                  groundedUserMessage: doneBody.grounded_user_message,
                  attachmentLabels: doneBody.attachment_labels,
                },
              );
              break;
            }
            case "error":
              streamError =
                typeof parsed.message === "string"
                  ? parsed.message
                  : "Chat failed";
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
