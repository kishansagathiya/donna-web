import { useState } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import {
  formatNoteDate,
  searchNotes,
  type NoteSummary,
} from "../services/notesApi";
import "./NotesPages.css";

export function SearchNotesPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      return;
    }
    setSearching(true);
    setSearched(true);
    setError(null);
    try {
      const notes = await searchNotes(query);
      setResults(notes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="notes-page">
      <AppNav />
      <div className="notes-content">
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          Search
        </h1>

        <form className="search-form" onSubmit={(e) => void handleSearch(e)}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
          />
          <button
            type="submit"
            className="notes-primary-button"
            disabled={searching || !query.trim()}
          >
            {searching ? "…" : "Search"}
          </button>
        </form>

        {error ? <p role="alert" style={{ color: "var(--donna-destructive)" }}>{error}</p> : null}

        {searched && results.length === 0 && !error ? (
          <p className="search-empty">No matches found</p>
        ) : null}

        <div className="notes-list">
          {results.map((note) => (
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
      </div>
    </div>
  );
}
