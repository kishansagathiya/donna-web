import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import {
  createNote,
  formatNoteDate,
  listRecentNotes,
  type NoteSummary,
} from "../services/notesApi";
import "./NotesPages.css";

export function NotesListPage() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listRecentNotes()
      .then(setNotes)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load notes");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const note = await createNote(newNote.trim());
      setNotes((prev) => [
        {
          id: note.id,
          title: note.title,
          preview: note.preview,
          note_date: note.note_date,
          is_important: note.is_important,
          is_urgent: note.is_urgent,
          source_type: note.source_type,
        },
        ...prev,
      ]);
      setNewNote("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notes-page">
      <AppNav />
      <div className="notes-content">
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          Notes
        </h1>

        <form className="notes-form" onSubmit={(e) => void handleAdd(e)}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note…"
          />
          <button
            type="submit"
            className="notes-primary-button"
            disabled={saving || !newNote.trim()}
          >
            {saving ? "Saving…" : "Add note"}
          </button>
        </form>

        {error ? (
          <p className="chat-error-banner" role="alert" style={{ marginTop: "1rem" }}>
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="notes-empty">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="notes-empty">No notes yet. Voice, documents, and links are saved here automatically.</p>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <Link key={note.id} to={`/app/notes/${note.id}`} className="note-card">
                <div className="note-card-header">
                  <span className="note-card-title">{note.title}</span>
                  <span className="note-card-flags">
                    {note.is_urgent ? <span aria-label="Urgent">🔥</span> : null}
                    {note.is_important ? <span aria-label="Important">⭐</span> : null}
                  </span>
                </div>
                {note.preview ? (
                  <p className="note-card-preview">{note.preview}</p>
                ) : null}
                <p className="note-card-date">{formatNoteDate(note.note_date)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
