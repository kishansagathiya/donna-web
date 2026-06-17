import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Flame, Star } from "lucide-react";
import {
  deleteNote,
  formatNoteDate,
  fromDatetimeLocalValue,
  getNote,
  toDatetimeLocalValue,
  updateNote,
  type Note,
} from "../services/notesApi";
import { AppPageHeader, HeaderTextButton } from "../components/ui/AppPageHeader";
import { Button } from "../components/ui/Button";
import { TextArea } from "../components/ui/TextArea";
import { Spinner } from "../components/ui/Spinner";
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
      <div className="flex h-dvh w-full flex-col bg-white">
        <AppPageHeader
          title="Context"
          action={
            <HeaderTextButton onClick={() => navigate("/app/search")}>
              <span className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                Back
              </span>
            </HeaderTextButton>
          }
        />
        <div className="flex flex-1 flex-col gap-3 px-5 py-5">
          <div className="h-8 w-48 animate-pulse rounded-donna bg-donna-surface" />
          <div className="flex-1 animate-pulse rounded-donna bg-donna-surface" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-dvh w-full flex-col bg-white">
        <AppPageHeader
          title="Context"
          action={
            <HeaderTextButton onClick={() => navigate("/app/search")}>
              <span className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                Back
              </span>
            </HeaderTextButton>
          }
        />
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <p className="text-donna-muted">{error ?? "Context not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-white">
      <AppPageHeader
        title="Context"
        action={
          <HeaderTextButton onClick={() => navigate("/app/search")}>
            <span className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back
            </span>
          </HeaderTextButton>
        }
      />

      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
          <label className="flex flex-col gap-1 text-[0.8125rem] text-donna-muted">
            Date
            <input
              type="datetime-local"
              className="rounded-donna border border-donna-border px-2 py-2 text-sm text-donna-text focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30"
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
          {item.source_type !== "manual"
            ? ` · from ${item.source_type.replace("_", " ")}`
            : ""}
        </p>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-donna-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          className="!w-auto border border-donna-destructive/30 text-donna-destructive"
          onClick={() => void handleDelete()}
        >
          Delete
        </Button>
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
