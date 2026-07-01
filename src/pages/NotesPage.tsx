import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, StickyNote, Star } from "lucide-react";
import {
  formatNoteDate,
  listRecentNotes,
  updateNote,
  type NoteSummary,
} from "../services/notesApi";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { AlertBanner } from "../components/ui/AlertBanner";
import { cn } from "../lib/cn";

const PAGE_SIZE = 50;

export function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

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
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-donna-border px-6 py-5 md:px-8">
        <h1 className="text-xl font-semibold text-donna-text">Notes</h1>
      </header>

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
            description="Switch to Notes mode in chat and jot something down, or tap a note to add one."
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
    </div>
  );
}
