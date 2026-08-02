import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import {
  createConversationShare,
  revokeConversationShare,
} from "../services/conversationsApi";
import { Sheet } from "./ui/Sheet";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import { AlertBanner } from "./ui/AlertBanner";

type Props = {
  open: boolean;
  conversationId: string | null;
  conversationTitle?: string;
  onClose: () => void;
};

export function ShareConversationSheet({
  open,
  conversationId,
  conversationTitle,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !conversationId) {
      setUrl(null);
      setError(null);
      setCopied(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCopied(false);

    void createConversationShare(conversationId)
      .then((share) => {
        if (!cancelled) setUrl(share.url);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not create share link");
          setUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy link");
    }
  }

  async function handleRevoke() {
    if (!conversationId) return;
    if (
      !window.confirm(
        "Stop sharing? Anyone with the link will lose access.",
      )
    ) {
      return;
    }
    setRevoking(true);
    setError(null);
    try {
      await revokeConversationShare(conversationId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke share");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Share conversation"
      titleId="share-conversation-title"
      footer={
        url ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => void handleRevoke()}
              disabled={revoking || loading}
              className="!py-2.5 !text-sm"
            >
              {revoking ? "Stopping…" : "Stop sharing"}
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCopy()}
              disabled={loading}
              className="!py-2.5 !text-sm"
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-donna-muted">
          Anyone with the link can view
          {conversationTitle ? (
            <>
              {" "}
              <span className="font-medium text-donna-text">
                {conversationTitle}
              </span>
            </>
          ) : (
            " this conversation"
          )}
          . They do not need a Donna account.
        </p>

        {error ? (
          <AlertBanner onDismiss={() => setError(null)}>{error}</AlertBanner>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-donna-muted">
            <Spinner className="h-4 w-4" />
            Creating link…
          </div>
        ) : url ? (
          <div className="flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-donna-border bg-donna-surface px-3 py-2.5">
              <Link2
                className="h-4 w-4 shrink-0 text-donna-muted"
                strokeWidth={1.75}
              />
              <p className="truncate text-sm text-donna-text">{url}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-label={copied ? "Copied" : "Copy link"}
              className="inline-flex h-auto shrink-0 items-center justify-center rounded-xl border border-donna-border px-3 text-donna-muted transition-colors hover:bg-donna-surface hover:text-donna-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-donna-primary-ring"
            >
              {copied ? (
                <Check className="h-4 w-4 text-donna-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
