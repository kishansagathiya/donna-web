import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteNote,
  formatNoteDate,
  fromDatetimeLocalValue,
  getNote,
  toDatetimeLocalValue,
  updateNote,
  type Note,
} from "../services/notesApi";
import "./ContextPages.css";

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
      <div className="context-page context-detail-page">
        <div className="context-content">
          <p className="context-empty">Loading…</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="context-page context-detail-page">
        <div className="context-content">
          <p className="context-empty">{error ?? "Context not found"}</p>
          <Link to="/app">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="context-page context-detail-page">
      <div className="context-content">
        <Link
          to="/app"
          style={{ fontSize: "0.875rem", color: "var(--donna-text-secondary)" }}
        >
          ← Back
        </Link>

        <div className="context-detail-toolbar">
          <button
            type="button"
            className={`context-flag-button ${item.is_urgent ? "active-urgent" : ""}`}
            onClick={() => void toggleFlag("is_urgent")}
          >
            {item.is_urgent ? "🔥 Urgent" : "Mark urgent"}
          </button>
          <button
            type="button"
            className={`context-flag-button ${item.is_important ? "active-important" : ""}`}
            onClick={() => void toggleFlag("is_important")}
          >
            {item.is_important ? "⭐ Important" : "Mark important"}
          </button>
          <label className="context-date-field">
            Date
            <input
              type="datetime-local"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
            />
          </label>
        </div>

        <textarea
          className="context-editor"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Context…"
        />

        {error ? (
          <p className="context-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="context-detail-actions">
          <button
            type="button"
            className="context-danger-button"
            onClick={() => void handleDelete()}
          >
            Delete
          </button>
          <button
            type="button"
            className="context-primary-button"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--donna-text-muted)" }}>
          Created {formatNoteDate(item.created_at)}
          {item.source_type !== "manual"
            ? ` · from ${item.source_type.replace("_", " ")}`
            : ""}
        </p>
      </div>
    </div>
  );
}
