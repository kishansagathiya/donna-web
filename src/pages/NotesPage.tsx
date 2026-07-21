import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileUp, Flame, Link2, Pin, Search, Send, StickyNote, Star } from "lucide-react";
import {
  formatNoteDate,
  newNoteId,
  type NoteSummary,
} from "../services/notesApi";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { AlertBanner } from "../components/ui/AlertBanner";
import { IngestToast } from "../components/IngestToast";
import { useAssetIngest } from "../hooks/useAssetIngest";
import {
  useCreateNoteMutation,
  useFailedNoteMutations,
  useNotesFeed,
  useNotesTags,
  useRetryFailedNoteMutation,
  useUpdateNoteMutation,
} from "../hooks/useNotes";
import { cn } from "../lib/cn";
import {
  enrichmentLabel,
  noteTagList,
  sourceLabel,
} from "../lib/noteDisplay";

function NoteComposeBar({
  onSave,
  saving,
  onAddLink,
  onSaveToMemory,
  ingestBusy,
  linkOpen,
  linkValue,
  onLinkValueChange,
  onSubmitLink,
  onCancelLink,
}: {
  onSave: (text: string) => Promise<void>;
  saving: boolean;
  onAddLink: () => void;
  onSaveToMemory: () => void;
  ingestBusy: boolean;
  linkOpen: boolean;
  linkValue: string;
  onLinkValueChange: (value: string) => void;
  onSubmitLink: () => void;
  onCancelLink: () => void;
}) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = draft.trim().length > 0;

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  useEffect(() => {
    resize();
  }, [draft]);

  async function submit() {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;
    await onSave(trimmed);
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="shrink-0 border-b border-donna-border px-5 py-3 md:px-8">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Jot down a note…"
          disabled={saving || ingestBusy}
          rows={1}
          className={cn(
            "min-h-[44px] flex-1 resize-none rounded-donna border border-donna-border bg-white px-3 py-2.5",
            "text-base leading-relaxed text-donna-text placeholder:text-donna-muted",
            "focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />
        <button
          type="submit"
          disabled={!hasText || saving || ingestBusy}
          aria-label="Save note"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
            hasText && !saving && !ingestBusy
              ? "bg-donna-primary text-white hover:bg-donna-primary-hover"
              : "bg-donna-surface text-donna-muted",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {saving ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      {linkOpen ? (
        <div className="mt-3 flex gap-2">
          <input
            value={linkValue}
            onChange={(e) => onLinkValueChange(e.target.value)}
            placeholder="https://…"
            disabled={ingestBusy}
            autoFocus
            className={cn(
              "min-w-0 flex-1 rounded-donna border border-donna-border bg-white px-3 py-2.5",
              "text-sm text-donna-text placeholder:text-donna-muted",
              "focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            aria-label="URL to save"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmitLink();
              }
              if (e.key === "Escape") {
                onCancelLink();
              }
            }}
          />
          <button
            type="button"
            onClick={onSubmitLink}
            disabled={ingestBusy || !linkValue.trim()}
            className={cn(
              "rounded-donna bg-donna-primary px-3 py-2 text-sm font-medium text-white",
              "hover:bg-donna-primary-hover disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancelLink}
            disabled={ingestBusy}
            className="rounded-donna px-2 text-sm text-donna-muted hover:text-donna-text"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAddLink}
            disabled={ingestBusy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-donna-border bg-donna-surface px-3 py-1.5",
              "text-xs font-medium text-donna-muted transition-colors",
              "hover:border-donna-primary/30 hover:text-donna-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Add link
          </button>
          <button
            type="button"
            onClick={onSaveToMemory}
            disabled={ingestBusy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-donna-border bg-donna-surface px-3 py-1.5",
              "text-xs font-medium text-donna-muted transition-colors",
              "hover:border-donna-primary/30 hover:text-donna-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <FileUp className="h-3.5 w-3.5" strokeWidth={1.75} />
            Save to memory
          </button>
        </div>
      )}
    </div>
  );
}

export function NotesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, busy: ingestBusy, addLink, addFile, showToast } = useAssetIngest();
  const memoryInputRef = useRef<HTMLInputElement>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 200);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const feedQuery = useNotesFeed({ tag: activeTag, q: debouncedSearch });
  const tagsQuery = useNotesTags();
  const createMutation = useCreateNoteMutation();
  const updateMutation = useUpdateNoteMutation();
  const failedMutations = useFailedNoteMutations();
  const retryFailed = useRetryFailedNoteMutation();

  const notes = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data],
  );
  const tags = useMemo(() => {
    const fromFacets = feedQuery.data?.pages[0]?.facets;
    const base = fromFacets?.length
      ? fromFacets
      : (tagsQuery.data ?? []).map((t) => ({
          tag: t.tag,
          count: t.count,
          pinned: false,
        }));
    return [...base].sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return b.count - a.count;
    });
  }, [feedQuery.data, tagsQuery.data]);

  const visibleTags = pinnedOnly ? tags.filter((t) => t.pinned) : tags;

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          feedQuery.hasNextPage &&
          !feedQuery.isFetchingNextPage
        ) {
          void feedQuery.fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [feedQuery.hasNextPage, feedQuery.isFetchingNextPage, feedQuery.fetchNextPage]);

  const failedByNoteId = useMemo(() => {
    const map = new Map<string, (typeof failedMutations)[number]>();
    for (const failure of failedMutations) {
      map.set(failure.noteId, failure);
    }
    return map;
  }, [failedMutations]);

  const showInitialSpinner =
    feedQuery.isLoading && !feedQuery.isPlaceholderData && notes.length === 0;

  useEffect(() => {
    const state = location.state as {
      ingestToast?: { message: string; isError: boolean };
    } | null;
    if (state?.ingestToast) {
      showToast(state.ingestToast.message, state.ingestToast.isError);
      navigate(location.pathname, { replace: true, state: null });
      void feedQuery.refetch();
      void tagsQuery.refetch();
    }
  }, [location, navigate, showToast, feedQuery, tagsQuery]);

  const handleCreateNote = async (text: string) => {
    setActionError(null);
    try {
      await createMutation.mutateAsync({ content: text, id: newNoteId() });
      if (activeTag) {
        setActiveTag(null);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to save note");
    }
  };

  const handleSubmitLink = async () => {
    const trimmed = linkValue.trim();
    if (!trimmed || ingestBusy) return;
    const result = await addLink(trimmed);
    if (result.ok) {
      setLinkValue("");
      setLinkOpen(false);
      setActiveTag(null);
      void feedQuery.refetch();
      void tagsQuery.refetch();
    }
  };

  const handleSaveFile = async (file: File) => {
    const result = await addFile(file);
    if (result.ok) {
      setActiveTag(null);
      void feedQuery.refetch();
      void tagsQuery.refetch();
    }
  };

  const toggleFlag = async (
    note: NoteSummary,
    field: "is_urgent" | "is_important",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        id: note.id,
        patch: { [field]: !note[field] },
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update note");
    }
  };

  const error =
    actionError ??
    (feedQuery.error instanceof Error ? feedQuery.error.message : null);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-white">
      {ingestBusy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <Spinner />
        </div>
      ) : null}

      <header className="shrink-0 border-b border-donna-border px-6 py-4 md:px-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-donna-text">Notes</h1>
          <button
            type="button"
            onClick={() => setPinnedOnly((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              pinnedOnly
                ? "border-donna-primary/40 bg-donna-primary/10 text-donna-primary"
                : "border-donna-border bg-donna-surface text-donna-muted hover:text-donna-text",
            )}
            aria-pressed={pinnedOnly}
          >
            <Pin className="h-3.5 w-3.5" strokeWidth={1.75} />
            Pinned tags
          </button>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-donna-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search notes…"
            className={cn(
              "w-full rounded-donna border border-donna-border bg-white py-2.5 pl-9 pr-3",
              "text-sm text-donna-text placeholder:text-donna-muted",
              "focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30",
            )}
            aria-label="Search notes"
          />
        </label>
      </header>

      <NoteComposeBar
        onSave={handleCreateNote}
        saving={createMutation.isPending}
        ingestBusy={ingestBusy}
        linkOpen={linkOpen}
        linkValue={linkValue}
        onLinkValueChange={setLinkValue}
        onAddLink={() => setLinkOpen(true)}
        onSaveToMemory={() => memoryInputRef.current?.click()}
        onSubmitLink={() => void handleSubmitLink()}
        onCancelLink={() => {
          setLinkOpen(false);
          setLinkValue("");
        }}
      />

      <input
        ref={memoryInputRef}
        type="file"
        hidden
        accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json,.html,audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleSaveFile(file);
        }}
      />

      {visibleTags.length > 0 || pinnedOnly ? (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-donna-border px-5 py-3 md:px-8">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              activeTag === null
                ? "bg-donna-primary text-white"
                : "bg-donna-surface text-donna-muted hover:text-donna-text",
            )}
          >
            All
          </button>
          {visibleTags.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => setActiveTag(t.tag)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                activeTag === t.tag
                  ? "bg-donna-primary text-white"
                  : "bg-donna-surface text-donna-muted hover:text-donna-text",
              )}
            >
              {t.pinned ? <Pin className="h-3 w-3" strokeWidth={2} /> : null}
              #{t.tag}
              <span className="opacity-60">{t.count}</span>
            </button>
          ))}
          {pinnedOnly && visibleTags.length === 0 ? (
            <span className="text-xs text-donna-muted">No pinned tags yet.</span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col overflow-y-auto">
        {error ? (
          <AlertBanner className="mx-5 mt-3">{error}</AlertBanner>
        ) : null}

        {failedMutations.length > 0 ? (
          <div className="mx-5 mt-3 rounded-donna border border-donna-destructive/30 bg-donna-destructive/5 px-3 py-2 text-sm text-donna-text">
            <p className="font-medium text-donna-destructive">
              {failedMutations.length} sync{" "}
              {failedMutations.length === 1 ? "change" : "changes"} failed
            </p>
            <ul className="mt-1 space-y-1">
              {failedMutations.slice(0, 3).map((failure) => (
                <li
                  key={failure.id}
                  className="flex items-center justify-between gap-2 text-donna-muted"
                >
                  <span className="truncate">{failure.message}</span>
                  <button
                    type="button"
                    className="shrink-0 text-donna-primary hover:underline"
                    onClick={() => {
                      void retryFailed(failure).catch((err: unknown) => {
                        setActionError(
                          err instanceof Error ? err.message : "Retry failed",
                        );
                      });
                    }}
                  >
                    Retry
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showInitialSpinner ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Spinner />
          </div>
        ) : null}

        {!showInitialSpinner && notes.length === 0 && !error ? (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Jot a note above, or save links and documents for Donna to turn into notes."
          />
        ) : null}

        <ul className="flex flex-col gap-3 px-5 py-3 pb-6">
          {notes.map((note) => {
            const failure = failedByNoteId.get(note.id);
            const source = sourceLabel(note.source_type);
            const enrichment = enrichmentLabel(note.enrichment_status);
            const tagsForNote = noteTagList(note);
            return (
              <li key={note.id}>
                <Card onClick={() => navigate(`/app/notes/${note.id}`)}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-semibold text-donna-text">
                      {note.title}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={note.is_urgent ? "Mark not urgent" : "Mark urgent"}
                        className={cn(
                          "rounded-full p-1 transition-colors",
                          note.is_urgent
                            ? "text-donna-destructive"
                            : "text-donna-muted hover:text-donna-destructive",
                        )}
                        onClick={(e) => void toggleFlag(note, "is_urgent", e)}
                      >
                        <Flame className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={
                          note.is_important ? "Mark not important" : "Mark important"
                        }
                        className={cn(
                          "rounded-full p-1 transition-colors",
                          note.is_important
                            ? "fill-donna-primary text-donna-primary"
                            : "text-donna-muted hover:text-donna-primary",
                        )}
                        onClick={(e) => void toggleFlag(note, "is_important", e)}
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            note.is_important && "fill-current",
                          )}
                        />
                      </button>
                    </span>
                  </div>
                  {note.preview ? (
                    <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-donna-muted">
                      {note.preview}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-donna-muted">
                    <span>{formatNoteDate(note.note_date)}</span>
                    {source ? (
                      <span className="rounded-full bg-donna-surface px-2 py-0.5 capitalize">
                        {source}
                      </span>
                    ) : null}
                    {enrichment ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5",
                          enrichment.tone === "error" &&
                            "bg-donna-destructive/10 text-donna-destructive",
                          enrichment.tone === "warn" &&
                            "bg-donna-gold/15 text-donna-gold",
                          enrichment.tone === "muted" && "bg-donna-surface",
                        )}
                      >
                        {enrichment.label}
                      </span>
                    ) : null}
                    {failure ? (
                      <button
                        type="button"
                        className="text-donna-destructive hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          void retryFailed(failure).catch((err: unknown) => {
                            setActionError(
                              err instanceof Error ? err.message : "Retry failed",
                            );
                          });
                        }}
                      >
                        Sync failed · Retry
                      </button>
                    ) : null}
                  </div>
                  {tagsForNote.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tagsForNote.slice(0, 6).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-donna-surface px-2 py-0.5 text-[0.6875rem] text-donna-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>

        <div ref={loadMoreRef} className="flex justify-center px-5 pb-6">
          {feedQuery.isFetchingNextPage ? (
            <Spinner className="h-5 w-5" />
          ) : null}
        </div>
      </div>

      <IngestToast toast={toast} />
    </div>
  );
}
