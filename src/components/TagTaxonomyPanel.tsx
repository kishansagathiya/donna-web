import { useCallback, useEffect, useState } from "react";
import {
  aliasTag,
  listTagSuggestions,
  listTaxonomy,
  mergeTags,
  pinTag,
  renameTag,
  resolveTagSuggestion,
  type TagSuggestion,
  type TaxonomyTag,
} from "../services/notesApi";
import { cn } from "../lib/cn";

export function TagTaxonomyPanel({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TaxonomyTag[]>([]);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [aliasSource, setAliasSource] = useState("");
  const [aliasCanonical, setAliasCanonical] = useState("");
  const [mergeSource, setMergeSource] = useState("");
  const [mergeCanonical, setMergeCanonical] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [taxonomy, pending] = await Promise.all([
        listTaxonomy(100),
        listTagSuggestions(),
      ]);
      setTags(taxonomy);
      setSuggestions(pending);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tags");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-donna-border px-5 py-2 md:px-8">
      <button
        type="button"
        className="text-xs font-medium text-donna-muted hover:text-donna-text"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide tag organization" : "Organize tags"}
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          {error ? (
            <p className="text-xs text-donna-destructive">{error}</p>
          ) : null}

          {suggestions.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-donna-text">
                Pending suggestions
              </p>
              <ul className="space-y-1.5">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-donna bg-donna-surface px-2.5 py-1.5 text-xs"
                  >
                    <span>
                      #{s.payload?.tag ?? "tag"}
                      {typeof s.confidence === "number"
                        ? ` · ${Math.round(s.confidence * 100)}%`
                        : ""}
                    </span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="text-donna-primary hover:underline"
                        onClick={() =>
                          void run(() => resolveTagSuggestion(s.id, "accepted"))
                        }
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-donna-destructive hover:underline"
                        onClick={() =>
                          void run(() => resolveTagSuggestion(s.id, "rejected"))
                        }
                      >
                        Reject
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t.name}
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(() => pinTag(t.name, !t.pinned))
                }
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  t.pinned
                    ? "bg-donna-primary text-white"
                    : "bg-donna-surface text-donna-muted hover:text-donna-text",
                )}
                title={t.pinned ? "Unpin tag" : "Pin tag"}
              >
                {t.pinned ? "* " : ""}#{t.name} {t.count}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <form
              className="flex flex-col gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!renameFrom.trim() || !renameTo.trim()) return;
                void run(async () => {
                  await renameTag(renameFrom, renameTo);
                  setRenameFrom("");
                  setRenameTo("");
                });
              }}
            >
              <p className="text-[0.6875rem] font-semibold text-donna-muted">
                Rename
              </p>
              <input
                value={renameFrom}
                onChange={(e) => setRenameFrom(e.target.value)}
                placeholder="from"
                className="rounded-donna border border-donna-border px-2 py-1 text-xs"
              />
              <input
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                placeholder="to"
                className="rounded-donna border border-donna-border px-2 py-1 text-xs"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-donna bg-donna-surface px-2 py-1 text-xs"
              >
                Rename
              </button>
            </form>

            <form
              className="flex flex-col gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!aliasSource.trim() || !aliasCanonical.trim()) return;
                void run(async () => {
                  await aliasTag(aliasSource, aliasCanonical);
                  setAliasSource("");
                  setAliasCanonical("");
                });
              }}
            >
              <p className="text-[0.6875rem] font-semibold text-donna-muted">
                Alias
              </p>
              <input
                value={aliasSource}
                onChange={(e) => setAliasSource(e.target.value)}
                placeholder="source"
                className="rounded-donna border border-donna-border px-2 py-1 text-xs"
              />
              <input
                value={aliasCanonical}
                onChange={(e) => setAliasCanonical(e.target.value)}
                placeholder="canonical"
                className="rounded-donna border border-donna-border px-2 py-1 text-xs"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-donna bg-donna-surface px-2 py-1 text-xs"
              >
                Alias
              </button>
            </form>

            <form
              className="flex flex-col gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!mergeSource.trim() || !mergeCanonical.trim()) return;
                void run(async () => {
                  await mergeTags(mergeSource, mergeCanonical);
                  setMergeSource("");
                  setMergeCanonical("");
                });
              }}
            >
              <p className="text-[0.6875rem] font-semibold text-donna-muted">
                Merge
              </p>
              <input
                value={mergeSource}
                onChange={(e) => setMergeSource(e.target.value)}
                placeholder="source"
                className="rounded-donna border border-donna-border px-2 py-1 text-xs"
              />
              <input
                value={mergeCanonical}
                onChange={(e) => setMergeCanonical(e.target.value)}
                placeholder="canonical"
                className="rounded-donna border border-donna-border px-2 py-1 text-xs"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-donna bg-donna-surface px-2 py-1 text-xs"
              >
                Merge
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
