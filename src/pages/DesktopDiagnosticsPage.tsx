import { useEffect, useState } from "react";
import { AlertBanner } from "../components/ui/AlertBanner";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { desktopInvoke, isDonnaDesktop, type DesktopStatus } from "../lib/desktop";
import {
  deviceOnline,
  listDesktopDevices,
  listDesktopWorkspaces,
  revokeDesktopDevice,
  type DesktopDevice,
  type DesktopWorkspace,
} from "../services/desktopApi";

export function DesktopDiagnosticsPage() {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [devices, setDevices] = useState<DesktopDevice[]>([]);
  const [workspaces, setWorkspaces] = useState<DesktopWorkspace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const desktop = isDonnaDesktop();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [devs, spaces] = await Promise.all([
        listDesktopDevices(),
        listDesktopWorkspaces(),
      ]);
      setDevices(devs);
      setWorkspaces(spaces);
      if (desktop) {
        setStatus(await desktopInvoke<DesktopStatus>("diagnostics"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load diagnostics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [desktop]);

  return (
    <div className="mx-auto w-full max-w-2xl overflow-y-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-donna-text">Donna Desktop</h1>
      <p className="mt-1 text-sm text-donna-muted">
        Local agent runtime. Work happens on your Mac; Donna cloud keeps memory,
        auth, and run history.
      </p>

      {error ? (
        <AlertBanner className="mt-4" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : null}

      {status ? (
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <Item label="App" value={status.app_version} />
          <Item label="Worker" value={status.worker_version} />
          <Item label="Device" value={status.device_id || "—"} />
          <Item label="Cloud" value={status.cloud_connected ? "connected" : "offline"} />
          <Item label="Worker" value={status.worker_running ? (status.paused ? "paused" : "running") : "stopped"} />
          <Item label="Browser" value={status.browser_ready ? "ready" : "not running"} />
          <Item label="Active run" value={status.active_run_id || "none"} />
          <Item label="Queued" value={String(status.queued_runs)} />
        </dl>
      ) : null}

      <h2 className="mt-8 text-sm font-semibold text-donna-text">This Mac</h2>
      {devices.length === 0 ? (
        <p className="mt-2 text-sm text-donna-muted">
          No desktop device registered. Open Donna Desktop on this Mac and sign in.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-donna-border bg-donna-surface px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-donna-text">
                  {d.name}
                  {d.is_default ? " · default" : ""}
                </p>
                <p className="text-xs text-donna-muted">
                  {deviceOnline(d) ? "online" : "offline"} · {d.architecture} · {d.app_version || "unknown version"}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  void revokeDesktopDevice(d.id).then(() => load());
                }}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-semibold text-donna-text">Workspaces</h2>
      {workspaces.length === 0 ? (
        <p className="mt-2 text-sm text-donna-muted">
          No folders shared with Donna. Use Add folder in Agent mode on the Mac.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {workspaces.map((w) => (
            <li key={w.id} className="rounded-xl border border-donna-border px-3 py-2">
              {w.name}
            </li>
          ))}
        </ul>
      )}

      {desktop ? (
        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => void desktopInvoke("restart_worker")}
          >
            Restart worker
          </Button>
          <Button
            variant="secondary"
            onClick={() => void desktopInvoke("show_browser")}
          >
            Show browser
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-donna-border bg-donna-surface px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-donna-muted">{label}</dt>
      <dd className="mt-0.5 break-all font-medium text-donna-text">{value}</dd>
    </div>
  );
}
