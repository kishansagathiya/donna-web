import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  authorizeGoogle,
  authorizeGranola,
  deleteGranolaImports,
  disconnectGoogle,
  disconnectGranola,
  listIntegrations,
  patchGranola,
  syncGranola,
  type IntegrationStatus,
} from "../services/integrationsApi";
import { Button } from "./ui/Button";
import { AlertBanner } from "./ui/AlertBanner";
import { Spinner } from "./ui/Spinner";

function formatSyncTime(iso?: string): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "syncing":
      return "Syncing…";
    case "reauth_required":
      return "Reconnect required";
    case "partial":
      return "Partially synced";
    case "error":
      return "Error";
    case "disconnected":
    default:
      return "Not connected";
  }
}

function initialSyncLabel(status: string): string | null {
  switch (status) {
    case "pending":
      return "Initial import pending";
    case "running":
      return "Importing meetings…";
    case "completed":
      return "Initial import complete";
    case "partial":
      return "Initial import partially complete";
    case "failed":
      return "Initial import failed";
    default:
      return null;
  }
}

function isActiveConnection(status: string): boolean {
  return (
    status === "connected" ||
    status === "syncing" ||
    status === "partial" ||
    status === "error"
  );
}

function shouldPoll(item: IntegrationStatus | null): boolean {
  if (!item) {
    return false;
  }
  return (
    item.status === "connecting" ||
    item.status === "syncing" ||
    item.initial_sync_status === "pending" ||
    item.initial_sync_status === "running"
  );
}

export function IntegrationsSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [granola, setGranola] = useState<IntegrationStatus | null>(null);
  const [google, setGoogle] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmDeleteImports, setConfirmDeleteImports] = useState(false);
  const [confirmGoogleDisconnect, setConfirmGoogleDisconnect] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const integrations = await listIntegrations();
    const nextGranola =
      integrations.find((item) => item.provider === "granola") ?? null;
    const nextGoogle =
      integrations.find((item) => item.provider === "google") ?? null;
    setGranola(nextGranola);
    setGoogle(nextGoogle);
    return { granola: nextGranola, google: nextGoogle };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load integrations",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const provider = searchParams.get("integrations");
    if (provider !== "granola" && provider !== "google") {
      return;
    }
    const ok = searchParams.get("ok");
    const oauthError = searchParams.get("error");
    const label = provider === "google" ? "Google Calendar" : "Granola";
    if (ok === "0" || oauthError) {
      setOauthNotice(
        oauthError
          ? `${label} connection failed: ${oauthError}`
          : `${label} connection failed.`,
      );
    } else {
      setOauthNotice(
        provider === "google"
          ? "Connected to Google Calendar."
          : "Connected to Granola. Importing meetings…",
      );
    }

    void refresh()
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Could not refresh integrations",
        );
      })
      .finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete("integrations");
        next.delete("ok");
        next.delete("error");
        setSearchParams(next, { replace: true });
      });
  }, [searchParams, setSearchParams, refresh]);

  useEffect(() => {
    if (!shouldPoll(granola) && !shouldPoll(google)) {
      return;
    }
    const id = window.setInterval(() => {
      void refresh().catch(() => {
        // Keep polling quietly; surface errors on user actions.
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, [granola, google, refresh]);

  if (loading) {
    return (
      <div className="mb-8 max-w-lg">
        <p className="mb-1 text-sm font-semibold text-donna-text">Integrations</p>
        <div className="flex items-center gap-2 py-3 text-sm text-donna-muted">
          <Spinner className="h-5 w-5" />
          Loading integrations…
        </div>
      </div>
    );
  }

  const granolaEnabled = Boolean(granola?.enabled);
  const googleEnabled = Boolean(google?.enabled);
  if (!granolaEnabled && !googleEnabled) {
    return null;
  }

  async function handleConnectGranola() {
    setBusy(true);
    setError(null);
    setOauthNotice(null);
    try {
      const { authorization_url } = await authorizeGranola("web");
      window.location.assign(authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Granola authorization");
      setBusy(false);
    }
  }

  async function handleConnectGoogle() {
    setBusy(true);
    setError(null);
    setOauthNotice(null);
    try {
      const { authorization_url } = await authorizeGoogle("web");
      window.location.assign(authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google authorization");
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    setBusy(true);
    setError(null);
    try {
      await syncGranola();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sync");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleSync(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const updated = await patchGranola(next);
      setGranola(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update hourly sync");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnectGranola() {
    setBusy(true);
    setError(null);
    try {
      const updated = await disconnectGranola();
      setGranola(updated);
      setConfirmDisconnect(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnectGoogle() {
    setBusy(true);
    setError(null);
    try {
      const updated = await disconnectGoogle();
      setGoogle(updated);
      setConfirmGoogleDisconnect(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect Google");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteImports() {
    setBusy(true);
    setError(null);
    try {
      await deleteGranolaImports();
      await refresh();
      setConfirmDeleteImports(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete imports");
    } finally {
      setBusy(false);
    }
  }

  const connected = granola ? isActiveConnection(granola.status) : false;
  const needsReconnect = granola?.status === "reauth_required";
  const connecting = granola?.status === "connecting";
  const syncing =
    granola?.status === "syncing" || granola?.initial_sync_status === "running";
  const lastSync = formatSyncTime(granola?.last_sync_at);
  const syncProgress = granola ? initialSyncLabel(granola.initial_sync_status) : null;
  const caps = granola?.capabilities;
  const hasTranscripts = Boolean(caps?.transcripts || caps?.live_get_transcript);
  const historyDays = caps?.history_days;
  const planHint = caps?.plan_hint;

  const googleConnected = google ? isActiveConnection(google.status) : false;
  const googleNeedsReconnect = google?.status === "reauth_required";

  return (
    <div className="mb-8 max-w-lg">
      <p className="mb-1 text-sm font-semibold text-donna-text">Integrations</p>
      <p className="mb-3 text-xs leading-relaxed text-donna-muted">
        Connect tools so Donna can take actions and recall meeting context.
      </p>

      {error ? <AlertBanner className="mb-3 mx-0">{error}</AlertBanner> : null}
      {oauthNotice ? (
        <p className="mb-3 text-xs leading-relaxed text-donna-text">{oauthNotice}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {googleEnabled && google ? (
          <div className="rounded-donna border border-donna-border bg-donna-surface p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-donna-text">Google Calendar</p>
              <p className="mt-0.5 text-xs text-donna-muted">
                {statusLabel(google.status)}
                {google.account_label ? ` · ${google.account_label}` : ""}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-donna-muted">
                Create calendar events from confirmed Actions.
              </p>
            </div>

            {!googleConnected && !googleNeedsReconnect ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void handleConnectGoogle()}
                disabled={busy}
              >
                Connect Google Calendar
              </Button>
            ) : null}

            {googleNeedsReconnect ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void handleConnectGoogle()}
                disabled={busy}
              >
                Reconnect
              </Button>
            ) : null}

            {googleConnected ? (
              confirmGoogleDisconnect ? (
                <div className="rounded-donna border border-donna-border bg-white p-3">
                  <p className="mb-3 text-sm text-donna-text">
                    Disconnect Google Calendar? Donna will stop creating events
                    until you reconnect.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setConfirmGoogleDisconnect(false)}
                      disabled={busy}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => void handleDisconnectGoogle()}
                      disabled={busy}
                    >
                      {busy ? "Disconnecting…" : "Disconnect"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setConfirmGoogleDisconnect(true)}
                  disabled={busy}
                >
                  Disconnect
                </Button>
              )
            ) : null}
          </div>
        ) : null}

        {granolaEnabled && granola ? (
          <div className="rounded-donna border border-donna-border bg-donna-surface p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-donna-text">Granola</p>
                <p className="mt-0.5 text-xs text-donna-muted">
                  {statusLabel(granola.status)}
                  {granola.account_label ? ` · ${granola.account_label}` : ""}
                  {granola.workspace_label ? ` · ${granola.workspace_label}` : ""}
                </p>
              </div>
            </div>

            {connected ||
            needsReconnect ||
            connecting ||
            granola.imported_meeting_count > 0 ? (
              <div className="mb-3 space-y-1.5 text-xs leading-relaxed text-donna-muted">
                {connecting ? <p>Finishing OAuth connection…</p> : null}
                {connected || needsReconnect || connecting ? (
                  <>
                    {syncProgress ? <p>{syncProgress}</p> : null}
                    {(granola.imported_meeting_count > 0 ||
                      granola.imported_transcript_count > 0 ||
                      syncing) && (
                      <p>
                        Imported {granola.imported_meeting_count} meeting
                        {granola.imported_meeting_count === 1 ? "" : "s"}
                        {hasTranscripts
                          ? ` · ${granola.imported_transcript_count} transcript${
                              granola.imported_transcript_count === 1 ? "" : "s"
                            }`
                          : ""}
                      </p>
                    )}
                    {hasTranscripts ? (
                      <p>Transcripts available for this Granola plan.</p>
                    ) : (
                      <p>
                        {planHint === "basic" || historyDays
                          ? `Basic plan: last ${historyDays ?? 30} days of meetings · no transcripts.`
                          : "No transcript access on this Granola plan."}
                      </p>
                    )}
                    {lastSync ? <p>Last sync: {lastSync}</p> : null}
                    {granola.last_error ? (
                      <p className="text-donna-destructive">{granola.last_error}</p>
                    ) : null}
                  </>
                ) : (
                  <p>
                    Imported {granola.imported_meeting_count} meeting
                    {granola.imported_meeting_count === 1 ? "" : "s"} remain in
                    Donna.
                  </p>
                )}
              </div>
            ) : null}

            {!connected && !needsReconnect && !connecting ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void handleConnectGranola()}
                disabled={busy}
              >
                Connect Granola
              </Button>
            ) : null}

            {needsReconnect ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void handleConnectGranola()}
                disabled={busy}
              >
                Reconnect
              </Button>
            ) : null}

            {connected ? (
              <div className="flex flex-col gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => void handleSyncNow()}
                  disabled={busy || syncing}
                >
                  {syncing ? "Syncing…" : "Sync now"}
                </Button>

                <label className="flex items-center justify-between gap-3 text-sm text-donna-text">
                  <span>
                    <span className="font-medium">Hourly sync</span>
                    <span className="mt-0.5 block text-xs text-donna-muted">
                      Automatically import new Granola meetings each hour.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-donna-primary"
                    checked={granola.sync_enabled}
                    disabled={busy}
                    onChange={(event) =>
                      void handleToggleSync(event.target.checked)
                    }
                  />
                </label>

                {confirmDisconnect ? (
                  <div className="rounded-donna border border-donna-border bg-white p-3">
                    <p className="mb-3 text-sm text-donna-text">
                      Disconnect Granola? Imported meeting snapshots remain until
                      you delete them.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setConfirmDisconnect(false)}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => void handleDisconnectGranola()}
                        disabled={busy}
                      >
                        {busy ? "Disconnecting…" : "Disconnect"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setConfirmDeleteImports(false);
                      setConfirmDisconnect(true);
                    }}
                    disabled={busy}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            ) : null}

            {(connected ||
              granola.imported_meeting_count > 0 ||
              confirmDeleteImports) && (
              <div className="mt-3 border-t border-donna-border pt-3">
                {confirmDeleteImports ? (
                  <div className="rounded-donna border border-donna-destructive/30 bg-white p-3">
                    <p className="mb-3 text-sm text-donna-text">
                      Permanently delete all imported Granola meeting snapshots?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setConfirmDeleteImports(false)}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => void handleDeleteImports()}
                        disabled={busy}
                      >
                        {busy ? "Deleting…" : "Delete imports"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    fullWidth
                    onClick={() => {
                      setConfirmDisconnect(false);
                      setConfirmDeleteImports(true);
                    }}
                    disabled={busy || granola.imported_meeting_count === 0}
                  >
                    Delete imports
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
