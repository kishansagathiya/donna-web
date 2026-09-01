import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";
import { reportError } from "./errorReporting";
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
  execution_target?: string;
  assigned_device_id?: string | null;
  workspace_id?: string | null;
  waiting_reason?: string | null;
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

function isGet(init: RequestInit): boolean {
  const method = (init.method ?? "GET").toUpperCase();
  return method === "GET" || method === "HEAD";
}

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

  const run = () =>
    fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });

  try {
    return await run();
  } catch (err) {
    reportError(err, { endpoint: path });
    // Safari can fail the real GET after a successful CORS preflight
    // ("NetworkError when attempting to fetch resource") while a retry works.
    if (isGet(init)) {
      try {
        return await run();
      } catch (retryErr) {
        reportError(retryErr, { endpoint: path, retry: "1" });
        throw retryErr;
      }
    }
    throw err;
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    return body.message || body.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

let inFlightList: Promise<AgentRun[]> | null = null;

export async function listAgentRuns(
  status?: string,
  opts?: { fresh?: boolean },
): Promise<AgentRun[]> {
  const params = new URLSearchParams();
  params.set("limit", "50");
  if (status) params.set("status", status);
  const path = `/agent-runs?${params.toString()}`;
  const fresh = Boolean(opts?.fresh);

  if (!status && !fresh && inFlightList) {
    return inFlightList;
  }

  const pending = (async () => {
    const res = await authorizedFetch(path);
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()) as AgentRun[];
  })();

  if (!status && !fresh) {
    inFlightList = pending.finally(() => {
      if (inFlightList === pending) inFlightList = null;
    });
    return inFlightList;
  }
  return pending;
}

export async function createAgentRun(
  goal: string,
  attachments?: AgentAttachment[],
  skills?: string[],
  workspaceId?: string,
): Promise<AgentRun> {
  const res = await authorizedFetch("/agent-runs", {
    method: "POST",
    body: JSON.stringify({
      goal,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      skills: skills && skills.length > 0 ? skills : undefined,
      workspace_id: workspaceId || undefined,
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
