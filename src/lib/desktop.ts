export function isDonnaDesktop(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: { core?: { invoke?: unknown } };
  };
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__?.core?.invoke);
}

type TauriCore = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

function tauriCore(): TauriCore | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    __TAURI__?: { core?: TauriCore };
    __TAURI_INTERNALS__?: { invoke?: TauriCore["invoke"] };
  };
  if (w.__TAURI__?.core?.invoke) return w.__TAURI__.core;
  if (w.__TAURI_INTERNALS__?.invoke) {
    return { invoke: w.__TAURI_INTERNALS__.invoke };
  }
  return null;
}

export async function desktopInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const core = tauriCore();
  if (!core) {
    throw new Error("Donna Desktop APIs are unavailable in the browser.");
  }
  return (await core.invoke(cmd, args)) as T;
}

type Unlisten = () => void;

export function onDesktopAuth(callback: () => void): Unlisten {
  if (typeof window === "undefined") return () => {};
  const w = window as Window & {
    __TAURI__?: {
      event?: {
        listen: (event: string, handler: () => void) => Promise<Unlisten>;
      };
    };
  };
  const listen = w.__TAURI__?.event?.listen;
  if (!listen) return () => {};
  let unlisten: Unlisten | undefined;
  void listen("donna://auth", callback).then((fn) => {
    unlisten = fn;
  });
  return () => {
    unlisten?.();
  };
}

export type DesktopStatus = {
  app_version: string;
  worker_version: string;
  device_id: string;
  public_device_id: string;
  cloud_connected: boolean;
  worker_running: boolean;
  paused: boolean;
  browser_ready: boolean;
  active_run_id: string;
  queued_runs: number;
};

export type LocalWorkspace = {
  id: string;
  name: string;
  path: string;
};
