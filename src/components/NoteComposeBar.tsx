import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Bookmark, ImagePlus, Link2, Send, X } from "lucide-react";
import { MicButton, type MicState } from "./MicButton";
import { Spinner } from "./ui/Spinner";
import { cn } from "../lib/cn";
import {
  assertNoteImageBudget,
  filesToNoteImages,
  isImageMime,
  noteImageAcceptForViewport,
  payloadsFromPending,
  revokePendingAttachment,
  takeSelectedFiles,
  type ChatAttachmentPayload,
  type PendingAttachment,
} from "../lib/noteAttachments";

type StagingAttachment = {
  id: string;
  filename: string;
};

const chipClass = cn(
  "relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-donna-border bg-white px-3 py-1.5",
  "text-xs font-medium text-donna-text transition-colors",
  "hover:bg-donna-surface",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring",
);

export function NoteComposeBar({
  onSave,
  saving,
  onAddLink,
  onSaveToMemory,
  ingestBusy,
  linkOpen,
  linkValue,
  onLinkValueChange,
  onSubmitLink,
  onCancelLink,
  micState,
  onMicPress,
  micDisabled,
  sessionLabel,
}: {
  onSave: (text: string, attachments: ChatAttachmentPayload[]) => Promise<void>;
  saving: boolean;
  onAddLink: () => void;
  onSaveToMemory: () => void;
  ingestBusy: boolean;
  linkOpen: boolean;
  linkValue: string;
  onLinkValueChange: (value: string) => void;
  onSubmitLink: () => void;
  onCancelLink: () => void;
  micState: MicState;
  onMicPress: () => void;
  micDisabled?: boolean;
  sessionLabel?: string | null;
}) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [staging, setStaging] = useState<StagingAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = draft.trim().length > 0;
  const isAttaching = staging.length > 0;
  const hasPhotos = attachments.length > 0 || isAttaching;
  const canSave = (hasText || attachments.length > 0) && !isAttaching;
  const voiceBusy =
    micState === "listening" ||
    micState === "processing" ||
    micState === "requesting";
  const showMic = !hasText && !hasPhotos && !linkOpen;
  const controlsDisabled = saving || ingestBusy || voiceBusy;

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 120), 240)}px`;
  }

  useEffect(() => {
    resize();
  }, [draft]);

  useEffect(() => {
    return () => {
      for (const att of attachments) {
        revokePendingAttachment(att);
      }
    };
    // Only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    try {
      assertNoteImageBudget(attachments.length + staging.length, files.length);
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : "Could not attach photo");
      return;
    }

    const staged: StagingAttachment[] = files.map((file) => ({
      id: crypto.randomUUID(),
      filename: file.name || "photo",
    }));
    setAttachError(null);
    setStaging((prev) => [...prev, ...staged]);
    try {
      const next = await filesToNoteImages(files);
      setAttachments((prev) => [...prev, ...next]);
    } catch (err) {
      setAttachError(
        err instanceof Error ? err.message : "Could not attach photo",
      );
    } finally {
      const stagedIds = new Set(staged.map((item) => item.id));
      setStaging((prev) => prev.filter((item) => !stagedIds.has(item.id)));
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) revokePendingAttachment(target);
      return prev.filter((a) => a.id !== id);
    });
  }

  async function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length === 0) return;
    e.preventDefault();
    await addFiles(imageFiles);
  }

  async function submit() {
    if (!canSave || controlsDisabled) return;
    const trimmed = draft.trim();
    const pending = attachments;
    await onSave(trimmed, payloadsFromPending(pending));
    setDraft("");
    setAttachments([]);
    setAttachError(null);
    for (const att of pending) {
      revokePendingAttachment(att);
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="border-b border-donna-border px-5 py-3 md:px-8">
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-donna border border-donna-border bg-white"
      >
        {hasPhotos ? (
          <div className="flex flex-wrap gap-2 border-b border-donna-border px-3 py-2.5">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative flex max-w-[14rem] items-center gap-2 rounded-xl border border-donna-border bg-donna-surface px-2 py-1.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                  {att.previewUrl && isImageMime(att.mime) ? (
                    <img
                      src={att.previewUrl}
                      alt=""
                      className="h-8 w-8 rounded-md object-cover"
                    />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-donna-muted" />
                  )}
                </div>
                <span className="min-w-0 truncate text-xs font-medium text-donna-text">
                  {att.filename}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`Remove ${att.filename}`}
                  className="rounded p-0.5 text-donna-muted hover:bg-white hover:text-donna-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {staging.map((att) => (
              <div
                key={att.id}
                className="flex max-w-[14rem] items-center gap-2 rounded-xl border border-donna-border bg-donna-surface px-2 py-1.5"
                aria-busy
              >
                <Spinner className="!h-4 !w-4 !border-2" label={`Uploading ${att.filename}`} />
                <span className="min-w-0 truncate text-xs font-medium text-donna-text">
                  {att.filename}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={(e) => void handlePaste(e)}
          placeholder={
            voiceBusy ? "Listening…" : "Jot down a note… or add a photo"
          }
          disabled={saving || ingestBusy || voiceBusy}
          rows={4}
          className={cn(
            "min-h-[120px] w-full resize-none border-0 bg-transparent px-4 py-3",
            "text-base leading-relaxed text-donna-text placeholder:text-donna-muted",
            "focus:outline-none focus:ring-0",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />

        {sessionLabel ? (
          <p className="border-t border-donna-border px-4 py-2 text-sm text-donna-muted">
            {sessionLabel}
          </p>
        ) : null}

        {attachError ? (
          <p className="border-t border-donna-border px-4 py-2 text-sm text-donna-destructive">
            {attachError}
          </p>
        ) : null}

        {linkOpen ? (
          <div className="flex gap-2 border-t border-donna-border px-3 py-2.5">
            <input
              value={linkValue}
              onChange={(e) => onLinkValueChange(e.target.value)}
              placeholder="https://…"
              disabled={ingestBusy}
              autoFocus
              className={cn(
                "min-w-0 flex-1 rounded-donna border border-donna-border bg-white px-3 py-2",
                "text-sm text-donna-text placeholder:text-donna-muted",
                "focus:border-donna-gold-ring focus:outline-none focus:ring-2 focus:ring-donna-gold-ring/30",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
              aria-label="URL to save"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmitLink();
                }
                if (e.key === "Escape") {
                  onCancelLink();
                }
              }}
            />
            <button
              type="button"
              onClick={onSubmitLink}
              disabled={ingestBusy || !linkValue.trim()}
              className={cn(
                "rounded-donna bg-donna-primary px-3 py-2 text-sm font-medium text-white",
                "hover:bg-donna-primary-hover disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelLink}
              disabled={ingestBusy}
              className="rounded-donna px-2 text-sm text-donna-muted hover:text-donna-text"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t border-donna-border px-3 py-2">
            <div className="flex flex-wrap gap-2">
              <label
                aria-busy={isAttaching}
                className={cn(
                  chipClass,
                  (controlsDisabled || isAttaching) &&
                    "pointer-events-none cursor-not-allowed opacity-50",
                )}
              >
                {isAttaching ? (
                  <Spinner
                    className="!h-3.5 !w-3.5 !border-2"
                    label="Attaching photo"
                  />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                Add photo
                <input
                  type="file"
                  multiple
                  disabled={controlsDisabled || isAttaching}
                  accept={noteImageAcceptForViewport()}
                  aria-label="Add photo"
                  className="absolute inset-0 h-full w-full cursor-pointer text-[100px] opacity-0"
                  onChange={(e) => {
                    const files = takeSelectedFiles(e.currentTarget);
                    if (files.length > 0) void addFiles(files);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onAddLink}
                disabled={controlsDisabled}
                className={cn(
                  chipClass,
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Add link
              </button>
              <button
                type="button"
                onClick={onSaveToMemory}
                disabled={controlsDisabled}
                className={cn(
                  chipClass,
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Bookmark className="h-3.5 w-3.5" strokeWidth={1.75} />
                Save to memory
              </button>
            </div>
            {showMic ? (
              <MicButton
                variant="inline"
                state={micState}
                onPress={onMicPress}
                disabled={micDisabled || ingestBusy || saving}
              />
            ) : (
              <button
                type="submit"
                disabled={!canSave || controlsDisabled}
                aria-label="Save note"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  canSave && !controlsDisabled
                    ? "text-donna-primary hover:bg-donna-surface"
                    : "text-donna-muted",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                {saving ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
