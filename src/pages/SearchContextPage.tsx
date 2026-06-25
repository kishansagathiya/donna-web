import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Plus, Search, Star } from "lucide-react";
import {
  formatNoteDate,
  searchNotes,
  type NoteSummary,
} from "../services/notesApi";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { TextInput } from "../components/ui/TextInput";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { IconButton } from "../components/ui/IconButton";

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
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-donna-border px-6 py-5 md:px-8">
        <h1 className="text-xl font-semibold text-donna-text">Memory</h1>
        <IconButton
          onClick={() => navigate("/app/add")}
          aria-label="Add to memory"
          className="!h-9 !w-9"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </IconButton>
      </header>

      <form
        className="flex shrink-0 gap-2 border-b border-donna-border px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSearch();
        }}
      >
        <TextInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search context…"
          autoFocus
          className="flex-1"
        />
        <Button
          type="submit"
          className="!w-auto shrink-0 px-4 py-2.5 text-[0.9375rem]"
          disabled={searching || !query.trim()}
        >
          {searching ? "…" : "Search"}
        </Button>
      </form>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {error ? (
          <AlertBanner className="mx-5 mt-3">{error}</AlertBanner>
        ) : null}

        {searching ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Spinner />
          </div>
        ) : null}

        {!searching && !searched && !error ? (
          <EmptyState
            icon={Search}
            title="Search your memories"
            description="Search your saved context from voice, links, and documents."
          />
        ) : null}

        {!searching && searched && results.length === 0 && !error ? (
          <EmptyState
            icon={Search}
            title="No matches found"
            description="Try a different word or phrase."
          />
        ) : null}

        <ul className="flex flex-col gap-3 px-5 py-3 pb-6">
          {results.map((item) => (
            <li key={item.id}>
              <Card onClick={() => handleSelect(item.id)}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold text-donna-text">
                    {item.title}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {item.is_urgent ? (
                      <Flame
                        className="h-4 w-4 text-donna-destructive"
                        aria-label="Urgent"
                      />
                    ) : null}
                    {item.is_important ? (
                      <Star
                        className="h-4 w-4 fill-donna-primary text-donna-primary"
                        aria-label="Important"
                      />
                    ) : null}
                  </span>
                </div>
                {item.preview ? (
                  <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-donna-muted">
                    {item.preview}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-donna-muted">
                  {formatNoteDate(item.note_date)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
