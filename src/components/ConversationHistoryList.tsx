import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Search,
  Share2,
  Tag,
  Trash2,
} from "lucide-react";
import {
  deleteConversation,
  formatConversationDate,
  listConversationTags,
  listConversations,
  patchConversation,
  type ConversationSummary,
} from "../services/conversationsApi";
import { EmptyState } from "./ui/EmptyState";
import { Spinner } from "./ui/Spinner";
import { AlertBanner } from "./ui/AlertBanner";
import { TextInput } from "./ui/TextInput";
import { cn } from "../lib/cn";
import { ShareConversationSheet } from "./ShareConversationSheet";

export type ConversationHistoryListProps = {
  /** When false, skip fetching (e.g. closed sheet). Defaults to true. */
  active?: boolean;
  selectedId?: string | null;
  compact?: boolean;
  className?: string;
  onSelect: (conversation: ConversationSummary) => void | Promise<void>;
  /** Optional refresh signal from parent (increment to reload). */
  refreshKey?: number;
};

type FilterMode = "active" | "archived";

export function ConversationHistoryList({
  active = true,
  selectedId = null,
  compact = false,
  className,
  onSelect,
  refreshKey = 0,
}: ConversationHistoryListProps) {
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<ConversationSummary | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, tags] = await Promise.all([
        listConversations({
          q: debouncedQuery || undefined,
          tag: tagFilter || undefined,
          archivedOnly: filterMode === "archived",
          includeArchived: filterMode === "archived",
          limit: 50,
        }),
        listConversationTags().catch(() => [] as string[]),
      ]);
      setConversations(items);
      setAvailableTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filterMode, tagFilter]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load, refreshKey]);

  useEffect(() => {
    if (!menuId) return;
    function onDocClick() {
      setMenuId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuId]);

  const emptyTitle = useMemo(() => {
    if (debouncedQuery) return "No matching chats";
    if (filterMode === "archived") return "No archived chats";
    if (tagFilter) return "No chats with this tag";
    return "No conversations yet";
  }, [debouncedQuery, filterMode, tagFilter]);

  async function runAction(
    id: string,
    action: () => Promise<unknown>,
    opts?: { confirm?: string },
  ) {
    if (opts?.confirm && !window.confirm(opts.confirm)) return;
    setBusyId(id);
    setError(null);
    setMenuId(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRename(conversation: ConversationSummary) {
    const next = window.prompt("Rename conversation", conversation.title);
    if (next === null) return;
    const title = next.trim();
    if (!title || title === conversation.title) return;
    await runAction(conversation.id, () =>
      patchConversation(conversation.id, { title }),
    );
  }

  async function handleSetTags(conversation: ConversationSummary) {
    const current = (conversation.tags ?? []).join(", ");
    const next = window.prompt(
      "Tags (comma-separated)",
      current,
    );
    if (next === null) return;
    const tags = next
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);
    await runAction(conversation.id, () =>
      patchConversation(conversation.id, { tags }),
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className={cn("shrink-0 space-y-3", compact ? "px-3 pb-2" : "mb-4")}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-donna-muted"
            strokeWidth={1.75}
          />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            aria-label="Search conversations"
            className="!py-2 pl-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("active")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterMode === "active"
                ? "bg-donna-primary-light text-donna-primary"
                : "text-donna-muted hover:bg-donna-surface hover:text-donna-text",
            )}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("archived")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterMode === "archived"
                ? "bg-donna-primary-light text-donna-primary"
                : "text-donna-muted hover:bg-donna-surface hover:text-donna-text",
            )}
          >
            Archived
          </button>
          {availableTags.length > 0 ? (
            <div className="flex max-w-full flex-wrap gap-1">
              {availableTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setTagFilter((prev) => (prev === tag ? null : tag))
                  }
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                    tagFilter === tag
                      ? "bg-donna-primary text-white"
                      : "bg-donna-surface text-donna-muted hover:text-donna-text",
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <AlertBanner
          className={cn(compact ? "mx-3 mb-2" : "mb-4")}
          onDismiss={() => setError(null)}
        >
          {error}
        </AlertBanner>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <Spinner />
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={Search}
          title={emptyTitle}
          description={
            debouncedQuery
              ? "Try a different keyword or clear filters."
              : "Your past chats will appear here once you start talking with Donna."
          }
          className="py-6"
        />
      ) : (
        <ul
          className={cn(
            "min-h-0 flex-1 space-y-1.5 overflow-y-auto",
            compact ? "px-2 pb-3" : "max-h-[min(60vh,28rem)]",
          )}
        >
          {conversations.map((conversation) => {
            const Icon = conversation.channel === "voice" ? Mic : MessageSquare;
            const busy = busyId === conversation.id;
            const selected = selectedId === conversation.id;
            const pinned = Boolean(conversation.pinned_at);

            return (
              <li key={conversation.id} className="relative">
                <div
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    selected
                      ? "border-donna-primary/40 bg-donna-primary-light/60"
                      : "border-donna-border hover:border-donna-primary/30 hover:bg-donna-surface",
                    busy && "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    disabled={busy || busyId !== null}
                    onClick={() => void onSelect(conversation)}
                    className={cn(
                      "flex min-w-0 flex-1 items-start gap-2.5 text-left",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring rounded-lg",
                      "disabled:cursor-not-allowed",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        conversation.channel === "voice"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-donna-primary-light text-donna-primary",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-medium text-donna-text">
                        {pinned ? (
                          <Pin
                            className="h-3 w-3 shrink-0 text-donna-primary"
                            strokeWidth={2}
                          />
                        ) : null}
                        <span className="truncate">{conversation.title}</span>
                      </p>
                      {conversation.preview ? (
                        <p className="mt-0.5 truncate text-xs text-donna-muted">
                          {conversation.preview}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-donna-muted">
                        {formatConversationDate(conversation.updated_at)}
                        {conversation.tags && conversation.tags.length > 0
                          ? ` · ${conversation.tags.map((t) => `#${t}`).join(" ")}`
                          : ""}
                      </p>
                    </div>
                  </button>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label="Conversation actions"
                      disabled={busy || busyId !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId((prev) =>
                          prev === conversation.id ? null : conversation.id,
                        );
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-donna-muted",
                        "hover:bg-donna-surface hover:text-donna-text",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
                        "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                        menuId === conversation.id && "opacity-100",
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {menuId === conversation.id ? (
                      <div
                        role="menu"
                        className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-donna-border bg-white shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MenuItem
                          icon={Pencil}
                          label="Rename"
                          onClick={() => void handleRename(conversation)}
                        />
                        <MenuItem
                          icon={pinned ? PinOff : Pin}
                          label={pinned ? "Unpin" : "Pin"}
                          onClick={() =>
                            void runAction(conversation.id, () =>
                              patchConversation(conversation.id, {
                                pinned: !pinned,
                              }),
                            )
                          }
                        />
                        <MenuItem
                          icon={Archive}
                          label={
                            conversation.archived_at ? "Unarchive" : "Archive"
                          }
                          onClick={() =>
                            void runAction(conversation.id, () =>
                              patchConversation(conversation.id, {
                                archived: !conversation.archived_at,
                              }),
                            )
                          }
                        />
                        <MenuItem
                          icon={Tag}
                          label="Tags…"
                          onClick={() => void handleSetTags(conversation)}
                        />
                        <MenuItem
                          icon={Share2}
                          label="Share…"
                          onClick={() => {
                            setMenuId(null);
                            setShareTarget(conversation);
                          }}
                        />
                        <MenuItem
                          icon={Trash2}
                          label="Delete"
                          destructive
                          onClick={() =>
                            void runAction(
                              conversation.id,
                              () => deleteConversation(conversation.id),
                              {
                                confirm:
                                  "Delete this conversation permanently? This cannot be undone.",
                              },
                            )
                          }
                        />
                      </div>
                    ) : null}
                  </div>

                  {busy ? <Spinner className="mt-2 h-4 w-4" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ShareConversationSheet
        open={Boolean(shareTarget)}
        conversationId={shareTarget?.id ?? null}
        conversationTitle={shareTarget?.title}
        onClose={() => setShareTarget(null)}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-donna-text hover:bg-donna-surface",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {label}
    </button>
  );
}
