import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, Link2 } from "lucide-react";
import { IngestToast } from "../components/IngestToast";
import { useAssetIngest } from "../hooks/useAssetIngest";
import { AppPageHeader } from "../components/ui/AppPageHeader";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/TextInput";
import { Spinner } from "../components/ui/Spinner";
import { cn } from "../lib/cn";

export function AddMemoryPage() {
  const navigate = useNavigate();
  const { toast, busy, addLink, addFile } = useAssetIngest();
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAddLink() {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    const result = await addLink(trimmed);
    if (result.ok) {
      navigate("/app", {
        state: { ingestToast: { message: result.message, isError: false } },
      });
      return;
    }
    setUrl(trimmed);
  }

  async function handleFile(file: File) {
    const result = await addFile(file);
    if (result.ok) {
      navigate("/app", {
        state: { ingestToast: { message: result.message, isError: false } },
      });
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    await handleFile(file);
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-white">
      {busy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <Spinner />
        </div>
      ) : null}

      <AppPageHeader
        title="Add to memory"
        onBack={() => navigate("/app")}
        backDisabled={busy}
      />

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="mb-5 text-sm leading-relaxed text-donna-muted">
          Links and files you add are sent to our servers and third-party AI
          services so Donna can recall them later.
        </p>

        <div className="mb-5">
          <label
            className="mb-2 flex items-center gap-2 text-[0.8125rem] font-medium text-donna-muted"
            htmlFor="memory-url"
          >
            <Link2 className="h-4 w-4" />
            Paste a link
          </label>
          <TextInput
            id="memory-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            disabled={busy}
            autoFocus
          />
          <Button
            className="mt-3"
            fullWidth
            onClick={() => void handleAddLink()}
            disabled={busy || !url.trim()}
          >
            Save link
          </Button>
        </div>

        <div className="my-5 h-px bg-donna-border" />

        <div
          className={cn(
            "rounded-donna border-2 border-dashed p-8 text-center transition-colors duration-150",
            dragOver
              ? "border-donna-gold bg-donna-surface"
              : "border-donna-border bg-donna-surface/50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file && !busy) {
              void handleFile(file);
            }
          }}
        >
          <FileUp className="mx-auto mb-3 h-8 w-8 text-donna-gold" strokeWidth={1.75} />
          <p className="mb-3 text-sm text-donna-muted">
            Drop a file here, or choose from your device
          </p>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            Choose file or photo
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>

      <IngestToast toast={toast} />
    </div>
  );
}
