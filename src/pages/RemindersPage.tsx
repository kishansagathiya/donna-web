import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Plus, X } from "lucide-react";
import { AppPageHeader } from "../components/ui/AppPageHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { TextArea } from "../components/ui/TextArea";
import { TextInput } from "../components/ui/TextInput";
import {
  cancelReminder,
  createReminder,
  dismissReminder,
  formatReminderWhen,
  listReminders,
  type Reminder,
} from "../services/remindersApi";

type Draft = {
  title: string;
  when: string;
  notes: string;
};

const emptyDraft: Draft = { title: "", when: "", notes: "" };

function statusLabel(status: string) {
  if (status === "scheduled") return "Upcoming";
  if (status === "fired") return "Due";
  return status;
}

export function RemindersPage() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setReminders(await listReminders("open"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const create = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await createReminder({
        title: draft.title.trim(),
        when: draft.when.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      });
      setCreateOpen(false);
      setDraft(emptyDraft);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create reminder");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id: string, action: "cancel" | "dismiss") => {
    setBusyId(id);
    try {
      if (action === "cancel") await cancelReminder(id);
      else await dismissReminder(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const grouped = useMemo(() => {
    const due = reminders.filter((r) => r.status === "fired");
    const upcoming = reminders.filter((r) => r.status === "scheduled");
    return { due, upcoming };
  }, [reminders]);

  return (
    <div className="flex min-h-dvh flex-col bg-donna-bg">
      <AppPageHeader
        title="Reminders"
        onBack={() => navigate("/app")}
        action={
          <Button onClick={() => setCreateOpen(true)} className="px-3 py-1.5 text-sm">
            <span className="inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> New
            </span>
          </Button>
        }
      />

      {error ? (
        <p className="px-4 pt-3 text-sm text-donna-destructive md:px-6">{error}</p>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders yet"
          description='Ask Donna “remind me in 10 minutes to check the oven,” or add one here. Set your timezone in Profile so times land correctly.'
        />
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 md:px-6">
          {grouped.due.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Due
              </h2>
              {grouped.due.map((rem) => (
                <ReminderCard
                  key={rem.id}
                  reminder={rem}
                  busy={busyId === rem.id}
                  onDismiss={() => void runAction(rem.id, "dismiss")}
                />
              ))}
            </section>
          ) : null}
          {grouped.upcoming.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-donna-muted">
                Upcoming
              </h2>
              {grouped.upcoming.map((rem) => (
                <ReminderCard
                  key={rem.id}
                  reminder={rem}
                  busy={busyId === rem.id}
                  onCancel={() => void runAction(rem.id, "cancel")}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-0 md:items-center md:p-6">
          <div className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-donna-border bg-white p-4 md:rounded-2xl md:p-6">
            <h2 className="mb-1 text-lg font-semibold text-donna-text">New reminder</h2>
            <p className="mb-4 text-sm text-donna-muted">
              Use natural times like “in 20 minutes” or “tomorrow 4pm”. Leave when blank to default to one hour from now.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">What</span>
                <TextInput
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Call mom"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">When</span>
                <TextInput
                  value={draft.when}
                  onChange={(e) => setDraft((d) => ({ ...d, when: e.target.value }))}
                  placeholder="tomorrow 4pm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-donna-muted">Notes</span>
                <TextArea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void create()}
                disabled={saving || !draft.title.trim()}
              >
                {saving ? "Saving…" : "Remind me"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReminderCard({
  reminder,
  busy,
  onCancel,
  onDismiss,
}: {
  reminder: Reminder;
  busy?: boolean;
  onCancel?: () => void;
  onDismiss?: () => void;
}) {
  const due = reminder.status === "fired";
  return (
    <article className="rounded-2xl border border-donna-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-donna-text">{reminder.title}</p>
          <p className="mt-1 text-sm text-donna-muted">
            {formatReminderWhen(reminder.due_at, reminder.timezone)}
            {due ? " · due now" : ""}
          </p>
          {reminder.notes ? (
            <p className="mt-2 text-sm text-donna-text">{reminder.notes}</p>
          ) : null}
        </div>
        <span className="rounded-md border border-donna-border bg-donna-surface px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-donna-muted">
          {statusLabel(reminder.status)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {onDismiss ? (
          <Button
            className="!w-auto px-3 py-1.5 text-sm"
            disabled={busy}
            onClick={onDismiss}
          >
            Done
          </Button>
        ) : null}
        {onCancel ? (
          <Button
            variant="secondary"
            className="!w-auto gap-1 px-3 py-1.5 text-sm"
            disabled={busy}
            onClick={onCancel}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        ) : null}
      </div>
    </article>
  );
}
