import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { desktopInvoke, isDonnaDesktop, type LocalWorkspace } from "../lib/desktop";
import { listDesktopWorkspaces, type DesktopWorkspace } from "../services/desktopApi";
import { cn } from "../lib/cn";

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
};

export function WorkspacePicker({ value, onChange, disabled }: Props) {
  const [workspaces, setWorkspaces] = useState<DesktopWorkspace[]>([]);
  const desktop = isDonnaDesktop();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rows = await listDesktopWorkspaces();
        if (!cancelled && rows.length > 0) {
          setWorkspaces(rows);
          return;
        }
      } catch {
        // fall through to local list on desktop
      }
      if (desktop) {
        try {
          const local = await desktopInvoke<LocalWorkspace[]>("list_workspaces");
          if (!cancelled) {
            setWorkspaces(
              local.map((ws) => ({
                id: ws.id,
                user_id: "",
                device_id: "",
                name: ws.name,
              })),
            );
          }
        } catch {
          if (!cancelled) setWorkspaces([]);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [desktop]);

  async function addWorkspace() {
    if (!desktop) return;
    try {
      const ws = await desktopInvoke<LocalWorkspace>("pick_workspace");
      setWorkspaces((prev) => {
        if (prev.some((w) => w.id === ws.id)) return prev;
        return [...prev, { id: ws.id, user_id: "", device_id: "", name: ws.name }];
      });
      onChange(ws.id);
    } catch {
      // user cancelled
    }
  }

  if (workspaces.length === 0 && !desktop) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-donna-muted">
      <FolderOpen className="h-3.5 w-3.5" />
      <label className="sr-only" htmlFor="workspace-select">
        Workspace
      </label>
      <select
        id="workspace-select"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "rounded-lg border border-donna-border bg-white px-2 py-1 text-xs text-donna-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
        )}
      >
        <option value="">No workspace (research only)</option>
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>
      {desktop ? (
        <button
          type="button"
          onClick={() => void addWorkspace()}
          disabled={disabled}
          className="font-medium text-donna-primary hover:underline"
        >
          Add folder
        </button>
      ) : null}
    </div>
  );
}
