import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import {
  createNote,
  formatNoteDate,
  listRecentNotes,
  searchNotes,
  type NoteSummary,
} from "../services/notesApi";
import "./ContextPages.css";

function ContextCard({ item }: { item: NoteSummary }) {
  return (
    <Link to={`/app/context/${item.id}`} className="context-card">
      <div className="context-card-header">
        <span className="context-card-title">{item.title}</span>
        <span className="context-card-flags">
          {item.is_urgent ? <span aria-label="Urgent">🔥</span> : null}
          {item.is_important ? <span aria-label="Important">⭐</span> : null}
        </span>
      </div>
      {item.preview ? (
        <p className="context-card-preview">{item.preview}</p>
      ) : null}
      <p className="context-card-date">{formatNoteDate(item.note_date)}</p>
    </Link>
  );
}

export function ContextPage() {
  const [recent, setRecent] = useState<NoteSummary[]>([]);
  const [results, setResults] = useState<NoteSummary[]>([]);
  const [query, setQuery] = useState("");
  const [newContext, setNewContext] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listRecentNotes()
      .then(setRecent)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load context");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearched(false);
      setResults([]);
      return;
    }
    setSearching(true);
    setSearched(true);
    setError(null);
    try {
      setResults(await searchNotes(query));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContext.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createNote(newContext.trim());
      const summary: NoteSummary = {
        id: created.id,
        title: created.title,
        preview: created.preview,
        note_date: created.note_date,
        is_important: created.is_important,
        is_urgent: created.is_urgent,
        source_type: created.source_type,
      };
      setRecent((prev) => [summary, ...prev]);
      setNewContext("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save context");
    } finally {
      setSaving(false);
    }
  };

  const displayItems = searched ? results : recent;

  return (
    <div className="context-page">
      <AppNav />
      <div className="context-content">
        <h1 className="context-heading">Context</h1>
        <p className="context-subheading">
          Everything Donna captures — voice, documents, links — lives here as text.
        </p>

        <form className="context-form" onSubmit={(e) => void handleAdd(e)}>
          <textarea
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            placeholder="Add context…"
          />
          <button
            type="submit"
            className="context-primary-button"
            disabled={saving || !newContext.trim()}
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </form>

        <form className="search-form" onSubmit={(e) => void handleSearch(e)}>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setSearched(false);
                setResults([]);
              }
            }}
            placeholder="Search context…"
          />
          <button
            type="submit"
            className="context-primary-button"
            disabled={searching || !query.trim()}
          >
            {searching ? "…" : "Search"}
          </button>
        </form>

        {error ? (
          <p className="context-error" role="alert">
            {error}
          </p>
        ) : null}

        {searched && results.length === 0 && !error ? (
          <p className="context-empty">No matches found</p>
        ) : null}

        {!searched && loading ? (
          <p className="context-empty">Loading…</p>
        ) : !searched && recent.length === 0 ? (
          <p className="context-empty">
            No context yet. Talk to Donna, share links, or add text above.
          </p>
        ) : (
          <div className="context-list">
            {displayItems.map((item) => (
              <ContextCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
