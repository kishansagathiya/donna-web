import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";
import { reportError } from "./errorReporting";

export type ReminderStatus = "scheduled" | "fired" | "dismissed" | "cancelled" | string;

export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  due_at: string;
  timezone: string;
  status: ReminderStatus;
  action_run_id?: string | null;
  fired_at?: string | null;
  dismissed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateReminderInput = {
  title: string;
  notes?: string;
  when?: string;
  due_at?: string;
  timezone?: string;
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

export async function listReminders(status?: string): Promise<Reminder[]> {
  const params = new URLSearchParams();
  params.set("limit", "50");
  if (status) params.set("status", status);
  const res = await authorizedFetch(`/reminders?${params.toString()}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Reminder[];
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const res = await authorizedFetch("/reminders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Reminder;
}

export async function cancelReminder(id: string): Promise<Reminder> {
  const res = await authorizedFetch(`/reminders/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Reminder;
}

export async function dismissReminder(id: string): Promise<Reminder> {
  const res = await authorizedFetch(`/reminders/${encodeURIComponent(id)}/dismiss`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as Reminder;
}

export function formatReminderWhen(dueAt: string, timezone?: string): string {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return dueAt;
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || undefined,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function isReminderDue(reminder: Reminder, now = Date.now()): boolean {
  if (reminder.status === "fired") return true;
  if (reminder.status !== "scheduled") return false;
  const due = Date.parse(reminder.due_at);
  return Number.isFinite(due) && due <= now;
}
