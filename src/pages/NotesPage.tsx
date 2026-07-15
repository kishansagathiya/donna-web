import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileUp, Flame, Link2, Search, Send, StickyNote, Star } from "lucide-react";
import {
  createNote,
  formatNoteDate,
  listNotesForTag,
  listRecentNotes,
  listTags,
  updateNote,
  type NoteSummary,
  type TagCount,
} from "../services/notesApi";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { AlertBanner } from "../components/ui/AlertBanner";
import { IconButton } from "../components/ui/IconButton";
import { IngestToast } from "../components/IngestToast";
import { useAssetIngest } from "../hooks/useAssetIngest";
import { cn } from "../lib/cn";

const PAGE_SIZE = 50;

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
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  const loadNotes = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const batch = await listRecentNotes(PAGE_SIZE, offset);
      setNotes((prev) => (append ? [...prev, ...batch] : batch));
      setHasMore(batch.length === PAGE_SIZE);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
      if (!append) {
        setNotes([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadTagged = useCallback(async (tag: string) => {
    setLoading(true);
    setError(null);
    try {
      const batch = await listNotesForTag(tag, PAGE_SIZE);
      setNotes(batch);
      setHasMore(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tag");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    listTags(30)
      .then(setTags)
      .catch(() => setTags([]));
  }, []);

  useEffect(() => {
    void loadNotes();
    refresh();
  }, [loadNotes, refresh]);

  useEffect(() => {
    const state = location.state as {
      ingestToast?: { message: string; isError: boolean };
    } | null;
    if (state?.ingestToast) {
      showToast(state.ingestToast.message, state.ingestToast.isError);
      navigate(location.pathname, { replace: true, state: null });
      void loadNotes();
      refresh();
    }
  }, [location, navigate, showToast, loadNotes, refresh]);

  const selectTag = (tag: string | null) => {
    setActiveTag(tag);
    if (tag) {
      void loadTagged(tag);
    } else {
      void loadNotes();
    }
  };

  const handleCreateNote = async (text: string) => {
    setSaving(true);
    setError(null);
    try {
      const created = await createNote(text);
      if (activeTag) {
        setActiveTag(null);
        setHasMore(true);
      }
      setNotes((prev) => [created, ...prev.filter((note) => note.id !== created.id)]);
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
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
      setHasMore(true);
      void loadNotes();
      refresh();
    }
  };

  const handleSaveFile = async (file: File) => {
    const result = await addFile(file);
    if (result.ok) {
      setActiveTag(null);
      setHasMore(true);
      void loadNotes();
      refresh();
    }
  };

  const toggleFlag = async (
    note: NoteSummary,
    field: "is_urgent" | "is_important",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const next = !note[field];
    setNotes((prev) =>
      prev.map((item) =>
        item.id === note.id ? { ...item, [field]: next } : item,
      ),
    );
    try {
      await updateNote(note.id, { [field]: next });
    } catch (err: unknown) {
      setNotes((prev) =>
        prev.map((item) =>
          item.id === note.id ? { ...item, [field]: note[field] } : item,
        ),
      );
      setError(err instanceof Error ? err.message : "Failed to update note");
    }
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-white">
      {ingestBusy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <Spinner />
        </div>
      ) : null}

      <header className="flex shrink-0 items-center justify-between border-b border-donna-border px-6 py-5 md:px-8">
        <h1 className="text-xl font-semibold text-donna-text">Notes</h1>
        <IconButton
          onClick={() => navigate("/app/notes/search")}
          aria-label="Search notes"
          className="!h-9 !w-9 !border-transparent !bg-transparent !text-donna-muted hover:!bg-donna-surface"
        >
          <Search className="h-5 w-5" strokeWidth={1.75} />
        </IconButton>
      </header>

      <NoteComposeBar
        onSave={handleCreateNote}
        saving={saving}
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

      {tags.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-donna-border px-5 py-3 md:px-8">
          <button
            type="button"
            onClick={() => selectTag(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              activeTag === null
                ? "bg-donna-primary text-white"
                : "bg-donna-surface text-donna-muted hover:text-donna-text",
            )}
          >
            All
          </button>
          {tags.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => selectTag(t.tag)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                activeTag === t.tag
                  ? "bg-donna-primary text-white"
                  : "bg-donna-surface text-donna-muted hover:text-donna-text",
              )}
            >
              #{t.tag}
              <span className="ml-1 opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col overflow-y-auto">
        {error ? (
          <AlertBanner className="mx-5 mt-3">{error}</AlertBanner>
        ) : null}

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Spinner />
          </div>
        ) : null}

        {!loading && notes.length === 0 && !error ? (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Jot a note above, or save links and documents for Donna to turn into notes."
          />
        ) : null}

        <ul className="flex flex-col gap-3 px-5 py-3 pb-6">
          {notes.map((note) => (
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
                <p className="mt-2 text-xs text-donna-muted">
                  {formatNoteDate(note.note_date)}
                </p>
                {note.category || (note.keywords && note.keywords.length > 0) ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {note.category ? (
                      <span className="rounded-full bg-donna-surface px-2 py-0.5 text-[0.6875rem] font-medium capitalize text-donna-muted">
                        {note.category}
                      </span>
                    ) : null}
                    {(note.keywords ?? []).slice(0, 4).map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-donna-surface px-2 py-0.5 text-[0.6875rem] text-donna-muted"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>

        {!loading && hasMore && notes.length > 0 ? (
          <div className="flex justify-center px-5 pb-6">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadNotes(notes.length, true)}
              className={cn(
                "rounded-full border border-donna-border px-4 py-2 text-sm font-medium text-donna-muted",
                "transition-colors hover:border-donna-gold-ring hover:text-donna-text",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </div>

      <IngestToast toast={toast} />
    </div>
  );
}
