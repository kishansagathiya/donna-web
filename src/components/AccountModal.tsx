import { useState } from "react";
import { deleteAccount } from "../services/accountApi";
import { signOut } from "../services/auth";
import "./AccountModal.css";

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

  if (!open) return null;

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
    <div className="account-backdrop" onClick={onClose} role="presentation">
      <div
        className="account-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="account-title"
      >
        <div className="account-header">
          <h2 id="account-title" className="account-title">
            Account
          </h2>
          <button
            type="button"
            className="account-close"
            onClick={onClose}
            disabled={busy}
          >
            Done
          </button>
        </div>

        <p className="account-description">
          Manage your Donna account. Deleting your account permanently removes
          your conversations, memories, and sign-in from our servers.
        </p>

        {error ? <p className="account-error">{error}</p> : null}

        <button
          className="btn-secondary account-action"
          onClick={() => void handleSignOut()}
          disabled={busy}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>

        {confirmDelete ? (
          <div className="account-delete-confirm">
            <p>This cannot be undone. Delete everything?</p>
            <div className="account-delete-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn-destructive"
                onClick={() => void handleDelete()}
                disabled={busy}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn-destructive account-action"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}
