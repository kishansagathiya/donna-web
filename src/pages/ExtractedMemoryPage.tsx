import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Plus, Trash2 } from "lucide-react";
import {
  acceptMemoryItem,
  acceptMemorySuggestion,
  createMemoryFact,
  deleteMemoryItem,
  formatFactDate,
  isSuggestionItem,
  listMemoryGrouped,
  listMemoryItems,
  markMemoryOutdated,
  rejectMemoryItem,
  rejectMemorySuggestion,
  resolveMemoryItem,
  resolveMemorySuggestion,
  suggestionIdOf,
  updateMemoryItem,
  type MemoryGroup,
  type MemoryItem,
  type MemoryListStatus,
} from "../services/memoryApi";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { TextInput } from "../components/ui/TextInput";
import { TextArea } from "../components/ui/TextArea";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { IconButton } from "../components/ui/IconButton";
import { cn } from "../lib/cn";

const INBOX_TABS: { id: MemoryListStatus | "grouped"; label: string }[] = [
  { id: "grouped", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "sensitive", label: "Sensitive" },
  { id: "conflicting", label: "Conflicts" },
  { id: "rejected", label: "Rejected" },
  { id: "outdated", label: "Outdated" },
];

export function ExtractedMemoryPage() {
  const [tab, setTab] = useState<(typeof INBOX_TABS)[number]["id"]>("grouped");
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<MemoryGroup[]>([]);
  const [inbox, setInbox] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newFactText, setNewFactText] = useState("");
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "grouped") {
        setGroups(await listMemoryGrouped(query));
        setInbox([]);
      } else {
        setInbox(await listMemoryItems({ status: tab, q: query }));
        setGroups([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load memory");
      setGroups([]);
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }, [query, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleGroups = useMemo(
    () => groups.filter((g) => g.items.length > 0),
    [groups],
  );

  const runAction = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
      setEditingId(null);
      setEditText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEdit = async (item: MemoryItem) => {
    if (!editText.trim()) return;
    const sid = suggestionIdOf(item);
    if (sid) {
      await runAction(item.id, () =>
        resolveMemorySuggestion(sid, "accept_new", editText.trim()),
      );
      return;
    }
    await runAction(item.id, () =>
      updateMemoryItem(item.id, { fact: editText.trim() }),
    );
  };

  const handleAccept = async (item: MemoryItem) => {
    const sid = suggestionIdOf(item);
    if (sid) {
      await runAction(item.id, () => acceptMemorySuggestion(sid));
      return;
    }
    await runAction(item.id, () => acceptMemoryItem(item.id));
  };

  const handleReject = async (item: MemoryItem) => {
    const sid = suggestionIdOf(item);
    if (sid) {
      await runAction(item.id, () => rejectMemorySuggestion(sid));
      return;
    }
    await runAction(item.id, () => rejectMemoryItem(item.id));
  };

  const handleOutdated = async (item: MemoryItem) => {
    if (isSuggestionItem(item)) return;
    await runAction(item.id, () => markMemoryOutdated(item.id));
  };

  const handleResolve = async (
    item: MemoryItem,
    decision: "keep_existing" | "accept_new",
  ) => {
    const sid = suggestionIdOf(item);
    if (sid) {
      await runAction(item.id, () => resolveMemorySuggestion(sid, decision));
      return;
    }
    await runAction(item.id, () => resolveMemoryItem(item.id, decision));
  };

  const handleDelete = async (item: MemoryItem) => {
    if (isSuggestionItem(item)) {
      await handleReject(item);
      return;
    }
    if (!window.confirm("Remove this memory?")) return;
    await runAction(item.id, () => deleteMemoryItem(item.id));
  };

  const handleAdd = async () => {
    if (!newFactText.trim()) return;
    setBusyId("new");
    setError(null);
    try {
      await createMemoryFact({ fact: newFactText.trim() });
      setNewFactText("");
      setAdding(false);
      setTab("grouped");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add memory");
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = (item: MemoryItem) => {
    const busy = busyId === item.id;
    const editing = editingId === item.id;
    const evidence = item.evidence ?? [];

    return (
      <li
        key={item.id}
        className="rounded-xl border border-donna-border bg-white p-4"
      >
        {editing ? (
          <div>
            <TextArea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-20"
              autoFocus
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                className="!w-auto"
                disabled={busy || !editText.trim()}
                onClick={() => void handleSaveEdit(item)}
              >
                {busy ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="secondary"
                className="!w-auto"
                onClick={() => {
                  setEditingId(null);
                  setEditText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {item.memory_kind ? (
                <span className="rounded-md bg-donna-surface px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-donna-muted">
                  {item.memory_kind}
                </span>
              ) : null}
              {item.sensitivity && item.sensitivity !== "normal" ? (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-amber-800">
                  {item.sensitivity}
                </span>
              ) : null}
              {item.conflicting ? (
                <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-rose-700">
                  conflict
                </span>
              ) : null}
              {item.review_status && item.review_status !== "active" ? (
                <span className="text-[0.6875rem] text-donna-muted">
                  {item.review_status.replace("_", " ")}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-donna-text">
              {item.fact}
            </p>
            {item.created_at ? (
              <p className="mt-1 text-xs text-donna-muted">
                {formatFactDate(item.created_at)}
              </p>
            ) : null}

            {evidence.length > 0 || !isSuggestionItem(item) ? (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-donna-muted underline-offset-2 hover:underline"
                onClick={() =>
                  setExpandedEvidence((cur) =>
                    cur === item.id ? null : item.id,
                  )
                }
              >
                {expandedEvidence === item.id ? "Hide source" : "Show source"}
              </button>
            ) : null}
            {expandedEvidence === item.id ? (
              <ul className="mt-2 space-y-1.5 rounded-lg bg-donna-surface/70 p-2.5 text-xs text-donna-muted">
                {evidence.length === 0 ? (
                  <li>No linked evidence yet.</li>
                ) : (
                  evidence.map((ev, i) => (
                    <li key={ev.id ?? i}>
                      <span className="font-medium text-donna-text">
                        {ev.source_kind}
                      </span>
                      {ev.source_id && ev.source_kind === "note" ? (
                        <>
                          {" · "}
                          <Link
                            to={`/app/notes/${ev.source_id}`}
                            className="text-donna-text underline"
                          >
                            Open note
                          </Link>
                        </>
                      ) : null}
                      {ev.excerpt ? (
                        <p className="mt-0.5 text-donna-text/80">{ev.excerpt}</p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {(tab === "pending" ||
                tab === "sensitive" ||
                tab === "conflicting" ||
                item.review_status === "pending_review") && (
                <>
                  <Button
                    className="!w-auto !px-3 !py-1.5 !text-xs"
                    disabled={busy}
                    onClick={() => void handleAccept(item)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    className="!w-auto !px-3 !py-1.5 !text-xs"
                    disabled={busy}
                    onClick={() => void handleReject(item)}
                  >
                    Reject
                  </Button>
                </>
              )}
              {item.conflicting || tab === "conflicting" ? (
                <>
                  <Button
                    variant="secondary"
                    className="!w-auto !px-3 !py-1.5 !text-xs"
                    disabled={busy}
                    onClick={() => void handleResolve(item, "accept_new")}
                  >
                    Use new
                  </Button>
                  <Button
                    variant="secondary"
                    className="!w-auto !px-3 !py-1.5 !text-xs"
                    disabled={busy}
                    onClick={() => void handleResolve(item, "keep_existing")}
                  >
                    Keep existing
                  </Button>
                </>
              ) : null}
              <Button
                variant="ghost"
                className="!w-auto !px-3 !py-1.5 !text-xs"
                disabled={busy}
                onClick={() => {
                  setEditingId(item.id);
                  setEditText(item.fact);
                }}
              >
                Edit
              </Button>
              {!isSuggestionItem(item) ? (
                <Button
                  variant="ghost"
                  className="!w-auto !px-3 !py-1.5 !text-xs"
                  disabled={busy}
                  onClick={() => void handleOutdated(item)}
                >
                  Outdated
                </Button>
              ) : null}
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-1 text-sm text-donna-destructive"
                disabled={busy}
                onClick={() => void handleDelete(item)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-donna-border px-6 py-5 md:px-8">
        <div>
          <h1 className="text-xl font-semibold text-donna-text">Memory</h1>
          <p className="mt-0.5 text-sm text-donna-muted">
            What Donna knows about you — review, edit, and trace sources
          </p>
        </div>
        <IconButton
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          aria-label="Add memory"
          className="!h-9 !w-9"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </IconButton>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {error ? (
          <AlertBanner className="mx-5 mt-3">{error}</AlertBanner>
        ) : null}

        <div className="flex gap-1 overflow-x-auto border-b border-donna-border px-5 py-2 md:px-8">
          {INBOX_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                tab === t.id
                  ? "bg-donna-surface text-donna-text"
                  : "text-donna-muted hover:text-donna-text",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {adding ? (
          <section className="border-b border-donna-border bg-donna-surface/50 px-5 py-4 md:px-8">
            <h2 className="mb-2 text-sm font-semibold text-donna-text">
              New memory
            </h2>
            <TextArea
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              placeholder="Something Donna should remember…"
              className="min-h-20"
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <Button
                className="!w-auto"
                onClick={() => void handleAdd()}
                disabled={busyId === "new" || !newFactText.trim()}
              >
                {busyId === "new" ? "Adding…" : "Add"}
              </Button>
              <Button
                variant="secondary"
                className="!w-auto"
                onClick={() => {
                  setAdding(false);
                  setNewFactText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </section>
        ) : null}

        <form
          className="flex shrink-0 gap-2 border-b border-donna-border px-5 py-4 md:px-8"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <TextInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memory…"
            className="flex-1"
          />
          <Button
            type="submit"
            className="!w-auto shrink-0 px-4 py-2.5 text-[0.9375rem]"
            disabled={loading}
          >
            {loading ? "…" : "Search"}
          </Button>
        </form>

        <div className="flex flex-col gap-6 px-5 py-4 md:px-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : null}

          {!loading && tab === "grouped" && visibleGroups.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No memories yet"
              description="Donna will learn from notes and chats, or you can add memories manually."
            />
          ) : null}

          {!loading && tab !== "grouped" && inbox.length === 0 ? (
            <EmptyState
              icon={Brain}
              title={`No ${tab} memories`}
              description="You're caught up in this inbox."
            />
          ) : null}

          {tab === "grouped"
            ? visibleGroups.map((group) => (
                <section key={group.kind}>
                  <h2 className="mb-3 text-sm font-semibold text-donna-text">
                    {group.label}
                    <span className="ml-2 font-normal text-donna-muted">
                      {group.items.length}
                    </span>
                  </h2>
                  <ul className="flex flex-col gap-3">
                    {group.items.map((item) => renderItem(item))}
                  </ul>
                </section>
              ))
            : (
              <ul className="flex flex-col gap-3">
                {inbox.map((item) => renderItem(item))}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
}
