import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";
import { reportError } from "./errorReporting";
import type { AgentRun } from "./agentsApi";

export type ScheduledGoal = {
  id: string;
  user_id: string;
  title: string;
  goal: string;
  status: "active" | "paused" | "completed" | "archived" | string;
  cadence_minutes: number;
  selected_skills?: string[];
  last_summary: string;
  current_agent_run_id?: string | null;
  run_count: number;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

export type CreateScheduleInput = {
  title: string;
  goal: string;
  cadence_minutes?: number;
  selected_skills?: string[];
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

export async function listSchedules(status?: string): Promise<ScheduledGoal[]> {
  const params = new URLSearchParams();
  params.set("limit", "50");
  if (status) params.set("status", status);
  const res = await authorizedFetch(`/schedules?${params.toString()}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ScheduledGoal[];
}

export async function createSchedule(input: CreateScheduleInput): Promise<ScheduledGoal> {
  const res = await authorizedFetch("/schedules", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ScheduledGoal;
}

export async function pauseSchedule(id: string): Promise<ScheduledGoal> {
  const res = await authorizedFetch(`/schedules/${encodeURIComponent(id)}/pause`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ScheduledGoal;
}

export async function resumeSchedule(id: string): Promise<ScheduledGoal> {
  const res = await authorizedFetch(`/schedules/${encodeURIComponent(id)}/resume`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ScheduledGoal;
}

export async function archiveSchedule(id: string): Promise<ScheduledGoal> {
  const res = await authorizedFetch(`/schedules/${encodeURIComponent(id)}/archive`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ScheduledGoal;
}

export async function runScheduleNow(id: string): Promise<ScheduledGoal> {
  const res = await authorizedFetch(`/schedules/${encodeURIComponent(id)}/run`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ScheduledGoal;
}

export async function listScheduleRuns(id: string): Promise<AgentRun[]> {
  const res = await authorizedFetch(
    `/schedules/${encodeURIComponent(id)}/runs?limit=20`,
  );
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AgentRun[];
}

export function cadenceLabel(minutes: number): string {
  if (minutes <= 0) return "Once";
  if (minutes === 60) return "Hourly";
  if (minutes === 1440) return "Daily";
  if (minutes === 10080) return "Weekly";
  return `Every ${minutes}m`;
}
