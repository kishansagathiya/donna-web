import { useState } from "react";
import { deleteAccount } from "../services/accountApi";
import { signOut } from "../services/auth";
import { Button } from "./ui/Button";
import { Sheet } from "./ui/Sheet";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AccountModal({ open, onClose }: Props) {
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = signingOut || deleting;

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out");
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Account">
      <p className="mb-4 text-sm leading-relaxed text-donna-muted">
        Manage your Donna account. Deleting your account permanently removes
        your conversations, memories, and sign-in from our servers.
      </p>

      {error ? (
        <p className="mb-4 text-sm text-donna-destructive">{error}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => void handleSignOut()}
          disabled={busy}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>

        {confirmDelete ? (
          <div className="rounded-donna border border-donna-border bg-donna-surface p-4">
            <p className="mb-3 text-sm text-donna-text">
              This cannot be undone. Delete everything?
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => void handleDelete()}
                disabled={busy}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="destructive"
            fullWidth
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            Delete account
          </Button>
        )}
      </div>
    </Sheet>
  );
}
