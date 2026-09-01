import { getAccessToken, signOut } from "./auth";
import { revokeAiDataConsent } from "./privacyConsent";
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

export async function deleteAccount(): Promise<void> {
  const res = await authorizedFetch("/account", { method: "DELETE" });
  const body = (await res.json()) as { error?: string; message?: string };

  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Delete failed (${res.status})`,
    );
  }

  revokeAiDataConsent();
  await signOut();
}

export type AccountPreferences = {
  llm_model: string;
  available_models: string[];
  persona: string;
  persona_custom: string;
  available_personas: string[] | null;
  timezone: string;
  experimental?: {
    notesFeed?: boolean;
    smartTagging?: boolean;
    memoryExtraction?: boolean;
    memoryRetrieval?: boolean;
    localAgentsV1?: boolean;
  };
};

export async function getAccountPreferences(): Promise<AccountPreferences> {
  const res = await authorizedFetch("/account");
  const body = (await res.json()) as AccountPreferences & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Load failed (${res.status})`);
  }
  return {
    ...body,
    timezone: body.timezone ?? "",
  };
}

export async function updateLLMModel(llmModel: string): Promise<void> {
  const res = await authorizedFetch("/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ llm_model: llmModel }),
  });
  const body = (await res.json()) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Save failed (${res.status})`);
  }
}

export async function updatePersona(
  persona: string,
  personaCustom?: string,
): Promise<void> {
  const payload: Record<string, string> = { persona };
  if (personaCustom !== undefined) {
    payload.persona_custom = personaCustom;
  }
  const res = await authorizedFetch("/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Save failed (${res.status})`);
  }
}

export async function updateTimezone(timezone: string): Promise<string> {
  const res = await authorizedFetch("/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timezone }),
  });
  const body = (await res.json()) as {
    timezone?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Save failed (${res.status})`);
  }
  if (typeof body.timezone !== "string") {
    throw new Error("Timezone was not saved. Refresh and try again.");
  }
  return body.timezone;
}

export async function updateLocalAgentsV1(enabled: boolean): Promise<boolean> {
  const res = await authorizedFetch("/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ experimental: { localAgentsV1: enabled } }),
  });
  const body = (await res.json()) as {
    experimental?: { localAgentsV1?: boolean };
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Save failed (${res.status})`);
  }
  return Boolean(body.experimental?.localAgentsV1);
}

export async function downloadAccountExport(): Promise<void> {
  const res = await authorizedFetch("/account/export");
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // ZIP responses have no JSON body on success; errors may still be JSON.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `donna-export-${date}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
