import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IngestToast } from "../components/IngestToast";
import { useAssetIngest } from "../hooks/useAssetIngest";
import "./AddMemoryPage.css";

export function AddMemoryPage() {
  const navigate = useNavigate();
  const { toast, busy, addLink, addFile } = useAssetIngest();
  const [url, setUrl] = useState("");
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    const result = await addFile(file);
    if (result.ok) {
      navigate("/app", {
        state: { ingestToast: { message: result.message, isError: false } },
      });
    }
  }

  return (
    <div className="add-memory-page">
      <header className="add-memory-page-header">
        <h1 className="add-memory-page-title">Add to memory</h1>
        <button
          type="button"
          className="add-memory-page-done"
          onClick={() => navigate("/app")}
          disabled={busy}
        >
          Done
        </button>
      </header>

      <div className="add-memory-page-body">
        <p className="add-memory-page-subtitle">
          Links and files you add are sent to our servers and third-party AI
          services so Donna can recall them later.
        </p>

        <label className="add-memory-page-label" htmlFor="memory-url">
          Paste a link
        </label>
        <input
          id="memory-url"
          className="add-memory-page-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          disabled={busy}
          autoFocus
        />
        <button
          type="button"
          className="btn-primary add-memory-page-action"
          onClick={() => void handleAddLink()}
          disabled={busy || !url.trim()}
        >
          Save link
        </button>

        <div className="add-memory-page-divider" />

        <button
          type="button"
          className="btn-secondary add-memory-page-action"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          Choose file or photo
        </button>
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
