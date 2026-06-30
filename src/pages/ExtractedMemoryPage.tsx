import { useCallback, useEffect, useState } from "react";
import { Brain, Plus, Trash2 } from "lucide-react";
import {
  createMemoryFact,
  deleteMemoryFact,
  formatFactDate,
  getMemoryProfile,
  listMemoryFacts,
  updateMemoryFact,
  updateMemoryProfile,
  type MemoryFact,
} from "../services/memoryApi";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { TextInput } from "../components/ui/TextInput";
import { TextArea } from "../components/ui/TextArea";
import { Button } from "../components/ui/Button";
import { AlertBanner } from "../components/ui/AlertBanner";
import { IconButton } from "../components/ui/IconButton";
import { cn } from "../lib/cn";

export function ExtractedMemoryPage() {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [query, setQuery] = useState("");
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [searching, setSearching] = useState(true);
  const [summary, setSummary] = useState("");
  const [identityFactsText, setIdentityFactsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingFact, setSavingFact] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newFactText, setNewFactText] = useState("");

  const loadFacts = useCallback(async (searchQuery = "") => {
    setSearching(true);
    setError(null);
    try {
      setFacts(await listMemoryFacts(searchQuery));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load facts");
      setFacts([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoadingProfile(true);
      setSearching(true);
      setError(null);

      const [profileResult, factsResult] = await Promise.allSettled([
        getMemoryProfile(),
        listMemoryFacts(),
      ]);

      if (cancelled) {
        return;
      }

      const failures: string[] = [];

      if (profileResult.status === "fulfilled") {
        setSummary(profileResult.value.summary);
        setIdentityFactsText(profileResult.value.identity_facts.join("\n"));
      } else {
        failures.push(
          profileResult.reason instanceof Error
            ? profileResult.reason.message
            : "Failed to load profile",
        );
      }

      if (factsResult.status === "fulfilled") {
        setFacts(factsResult.value);
      } else {
        setFacts([]);
        failures.push(
          factsResult.reason instanceof Error
            ? factsResult.reason.message
            : "Failed to load facts",
        );
      }

      if (failures.length > 0) {
        setError(failures.join(" · "));
      }

      setLoadingProfile(false);
      setSearching(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    try {
      const identity_facts = identityFactsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const updated = await updateMemoryProfile({ summary, identity_facts });
      setSummary(updated.summary);
      setIdentityFactsText(updated.identity_facts.join("\n"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSearch = () => {
    void loadFacts(query);
  };

  const startEdit = (fact: MemoryFact) => {
    setEditingId(fact.id);
    setEditText(fact.fact);
    setAdding(false);
  };

  const handleSaveFact = async () => {
    if (!editingId || !editText.trim()) {
      return;
    }
    setSavingFact(true);
    setError(null);
    try {
      const updated = await updateMemoryFact(editingId, { fact: editText.trim() });
      setFacts((prev) =>
        prev.map((f) => (f.id === editingId ? updated : f)),
      );
      setEditingId(null);
      setEditText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save fact");
    } finally {
      setSavingFact(false);
    }
  };

  const handleDeleteFact = async (id: string) => {
    if (!window.confirm("Remove this fact from Donna's memory?")) {
      return;
    }
    setError(null);
    try {
      await deleteMemoryFact(id);
      setFacts((prev) => prev.filter((f) => f.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditText("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete fact");
    }
  };

  const handleAddFact = async () => {
    if (!newFactText.trim()) {
      return;
    }
    setSavingFact(true);
    setError(null);
    try {
      const created = await createMemoryFact({ fact: newFactText.trim() });
      setFacts((prev) => [created, ...prev]);
      setNewFactText("");
      setAdding(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add fact");
    } finally {
      setSavingFact(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-donna-border px-6 py-5 md:px-8">
        <div>
          <h1 className="text-xl font-semibold text-donna-text">Memory</h1>
          <p className="mt-0.5 text-sm text-donna-muted">
            What Donna knows about you
          </p>
        </div>
        <IconButton
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          aria-label="Add fact"
          className="!h-9 !w-9"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </IconButton>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {error ? (
          <AlertBanner className="mx-5 mt-3">{error}</AlertBanner>
        ) : null}

        <section className="border-b border-donna-border px-5 py-4 md:px-8">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-donna-text">Profile</h2>
            {loadingProfile ? (
              <span className="text-xs text-donna-muted">Loading…</span>
            ) : null}
          </div>
          <TextArea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary about you…"
            className="min-h-24"
            disabled={loadingProfile}
          />
          <label className="mt-3 block text-xs font-medium text-donna-muted">
            Identity facts (one per line)
          </label>
          <TextArea
            value={identityFactsText}
            onChange={(e) => setIdentityFactsText(e.target.value)}
            placeholder={"User's name is …"}
            className="mt-1 min-h-16"
            disabled={loadingProfile}
          />
          <Button
            className="mt-3 !w-auto"
            onClick={() => void handleSaveProfile()}
            disabled={savingProfile || loadingProfile}
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </section>

        {adding ? (
          <section className="border-b border-donna-border bg-donna-surface/50 px-5 py-4 md:px-8">
            <h2 className="mb-2 text-sm font-semibold text-donna-text">New fact</h2>
            <TextArea
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              placeholder="Something Donna should remember…"
              className="min-h-20"
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <Button
                className="!w-auto"
                onClick={() => void handleAddFact()}
                disabled={savingFact || !newFactText.trim()}
              >
                {savingFact ? "Adding…" : "Add"}
              </Button>
              <Button
                variant="secondary"
                className="!w-auto"
                onClick={() => {
                  setAdding(false);
                  setNewFactText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </section>
        ) : null}

        <form
          className="flex shrink-0 gap-2 border-b border-donna-border px-5 py-4 md:px-8"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <TextInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search facts…"
            className="flex-1"
          />
          <Button
            type="submit"
            className="!w-auto shrink-0 px-4 py-2.5 text-[0.9375rem]"
            disabled={searching}
          >
            {searching ? "…" : "Search"}
          </Button>
        </form>

        <div className="flex flex-col px-5 py-4 md:px-8">
          {searching && facts.length === 0 ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : null}

          {!searching && facts.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No facts yet"
              description="Donna will learn from your conversations, or you can add facts manually."
            />
          ) : null}

          <ul className="flex flex-col gap-3">
            {facts.map((fact) => (
              <li key={fact.id}>
                <Card
                  className={cn(
                    "cursor-pointer p-4 transition-colors hover:bg-donna-surface/60",
                    editingId === fact.id && "ring-2 ring-donna-primary-ring",
                  )}
                  onClick={() => startEdit(fact)}
                >
                  {editingId === fact.id ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <TextArea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-20"
                        autoFocus
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          className="!w-auto"
                          onClick={() => void handleSaveFact()}
                          disabled={savingFact || !editText.trim()}
                        >
                          {savingFact ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          variant="secondary"
                          className="!w-auto"
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <button
                          type="button"
                          className="ml-auto inline-flex items-center gap-1 text-sm text-donna-destructive"
                          onClick={() => void handleDeleteFact(fact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[0.9375rem] leading-relaxed text-donna-text">
                        {fact.fact}
                      </p>
                      {fact.created_at ? (
                        <p className="mt-2 text-xs text-donna-muted">
                          {formatFactDate(fact.created_at)}
                        </p>
                      ) : null}
                    </>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
