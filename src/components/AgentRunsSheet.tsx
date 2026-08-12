import type { AgentRun } from "../services/agentsApi";
import { AgentRunsList } from "./AgentRunsList";
import { Sheet } from "./ui/Sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedId?: string | null;
  onSelect: (run: AgentRun) => void;
  refreshKey?: number;
  runs?: AgentRun[];
};

export function AgentRunsSheet({
  open,
  onClose,
  selectedId = null,
  onSelect,
  refreshKey = 0,
  runs,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Agent history">
      <AgentRunsList
        active={open}
        selectedId={selectedId}
        onSelect={(run) => {
          onSelect(run);
          onClose();
        }}
        refreshKey={refreshKey}
        runs={runs}
      />
    </Sheet>
  );
}
