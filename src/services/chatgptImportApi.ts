import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";

export type ChatGPTImportStatus =
  | "awaiting_upload"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type ChatGPTImport = {
  id: string;
  status: ChatGPTImportStatus;
  conversations_total: number;
  conversations_processed: number;
  memories_imported: number;
  cursor_index: number;
  bytes?: number;
  error?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
};

export type CreateChatGPTImportResult = {
  id: string;
  status: ChatGPTImportStatus;
  upload_url: string;
  token: string;
  path: string;
  bucket: string;
  max_bytes: number;
  expires_in_s: number;
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

async function parseJSON<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(
      body.message ?? body.error ?? `Request failed (${res.status})`,
    );
  }
  return body;
}

export async function createChatGPTImport(): Promise<CreateChatGPTImportResult> {
  const res = await authorizedFetch("/imports/chatgpt", { method: "POST" });
  return parseJSON<CreateChatGPTImportResult>(res);
}

export async function getLatestChatGPTImport(): Promise<ChatGPTImport | null> {
  const res = await authorizedFetch("/imports/chatgpt");
  const body = await parseJSON<{ import: ChatGPTImport | null }>(res);
  return body.import;
}

export async function getChatGPTImport(id: string): Promise<ChatGPTImport> {
  const res = await authorizedFetch(`/imports/chatgpt/${id}`);
  const body = await parseJSON<{ import: ChatGPTImport }>(res);
  return body.import;
}

export async function startChatGPTImport(
  id: string,
  bytes?: number,
): Promise<ChatGPTImport> {
  const res = await authorizedFetch(`/imports/chatgpt/${id}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bytes != null ? { bytes } : {}),
  });
  const body = await parseJSON<{ import: ChatGPTImport }>(res);
  return body.import;
}

/** Upload ZIP directly to Supabase signed upload URL (not via Donna API). */
export async function uploadChatGPTExportZip(
  uploadUrl: string,
  token: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.setRequestHeader("x-upsert", "true");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(
        new Error(
          `Upload failed (${xhr.status})${xhr.responseText ? `: ${xhr.responseText}` : ""}`,
        ),
      );
    };
    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    xhr.send(file);
  });
}

export async function importChatGPTExportZip(
  file: File,
  onProgress?: (phase: "uploading" | "starting", ratio?: number) => void,
): Promise<ChatGPTImport> {
  const maxBytes = 512 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Export ZIP must be 512MB or smaller");
  }
  if (!file.name.toLowerCase().endsWith(".zip") && file.type !== "application/zip") {
    throw new Error("Please upload the ChatGPT export ZIP file");
  }

  const created = await createChatGPTImport();
  onProgress?.("uploading", 0);
  await uploadChatGPTExportZip(
    created.upload_url,
    created.token,
    file,
    (ratio) => onProgress?.("uploading", ratio),
  );
  onProgress?.("starting");
  return startChatGPTImport(created.id, file.size);
}
