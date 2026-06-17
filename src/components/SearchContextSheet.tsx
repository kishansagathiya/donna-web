import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createNote,
  formatNoteDate,
  listRecentNotes,
  searchNotes,
  type NoteSummary,
} from "../services/notesApi";
import "./SearchContextSheet.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

function ContextResult({
  item,
  onSelect,
}: {
  item: NoteSummary;
  onSelect: (id: string) => void;
}) {
  return (
    <button type="button" className="search-context-card" onClick={() => onSelect(item.id)}>
      <div className="search-context-card-header">
        <span className="search-context-card-title">{item.title}</span>
        <span className="search-context-card-flags">
          {item.is_urgent ? <span aria-label="Urgent">🔥</span> : null}
          {item.is_important ? <span aria-label="Important">⭐</span> : null}
        </span>
      </div>
      {item.preview ? (
        <p className="search-context-card-preview">{item.preview}</p>
      ) : null}
      <p className="search-context-card-date">{formatNoteDate(item.note_date)}</p>
    </button>
  );
}

export function SearchContextSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<NoteSummary[]>([]);
  const [results, setResults] = useState<NoteSummary[]>([]);
  const [query, setQuery] = useState("");
  const [newContext, setNewContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLoading(true);
    void listRecentNotes()
      .then(setRecent)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load context");
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setError(null);
    onClose();
  };

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

  const handleSelect = (id: string) => {
    handleClose();
    navigate(`/app/context/${id}`);
  };

  const displayItems = searched ? results : recent;

  return (
    <div className="search-sheet-backdrop" onClick={handleClose} role="presentation">
      <div
        className="search-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="search-context-title"
      >
        <div className="search-sheet-header">
          <h2 id="search-context-title" className="search-sheet-title">
            Search context
          </h2>
          <button type="button" className="search-sheet-close" onClick={handleClose}>
            Done
          </button>
        </div>

        <form className="search-sheet-form" onSubmit={(e) => void handleSearch(e)}>
          <span className="search-sheet-magnifier" aria-hidden="true">
            ⌕
          </span>
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
            autoFocus
          />
          <button
            type="submit"
            className="search-sheet-submit"
            disabled={searching || !query.trim()}
          >
            {searching ? "…" : "Go"}
          </button>
        </form>

        <form className="search-sheet-add" onSubmit={(e) => void handleAdd(e)}>
          <textarea
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            placeholder="Add context…"
            rows={2}
          />
          <button
            type="submit"
            className="search-sheet-submit"
            disabled={saving || !newContext.trim()}
          >
            {saving ? "…" : "Add"}
          </button>
        </form>

        {error ? (
          <p className="search-sheet-error" role="alert">
            {error}
          </p>
        ) : null}

        {searched && results.length === 0 && !error ? (
          <p className="search-sheet-empty">No matches found</p>
        ) : null}

        {!searched && loading ? (
          <p className="search-sheet-empty">Loading…</p>
        ) : !searched && recent.length === 0 ? (
          <p className="search-sheet-empty">
            No context yet. Talk to Donna, share links, or add text above.
          </p>
        ) : (
          <div className="search-sheet-list">
            {displayItems.map((item) => (
              <ContextResult key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
