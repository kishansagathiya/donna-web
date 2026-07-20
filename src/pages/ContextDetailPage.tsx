import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Flame, Star } from "lucide-react";
import {
  deleteNote,
  formatNoteDate,
  fromDatetimeLocalValue,
  getNote,
  toDatetimeLocalValue,
  updateNote,
  type Note,
} from "../services/notesApi";
import { AppPageHeader } from "../components/ui/AppPageHeader";
import { Button } from "../components/ui/Button";
import { TextArea } from "../components/ui/TextArea";
import { AlertBanner } from "../components/ui/AlertBanner";
import { cn } from "../lib/cn";

export function ContextDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    void getNote(id)
      .then((loaded) => {
        setItem(loaded);
        setContent(loaded.content);
        setNoteDate(toDatetimeLocalValue(loaded.note_date));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Context not found");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!item || !id) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateNote(id, {
        content,
        note_date: noteDate ? fromDatetimeLocalValue(noteDate) : undefined,
        content_version: item.content_version,
      });
      setItem(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (field: "is_urgent" | "is_important") => {
    if (!item || !id) {
      return;
    }
    const next = !item[field];
    try {
      const updated = await updateNote(id, { [field]: next });
      setItem(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("Delete this context item?")) {
      return;
    }
    try {
      await deleteNote(id);
      navigate("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-white">
        <AppPageHeader title="Context" onBack={() => navigate("/app/search")} />
        <div className="flex flex-1 flex-col gap-3 px-5 py-5">
          <div className="h-8 w-48 animate-pulse rounded-donna bg-donna-surface" />
          <div className="flex-1 animate-pulse rounded-donna bg-donna-surface" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-white">
        <AppPageHeader title="Context" onBack={() => navigate("/app/search")} />
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <p className="text-donna-muted">{error ?? "Context not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <AppPageHeader title="Context" onBack={() => navigate("/app/search")} />

      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {item.source_type === "integration" ? (
            <span className="inline-flex min-h-9 items-center rounded-full border border-donna-border bg-donna-surface px-3 py-1.5 text-[0.8125rem] font-medium text-donna-text">
              From Granola
            </span>
          ) : null}
          <button
            type="button"
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring",
              item.is_urgent
                ? "border-donna-destructive/30 bg-donna-destructive/10 text-donna-destructive"
                : "border-donna-border bg-donna-surface text-donna-text",
            )}
            onClick={() => void toggleFlag("is_urgent")}
          >
            <Flame className="h-3.5 w-3.5" />
            {item.is_urgent ? "Urgent" : "Mark urgent"}
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring",
              item.is_important
                ? "border-donna-gold-ring bg-donna-gold/12 text-donna-gold"
                : "border-donna-border bg-donna-surface text-donna-text",
            )}
            onClick={() => void toggleFlag("is_important")}
          >
            <Star className="h-3.5 w-3.5" />
            {item.is_important ? "Important" : "Mark important"}
          </button>
          <label className="flex min-w-0 basis-full flex-col gap-1 text-[0.8125rem] text-donna-muted sm:basis-auto">
            Date
            <input
              type="datetime-local"
              className="w-full max-w-full rounded-donna border border-donna-border px-3 py-2 text-sm text-donna-text focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30 sm:w-auto"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
            />
          </label>
        </div>

        <TextArea
          className="min-h-64 flex-1"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Context…"
        />

        {error ? (
          <AlertBanner className="mx-0 mt-3">{error}</AlertBanner>
        ) : null}

        <p className="mt-3 text-xs text-donna-muted">
          Created {formatNoteDate(item.created_at)}
          {item.source_type !== "manual" && item.source_type !== "integration"
            ? ` · from ${item.source_type.replace("_", " ")}`
            : ""}
        </p>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-donna-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-donna border border-donna-destructive/30 px-4 py-3.5 text-base font-semibold text-donna-destructive",
            "transition-colors duration-150 hover:bg-donna-destructive/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-gold-ring focus-visible:ring-offset-2",
          )}
          onClick={() => void handleDelete()}
        >
          Delete
        </button>
        <Button
          className="flex-1"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
