import { API_BASE_URL } from "../config";
import { getAccessToken } from "./auth";

export type DesktopDevice = {
  id: string;
  user_id: string;
  public_device_id: string;
  name: string;
  platform: string;
  architecture: string;
  app_version: string;
  last_seen_at?: string | null;
  is_default: boolean;
  revoked_at?: string | null;
};

export type DesktopWorkspace = {
  id: string;
  user_id: string;
  device_id: string;
  name: string;
  last_seen_at?: string | null;
};

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not signed in");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    return body.message || body.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listDesktopDevices(): Promise<DesktopDevice[]> {
  const res = await authorizedFetch("/desktop/devices");
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DesktopDevice[];
}

export async function listDesktopWorkspaces(deviceId?: string): Promise<DesktopWorkspace[]> {
  const q = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  const res = await authorizedFetch(`/desktop/workspaces${q}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DesktopWorkspace[];
}

export async function revokeDesktopDevice(id: string): Promise<DesktopDevice> {
  const res = await authorizedFetch(`/desktop/devices/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DesktopDevice;
}

export function deviceOnline(device: DesktopDevice, now = Date.now()): boolean {
  if (device.revoked_at) return false;
  if (!device.last_seen_at) return false;
  const seen = Date.parse(device.last_seen_at);
  if (Number.isNaN(seen)) return false;
  return now - seen <= 45_000;
}

export function waitingReasonLabel(reason?: string | null): string | null {
  switch (reason) {
    case "device_offline":
      return "Waiting for Mac";
    case "device_busy":
      return "Mac busy";
    case "workspace_unavailable":
      return "Workspace unavailable";
    case "desktop_required":
      return "Install Donna Desktop";
    default:
      return null;
  }
}
