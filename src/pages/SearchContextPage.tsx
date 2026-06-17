import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatNoteDate,
  searchNotes,
  type NoteSummary,
} from "../services/notesApi";
import "./SearchContextPage.css";

export function SearchContextPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    navigate(`/app/context/${id}`);
  };

  return (
    <div className="search-page">
      <header className="search-page-header">
        <h1 className="search-page-title">Search context</h1>
        <button
          type="button"
          className="search-page-done"
          onClick={() => navigate("/app")}
        >
          Done
        </button>
      </header>

      <form
        className="search-page-row"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSearch();
        }}
      >
        <input
          type="search"
          className="search-page-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search context…"
          autoFocus
        />
        <button
          type="submit"
          className="search-page-submit"
          disabled={searching || !query.trim()}
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      <div className="search-page-body">
        {error ? (
          <p className="search-page-error" role="alert">
            {error}
          </p>
        ) : null}

        {searched && results.length === 0 && !error ? (
          <p className="search-page-empty">No matches found</p>
        ) : null}

        {!searched && !error ? (
          <p className="search-page-empty">Search your saved context from voice, links, and documents.</p>
        ) : null}

        <ul className="search-page-results">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="search-page-card"
                onClick={() => handleSelect(item.id)}
              >
                <div className="search-page-card-header">
                  <span className="search-page-card-title">{item.title}</span>
                  <span className="search-page-card-flags">
                    {item.is_urgent ? <span aria-label="Urgent">🔥</span> : null}
                    {item.is_important ? (
                      <span aria-label="Important">⭐</span>
                    ) : null}
                  </span>
                </div>
                {item.preview ? (
                  <p className="search-page-card-preview">{item.preview}</p>
                ) : null}
                <p className="search-page-card-date">
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
