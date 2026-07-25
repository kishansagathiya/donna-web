import { getAccessToken } from "./auth";
import { API_BASE_URL } from "../config";

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

export type IntegrationCapabilities = {
  live_query_meetings: boolean;
  live_get_transcript: boolean;
  list_meetings: boolean;
  get_meetings: boolean;
  transcripts: boolean;
  folders: boolean;
  calendar_write?: boolean;
  history_days?: number;
  plan_hint?: string;
};

export type IntegrationStatus = {
  provider: string;
  status: string;
  account_label?: string;
  workspace_label?: string;
  capabilities: IntegrationCapabilities;
  initial_sync_status: string;
  imported_meeting_count: number;
  imported_transcript_count: number;
  sync_enabled: boolean;
  last_sync_at?: string;
  next_sync_at?: string;
  last_error?: string;
  retains_imports_on_disconnect: boolean;
  enabled: boolean;
};

type ErrorBody = { error?: string; message?: string };

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as ErrorBody;
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function listIntegrations(): Promise<IntegrationStatus[]> {
  const res = await authorizedFetch("/integrations");
  const body = (await res.json()) as {
    integrations?: IntegrationStatus[];
  } & ErrorBody;
  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Load failed (${res.status})`,
    );
  }
  return body.integrations ?? [];
}

export async function authorizeGranola(
  returnTo: "web" | "mobile" = "web",
): Promise<{ authorization_url: string }> {
  const res = await authorizedFetch("/integrations/granola/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ return_to: returnTo }),
  });
  const body = (await res.json()) as {
    authorization_url?: string;
  } & ErrorBody;
  if (!res.ok || !body.authorization_url) {
    throw new Error(
      body.message ?? body.error ?? `Authorize failed (${res.status})`,
    );
  }
  return { authorization_url: body.authorization_url };
}

export async function syncGranola(): Promise<void> {
  const res = await authorizedFetch("/integrations/granola/sync", {
    method: "POST",
  });
  if (res.status === 202) {
    return;
  }
  throw new Error(await readError(res, `Sync failed (${res.status})`));
}

export async function patchGranola(syncEnabled: boolean): Promise<IntegrationStatus> {
  const res = await authorizedFetch("/integrations/granola", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sync_enabled: syncEnabled }),
  });
  const body = (await res.json()) as IntegrationStatus & ErrorBody;
  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Update failed (${res.status})`,
    );
  }
  return body;
}

export async function disconnectGranola(): Promise<IntegrationStatus> {
  const res = await authorizedFetch("/integrations/granola", {
    method: "DELETE",
  });
  const body = (await res.json()) as IntegrationStatus & ErrorBody;
  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Disconnect failed (${res.status})`,
    );
  }
  return body;
}

export async function deleteGranolaImports(): Promise<void> {
  const res = await authorizedFetch("/integrations/granola/imports", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) {
    throw new Error(await readError(res, `Delete failed (${res.status})`));
  }
}

export async function authorizeGoogle(
  returnTo: "web" | "mobile" = "web",
): Promise<{ authorization_url: string }> {
  const res = await authorizedFetch("/integrations/google/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ return_to: returnTo }),
  });
  const body = (await res.json()) as {
    authorization_url?: string;
  } & ErrorBody;
  if (!res.ok || !body.authorization_url) {
    throw new Error(
      body.message ?? body.error ?? `Authorize failed (${res.status})`,
    );
  }
  return { authorization_url: body.authorization_url };
}

export async function disconnectGoogle(): Promise<IntegrationStatus> {
  const res = await authorizedFetch("/integrations/google", {
    method: "DELETE",
  });
  const body = (await res.json()) as IntegrationStatus & ErrorBody;
  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Disconnect failed (${res.status})`,
    );
  }
  return body;
}
