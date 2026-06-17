import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import {
  deleteNote,
  formatNoteDate,
  fromDatetimeLocalValue,
  getNote,
  toDatetimeLocalValue,
  updateNote,
  type Note,
} from "../services/notesApi";
import "./NotesPages.css";

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
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
        setNote(loaded);
        setContent(loaded.content);
        setNoteDate(toDatetimeLocalValue(loaded.note_date));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Note not found");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!note || !id) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateNote(id, {
        content,
        note_date: noteDate ? fromDatetimeLocalValue(noteDate) : undefined,
      });
      setNote(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (field: "is_urgent" | "is_important") => {
    if (!note || !id) {
      return;
    }
    const next = !note[field];
    try {
      const updated = await updateNote(id, { [field]: next });
      setNote(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("Delete this note?")) {
      return;
    }
    try {
      await deleteNote(id);
      navigate("/app/notes");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="notes-page note-detail-page">
        <AppNav />
        <div className="notes-content">
          <p className="notes-empty">Loading…</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="notes-page note-detail-page">
        <AppNav />
        <div className="notes-content">
          <p className="notes-empty">{error ?? "Note not found"}</p>
          <Link to="/app/notes">← Back to notes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-page note-detail-page">
      <AppNav />
      <div className="notes-content">
        <Link to="/app/notes" style={{ fontSize: "0.875rem", color: "var(--donna-text-secondary)" }}>
          ← Back
        </Link>

        <div className="note-detail-toolbar">
          <button
            type="button"
            className={`note-flag-button ${note.is_urgent ? "active-urgent" : ""}`}
            onClick={() => void toggleFlag("is_urgent")}
          >
            {note.is_urgent ? "🔥 Urgent" : "Mark urgent"}
          </button>
          <button
            type="button"
            className={`note-flag-button ${note.is_important ? "active-important" : ""}`}
            onClick={() => void toggleFlag("is_important")}
          >
            {note.is_important ? "⭐ Important" : "Mark important"}
          </button>
          <label className="note-date-field">
            Date
            <input
              type="datetime-local"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
            />
          </label>
        </div>

        <textarea
          className="note-editor"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Note content…"
        />

        {error ? <p role="alert" style={{ color: "var(--donna-destructive)" }}>{error}</p> : null}

        <div className="note-detail-actions">
          <button
            type="button"
            className="note-danger-button"
            onClick={() => void handleDelete()}
          >
            Delete
          </button>
          <button
            type="button"
            className="notes-primary-button"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--donna-text-muted)" }}>
          Created {formatNoteDate(note.created_at)}
          {note.source_type !== "manual" ? ` · from ${note.source_type.replace("_", " ")}` : ""}
        </p>
      </div>
    </div>
  );
}
