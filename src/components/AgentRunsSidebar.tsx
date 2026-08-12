import { History, PanelRightClose, Plus } from "lucide-react";
import type { AgentRun } from "../services/agentsApi";
import { AgentRunsList } from "./AgentRunsList";
import { IconButton } from "./ui/IconButton";
import { cn } from "../lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedId?: string | null;
  onNewRun: () => void;
  onSelect: (run: AgentRun) => void;
  refreshKey?: number;
  runs?: AgentRun[];
  className?: string;
};

/** Desktop right-side agent history panel. Hidden until opened. */
export function AgentRunsSidebar({
  open,
  onClose,
  selectedId = null,
  onNewRun,
  onSelect,
  refreshKey = 0,
  runs,
  className,
}: Props) {
  if (!open) return null;

  return (
    <aside
      className={cn(
        "hidden h-full w-80 shrink-0 flex-col border-l border-donna-border bg-donna-sidebar lg:flex",
        className,
      )}
      aria-label="Agent history"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-donna-border px-3 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-donna-text">
          <History className="h-4 w-4 text-donna-primary" strokeWidth={1.75} />
          Agents
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            onClick={onNewRun}
            aria-label="New agent"
            className="!h-8 !w-8 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            onClick={onClose}
            aria-label="Close agent history"
            className="!h-8 !w-8 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
          >
            <PanelRightClose className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>

      <AgentRunsList
        active={open}
        selectedId={selectedId}
        compact
        onSelect={onSelect}
        refreshKey={refreshKey}
        runs={runs}
      />
    </aside>
  );
}
