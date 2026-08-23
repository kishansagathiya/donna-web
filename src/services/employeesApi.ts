import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";
import { reportError } from "./errorReporting";
import type { AgentRun } from "./agentsApi";

export type AIEmployee = {
  id: string;
  user_id: string;
  name: string;
  role: string;
  goal: string;
  status: "active" | "paused" | "completed" | "archived" | string;
  cadence_minutes: number;
  max_steps_per_shift: number;
  tool_allowlist?: string[];
  progress_summary: string;
  progress?: unknown;
  current_agent_run_id?: string | null;
  shift_count: number;
  last_shift_at?: string | null;
  next_shift_at?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

export type HireEmployeeInput = {
  name: string;
  role?: string;
  goal: string;
  cadence_minutes?: number;
  max_steps_per_shift?: number;
};

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

export async function listEmployees(status?: string): Promise<AIEmployee[]> {
  const params = new URLSearchParams();
  params.set("limit", "50");
  if (status) params.set("status", status);
  const res = await authorizedFetch(`/employees?${params.toString()}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AIEmployee[];
}

export async function hireEmployee(input: HireEmployeeInput): Promise<AIEmployee> {
  const res = await authorizedFetch("/employees", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AIEmployee;
}

export async function getEmployee(id: string): Promise<AIEmployee> {
  const res = await authorizedFetch(`/employees/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AIEmployee;
}

export async function updateEmployee(
  id: string,
  patch: Partial<Pick<AIEmployee, "name" | "role" | "goal" | "cadence_minutes" | "max_steps_per_shift">>,
): Promise<AIEmployee> {
  const res = await authorizedFetch(`/employees/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AIEmployee;
}

export async function pauseEmployee(id: string): Promise<AIEmployee> {
  const res = await authorizedFetch(`/employees/${encodeURIComponent(id)}/pause`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AIEmployee;
}

export async function resumeEmployee(id: string): Promise<AIEmployee> {
  const res = await authorizedFetch(`/employees/${encodeURIComponent(id)}/resume`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AIEmployee;
}

export async function archiveEmployee(id: string): Promise<AIEmployee> {
  const res = await authorizedFetch(`/employees/${encodeURIComponent(id)}/archive`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AIEmployee;
}

export async function listEmployeeRuns(id: string): Promise<AgentRun[]> {
  const res = await authorizedFetch(
    `/employees/${encodeURIComponent(id)}/runs?limit=20`,
  );
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRun[];
}
