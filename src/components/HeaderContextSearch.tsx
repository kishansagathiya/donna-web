import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatNoteDate,
  searchNotes,
  type NoteSummary,
} from "../services/notesApi";
import "./HeaderContextSearch.css";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HeaderContextSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setResults([]);
      setSearched(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchNotes(trimmed)
        .then((items) => {
          setResults(items);
          setSearched(true);
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
          setSearched(true);
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (clusterRef.current?.contains(target)) {
        return;
      }
      if ((target as Element).closest?.(".header-search-dropdown")) {
        return;
      }
      onOpenChange(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  const toggle = () => onOpenChange(!open);

  const handleSelect = (id: string) => {
    onOpenChange(false);
    navigate(`/app/context/${id}`);
  };

  return (
    <>
      <div className="header-search-cluster" ref={clusterRef}>
        <input
          ref={inputRef}
          type="search"
          className={`header-search-input ${open ? "open" : ""}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search context…"
          aria-label="Search context"
          aria-expanded={open}
        />
        <button
          type="button"
          className={`icon-button icon-button-search ${open ? "active" : ""}`}
          onClick={toggle}
          aria-label={open ? "Close search" : "Search context"}
          aria-pressed={open}
        >
          ⌕
        </button>
      </div>

      {open ? (
        <div className="header-search-dropdown" role="listbox" aria-label="Search results">
          {searching ? <p className="header-search-hint">Searching…</p> : null}
          {error ? (
            <p className="header-search-error" role="alert">
              {error}
            </p>
          ) : null}
          {searched && !searching && results.length === 0 && !error ? (
            <p className="header-search-hint">No matches found</p>
          ) : null}
          {!query.trim() && !searching ? (
            <p className="header-search-hint">Type to search your context</p>
          ) : null}
          <ul className="header-search-results">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="header-search-result"
                  onClick={() => handleSelect(item.id)}
                >
                  <span className="header-search-result-title">{item.title}</span>
                  {item.preview ? (
                    <span className="header-search-result-preview">{item.preview}</span>
                  ) : null}
                  <span className="header-search-result-meta">
                    {formatNoteDate(item.note_date)}
                    {item.is_urgent ? " · urgent" : ""}
                    {item.is_important ? " · important" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
