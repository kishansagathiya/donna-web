import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getChatGPTImport,
  getLatestChatGPTImport,
  importChatGPTExportZip,
  type ChatGPTImport,
} from "../services/chatgptImportApi";
import { AlertBanner } from "./ui/AlertBanner";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";

function isActiveImport(imp: ChatGPTImport | null): boolean {
  if (!imp) return false;
  return (
    imp.status === "queued" ||
    imp.status === "running" ||
    imp.status === "awaiting_upload"
  );
}

function statusCopy(imp: ChatGPTImport): string {
  switch (imp.status) {
    case "awaiting_upload":
      return "Waiting for upload…";
    case "queued":
      return "Queued — Donna will process your export shortly.";
    case "running": {
      if (imp.conversations_total > 0) {
        return `Importing conversations… ${imp.conversations_processed} / ${imp.conversations_total}`;
      }
      return "Importing conversations…";
    }
    case "completed": {
      const parts = [
        `${imp.conversations_processed} conversation${imp.conversations_processed === 1 ? "" : "s"}`,
      ];
      if (imp.memories_imported > 0) {
        parts.push(
          `${imp.memories_imported} saved memor${imp.memories_imported === 1 ? "y" : "ies"}`,
        );
      }
      return `Imported ${parts.join(" and ")}.`;
    }
    case "failed":
      return imp.error ? `Import failed: ${imp.error}` : "Import failed.";
    default:
      return imp.status;
  }
}

export function ImportChatGPTSection() {
  const [latest, setLatest] = useState<ChatGPTImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const imp = await getLatestChatGPTImport();
      setLatest(imp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load import status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!latest || !isActiveImport(latest) || latest.status === "awaiting_upload") {
      return;
    }
    const id = latest.id;
    const timer = window.setInterval(() => {
      void getChatGPTImport(id)
        .then((imp) => setLatest(imp))
        .catch(() => {
          /* keep polling */
        });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [latest?.id, latest?.status]);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setUploadPct(0);
    try {
      const imp = await importChatGPTExportZip(file, (phase, ratio) => {
        if (phase === "uploading") {
          setUploadPct(Math.round((ratio ?? 0) * 100));
        } else {
          setUploadPct(null);
        }
      });
      setLatest(imp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import ChatGPT export");
    } finally {
      setBusy(false);
      setUploadPct(null);
    }
  }

  return (
    <div className="mb-8 max-w-lg">
      <p className="mb-1 text-sm font-semibold text-donna-text">
        Import ChatGPT
      </p>
      <p className="mb-3 text-xs leading-relaxed text-donna-muted">
        Bring your ChatGPT history into Donna so it can build memory and context
        for chat and notes.
      </p>

      <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-donna-muted">
        <li>Open ChatGPT → your profile → Settings → Data controls.</li>
        <li>Click Export data and confirm. OpenAI emails a download link (often within an hour; can take longer).</li>
        <li>Download the ZIP before the link expires (~24 hours).</li>
        <li>Upload that ZIP here — no need to unzip it.</li>
      </ol>

      {error ? (
        <div className="mb-3">
          <AlertBanner className="mx-0 mb-0">{error}</AlertBanner>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-donna-muted">
          <Spinner className="h-4 w-4" />
          Loading…
        </div>
      ) : (
        <>
          {latest && latest.status !== "awaiting_upload" ? (
            <p className="mb-3 text-xs leading-relaxed text-donna-text">
              {statusCopy(latest)}
            </p>
          ) : null}

          {uploadPct != null ? (
            <p className="mb-3 text-xs text-donna-muted">
              Uploading… {uploadPct}%
            </p>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) {
                void handleFile(file);
              }
            }}
          />

          <Button
            variant="secondary"
            fullWidth
            disabled={busy || (latest?.status === "queued" || latest?.status === "running")}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy
              ? uploadPct != null
                ? `Uploading… ${uploadPct}%`
                : "Starting import…"
              : latest?.status === "running" || latest?.status === "queued"
                ? "Import in progress…"
                : "Upload ChatGPT export ZIP"}
          </Button>

          <p className="mt-2 text-[0.7rem] leading-relaxed text-donna-muted">
            Max 512MB. Donna extracts memories in the background; review them in
            Memory when ready.
          </p>

          {latest?.status === "completed" ? (
            <p className="mt-3 text-xs">
              <Link
                to="/app/search"
                className="font-medium text-donna-text underline underline-offset-2"
              >
                Review what Donna learned
              </Link>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
