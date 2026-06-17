import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatNoteDate,
  searchNotes,
  type NoteSummary,
} from "../services/notesApi";
import "./SearchContextModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SearchContextModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearched(false);
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    onClose();
  };

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setSearching(true);
    setSearched(true);
    setError(null);
    try {
      setResults(await searchNotes(trimmed));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSelect = (id: string) => {
    handleClose();
    navigate(`/app/context/${id}`);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="search-modal-backdrop" onClick={handleClose} role="presentation">
      <div
        className="search-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="search-modal-title"
      >
        <div className="search-modal-header">
          <h2 id="search-modal-title" className="search-modal-title">
            Search context
          </h2>
          <button type="button" className="search-modal-done" onClick={handleClose}>
            Done
          </button>
        </div>

        <form
          className="search-modal-row"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSearch();
          }}
        >
          <input
            type="search"
            className="search-modal-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search context…"
            autoFocus
          />
          <button
            type="submit"
            className="search-modal-submit"
            disabled={searching || !query.trim()}
          >
            {searching ? "…" : "Search"}
          </button>
        </form>

        {error ? (
          <p className="search-modal-error" role="alert">
            {error}
          </p>
        ) : null}

        {searched && results.length === 0 && !error ? (
          <p className="search-modal-empty">No matches found</p>
        ) : null}

        <ul className="search-modal-results">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="search-modal-card"
                onClick={() => handleSelect(item.id)}
              >
                <div className="search-modal-card-header">
                  <span className="search-modal-card-title">{item.title}</span>
                  <span className="search-modal-card-flags">
                    {item.is_urgent ? <span aria-label="Urgent">🔥</span> : null}
                    {item.is_important ? (
                      <span aria-label="Important">⭐</span>
                    ) : null}
                  </span>
                </div>
                {item.preview ? (
                  <p className="search-modal-card-preview">{item.preview}</p>
                ) : null}
                <p className="search-modal-card-date">
                  {formatNoteDate(item.note_date)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
