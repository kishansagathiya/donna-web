import { useEffect, useState } from "react";
import { Laptop, FolderOpen } from "lucide-react";
import { isDonnaDesktop } from "../lib/desktop";
import {
  deviceOnline,
  listDesktopDevices,
  type DesktopDevice,
} from "../services/desktopApi";
import { cn } from "../lib/cn";

export function DesktopStatusBar() {
  const [device, setDevice] = useState<DesktopDevice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const devices = await listDesktopDevices();
        if (cancelled) return;
        setDevice(devices.find((d) => d.is_default) ?? devices[0] ?? null);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load Mac");
        }
      }
    }
    void load();
    const t = window.setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  const online = device ? deviceOnline(device) : false;
  const desktop = isDonnaDesktop();

  return (
    <div className="flex items-center gap-2 border-b border-donna-border bg-donna-surface px-4 py-2 text-xs text-donna-muted">
      <Laptop className="h-3.5 w-3.5" />
      {error && !device ? (
        <span>Donna Desktop is not connected.</span>
      ) : device ? (
        <span>
          <span
            className={cn(
              "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
              online ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          {device.name}
          {online ? " online" : " offline"}
          {desktop ? " · this Mac" : ""}
        </span>
      ) : (
        <span>No Mac registered. Install Donna Desktop to run agents locally.</span>
      )}
      <a
        href="/app/desktop"
        className="ml-auto inline-flex items-center gap-1 font-medium text-donna-primary hover:underline"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        Desktop
      </a>
    </div>
  );
}
