import { useRef, useState } from "react";
import "./AddMemorySheet.css";

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onAddLink: (url: string) => void;
  onAddFile: (file: File) => void;
};

export function AddMemorySheet({
  open,
  busy,
  onClose,
  onAddLink,
  onAddFile,
}: Props) {
  const [url, setUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleAddLink() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onAddLink(trimmed);
    setUrl("");
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onAddFile(file);
      onClose();
    }
    e.target.value = "";
  }

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-memory-title"
      >
        <h2 id="add-memory-title" className="sheet-title">
          Add to memory
        </h2>
        <p className="sheet-subtitle">
          Links and files you add are sent to our servers and third-party AI
          services so Donna can recall them later.
        </p>

        <label className="sheet-label" htmlFor="memory-url">
          Paste a link
        </label>
        <input
          id="memory-url"
          className="text-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          disabled={busy}
        />
        <button
          className="btn-primary sheet-action"
          onClick={handleAddLink}
          disabled={busy || !url.trim()}
        >
          Save link
        </button>

        <div className="sheet-divider" />

        <button
          className="btn-secondary sheet-action"
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
          onChange={handleFileChange}
        />

        <button className="sheet-cancel" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
