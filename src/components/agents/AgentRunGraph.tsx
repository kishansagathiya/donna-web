import { useMemo, useState } from "react";
import {
  Ban,
  Check,
  CircleHelp,
  Clock,
  GitBranch,
  LoaderCircle,
  MessageSquare,
  Minus,
  SquareTerminal,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { Sheet } from "../ui/Sheet";
import { cn } from "../../lib/cn";
import {
  formatDurationMs,
  GRAPH_OUTCOME_LABELS,
  GRAPH_TYPE_LABELS,
  type GraphOutcome,
  type GraphNodeType,
  type RunGraph,
  type RunGraphEdge,
  type RunGraphNode,
} from "../../lib/agentGraph";
import { stepTitle } from "../../lib/agentTurns";

const outcomeStyles: Record<GraphOutcome, string> = {
  succeeded: "border-emerald-300 bg-emerald-50 text-emerald-900",
  failed: "border-red-300 bg-red-50 text-red-900",
  blocked: "border-amber-300 bg-amber-50 text-amber-950",
  active: "border-blue-300 bg-blue-50 text-blue-900",
  waiting: "border-amber-300 bg-amber-50 text-amber-950",
  unknown: "border-zinc-300 bg-zinc-100 text-zinc-700",
};

const outcomeDot: Record<GraphOutcome, string> = {
  succeeded: "bg-emerald-600",
  failed: "bg-red-600",
  blocked: "bg-amber-500",
  active: "bg-blue-600",
  waiting: "bg-amber-500",
  unknown: "bg-zinc-400",
};

function TypeIcon({ type }: { type: GraphNodeType }) {
  const cls = "h-4 w-4 shrink-0";
  switch (type) {
    case "prompt":
      return <MessageSquare className={cls} aria-hidden />;
    case "tool":
      return <Wrench className={cls} aria-hidden />;
    case "decision":
      return <GitBranch className={cls} aria-hidden />;
    case "output":
      return <SquareTerminal className={cls} aria-hidden />;
    case "error":
      return <TriangleAlert className={cls} aria-hidden />;
  }
}

function OutcomeIcon({ outcome }: { outcome: GraphOutcome }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (outcome) {
    case "succeeded":
      return <Check className={cls} aria-hidden />;
    case "failed":
      return <X className={cls} aria-hidden />;
    case "blocked":
      return <Ban className={cls} aria-hidden />;
    case "active":
      return <LoaderCircle className={cn(cls, "animate-spin")} aria-hidden />;
    case "waiting":
      return <Clock className={cls} aria-hidden />;
    case "unknown":
      return <Minus className={cls} aria-hidden />;
  }
}

function nodeAriaLabel(node: RunGraphNode): string {
  return `${GRAPH_TYPE_LABELS[node.type]}: ${node.label}. ${GRAPH_OUTCOME_LABELS[node.outcome]}.`;
}

function outgoingLabeled(node: RunGraphNode, edges: RunGraphEdge[]): RunGraphEdge[] {
  return edges.filter(
    (edge) =>
      edge.from === node.id && (edge.kind === "recovery" || edge.kind === "retry"),
  );
}

function formatJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function InspectorBody({ node }: { node: RunGraphNode }) {
  return (
    <div className="flex flex-col gap-4 text-sm text-donna-text">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
          {GRAPH_TYPE_LABELS[node.type]}
        </p>
        <p className="mt-1 font-medium">{node.label}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs">
          <OutcomeIcon outcome={node.outcome} />
          {GRAPH_OUTCOME_LABELS[node.outcome]}
          {node.inferredRetry ? " · Likely retry" : null}
        </p>
      </div>
      {node.toolName ? (
        <Field label="Tool" value={node.toolName} />
      ) : null}
      {node.args != null ? (
        <Field label="Arguments" value={formatJson(node.args)} mono />
      ) : null}
      {node.result ? <Field label="Result" value={node.result} mono /> : null}
      {node.error ? <Field label="Error" value={node.error} /> : null}
      {node.durationMs != null ? (
        <Field label="Duration" value={formatDurationMs(node.durationMs)} />
      ) : null}
      {node.startedAt || node.endedAt ? (
        <Field
          label="Timestamps"
          value={[node.startedAt, node.endedAt].filter(Boolean).join(" → ")}
        />
      ) : null}
      {node.recoveryFrom?.length ? (
        <Field label="Recovery source" value={node.recoveryFrom.join(", ")} />
      ) : null}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-donna-muted">
          Raw events ({node.rawEvents.length})
        </p>
        {node.rawEvents.length === 0 ? (
          <p className="text-xs text-donna-muted">No stored events on this node.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {node.rawEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-donna-border bg-donna-surface px-3 py-2"
              >
                <p className="text-xs font-medium">
                  #{event.seq} · {stepTitle(event)}
                </p>
                <pre className="mt-1 max-h-32 overflow-auto text-[11px] leading-snug text-donna-muted">
                  {formatJson(event.payload)}
                </pre>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-donna-muted">
        {label}
      </p>
      <p
        className={cn(
          "whitespace-pre-wrap break-words",
          mono && "font-mono text-[12px] leading-relaxed",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function AgentRunGraph({
  graph,
  inspectorPlacement,
}: {
  graph: RunGraph;
  inspectorPlacement?: "side" | "sheet";
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? null;
  const mode = inspectorPlacement ?? "responsive";
  const showSide = mode !== "sheet";
  const showSheet = mode !== "side";
  const labeled = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, outgoingLabeled(node, graph.edges)])),
    [graph],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <ol className="relative mx-auto max-w-xl">
          {graph.nodes.map((node, index) => {
            const offset = node.lane === "recovery";
            const next = graph.nodes[index + 1];
            const marks = labeled.get(node.id) ?? [];
            return (
              <li key={node.id} className="relative pb-5 last:pb-0">
                {index < graph.nodes.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-[13px] top-10 bottom-0 w-px bg-donna-border md:left-[15px]"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  aria-label={nodeAriaLabel(node)}
                  aria-current={selectedId === node.id}
                  className={cn(
                    "relative flex h-16 w-full items-center gap-3 overflow-hidden rounded-xl border px-3 text-left transition-shadow",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                    outcomeStyles[node.outcome],
                    offset && "ml-8 w-[calc(100%-2rem)] md:ml-24 md:w-[calc(100%-6rem)]",
                    selectedId === node.id && "ring-2 ring-donna-primary-ring",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                      outcomeDot[node.outcome],
                    )}
                  >
                    <TypeIcon type={node.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                      {GRAPH_TYPE_LABELS[node.type]}
                      <span className="inline-flex items-center gap-0.5 normal-case tracking-normal">
                        <OutcomeIcon outcome={node.outcome} />
                        {GRAPH_OUTCOME_LABELS[node.outcome]}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-medium">
                      {node.label}
                    </span>
                  </span>
                </button>
                {marks.map((edge) => (
                  <p
                    key={edge.id}
                    data-edge={edge.kind}
                    className={cn(
                      "mt-1 ml-8 border-l-2 border-dashed border-donna-muted/60 pl-3 text-[11px] text-donna-muted md:ml-24",
                    )}
                  >
                    {edge.label}
                    {next ? ` → ${GRAPH_TYPE_LABELS[next.type]}` : ""}
                  </p>
                ))}
              </li>
            );
          })}
        </ol>
      </div>

      {showSide && selected ? (
        <aside
          className={cn(
            "min-h-0 w-[22rem] shrink-0 overflow-y-auto border-l border-donna-border px-5 py-5",
            mode === "responsive" && "hidden md:block",
          )}
        >
          <InspectorBody node={selected} />
        </aside>
      ) : null}

      {showSheet ? (
        <div className={mode === "responsive" ? "md:hidden" : undefined}>
          <Sheet
            open={Boolean(selected)}
            onClose={() => setSelectedId(null)}
            title={selected ? GRAPH_TYPE_LABELS[selected.type] : "Step"}
          >
            {selected ? <InspectorBody node={selected} /> : null}
          </Sheet>
        </div>
      ) : null}

      {showSide && !selected ? (
        <aside
          className={cn(
            "w-[22rem] shrink-0 items-center justify-center border-l border-donna-border px-5 text-sm text-donna-muted",
            mode === "responsive" ? "hidden md:flex" : "flex",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <CircleHelp className="h-4 w-4" />
            Select a step to inspect it.
          </span>
        </aside>
      ) : null}
    </div>
  );
}

export function GraphLegend() {
  const items: { outcome: GraphOutcome; note: string }[] = [
    { outcome: "succeeded", note: "Completed" },
    { outcome: "failed", note: "Failed" },
    { outcome: "active", note: "Active" },
    { outcome: "waiting", note: "Waiting" },
    { outcome: "unknown", note: "Unknown" },
  ];
  return (
    <ul className="flex flex-wrap gap-2 text-[11px] text-donna-muted">
      {items.map((item) => (
        <li key={item.outcome} className="inline-flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full", outcomeDot[item.outcome])} />
          <OutcomeIcon outcome={item.outcome} />
          {item.note}
        </li>
      ))}
    </ul>
  );
}
