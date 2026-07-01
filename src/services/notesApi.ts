/** Context API — backed by /notes endpoints; UI treats these as context items. */
import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";

const WEB_CLIENT_HEADER = "X-Donna-Client";

export type NoteSummary = {
  id: string;
  title: string;
  preview: string;
  note_date: string;
  is_important: boolean;
  is_urgent: boolean;
  source_type: string;
};

export type DailyTask = {
  note_id: string;
  title: string;
  preview: string;
  priority: "do_first" | "schedule" | "delegate" | string;
  reason: string;
  is_urgent: boolean;
  is_important: boolean;
};

export type OutdatedNote = {
  note_id: string;
  title: string;
  preview: string;
  reason: string;
};

export type DailyBriefing = {
  date: string;
  summary: string;
  tasks: DailyTask[];
  outdated: OutdatedNote[];
};

export type Note = NoteSummary & {
  user_id: string;
  source_id: string | null;
  content: string;
  user_last_modified: string | null;
  created_at: string;
  updated_at: string;
};

async function authorizedFetch(
  path: string,
  init: RequestInit = {},
  webOnly = false,
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  if (webOnly) {
    headers[WEB_CLIENT_HEADER] = "web";
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
}

async function parseJSON<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

export async function checkDailyNotes(): Promise<DailyBriefing> {
  const res = await authorizedFetch(
    "/notes/daily-check",
    { method: "POST" },
    true,
  );
  return parseJSON(res);
}

export async function listRecentNotes(
  limit = 50,
  offset = 0,
): Promise<NoteSummary[]> {
  const res = await authorizedFetch(
    `/notes/recent?limit=${limit}&offset=${offset}`,
    {},
    true,
  );
  return parseJSON(res);
}

export async function searchNotes(query: string): Promise<NoteSummary[]> {
  const res = await authorizedFetch(
    `/notes/search?q=${encodeURIComponent(query.trim())}`,
  );
  return parseJSON(res);
}

export async function getNote(id: string): Promise<Note> {
  const res = await authorizedFetch(`/notes/${id}`, {}, true);
  return parseJSON(res);
}

export async function createNote(
  content: string,
  noteDate?: string,
): Promise<Note> {
  const res = await authorizedFetch(
    "/notes",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, note_date: noteDate }),
    },
    true,
  );
  return parseJSON(res);
}

export async function updateNote(
  id: string,
  patch: {
    content?: string;
    note_date?: string;
    is_important?: boolean;
    is_urgent?: boolean;
  },
): Promise<Note> {
  const res = await authorizedFetch(
    `/notes/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
    true,
  );
  return parseJSON(res);
}

export async function deleteNote(id: string): Promise<void> {
  const res = await authorizedFetch(
    `/notes/${id}`,
    { method: "DELETE" },
    true,
  );
  await parseJSON(res);
}

export function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
