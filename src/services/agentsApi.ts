import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";
import type { ChatAttachmentPayload } from "../lib/chatAttachments";

export type AgentRun = {
  id: string;
  user_id: string;
  intent_id?: string | null;
  goal: string;
  status: string;
  plan?: unknown;
  memory_snapshot?: unknown;
  tool_allowlist?: string[];
  max_steps: number;
  step_count: number;
  redirect_pending?: string | null;
  error?: string | null;
  result?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  finished_at?: string | null;
};

export type AgentStep = {
  id: string;
  agent_run_id: string;
  user_id: string;
  seq: number;
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AgentAttachment = ChatAttachmentPayload;

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    return body.message || body.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listAgentRuns(status?: string): Promise<AgentRun[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await authorizedFetch(`/agent-runs${q}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRun[];
}

export async function createAgentRun(
  goal: string,
  attachments?: AgentAttachment[],
): Promise<AgentRun> {
  const res = await authorizedFetch("/agent-runs", {
    method: "POST",
    body: JSON.stringify({
      goal,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRun;
}

export async function getAgentRun(id: string): Promise<AgentRun> {
  const res = await authorizedFetch(`/agent-runs/${id}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRun;
}

export async function listAgentSteps(id: string, afterSeq = 0): Promise<AgentStep[]> {
  const q = afterSeq > 0 ? `?after_seq=${afterSeq}` : "";
  const res = await authorizedFetch(`/agent-runs/${id}/steps${q}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentStep[];
}

export async function cancelAgentRun(id: string): Promise<AgentRun> {
  const res = await authorizedFetch(`/agent-runs/${id}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRun;
}

export async function finishAgentRun(id: string): Promise<AgentRun> {
  const res = await authorizedFetch(`/agent-runs/${id}/finish`, { method: "POST" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRun;
}

export async function redirectAgentRun(
  id: string,
  message: string,
  attachments?: AgentAttachment[],
): Promise<AgentRun> {
  const res = await authorizedFetch(`/agent-runs/${id}/redirect`, {
    method: "POST",
    body: JSON.stringify({
      message,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRun;
}

export type AgentRunShare = {
  url: string;
  token: string;
  created_at: string;
  expires_at?: string;
};

export type PublicSharedAgentTurn = {
  prompt: string;
  output: { kind: "summary" | "question" | "none"; text?: string };
};

export type PublicSharedAgentRun = {
  goal: string;
  status: string;
  created_at: string;
  turns: PublicSharedAgentTurn[];
};

export async function createAgentRunShare(id: string): Promise<AgentRunShare> {
  const res = await authorizedFetch(`/agent-runs/${encodeURIComponent(id)}/share`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRunShare;
}

export async function revokeAgentRunShare(id: string): Promise<void> {
  const res = await authorizedFetch(`/agent-runs/${encodeURIComponent(id)}/share`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** Public endpoint — no auth. */
export async function getSharedAgentRun(
  token: string,
): Promise<PublicSharedAgentRun> {
  const res = await fetch(
    `${API_BASE_URL}/share/agent/${encodeURIComponent(token)}`,
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error("not_found");
    throw new Error(await readError(res));
  }
  return (await res.json()) as PublicSharedAgentRun;
}
